import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class JoinGroupOrderDto {
  @ApiProperty({
    example: 'Nguyễn Văn B (Frontend)',
    description: 'Tên hiển thị của người tham gia trong nhóm',
  })
  @IsString({ message: 'Tên thành viên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên thành viên không được để trống' })
  @Length(2, 50, { message: 'Tên thành viên phải từ 2 đến 50 ký tự' })
  memberName!: string;
}

