import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGroupOrderDto {
  @ApiProperty({
    example: 'merchant-uuid-123',
    description: 'ID của nhà hàng cho đơn đặt nhóm',
  })
  @IsString({ message: 'merchantId phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'merchantId không được để trống' })
  merchantId!: string;

  @ApiProperty({
    example: 'Ăn trưa văn phòng cùng team Dev',
    description: 'Tên hoặc mô tả phòng đặt nhóm',
    required: false,
  })
  @IsOptional()
  @IsString()
  roomName?: string;
}

