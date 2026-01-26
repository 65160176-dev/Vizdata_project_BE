// create-order.dto.ts
import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  // 🚩 แก้ไข: เปลี่ยนจาก @IsMongoId เป็น @IsString
  @IsString()
  @IsOptional()
  productId: string;

  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  qty: number;

  @IsString()
  @IsOptional()
  image: string;

  // ❌ ลบ seller ออกจากตรงนี้ครับ เพราะสินค้าแต่ละชิ้นไม่ต้องเก็บ seller ซ้ำ
}

export class CreateOrderDto {
  @IsString()
  orderId: string;

  // 🚩 แก้ไข: เปลี่ยนจาก @IsMongoId เป็น @IsString
  @IsString()
  @IsOptional()
  user: string;

  @IsString()
  address: string;

  @IsString()
  customer: string;

  @IsString()
  date: string;

  @IsString()
  email: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  item: OrderItemDto[];

  @IsString()
  status: string;

  @IsNumber()
  total: number;

  @IsNumber()
  @IsOptional()
  shippingCost: number;

  // ✅✅ ย้ายมาใส่ตรงนี้ครับ (ระดับเดียวกับ orderId) ✅✅
  @IsOptional()
  @IsString()
  seller: string;
    // Optional affiliate id passed from frontend when user came via affiliate link
  @IsOptional()
  @IsString()
  affiliateId?: string;
}