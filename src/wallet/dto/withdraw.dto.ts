import { IsNumber, IsString, Min, IsNotEmpty } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(100, { message: 'ยอดถอนขั้นต่ำคือ 100 บาท' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุข้อมูลบัญชีธนาคาร' })
  bankInfo: string;
}