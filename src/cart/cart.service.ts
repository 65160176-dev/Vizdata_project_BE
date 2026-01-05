import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../database/schemas/cart.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {}

  async findByUserId(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items.productId',
        model: 'Product',
        select: 'name image price stock shippingCost commission weight description category userId',
        populate: {
          path: 'userId',
          model: 'User',
          select: 'firstName lastName email username'
        }
      })
      .exec();

    if (cart) {
      const originalLength = cart.items.length;
      const seenProductIds = new Set<string>();
      
      cart.items = cart.items.filter(item => {
        const isValid = item.productId && typeof item.productId === 'object' && !(item.productId instanceof Types.ObjectId);
        
        if (!isValid) {
          return false;
        }
        
        const productIdStr = (item.productId as any)._id.toString();
        if (seenProductIds.has(productIdStr)) {
          return false;
        }
        
        seenProductIds.add(productIdStr);
        return true;
      });
      
      if (originalLength !== cart.items.length) {
        cart.markModified('items');
        await cart.save();
      }
    }

    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    return cart;
  }

  async addItem(userId: string, productId: string, quantity: number): Promise<CartDocument | null> {
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    
    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    } else {
      cart.items = cart.items.filter(item => item.productId != null);
    }

    const productObjectId = new Types.ObjectId(productId);

    const existingItem = cart.items.find(
      (item) => {
        const itemProductId = item.productId instanceof Types.ObjectId 
          ? item.productId.toHexString() 
          : String(item.productId);
        return itemProductId === productId;
      }
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      cart.markModified('items');
    } else {
      cart.items.push({
        productId: productObjectId,
        quantity,
      });
    }

    await cart.save();
    
    // Re-fetch with populate
    const updatedCart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items.productId',
        select: 'name image price stock shippingCost commission weight description category userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email username'
        }
      })
      .exec();
      
    if (!updatedCart) {
      throw new Error('Cart not found after save');
    }
    
    return updatedCart;
  }

  async updateQuantity(userId: string, productId: string, quantity: number): Promise<CartDocument | null> {
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    
    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    const item = cart.items.find(
      (item) => {
        const itemProductId = item.productId instanceof Types.ObjectId 
          ? item.productId.toHexString() 
          : String(item.productId);
        return itemProductId === productId;
      }
    );

    if (item) {
      item.quantity = quantity;
      // Mark the items array as modified
      cart.markModified('items');
      await cart.save();
    }

    // Re-fetch with populate
    const updatedCart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items.productId',
        select: 'name image price stock shippingCost commission weight description category userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email username'
        }
      })
      .exec();
      
    if (!updatedCart) {
      throw new Error('Cart not found after update');
    }
    
    return updatedCart;
  }

  async removeItem(userId: string, productId: string): Promise<CartDocument | null> {
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    
    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    cart.items = cart.items.filter(
      (item) => {
        const itemIdStr = item.productId instanceof Types.ObjectId 
          ? item.productId.toHexString() 
          : String(item.productId);
        return itemIdStr !== productId;
      }
    );
    
    cart.markModified('items');
    await cart.save();
    
    // Re-fetch with populate
    const updatedCart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items.productId',
        select: 'name image price stock shippingCost commission weight description category userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email username'
        }
      })
      .exec();
      
    if (!updatedCart) {
      throw new Error('Cart not found after remove');
    }
    
    return updatedCart;
  }

  async clear(userId: string): Promise<CartDocument> {
    const cart = await this.findByUserId(userId);
    cart.items = [];
    await cart.save();
    return cart;
  }
}
