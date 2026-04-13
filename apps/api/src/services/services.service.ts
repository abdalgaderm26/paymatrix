import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlatformService } from './schemas/service.schema';

@Injectable()
export class ServicesService {
  constructor(@InjectModel(PlatformService.name) private serviceModel: Model<PlatformService>) {}

  async findAllActive(): Promise<PlatformService[]> {
    return this.serviceModel.find({ is_active: true }).exec();
  }

  async findAll(page = 1, limit = 20): Promise<{ services: PlatformService[]; total: number; pages: number }> {
    const total = await this.serviceModel.countDocuments();
    const services = await this.serviceModel
      .find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { services, total, pages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<PlatformService | null> {
    return this.serviceModel.findById(id).exec();
  }

  async create(data: {
    vendor_id: string;
    name: string;
    description?: string;
    price_usd: number;
    type?: string;
    delivery_details?: string;
  }): Promise<PlatformService> {
    return this.serviceModel.create(data);
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    price_usd: number;
    type: string;
    is_active: boolean;
    delivery_details: string;
  }>): Promise<PlatformService | null> {
    return this.serviceModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.serviceModel.findByIdAndDelete(id);
    return !!result;
  }

  async toggleActive(id: string): Promise<PlatformService | null> {
    const service = await this.serviceModel.findById(id);
    if (!service) return null;
    service.is_active = !service.is_active;
    await service.save();
    return service;
  }

  async getStats(): Promise<{ total: number; active: number; inactive: number }> {
    const total = await this.serviceModel.countDocuments();
    const active = await this.serviceModel.countDocuments({ is_active: true });
    return { total, active, inactive: total - active };
  }
}
