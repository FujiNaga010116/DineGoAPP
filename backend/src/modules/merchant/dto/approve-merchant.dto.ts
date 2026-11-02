import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MerchantStatus } from '../../../common/enums/index.js';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveMerchantDto {
  @ApiProperty({
    enum: [MerchantStatus.APPROVED, MerchantStatus.REJECTED],
    example: MerchantStatus.APPROVED,
    description: 'Quyết định duyệt nhà hàng: APPROVED hoặc REJECTED',
  })
  @IsEnum(
    [MerchantStatus.APPROVED, MerchantStatus.REJECTED],
    { message: 'status must be either APPROVED or REJECTED' },
  )
  @IsNotEmpty({ message: 'status is required' })
  status: MerchantStatus;

  @ApiPropertyOptional({
    example: 'Hồ sơ đầy đủ, giấy phép kinh doanh hợp lệ.',
    description: 'Ghi chú duyệt hoặc lý do từ chối',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
