import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateToppingDto {
  @ApiProperty({ example: 'Trứng Ốp La', description: 'Tên món ăn kèm / Topping' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'name must be a string' })
  @MinLength(2, { message: 'name must be at least 2 characters long' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @ApiProperty({ example: 8000, description: 'Giá tiền topping (VNĐ)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a valid number' })
  @Min(0, { message: 'price cannot be negative' })
  @IsNotEmpty({ message: 'price is required' })
  price: number;

  @ApiPropertyOptional({ example: true, default: true, description: 'Trạng thái còn bán' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean = true;

  @ApiPropertyOptional({ example: true, default: true, description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
