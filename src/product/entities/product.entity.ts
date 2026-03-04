import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'User' })
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

  @Prop({ default: 0 })
  shippingCost: number;

  @Prop()
  description: string;

  @Prop()
  category: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.set('toJSON', {
  transform: function (doc, ret) {
    if (ret._id) {
      (ret as any).id = ret._id.toString();
      (ret as any)._id = ret._id.toString();
    }

    // รูปภาพเก็บเป็น Cloudinary URL
    // แปลง userId เป็น string เฉพาะเมื่อมันเป็น ObjectId
    if (ret.userId && ret.userId instanceof Types.ObjectId) {
      (ret as any).userId = ret.userId.toString();
    }

    return ret;
  },
});