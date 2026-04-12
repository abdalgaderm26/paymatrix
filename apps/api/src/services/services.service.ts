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

  async findById(id: string): Promise<PlatformService | null> {
    return this.serviceModel.findById(id).exec();
  }
}
