import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

// ---------------------------------------
// 1. Schema ย่อย (รายการสินค้าในออเดอร์)
// ---------------------------------------
@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product' }) // เก็บ ID สินค้า
  productId: Types.ObjectId;

  @Prop()
  name: string;

  @Prop()
  price: number;

  @Prop()
  qty: number;

  @Prop({ default: '/images/dashboard/default.png' })
  image: string;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// ---------------------------------------
// 2. Schema หลัก (ออเดอร์)
// ---------------------------------------
@Schema({ timestamps: true, collection: 'order' })
export class Order {
  @Prop()
  orderId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop()
  address: string;

  @Prop()
  customer: string;

  @Prop()
  email: string;

  // เรียกใช้ Schema ย่อยตรงนี้
  @Prop({ type: [OrderItemSchema] })
  item: OrderItem[];

  @Prop({ default: 'Pending' })
  status: string;

  @Prop({ default: 0 })
  total: number;

  @Prop({ default: 0 })
  shippingCost: number;

  // ✅ จุดที่แก้แล้ว: ใช้ Types.ObjectId และ Ref ไปหา 'Seller'
  @Prop({ type: Types.ObjectId, ref: 'Seller' })
  seller: Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);