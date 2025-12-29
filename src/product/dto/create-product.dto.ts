// src/product/dto/create-product.dto.ts
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export class CreateProductDto {
  @IsOptional()
  userId?: Types.ObjectId;

  @IsString()
  name: string;

  @IsOptional() // อนุญาตให้ไม่ส่งได้ (หรือเป็นค่าว่างได้)
  @IsString()
  image: string;

  @IsNumber()
  stock: number;

  @IsNumber()
  price: number;

  @IsNumber()
  commission: number;

  @IsNumber()
  weight: number;

  @IsOptional()
  @IsString()
  shippingCost: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsString()
  category: string;
}