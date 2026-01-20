import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './entities/order.entity';
// ✅ Import Seller และ Product ให้ครบ
import { Seller, SellerSchema } from 'src/database/schemas/seller.schema';
import { ProductModule } from 'src/product/product.module';
import { NotificationModule } from 'src/notification/notification.module';
import { Cart, CartSchema } from 'src/database/schemas/cart.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Seller.name, schema: SellerSchema }, // ✅ จำเป็นสำหรับค้นหาร้านค้าเพื่อแจ้งเตือน
      { name: Cart.name, schema: CartSchema },
    ]),
    ProductModule,
    NotificationModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule { }