import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID danh mục món (UUID)' })
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId: string;

  @ApiProperty({ example: 'Cơm Sườn Cốt Lết Nướng', description: 'Tên món ăn' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'name must be a string' })
  @MinLength(2, { message: 'name must be at least 2 characters long' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @ApiPropertyOptional({ example: 'Sườn nướng mềm thơm lừng gia vị bí truyền', description: 'Mô tả món ăn' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://images.dinego.vn/com-suon.jpg', description: 'Ảnh món ăn' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 45000, description: 'Giá tiền cơ bản (VNĐ)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'basePrice must be a valid number' })
  @Min(0, { message: 'basePrice cannot be negative' })
  @IsNotEmpty({ message: 'basePrice is required' })
  basePrice: number;

  @ApiPropertyOptional({ example: true, default: true, description: 'Trạng thái còn bán (in stock)' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean = true;

  @ApiPropertyOptional({ example: true, default: true, description: 'Trạng thái kinh doanh (active)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Thứ tự hiển thị' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;
}
