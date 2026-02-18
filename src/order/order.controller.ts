import { Controller, Get, Post, Body, Put, Param, Delete, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('order') // URL จะเป็น /api/order
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {

    return this.orderService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get('best-sellers')
  findBestSellers(
    @Query('limit') limit?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 5;
    return this.orderService.findBestSellers(parsedLimit, sellerId);
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