import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static'; // ✅ เพิ่ม
import { join } from 'path'; // ✅ เพิ่ม
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

@Module({
  imports: [
    // ✅ เปิด path รูปภาพ
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
