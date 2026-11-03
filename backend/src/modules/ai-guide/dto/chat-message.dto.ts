import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({
    example: 'Gợi ý cho mình món ngon đặc sản miền Trung cho 2 người, ngân sách 150k với',
    description: 'Nội dung câu hỏi của khách hàng',
  })
  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @Length(2, 500, { message: 'Tin nhắn từ 2 đến 500 ký tự' })
  message!: string;

  @ApiProperty({
    example: 'session-uuid-123',
    description: 'ID phiên chat hiện tại nếu tiếp tục cuộc trò chuyện',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class NaturalLanguageSearchDto {
  @ApiProperty({
    example: 'Tìm quán bún chả Hà Nội nóng hổi giá dưới 60k gần đây',
    description: 'Câu tìm kiếm bằng ngôn ngữ tự nhiên của người dùng',
  })
  @IsString()
  @IsNotEmpty()
  query!: string;
}

