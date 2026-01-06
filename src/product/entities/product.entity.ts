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
    // ✅ ใช้ (ret as any) เพื่อเลี่ยง Error: Type 'string' is not assignable to type 'ObjectId'
    if (ret._id) {
      (ret as any)._id = ret._id.toString();
    }
    
    // ✅ Logic เติม URL รูปภาพ (ใช้ Hardcode ตามที่คุณต้องการ)
    if (ret.image && ret.image.startsWith('/')) {
      const baseUrl = 'http://localhost:3001'; 
      ret.image = `${baseUrl}${ret.image}`;
    }

    // ✅ ใช้ (ret as any) สำหรับ userId เช่นกัน
    if (ret.userId) {
      (ret as any).userId = ret.userId.toString();
    }
    
    return ret;
  },
});