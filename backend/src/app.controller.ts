import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { TestValidationDto } from './common/dto/test-validation.dto.js';

@ApiTags('App / Core')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Thông tin hệ thống DineGo API' })
  @ApiResponse({ status: 200, description: 'Thông tin cơ bản về ứng dụng' })
  getAppInfo() {
    return this.appService.getAppInfo();
  }

  @Post('test-validation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Endpoint thử nghiệm ValidationPipe (Phase 1)',
    description: 'Xác thực định dạng email, required fields và chống nhận field lạ (forbidNonWhitelisted)',
  })
  @ApiResponse({ status: 200, description: 'Dữ liệu hợp lệ' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ (Validation Error)' })
  testValidation(@Body() dto: TestValidationDto) {
    return {
      success: true,
      message: 'Validation passed successfully',
      data: dto,
    };
  }

  @Get('test-error')
  @ApiOperation({
    summary: 'Endpoint thử nghiệm GlobalExceptionFilter (Phase 1)',
    description: 'Chủ động ném ngoại lệ BadRequestException để kiểm tra cấu trúc JSON lỗi chuẩn hóa',
  })
  @ApiResponse({ status: 400, description: 'Cấu trúc lỗi chuẩn hóa bởi GlobalExceptionFilter' })
  testError() {
    throw new BadRequestException('Mô phỏng lỗi BadRequest được xử lý qua GlobalExceptionFilter');
  }
}
