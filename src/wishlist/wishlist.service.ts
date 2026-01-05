import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from '../database/schemas/wishlist.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
  ) {}

  async findByUserId(userId: string): Promise<WishlistDocument> {
    let wishlist = await this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('products')
      .exec();

    if (!wishlist) {
      wishlist = await this.wishlistModel.create({
        userId: new Types.ObjectId(userId),
        products: [],
      });
    }

    return wishlist;
  }

  async addProduct(userId: string, productId: string): Promise<WishlistDocument> {
    const wishlist = await this.findByUserId(userId);
    const productObjectId = new Types.ObjectId(productId);

    if (!wishlist.products.includes(productObjectId)) {
      wishlist.products.push(productObjectId);
      await wishlist.save();
    }

    return wishlist.populate('products');
  }

  async removeProduct(userId: string, productId: string): Promise<WishlistDocument> {
    const wishlist = await this.findByUserId(userId);
    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId,
    );
    await wishlist.save();
    return wishlist.populate('products');
  }

  async clear(userId: string): Promise<WishlistDocument> {
    const wishlist = await this.findByUserId(userId);
    wishlist.products = [];
    await wishlist.save();
    return wishlist;
  }
}
