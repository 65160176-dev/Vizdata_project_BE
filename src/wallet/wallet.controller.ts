import { Controller, Get, Post, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get('my-wallet')
  async getMyWallet(@Request() req) {
    // ✅ เพิ่มเครื่องหมาย ? (Optional Chaining) ป้องกันโค้ดพัง
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้งานในระบบ (Token อาจจะไม่สมบูรณ์)');
    }

    return this.walletService.getMyWallet(userId);
  }

  @Post('withdraw')
  async withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้งานในระบบ');
    }

    return this.walletService.withdraw(userId, withdrawDto);
  }
}