import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

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
  @IsBoolean()
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

export class UpdateDriverStatusDto {
  @ApiProperty({
    example: 'SUSPENDED',
    enum: ['ACTIVE', 'SUSPENDED'],
    description: 'Trạng thái nhận chuyến của tài xế',
  })
  @IsEnum(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';

  @ApiProperty({ example: 'Tạm khóa nhận chuyến để rà soát vận hành', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateSystemSettingsDto {
  @ApiProperty({ example: 15, description: 'Tỷ lệ hoa hồng nền tảng (%)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  platformCommissionRate?: number;

  @ApiProperty({ example: 5000, description: 'Phụ phí giờ cao điểm / thời tiết xấu (VNĐ)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peakHourSurgeFee?: number;

  @ApiProperty({ example: 100000, description: 'Đơn tối thiểu miễn phí vận chuyển (VNĐ)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderForFreeShipping?: number;

  @ApiProperty({ example: 3.5, description: 'Bán kính tự động ghép cuốc tài xế (km)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  autoDispatchRangeKm?: number;

  @ApiProperty({ example: false, description: 'Chế độ bảo trì khẩn cấp toàn sàn', required: false })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiProperty({ example: 'Điều chỉnh cấu hình vận hành giờ cao điểm', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

