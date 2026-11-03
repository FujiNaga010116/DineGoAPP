import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'order-uuid-123', description: 'ID đơn hàng đã hoàn tất (COMPLETED)' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ example: 5, description: 'Điểm đánh giá từ 1 đến 5 sao', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Món ăn rất ngon, nóng hổi và giao nhanh chuẩn giờ!', description: 'Bình luận nhận xét' })
  @IsString()
  @Length(5, 500, { message: 'Bình luận từ 5 đến 500 ký tự' })
  comment!: string;

  @ApiProperty({ example: ['https://cdn.dinego.vn/reviews/img1.jpg'], required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];
}

export class ReplyReviewDto {
  @ApiProperty({ example: 'Dạ quán xin cảm ơn quý khách rất nhiều! Hẹn gặp lại quý khách ạ.', description: 'Phản hồi từ phía nhà hàng' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 500)
  replyContent!: string;
}

