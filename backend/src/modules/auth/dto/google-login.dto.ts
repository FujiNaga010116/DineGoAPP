import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    example: 'user@gmail.com',
    description: 'Email trả về từ Google OAuth',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên của tài khoản Google',
  })
  @IsString({ message: 'Họ tên phải là chuỗi' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName!: string;

  @ApiProperty({
    example: 'https://lh3.googleusercontent.com/a/sample-avatar',
    description: 'Ảnh đại diện từ Google',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({
    example: 'google-oauth-token-or-id',
    description: 'ID Token hoặc định danh từ Google',
    required: false,
  })
  @IsOptional()
  @IsString()
  googleId?: string;
}

