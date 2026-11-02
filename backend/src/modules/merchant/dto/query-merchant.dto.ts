import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryType } from '../../../common/enums/index.js';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMerchantDto {
  @ApiPropertyOptional({ default: 1, description: 'Số trang (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Số lượng phần tử mỗi trang (tối đa 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tên hoặc địa chỉ quán' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DeliveryType, description: 'Lọc theo hình thức giao hàng' })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;
}
