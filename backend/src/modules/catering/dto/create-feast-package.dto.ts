import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FeastDishDto {
  @ApiProperty({ example: 'Gà Hấp Lá Chanh', description: 'Tên món ăn trong mâm cỗ' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'MAIN',
    enum: ['APPETIZER', 'MAIN', 'SOUP', 'DESSERT'],
    description: 'Phân loại món trong bữa tiệc',
  })
  @IsEnum(['APPETIZER', 'MAIN', 'SOUP', 'DESSERT'])
  course!: 'APPETIZER' | 'MAIN' | 'SOUP' | 'DESSERT';

  @ApiProperty({ example: 'Gà ta thả vườn hấp lá chanh thơm ngon', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, description: 'Phụ thu nếu đổi sang món này', required: false })
  @IsOptional()
  @IsNumber()
  extraPrice?: number;
}

export class CreateFeastPackageDto {
  @ApiProperty({ example: 'merchant-uuid-123', description: 'ID của nhà hàng cung cấp' })
  @IsString()
  @IsNotEmpty()
  merchantId!: string;

  @ApiProperty({ example: 'Mâm Cỗ Cưới Hoàng Kim 10 Món', description: 'Tên gói mâm cỗ mẫu' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'WEDDING',
    enum: ['WEDDING', 'DEATH_ANNIVERSARY', 'HOUSEWARMING', 'PARTY', 'OTHER'],
    description: 'Loại hình sự kiện phù hợp',
  })
  @IsEnum(['WEDDING', 'DEATH_ANNIVERSARY', 'HOUSEWARMING', 'PARTY', 'OTHER'])
  eventType!: 'WEDDING' | 'DEATH_ANNIVERSARY' | 'HOUSEWARMING' | 'PARTY' | 'OTHER';

  @ApiProperty({ example: 'Gói mâm cỗ cao cấp dành cho tiệc cưới truyền thống', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [FeastDishDto], description: 'Danh sách các món ăn trong mâm' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeastDishDto)
  dishes!: FeastDishDto[];

  @ApiProperty({ example: 10, description: 'Số người phục vụ trên 1 mâm', default: 10 })
  @IsInt()
  @Min(1)
  servingsPerTable!: number;

  @ApiProperty({ example: 2500000, description: 'Đơn giá cho 1 mâm cỗ (VND)' })
  @IsNumber()
  @Min(100000)
  pricePerTable!: number;

  @ApiProperty({ example: 30, description: 'Công suất tối đa số mâm nhận trong 1 ngày', default: 20 })
  @IsInt()
  @Min(1)
  maxTablesPerDay!: number;

  @ApiProperty({ example: 'https://cdn.dinego.vn/feasts/wedding-gold.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

