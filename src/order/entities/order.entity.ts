import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

// Schema ย่อยสำหรับ Item (จากรูป DB คุณมี field: name, price, qty)
@Schema()
export class OrderItem {
  @Prop()
  name: string;

  @Prop()
  price: number;

  @Prop()
  qty: number;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// ⭐ จุดสำคัญต้องแก้ตรงนี้!
// ในรูป Compass ชื่อ "order" (ไม่มี s) ดังนั้นต้องระบุ collection: 'order'
@Schema({ timestamps: true, collection: 'order' }) 
export class Order {
  @Prop()
  orderId: string;

  @Prop()
  address: string;

  @Prop()
  customer: string;

  @Prop()
  date: string;

  @Prop()
  email: string;

  // ⭐ ในรูป DB ชื่อ field คือ "item" (ไม่มี s) ต้องตั้งชื่อตัวแปรให้ตรง
  @Prop({ type: [OrderItemSchema] })
  item: OrderItem[]; 

  @Prop()
  status: string;

  @Prop()
  total: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);