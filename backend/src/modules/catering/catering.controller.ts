// ==============================================================================
// DineGo Backend — Catering Controller (Sprint 3 — U023 đến U033 & Anti-Overbooking)
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import {
  BlockDateDto,
  CancelBookingAndRefundDto,
  KitchenCheckBookingDto,
  PayDepositDto,
  PayRemainingDto,
  PostDepositChangeDto,
  PreEventCheckDto,
  ProposeMenuDto,
  RespondProposalDto,
  ReviewFeastBookingDto,
  ToggleBlockSlotDto,
  ToggleSoldOutDto,
  UpdateCapacityConfigDto,
  UpdateDishSupplyDto,
  UpdateKitchenProgressDto,
  VerifyCapacityDto,
} from './dto/review-feast-booking.dto.js';
import { CreateFeastBookingDto } from './dto/create-feast-booking.dto.js';
import { CreateFeastPackageDto } from './dto/create-feast-package.dto.js';
import { FeastQuoteDto } from './dto/feast-quote.dto.js';
import { QueryFeastPackageDto } from './dto/query-feast-package.dto.js';
import { CateringService } from './catering.service.js';

@ApiTags('Catering & Event Feast Engine (Sprint 3 — U023 đến U033 & Capacity Management)')
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
  })
  createPackage(@Body() dto: CreateFeastPackageDto) {
    return this.cateringService.createPackage(dto);
  }

  @Get('packages')
  @ApiOperation({
    summary: 'U024: Xem danh sách gói mâm cỗ theo loại sự kiện',
  })
  getPackages(@Query() query: QueryFeastPackageDto) {
    return this.cateringService.getPackages(query);
  }

  @Get('packages/:id')
  @ApiOperation({
    summary: 'U024: Xem chi tiết gói mâm cỗ',
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

  @Patch('packages/:packageId/dishes/:dishId/toggle-sold-out')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Nhà hàng đánh dấu món ăn trong gói mâm tạm hết hàng (SOLD_OUT)',
  })
  toggleDishSoldOut(
    @Param('packageId') packageId: string,
    @Param('dishId') dishId: string,
    @Body() dto: ToggleSoldOutDto,
  ) {
    return this.cateringService.toggleDishSoldOut(packageId, dishId, dto);
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
  // U025: CUSTOM MÂM CỖ & BÁO GIÁ ĐA THÀNH PHẦN
  // ----------------------------------------------------------------------------

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U025: Báo giá đa thành phần: Mâm cỗ, vận chuyển, phục vụ, thiết bị, chiết khấu',
  })
  calculateQuote(@Body() dto: FeastQuoteDto) {
    return this.cateringService.calculateQuote(dto);
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: CÔNG SUẤT, LỊCH KHẢ DỤNG & CHẶN SLOT
  // ----------------------------------------------------------------------------

  @Get('merchants/:id/availability')
  @ApiOperation({
    summary: 'Tra cứu trạng thái khả dụng theo ngày và khung giờ (AVAILABLE / LIMITED / FULLY_BOOKED / BLOCKED)',
  })
  @ApiParam({ name: 'id', description: 'ID nhà hàng' })
  @ApiQuery({ name: 'date', required: true, example: '2026-12-05', description: 'Ngày muốn tổ chức (YYYY-MM-DD)' })
  @ApiQuery({ name: 'tables', required: false, example: 10, description: 'Số lượng mâm dự kiến đặt' })
  getMerchantAvailability(
    @Param('id') merchantId: string,
    @Query('date') date: string,
    @Query('tables') tables?: string,
  ) {
    const tableCount = tables ? parseInt(tables, 10) : 10;
    return this.cateringService.getMerchantAvailability(merchantId, date, tableCount);
  }

  @Get('merchants/:id/capacity-config')
  @ApiOperation({
    summary: 'Xem cấu hình công suất phục vụ tiệc của nhà hàng',
  })
  getCapacityConfig(@Param('id') merchantId: string) {
    return this.cateringService.getCapacityConfig(merchantId);
  }

  @Put('merchants/:id/capacity-config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Nhà hàng cập nhật cấu hình công suất phục vụ tiệc & buffer time',
  })
  updateCapacityConfig(
    @Param('id') merchantId: string,
    @Body() dto: UpdateCapacityConfigDto,
  ) {
    return this.cateringService.updateCapacityConfig(merchantId, dto);
  }

  @Post('merchants/:id/slots/toggle-block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhà hàng chủ động khóa hoặc mở ngày / khung giờ nhận tiệc',
  })
  toggleBlockSlot(
    @Param('id') merchantId: string,
    @Body() dto: ToggleBlockSlotDto,
  ) {
    return this.cateringService.toggleBlockSlot(merchantId, dto);
  }

  // Legacy calendar:
  @Get('merchant/:merchantId/calendar')
  @ApiOperation({
    summary: 'U027: Xem lịch đặt cỗ và các ngày bị chặn của nhà hàng (Tương thích ngược)',
  })
  getMerchantCalendar(@Param('merchantId') merchantId: string) {
    return this.cateringService.getMerchantCalendar(merchantId);
  }

  @Post('merchant/:merchantId/block-date')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U027: Nhà hàng thiết lập chặn ngày bận (Tương thích ngược)',
  })
  blockDate(
    @Param('merchantId') merchantId: string,
    @Body() dto: BlockDateDto,
  ) {
    return this.cateringService.blockDate(merchantId, dto);
  }

  // ----------------------------------------------------------------------------
  // SECTION 2 & 4: ĐẶT TIỆC, GIỮ CHỖ & XÁC MINH NĂNG LỰC
  // ----------------------------------------------------------------------------

  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Khách hàng gửi yêu cầu đặt tiệc lưu động (Tạo đơn & Giữ chỗ 24h)',
  })
  createBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeastBookingDto,
  ) {
    return this.cateringService.createBooking(user, dto);
  }

  @Post('bookings/:id/verify-capacity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhà hàng xác minh năng lực phục vụ (Chấp nhận giữ chỗ / Từ chối kèm lý do)',
  })
  verifyCapacity(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyCapacityDto,
  ) {
    return this.cateringService.verifyCapacity(bookingId, user, dto);
  }

  // ----------------------------------------------------------------------------
  // SECTION 6: ĐỀ XUẤT THAY ĐỔI THỰC ĐƠN (MENU REVISION & DIFF)
  // ----------------------------------------------------------------------------

  @Post('bookings/:id/propose-menu')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhà hàng gửi đề xuất thay đổi thực đơn (Đổi món, chênh lệch giá, hạn duyệt 12h)',
  })
  proposeMenu(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProposeMenuDto,
  ) {
    return this.cateringService.proposeMenu(bookingId, user, dto);
  }

  @Post('bookings/:id/respond-proposal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Khách hàng phản hồi đề xuất đổi món: Chấp nhận (ACCEPT), Từ chối (REJECT), hoặc Yêu cầu chỉnh lại (REVISE)',
  })
  respondProposal(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondProposalDto,
  ) {
    return this.cateringService.respondProposal(bookingId, user, dto);
  }

  // ----------------------------------------------------------------------------
  // SECTION 7: THANH TOÁN ĐẶT CỌC & QUYẾT TOÁN
  // ----------------------------------------------------------------------------

  @Post('bookings/:id/pay-deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U028: Khởi tạo thanh toán đặt cọc đợt 1 qua MoMo Gateway (Kiểm tra hạn giữ chỗ)',
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
    summary: 'Xác nhận tiền cọc thành công -> Xuất Phiếu thu cọc và chuyển CONFIRMED',
  })
  confirmDepositPayment(
    @Param('id') id: string,
    @Query('transId') transId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('dispatchToKitchen') dispatchToKitchen?: string,
  ) {
    return this.cateringService.confirmDepositPayment(
      id,
      transId,
      paymentMethod || 'MOMO',
      dispatchToKitchen === 'true',
    );
  }

  @Post('bookings/:id/dispatch-kitchen')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bộ phận Hợp đồng xác nhận bàn giao Lệnh chế biến chính thức sang Bếp',
  })
  dispatchToKitchen(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cateringService.dispatchToKitchen(id, user?.fullName || 'Hợp đồng tiệc & Lịch');
  }

  @Post('bookings/:id/pay-remaining')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U030: Quyết toán phần còn lại của đơn cỗ (Đợt 2)',
  })
  settleRemainingBalance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PayRemainingDto,
  ) {
    return this.cateringService.settleRemainingBalance(id, user, dto);
  }

  // ----------------------------------------------------------------------------
  // SECTION 8: TIẾN TRÌNH TRẠNG THÁI & HỦY/HOÀN CỌC
  // ----------------------------------------------------------------------------

  @Patch('bookings/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U031: Chuyển trạng thái đơn tiệc hoặc Hủy đơn cỗ (BR-44)',
  })
  reviewBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewFeastBookingDto,
  ) {
    return this.cateringService.reviewBooking(id, user, dto);
  }

  @Get('bookings/:id/timeline')
  @ApiOperation({
    summary: 'U032: Xem toàn bộ dòng thời gian tiến trình và đề xuất thực đơn của đơn mâm cỗ',
  })
  getBookingTimeline(@Param('id') id: string) {
    return this.cateringService.getBookingTimeline(id);
  }

  @Get('bookings/:id/audit-history')
  @ApiOperation({
    summary: 'Xem lịch sử thao tác, nội dung trước và sau khi thay đổi của đơn hàng',
  })
  getBookingAuditHistory(@Param('id') id: string) {
    return this.cateringService.getBookingAuditHistory(id);
  }

  @Get('bookings/:id')
  @ApiOperation({
    summary: 'Xem chi tiết đơn tiệc mâm cỗ theo ID',
  })
  getBookingById(@Param('id') id: string) {
    return this.cateringService.getBookingById(id);
  }

  @Get('merchant/:merchantId/bookings')
  @ApiOperation({
    summary: 'Xem danh sách toàn bộ đơn tiệc của nhà hàng',
  })
  getMerchantBookings(@Param('merchantId') merchantId: string) {
    return this.cateringService.getMerchantBookings(merchantId);
  }

  @Get('user/me/bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Khách hàng xem danh sách đơn tiệc của mình',
  })
  getUserBookings(@CurrentUser('id') userId: string) {
    return this.cateringService.getUserBookings(userId);
  }

  // ----------------------------------------------------------------------------
  // U033: THÔNG BÁO
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

  // ----------------------------------------------------------------------------
  // SECTION 4: BẢNG NGUYÊN LIỆU MÓN ĂN DÀNH CHO BẾP TRỰC TIẾP
  // ----------------------------------------------------------------------------

  @Get('merchants/:id/dish-supplies')
  @ApiOperation({
    summary: 'Lấy danh sách tình trạng nguyên liệu & khả năng cung ứng món ăn của nhà hàng',
  })
  getDishSupplies(@Param('id') merchantId: string) {
    return this.cateringService.getDishSupplies(merchantId);
  }

  @Put('merchants/:id/dish-supplies/:dishId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Bếp cập nhật tình trạng nguyên liệu món ăn (AVAILABLE, LOW_STOCK, OUT_OF_STOCK, UNAVAILABLE)',
  })
  updateDishSupply(
    @Param('id') merchantId: string,
    @Param('dishId') dishId: string,
    @Body() dto: UpdateDishSupplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cateringService.updateDishSupply(merchantId, dishId, dto, user.fullName || 'Bếp trưởng');
  }

  // ----------------------------------------------------------------------------
  // SECTION 6: CẢNH BÁO CÔNG SUẤT TRONG 3 NGÀY VÀ 7 NGÀY
  // ----------------------------------------------------------------------------

  @Get('merchants/:id/forecast-overload')
  @ApiOperation({
    summary: 'Đánh giá nguy cơ quá tải tiệc trong 3 ngày và 7 ngày tới',
  })
  getForecastOverload(@Param('id') merchantId: string) {
    return this.cateringService.getForecastOverload(merchantId);
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: QUY TRÌNH XÁC MINH NĂNG LỰC BẾP (KITCHEN VERIFICATION)
  // ----------------------------------------------------------------------------

  @Post('bookings/:id/request-kitchen-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hợp đồng tiệc & Lịch gửi yêu cầu xác minh sang Bếp trực tiếp (SLA 4h)',
  })
  requestKitchenCheck(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cateringService.requestKitchenCheck(bookingId, user);
  }

  @Post('bookings/:id/respond-kitchen-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bếp phản hồi kết quả xác minh: Đủ điều kiện / Thiếu nguyên liệu / Không thể thực hiện',
  })
  respondKitchenCheck(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: KitchenCheckBookingDto,
  ) {
    return this.cateringService.respondKitchenCheck(bookingId, user, dto);
  }

  // ----------------------------------------------------------------------------
  // SECTION 9: LỆNH CHẾ BIẾN CHÍNH THỨC & TIẾN ĐỘ BẾP
  // ----------------------------------------------------------------------------

  @Get('merchants/:id/kitchen-orders')
  @ApiOperation({
    summary: 'Lấy danh sách Lệnh chế biến chính thức và Lịch tiệc dự kiến cho Bếp',
  })
  getKitchenOrders(@Param('id') merchantId: string) {
    return this.cateringService.getKitchenOrders(merchantId);
  }

  @Patch('bookings/:id/kitchen-progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Bếp cập nhật tiến độ chế biến: Sơ chế (PREPARING) -> Nấu nướng (COOKING) -> Xong (READY_FOR_DELIVERY)',
  })
  updateKitchenProgress(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateKitchenProgressDto,
  ) {
    return this.cateringService.updateKitchenProgress(bookingId, user, dto);
  }

  // ----------------------------------------------------------------------------
  // SECTION 10 & 11: KIỂM TRA SẴN SÀNG TRƯỚC 24-48H & ĐIỀU CHỈNH SAU CỌC
  // ----------------------------------------------------------------------------

  @Post('bookings/:id/pre-event-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kiểm tra sẵn sàng trước ngày tiệc 24-48h (nguyên liệu bếp, nhân viên, bàn ghế xe tải)',
  })
  preEventCheck(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PreEventCheckDto,
  ) {
    return this.cateringService.preEventCheck(bookingId, user, dto);
  }

  @Post('bookings/:id/request-post-deposit-change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Khách hàng gửi yêu cầu điều chỉnh đơn tiệc sau khi đã đặt cọc',
  })
  requestPostDepositChange(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PostDepositChangeDto,
  ) {
    return this.cateringService.requestPostDepositChange(bookingId, user, dto);
  }

  // ----------------------------------------------------------------------------
  // SECTION 12: HỦY ĐƠN & HOÀN TIỀN CỌC
  // ----------------------------------------------------------------------------

  @Post('bookings/:id/cancel-refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhà hàng hủy đơn tiệc, bắt buộc ghi lý do & hoàn tiền cọc cho khách hàng',
  })
  cancelAndRefundBooking(
    @Param('id') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelBookingAndRefundDto,
  ) {
    return this.cateringService.cancelAndRefundBooking(bookingId, user, dto);
  }
}
