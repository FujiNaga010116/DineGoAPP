import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryType } from '../../../common/enums/index.js';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty({ example: 'Cơm Tấm Ba Ghiền', description: 'Tên quán ăn / nhà hàng' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'name must be a string' })
  @MinLength(2, { message: 'name must be at least 2 characters long' })
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @ApiPropertyOptional({ example: 'Chuyên cơm tấm sườn bì chả nướng than hoa', description: 'Mô tả ngắn về quán' })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string;

  @ApiProperty({ example: '84 Đặng Văn Ngữ, Phường 10, Phú Nhuận, TP.HCM', description: 'Địa chỉ kinh doanh' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'address must be a string' })
  @MinLength(5, { message: 'address must be at least 5 characters long' })
  @IsNotEmpty({ message: 'address is required' })
  address: string;

  @ApiProperty({ example: '0908123456', description: 'Số điện thoại hotline quán' })
  @IsString({ message: 'phoneNumber must be a string' })
  @Matches(/^[0-9]{10}$/, { message: 'phoneNumber must be a valid 10-digit phone number' })
  @IsNotEmpty({ message: 'phoneNumber is required' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 10.7932, description: 'Tọa độ vĩ độ (Latitude)' })
  @IsOptional()
  @IsNumber({}, { message: 'latitude must be a number' })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 106.6715, description: 'Tọa độ kinh độ (Longitude)' })
  @IsOptional()
  @IsNumber({}, { message: 'longitude must be a number' })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: '07:00', description: 'Giờ mở cửa (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'openingTime must be in HH:mm format' })
  openingTime?: string;

  @ApiPropertyOptional({ example: '21:00', description: 'Giờ đóng cửa (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'closingTime must be in HH:mm format' })
  closingTime?: string;

  @ApiPropertyOptional({ enum: DeliveryType, default: DeliveryType.DINEGO_SHIPPER, description: 'Hình thức giao hàng' })
  @IsOptional()
  @IsEnum(DeliveryType, { message: 'deliveryType must be one of: MERCHANT_SELF, DINEGO_SHIPPER, BOTH' })
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ example: 'https://images.dinego.vn/logo.png', description: 'Ảnh đại diện quán' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://images.dinego.vn/cover.png', description: 'Ảnh bìa quán' })
  @IsOptional()
  @IsString()
  coverUrl?: string;
}
