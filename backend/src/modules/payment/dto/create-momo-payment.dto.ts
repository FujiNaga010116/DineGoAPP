// ==============================================================================
// DineGo Backend — Create MoMo Payment DTO (Phase 6)
// ==============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../../common/enums/index.js';

export class CreateMomoPaymentDto {
  @ApiProperty({
    description: 'ID của đơn hàng cần thanh toán (UUID v4)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'orderId không được để trống' })
  @IsUUID('4', { message: 'orderId phải là UUID v4 hợp lệ' })
  orderId: string;

  @ApiPropertyOptional({
    description: 'Phương thức thanh toán MoMo (MOMO_QR, MOMO_ATM, MOMO)',
    enum: PaymentMethod,
    default: PaymentMethod.MOMO_QR,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: 'paymentMethod phải là MOMO, MOMO_QR, MOMO_ATM hoặc COD',
  })
  paymentMethod?: PaymentMethod = PaymentMethod.MOMO_QR;

  @ApiPropertyOptional({
    description: 'Idempotency Key để chống tạo giao dịch trùng lặp khi retry',
    example: 'idem-pay-20261028-001',
  })
  @IsOptional()
  @IsString({ message: 'idempotencyKey phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'idempotencyKey tối đa 100 ký tự' })
  idempotencyKey?: string;
}
