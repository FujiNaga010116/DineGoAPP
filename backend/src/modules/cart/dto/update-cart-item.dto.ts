// ==============================================================================
// DineGo Backend — Update Cart Item DTO (Phase 5.1)
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Số lượng món mới (tối thiểu 1, tối đa 99)',
    example: 2,
    minimum: 1,
    maximum: 99,
  })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(99, { message: 'quantity cannot exceed 99' })
  @IsNotEmpty({ message: 'quantity is required' })
  quantity: number;
}
