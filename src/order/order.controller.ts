import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('order') // URL จะเป็น /api/order
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    // 🔍 [Debug Step 1] ดูว่า Frontend ส่งอะไรมาบ้าง
    console.log('====================================');
    console.log('📦 DATA FROM FRONTEND:', JSON.stringify(createOrderDto, null, 2));
    console.log('🛒 Seller Field:', createOrderDto.seller);
    console.log('====================================');

    return this.orderService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id); // ❌ ห้ามใส่ + หน้า id
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: any) {
    return this.orderService.update(id, updateOrderDto); // ❌ ห้ามใส่ + หน้า id
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(id); // ❌ ห้ามใส่ + หน้า id
  }
}