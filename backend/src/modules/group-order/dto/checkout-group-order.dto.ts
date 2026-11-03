import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CheckoutGroupOrderDto {
  @ApiProperty({
    example: 'Tòa nhà Bitexco, 2 Hải Triều, Q.1, TP.HCM',
    description: 'Địa chỉ nhận hàng của cả nhóm',
  })
  @IsString({ message: 'Địa chỉ giao hàng phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  deliveryAddress!: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại của Host nhận hàng',
  })
  @IsString()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Số điện thoại phải có 10-11 chữ số',
  })
  recipientPhone!: string;

  @ApiProperty({
    example: 'Giao sảnh tầng trệt Bitexco',
    description: 'Ghi chú cho tài xế giao hàng',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

