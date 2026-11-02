// ==============================================================================
// DineGo Backend — Update Promotion DTO (Phase 5.2)
// ==============================================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePromotionDto {
  @ApiPropertyOptional({
    description: 'Tên hiển thị của voucher',
    example: 'Giảm 50K cho đơn từ 250K',
  })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @MaxLength(200, { message: 'name cannot exceed 200 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết điều kiện sử dụng',
    example: 'Áp dụng cho các ngày trong tuần',
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(1000, { message: 'description cannot exceed 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng tối thiểu để áp dụng voucher (VND)',
    example: 150000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'minOrderValue must be a number' })
  @Min(0, { message: 'minOrderValue must be >= 0' })
  minOrderValue?: number;

  @ApiPropertyOptional({
    description: 'Số tiền giảm tối đa',
    example: 60000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'maxDiscountAmount must be a number' })
  @Min(0, { message: 'maxDiscountAmount must be >= 0' })
  maxDiscountAmount?: number;

  @ApiPropertyOptional({
    description: 'Thời điểm bắt đầu áp dụng (ISO 8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'startDate must be a valid Date' })
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Thời điểm kết thúc áp dụng (ISO 8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid Date' })
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Giới hạn tổng số lượt sử dụng voucher',
    example: 2000,
  })
  @IsOptional()
  @IsInt({ message: 'maxUsage must be an integer' })
  @Min(1, { message: 'maxUsage must be at least 1' })
  maxUsage?: number;

  @ApiPropertyOptional({
    description: 'Số lượt sử dụng tối đa của mỗi người dùng',
    example: 2,
  })
  @IsOptional()
  @IsInt({ message: 'maxUsagePerUser must be an integer' })
  @Min(1, { message: 'maxUsagePerUser must be at least 1' })
  maxUsagePerUser?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động của voucher',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
