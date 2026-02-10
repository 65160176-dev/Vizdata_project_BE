import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static'; 
import { join } from 'path'; 
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
// ✅ Import WalletModule
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    // ✅ เปิด path รูปภาพ (Serve static files)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
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
    // ✅ เพิ่ม WalletModule ลงใน imports
    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }