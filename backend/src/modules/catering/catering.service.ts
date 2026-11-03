// ==============================================================================
// DineGo Backend — Catering & Deposit Engine (Sprint 3 — U023 đến U033)
// Architecture: Clean Architecture / Modular Monolith
// ==============================================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { BlockDateDto } from './dto/review-feast-booking.dto.js';
import { CreateFeastBookingDto } from './dto/create-feast-booking.dto.js';
import { CreateFeastPackageDto } from './dto/create-feast-package.dto.js';
import { FeastQuoteDto } from './dto/feast-quote.dto.js';
import { PayDepositDto, PayRemainingDto, ReviewFeastBookingDto } from './dto/review-feast-booking.dto.js';
import { QueryFeastPackageDto } from './dto/query-feast-package.dto.js';
import type {
  CateringNotification,
  FeastBooking,
  FeastPackage,
  FeastQuoteBreakdown,
} from './interfaces/catering.interface.js';

@Injectable()
export class CateringService {
  private readonly logger = new Logger(CateringService.name);

  // In-memory Stores for Catering Engine
  private readonly packages = new Map<string, FeastPackage>();
  private readonly bookings = new Map<string, FeastBooking>();
  private readonly blockedDates = new Map<string, Set<string>>(); // merchantId -> Set<YYYY-MM-DD>
  private readonly notifications = new Map<string, CateringNotification[]>(); // userId -> Notification[]

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultPackages();
  }

  /**
   * Khởi tạo gói mâm cỗ mẫu ban đầu cho hệ thống
   */
  private seedDefaultPackages() {
    const pkg1: FeastPackage = {
      id: 'pkg-wedding-gold-001',
      merchantId: 'merchant-default-001',
      name: 'Mâm Cỗ Cưới Hoàng Kim (10 Món)',
      eventType: 'WEDDING',
      description: 'Mâm cỗ cưới phong vị truyền thống kết hợp hiện đại, nguyên liệu tươi sống hảo hạng.',
      servingsPerTable: 10,
      pricePerTable: 2800000,
      maxTablesPerDay: 25,
      imageUrl: 'https://cdn.dinego.vn/feasts/wedding-gold.jpg',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      dishes: [
        { id: 'd1', name: 'Súp Gà Ngô Non Hải Sâm', course: 'SOUP' },
        { id: 'd2', name: 'Gỏi Tôm Thịt Ngó Sen', course: 'APPETIZER' },
        { id: 'd3', name: 'Gà Ta Hấp Lá Chanh', course: 'MAIN' },
        { id: 'd4', name: 'Tôm Sú Hấp Nước Dừa', course: 'MAIN' },
        { id: 'd5', name: 'Bò Úc Sốt Tiêu Đen Bánh Bao', course: 'MAIN' },
        { id: 'd6', name: 'Cá Tầm Nướng Muối Ớt', course: 'MAIN' },
        { id: 'd7', name: 'Xôi Gấc Song Hỷ', course: 'MAIN' },
        { id: 'd8', name: 'Canh Măng Nấu Sườn Non', course: 'SOUP' },
        { id: 'd9', name: 'Cải Ngồng Xào Nấm Đông Cô', course: 'MAIN' },
        { id: 'd10', name: 'Chè Hạt Sen Long Nhãn', course: 'DESSERT' },
      ],
    };

    const pkg2: FeastPackage = {
      id: 'pkg-anniversary-silver-002',
      merchantId: 'merchant-default-001',
      name: 'Mâm Cỗ Giỗ Truyền Thống Ấm Cúng (8 Món)',
      eventType: 'DEATH_ANNIVERSARY',
      description: 'Mâm cỗ giỗ dâng tiên tổ đầy đặn, chuẩn vị cổ truyền Việt Nam.',
      servingsPerTable: 6,
      pricePerTable: 1800000,
      maxTablesPerDay: 30,
      imageUrl: 'https://cdn.dinego.vn/feasts/anniversary.jpg',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      dishes: [
        { id: 'd21', name: 'Nộm Gà Xé Phay', course: 'APPETIZER' },
        { id: 'd22', name: 'Nem Công Chả Phượng Rán Giòn', course: 'APPETIZER' },
        { id: 'd23', name: 'Gà Luộc Chặt Lá Chanh', course: 'MAIN' },
        { id: 'd24', name: 'Thịt Bò Xào Rau Củ Thập Cẩm', course: 'MAIN' },
        { id: 'd25', name: 'Canh Bóng Thả Cổ Truyền', course: 'SOUP' },
        { id: 'd26', name: 'Xôi Vò Hạt Sen', course: 'MAIN' },
        { id: 'd27', name: 'Mực Hấp Gừng Xả', course: 'MAIN' },
        { id: 'd28', name: 'Trái Cây Thập Cẩm Theo Mùa', course: 'DESSERT' },
      ],
    };

    this.packages.set(pkg1.id, pkg1);
    this.packages.set(pkg2.id, pkg2);
  }

  // ----------------------------------------------------------------------------
  // U023: GÓI MÂM CỖ MẪU CỦA MERCHANT (CRUD)
  // ----------------------------------------------------------------------------

  async createPackage(dto: CreateFeastPackageDto): Promise<FeastPackage> {
    const id = crypto.randomUUID();
    const pkg: FeastPackage = {
      id,
      merchantId: dto.merchantId,
      name: dto.name.trim(),
      eventType: dto.eventType,
      description: dto.description?.trim(),
      dishes: dto.dishes.map((d, index) => ({
        id: `dish-${index + 1}-${crypto.randomBytes(3).toString('hex')}`,
        name: d.name.trim(),
        course: d.course,
        description: d.description?.trim(),
        extraPrice: d.extraPrice ?? 0,
      })),
      servingsPerTable: dto.servingsPerTable,
      pricePerTable: dto.pricePerTable,
      maxTablesPerDay: dto.maxTablesPerDay,
      imageUrl: dto.imageUrl,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.packages.set(id, pkg);
    this.logger.log(`[Catering] Đã tạo gói mâm cỗ mới: "${pkg.name}" cho quán ${pkg.merchantId}`);
    return pkg;
  }

  async updatePackage(id: string, dto: Partial<CreateFeastPackageDto>): Promise<FeastPackage> {
    const pkg = await this.getPackageById(id);

    if (dto.name) pkg.name = dto.name.trim();
    if (dto.eventType) pkg.eventType = dto.eventType;
    if (dto.description !== undefined) pkg.description = dto.description?.trim();
    if (dto.pricePerTable !== undefined) pkg.pricePerTable = dto.pricePerTable;
    if (dto.servingsPerTable !== undefined) pkg.servingsPerTable = dto.servingsPerTable;
    if (dto.maxTablesPerDay !== undefined) pkg.maxTablesPerDay = dto.maxTablesPerDay;
    if (dto.imageUrl !== undefined) pkg.imageUrl = dto.imageUrl;
    if (dto.dishes) {
      pkg.dishes = dto.dishes.map((d, index) => ({
        id: `dish-${index + 1}-${crypto.randomBytes(3).toString('hex')}`,
        name: d.name.trim(),
        course: d.course,
        description: d.description?.trim(),
        extraPrice: d.extraPrice ?? 0,
      }));
    }
    pkg.updatedAt = new Date();

    return pkg;
  }

  async deletePackage(id: string): Promise<{ success: boolean; message: string }> {
    const pkg = await this.getPackageById(id);
    pkg.isActive = false;
    return { success: true, message: 'Đã ẩn gói mâm cỗ thành công' };
  }

  // ----------------------------------------------------------------------------
  // U024: XEM DANH SÁCH & CHI TIẾT MÂM CỖ
  // ----------------------------------------------------------------------------

  async getPackages(query: QueryFeastPackageDto): Promise<FeastPackage[]> {
    let result = Array.from(this.packages.values()).filter((p) => p.isActive);

    if (query.eventType) {
      result = result.filter((p) => p.eventType === query.eventType);
    }
    if (query.merchantId) {
      result = result.filter((p) => p.merchantId === query.merchantId);
    }
    if (query.minPrice !== undefined) {
      result = result.filter((p) => p.pricePerTable >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      result = result.filter((p) => p.pricePerTable <= query.maxPrice!);
    }

    return result;
  }

  async getPackageById(id: string): Promise<FeastPackage> {
    const pkg = this.packages.get(id);
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException(`Không tìm thấy gói mâm cỗ có ID ${id}`);
    }
    return pkg;
  }

  // ----------------------------------------------------------------------------
  // U025: CUSTOM MÂM CỖ & BÁO GIÁ TỰ ĐỘNG (PRICING ENGINE)
  // ----------------------------------------------------------------------------

  async calculateQuote(dto: FeastQuoteDto): Promise<FeastQuoteBreakdown> {
    const pkg = await this.getPackageById(dto.packageId);

    const tableCount = dto.tableCount;
    const basePricePerTable = pkg.pricePerTable;
    const tablesSubtotal = basePricePerTable * tableCount;

    // Phụ thu món tùy chỉnh thêm (ước tính 150.000đ/mâm cho mỗi món thêm)
    const customCount = dto.customDishes?.length || 0;
    const customDishesSurcharge = customCount * 150000 * tableCount;

    // Chính sách chiết khấu theo số lượng mâm cỗ:
    // >= 30 mâm: giảm 10%
    // >= 20 mâm: giảm 8%
    // >= 10 mâm: giảm 5%
    let discountPercentage = 0;
    if (tableCount >= 30) discountPercentage = 10;
    else if (tableCount >= 20) discountPercentage = 8;
    else if (tableCount >= 10) discountPercentage = 5;

    const discountAmount = Math.round((tablesSubtotal * discountPercentage) / 100);

    // Phí dịch vụ set bàn & phục vụ sự kiện trọn gói: 50.000đ/bàn
    const serviceFee = tableCount * 50000;

    const totalEstimatedAmount =
      tablesSubtotal + customDishesSurcharge - discountAmount + serviceFee;

    // BR-21: Mức cọc quy định từ 30% đến 50%
    const minDepositRequired = Math.round((totalEstimatedAmount * 30) / 100);
    const suggestedDeposit = Math.round((totalEstimatedAmount * 40) / 100);

    return {
      packageId: pkg.id,
      packageName: pkg.name,
      tableCount,
      basePricePerTable,
      tablesSubtotal,
      customDishesSurcharge,
      discountPercentage,
      discountAmount,
      serviceFee,
      totalEstimatedAmount,
      minDepositRequired,
      suggestedDeposit,
    };
  }

  // ----------------------------------------------------------------------------
  // U026: ĐẶT LỊCH TRƯỚC & KIỂM TRA SLOT TRỐNG
  // ----------------------------------------------------------------------------

  async createBooking(
    user: AuthenticatedUser,
    dto: CreateFeastBookingDto,
  ): Promise<FeastBooking> {
    const pkg = await this.getPackageById(dto.packageId);

    // 1. Kiểm tra quy tắc đặt trước tối thiểu 3 ngày (72 giờ) theo BR-24
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dto.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 3) {
      throw new BadRequestException(
        'Quy định BR-24: Đơn đặt mâm cỗ phải được đặt trước ngày diễn ra sự kiện ít nhất 3 ngày (72 giờ)',
      );
    }

    // 2. Kiểm tra ngày bị chặn (Blocked dates)
    const blocked = this.blockedDates.get(pkg.merchantId);
    if (blocked && blocked.has(dto.eventDate)) {
      throw new BadRequestException(
        `Nhà hàng đã chặn nhận thêm tiệc vào ngày ${dto.eventDate} do kín lịch`,
      );
    }

    // 3. Kiểm tra công suất phục vụ trong ngày (Capacity Check)
    let bookedTablesOnDate = 0;
    for (const b of this.bookings.values()) {
      if (
        b.merchantId === pkg.merchantId &&
        b.eventDate === dto.eventDate &&
        ['DEPOSIT_PAID', 'PREPARING', 'DELIVERED', 'REQUESTED'].includes(b.status)
      ) {
        bookedTablesOnDate += b.tableCount;
      }
    }

    if (bookedTablesOnDate + dto.tableCount > pkg.maxTablesPerDay) {
      throw new BadRequestException(
        `Quán đã đạt giới hạn công suất cho ngày ${dto.eventDate} (Đã nhận: ${bookedTablesOnDate}/${pkg.maxTablesPerDay} mâm)`,
      );
    }

    // 4. Tính toán báo giá chính xác
    const quote = await this.calculateQuote({
      packageId: pkg.id,
      tableCount: dto.tableCount,
      customDishes: dto.customDishes,
    });

    const depositRate = dto.depositRate;
    const depositAmount = Math.round((quote.totalEstimatedAmount * depositRate) / 100);
    const remainingAmount = quote.totalEstimatedAmount - depositAmount;

    const bookingId = crypto.randomUUID();
    const bookingCode = `DG-FEAST-${Date.now().toString().slice(-6)}`;

    const booking: FeastBooking = {
      id: bookingId,
      bookingCode,
      userId: user.id,
      customerName: user.email.split('@')[0],
      customerPhone: dto.customerPhone,
      merchantId: pkg.merchantId,
      packageId: pkg.id,
      packageName: pkg.name,
      eventType: pkg.eventType,
      eventDate: dto.eventDate,
      eventTime: dto.eventTime,
      eventLocation: dto.eventLocation.trim(),
      tableCount: dto.tableCount,
      guestCount: dto.guestCount,
      customDishes: dto.customDishes || [],
      specialNotes: dto.specialNotes?.trim(),
      totalAmount: quote.totalEstimatedAmount,
      depositRate,
      depositAmount,
      remainingAmount,
      isFullyPaid: false,
      status: 'REQUESTED',
      timeline: [
        {
          title: 'Gửi yêu cầu đặt tiệc',
          description: `Khách hàng tạo yêu cầu đặt ${dto.tableCount} mâm vào ngày ${dto.eventDate}`,
          status: 'REQUESTED',
          timestamp: new Date(),
          actor: 'CUSTOMER',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.bookings.set(bookingId, booking);
    this.logger.log(`[Catering] Tạo thành công đơn cỗ ${bookingCode} cho khách ${user.email}`);

    return booking;
  }

  // ----------------------------------------------------------------------------
  // U027: LỊCH ĐẶT CỖ & CHẶN NGÀY BẬN (CALENDAR)
  // ----------------------------------------------------------------------------

  async getMerchantCalendar(merchantId: string): Promise<{
    merchantId: string;
    blockedDates: string[];
    bookings: { eventDate: string; tableCount: number; status: string }[];
  }> {
    const blockedSet = this.blockedDates.get(merchantId) || new Set();
    const bookedList: { eventDate: string; tableCount: number; status: string }[] = [];

    for (const b of this.bookings.values()) {
      if (b.merchantId === merchantId && b.status !== 'CANCELLED' && b.status !== 'REJECTED') {
        bookedList.push({
          eventDate: b.eventDate,
          tableCount: b.tableCount,
          status: b.status,
        });
      }
    }

    return {
      merchantId,
      blockedDates: Array.from(blockedSet),
      bookings: bookedList,
    };
  }

  async blockDate(merchantId: string, dto: BlockDateDto): Promise<{ success: boolean; message: string }> {
    if (!this.blockedDates.has(merchantId)) {
      this.blockedDates.set(merchantId, new Set());
    }
    this.blockedDates.get(merchantId)!.add(dto.date);
    this.logger.log(`[Catering] Quán ${merchantId} đã chặn ngày ${dto.date}. Lý do: ${dto.reason || 'Bận'}`);
    return { success: true, message: `Đã chặn ngày ${dto.date} thành công` };
  }

  // ----------------------------------------------------------------------------
  // U028 & U029: ĐẶT CỌC 30-50% QUA MOMO & CỔNG THANH TOÁN (ĐỢT 1)
  // ----------------------------------------------------------------------------

  async initiateDepositPayment(
    bookingId: string,
    user: AuthenticatedUser,
    dto: PayDepositDto,
  ): Promise<{
    bookingId: string;
    depositAmount: number;
    paymentMethod: string;
    payUrl: string;
    qrCodeUrl: string;
    deeplink: string;
  }> {
    const booking = await this.getBookingById(bookingId);

    if (booking.userId !== user.id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cọc cho đơn tiệc này');
    }

    if (booking.status !== 'APPROVED_WAITING_DEPOSIT' && booking.status !== 'REQUESTED') {
      throw new BadRequestException(
        `Đơn tiệc hiện ở trạng thái ${booking.status}, không thể thanh toán đặt cọc`,
      );
    }

    // Tích hợp sinh URL thanh toán MoMo Sandbox
    const mockMomoPayUrl = `https://test-payment.momo.vn/v2/gateway/pay?s=DINEGO_DEPOSIT_${booking.bookingCode}`;
    const mockQrCode = `https://test-payment.momo.vn/qr/DINEGO_DEPOSIT_${booking.bookingCode}`;
    const mockDeeplink = `momo://?action=payWithApp&orderId=${booking.bookingCode}`;

    return {
      bookingId: booking.id,
      depositAmount: booking.depositAmount,
      paymentMethod: dto.paymentMethod,
      payUrl: mockMomoPayUrl,
      qrCodeUrl: mockQrCode,
      deeplink: mockDeeplink,
    };
  }

  async confirmDepositPayment(
    bookingId: string,
    transId?: string,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    booking.status = 'DEPOSIT_PAID';
    booking.depositPaidAt = new Date();
    booking.timeline.push({
      title: 'Thanh toán cọc Đợt 1 thành công',
      description: `Đã thanh toán số tiền cọc ${booking.depositAmount.toLocaleString()} VNĐ qua MoMo (Mã GD: ${transId || 'MOMO' + Date.now()})`,
      status: 'DEPOSIT_PAID',
      timestamp: new Date(),
      actor: 'SYSTEM',
    });

    this.sendNotification(
      booking.userId,
      'Đặt cọc tiệc thành công!',
      `Đơn cỗ ${booking.bookingCode} đã được xác nhận cọc đợt 1 (${booking.depositAmount.toLocaleString()}đ). Nhà hàng sẽ liên hệ chuẩn bị tiệc.`,
      'DEPOSIT_SUCCESS',
      booking.id,
    );

    this.logger.log(`[Catering] Đã xác nhận cọc thành công cho đơn cỗ ${booking.bookingCode}`);
    return booking;
  }

  // ----------------------------------------------------------------------------
  // U030: THANH TOÁN ĐỢT 2 (REMAINING BALANCE SETTLEMENT)
  // ----------------------------------------------------------------------------

  async settleRemainingBalance(
    bookingId: string,
    user: AuthenticatedUser,
    dto: PayRemainingDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    if (booking.userId !== user.id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn cỗ này');
    }

    if (booking.status !== 'DEPOSIT_PAID' && booking.status !== 'PREPARING' && booking.status !== 'DELIVERED') {
      throw new BadRequestException('Chỉ có thể thanh toán đợt 2 sau khi đã hoàn tất cọc đợt 1');
    }

    booking.remainingPaidAt = new Date();
    booking.isFullyPaid = true;
    booking.timeline.push({
      title: 'Quyết toán Đợt 2 thành công',
      description: `Đã thanh toán phần còn lại ${booking.remainingAmount.toLocaleString()} VNĐ qua ${dto.paymentMethod}`,
      status: booking.status,
      timestamp: new Date(),
      actor: 'CUSTOMER',
    });

    this.sendNotification(
      booking.userId,
      'Quyết toán hoàn tất!',
      `Đơn cỗ ${booking.bookingCode} đã thanh toán toàn bộ 100% chi phí.`,
      'STATUS_CHANGE',
      booking.id,
    );

    return booking;
  }

  // ----------------------------------------------------------------------------
  // U031: MERCHANT DUYỆT ĐƠN CỖ & HỦY HOÀN CỌC (STATE MACHINE & BR-44)
  // ----------------------------------------------------------------------------

  async reviewBooking(
    bookingId: string,
    user: AuthenticatedUser,
    dto: ReviewFeastBookingDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    if (dto.status === 'CANCELLED') {
      // Áp dụng chính sách hoàn cọc BR-44 theo mốc thời gian:
      // >= 7 ngày: hoàn 100%
      // 3 - 6 ngày: hoàn 50%
      // < 3 ngày: hoàn 0%
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(booking.eventDate);
      eventDate.setHours(0, 0, 0, 0);

      const daysRemaining = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let refundRate = 0;
      if (daysRemaining >= 7) refundRate = 100;
      else if (daysRemaining >= 3) refundRate = 50;

      const refundAmount = Math.round((booking.depositAmount * refundRate) / 100);

      booking.status = 'CANCELLED';
      booking.merchantNotes = dto.merchantNotes || `Hủy trước ${daysRemaining} ngày. Tỷ lệ hoàn cọc BR-44: ${refundRate}% (${refundAmount.toLocaleString()}đ)`;
      booking.timeline.push({
        title: 'Đơn cỗ bị hủy',
        description: `Hủy trước ngày sự kiện ${daysRemaining} ngày. Hoàn lại ${refundRate}% tiền cọc (${refundAmount.toLocaleString()} VNĐ).`,
        status: 'CANCELLED',
        timestamp: new Date(),
        actor: 'CUSTOMER',
      });

      return booking;
    }

    booking.status = dto.status;
    if (dto.merchantNotes) booking.merchantNotes = dto.merchantNotes;

    let timelineTitle = 'Cập nhật trạng thái đơn';
    if (dto.status === 'APPROVED_WAITING_DEPOSIT') timelineTitle = 'Nhà hàng đã phê duyệt yêu cầu đặt tiệc';
    else if (dto.status === 'PREPARING') timelineTitle = 'Nhà hàng đang chuẩn bị nguyên liệu phục vụ tiệc';
    else if (dto.status === 'DELIVERED') timelineTitle = 'Đang phục vụ tiệc tại địa điểm sự kiện';
    else if (dto.status === 'COMPLETED') timelineTitle = 'Hoàn tất trọn vẹn sự kiện tiệc';
    else if (dto.status === 'REJECTED') timelineTitle = 'Nhà hàng từ chối nhận tiệc';

    booking.timeline.push({
      title: timelineTitle,
      description: dto.merchantNotes || `Đơn cỗ chuyển sang trạng thái ${dto.status}`,
      status: dto.status,
      timestamp: new Date(),
      actor: 'MERCHANT',
    });

    if (dto.status === 'APPROVED_WAITING_DEPOSIT') {
      this.sendNotification(
        booking.userId,
        'Yêu cầu tiệc đã được duyệt!',
        `Nhà hàng đã đồng ý phục vụ đơn cỗ ${booking.bookingCode}. Vui lòng đặt cọc ${booking.depositRate}% để giữ lịch.`,
        'BOOKING_APPROVED',
        booking.id,
      );
    }

    return booking;
  }

  // ----------------------------------------------------------------------------
  // U032: THEO DÕI TIMELINE ĐƠN CỖ
  // ----------------------------------------------------------------------------

  async getBookingTimeline(bookingId: string) {
    const booking = await this.getBookingById(bookingId);
    return {
      bookingCode: booking.bookingCode,
      currentStatus: booking.status,
      packageName: booking.packageName,
      eventDate: booking.eventDate,
      eventLocation: booking.eventLocation,
      timeline: booking.timeline,
    };
  }

  async getBookingById(bookingId: string): Promise<FeastBooking> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn tiệc mâm cỗ có ID ${bookingId}`);
    }
    return booking;
  }

  // ----------------------------------------------------------------------------
  // U033: HỆ THỐNG THÔNG BÁO ĐƠN CỖ (IN-APP & EMAIL)
  // ----------------------------------------------------------------------------

  private sendNotification(
    userId: string,
    title: string,
    message: string,
    type: 'BOOKING_APPROVED' | 'DEPOSIT_SUCCESS' | 'PAYMENT_REMINDER' | 'STATUS_CHANGE',
    bookingId: string,
  ) {
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }

    const notif: CateringNotification = {
      id: crypto.randomUUID(),
      userId,
      title,
      message,
      type,
      bookingId,
      isRead: false,
      createdAt: new Date(),
    };

    this.notifications.get(userId)!.unshift(notif);
    this.logger.log(`[Notification Sandbox] [${type}] Gửi tới User ${userId}: ${title}`);
  }

  async getUserNotifications(userId: string): Promise<CateringNotification[]> {
    return this.notifications.get(userId) || [];
  }

  async markNotificationAsRead(id: string, userId: string): Promise<{ success: boolean }> {
    const list = this.notifications.get(userId) || [];
    const notif = list.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
    }
    return { success: true };
  }
}

