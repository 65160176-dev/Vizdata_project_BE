import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) { }

  // สร้างออเดอร์
  async create(createOrderDto: CreateOrderDto) {
    const newOrder = new this.orderModel(createOrderDto);
    return newOrder.save();
  }

  // ✅ findAll แบบ Version 2 (ดึงข้อมูลครบ: ชื่อคนซื้อ, สินค้า, ชื่อร้าน)
  async findAll() {
    return this.orderModel
      .find()
      .populate('user', 'firstName lastName email') // ดึงข้อมูลคนซื้อ
      .populate({
        path: 'item.productId', // วิ่งเข้าไปใน item -> productId
        select: 'name price userId image', // เลือก field ของสินค้า
        populate: {
          path: 'userId', // วิ่งต่อไปหาคนขาย (Seller)
          select: 'name shopName username', // เลือกข้อมูลคนขาย
        },
      })
      .exec();
  }

  // ✅ findOne แบบ Version 1 (มีดัก Error)
  async findOne(id: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  // ✅ update แบบ Version 1 (ปลอดภัยกว่า)
  async update(id: string, updateOrderDto: any) {
    try {
      if (!updateOrderDto || Object.keys(updateOrderDto).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(
          id,
          { $set: updateOrderDto },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return updatedOrder;
    } catch (error) {
      console.error('Update Service Error:', error.message);
      throw error;
    }
  }

  // ✅ remove แบบ Version 1 (มีเช็คก่อนลบ)
  async remove(id: string) {
    const result = await this.orderModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return { deleted: true };
  }
}
