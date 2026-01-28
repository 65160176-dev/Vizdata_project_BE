import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { Model, Types } from 'mongoose';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) { }

  async create(createProductDto: CreateProductDto) {
    const productData = {
      ...createProductDto,
      userId: createProductDto.userId
        ? new Types.ObjectId(createProductDto.userId as any)
        : undefined,
    };

    const newProduct = new this.productModel(productData);
    return newProduct.save();
  }

  async findAll() {
    return this.productModel.find().exec();
  }

  async findByUserId(userId: string | Types.ObjectId) {
    return this.productModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async findOne(id: string | Types.ObjectId) {
    return this.productModel.findById(id).exec();
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    return this.productModel.findByIdAndUpdate(id, updateProductDto, {
      new: true,
    });
  }

  async remove(id: string) {
    return this.productModel.findByIdAndDelete(id);
  }

  // ✅ 1. ฟังก์ชันตัดสต็อก (จำนวนติดลบ)
  async decreaseStock(productId: string | Types.ObjectId, qty: number) {
    return this.productModel
      .findByIdAndUpdate(productId, { $inc: { stock: -qty } }, { new: true })
      .exec();
  }

  // ✅ 2. ฟังก์ชันเพิ่มสต็อกคืน (จำนวนบวก) - เพิ่มใหม่
  async increaseStock(productId: string | Types.ObjectId, qty: number) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      // กรณีหาสินค้าไม่เจอ อาจจะ log ไว้ แต่ไม่ควร throw ให้ process ออเดอร์พัง
      console.warn(`Product ${productId} not found during stock restoration.`);
      return null;
    }
    product.stock += qty;
    return await product.save();
  }
}