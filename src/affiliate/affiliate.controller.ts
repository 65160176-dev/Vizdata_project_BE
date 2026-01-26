import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { RegisterAffiliateDto } from './dto/register-affiliate.dto';

// สมมติว่ามี AuthGuard (ถ้าไม่มีก็ใช้ req.headers หรือวิธีอื่น)
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('affiliate')
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  // POST /affiliate/register
  // @UseGuards(JwtAuthGuard) // ใส่ Guard ถ้ามี
  @Post('register')
  async register(@Body() dto: RegisterAffiliateDto, @Request() req: any, @Query('userId') queryUserId?: string) {
    // ดึง userId จาก req.user (ถ้ามี Guard) หรือจาก req.body/query
    const userId = req.user?.userId || req.user?._id || dto.userId || queryUserId;
    console.log('Register attempt:', { userId, queryUserId, body: dto });
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    try {
      return await this.affiliateService.register(userId, dto);
    } catch (error) {
      console.error('Register error:', error);
      throw new HttpException(error.message || 'Registration failed', HttpStatus.BAD_REQUEST);
    }
  }

  // GET /affiliate/my-affiliate
  // @UseGuards(JwtAuthGuard)
  @Get('my-affiliate')
  async getMyAffiliate(@Request() req: any, @Query('userId') queryUserId?: string) {
    const userId = req.user?.userId || req.user?._id || queryUserId;
    console.log('GetMyAffiliate attempt:', { userId, queryUserId });
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    try {
      return await this.affiliateService.getMyAffiliate(userId);
    } catch (error) {
      console.error('GetMyAffiliate error:', error);
      throw new HttpException(error.message || 'Failed to get affiliate', HttpStatus.BAD_REQUEST);
    }
  }

  // GET /affiliate/dashboard
  // @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboard(@Request() req: any, @Query('userId') queryUserId?: string) {
    const userId = req.user?.userId || req.user?._id || queryUserId;
    console.log('GetDashboard attempt:', { userId, queryUserId });
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    try {
      return await this.affiliateService.getDashboard(userId);
    } catch (error) {
      console.error('GetDashboard error:', error);
      throw new HttpException(error.message || 'Failed to get dashboard', HttpStatus.BAD_REQUEST);
    }
  }

  // GET /affiliate/orders?page=1&limit=20
  // @UseGuards(JwtAuthGuard)
  @Get('orders')
  async getOrders(
    @Request() req: any,
    @Query('userId') queryUserId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.userId || req.user?._id || queryUserId;
    console.log('GetOrders attempt:', { userId, queryUserId, page, limit });
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    try {
      return await this.affiliateService.getOrders(userId, page || 1, limit || 20);
    } catch (error) {
      console.error('GetOrders error:', error);
      throw new HttpException(error.message || 'Failed to get orders', HttpStatus.BAD_REQUEST);
    }
  }

  // GET /affiliate/verify/:code - ตรวจสอบความถูกต้องของ affiliate code
  @Get('verify/:code')
  async verifyAffiliateCode(@Param('code') code: string) {
    try {
      return await this.affiliateService.verifyCode(code);
    } catch (error) {
      console.error('Verify affiliate code error:', error);
      throw new HttpException(error.message || 'Verification failed', HttpStatus.BAD_REQUEST);
    }
  }

  // GET /affiliate/test/create - สร้าง affiliate ทดสอบ (ลบหลังทดสอบ)
  @Get('test/create')
  async createTestAffiliate() {
    try {
      // สร้าง test affiliate
      const testAffiliate = await this.affiliateService.register('695f6d76b5885b18af0ac499', {});
      return {
        message: 'Test affiliate created',
        affiliate: testAffiliate
      };
    } catch (error) {
      console.error('Create test affiliate error:', error);
      throw new HttpException(error.message || 'Creation failed', HttpStatus.BAD_REQUEST);
    }
  }
}
