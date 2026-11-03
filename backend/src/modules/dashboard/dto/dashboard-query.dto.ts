import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class DateRangeQueryDto {
  @ApiProperty({
    example: 'MONTH',
    enum: ['DAY', 'WEEK', 'MONTH', 'YEAR'],
    default: 'MONTH',
    required: false,
  })
  @IsOptional()
  @IsEnum(['DAY', 'WEEK', 'MONTH', 'YEAR'])
  period?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

  @ApiProperty({ example: '2026-11', description: 'Kỳ đối soát tháng (YYYY-MM)', required: false })
  @IsOptional()
  @IsString()
  month?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'Trạng thái hoạt động của tài khoản (false: khóa)' })
  isActive!: boolean;

  @ApiProperty({ example: 'Vi phạm chính sách cộng đồng', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateMerchantApprovalDto {
  @ApiProperty({
    example: 'APPROVED',
    enum: ['APPROVED', 'REJECTED', 'SUSPENDED'],
    description: 'Trạng thái kiểm duyệt nhà hàng',
  })
  @IsEnum(['APPROVED', 'REJECTED', 'SUSPENDED'])
  status!: 'APPROVED' | 'REJECTED' | 'SUSPENDED';

  @ApiProperty({ example: 'Hồ sơ pháp lý hợp lệ', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

