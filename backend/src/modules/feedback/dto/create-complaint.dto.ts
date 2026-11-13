import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateComplaintDto {
  @ApiProperty({ example: 'order-uuid-123', description: 'ID đơn hàng cần khiếu nại' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({
    example: 'MISSING_ITEMS',
    enum: ['MISSING_ITEMS', 'LATE_DELIVERY', 'FOOD_QUALITY', 'WRONG_ITEMS', 'OTHER'],
    description: 'Phân loại vấn đề khiếu nại',
  })
  @IsEnum(['MISSING_ITEMS', 'LATE_DELIVERY', 'FOOD_QUALITY', 'WRONG_ITEMS', 'OTHER'])
  issueType!: 'MISSING_ITEMS' | 'LATE_DELIVERY' | 'FOOD_QUALITY' | 'WRONG_ITEMS' | 'OTHER';

  @ApiProperty({
    example: 'Đơn hàng bị thiếu 1 phần canh sườn và giao trễ hơn 40 phút.',
    description: 'Mô tả chi tiết sự cố gặp phải',
  })
  @IsString()
  @Length(10, 1000)
  description!: string;

  @ApiProperty({
    example: ['https://cdn.dinego.vn/evidence/bill-photo.jpg'],
    description: 'Ảnh chụp hóa đơn hoặc thực phẩm làm bằng chứng',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  evidenceImages?: string[];
}

export class ResolveComplaintDto {
  @ApiProperty({
    example: 'RESOLVED_REFUND',
    enum: ['RESOLVED_REFUND', 'RESOLVED_COMPENSATE', 'REJECTED'],
    description: 'Phán quyết xử lý của Admin',
  })
  @IsEnum(['RESOLVED_REFUND', 'RESOLVED_COMPENSATE', 'REJECTED'])
  decision!: 'RESOLVED_REFUND' | 'RESOLVED_COMPENSATE' | 'REJECTED';

  @ApiProperty({ example: 'Xác nhận quán giao thiếu món, hoàn trả 45.000đ cho khách qua ví.', description: 'Ghi chú giải quyết của Admin' })
  @IsString()
  @IsNotEmpty()
  resolutionNotes!: string;

  @ApiProperty({ example: 45000, description: 'Số tiền hoàn lại hoặc bồi thường (nếu có)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compensationAmount?: number;

  @ApiProperty({
    example: 'MERCHANT',
    enum: ['MERCHANT', 'DRIVER', 'PLATFORM'],
    description: 'Bên chịu trách nhiệm bồi thường',
    required: false,
  })
  @IsOptional()
  @IsEnum(['MERCHANT', 'DRIVER', 'PLATFORM'])
  faultParty?: 'MERCHANT' | 'DRIVER' | 'PLATFORM';
}

