import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'johndoe@example.com', description: 'Email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 6 characters)',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'user', description: 'User role', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    example: true,
    description: 'Is user active',
    required: false,
  })
  @IsOptional()
  isActive?: boolean;
}
