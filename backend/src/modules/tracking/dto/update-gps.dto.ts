import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateGpsLocationDto {
  @ApiProperty({ example: 10.776889, description: 'Vĩ độ GPS của tài xế' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 106.700806, description: 'Kinh độ GPS của tài xế' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({ example: 25.5, description: 'Tốc độ di chuyển (km/h)', required: false })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiProperty({ example: 180, description: 'Hướng di chuyển (độ)', required: false })
  @IsOptional()
  @IsNumber()
  heading?: number;
}

export class AssignShipperDto {
  @ApiProperty({ example: '59-X3 892.14', description: 'Biển số xe của tài xế', required: false })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    example: 'PICKED_UP',
    enum: ['ASSIGNED', 'ARRIVED_AT_STORE', 'PICKED_UP', 'DELIVERING', 'ARRIVED_AT_DESTINATION', 'DELIVERED'],
    description: 'Trạng thái lộ trình giao hàng mới',
  })
  @IsString()
  @IsNotEmpty()
  status!:
    | 'ASSIGNED'
    | 'ARRIVED_AT_STORE'
    | 'PICKED_UP'
    | 'DELIVERING'
    | 'ARRIVED_AT_DESTINATION'
    | 'DELIVERED';
}

