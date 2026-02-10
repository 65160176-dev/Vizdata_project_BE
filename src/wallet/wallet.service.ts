import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './entities/wallet.entity';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
  ) {}

  // 1. ดึงข้อมูลกระเป๋า (ถ้าไม่มี -> สร้างใหม่)
  async getMyWallet(userId: string) {
    let wallet = await this.walletModel.findOne({ sellerId: userId }).exec();

    if (!wallet) {
      wallet = new this.walletModel({
        sellerId: new Types.ObjectId(userId),
        balance: 0,
        transactions: []
      });
      await wallet.save();
    }
    
    // เรียง Transaction ใหม่ -> เก่า
    if (wallet.transactions && wallet.transactions.length > 0) {
      wallet.transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return wallet;
  }

  // 2. ฟังก์ชันถอนเงิน
  async withdraw(userId: string, withdrawDto: WithdrawDto) {
    const { amount, bankInfo } = withdrawDto;
    
    const wallet = await this.getMyWallet(userId);

    if (wallet.balance < amount) {
      throw new BadRequestException('ยอดเงินในกระเป๋าไม่เพียงพอ');
    }

    // หักเงิน
    wallet.balance -= amount;

    // บันทึกประวัติ
    wallet.transactions.push({
      type: 'withdraw',
      amount: amount,
      description: `ถอนเงินเข้าบัญชี ${bankInfo}`,
      status: 'completed', 
      createdAt: new Date()
    } as any);

    await wallet.save();

    // เรียงข้อมูลก่อนส่งกลับ
    wallet.transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return wallet;
  }
}