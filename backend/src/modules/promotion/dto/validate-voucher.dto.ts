// ==============================================================================
// DineGo Backend — Validate Voucher DTO (Phase 5.2)
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ValidateVoucherDto {
  @ApiProperty({
    description: 'Mã voucher cần kiểm tra với giỏ hàng hiện tại',
    example: 'DINEGO50K',
  })
  @IsString({ message: 'code must be a string' })
  @IsNotEmpty({ message: 'code is required' })
  @Matches(/^[A-Z0-9_]{3,30}$/, {
    message:
      'code must contain only uppercase letters, numbers and underscores',
  })
  code: string;
}
