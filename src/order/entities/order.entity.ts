// order.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose'; // ✅ อย่าลืม import Types

export type OrderDocument = Order & Document;

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product' }) // ✅ เก็บ ID สินค้า
  productId: Types.ObjectId;

  @Prop() name: string;
  @Prop() price: number;
  @Prop() qty: number;
  @Prop({ default: '/images/dashboard/default.png' }) image: string;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true, collection: 'order' })
export class Order {
  @Prop() orderId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop() address: string;
  @Prop() customer: string;
  @Prop() email: string;

  @Prop({ type: [OrderItemSchema] })
  item: OrderItem[];

  @Prop({ default: 'Pending' })
  status: string;

  @Prop({ default: 0 })
  total: number;

  @Prop({ default: 0 })
  shippingCost: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);