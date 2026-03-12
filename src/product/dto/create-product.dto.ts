import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsOptional()
  userId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string;

  @IsNumber()
  @Type(() => Number)
  stock: number;

  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsNumber()
  @Type(() => Number)
  commission: number;

  @IsNumber()
  @Type(() => Number)
  weight: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  shippingCost: number;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Description ต้องยาวไม่เกิน 300 ตัวอักษร' }) // 👈 เพิ่มส่วนนี้เข้าไป
  description: string;

  @IsString()
  category: string;
}
