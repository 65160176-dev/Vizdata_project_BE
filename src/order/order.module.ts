import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './entities/order.entity';
import { ProductModule } from '../product/product.module'; // ✅ 1. Import ไฟล์มา

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ProductModule, // ✅ 2. ใส่ ProductModule เข้าไปใน imports
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}