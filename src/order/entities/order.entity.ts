import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema()
export class OrderItem {
  @Prop() name: string;
  @Prop() price: number;
  @Prop() qty: number;
  @Prop({ default: '/images/dashboard/default.png' }) image: string;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true, collection: 'order' }) 
export class Order {
  @Prop() orderId: string;
  @Prop() address: string;
  @Prop() customer: string;
  @Prop() email: string;
  
  @Prop({ type: [OrderItemSchema] })
  item: OrderItem[]; // ใช้ "item" ตาม DTO ของคุณ

  @Prop({ default: 'Pending' })
  status: string;

  @Prop({ default: 0 })
  total: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);