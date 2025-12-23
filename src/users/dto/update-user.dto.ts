import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'johndoe', description: 'Username', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'johndoe@example.com', description: 'Email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'newpassword123', description: 'Password (min 6 characters)', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'admin', description: 'User role', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: true, description: 'Is user active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
