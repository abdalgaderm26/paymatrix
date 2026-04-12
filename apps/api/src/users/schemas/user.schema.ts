import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  telegram_id: number;

  @Prop()
  username: string;

  @Prop()
  full_name: string;

  @Prop({ default: 0 })
  wallet_balance: number;

  @Prop({ default: 'user', enum: ['user', 'vendor', 'admin'] })
  role: string;

  @Prop({ default: 'ar' })
  language: string;

  @Prop({ type: Number, default: null }) // telegram_id of the referrer
  referred_by: number;

  @Prop({ default: false })
  is_banned: boolean;

  @Prop({ default: 0 })
  total_earned_from_referrals: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
