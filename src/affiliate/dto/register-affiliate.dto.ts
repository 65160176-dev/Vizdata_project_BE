import { IsOptional, IsNumber, IsString } from 'class-validator';

export class RegisterAffiliateDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  commissionRate?: number;
}
