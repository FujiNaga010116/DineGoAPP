// ==============================================================================
// DineGo Backend — MoMo IPN Webhook DTO (Phase 6)
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class MomoIpnDto {
  @ApiProperty({ description: 'Mã đối tác MoMo' })
  @IsNotEmpty()
  @IsString()
  partnerCode: string;

  @ApiProperty({ description: 'ID đơn hàng trong hệ thống DineGo' })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Mã request gửi sang MoMo' })
  @IsNotEmpty()
  @IsString()
  requestId: string;

  @ApiProperty({ description: 'Số tiền thanh toán thực tế' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Thông tin mô tả đơn hàng' })
  @IsNotEmpty()
  @IsString()
  orderInfo: string;

  @ApiProperty({ description: 'Loại đơn hàng phía MoMo' })
  @IsNotEmpty()
  @IsString()
  orderType: string;

  @ApiProperty({ description: 'Mã giao dịch MoMo' })
  @IsNotEmpty()
  transId: number | string;

  @ApiProperty({ description: 'Mã kết quả giao dịch (0 = Thành công)' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  resultCode: number;

  @ApiProperty({ description: 'Thông điệp kết quả' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ description: 'Phương thức thanh toán MoMo sử dụng (qr, app, etc.)' })
  @IsNotEmpty()
  @IsString()
  payType: string;

  @ApiProperty({ description: 'Thời gian phản hồi từ MoMo (timestamp ms)' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  responseTime: number;

  @ApiProperty({ description: 'Dữ liệu kèm thêm nếu có' })
  @IsOptional()
  @IsString()
  extraData?: string;

  @ApiProperty({ description: 'Chữ ký HMAC-SHA256 từ MoMo để xác thực webhook' })
  @IsNotEmpty()
  @IsString()
  signature: string;
}
