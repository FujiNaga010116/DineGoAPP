import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryType } from '../../../common/enums/index.js';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMerchantDto {
  @ApiPropertyOptional({ example: 'Cơm Tấm Ba Ghiền', description: 'Tên quán ăn / nhà hàng' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'name must be a string' })
  @MinLength(2, { message: 'name must be at least 2 characters long' })
  name?: string;

  @ApiPropertyOptional({ example: 'Chuyên cơm tấm sườn nướng', description: 'Mô tả quán' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '84 Đặng Văn Ngữ, Phú Nhuận', description: 'Địa chỉ quán' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  address?: string;

  @ApiPropertyOptional({ example: '0908123456', description: 'Số điện thoại quán' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'phoneNumber must be a valid 10-digit phone number' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 10.7932, description: 'Tọa độ vĩ độ (Latitude)' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 106.6715, description: 'Tọa độ kinh độ (Longitude)' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: '07:00', description: 'Giờ mở cửa (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  openingTime?: string;

  @ApiPropertyOptional({ example: '21:00', description: 'Giờ đóng cửa (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  closingTime?: string;

  @ApiPropertyOptional({ enum: DeliveryType, description: 'Hình thức giao hàng' })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ example: true, description: 'Đang mở cửa nhận đơn' })
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động (active)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'https://images.dinego.vn/logo.png', description: 'Ảnh đại diện' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://images.dinego.vn/cover.png', description: 'Ảnh bìa' })
  @IsOptional()
  @IsString()
  coverUrl?: string;
}
