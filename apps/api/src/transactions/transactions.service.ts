import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from './schemas/transaction.schema';

@Injectable()
export class TransactionsService {
  constructor(@InjectModel(Transaction.name) private txModel: Model<Transaction>) {}

  async create(data: {
    user_id: Types.ObjectId;
    type: 'deposit' | 'payment' | 'withdraw' | 'earning';
    amount: number;
    currency?: string;
    method?: string;
    status?: string;
    proof_file_id?: string;
  }): Promise<Transaction> {
    return this.txModel.create({
      ...data,
      currency: data.currency || 'USD',
      status: data.status || 'pending',
    });
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: { type?: string; status?: string },
  ): Promise<{ transactions: Transaction[]; total: number; pages: number }> {
    const query: any = {};
    if (filters?.type) query.type = filters.type;
    if (filters?.status) query.status = filters.status;

    const total = await this.txModel.countDocuments(query);
    const transactions = await this.txModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user_id', 'telegram_id username full_name');
    return { transactions, total, pages: Math.ceil(total / limit) };
  }

  async findByUser(userId: Types.ObjectId, limit = 20): Promise<Transaction[]> {
    return this.txModel.find({ user_id: userId }).sort({ createdAt: -1 }).limit(limit);
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.txModel.findById(id).populate('user_id', 'telegram_id username full_name');
  }

  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<Transaction | null> {
    return this.txModel.findByIdAndUpdate(id, { status }, { new: true });
  }

  async getPendingDeposits(): Promise<Transaction[]> {
    return this.txModel
      .find({ type: 'deposit', status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('user_id', 'telegram_id username full_name');
  }

  async getStats(): Promise<{
    totalDeposits: number;
    totalPayments: number;
    pendingCount: number;
    totalRevenue: number;
  }> {
    const depositAgg = await this.txModel.aggregate([
      { $match: { type: 'deposit', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const paymentAgg = await this.txModel.aggregate([
      { $match: { type: 'payment', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const pendingCount = await this.txModel.countDocuments({ status: 'pending' });

    return {
      totalDeposits: depositAgg[0]?.total || 0,
      totalPayments: paymentAgg[0]?.total || 0,
      pendingCount,
      totalRevenue: (paymentAgg[0]?.total || 0),
    };
  }
}
