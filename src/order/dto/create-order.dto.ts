import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean, // ✅ อย่าลืม import IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString() @IsOptional() productId: string;
  @IsString() name: string;
  @IsNumber() price: number;
  @IsNumber() qty: number;
  @IsString() @IsOptional() image: string;
  // optional affiliate reference per item (affiliate code or id)
  @IsString() @IsOptional() refAffiliateId?: string;
}

export class CreateOrderDto {
  @IsString() orderId: string;
  @IsString() @IsOptional() user: string;
  @IsString() address: string;
  @IsString() customer: string;
  @IsString() date: string;
  @IsString() email: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  item: OrderItemDto[];

  @IsString() status: string;
  @IsNumber() total: number;
  @IsNumber() @IsOptional() shippingCost: number;
  @IsOptional() @IsString() seller: string;
  // Deprecated: do not use global affiliateId at order-level
  @IsOptional() @IsString() affiliateId?: string;

  // ✅✅ เพิ่ม Validation ตรงนี้ ✅✅
  @IsOptional()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  note: string;

  @IsOptional()
  @IsBoolean()
  isCancelRequest: boolean;
}