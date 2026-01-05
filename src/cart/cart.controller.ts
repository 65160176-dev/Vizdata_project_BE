import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(@Req() req: any) {
    const cart = await this.cartService.findByUserId(req.user.userId);
    console.log('===== Cart Controller Response =====');
    console.log('Cart items count:', cart.items.length);
    if (cart.items.length > 0) {
      const firstItem = cart.items[0];
      console.log('First item:', JSON.stringify(firstItem, null, 2));
      console.log('First item productId type:', typeof firstItem.productId);
      if (firstItem.productId && typeof firstItem.productId === 'object') {
        const product = firstItem.productId as any;
        console.log('Product name:', product.name);
        console.log('Product price:', product.price);
        console.log('Product image:', product.image);
      }
    }
    console.log('====================================');
    return cart;
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(
    @Req() req: any,
    @Body() body: { productId: string; quantity: number },
  ) {
    return this.cartService.addItem(req.user.userId, body.productId, body.quantity);
  }

  @Put(':productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateQuantity(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateQuantity(req.user.userId, productId, body.quantity);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeFromCart(@Req() req: any, @Param('productId') productId: string) {
    return this.cartService.removeItem(req.user.userId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@Req() req: any) {
    return this.cartService.clear(req.user.userId);
  }
}
