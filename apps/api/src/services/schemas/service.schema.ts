import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PlatformService extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  vendor_id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  price_usd: number;

  @Prop({ default: 'digital_product', enum: ['subscription', 'digital_product'] })
  type: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop()
  delivery_details: string; // The text or link the user receives upon purchasing
}

export const PlatformServiceSchema = SchemaFactory.createForClass(PlatformService);
