import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { TestModule } from './test/test.module';
import { UsersModule } from './users/users.module';
import { HttpConfigModule } from './http/http-config.module';
import { ProductModule } from './product/product.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { SellerModule } from './seller/seller.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CartModule } from './cart/cart.module';
import { AddressModule } from './address/address.module';
import { NotificationModule } from './notification/notification.module';
import { AffiliateModule } from './affiliate/affiliate.module';
import { CategoryModule } from './category/category.module';
import { WalletModule } from './wallet/wallet.module';
// 🚀 เพิ่มการ Import CloudinaryModule ตรงนี้
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    TestModule,
    UsersModule,
    AuthModule,
    HttpConfigModule,
    ProductModule,
    OrderModule,
    SellerModule,
    WishlistModule,
    CartModule,
    AddressModule,
    NotificationModule,
    AffiliateModule,
    CategoryModule,
    WalletModule,
    // 🟢 เพิ่ม CloudinaryModule ลงในลิสต์ imports เพื่อเปิดใช้งานทั้งระบบ
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }