import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type AffiliateDocument = Affiliate & Document;

@Schema({ timestamps: true })
export class Affiliate {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, unique: true })
  code: string; // affiliate code / id used in URLs

  @Prop({ default: 0 })
  commissionRate: number; // optional, per-product commission can override

  @Prop({ default: true })
  isActive: boolean;
}

export const AffiliateSchema = SchemaFactory.createForClass(Affiliate);
