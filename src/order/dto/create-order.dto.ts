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
  // เพื่อให้รับค่า ID อะไรก็ได้ไปก่อน (เช่น ID สินค้าที่เป็นตัวเลข หรือ string ธรรมดา)
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
}

export class CreateOrderDto {
  @IsString()
  orderId: string;

  // 🚩 แก้ไข: เปลี่ยนจาก @IsMongoId เป็น @IsString
  // เพื่อให้รับคำว่า "USER_ID_PLACEHOLDER" ได้โดยไม่ Error
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

  @IsNumber() // ✅ เพิ่มบรรทัดนี้ เพื่อให้รับค่าส่งได้
  @IsOptional() // ใส่เผื่อไว้กรณีออเดอร์เก่าไม่มีค่าส่ง
  shippingCost: number;
}
