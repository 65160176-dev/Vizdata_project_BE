import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { UsersModule } from '../users/users.module';
import { Seller, SellerSchema } from '../database/schemas/seller.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Seller.name, schema: SellerSchema }]),
    UsersModule,
  ],
  controllers: [SellerController],
  providers: [SellerService],
  exports: [SellerService],
})
export class SellerModule {}
