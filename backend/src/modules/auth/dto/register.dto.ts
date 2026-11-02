import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@dinego.vn',
    description: 'Địa chỉ email duy nhất của người dùng',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123@',
    description: 'Mật khẩu bảo mật, tối thiểu 6 ký tự',
  })
  @IsString({ message: 'password must be a string' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  @IsNotEmpty({ message: 'password is required' })
  password: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên đầy đủ của người dùng',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'fullName must be a string' })
  @MinLength(2, { message: 'fullName must be at least 2 characters long' })
  @IsNotEmpty({ message: 'fullName is required' })
  fullName: string;

  @ApiPropertyOptional({
    example: '0901234567',
    description: 'Số điện thoại liên hệ (10 chữ số)',
  })
  @IsOptional()
  @IsString({ message: 'phoneNumber must be a string' })
  @Matches(/^[0-9]{10}$/, {
    message: 'phoneNumber must be a valid 10-digit phone number',
  })
  phoneNumber?: string;
}
