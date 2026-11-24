import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateFeastBookingDto {
  @ApiProperty({ example: 'package-uuid-123', description: 'ID gói mâm cỗ muốn đặt' })
  @IsString()
  @IsNotEmpty()
  packageId!: string;

  @ApiProperty({
    example: '2026-11-30',
    description: 'Ngày tổ chức sự kiện (Định dạng YYYY-MM-DD, tối thiểu trước 3 ngày theo BR-24)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'eventDate phải có định dạng YYYY-MM-DD' })
  eventDate!: string;

  @ApiProperty({ example: '11:30', description: 'Giờ bắt đầu tiệc (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'eventTime phải có định dạng HH:mm' })
  eventTime!: string;

  @ApiProperty({
    example: '141 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    description: 'Địa điểm tổ chức sự kiện phục vụ tiệc',
  })
  @IsString()
  @IsNotEmpty()
  eventLocation!: string;

  @ApiProperty({ example: 10.7736, required: false, description: 'Vĩ độ địa điểm tổ chức tiệc' })
  @IsOptional()
  @IsNumber()
  eventLatitude?: number;

  @ApiProperty({ example: 106.7037, required: false, description: 'Kinh độ địa điểm tổ chức tiệc' })
  @IsOptional()
  @IsNumber()
  eventLongitude?: number;

  @ApiProperty({ example: 10, description: 'Số lượng mâm cỗ cần đặt' })
  @IsInt()
  @Min(1)
  tableCount!: number;

  @ApiProperty({ example: 100, description: 'Số lượng khách dự kiến' })
  @IsInt()
  @Min(1)
  guestCount!: number;

  @ApiProperty({
    example: 30,
    description: 'Tỷ lệ phần trăm muốn đặt cọc đợt 1 (30% đến 50% theo BR-21)',
    default: 30,
  })
  @IsNumber()
  @Min(30, { message: 'Tỷ lệ cọc tối thiểu là 30%' })
  @Max(50, { message: 'Tỷ lệ cọc tối đa đợt 1 là 50%' })
  depositRate!: number;

  @ApiProperty({
    example: ['Thêm Tôm Hùm Nướng'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  customDishes?: string[];

  @ApiProperty({
    example: 'Nguyễn Văn An',
    description: 'Họ tên người liên hệ đặt cỗ',
  })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại người liên hệ đặt cỗ',
  })
  @IsString()
  @Matches(/^[0-9]{10,11}$/, { message: 'Số điện thoại phải từ 10-11 chữ số' })
  customerPhone!: string;

  @ApiProperty({
    example: 'Có 5 khách ăn chay, 2 khách dị ứng tôm cua biển',
    required: false,
    description: 'Yêu cầu đặc biệt về món chay, dị ứng, khẩu vị',
  })
  @IsOptional()
  @IsString()
  dietaryNotes?: string;

  @ApiProperty({
    example: 'Cần thuê 10 bộ bàn ghế inox và 1 nhà rạp bạt 3 gian',
    required: false,
    description: 'Yêu cầu về bàn ghế, rạp, âm thanh, thiết bị',
  })
  @IsOptional()
  @IsString()
  equipmentNotes?: string;

  @ApiProperty({
    example: 'Cần chuẩn bị trước bàn tiệc 1 tiếng',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialNotes?: string;
}
