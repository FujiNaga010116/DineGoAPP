import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewFeastBookingDto {
  @ApiProperty({
    example: 'APPROVED_WAITING_DEPOSIT',
    enum: ['APPROVED_WAITING_DEPOSIT', 'REJECTED', 'PREPARING', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    description: 'Trạng thái chuyển tiếp của đơn cỗ',
  })
  @IsEnum(['APPROVED_WAITING_DEPOSIT', 'REJECTED', 'PREPARING', 'DELIVERED', 'COMPLETED', 'CANCELLED'])
  @IsNotEmpty()
  status!:
    | 'APPROVED_WAITING_DEPOSIT'
    | 'REJECTED'
    | 'PREPARING'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'CANCELLED';

  @ApiProperty({
    example: 'Quán đã kiểm tra slot và đồng ý tiếp nhận phục vụ tiệc cưới',
    required: false,
  })
  @IsOptional()
  @IsString()
  merchantNotes?: string;
}

export class PayDepositDto {
  @ApiProperty({
    example: 'MOMO',
    enum: ['MOMO', 'VNPAY', 'BANK_TRANSFER'],
    description: 'Phương thức thanh toán cọc đợt 1',
    default: 'MOMO',
  })
  @IsEnum(['MOMO', 'VNPAY', 'BANK_TRANSFER'])
  paymentMethod!: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER';
}

export class PayRemainingDto {
  @ApiProperty({
    example: 'MOMO',
    enum: ['MOMO', 'VNPAY', 'BANK_TRANSFER', 'CASH_AT_EVENT'],
    description: 'Phương thức thanh toán đợt 2',
    default: 'MOMO',
  })
  @IsEnum(['MOMO', 'VNPAY', 'BANK_TRANSFER', 'CASH_AT_EVENT'])
  paymentMethod!: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER' | 'CASH_AT_EVENT';
}

export class BlockDateDto {
  @ApiProperty({
    example: '2026-11-25',
    description: 'Ngày nhà hàng cần chặn không nhận thêm tiệc (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({
    example: 'Đã nhận đủ công suất tiệc cưới lớn của công ty ABC',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

