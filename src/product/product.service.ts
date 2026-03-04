import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // ✅ 1. ฟังก์ชันตัดสต็อก (แก้ไข: ป้องกันสต็อกติดลบ)
  async decreaseStock(productId: string | Types.ObjectId, qty: number) {
    // ใช้ findOneAndUpdate พร้อมเงื่อนไข stock >= qty ($gte)
    // เพื่อให้มั่นใจว่ามีของพอให้ตัด
    const updatedProduct = await this.productModel.findOneAndUpdate(
      { 
        _id: productId, 
        stock: { $gte: qty } // เงื่อนไข: สต็อกต้องมากกว่าหรือเท่ากับจำนวนที่จะตัด
      }, 
      { $inc: { stock: -qty } }, 
      { new: true }
    ).exec();

    // ถ้าหาไม่เจอ หรือสต็อกไม่พอ (updatedProduct จะเป็น null)
    if (!updatedProduct) {
      // Throw Error เพื่อให้ Transaction ของ Order หยุดทำงาน
      throw new BadRequestException(`สินค้าหมด หรือสต็อกไม่พอสำหรับสินค้า ID: ${productId}`);
    }

    return updatedProduct;
  }

  // ✅ 2. ฟังก์ชันเพิ่มสต็อกคืน (จำนวนบวก)
  async increaseStock(productId: string | Types.ObjectId, qty: number) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      console.warn(`Product ${productId} not found during stock restoration.`);
      return null;
    }
    // แปลงเป็นตัวเลขให้ชัวร์ก่อนบวก
    product.stock = Number(product.stock) + Number(qty);
    return await product.save();
  }
}