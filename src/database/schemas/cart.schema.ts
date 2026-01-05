import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;

export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);

// Transform ObjectId to string when converting to JSON
CartSchema.set('toJSON', {
  transform: function (doc, ret) {
    // Use 'as any' to bypass TypeScript strict typing for JSON transformation
    (ret as any)._id = ret._id.toString();
    if (ret.userId) {
      (ret as any).userId = ret.userId.toString();
    }
    if (ret.items && Array.isArray(ret.items)) {
      (ret as any).items = ret.items.map((item: any) => {
        if (item.productId && typeof item.productId === 'object' && item.productId._id) {
          // productId is populated
          return {
            ...item,
            productId: {
              ...item.productId,
              _id: item.productId._id.toString(),
              userId: item.productId.userId && typeof item.productId.userId === 'object' 
                ? {
                    ...item.productId.userId,
                    _id: item.productId.userId._id ? item.productId.userId._id.toString() : item.productId.userId
                  }
                : item.productId.userId ? item.productId.userId.toString() : item.productId.userId
            }
          };
        } else if (item.productId) {
          // productId is not populated, just an ObjectId
          return {
            ...item,
            productId: item.productId.toString()
          };
        }
        return item;
      });
    }
    return ret;
  },
});
