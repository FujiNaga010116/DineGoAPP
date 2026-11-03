import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EstimateShippingDto {
  @ApiProperty({
    example: 3.5,
    description: 'Khoảng cách ước tính tính bằng km (nếu đã tính trước)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Khoảng cách không thể là số âm' })
  distanceKm?: number;

  @ApiProperty({
    example: 10.776889,
    description: 'Vĩ độ của khách hàng',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  customerLat?: number;

  @ApiProperty({
    example: 106.700806,
    description: 'Kinh độ của khách hàng',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  customerLng?: number;

  @ApiProperty({
    example: 'merchant-uuid-123',
    description: 'ID của nhà hàng',
    required: false,
  })
  @IsOptional()
  @IsString()
  merchantId?: string;
}

