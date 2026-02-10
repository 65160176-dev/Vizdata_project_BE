import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

// Schema ย่อยสำหรับประวัติธุรกรรม (Transaction)
@Schema({ _id: false }) 
class Transaction {
  @Prop({ type: String, enum: ['income', 'withdraw'], required: true })
  type: string; // income = รายรับ, withdraw = ถอนออก

  @Prop({ required: true })
  amount: number;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 'completed' })
  status: string; // completed, pending

  @Prop({ default: Date.now })
  createdAt: Date;
}
const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Schema หลัก (Wallet)
@Schema({ timestamps: true, collection: 'wallets' })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  sellerId: Types.ObjectId;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ type: [TransactionSchema], default: [] })
  transactions: Transaction[];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);