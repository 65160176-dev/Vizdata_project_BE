import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WithdrawDto } from './dto/withdraw.dto';
// ✅ ตรวจสอบ path ของ JwtAuthGuard ให้ตรงกับโปรเจกต์ของคุณ
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard) // บังคับ Login ทุก API
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('my-wallet')
  async getMyWallet(@Request() req) {
    // ดึง User ID จาก Token
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.walletService.getMyWallet(userId);
  }

  @Post('withdraw')
  async withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.walletService.withdraw(userId, withdrawDto);
  }
}