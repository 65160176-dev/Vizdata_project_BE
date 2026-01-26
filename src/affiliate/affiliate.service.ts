import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Affiliate, AffiliateDocument } from './entities/affiliate.entity';
import { AffiliateOrder, AffiliateOrderDocument } from './entities/affiliate-order.entity';
import { RegisterAffiliateDto } from './dto/register-affiliate.dto';

@Injectable()
export class AffiliateService {
  constructor(
    @InjectModel(Affiliate.name) private affiliateModel: Model<AffiliateDocument>,
    @InjectModel(AffiliateOrder.name) private affiliateOrderModel: Model<AffiliateOrderDocument>,
  ) {}

  // สร้าง affiliate code แบบสุ่ม (8 ตัวอักษร)
  private generateCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  // สมัคร affiliate
  async register(userId: string, dto: RegisterAffiliateDto) {
    // ตรวจสอบว่าเคยสมัครแล้วหรือยัง
    const existing = await this.affiliateModel.findOne({ user: userId });
    if (existing) {
      throw new ConflictException('You are already registered as an affiliate');
    }

    // สร้าง code ใหม่ (loop จนได้ unique)
    let code = this.generateCode();
    let attempts = 0;
    while (await this.affiliateModel.findOne({ code })) {
      code = this.generateCode();
      attempts++;
      if (attempts > 10) throw new Error('Failed to generate unique affiliate code');
    }

    const affiliate = new this.affiliateModel({
      user: userId,
      code,
      commissionRate: dto.commissionRate || 0,
      isActive: true,
    });

    return affiliate.save();
  }

  // ดึงข้อมูล affiliate ของ user
  async getMyAffiliate(userId: string) {
    const affiliate = await this.affiliateModel.findOne({ user: userId });
    if (!affiliate) {
      throw new NotFoundException('You are not registered as an affiliate');
    }
    return affiliate;
  }

  // ดึง dashboard data (summary + orders)
  async getDashboard(userId: string) {
    const affiliate = await this.getMyAffiliate(userId);

    const orders = await this.affiliateOrderModel
      .find({ affiliate: affiliate._id })
      .populate({
        path: 'order',
        select: 'orderId status createdAt total',
      })
      .sort({ createdAt: -1 })
      .exec();

    // คำนวณสรุป
    const totalOrders = orders.length;
    const totalCommission = orders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
    const pendingCommission = orders
      .filter((o) => o.status === 'pending')
      .reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
    const paidCommission = orders
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + (o.commissionAmount || 0), 0);

    return {
      affiliate,
      summary: {
        totalOrders,
        totalCommission,
        pendingCommission,
        paidCommission,
      },
      orders,
    };
  }

  // ดึงรายการ orders (สำหรับ pagination)
  async getOrders(userId: string, page = 1, limit = 20) {
    const affiliate = await this.getMyAffiliate(userId);

    const skip = (page - 1) * limit;
    const orders = await this.affiliateOrderModel
      .find({ affiliate: affiliate._id })
      .populate({
        path: 'order',
        select: 'orderId status createdAt total',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.affiliateOrderModel.countDocuments({ affiliate: affiliate._id });

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // (Admin/System) อัปเดต status ของ AffiliateOrder เมื่อ Order เปลี่ยนสถานะ
  async updateOrderStatus(orderId: Types.ObjectId | string, newStatus: 'paid' | 'cancelled') {
    const result = await this.affiliateOrderModel.updateMany(
      { order: orderId },
      { $set: { status: newStatus } },
    );
    return result;
  }

  // ตรวจสอบความถูกต้องของ affiliate code
  async verifyCode(code: string) {
    try {
      const affiliate = await this.affiliateModel.findOne({ 
        code: code.toUpperCase(),
        isActive: true 
      }).populate('user', 'name firstName lastName email');

      if (!affiliate) {
        return {
          valid: false,
          message: 'Affiliate code not found or inactive'
        };
      }

      // Type assertion สำหรับ user object
      const user = affiliate.user as any;

      return {
        valid: true,
        affiliate: {
          id: affiliate._id,
          code: affiliate.code,
          name: user?.name || user?.firstName || 'Affiliate',
          commissionRate: affiliate.commissionRate
        },
        message: 'Valid affiliate code'
      };
    } catch (error) {
      console.error('Error verifying affiliate code:', error);
      return {
        valid: false,
        message: 'Error verifying affiliate code'
      };
    }
  }
}
