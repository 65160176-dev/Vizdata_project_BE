import { Injectable } from '@nestjs/common';
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
    // Convert userId to ObjectId if it's a string
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

  async findOne(id: string) {
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

  // ✅ ฟังก์ชันสำหรับตัดสต็อกสินค้า
  async decreaseStock(productId: string, qty: number) {
    // ใช้ $inc: { stock: -qty } เพื่อลดค่าตามจำนวนที่สั่ง
    // ⚠️ เช็คชื่อ field ใน DB คุณด้วยว่าเป็น 'stock' หรือ 'quantity'
    return this.productModel
      .findByIdAndUpdate(productId, { $inc: { stock: -qty } }, { new: true })
      .exec();
  }
}
