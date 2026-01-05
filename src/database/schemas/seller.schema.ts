import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SellerDocument = HydratedDocument<Seller>;

@Schema({ timestamps: true })
export class Seller {
  @Prop()
  avatar: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string; // seller brand/shop name (from username)

  @Prop({ required: true })
  display_name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const SellerSchema = SchemaFactory.createForClass(Seller);
