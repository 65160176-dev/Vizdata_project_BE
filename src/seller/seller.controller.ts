import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SellerService } from './seller.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sellers')
@Controller('sellers')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all sellers' })
  async findAll() {
    const sellers = await this.sellerService.findAll();
    return {
      success: true,
      data: sellers,
    };
  }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seller profile for current user' })
  async getMyProfile(@Req() req: any) {
    const seller = await this.sellerService.findByUserId(req.user.userId);
    return {
      success: true,
      data: seller,
    };
  }

  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Get seller by user ID' })
  async findByUserId(@Param('userId') userId: string) {
    const seller = await this.sellerService.findByUserId(userId);
    if (!seller) {
      return {
        success: false,
        message: 'Seller not found',
      };
    }
    return seller;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get seller by ID' })
  async findOne(@Param('id') id: string) {
    const seller = await this.sellerService.findById(id);
    return {
      success: true,
      data: seller,
    };
  }
}
