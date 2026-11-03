import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class FeastQuoteDto {
  @ApiProperty({ example: 'package-uuid-123', description: 'ID gói mâm cỗ mẫu cần báo giá' })
  @IsString()
  @IsNotEmpty()
  packageId!: string;

  @ApiProperty({ example: 15, description: 'Số lượng mâm cỗ muốn đặt', default: 5 })
  @IsInt()
  @Min(1)
  tableCount!: number;

  @ApiProperty({
    example: ['Thêm Tôm Hùm Nướng Bơ Tỏi (+350.000đ/mâm)'],
    description: 'Danh sách các món tùy chỉnh thêm',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  customDishes?: string[];
}

