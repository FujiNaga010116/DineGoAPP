import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export enum SplitType {
  BY_ITEM = 'BY_ITEM',
  EQUAL = 'EQUAL',
}

export class BillSplitDto {
  @ApiProperty({
    enum: SplitType,
    default: SplitType.BY_ITEM,
    description: 'Hình thức chia tiền: BY_ITEM (theo món ai ăn người nấy trả) hoặc EQUAL (chia đều cả nhóm)',
    required: false,
  })
  @IsOptional()
  @IsEnum(SplitType, { message: 'Kiểu chia tiền phải là BY_ITEM hoặc EQUAL' })
  splitType?: SplitType;

  @ApiProperty({
    example: 20000,
    description: 'Phí giao hàng được áp dụng để phân bổ',
    default: 15000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Phí ship không thể âm' })
  shippingFee?: number;
}

