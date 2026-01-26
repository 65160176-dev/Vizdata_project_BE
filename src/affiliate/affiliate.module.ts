import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AffiliateService } from './affiliate.service';
import { AffiliateController } from './affiliate.controller';
import { Affiliate, AffiliateSchema } from './entities/affiliate.entity';
import { AffiliateOrder, AffiliateOrderSchema } from './entities/affiliate-order.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Affiliate.name, schema: AffiliateSchema },
      { name: AffiliateOrder.name, schema: AffiliateOrderSchema },
    ]),
  ],
  controllers: [AffiliateController],
  providers: [AffiliateService],
  exports: [AffiliateService], // เผื่อ OrderService ต้องใช้
})
export class AffiliateModule {}
