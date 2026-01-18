import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true, collection: 'addresses' })
export class Address {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  address: string; // บ้านเลขที่, หมู่, ซอย

  @Prop({ required: true })
  subDistrict: string;

  @Prop({ required: true })
  district: string;

  @Prop({ required: true })
  province: string;

  @Prop({ required: true })
  zipCode: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
