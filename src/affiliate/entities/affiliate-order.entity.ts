import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AffiliateOrderDocument = AffiliateOrder & Document;

@Schema({ timestamps: true, collection: 'affiliate_orders' })
export class AffiliateOrder {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Affiliate', required: true })
  affiliate: Types.ObjectId;

  @Prop({ default: 0 })
  amount: number; // order subtotal for this affiliate (currency)

  @Prop({ default: 0 })
  commissionAmount: number;

  @Prop({ default: 'pending' })
  status: string; // pending, paid, cancelled

  @Prop({ type: [Object], default: [] })
  items: any[]; // copy of items for record
}

export const AffiliateOrderSchema = SchemaFactory.createForClass(AffiliateOrder);
