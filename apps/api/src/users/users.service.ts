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
}
