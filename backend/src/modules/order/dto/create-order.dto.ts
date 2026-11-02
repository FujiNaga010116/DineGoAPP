// ==============================================================================
// DineGo Backend — Create Order DTO (Phase 5.3)
// ==============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Địa chỉ nhận hàng chi tiết',
    example: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  })
  @IsString({ message: 'deliveryAddress must be a string' })
  @IsNotEmpty({ message: 'deliveryAddress is required' })
  @MaxLength(500, { message: 'deliveryAddress cannot exceed 500 characters' })
  deliveryAddress: string;

  @ApiProperty({
    description: 'Họ tên người nhận hàng',
    example: 'Nguyễn Văn A',
  })
  @IsString({ message: 'recipientName must be a string' })
  @IsNotEmpty({ message: 'recipientName is required' })
  @MaxLength(200, { message: 'recipientName cannot exceed 200 characters' })
  recipientName: string;

  @ApiProperty({
    description: 'Số điện thoại nhận hàng',
    example: '0901234567',
  })
  @IsString({ message: 'recipientPhone must be a string' })
  @IsNotEmpty({ message: 'recipientPhone is required' })
  @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, {
    message: 'recipientPhone must be a valid Vietnamese phone number',
  })
  recipientPhone: string;

  @ApiPropertyOptional({
    description: 'Ghi chú đơn hàng cho quán/tài xế',
    example: 'Giao giờ hành chính, không lấy đá',
  })
  @IsOptional()
  @IsString({ message: 'customerNote must be a string' })
  @MaxLength(500, { message: 'customerNote cannot exceed 500 characters' })
  customerNote?: string;

  @ApiPropertyOptional({
    description: 'Mã voucher khuyến mãi áp dụng cho đơn',
    example: 'DINEGO30K',
  })
  @IsOptional()
  @IsString({ message: 'voucherCode must be a string' })
  @Matches(/^[A-Z0-9_]{3,30}$/, {
    message: 'voucherCode must contain only uppercase letters, numbers and underscores (3-30 chars)',
  })
  voucherCode?: string;

  @ApiPropertyOptional({
    description: 'Khóa idempotency để ngăn chặn việc tạo đơn trùng lặp do timeout hoặc retry mạng',
    example: 'idem-ord-89f417e2-4c22-4416-8659-4bf91ec87920',
  })
  @IsOptional()
  @IsString({ message: 'idempotencyKey must be a string' })
  @MaxLength(100, { message: 'idempotencyKey cannot exceed 100 characters' })
  idempotencyKey?: string;
}
