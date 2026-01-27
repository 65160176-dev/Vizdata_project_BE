import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from '../database/schemas/wishlist.schema';
import { Product, ProductDocument } from '../product/entities/product.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async findByUserId(userId: string): Promise<any> {
    let wishlist = await this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!wishlist) {
      wishlist = await this.wishlistModel.create({
        userId: new Types.ObjectId(userId),
        products: [],
      });
    }

    // Manual populate products เพื่อหลีกเลี่ยงปัญหา ObjectId
    const productIds = wishlist.products;
    const products = await this.productModel.find({
      _id: { $in: productIds }
    }).exec();

    return {
      ...wishlist.toObject(),
      products: products
    };
  }

  async addProduct(userId: string, productId: string): Promise<any> {
    // Validate productId
    if (!productId || productId === 'undefined' || !Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    // Check if product exists and has stock
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    if (product.stock <= 0) {
      throw new BadRequestException('This product is out of stock');
    }

    const wishlist = await this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!wishlist) {
      const newWishlist = await this.wishlistModel.create({
        userId: new Types.ObjectId(userId),
        products: [new Types.ObjectId(productId)],
      });
      return this.findByUserId(userId);
    }

    const productObjectId = new Types.ObjectId(productId);
    const productExists = wishlist.products.some(id => id.toString() === productId);

    if (!productExists) {
      wishlist.products.push(productObjectId);
      await wishlist.save();
    }

    return this.findByUserId(userId);
  }

  async removeProduct(userId: string, productId: string): Promise<any> {
    // Validate productId
    if (!productId || productId === 'undefined' || !Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    const wishlist = await this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!wishlist) {
      throw new BadRequestException('Wishlist not found');
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId,
    );
    await wishlist.save();
    
    return this.findByUserId(userId);
  }

  async clear(userId: string): Promise<any> {
    const wishlist = await this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!wishlist) {
      throw new BadRequestException('Wishlist not found');
    }

    wishlist.products = [];
    await wishlist.save();
    return this.findByUserId(userId);
  }
}
