import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-sample-uuid-or-code',
    description: 'Mã xác nhận hoặc token đặt lại mật khẩu',
  })
  @IsString({ message: 'Token phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Token không được để trống' })
  token!: string;

  @ApiProperty({
    example: 'NewSecurePass@2026',
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
  newPassword!: string;
}

