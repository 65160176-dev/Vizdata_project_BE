import { Controller, Get, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(@Req() req: any) {
    return this.wishlistService.findByUserId(req.user.userId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add product to wishlist' })
  async addToWishlist(@Req() req: any, @Param('productId') productId: string) {
    return this.wishlistService.addProduct(req.user.userId, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  async removeFromWishlist(@Req() req: any, @Param('productId') productId: string) {
    return this.wishlistService.removeProduct(req.user.userId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear wishlist' })
  async clearWishlist(@Req() req: any) {
    return this.wishlistService.clear(req.user.userId);
  }
}
