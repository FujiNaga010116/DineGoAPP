// ==============================================================================
// DineGo Backend — Catering Controller (Sprint 3 — U023 đến U033)
// ==============================================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { BlockDateDto } from './dto/review-feast-booking.dto.js';
import { CreateFeastBookingDto } from './dto/create-feast-booking.dto.js';
import { CreateFeastPackageDto } from './dto/create-feast-package.dto.js';
import { FeastQuoteDto } from './dto/feast-quote.dto.js';
import { PayDepositDto, PayRemainingDto, ReviewFeastBookingDto } from './dto/review-feast-booking.dto.js';
import { QueryFeastPackageDto } from './dto/query-feast-package.dto.js';
import { CateringService } from './catering.service.js';

@ApiTags('Catering & Event Feast Engine (Sprint 3 — U023 đến U033)')
@Controller('catering')
export class CateringController {
  constructor(private readonly cateringService: CateringService) {}

  // ----------------------------------------------------------------------------
  // U023 & U024: PACKAGES CATALOG
  // ----------------------------------------------------------------------------

  @Post('packages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'U023: Nhà hàng tạo gói mâm cỗ mẫu mới',
    description: 'Thiết lập danh sách món, số người/mâm, đơn giá mâm và công suất tối đa/ngày.',
  })
  createPackage(@Body() dto: CreateFeastPackageDto) {
    return this.cateringService.createPackage(dto);
  }

  @Get('packages')
  @ApiOperation({
    summary: 'U024: Xem danh sách gói mâm cỗ theo loại sự kiện',
    description: 'Khách lọc mâm cỗ theo loại tiệc (Cưới, Giỗ, Tân gia, Liên hoan), nhà hàng và mức giá.',
  })
  getPackages(@Query() query: QueryFeastPackageDto) {
    return this.cateringService.getPackages(query);
  }

  @Get('packages/:id')
  @ApiOperation({
    summary: 'U024: Xem chi tiết gói mâm cỗ',
    description: 'Hiển thị đầy đủ danh sách món ăn, món khai vị, món chính, món tráng miệng và đơn giá.',
  })
  @ApiParam({ name: 'id', description: 'ID gói mâm cỗ' })
  getPackageById(@Param('id') id: string) {
    return this.cateringService.getPackageById(id);
  }

  @Put('packages/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U023: Cập nhật thông tin gói mâm cỗ',
  })
  updatePackage(
    @Param('id') id: string,
    @Body() dto: Partial<CreateFeastPackageDto>,
  ) {
    return this.cateringService.updatePackage(id, dto);
  }

  @Delete('packages/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U023: Ẩn hoặc xóa gói mâm cỗ',
  })
  deletePackage(@Param('id') id: string) {
    return this.cateringService.deletePackage(id);
  }

  // ----------------------------------------------------------------------------
  // U025: CUSTOM MÂM CỖ & BÁO GIÁ TỰ ĐỘNG
  // ----------------------------------------------------------------------------

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U025: Tính toán báo giá tự động cho mâm cỗ tùy biến (Pricing Engine)',
    description: 'Tự động tính chiết khấu theo số lượng mâm (5-10%), phụ thu thêm món và mức cọc 30-50% BR-21.',
  })
  calculateQuote(@Body() dto: FeastQuoteDto) {
    return this.cateringService.calculateQuote(dto);
  }

  // ----------------------------------------------------------------------------
  // U026: ĐẶT LỊCH TRƯỚC (BOOKING)
  // ----------------------------------------------------------------------------

  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'U026: Khách hàng gửi yêu cầu đặt lịch mâm cỗ',
    description: 'Kiểm tra quy tắc đặt trước tối thiểu 3 ngày (BR-24) và kiểm tra công suất slot trống của quán.',
  })
  createBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeastBookingDto,
  ) {
    return this.cateringService.createBooking(user, dto);
  }

  // ----------------------------------------------------------------------------
  // U027: LỊCH ĐẶT CỖ & CHẶN NGÀY
  // ----------------------------------------------------------------------------

  @Get('merchant/:merchantId/calendar')
  @ApiOperation({
    summary: 'U027: Xem lịch đặt cỗ và các ngày bị chặn của nhà hàng',
  })
  getMerchantCalendar(@Param('merchantId') merchantId: string) {
    return this.cateringService.getMerchantCalendar(merchantId);
  }

  @Post('merchant/:merchantId/block-date')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U027: Nhà hàng thiết lập chặn ngày bận',
  })
  blockDate(
    @Param('merchantId') merchantId: string,
    @Body() dto: BlockDateDto,
  ) {
    return this.cateringService.blockDate(merchantId, dto);
  }

  // ----------------------------------------------------------------------------
  // U028 & U029: THANH TOÁN ĐẶT CỌC (ĐỢT 1)
  // ----------------------------------------------------------------------------

  @Post('bookings/:id/pay-deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U028 & U029: Khởi tạo thanh toán đặt cọc đợt 1 qua MoMo Gateway',
    description: 'Sinh link thanh toán QR Code / MoMo Deeplink cho số tiền cọc (30% - 50%).',
  })
  initiateDepositPayment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PayDepositDto,
  ) {
    return this.cateringService.initiateDepositPayment(id, user, dto);
  }

  @Post('bookings/:id/confirm-deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U029: Xác nhận giao dịch cọc thành công (Webhook / IPN simulation)',
  })
  confirmDepositPayment(
    @Param('id') id: string,
    @Query('transId') transId?: string,
  ) {
    return this.cateringService.confirmDepositPayment(id, transId);
  }

  // ----------------------------------------------------------------------------
  // U030: THANH TOÁN ĐỢT 2 (SETTLEMENT)
  // ----------------------------------------------------------------------------

  @Post('bookings/:id/pay-remaining')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U030: Thanh toán phần còn lại của đơn cỗ (Đợt 2)',
  })
  settleRemainingBalance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PayRemainingDto,
  ) {
    return this.cateringService.settleRemainingBalance(id, user, dto);
  }

  // ----------------------------------------------------------------------------
  // U031: NHÀ HÀNG DUYỆT ĐƠN CỖ & HỦY/HOÀN CỌC
  // ----------------------------------------------------------------------------

  @Patch('bookings/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U031: Nhà hàng duyệt, từ chối, chuyển trạng thái hoặc Hủy đơn cỗ (BR-44)',
  })
  reviewBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewFeastBookingDto,
  ) {
    return this.cateringService.reviewBooking(id, user, dto);
  }

  // ----------------------------------------------------------------------------
  // U032: TIMELINE ĐƠN CỖ
  // ----------------------------------------------------------------------------

  @Get('bookings/:id/timeline')
  @ApiOperation({
    summary: 'U032: Xem toàn bộ dòng thời gian tiến trình của đơn mâm cỗ',
  })
  getBookingTimeline(@Param('id') id: string) {
    return this.cateringService.getBookingTimeline(id);
  }

  // ----------------------------------------------------------------------------
  // U033: THÔNG BÁO IN-APP & EMAIL
  // ----------------------------------------------------------------------------

  @Get('notifications/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U033: Xem danh sách thông báo đơn cỗ của người dùng',
  })
  getMyNotifications(@CurrentUser('id') userId: string) {
    return this.cateringService.getUserNotifications(userId);
  }

  @Patch('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U033: Đánh dấu đã đọc thông báo',
  })
  markNotificationAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cateringService.markNotificationAsRead(id, userId);
  }
}

