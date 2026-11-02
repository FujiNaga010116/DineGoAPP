// ==============================================================================
// DineGo Backend — Create Promotion DTO (Phase 5.2)
// ==============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountType, PromotionScope } from '../../../common/enums/index.js';

export class CreatePromotionDto {
  @ApiProperty({
    description: 'Mã voucher (duy nhất, viết hoa, không dấu, chữ và số)',
    example: 'DINEGO50K',
  })
  @IsString({ message: 'code must be a string' })
  @IsNotEmpty({ message: 'code is required' })
  @Matches(/^[A-Z0-9_]{3,30}$/, {
    message:
      'code must contain only uppercase letters, numbers and underscores (3-30 chars)',
  })
  code: string;

  @ApiProperty({
    description: 'Tên hiển thị của voucher',
    example: 'Giảm 50K cho đơn từ 200K',
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(200, { message: 'name cannot exceed 200 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết điều kiện sử dụng',
    example: 'Áp dụng cho tất cả nhà hàng toàn quốc',
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(1000, { message: 'description cannot exceed 1000 characters' })
  description?: string;

  @ApiProperty({
    enum: DiscountType,
    description: 'Loại giảm giá: PERCENTAGE hoặc FIXED_AMOUNT',
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType, {
    message: 'discountType must be PERCENTAGE or FIXED_AMOUNT',
  })
  @IsNotEmpty({ message: 'discountType is required' })
  discountType: DiscountType;

  @ApiProperty({
    description: 'Giá trị giảm (nếu PERCENTAGE: 1-100; nếu FIXED_AMOUNT: > 0)',
    example: 10,
  })
  @IsNumber({}, { message: 'discountValue must be a number' })
  @Min(0.01, { message: 'discountValue must be greater than 0' })
  discountValue: number;

  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng tối thiểu để áp dụng voucher (VND)',
    default: 0,
    example: 100000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'minOrderValue must be a number' })
  @Min(0, { message: 'minOrderValue must be >= 0' })
  minOrderValue?: number = 0;

  @ApiPropertyOptional({
    description:
      'Số tiền giảm tối đa (khuyến nghị bắt buộc với loại PERCENTAGE)',
    example: 50000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'maxDiscountAmount must be a number' })
  @Min(0, { message: 'maxDiscountAmount must be >= 0' })
  maxDiscountAmount?: number;

  @ApiProperty({
    description: 'Thời điểm bắt đầu áp dụng (ISO 8601)',
    example: '2026-10-28T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate({ message: 'startDate must be a valid Date' })
  @IsNotEmpty({ message: 'startDate is required' })
  startDate: Date;

  @ApiProperty({
    description: 'Thời điểm kết thúc áp dụng (ISO 8601)',
    example: '2026-12-31T23:59:59.000Z',
  })
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid Date' })
  @IsNotEmpty({ message: 'endDate is required' })
  endDate: Date;

  @ApiPropertyOptional({
    description: 'Giới hạn tổng số lượt sử dụng voucher (null là không giới hạn)',
    example: 1000,
  })
  @IsOptional()
  @IsInt({ message: 'maxUsage must be an integer' })
  @Min(1, { message: 'maxUsage must be at least 1' })
  maxUsage?: number;

  @ApiPropertyOptional({
    description: 'Số lượt sử dụng tối đa của mỗi người dùng (mặc định 1)',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'maxUsagePerUser must be an integer' })
  @Min(1, { message: 'maxUsagePerUser must be at least 1' })
  maxUsagePerUser?: number = 1;

  @ApiPropertyOptional({
    enum: PromotionScope,
    description: 'Phạm vi áp dụng: GLOBAL (toàn sàn) hoặc MERCHANT (quán cụ thể)',
    default: PromotionScope.GLOBAL,
    example: PromotionScope.GLOBAL,
  })
  @IsOptional()
  @IsEnum(PromotionScope, { message: 'scope must be GLOBAL or MERCHANT' })
  scope?: PromotionScope = PromotionScope.GLOBAL;

  @ApiPropertyOptional({
    description: 'ID của Merchant nếu scope là MERCHANT',
    example: '8fb95777-2650-4789-968b-0b055c175ae9',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'merchantId must be a valid UUID' })
  merchantId?: string;
}
