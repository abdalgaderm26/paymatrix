import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionType = 'deposit' | 'payment' | 'withdraw' | 'earning';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true, enum: ['deposit', 'payment', 'withdraw', 'earning'] })
  type: TransactionType;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  method: string;

  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected'] })
  status: string;

  @Prop()
  proof_file_id: string; // If proof image was sent
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
