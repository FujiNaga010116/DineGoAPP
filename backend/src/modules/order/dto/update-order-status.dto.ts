// ==============================================================================
// DineGo Backend — Update Order Status DTO (Phase 5.3)
// ==============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../../../common/enums/index.js';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    description: 'Trạng thái mới của đơn hàng',
    example: OrderStatus.CONFIRMED,
  })
  @IsEnum(OrderStatus, {
    message: 'status must be a valid OrderStatus (CONFIRMED, PREPARING, READY_FOR_PICKUP, COMPLETED, CANCELLED)',
  })
  @IsNotEmpty({ message: 'status is required' })
  status: OrderStatus;

  @ApiPropertyOptional({
    description: 'Ghi chú thay đổi trạng thái hoặc lý do hủy (nếu chuyển sang CANCELLED)',
    example: 'Nhà hàng đã xác nhận đơn và đang chuẩn bị món',
  })
  @IsOptional()
  @IsString({ message: 'note must be a string' })
  @MaxLength(500, { message: 'note cannot exceed 500 characters' })
  note?: string;
}
