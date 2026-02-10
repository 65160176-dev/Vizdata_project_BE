import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from './entities/wallet.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }])
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [
    WalletService,
    MongooseModule // ✅ สำคัญมาก: ส่งออกเพื่อให้ OrderModule เอา Schema ไปใช้เติมเงินได้
  ] 
})
export class WalletModule {}