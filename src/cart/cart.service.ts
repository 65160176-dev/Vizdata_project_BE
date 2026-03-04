import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../database/schemas/cart.schema';
import { Product, ProductDocument } from '../product/entities/product.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) { }

  async findByUserId(userId: string): Promise<CartDocument> {
    // Step 1: Get cart WITHOUT populate to check stock and clean up
    let cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (cart && cart.items.length > 0) {
      // Get all product IDs from cart
      const productIds = cart.items
        .filter((item) => item.productId)
        .map((item) => item.productId);

      // Fetch current stock for all products
      const products = await this.productModel
        .find({ _id: { $in: productIds } })
        .select('stock')
        .exec();

      const stockMap = new Map<string, number>();
      for (const p of products) {
        stockMap.set(p._id.toString(), Number(p.stock) || 0);
      }

      const originalLength = cart.items.length;
      const seenProductIds = new Set<string>();
      let modified = false;

      cart.items = cart.items.filter((item) => {
        if (!item.productId) {
          modified = true;
          return false;
        }

        const productIdStr = item.productId.toString();

        // Remove duplicates
        if (seenProductIds.has(productIdStr)) {
          modified = true;
          return false;
        }

        // Remove if product no longer exists
        if (!stockMap.has(productIdStr)) {
          modified = true;
          return false;
        }

        const currentStock = stockMap.get(productIdStr)!;

        // Remove items with no stock
        if (currentStock <= 0) {
          modified = true;
          return false;
        }

        // Adjust quantity if it exceeds available stock
        if (item.quantity > currentStock) {
          item.quantity = currentStock;
          modified = true;
        }

        seenProductIds.add(productIdStr);
        return true;
      });

      if (originalLength !== cart.items.length || modified) {
        cart.markModified('items');
        await cart.save();
      }
    }

    // Step 2: Re-fetch with populate for response
    let populatedCart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items.productId',
        model: 'Product',
        select:
          'name image price stock shippingCost commission weight description category userId',
        populate: {
          path: 'userId',
          model: 'User',
          select: 'firstName lastName email username',
        },
      })
      .exec();

    if (!populatedCart) {
      populatedCart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    return populatedCart;
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartDocument | null> {
    // Check product stock first
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    if (product.stock <= 0) {
      throw new BadRequestException('Product is out of stock');
    }

    let cart = await this.cartModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    } else {
      cart.items = cart.items.filter((item) => item.productId != null);
    }

    const productObjectId = new Types.ObjectId(productId);

    const existingItem = cart.items.find((item) => {
      const itemProductId =
        item.productId instanceof Types.ObjectId
          ? item.productId.toHexString()
          : String(item.productId);
      return itemProductId === productId;
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      // Check if new quantity exceeds stock
      if (newQuantity > product.stock) {
        throw new BadRequestException(
          `Only ${product.stock} items available in stock. You already have ${existingItem.quantity} in cart.`,
        );
      }
      existingItem.quantity = newQuantity;
      cart.markModified('items');
    } else {
      // Check if quantity exceeds stock for new item
      if (quantity > product.stock) {
        throw new BadRequestException(
          `Only ${product.stock} items available in stock`,
        );
      }
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
        select:
          'name image price stock shippingCost commission weight description category userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email username',
        },
      })
      .exec();

    if (!updatedCart) {
      throw new Error('Cart not found after save');
    }

    return updatedCart;
  }

  async updateQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartDocument | null> {
    // Check product stock first
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    if (product.stock <= 0) {
      throw new BadRequestException('Product is out of stock');
    }
    if (quantity > product.stock) {
      throw new BadRequestException(
        `Only ${product.stock} items available in stock`,
      );
    }
    if (quantity <= 0) {
      // If quantity is 0 or negative, remove the item
      return this.removeItem(userId, productId);
    }

    let cart = await this.cartModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    const item = cart.items.find((item) => {
      const itemProductId =
        item.productId instanceof Types.ObjectId
          ? item.productId.toHexString()
          : String(item.productId);
      return itemProductId === productId;
    });

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
        select:
          'name image price stock shippingCost commission weight description category userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email username',
        },
      })
      .exec();

    if (!updatedCart) {
      throw new Error('Cart not found after update');
    }

    return updatedCart;
  }

  async removeItem(
    userId: string,
    productId: string,
  ): Promise<CartDocument | null> {
    let cart = await this.cartModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!cart) {
      cart = await this.cartModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
      });
    }

    const beforeCount = cart.items.length;

    cart.items = cart.items.filter((item) => {
      let itemIdStr: string;
      if (item.productId instanceof Types.ObjectId) {
        itemIdStr = item.productId.toHexString();
      } else if (item.productId && typeof item.productId === 'object') {
        // After populate, productId is an object with _id
        itemIdStr = (item.productId as any)._id
          ? (item.productId as any)._id.toString()
          : String(item.productId);
      } else {
        itemIdStr = String(item.productId);
      }
      return itemIdStr !== productId;
    });

    console.log(`removeItem: before=${beforeCount}, after=${cart.items.length}, productId=${productId}`);

    cart.markModified('items');
    await cart.save();

    // Re-fetch with populate
    const updatedCart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items.productId',
        select:
          'name image price stock shippingCost commission weight description category userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email username',
        },
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
