import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

  async create(data: {
    user_id: Types.ObjectId;
    service_id: Types.ObjectId;
    price_usd: number;
    final_price: number;
    currency?: string;
    payment_method?: string;
    status?: string;
  }): Promise<Order> {
    return this.orderModel.create({
      ...data,
      currency: data.currency || 'USD',
      status: data.status || 'pending',
    });
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: { status?: string },
  ): Promise<{ orders: Order[]; total: number; pages: number }> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;

    const total = await this.orderModel.countDocuments(query);
    const orders = await this.orderModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user_id', 'telegram_id username full_name wallet_balance')
      .populate('service_id', 'name price_usd type');
    return { orders, total, pages: Math.ceil(total / limit) };
  }

  async findByUser(userId: Types.ObjectId): Promise<Order[]> {
    return this.orderModel
      .find({ user_id: userId })
      .sort({ createdAt: -1 })
      .populate('service_id', 'name price_usd');
  }

  async findById(id: string): Promise<Order | null> {
    return this.orderModel
      .findById(id)
      .populate('user_id', 'telegram_id username full_name')
      .populate('service_id', 'name price_usd description delivery_details');
  }

  async updateStatus(id: string, status: string): Promise<Order | null> {
    return this.orderModel.findByIdAndUpdate(id, { status }, { new: true });
  }

  async getStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalSales: number;
  }> {
    const totalOrders = await this.orderModel.countDocuments();
    const pendingOrders = await this.orderModel.countDocuments({ status: 'pending' });
    const completedOrders = await this.orderModel.countDocuments({ status: 'approved' });
    const salesAgg = await this.orderModel.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$price_usd' } } },
    ]);
    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalSales: salesAgg[0]?.total || 0,
    };
  }
}
