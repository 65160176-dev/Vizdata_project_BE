import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

// ระบุ collection: 'products' เพื่อให้ตรงกับ MongoDB Compass ของคุณ
@Schema({ timestamps: true, collection: 'products' }) 
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

// Transform ObjectId to string when converting to JSON
ProductSchema.set('toJSON', {
  transform: function (doc, ret) {
    // Use 'as any' to bypass TypeScript strict typing for JSON transformation
    (ret as any)._id = ret._id.toString();
    if (ret.userId) {
      (ret as any).userId = ret.userId.toString();
    }
    return ret;
  },
});