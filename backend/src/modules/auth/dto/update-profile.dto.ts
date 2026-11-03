import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên người dùng',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @Length(2, 100, { message: 'Họ và tên phải có độ dài từ 2 đến 100 ký tự' })
  fullName?: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại liên hệ',
    required: false,
  })
  @IsOptional()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'Số điện thoại phải bao gồm 10-11 chữ số hợp lệ',
  })
  phoneNumber?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Đường dẫn ảnh đại diện',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

