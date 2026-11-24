import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class ReviewFeastBookingDto {
  @ApiProperty({
    example: 'CONFIRMED',
    description: 'Trạng thái chuyển tiếp của đơn cỗ',
  })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiProperty({
    example: 'Quán đã kiểm tra slot và đồng ý tiếp nhận phục vụ tiệc cưới',
    required: false,
  })
  @IsOptional()
  @IsString()
  merchantNotes?: string;
}

export class VerifyCapacityDto {
  @ApiProperty({
    example: 'ACCEPT',
    enum: ['ACCEPT', 'REJECT'],
    description: 'Quyết định sau khi thẩm định khả năng phục vụ của nhà hàng',
  })
  @IsEnum(['ACCEPT', 'REJECT'])
  @IsNotEmpty()
  action!: 'ACCEPT' | 'REJECT';

  @ApiProperty({
    example: 'Bếp đã đủ nhân sự và sẵn sàng nguyên liệu cao cấp',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ProposeMenuDto {
  @ApiProperty({
    example: 'Hết Tôm càng xanh tự nhiên, đề xuất đổi sang Tôm sú loại 1 (giảm 50.000đ/mâm)',
    description: 'Lý do nhà hàng đề xuất thay đổi thực đơn',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({
    description: 'Danh sách các món trong thực đơn đề xuất mới',
    type: [Object],
  })
  @IsArray()
  @IsNotEmpty()
  dishes!: Array<{
    dishId: string;
    dishName: string;
    course: 'APPETIZER' | 'MAIN' | 'SOUP' | 'DESSERT';
    action: 'KEEP' | 'REPLACE' | 'ADD' | 'REMOVE';
    originalDishName?: string;
    extraPrice: number;
    allergens?: string;
  }>;

  @ApiProperty({
    example: -50000,
    required: false,
    description: 'Chênh lệch đơn giá mỗi mâm (VND), âm là giảm, dương là phụ thu thêm',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  priceDeltaPerTable?: number;
}

export class RespondProposalDto {
  @ApiProperty({
    example: 'ACCEPT',
    enum: ['ACCEPT', 'REJECT', 'REVISE'],
    description: 'Khách hàng phản hồi đề xuất thực đơn của nhà hàng',
  })
  @IsEnum(['ACCEPT', 'REJECT', 'REVISE'])
  @IsNotEmpty()
  action!: 'ACCEPT' | 'REJECT' | 'REVISE';

  @ApiProperty({
    example: 'Đồng ý phương án thay thế, nhờ quán chuẩn bị đúng giờ',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCapacityConfigDto {
  @ApiProperty({ example: 5, description: 'Số đơn tối đa nhận mỗi ngày' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxOrdersPerDay?: number;

  @ApiProperty({ example: 50, description: 'Tổng số mâm tối đa nhận mỗi ngày' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTablesPerDay?: number;

  @ApiProperty({ example: 25, description: 'Số mâm tối đa nhận trong 1 khung giờ' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTablesPerSlot?: number;

  @ApiProperty({ example: 72, description: 'Thời gian đặt trước tối thiểu (giờ)' })
  @IsOptional()
  @IsInt()
  @Min(12)
  minNoticeHours?: number;

  @ApiProperty({ example: 3.0, description: 'Thời gian chuẩn bị sơ chế tại bếp (giờ)' })
  @IsOptional()
  @IsNumber()
  prepBufferHours?: number;

  @ApiProperty({ example: 1.0, description: 'Thời gian vận chuyển tới điểm tiệc (giờ)' })
  @IsOptional()
  @IsNumber()
  transitBufferHours?: number;

  @ApiProperty({ example: 3.0, description: 'Thời gian phục vụ tiệc (giờ)' })
  @IsOptional()
  @IsNumber()
  serviceBufferHours?: number;

  @ApiProperty({ example: 1.5, description: 'Thời gian thu dọn bát đĩa thiết bị (giờ)' })
  @IsOptional()
  @IsNumber()
  cleanupBufferHours?: number;
}

export class ToggleBlockSlotDto {
  @ApiProperty({ example: '2026-12-05', description: 'Ngày muốn khóa/mở (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date phải có định dạng YYYY-MM-DD' })
  date!: string;

  @ApiProperty({
    example: '10:00-14:00',
    required: false,
    description: 'Khung giờ cần khóa (nếu bỏ trống là khóa cả ngày)',
  })
  @IsOptional()
  @IsString()
  timeSlot?: string;

  @ApiProperty({ example: true, description: 'true: khóa slot, false: mở khóa' })
  @IsBoolean()
  isBlocked!: boolean;

  @ApiProperty({ example: 'Bảo trì bếp hoặc kín lịch tiệc nội bộ', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ToggleSoldOutDto {
  @ApiProperty({ example: true, description: 'true: tạm hết hàng, false: còn hàng' })
  @IsBoolean()
  isSoldOut!: boolean;
}

export class PayDepositDto {
  @ApiProperty({
    example: 'MOMO',
    enum: ['MOMO', 'VNPAY', 'BANK_TRANSFER'],
    description: 'Phương thức thanh toán cọc đợt 1',
    default: 'MOMO',
  })
  @IsEnum(['MOMO', 'VNPAY', 'BANK_TRANSFER'])
  paymentMethod!: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER';
}

export class PayRemainingDto {
  @ApiProperty({
    example: 'MOMO',
    enum: ['MOMO', 'VNPAY', 'BANK_TRANSFER', 'CASH_AT_EVENT'],
    description: 'Phương thức thanh toán đợt 2',
    default: 'MOMO',
  })
  @IsEnum(['MOMO', 'VNPAY', 'BANK_TRANSFER', 'CASH_AT_EVENT'])
  paymentMethod!: 'MOMO' | 'VNPAY' | 'BANK_TRANSFER' | 'CASH_AT_EVENT';
}

export class BlockDateDto {
  @ApiProperty({
    example: '2026-11-25',
    description: 'Ngày nhà hàng cần chặn không nhận thêm tiệc (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({
    example: 'Đã nhận đủ công suất tiệc cưới lớn của công ty ABC',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateDishSupplyDto {
  @ApiProperty({
    example: 'AVAILABLE',
    enum: ['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNAVAILABLE'],
    description: 'Tình trạng nguyên liệu món ăn',
  })
  @IsEnum(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNAVAILABLE'])
  @IsNotEmpty()
  supplyStatus!: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNAVAILABLE';

  @ApiProperty({ example: 100, required: false, description: 'Số suất tối đa có thể chế biến' })
  @IsOptional()
  @IsInt()
  maxDailyPortions?: number;

  @ApiProperty({ example: 30, required: false, description: 'Số suất đã cam kết cho các đơn khác' })
  @IsOptional()
  @IsInt()
  committedPortions?: number;

  @ApiProperty({ example: '2026-12-01 đến 2026-12-31', required: false })
  @IsOptional()
  @IsString()
  availableDateRange?: string;

  @ApiProperty({ example: 'Hết hàng hải sản tươi trong ngày do thời tiết biển', required: false })
  @IsOptional()
  @IsString()
  outOfStockReason?: string;

  @ApiProperty({ example: '2026-12-05', required: false, description: 'Thời gian dự kiến bổ sung' })
  @IsOptional()
  @IsString()
  restockExpectedAt?: string;

  @ApiProperty({ example: 'Tôm Sú Hấp Nước Dừa', required: false, description: 'Món thay thế gợi ý' })
  @IsOptional()
  @IsString()
  suggestedReplacementDish?: string;
}

export class KitchenCheckBookingDto {
  @ApiProperty({
    example: 'APPROVED',
    enum: ['APPROVED', 'PARTIAL_SHORTAGE', 'UNABLE_TO_SERVE'],
    description: 'Kết quả thẩm định từ Bếp trực tiếp',
  })
  @IsEnum(['APPROVED', 'PARTIAL_SHORTAGE', 'UNABLE_TO_SERVE'])
  @IsNotEmpty()
  status!: 'APPROVED' | 'PARTIAL_SHORTAGE' | 'UNABLE_TO_SERVE';

  @ApiProperty({ example: 'Đầy đủ nguyên liệu tươi, nhân sự bếp sẵn sàng', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  kitchenStaffCount?: number;

  @IsOptional()
  @IsBoolean()
  equipmentReady?: boolean;

  @ApiProperty({
    required: false,
    description: 'Danh sách đề xuất món thay thế nếu thiếu một phần nguyên liệu',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  proposedReplacements?: Array<{
    originalDishName: string;
    replacementDishName: string;
    reason: string;
  }>;
}

export class PreEventCheckDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ example: true, description: 'Bếp đã sẵn sàng đủ nguyên liệu thực tế' })
  @IsBoolean()
  kitchenIngredientsReady!: boolean;

  @ApiProperty({ example: 85, description: 'Tiến độ sơ chế tại bếp (%)' })
  @IsNumber()
  kitchenPrepProgressPercent!: number;

  @ApiProperty({ example: 'Đã hoàn thành sơ chế 80% thực đơn', required: false })
  @IsOptional()
  @IsString()
  kitchenNotes?: string;

  @ApiProperty({ example: true, description: 'Đã phân bổ đủ nhân viên phục vụ tiệc' })
  @IsBoolean()
  staffAssigned!: boolean;

  @ApiProperty({ example: true, description: 'Bàn ghế, bát đĩa, thiết bị lưu động đã sẵn sàng' })
  @IsBoolean()
  equipmentReady!: boolean;

  @ApiProperty({ example: true, description: 'Xe tải vận chuyển chuyên dụng đã sẵn sàng' })
  @IsBoolean()
  transportVehicleReady!: boolean;

  @ApiProperty({ example: 'Đã kiểm tra hợp đồng, khách xác nhận địa điểm đúng hẹn', required: false })
  @IsOptional()
  @IsString()
  contractNotes?: string;
}

export class UpdateKitchenProgressDto {
  @ApiProperty({
    example: 'COOKING',
    enum: ['PREPARING', 'COOKING', 'READY_FOR_DELIVERY'],
    description: 'Tiến độ chế biến tại Bếp trực tiếp',
  })
  @IsEnum(['PREPARING', 'COOKING', 'READY_FOR_DELIVERY'])
  @IsNotEmpty()
  progressStatus!: 'PREPARING' | 'COOKING' | 'READY_FOR_DELIVERY';

  @ApiProperty({ example: 'Bếp bắt đầu nổi lửa chế biến các món chính', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelBookingAndRefundDto {
  @ApiProperty({ example: 'Nhà hàng gặp sự cố hỏa hoạn bất khả kháng tại cơ sở', description: 'Lý do bắt buộc khi hủy đơn' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({ example: true, description: 'Có thực hiện hoàn trả tiền cọc cho khách không' })
  @IsBoolean()
  processRefund!: boolean;

  @ApiProperty({ example: 100, required: false, description: 'Tỷ lệ hoàn cọc (100% nếu do nhà hàng)' })
  @IsOptional()
  @IsNumber()
  refundPercentage?: number;
}

export class PostDepositChangeDto {
  @ApiProperty({ example: 12, required: false, description: 'Số mâm mới muốn điều chỉnh' })
  @IsOptional()
  @IsInt()
  newTableCount?: number;

  @ApiProperty({ example: '2026-12-10', required: false, description: 'Ngày mới' })
  @IsOptional()
  @IsString()
  newEventDate?: string;

  @ApiProperty({ example: '11:30', required: false, description: 'Giờ mới' })
  @IsOptional()
  @IsString()
  newEventTime?: string;

  @ApiProperty({ example: 'Thêm 2 mâm do lượng khách họ hàng xa tới đông hơn dự kiến', required: false, description: 'Lý do xin điều chỉnh' })
  @IsOptional()
  @IsString()
  customerReason?: string;

  @ApiProperty({ example: 'Thêm 2 mâm do lượng khách họ hàng xa tới đông hơn dự kiến', required: false, description: 'Lý do xin điều chỉnh' })
  @IsOptional()
  @IsString()
  reason?: string;
}
