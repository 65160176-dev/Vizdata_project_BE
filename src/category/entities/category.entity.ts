import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId: Types.ObjectId;

  @Prop({ default: false })
  isSystem: boolean;

  // 👇 เพิ่มบรรทัดนี้: เก็บรายชื่อ User ที่กดลบหมวดหมู่ระบบนี้ (ซ่อนไม่ให้เห็น)
  @Prop({ type: [String], default: [] }) 
  hiddenForUsers: string[];
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ name: 1, userId: 1 }, { unique: true });

CategorySchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});