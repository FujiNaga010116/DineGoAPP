import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

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

export class UpsertKnowledgeDto {
  @ApiProperty({ example: 'Bánh Xèo Miền Tây', description: 'Tên món đặc sản địa phương' })
  @IsString()
  @IsNotEmpty()
  dishName!: string;

  @ApiProperty({ example: 'SOUTH', enum: ['NORTH', 'CENTRAL', 'SOUTH'] })
  @IsEnum(['NORTH', 'CENTRAL', 'SOUTH'])
  region!: 'NORTH' | 'CENTRAL' | 'SOUTH';

  @ApiProperty({ example: 'Cần Thơ & Đồng bằng Sông Cửu Long' })
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @ApiProperty({
    example: 'Vỏ bánh vàng ươm từ bột gạo pha nước cốt dừa và nghệ tươi, nhân tôm thịt giá đỗ giòn rụm.',
  })
  @IsString()
  @IsNotEmpty()
  story!: string;

  @ApiProperty({ example: ['Bột gạo cốt dừa', 'Tôm đất', 'Thịt ba chỉ', 'Rau rừng miền Tây'] })
  @IsArray()
  keyIngredients!: string[];

  @ApiProperty({ example: 'Vỏ giòn rụm, béo ngậy nước cốt dừa, chấm nước mắm chua ngọt' })
  @IsString()
  @IsNotEmpty()
  flavorProfile!: string;

  @ApiProperty({ example: ['Bữa xế chiều', 'Họp mặt gia đình', 'Ngày mưa'] })
  @IsArray()
  suitableOccasions!: string[];
}


