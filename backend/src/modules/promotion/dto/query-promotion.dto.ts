// ==============================================================================
// DineGo Backend — Query Promotion DTO (Phase 5.2)
// ==============================================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PromotionScope } from '../../../common/enums/index.js';

export class QueryPromotionDto {
  @ApiPropertyOptional({ default: 1, description: 'Trang cần lấy (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Số lượng phần tử mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Lọc theo ID Merchant (nếu muốn xem voucher của quán cụ thể)',
  })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional({
    enum: PromotionScope,
    description: 'Lọc theo phạm vi (GLOBAL hoặc MERCHANT)',
  })
  @IsOptional()
  @IsEnum(PromotionScope)
  scope?: PromotionScope;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động (true/false)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
