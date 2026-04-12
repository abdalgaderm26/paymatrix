import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderStatus = 'pending' | 'waiting_payment' | 'paid' | 'approved' | 'rejected';

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PlatformService', required: true })
  service_id: Types.ObjectId;

  @Prop({ required: true })
  price_usd: number;

  @Prop({ default: 1 })
  exchange_rate: number;

  @Prop({ required: true })
  final_price: number; // Local price or target currency equivalent

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  payment_method: string; // crypto, bank, wallet

  @Prop()
  payment_proof_id: string; // Telegram file_id of the uploaded receipt

  @Prop({ default: 'pending', enum: ['pending', 'waiting_payment', 'paid', 'approved', 'rejected'] })
  status: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
