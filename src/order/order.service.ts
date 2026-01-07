import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

  // สร้างออเดอร์ใหม่
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const newOrder = new this.orderModel(createOrderDto);
    return newOrder.save();
  }

  // ดึงข้อมูลออเดอร์ทั้งหมด
  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  // ดึงข้อมูลออเดอร์ตาม ID
  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  // อัปเดตข้อมูลออเดอร์ (แก้ปัญหา Error 500)
  async update(id: string, updateOrderDto: any): Promise<Order> {
    try {
      // ตรวจสอบข้อมูลเบื้องต้น
      if (!updateOrderDto || Object.keys(updateOrderDto).length === 0) {
        throw new BadRequestException('No data provided for update');
      }

      // ใช้ $set เพื่ออัปเดตเฉพาะฟิลด์ที่ส่งมา ป้องกันข้อมูลส่วนอื่นหาย
      const updatedOrder = await this.orderModel.findByIdAndUpdate(
        id,
        { $set: updateOrderDto },
        { new: true, runValidators: true } // new: true คืนค่าข้อมูลที่แก้แล้ว, runValidators: ตรวจสอบความถูกต้อง
      ).exec();

      if (!updatedOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return updatedOrder;
    } catch (error) {
      // พิมพ์ Log เพื่อดูสาเหตุจริงใน Terminal ของ NestJS
      console.error('Update Service Error:', error.message);
      throw error;
    }
  }

  // ลบออเดอร์
  async remove(id: string): Promise<any> {
    const result = await this.orderModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return { deleted: true };
  }
}