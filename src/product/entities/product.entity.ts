import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

// ระบุ collection: 'product' เพื่อให้ตรงกับ MongoDB Compass ของคุณ
@Schema({ timestamps: true, collection: 'product' }) 
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  image: string;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: 0 })
  commission: number;

  @Prop({ default: 0 }) 
  weight: number; 

  @Prop({ default: 'Free' }) 
  shippingCost: string; 

  @Prop()
  description: string;

  @Prop()
  category: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);