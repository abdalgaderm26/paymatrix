import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findOrCreate(telegramId: number, username: string, fullName: string): Promise<User> {
    let user = await this.userModel.findOne({ telegram_id: telegramId });
    if (!user) {
      user = new this.userModel({
        telegram_id: telegramId,
        username,
        full_name: fullName,
      });
      await user.save();
    } else {
      // Update username/name if they changed
      if (user.username !== username || user.full_name !== fullName) {
        user.username = username;
        user.full_name = fullName;
        await user.save();
      }
    }
    return user;
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.userModel.findOne({ telegram_id: telegramId });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id);
  }

  async findAll(page = 1, limit = 20, search?: string): Promise<{ users: User[]; total: number; pages: number }> {
    const query: any = {};
    if (search) {
      // SECURITY: Escape regex special chars to prevent ReDoS
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { username: { $regex: escaped, $options: 'i' } },
        { full_name: { $regex: escaped, $options: 'i' } },
        { telegram_id: isNaN(Number(search)) ? undefined : Number(search) },
      ].filter(q => Object.values(q)[0] !== undefined);
    }
    const total = await this.userModel.countDocuments(query);
    const users = await this.userModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { users, total, pages: Math.ceil(total / limit) };
  }

  async updateBalance(telegramId: number, amount: number, operation: 'add' | 'deduct'): Promise<User | null> {
    const user = await this.userModel.findOne({ telegram_id: telegramId });
    if (!user) return null;
    if (operation === 'add') {
      user.wallet_balance += amount;
    } else {
      user.wallet_balance = Math.max(0, user.wallet_balance - amount);
    }
    await user.save();
    return user;
  }

  async updateRole(telegramId: number, role: 'user' | 'admin'): Promise<User | null> {
    return this.userModel.findOneAndUpdate(
      { telegram_id: telegramId },
      { role },
      { new: true },
    );
  }

  async banUser(telegramId: number): Promise<User | null> {
    return this.userModel.findOneAndUpdate(
      { telegram_id: telegramId },
      { is_banned: true },
      { new: true },
    );
  }

  async unbanUser(telegramId: number): Promise<User | null> {
    return this.userModel.findOneAndUpdate(
      { telegram_id: telegramId },
      { is_banned: false },
      { new: true },
    );
  }

  async getStats(): Promise<{ totalUsers: number; totalBalance: number; bannedUsers: number; activeToday: number }> {
    const totalUsers = await this.userModel.countDocuments();
    const bannedUsers = await this.userModel.countDocuments({ is_banned: true });

    const balanceAgg = await this.userModel.aggregate([
      { $group: { _id: null, total: { $sum: '$wallet_balance' } } },
    ]);
    const totalBalance = balanceAgg[0]?.total || 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const activeToday = await this.userModel.countDocuments({
      updatedAt: { $gte: todayStart },
    });

    return { totalUsers, totalBalance, bannedUsers, activeToday };
  }

  async getAllUserIds(): Promise<number[]> {
    const users = await this.userModel.find({ is_banned: false }, { telegram_id: 1 });
    return users.map(u => u.telegram_id);
  }

  async getAdmins(): Promise<User[]> {
    return this.userModel.find({ role: 'admin' });
  }
}
