// ==============================================================================
// DineGo Backend — Cart DTOs (Phase 5.1)
// ==============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    description: 'ID của món ăn (MenuItem UUID)',
    example: 'd9b2d63d-a764-482a-9f5b-df7d570bc674',
  })
  @IsUUID(undefined, { message: 'menuItemId must be a valid UUID' })
  @IsNotEmpty({ message: 'menuItemId is required' })
  menuItemId: string;

  @ApiProperty({
    description: 'Số lượng món muốn thêm (tối thiểu 1, tối đa 99)',
    example: 1,
    minimum: 1,
    maximum: 99,
  })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(99, { message: 'quantity cannot exceed 99' })
  @IsNotEmpty({ message: 'quantity is required' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Danh sách ID topping kèm theo (mỗi topping là UUID hợp lệ)',
    type: [String],
    example: ['e8a4a15b-5df6-43b9-a411-cf4939023490'],
  })
  @IsOptional()
  @IsArray({ message: 'toppingIds must be an array' })
  @ArrayUnique({ message: 'toppingIds cannot contain duplicates' })
  @IsUUID(undefined, { each: true, message: 'Each toppingId must be a valid UUID' })
  toppingIds?: string[];

  @ApiPropertyOptional({
    description: 'Ghi chú đặc biệt cho món (ví dụ: ít ngọt, không cay)',
    maxLength: 500,
    example: 'Ít đường, không đá',
  })
  @IsOptional()
  @IsString({ message: 'note must be a string' })
  @MaxLength(500, { message: 'note cannot exceed 500 characters' })
  note?: string;

  @ApiPropertyOptional({
    description:
      'Nếu giỏ hàng đang có món của quán khác, đặt true để tự động làm mới giỏ sang quán mới',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'clearExisting must be a boolean' })
  clearExisting?: boolean = false;
}
