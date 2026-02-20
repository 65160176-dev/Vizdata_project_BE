import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './entities/wallet.entity';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
  ) { }

  // 1. ดึงข้อมูลกระเป๋า (ถ้าไม่มี -> สร้างใหม่)
  async getMyWallet(userId: string) {

    // ✅ เพิ่ม 3 บรรทัดนี้ เพื่อป้องกัน Error 500 ถ้า userId ไม่ถูกต้อง
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid User ID: ${userId}`);
    }

    const userObjectId = new Types.ObjectId(userId);

    // ✅ เปลี่ยนจาก sellerId เป็น userId
    let wallet = await this.walletModel.findOne({ userId: userObjectId }).exec();

    if (!wallet) {
      wallet = new this.walletModel({
        userId: userObjectId,
        balance: 0,
        transactions: []
      });
      await wallet.save(); // <--- อาจจะพังตรงนี้ถ้ามีปัญหาเรื่อง Index (ดูสาเหตุที่ 2)
    }

    // เรียง Transaction ใหม่ -> เก่า
    if (wallet.transactions && wallet.transactions.length > 0) {
      wallet.transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return wallet;
  }

  // ... (ฟังก์ชัน withdraw คงไว้เหมือนเดิม) ...
  async withdraw(userId: string, withdrawDto: WithdrawDto) {
    const { amount, bankInfo } = withdrawDto;

    // เรียกใช้ getMyWallet ซึ่งตอนนี้จะค้นหาและคืนค่าด้วย ObjectId เสมอ
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

    wallet.transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return wallet;
  }
}