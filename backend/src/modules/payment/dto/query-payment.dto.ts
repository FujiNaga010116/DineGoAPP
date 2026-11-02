// ==============================================================================
// DineGo Backend — Query Payment DTO (Phase 6)
// ==============================================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaymentStatus } from '../../../common/enums/index.js';

export class QueryPaymentDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái thanh toán',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Trạng thái thanh toán không hợp lệ' })
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Số trang (1-indexed)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi trên mỗi trang',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
