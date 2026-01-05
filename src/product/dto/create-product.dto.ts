import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer'; // 👈 สำคัญมาก! ต้อง import ตัวนี้

export class CreateProductDto {
  @IsOptional()
  userId?: string; // เปลี่ยนเป็น string รับค่าจาก token ได้ง่ายกว่า

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string;

  @IsNumber()
  @Type(() => Number) // 👈 แปลง String "10" -> Number 10 อัตโนมัติ
  stock: number;

  @IsNumber()
  @Type(() => Number) // 👈
  price: number;

  @IsNumber()
  @Type(() => Number) // 👈
  commission: number;

  @IsNumber()
  @Type(() => Number) // 👈
  weight: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number) // 👈
  shippingCost: number;

  @IsOptional()
  @IsString()
  description: string;

  @IsString()
  category: string;
}