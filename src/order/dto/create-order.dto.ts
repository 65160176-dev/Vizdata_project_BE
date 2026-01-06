import { IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  qty: number;
}

export class CreateOrderDto {
  @IsString()
  orderId: string;

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
}