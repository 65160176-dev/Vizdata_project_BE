// src/product/entities/product.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

// 👇 เพิ่ม collection: 'product' ตรงนี้ (สำคัญมาก!)
@Schema({ timestamps: true, collection: 'product' }) 
export class Product {
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