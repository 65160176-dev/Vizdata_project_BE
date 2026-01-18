import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // เช็ค path ให้ถูก
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

// สร้าง Interface สำหรับ Type ของ Request
interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('address')
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) { }

  // -----------------------------------------------------
  // 🔓 1. ดูข้อมูลทั้งหมดในระบบ (Public) - ไม่ต้อง Login
  // -----------------------------------------------------
  // ⚠️ สำคัญ: ต้องวางไว้ *ก่อน* Get(':id') เสมอ
  @Get('all')
  findAllSystem() {
    return this.addressService.findAllSystem();
  }

  // -----------------------------------------------------
  // 🔒 2. โซนที่ต้อง Login (Protected)
  // -----------------------------------------------------

  @Post()
  @UseGuards(JwtAuthGuard) // 🔒 บังคับ Login
  @ApiBearerAuth() // 🔑 บอก Swagger ว่าต้องใช้ Token
  create(
    @Body() createAddressDto: CreateAddressDto,
    @Req() req: RequestWithUser,
  ) {
    return this.addressService.create(req.user.userId, createAddressDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll(@Req() req: RequestWithUser) {
    // ดึงเฉพาะของ User คนนั้นๆ
    return this.addressService.findAll(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.addressService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @Req() req: RequestWithUser,
  ) {
    return this.addressService.update(req.user.userId, id, updateAddressDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.addressService.remove(req.user.userId, id);
  }
}