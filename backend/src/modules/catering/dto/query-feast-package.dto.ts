import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryFeastPackageDto {
  @ApiProperty({
    example: 'WEDDING',
    enum: ['WEDDING', 'DEATH_ANNIVERSARY', 'HOUSEWARMING', 'PARTY', 'OTHER'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['WEDDING', 'DEATH_ANNIVERSARY', 'HOUSEWARMING', 'PARTY', 'OTHER'])
  eventType?: 'WEDDING' | 'DEATH_ANNIVERSARY' | 'HOUSEWARMING' | 'PARTY' | 'OTHER';

  @ApiProperty({ example: 'merchant-uuid-123', required: false })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiProperty({ example: 1000000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiProperty({ example: 5000000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;
}

