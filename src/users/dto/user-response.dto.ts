import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f789012345' })
  _id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'johndoe@example.com' })
  email: string;

  @ApiProperty({ example: 'user' })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  updatedAt: Date;
}
