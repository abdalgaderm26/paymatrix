import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformService, PlatformServiceSchema } from './schemas/service.schema';
import { ServicesService } from './services.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PlatformService.name, schema: PlatformServiceSchema }]),
  ],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
