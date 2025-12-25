import { IsEmail, IsNotEmpty, IsString, MinLength, IsNumber, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsNumber()
  userType?: number; // 0 = seller, 1 = user (default)
}
