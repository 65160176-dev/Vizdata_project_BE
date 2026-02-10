import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './entities/order.entity';
import { Seller, SellerSchema } from 'src/database/schemas/seller.schema';
import { Affiliate, AffiliateSchema } from 'src/affiliate/entities/affiliate.entity';
import { AffiliateOrder, AffiliateOrderSchema } from 'src/affiliate/entities/affiliate-order.entity';
import { ProductModule } from 'src/product/product.module';
import { NotificationModule } from 'src/notification/notification.module';
import { Cart, CartSchema } from 'src/database/schemas/cart.schema';
// ✅ Import Wallet (แก้ path ตามโปรเจกต์จริงของคุณ)
import { Wallet, WalletSchema } from 'src/wallet/entities/wallet.entity'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: Affiliate.name, schema: AffiliateSchema },
      { name: AffiliateOrder.name, schema: AffiliateOrderSchema },
      { name: Cart.name, schema: CartSchema },
      // ✅ เพิ่มบรรทัดนี้
      { name: Wallet.name, schema: WalletSchema }, 
    ]),
    ProductModule,
    NotificationModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule { }