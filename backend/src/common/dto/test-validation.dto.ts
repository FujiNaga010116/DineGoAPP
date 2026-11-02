import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class TestValidationDto {
  @ApiProperty({ example: 'test@dinego.vn', description: 'Email của người dùng' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Tên người dùng' })
  @IsString({ message: 'fullName must be a string' })
  @MinLength(2, { message: 'fullName must be at least 2 characters long' })
  @IsNotEmpty({ message: 'fullName is required' })
  fullName: string;
}
