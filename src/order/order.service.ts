import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './entities/order.entity';

@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

  async create(createOrderDto: CreateOrderDto) {
    const newOrder = new this.orderModel(createOrderDto);
    return newOrder.save();
  }

  // 👇 สำคัญ: ต้องใช้ .find().exec() เพื่อดึงข้อมูลทั้งหมด
  async findAll() {
    return this.orderModel.find().exec();
  }

  async findOne(id: string) {
    return this.orderModel.findById(id).exec();
  }

  async update(id: string, updateOrderDto: any) {
    return this.orderModel.findByIdAndUpdate(id, updateOrderDto, { new: true });
  }

  async remove(id: string) {
    return this.orderModel.findByIdAndDelete(id);
  }
}