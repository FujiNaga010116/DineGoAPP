// ==============================================================================
// DineGo Backend — Cancel Order DTO (Phase 5.3)
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Lý do hủy đơn hàng',
    example: 'Thay đổi kế hoạch / Đặt nhầm địa chỉ',
  })
  @IsString({ message: 'cancelReason must be a string' })
  @IsNotEmpty({ message: 'cancelReason is required' })
  @MinLength(3, { message: 'cancelReason must be at least 3 characters' })
  @MaxLength(500, { message: 'cancelReason cannot exceed 500 characters' })
  cancelReason: string;
}
