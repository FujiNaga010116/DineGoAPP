// ==============================================================================
// DineGo Backend — Catering & Event Feast Engine (Sprint 3 — U023 đến U033)
// Architecture: Clean Architecture / Modular Monolith + Resilient Hybrid Storage
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
import type {
  AvailabilityStatus,
  CateringBlockedSlot,
  CateringCapacityConfig,
  CateringDishSupply,
  CateringForecastOverload,
  CateringMenuProposalDto,
  CateringNotification,
  DayAvailability,
  FeastBooking,
  FeastBookingStatus,
  FeastPackage,
  FeastQuoteBreakdown,
  KitchenCheckStatus,
  PreEventReadinessCheckDto,
  SlotAvailability,
  SupplyStatus,
} from './interfaces/catering.interface.js';

@Injectable()
export class CateringService {
  private readonly logger = new Logger(CateringService.name);

  // Hybrid in-memory store for high-performance indexing & decoupled fallback
  private readonly packages = new Map<string, FeastPackage>();
  private readonly bookings = new Map<string, FeastBooking>();
  private readonly capacityConfigs = new Map<string, CateringCapacityConfig>();
  private readonly blockedSlots = new Map<string, CateringBlockedSlot[]>(); // merchantId -> CateringBlockedSlot[]
  private readonly blockedDates = new Map<string, Set<string>>(); // merchantId -> Set<YYYY-MM-DD> (Backward compat)
  private readonly dishSupplies = new Map<string, CateringDishSupply[]>(); // merchantId -> CateringDishSupply[]
  private readonly notifications = new Map<string, CateringNotification[]>(); // userId -> Notification[]
  private readonly auditLogs = new Map<string, Array<{
    id: string;
    bookingId: string;
    actorId: string;
    actorRole: string;
    action: string;
    previousState?: string;
    newState?: string;
    note?: string;
    timestamp: Date;
  }>>();

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultPackagesAndConfigs();
  }

  /**
   * Khởi tạo gói mâm cỗ mẫu và cấu hình công suất ban đầu cho 6 nhà hàng chuyên tiệc
   */
  private seedDefaultPackagesAndConfigs() {
    const defaultMerchants = [
      'merchant-default-001',
      'merchant-catering-hoang-gia',
      'merchant-catering-phuong-nam',
      'merchant-catering-ha-thanh',
      'merchant-catering-bistro',
      'merchant-catering-saigon-pro',
      'merchant-catering-an-vien',
    ];

    // Cấu hình công suất chuẩn cho từng quán
    for (const mId of defaultMerchants) {
      this.capacityConfigs.set(mId, {
        merchantId: mId,
        maxOrdersPerDay: 4,
        maxTablesPerDay: 50,
        maxTablesPerSlot: 25,
        minNoticeHours: 72,
        prepBufferHours: 3.0,
        transitBufferHours: 1.0,
        serviceBufferHours: 3.0,
        cleanupBufferHours: 1.5,
        isActive: true,
      });
      this.blockedSlots.set(mId, []);
      this.blockedDates.set(mId, new Set());
    }

    const pkg1: FeastPackage = {
      id: 'pkg-wedding-gold-001',
      merchantId: 'merchant-catering-hoang-gia',
      name: 'Mâm Cỗ Cưới Hoàng Kim (10 Món)',
      eventType: 'WEDDING',
      description: 'Mâm cỗ cưới phong vị truyền thống kết hợp hiện đại, nguyên liệu tươi sống hảo hạng.',
      servingsPerTable: 10,
      pricePerTable: 2800000,
      minTables: 5,
      maxTables: 40,
      maxTablesPerDay: 40,
      imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
      isAvailable: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      dishes: [
        { id: 'd1', name: 'Súp Gà Ngô Non Hải Sâm', course: 'SOUP', isSoldOut: false },
        { id: 'd2', name: 'Gỏi Tôm Thịt Ngó Sen', course: 'APPETIZER', isSoldOut: false, allergens: 'Tôm' },
        { id: 'd3', name: 'Gà Ta Hấp Lá Chanh', course: 'MAIN', isSoldOut: false },
        { id: 'd4', name: 'Tôm Sú Hấp Nước Dừa', course: 'MAIN', isSoldOut: false, allergens: 'Tôm' },
        { id: 'd5', name: 'Bò Úc Sốt Tiêu Đen Bánh Bao', course: 'MAIN', isSoldOut: false },
        { id: 'd6', name: 'Cá Tầm Nướng Muối Ớt', course: 'MAIN', isSoldOut: false, allergens: 'Hải sản' },
        { id: 'd7', name: 'Xôi Gấc Song Hỷ', course: 'MAIN', isSoldOut: false },
        { id: 'd8', name: 'Canh Măng Nấu Sườn Non', course: 'SOUP', isSoldOut: false },
        { id: 'd9', name: 'Cải Ngồng Xào Nấm Đông Cô', course: 'MAIN', isSoldOut: false },
        { id: 'd10', name: 'Chè Hạt Sen Long Nhãn', course: 'DESSERT', isSoldOut: false },
      ],
    };

    const pkg2: FeastPackage = {
      id: 'pkg-anniversary-silver-002',
      merchantId: 'merchant-catering-ha-thanh',
      name: 'Mâm Cỗ Giỗ Truyền Thống Ấm Cúng (8 Món)',
      eventType: 'DEATH_ANNIVERSARY',
      description: 'Mâm cỗ giỗ dâng tiên tổ đầy đặn, chuẩn vị cổ truyền Việt Nam.',
      servingsPerTable: 6,
      pricePerTable: 1800000,
      minTables: 3,
      maxTables: 30,
      maxTablesPerDay: 30,
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      isAvailable: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      dishes: [
        { id: 'd21', name: 'Nộm Gà Xé Phay', course: 'APPETIZER', isSoldOut: false },
        { id: 'd22', name: 'Nem Công Chả Phượng Rán Giòn', course: 'APPETIZER', isSoldOut: false },
        { id: 'd23', name: 'Gà Luộc Chặt Lá Chanh', course: 'MAIN', isSoldOut: false },
        { id: 'd24', name: 'Thịt Bò Xào Rau Củ Thập Cẩm', course: 'MAIN', isSoldOut: false },
        { id: 'd25', name: 'Canh Bóng Thả Cổ Truyền', course: 'SOUP', isSoldOut: false },
        { id: 'd26', name: 'Xôi Vò Hạt Sen', course: 'MAIN', isSoldOut: false },
        { id: 'd27', name: 'Mực Hấp Gừng Xả', course: 'MAIN', isSoldOut: false, allergens: 'Mực' },
        { id: 'd28', name: 'Trái Cây Thập Cẩm Theo Mùa', course: 'DESSERT', isSoldOut: false },
      ],
    };

    const pkg3: FeastPackage = {
      id: 'pkg-birthday-party-003',
      merchantId: 'merchant-catering-phuong-nam',
      name: 'Mâm Tiệc Phương Nam Thịnh Soạn (9 Món)',
      eventType: 'BIRTHDAY',
      description: 'Đặc sản miền Tây sông nước, lẩu cá thác lác, gà quay chao đậm đà.',
      servingsPerTable: 10,
      pricePerTable: 2400000,
      minTables: 4,
      maxTables: 35,
      maxTablesPerDay: 35,
      imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=80',
      isAvailable: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      dishes: [
        { id: 'd31', name: 'Gỏi Ngó Sen Tai Heo', course: 'APPETIZER', isSoldOut: false },
        { id: 'd32', name: 'Chả Giò Phù Trúc Hải Sản', course: 'APPETIZER', isSoldOut: false },
        { id: 'd33', name: 'Gà Quay Chao Bánh Bao', course: 'MAIN', isSoldOut: false },
        { id: 'd34', name: 'Tôm Rang Me Cốt Dừa', course: 'MAIN', isSoldOut: false, allergens: 'Tôm' },
        { id: 'd35', name: 'Lẩu Cá Thác Lác Khổ Qua', course: 'SOUP', isSoldOut: false },
        { id: 'd36', name: 'Cơm Chiên Hoàng Bào', course: 'MAIN', isSoldOut: false },
        { id: 'd37', name: 'Bò Né Bông Thiên Lý', course: 'MAIN', isSoldOut: false },
        { id: 'd38', name: 'Bắp Cải Cuộn Thịt Hấp', course: 'MAIN', isSoldOut: false },
        { id: 'd39', name: 'Rau Câu 3 Màu Nước Cốt Dừa', course: 'DESSERT', isSoldOut: false },
      ],
    };

    this.packages.set(pkg1.id, pkg1);
    this.packages.set(pkg2.id, pkg2);
    this.packages.set(pkg3.id, pkg3);

    this.seedDefaultDishSupplies();
  }

  /**
   * Khởi tạo dữ liệu Bảng tình trạng món ăn & khả năng cung ứng ban đầu cho các nhà hàng
   */
  private seedDefaultDishSupplies() {
    const samplePackages = [
      this.packages.get('pkg-wedding-gold-001'),
      this.packages.get('pkg-anniversary-silver-002'),
      this.packages.get('pkg-birthday-party-003'),
    ].filter(Boolean) as FeastPackage[];

    for (const pkg of samplePackages) {
      const existing = this.dishSupplies.get(pkg.merchantId) || [];
      for (const d of pkg.dishes) {
        if (!existing.some((s) => s.dishId === d.id || s.dishName === d.name)) {
          existing.push({
            id: `supp-${d.id}`,
            merchantId: pkg.merchantId,
            dishId: d.id,
            dishName: d.name,
            course: d.course,
            packageNames: [pkg.name],
            supplyStatus: d.isSoldOut ? 'OUT_OF_STOCK' : 'AVAILABLE',
            maxDailyPortions: 60,
            committedPortions: 0,
            remainingPortions: 60,
            availableDateRange: 'Khả dụng quanh năm',
            suggestedReplacementDish:
              d.course === 'APPETIZER'
                ? 'Gỏi Tôm Thịt Ngó Sen'
                : d.course === 'MAIN'
                ? 'Gà Ta Hấp Lá Chanh'
                : 'Chè Hạt Sen Long Nhãn',
            updatedBy: 'Bếp trưởng',
            updatedAt: new Date(),
          });
        }
      }
      this.dishSupplies.set(pkg.merchantId, existing);
    }
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
        isSoldOut: false,
      })),
      servingsPerTable: dto.servingsPerTable,
      pricePerTable: dto.pricePerTable,
      minTables: 3,
      maxTables: dto.maxTablesPerDay || 50,
      maxTablesPerDay: dto.maxTablesPerDay,
      imageUrl: dto.imageUrl,
      isAvailable: true,
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
    if (dto.maxTablesPerDay !== undefined) {
      pkg.maxTablesPerDay = dto.maxTablesPerDay;
      pkg.maxTables = dto.maxTablesPerDay;
    }
    if (dto.imageUrl !== undefined) pkg.imageUrl = dto.imageUrl;
    if (dto.dishes) {
      pkg.dishes = dto.dishes.map((d, index) => ({
        id: `dish-${index + 1}-${crypto.randomBytes(3).toString('hex')}`,
        name: d.name.trim(),
        course: d.course,
        description: d.description?.trim(),
        extraPrice: d.extraPrice ?? 0,
        isSoldOut: false,
      }));
    }
    pkg.updatedAt = new Date();
    return pkg;
  }

  async toggleDishSoldOut(
    packageId: string,
    dishId: string,
    dto: ToggleSoldOutDto,
  ): Promise<{ success: boolean; dish: any }> {
    const pkg = await this.getPackageById(packageId);
    const dish = pkg.dishes.find((d) => d.id === dishId);
    if (!dish) {
      throw new NotFoundException(`Không tìm thấy món ăn ID ${dishId} trong gói ${packageId}`);
    }
    dish.isSoldOut = dto.isSoldOut;
    this.logger.log(`[Catering] Món ${dish.name} trong gói ${pkg.name} chuyển trạng thái soldOut=${dto.isSoldOut}`);
    return { success: true, dish };
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
  // U025: BÁO GIÁ ĐA THÀNH PHẦN (PRICING ENGINE)
  // ----------------------------------------------------------------------------

  async calculateQuote(dto: FeastQuoteDto): Promise<FeastQuoteBreakdown> {
    const pkg = await this.getPackageById(dto.packageId);
    const tableCount = dto.tableCount;
    const basePricePerTable = pkg.pricePerTable;
    const tablesSubtotal = basePricePerTable * tableCount;

    // Phụ thu món tùy chỉnh thêm
    const customCount = dto.customDishes?.length || 0;
    const customDishesSurcharge = customCount * 150000 * tableCount;

    // Chiết khấu mâm lớn theo quy định:
    // >= 30 mâm: giảm 10%
    // >= 20 mâm: giảm 8%
    // >= 10 mâm: giảm 5%
    let discountPercentage = 0;
    if (tableCount >= 30) discountPercentage = 10;
    else if (tableCount >= 20) discountPercentage = 8;
    else if (tableCount >= 10) discountPercentage = 5;

    const discountAmount = Math.round((tablesSubtotal * discountPercentage) / 100);

    // Phí dịch vụ nhân viên phục vụ tiệc & set bàn: 50.000đ/bàn
    const serviceFee = tableCount * 50000;
    // Phí vận chuyển đồ dùng cự ly (ước tính cố định 200.000đ)
    const deliveryFee = 200000;
    // Phí thuê thiết bị bàn ghế (nếu có yêu cầu hoặc ước tính)
    const equipmentFee = 0;

    const totalEstimatedAmount =
      tablesSubtotal + customDishesSurcharge + deliveryFee + serviceFee + equipmentFee - discountAmount;

    // BR-21: Mức cọc quy định từ 30% đến 50%
    const depositPercent = 30;
    const depositAmount = Math.round((totalEstimatedAmount * depositPercent) / 100);
    const remainingAmount = totalEstimatedAmount - depositAmount;

    return {
      packageId: pkg.id,
      packageName: pkg.name,
      tableCount,
      basePricePerTable,
      tablesSubtotal,
      customDishesSurcharge,
      deliveryFee,
      serviceFee,
      equipmentFee,
      discountPercentage,
      discountAmount,
      totalEstimatedAmount,
      depositPercent,
      depositAmount,
      remainingAmount,
      minDepositRequired: depositAmount,
      suggestedDeposit: Math.round((totalEstimatedAmount * 40) / 100),
    };
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: QUẢN LÝ CÔNG SUẤT PHỤC VỤ & CHỐNG QUÁ TẢI (ANTI-OVERBOOKING)
  // ----------------------------------------------------------------------------

  async getCapacityConfig(merchantId: string): Promise<CateringCapacityConfig> {
    const config = this.capacityConfigs.get(merchantId);
    if (!config) {
      const defaultConf: CateringCapacityConfig = {
        merchantId,
        maxOrdersPerDay: 5,
        maxTablesPerDay: 50,
        maxTablesPerSlot: 25,
        minNoticeHours: 72,
        prepBufferHours: 3.0,
        transitBufferHours: 1.0,
        serviceBufferHours: 3.0,
        cleanupBufferHours: 1.5,
        isActive: true,
      };
      this.capacityConfigs.set(merchantId, defaultConf);
      return defaultConf;
    }
    return config;
  }

  async updateCapacityConfig(
    merchantId: string,
    dto: UpdateCapacityConfigDto,
  ): Promise<CateringCapacityConfig> {
    const current = await this.getCapacityConfig(merchantId);
    const updated: CateringCapacityConfig = {
      ...current,
      ...(dto.maxOrdersPerDay !== undefined ? { maxOrdersPerDay: dto.maxOrdersPerDay } : {}),
      ...(dto.maxTablesPerDay !== undefined ? { maxTablesPerDay: dto.maxTablesPerDay } : {}),
      ...(dto.maxTablesPerSlot !== undefined ? { maxTablesPerSlot: dto.maxTablesPerSlot } : {}),
      ...(dto.minNoticeHours !== undefined ? { minNoticeHours: dto.minNoticeHours } : {}),
      ...(dto.prepBufferHours !== undefined ? { prepBufferHours: dto.prepBufferHours } : {}),
      ...(dto.transitBufferHours !== undefined ? { transitBufferHours: dto.transitBufferHours } : {}),
      ...(dto.serviceBufferHours !== undefined ? { serviceBufferHours: dto.serviceBufferHours } : {}),
      ...(dto.cleanupBufferHours !== undefined ? { cleanupBufferHours: dto.cleanupBufferHours } : {}),
    };
    this.capacityConfigs.set(merchantId, updated);
    this.logger.log(`[Catering] Cập nhật cấu hình công suất cho quán ${merchantId}`);
    return updated;
  }

  async toggleBlockSlot(
    merchantId: string,
    dto: ToggleBlockSlotDto,
  ): Promise<{ success: boolean; message: string }> {
    let slots = this.blockedSlots.get(merchantId) || [];
    if (dto.isBlocked) {
      // Thêm slot khóa
      const exists = slots.some((s) => s.blockDate === dto.date && s.timeSlot === (dto.timeSlot || null));
      if (!exists) {
        slots.push({
          id: crypto.randomUUID(),
          merchantId,
          blockDate: dto.date,
          timeSlot: dto.timeSlot,
          reason: dto.reason,
          createdAt: new Date(),
        });
      }
      // Đồng bộ vào legacy blockedDates nếu khóa cả ngày
      if (!dto.timeSlot) {
        if (!this.blockedDates.has(merchantId)) this.blockedDates.set(merchantId, new Set());
        this.blockedDates.get(merchantId)!.add(dto.date);
      }
    } else {
      // Mở khóa slot
      slots = slots.filter((s) => !(s.blockDate === dto.date && (!dto.timeSlot || s.timeSlot === dto.timeSlot)));
      if (this.blockedDates.has(merchantId) && !dto.timeSlot) {
        this.blockedDates.get(merchantId)!.delete(dto.date);
      }
    }
    this.blockedSlots.set(merchantId, slots);
    return {
      success: true,
      message: dto.isBlocked
        ? `Đã khóa nhận tiệc ngày ${dto.date}${dto.timeSlot ? ` khung giờ ${dto.timeSlot}` : ''}`
        : `Đã mở nhận tiệc ngày ${dto.date}${dto.timeSlot ? ` khung giờ ${dto.timeSlot}` : ''}`,
    };
  }

  /**
   * Tính toán khoảng khung giờ chuẩn
   */
  private getStandardTimeSlot(timeStr: string): string {
    const [hh] = timeStr.split(':').map(Number);
    if (hh >= 9 && hh < 15) return '10:00-14:00';
    return '17:00-21:00';
  }

  /**
   * Giải phóng tự động các đơn giữ chỗ đã hết hạn (Automatic Release Expired Holds)
   */
  private releaseExpiredHolds() {
    const now = new Date();
    for (const b of this.bookings.values()) {
      if (
        b.isHoldingCapacity &&
        b.holdExpiresAt &&
        b.holdExpiresAt < now &&
        ['PENDING_RESTAURANT_CONFIRMATION', 'PENDING_CUSTOMER_APPROVAL', 'PENDING_DEPOSIT', 'REQUESTED', 'APPROVED_WAITING_DEPOSIT'].includes(b.status)
      ) {
        b.status = 'EXPIRED';
        b.isHoldingCapacity = false;
        b.merchantNotes = (b.merchantNotes ? b.merchantNotes + ' • ' : '') + 'Tự động giải phóng công suất do hết hạn phản hồi';
        b.timeline.push({
          title: 'Đơn tiệc hết hạn (SLA Expired)',
          description: 'Hết thời hạn phản hồi / đặt cọc. Hệ thống tự động hủy đơn và giải phóng mâm trống cho khách hàng khác.',
          status: 'EXPIRED',
          timestamp: new Date(),
          actor: 'SYSTEM',
        });
        this.logAudit(b.id, 'SYSTEM', 'SYSTEM', 'EXPIRE', 'ACTIVE', 'EXPIRED', 'Hết hạn giữ chỗ');
        this.logger.log(`[Catering] Tự động hết hạn và giải phóng công suất đơn ${b.bookingCode}`);
      }
    }
  }

  /**
   * Tra cứu lịch khả dụng & công suất còn lại của nhà hàng trong ngày / tháng
   */
  async getMerchantAvailability(
    merchantId: string,
    queryDate: string, // YYYY-MM-DD
    requestedTables = 10,
  ): Promise<DayAvailability> {
    this.releaseExpiredHolds();

    const config = await this.getCapacityConfig(merchantId);
    const blockedSlots = this.blockedSlots.get(merchantId) || [];
    const isDayBlocked = blockedSlots.some((s) => s.blockDate === queryDate && !s.timeSlot);
    const dayBlockReason = blockedSlots.find((s) => s.blockDate === queryDate && !s.timeSlot)?.reason;

    const activeBookings = Array.from(this.bookings.values()).filter(
      (b) =>
        b.merchantId === merchantId &&
        b.eventDate === queryDate &&
        ['PENDING_RESTAURANT_CONFIRMATION', 'PENDING_CUSTOMER_APPROVAL', 'PENDING_DEPOSIT', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'IN_SERVICE', 'REQUESTED', 'APPROVED_WAITING_DEPOSIT', 'DEPOSIT_PAID'].includes(b.status) &&
        b.isHoldingCapacity,
    );

    const totalBookedTables = activeBookings
      .filter((b) => ['CONFIRMED', 'PREPARING', 'DELIVERED', 'DEPOSIT_PAID', 'IN_SERVICE'].includes(b.status))
      .reduce((sum, b) => sum + b.tableCount, 0);

    const totalHeldTables = activeBookings
      .filter((b) => ['PENDING_RESTAURANT_CONFIRMATION', 'PENDING_CUSTOMER_APPROVAL', 'PENDING_DEPOSIT', 'REQUESTED', 'APPROVED_WAITING_DEPOSIT'].includes(b.status))
      .reduce((sum, b) => sum + b.tableCount, 0);

    const totalOccupied = totalBookedTables + totalHeldTables;
    const totalRemainingTables = Math.max(0, config.maxTablesPerDay - totalOccupied);

    // Tính toán từng khung giờ tiêu chuẩn (Trưa 10:00-14:00 & Tối 17:00-21:00)
    const standardSlots = ['10:00-14:00', '17:00-21:00'];
    const slots: SlotAvailability[] = standardSlots.map((slot) => {
      const isSlotBlocked = isDayBlocked || blockedSlots.some((s) => s.blockDate === queryDate && s.timeSlot === slot);
      const slotBookings = activeBookings.filter((b) => this.getStandardTimeSlot(b.eventTime) === slot);
      const booked = slotBookings
        .filter((b) => ['CONFIRMED', 'PREPARING', 'DELIVERED', 'DEPOSIT_PAID', 'IN_SERVICE'].includes(b.status))
        .reduce((sum, b) => sum + b.tableCount, 0);
      const held = slotBookings
        .filter((b) => ['PENDING_RESTAURANT_CONFIRMATION', 'PENDING_CUSTOMER_APPROVAL', 'PENDING_DEPOSIT', 'REQUESTED', 'APPROVED_WAITING_DEPOSIT'].includes(b.status))
        .reduce((sum, b) => sum + b.tableCount, 0);
      const remaining = Math.max(0, config.maxTablesPerSlot - (booked + held));

      let status: AvailabilityStatus = 'AVAILABLE';
      if (isSlotBlocked) status = 'BLOCKED';
      else if (remaining <= 0 || (booked + held) >= config.maxTablesPerSlot) status = 'FULLY_BOOKED';
      else if (remaining < Math.round(config.maxTablesPerSlot * 0.3)) status = 'LIMITED';

      return {
        timeSlot: slot,
        status,
        maxCapacityTables: config.maxTablesPerSlot,
        bookedTables: booked,
        heldTables: held,
        remainingTables: remaining,
        isAvailable: !isSlotBlocked && remaining >= requestedTables,
      };
    });

    let dayStatus: AvailabilityStatus = 'AVAILABLE';
    if (isDayBlocked) dayStatus = 'BLOCKED';
    else if (totalRemainingTables <= 0 || activeBookings.length >= config.maxOrdersPerDay) dayStatus = 'FULLY_BOOKED';
    else if (totalRemainingTables < Math.round(config.maxTablesPerDay * 0.3)) dayStatus = 'LIMITED';

    // Đề xuất thay thế thông minh nếu ngày/giờ bị đầy
    const alternativeSuggestions: DayAvailability['alternativeSuggestions'] = {};
    if (dayStatus === 'FULLY_BOOKED' || dayStatus === 'BLOCKED') {
      const qd = new Date(queryDate);
      const nextDay = new Date(qd);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayAfter = new Date(qd);
      dayAfter.setDate(dayAfter.getDate() + 2);

      alternativeSuggestions.recommendedDates = [
        nextDay.toISOString().split('T')[0],
        dayAfter.toISOString().split('T')[0],
      ];
      alternativeSuggestions.recommendedSlots = slots
        .filter((s) => s.status !== 'FULLY_BOOKED' && s.status !== 'BLOCKED')
        .map((s) => s.timeSlot);

      // Gợi ý nhà hàng khác còn công suất
      alternativeSuggestions.alternativeMerchants = [
        { id: 'merchant-catering-phuong-nam', name: 'Nhà Hàng Tiệc Phương Nam — Quận 7', availableTables: 20 },
        { id: 'merchant-catering-ha-thanh', name: 'Bếp Cỗ Gia Truyền — Quận 3', availableTables: 25 },
      ].filter((m) => m.id !== merchantId);
    }

    return {
      date: queryDate,
      status: dayStatus,
      maxTablesPerDay: config.maxTablesPerDay,
      totalBookedTables,
      totalHeldTables,
      totalRemainingTables,
      slots,
      isBlocked: isDayBlocked,
      blockReason: dayBlockReason,
      alternativeSuggestions,
    };
  }

  // ----------------------------------------------------------------------------
  // SECTION 2 & 4: TẠO ĐƠN TIỆC & GIỮ CHỖ TẠM THỜI (ATOMIC HOLD)
  // ----------------------------------------------------------------------------

  async createBooking(
    user: AuthenticatedUser,
    dto: CreateFeastBookingDto,
  ): Promise<FeastBooking> {
    this.releaseExpiredHolds();

    const pkg = await this.getPackageById(dto.packageId);
    const config = await this.getCapacityConfig(pkg.merchantId);

    // 1. Kiểm tra quy tắc đặt trước tối thiểu (BR-24)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dto.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const minDaysRequired = Math.ceil(config.minNoticeHours / 24);
    if (diffDays < minDaysRequired) {
      throw new BadRequestException(
        `Quy định BR-24: Đơn đặt mâm cỗ phải được đặt trước ngày diễn ra sự kiện ít nhất ${minDaysRequired} ngày (${config.minNoticeHours} giờ)`,
      );
    }

    // 2. Kiểm tra ngày & khung giờ bị chặn (Blocked dates & slots)
    const availability = await this.getMerchantAvailability(pkg.merchantId, dto.eventDate, dto.tableCount);
    if (availability.isBlocked) {
      throw new BadRequestException(
        `Nhà hàng đã chặn nhận thêm tiệc vào ngày ${dto.eventDate}. Lý do: ${availability.blockReason || 'Kín lịch phục vụ'}`,
      );
    }

    const slotName = this.getStandardTimeSlot(dto.eventTime);
    const targetSlot = availability.slots.find((s) => s.timeSlot === slotName);
    if (targetSlot && !targetSlot.isAvailable) {
      throw new BadRequestException(
        `Khung giờ ${slotName} ngày ${dto.eventDate} đã đạt giới hạn công suất (Chỉ còn trống ${targetSlot.remainingTables} mâm). Quý khách vui lòng chọn khung giờ khác.`,
      );
    }

    if (availability.totalRemainingTables < dto.tableCount) {
      throw new BadRequestException(
        `Quán đã đạt giới hạn công suất cho ngày ${dto.eventDate} (Còn trống: ${availability.totalRemainingTables}/${config.maxTablesPerDay} mâm)`,
      );
    }

    // 3. Tính toán báo giá chính xác
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

    // Thời hạn nhà hàng phản hồi xác minh: 24 giờ
    const restaurantDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Thời hạn giữ chỗ ban đầu tương đương thời hạn nhà hàng duyệt
    const holdExpiresAt = restaurantDeadline;

    const booking: FeastBooking = {
      id: bookingId,
      bookingCode,
      userId: user.id,
      customerName: dto.contactName || user.fullName || user.email.split('@')[0],
      customerPhone: dto.customerPhone,
      merchantId: pkg.merchantId,
      packageId: pkg.id,
      packageName: pkg.name,
      eventType: pkg.eventType,
      eventDate: dto.eventDate,
      eventTime: dto.eventTime,
      eventLocation: dto.eventLocation.trim(),
      eventLatitude: dto.eventLatitude,
      eventLongitude: dto.eventLongitude,
      tableCount: dto.tableCount,
      guestCount: dto.guestCount,
      guestCountPerTable: pkg.servingsPerTable,
      pricePerTable: pkg.pricePerTable,
      tablesSubtotal: quote.tablesSubtotal,
      deliveryFee: quote.deliveryFee,
      serviceFee: quote.serviceFee,
      equipmentFee: quote.equipmentFee,
      discountAmount: quote.discountAmount,
      totalAmount: quote.totalEstimatedAmount,
      depositRate,
      depositAmount,
      remainingAmount,
      isFullyPaid: false,
      status: 'REQUESTED', // Alias chuẩn cho PENDING_RESTAURANT_CONFIRMATION
      isHoldingCapacity: true,
      holdExpiresAt,
      restaurantDeadline,
      dietaryNotes: dto.dietaryNotes,
      equipmentNotes: dto.equipmentNotes,
      customDishes: dto.customDishes || [],
      specialNotes: dto.specialNotes?.trim(),
      menuProposals: [],
      timeline: [
        {
          title: 'Gửi yêu cầu đặt tiệc',
          description: `Khách hàng tạo yêu cầu đặt ${dto.tableCount} mâm vào ngày ${dto.eventDate} lúc ${dto.eventTime}. Đang chờ nhà hàng thẩm định năng lực (Hạn phản hồi: 24h).`,
          status: 'REQUESTED',
          timestamp: new Date(),
          actor: 'CUSTOMER',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.bookings.set(bookingId, booking);
    this.logAudit(bookingId, user.id, 'CUSTOMER', 'CREATE', undefined, 'REQUESTED', 'Tạo yêu cầu đặt tiệc mới');

    // Thông báo cho chủ nhà hàng
    this.sendNotification(
      pkg.merchantId,
      'Yêu cầu đặt tiệc mới!',
      `Đơn cỗ #${bookingCode} (${dto.tableCount} mâm) vào ngày ${dto.eventDate}. Vui lòng thẩm định năng lực và phản hồi trong 24h.`,
      'NEW_BOOKING_REQUEST',
      bookingId,
    );

    this.logger.log(`[Catering] Tạo thành công đơn cỗ ${bookingCode} cho khách ${user.email} (Giữ chỗ 24h)`);
    return booking;
  }

  // ----------------------------------------------------------------------------
  // SECTION 2: XÁC MINH KHẢ NĂNG PHỤC VỤ (CAPACITY VERIFICATION BY MERCHANT)
  // ----------------------------------------------------------------------------

  async verifyCapacity(
    bookingId: string,
    user: AuthenticatedUser,
    dto: VerifyCapacityDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    if (dto.action === 'ACCEPT') {
      if (booking.kitchenCheckStatus !== 'APPROVED' && (booking.status as string) !== 'KITCHEN_APPROVED') {
        throw new BadRequestException(
          'Bếp chưa xác nhận khả năng chế biến cho đơn này! Vui lòng gửi bếp xác nhận trước khi bấm Xác nhận đơn.',
        );
      }
      // Chuyển sang chờ đặt cọc, cấp thời hạn 24h để khách chuyển cọc MoMo / VietQR
      const depositDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
      booking.status = 'APPROVED_WAITING_DEPOSIT'; // Alias cho PENDING_DEPOSIT
      booking.depositDeadline = depositDeadline;
      booking.holdExpiresAt = depositDeadline;
      booking.isHoldingCapacity = true;
      booking.merchantNotes = dto.reason || 'Dịch vụ đã xác nhận đơn tiệc sau khi Bếp đồng ý khả năng chế biến.';
      booking.timeline.push({
        title: 'Dịch vụ xác nhận đơn với khách hàng',
        description: `Nhà hàng đã xác nhận có thể thực hiện đơn tiệc ${booking.tableCount} mâm. Quý khách vui lòng đặt cọc ${booking.depositRate}% (${booking.depositAmount.toLocaleString('vi-VN')}đ) trong 24h để hoàn tất đặt tiệc.`,
        status: 'APPROVED_WAITING_DEPOSIT',
        timestamp: new Date(),
        actor: 'MERCHANT',
      });

      this.logAudit(booking.id, user.id, 'MERCHANT', 'VERIFY_ACCEPT', 'KITCHEN_APPROVED', 'APPROVED_WAITING_DEPOSIT', dto.reason);
      this.sendNotification(
        booking.userId,
        'Nhà hàng đã xác nhận đơn đặt tiệc!',
        `Đơn đặt tiệc #${booking.bookingCode} của bạn đã được nhà hàng xác nhận. Vui lòng thanh toán tiền đặt cọc để hoàn tất đặt tiệc.`,
        'CAPACITY_VERIFIED',
        booking.id,
      );
    } else {
      // Từ chối nhận đơn, giải phóng mâm giữ chỗ
      booking.status = 'REJECTED';
      booking.isHoldingCapacity = false;
      booking.cancelReason = dto.reason || 'Nhà hàng không đủ khả năng phục vụ vào thời điểm này.';
      booking.timeline.push({
        title: 'Nhà hàng từ chối nhận tiệc',
        description: `Lý do: ${booking.cancelReason}`,
        status: 'REJECTED',
        timestamp: new Date(),
        actor: 'MERCHANT',
      });

      this.logAudit(booking.id, user.id, 'MERCHANT', 'VERIFY_REJECT', 'REQUESTED', 'REJECTED', dto.reason);
      this.sendNotification(
        booking.userId,
        'Yêu cầu đặt tiệc bị từ chối',
        `Rất tiếc nhà hàng không thể nhận đơn #${booking.bookingCode}. Lý do: ${booking.cancelReason}`,
        'BOOKING_APPROVED',
        booking.id,
      );
    }

    booking.updatedAt = new Date();
    return booking;
  }

  // ----------------------------------------------------------------------------
  // SECTION 6: ĐỀ XUẤT THAY ĐỔI THỰC ĐƠN (MENU REVISION PROPOSAL & DIFF)
  // ----------------------------------------------------------------------------

  async proposeMenu(
    bookingId: string,
    user: AuthenticatedUser,
    dto: ProposeMenuDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    const versionNumber = (booking.menuProposals?.length || 0) + 1;
    const priceDelta = dto.priceDeltaPerTable || 0;
    const newPricePerTable = booking.pricePerTable + priceDelta;
    const newTablesSubtotal = newPricePerTable * booking.tableCount;
    const newTotal = newTablesSubtotal + booking.deliveryFee + booking.serviceFee + booking.equipmentFee - booking.discountAmount;

    // Hạn phản hồi cho khách: 12 giờ
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    // Tính toán diff summary
    const added: string[] = [];
    const removed: string[] = [];
    const replaced: { from: string; to: string }[] = [];

    for (const item of dto.dishes) {
      if (item.action === 'ADD') added.push(item.dishName);
      else if (item.action === 'REMOVE') removed.push(item.dishName);
      else if (item.action === 'REPLACE' && item.originalDishName) {
        replaced.push({ from: item.originalDishName, to: item.dishName });
      }
    }

    const proposal: CateringMenuProposalDto = {
      versionNumber,
      status: 'PROPOSED',
      reason: dto.reason,
      dishes: dto.dishes,
      diffSummary: { added, removed, replaced },
      priceDeltaPerTable: priceDelta,
      newTotalAmount: newTotal,
      expiresAt,
      createdAt: new Date(),
    };

    if (!booking.menuProposals) booking.menuProposals = [];
    // Đánh dấu các bản ghi proposal cũ là SUPERSEDED
    booking.menuProposals.forEach((p) => {
      if (p.status === 'PROPOSED') p.status = 'SUPERSEDED';
    });
    booking.menuProposals.push(proposal);
    booking.activeProposal = proposal;

    booking.status = 'PENDING_CUSTOMER_APPROVAL';
    booking.customerDeadline = expiresAt;
    booking.holdExpiresAt = expiresAt; // Gia hạn giữ chỗ theo deadline của đề xuất
    booking.merchantNotes = `Đề xuất thực đơn v${versionNumber}: ${dto.reason}`;

    booking.timeline.push({
      title: `Nhà hàng gửi đề xuất điều chỉnh thực đơn (v${versionNumber})`,
      description: `${dto.reason}. Chênh lệch: ${priceDelta > 0 ? '+' : ''}${priceDelta.toLocaleString('vi-VN')}đ/mâm. Quý khách vui lòng phản hồi trong 12h.`,
      status: 'PENDING_CUSTOMER_APPROVAL',
      timestamp: new Date(),
      actor: 'MERCHANT',
    });

    this.logAudit(booking.id, user.id, 'MERCHANT', 'PROPOSE_MENU', 'PENDING_RESTAURANT_CONFIRMATION', 'PENDING_CUSTOMER_APPROVAL', dto.reason);
    this.sendNotification(
      booking.userId,
      'Đề xuất thay đổi thực đơn tiệc!',
      `Nhà hàng đã gửi đề xuất thực đơn mới cho đơn #${booking.bookingCode}. Vui lòng kiểm tra và duyệt trong 12h.`,
      'MENU_PROPOSED',
      booking.id,
    );

    booking.updatedAt = new Date();
    return booking;
  }

  async respondProposal(
    bookingId: string,
    user: AuthenticatedUser,
    dto: RespondProposalDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking.activeProposal || booking.activeProposal.status !== 'PROPOSED') {
      throw new BadRequestException('Không tìm thấy đề xuất thực đơn nào đang chờ phản hồi hoặc đề xuất đã hết hạn');
    }

    if (new Date() > new Date(booking.activeProposal.expiresAt)) {
      booking.activeProposal.status = 'EXPIRED';
      booking.status = 'EXPIRED';
      booking.isHoldingCapacity = false;
      throw new BadRequestException('Đề xuất thực đơn đã quá hạn phản hồi (12 giờ). Đơn tiệc đã tự động đóng.');
    }

    const proposal = booking.activeProposal;

    if (dto.action === 'ACCEPT') {
      proposal.status = 'ACCEPTED';
      // Cập nhật giá & thực đơn theo đề xuất
      booking.pricePerTable += proposal.priceDeltaPerTable;
      booking.totalAmount = proposal.newTotalAmount;
      booking.depositAmount = Math.round((booking.totalAmount * booking.depositRate) / 100);
      booking.remainingAmount = booking.totalAmount - booking.depositAmount;

      const depositDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
      booking.status = 'APPROVED_WAITING_DEPOSIT'; // Chờ cọc
      booking.depositDeadline = depositDeadline;
      booking.holdExpiresAt = depositDeadline;

      booking.timeline.push({
        title: 'Khách hàng đồng ý đề xuất thực đơn',
        description: `Thống nhất thực đơn mới v${proposal.versionNumber}. Tổng giá trị đơn: ${booking.totalAmount.toLocaleString('vi-VN')}đ. Tiến hành đặt cọc ${booking.depositRate}%.`,
        status: 'APPROVED_WAITING_DEPOSIT',
        timestamp: new Date(),
        actor: 'CUSTOMER',
      });

      this.logAudit(booking.id, user.id, 'CUSTOMER', 'ACCEPT_PROPOSAL', 'PENDING_CUSTOMER_APPROVAL', 'APPROVED_WAITING_DEPOSIT', dto.notes);
      this.sendNotification(
        booking.merchantId,
        'Khách đã duyệt thực đơn!',
        `Khách hàng đã đồng ý thực đơn đề xuất đơn #${booking.bookingCode}. Đang chờ thanh toán tiền cọc.`,
        'PROPOSAL_ACCEPTED',
        booking.id,
      );
    } else if (dto.action === 'REVISE') {
      proposal.status = 'SUPERSEDED';
      booking.status = 'PENDING_RESTAURANT_REVISION';
      booking.timeline.push({
        title: 'Khách hàng yêu cầu điều chỉnh lại',
        description: `Ý kiến của khách: ${dto.notes || 'Cần điều chỉnh thêm món khác'}`,
        status: 'PENDING_RESTAURANT_REVISION',
        timestamp: new Date(),
        actor: 'CUSTOMER',
      });

      this.logAudit(booking.id, user.id, 'CUSTOMER', 'REVISE_PROPOSAL', 'PENDING_CUSTOMER_APPROVAL', 'PENDING_RESTAURANT_REVISION', dto.notes);
      this.sendNotification(
        booking.merchantId,
        'Khách yêu cầu sửa lại thực đơn',
        `Khách chưa ưng ý đề xuất đơn #${booking.bookingCode}. Ghi chú: ${dto.notes || 'Vui lòng kiểm tra lại món'}.`,
        'STATUS_CHANGE',
        booking.id,
      );
    } else {
      proposal.status = 'REJECTED';
      booking.status = 'REJECTED';
      booking.isHoldingCapacity = false;
      booking.cancelReason = dto.notes || 'Khách không đồng ý với thực đơn thay thế của nhà hàng.';

      booking.timeline.push({
        title: 'Khách hàng từ chối đề xuất',
        description: `Lý do: ${booking.cancelReason}`,
        status: 'REJECTED',
        timestamp: new Date(),
        actor: 'CUSTOMER',
      });

      this.logAudit(booking.id, user.id, 'CUSTOMER', 'REJECT_PROPOSAL', 'PENDING_CUSTOMER_APPROVAL', 'REJECTED', dto.notes);
    }

    booking.updatedAt = new Date();
    return booking;
  }

  // ----------------------------------------------------------------------------
  // SECTION 7: THANH TOÁN ĐẶT CỌC & QUYẾT TOÁN
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
    this.releaseExpiredHolds();

    const booking = await this.getBookingById(bookingId);

    if (booking.userId !== user.id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cọc cho đơn tiệc này');
    }

    if (booking.status !== 'APPROVED_WAITING_DEPOSIT' && booking.status !== 'REQUESTED' && booking.status !== 'PENDING_DEPOSIT') {
      throw new BadRequestException(
        `Đơn tiệc hiện ở trạng thái ${booking.status}, không thể thanh toán đặt cọc. Chỉ được cọc sau khi nhà hàng duyệt và thống nhất thực đơn.`,
      );
    }

    if (booking.holdExpiresAt && new Date() > new Date(booking.holdExpiresAt)) {
      booking.status = 'EXPIRED';
      booking.isHoldingCapacity = false;
      throw new BadRequestException('Hạn giữ chỗ đặt cọc đã hết (24 giờ). Vui lòng gửi yêu cầu đặt tiệc mới.');
    }

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
    paymentMethod = 'MOMO',
    dispatchToKitchen = true,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    // Không tạo trùng đơn chế biến nếu nhân viên bấm xác nhận nhiều lần
    if (booking.status === 'CONFIRMED' && booking.dispatchedToKitchen) {
      return booking;
    }

    booking.status = 'CONFIRMED';
    booking.depositPaid = true;
    booking.depositPaidAt = new Date();
    booking.depositPaymentMethod = paymentMethod;
    booking.depositTransactionRef = transId || `MOMO-FEAST-${booking.bookingCode.slice(-6)}`;
    booking.depositReceiptCode = booking.depositReceiptCode || `REC-COC-${booking.bookingCode}`;
    booking.isHoldingCapacity = true; // Khóa công suất vĩnh viễn cho đến khi hoàn thành tiệc

    if (dispatchToKitchen) {
      booking.dispatchedToKitchen = true;
      booking.dispatchedToKitchenAt = new Date();
      booking.dispatchedBy = 'Bộ phận Hợp đồng tiệc & Lịch';
    }

    booking.timeline.push({
      title: 'Đã nhận tiền cọc thành công - Xuất Phiếu thu cọc',
      description: `Đã thu số tiền cọc ${booking.depositAmount.toLocaleString('vi-VN')}đ qua ${paymentMethod} (Mã GD: ${booking.depositTransactionRef}). Đã xuất Phiếu thu cọc #${booking.depositReceiptCode}.${booking.dispatchedToKitchen ? ' Đã bàn giao Lệnh chế biến cho Bếp trực tiếp.' : ' Đang chờ Hợp đồng chuyển lệnh cho Bếp.'}`,
      status: 'CONFIRMED',
      timestamp: new Date(),
      actor: 'MERCHANT',
    });

    this.logAudit(booking.id, 'SYSTEM', 'SYSTEM', 'CONFIRM_DEPOSIT', 'APPROVED_WAITING_DEPOSIT', 'CONFIRMED', booking.depositTransactionRef);

    // Gửi thông báo nổi bật cho tài khoản Bếp
    this.sendNotification(
      booking.merchantId,
      '🔥 Lệnh chế biến tiệc mới cho Bếp!',
      `Đơn tiệc #${booking.bookingCode} (${booking.tableCount} mâm) đã được xác nhận cọc thành công (${booking.depositAmount.toLocaleString('vi-VN')}đ). Bếp bắt đầu chuẩn bị và chế biến theo lịch!`,
      'STATUS_CHANGE',
      booking.id,
    );

    // Gửi thông báo đặt tiệc thành công đến khách hàng
    this.sendNotification(
      booking.userId,
      'Đặt tiệc thành công!',
      `Đơn đặt tiệc #${booking.bookingCode} đã được nhà hàng xác nhận thu tiền cọc (${booking.depositAmount.toLocaleString('vi-VN')}đ). Bếp đã nhận lệnh chế biến và chuẩn bị phục vụ!`,
      'DEPOSIT_SUCCESS',
      booking.id,
    );

    this.logger.log(`[Catering] Đã xác nhận cọc và chuyển lệnh bếp thành công cho đơn cỗ ${booking.bookingCode}`);
    return booking;
  }

  async dispatchToKitchen(
    bookingId: string,
    actor = 'Bộ phận Hợp đồng tiệc & Lịch',
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    if (!booking.depositPaidAt && booking.status !== 'DEPOSIT_PAID' && booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Chưa thể chuyển lệnh cho Bếp khi đơn tiệc chưa hoàn tất đặt cọc!');
    }

    booking.dispatchedToKitchen = true;
    booking.dispatchedToKitchenAt = new Date();
    booking.dispatchedBy = actor;
    booking.status = 'CONFIRMED';

    booking.timeline.push({
      title: 'Đã bàn giao Lệnh chế biến cho Bếp',
      description: `Hợp đồng tiệc & Lịch đã chính thức bàn giao lệnh nấu cho Bếp trực tiếp. Bếp bắt đầu được phép sơ chế và chế biến.`,
      status: 'CONFIRMED',
      timestamp: new Date(),
      actor: 'MERCHANT',
    });

    this.sendNotification(
      booking.merchantId,
      'Lệnh chế biến tiệc mới cho Bếp',
      `Đơn tiệc #${booking.bookingCode} (${booking.tableCount} mâm) đã hoàn tất cọc và được chuyển cho Bếp chuẩn bị.`,
      'STATUS_CHANGE',
      booking.id,
    );

    return booking;
  }

  async settleRemainingBalance(
    bookingId: string,
    user: AuthenticatedUser,
    dto: PayRemainingDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    if (booking.userId !== user.id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn cỗ này');
    }

    booking.remainingPaidAt = new Date();
    booking.isFullyPaid = true;
    booking.status = 'COMPLETED';
    booking.isHoldingCapacity = false; // Giải phóng mâm

    booking.timeline.push({
      title: 'Quyết toán Đợt 2 thành công',
      description: `Đã thanh toán phần còn lại ${booking.remainingAmount.toLocaleString('vi-VN')}đ qua ${dto.paymentMethod}. Tiệc hoàn tất trọn vẹn.`,
      status: 'COMPLETED',
      timestamp: new Date(),
      actor: 'CUSTOMER',
    });

    this.logAudit(booking.id, user.id, 'CUSTOMER', 'SETTLE_FINAL', 'DEPOSIT_PAID', 'COMPLETED', 'Thanh toán hoàn tất 100%');
    this.sendNotification(
      booking.userId,
      'Quyết toán hoàn tất!',
      `Đơn cỗ #${booking.bookingCode} đã thanh toán toàn bộ 100% chi phí. Cảm ơn quý khách đã tin dùng DineGo!`,
      'STATUS_CHANGE',
      booking.id,
    );

    return booking;
  }

  // ----------------------------------------------------------------------------
  // SECTION 8: CHUYỂN TRẠNG THÁI & HỦY/HOÀN CỌC (BR-44)
  // ----------------------------------------------------------------------------

  async reviewBooking(
    bookingId: string,
    user: AuthenticatedUser,
    dto: ReviewFeastBookingDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    if (dto.status === 'CANCELLED') {
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
      booking.isHoldingCapacity = false;
      const cancelledActor: 'CUSTOMER' | 'MERCHANT' = user.roles.includes(Role.MERCHANT) ? 'MERCHANT' : 'CUSTOMER';
      booking.cancelledBy = cancelledActor;
      booking.merchantNotes = dto.merchantNotes || `Hủy trước ${daysRemaining} ngày. Tỷ lệ hoàn cọc BR-44: ${refundRate}% (${refundAmount.toLocaleString('vi-VN')}đ)`;
      booking.timeline.push({
        title: 'Đơn cỗ bị hủy',
        description: `Hủy trước ngày sự kiện ${daysRemaining} ngày. Hoàn lại ${refundRate}% tiền cọc (${refundAmount.toLocaleString('vi-VN')}đ).`,
        status: 'CANCELLED',
        timestamp: new Date(),
        actor: cancelledActor,
      });

      this.logAudit(booking.id, user.id, booking.cancelledBy, 'CANCEL', 'ACTIVE', 'CANCELLED', booking.merchantNotes);
      return booking;
    }

    const prevStatus = booking.status;
    booking.status = dto.status as FeastBookingStatus;
    if (dto.merchantNotes) booking.merchantNotes = dto.merchantNotes;

    let timelineTitle = 'Cập nhật trạng thái đơn';
    if (dto.status === 'APPROVED_WAITING_DEPOSIT') timelineTitle = 'Nhà hàng đã phê duyệt yêu cầu đặt tiệc';
    else if (dto.status === 'PREPARING') timelineTitle = 'Nhà hàng đang chuẩn bị nguyên liệu phục vụ tiệc';
    else if (dto.status === 'DELIVERING') timelineTitle = 'Đang vận chuyển bàn ghế & thực đơn tới địa điểm';
    else if (dto.status === 'DELIVERED' || dto.status === 'IN_SERVICE') timelineTitle = 'Đang phục vụ tiệc tại địa điểm sự kiện';
    else if (dto.status === 'COMPLETED') {
      timelineTitle = 'Hoàn tất trọn vẹn sự kiện tiệc';
      booking.isHoldingCapacity = false;
    } else if (dto.status === 'REJECTED') {
      timelineTitle = 'Nhà hàng từ chối nhận tiệc';
      booking.isHoldingCapacity = false;
    }

    booking.timeline.push({
      title: timelineTitle,
      description: dto.merchantNotes || `Đơn cỗ chuyển sang trạng thái ${dto.status}`,
      status: booking.status,
      timestamp: new Date(),
      actor: user.roles.includes(Role.MERCHANT) ? 'MERCHANT' : 'SYSTEM',
    });

    this.logAudit(booking.id, user.id, 'MERCHANT', 'UPDATE_STATUS', prevStatus, booking.status, dto.merchantNotes);
    return booking;
  }

  // ----------------------------------------------------------------------------
  // SECTION 11: AUDIT TRAIL, TIMELINE & THÔNG BÁO
  // ----------------------------------------------------------------------------

  private logAudit(
    bookingId: string,
    actorId: string,
    actorRole: string,
    action: string,
    previousState?: string,
    newState?: string,
    note?: string,
  ) {
    if (!this.auditLogs.has(bookingId)) {
      this.auditLogs.set(bookingId, []);
    }
    this.auditLogs.get(bookingId)!.push({
      id: crypto.randomUUID(),
      bookingId,
      actorId,
      actorRole,
      action,
      previousState,
      newState,
      note,
      timestamp: new Date(),
    });
  }

  async getBookingAuditHistory(bookingId: string) {
    return this.auditLogs.get(bookingId) || [];
  }

  async getBookingTimeline(bookingId: string) {
    const booking = await this.getBookingById(bookingId);
    return {
      bookingCode: booking.bookingCode,
      currentStatus: booking.status,
      packageName: booking.packageName,
      eventDate: booking.eventDate,
      eventLocation: booking.eventLocation,
      timeline: booking.timeline,
      activeProposal: booking.activeProposal,
      menuProposals: booking.menuProposals,
    };
  }

  async getBookingById(bookingId: string): Promise<FeastBooking> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn tiệc mâm cỗ có ID ${bookingId}`);
    }
    return booking;
  }

  async getMerchantBookings(merchantId: string): Promise<FeastBooking[]> {
    this.releaseExpiredHolds();
    return Array.from(this.bookings.values()).filter((b) => b.merchantId === merchantId);
  }

  async getUserBookings(userId: string): Promise<FeastBooking[]> {
    this.releaseExpiredHolds();
    return Array.from(this.bookings.values()).filter((b) => b.userId === userId);
  }

  // Legacy compatibility:
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
    return this.toggleBlockSlot(merchantId, {
      date: dto.date,
      isBlocked: true,
      reason: dto.reason,
    });
  }

  private sendNotification(
    userId: string,
    title: string,
    message: string,
    type: CateringNotification['type'],
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
    this.logger.log(`[Notification] [${type}] Gửi tới ${userId}: ${title}`);
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

  // ----------------------------------------------------------------------------
  // SECTION 4: BẢNG QUẢN LÝ TÌNH TRẠNG MÓN ĂN & KHẢ NĂNG CUNG ỨNG NGUYÊN LIỆU (BẾP)
  // ----------------------------------------------------------------------------

  async getDishSupplies(merchantId: string): Promise<CateringDishSupply[]> {
    let supplies: CateringDishSupply[] = this.dishSupplies.get(merchantId) || [];
    if (supplies.length === 0) {
      // Tự động gom các món từ toàn bộ packages của merchant
      const pkgs = Array.from(this.packages.values()).filter((p) => p.merchantId === merchantId);
      supplies = [];
      for (const p of pkgs) {
        for (const d of p.dishes) {
          if (!supplies.some((s) => s.dishId === d.id || s.dishName === d.name)) {
            supplies.push({
              id: `supp-${d.id}`,
              merchantId,
              dishId: d.id,
              dishName: d.name,
              course: d.course,
              packageNames: [p.name],
              supplyStatus: d.isSoldOut ? 'OUT_OF_STOCK' : 'AVAILABLE',
              maxDailyPortions: 60,
              committedPortions: 0,
              remainingPortions: 60,
              availableDateRange: 'Khả dụng quanh năm',
              suggestedReplacementDish:
                d.course === 'APPETIZER'
                  ? 'Gỏi Tôm Thịt Ngó Sen'
                  : d.course === 'MAIN'
                  ? 'Gà Ta Hấp Lá Chanh'
                  : 'Chè Hạt Sen Long Nhãn',
              updatedBy: 'Bếp trưởng',
              updatedAt: new Date(),
            });
          }
        }
      }
      if (supplies.length === 0) {
        supplies = [
          {
            id: `supp-d1`,
            merchantId,
            dishId: 'd-goi-sen',
            dishName: 'Gỏi Tôm Thịt Củ Hũ Dừa',
            course: 'APPETIZER',
            packageNames: ['Mâm Tiệc Hoàng Gia', 'Mâm Cưới Cát Tường'],
            supplyStatus: 'AVAILABLE',
            maxDailyPortions: 60,
            committedPortions: 0,
            remainingPortions: 60,
            availableDateRange: 'Khả dụng quanh năm',
            suggestedReplacementDish: 'Gỏi Ngó Sen Tôm Thịt',
            updatedBy: 'Bếp trưởng',
            updatedAt: new Date(),
          },
          {
            id: `supp-d2`,
            merchantId,
            dishId: 'd-heo-quay',
            dishName: 'Heo Sữa Quay Giòn Da Kèm Bánh Bao',
            course: 'MAIN',
            packageNames: ['Mâm Tiệc Hoàng Gia'],
            supplyStatus: 'LOW_STOCK',
            maxDailyPortions: 30,
            committedPortions: 0,
            remainingPortions: 30,
            availableDateRange: 'Có hàng sau 1 ngày',
            outOfStockReason: 'Nguyên liệu heo sữa tươi cần đặt trước với trang trại',
            restockExpectedAt: 'Sau 24 giờ đặt hàng',
            suggestedReplacementDish: 'Gà Ta Hấp Lá Chanh',
            updatedBy: 'Bếp trưởng',
            updatedAt: new Date(),
          },
          {
            id: `supp-d3`,
            merchantId,
            dishId: 'd-ca-tam',
            dishName: 'Cá Tầm Nướng Muối Ớt Tây Bắc',
            course: 'MAIN',
            packageNames: ['Mâm Tiệc Thịnh Vượng'],
            supplyStatus: 'AVAILABLE',
            maxDailyPortions: 40,
            committedPortions: 0,
            remainingPortions: 40,
            availableDateRange: 'Khả dụng',
            suggestedReplacementDish: 'Cá Chẽm Hấp Hồng Kông',
            updatedBy: 'Bếp trưởng',
            updatedAt: new Date(),
          },
          {
            id: `supp-d4`,
            merchantId,
            dishId: 'd-lau-hai-san',
            dishName: 'Lẩu Hải Sản Nấm Tươi DineGo',
            course: 'SOUP',
            packageNames: ['Mâm Tiệc Hoàng Gia', 'Mâm Tiệc Thịnh Vượng'],
            supplyStatus: 'AVAILABLE',
            maxDailyPortions: 50,
            committedPortions: 0,
            remainingPortions: 50,
            availableDateRange: 'Khả dụng quanh năm',
            suggestedReplacementDish: 'Lẩu Gà Tiềm Ớt Hiểm',
            updatedBy: 'Bếp trưởng',
            updatedAt: new Date(),
          },
          {
            id: `supp-d5`,
            merchantId,
            dishId: 'd-che-sen',
            dishName: 'Chè Hạt Sen Long Nhãn Cung Đình',
            course: 'DESSERT',
            packageNames: ['Mâm Tiệc Hoàng Gia', 'Mâm Cưới Cát Tường'],
            supplyStatus: 'AVAILABLE',
            maxDailyPortions: 80,
            committedPortions: 0,
            remainingPortions: 80,
            availableDateRange: 'Khả dụng quanh năm',
            suggestedReplacementDish: 'Rau Câu Trái Cây Tươi',
            updatedBy: 'Bếp trưởng',
            updatedAt: new Date(),
          },
        ];
      }
      this.dishSupplies.set(merchantId, supplies);
    }

    // Tự động tính số suất đã cam kết (committed portions) từ các đơn đã cọc hoặc đang giữ chỗ
    const activeBookings = Array.from(this.bookings.values()).filter(
      (b) =>
        b.merchantId === merchantId &&
        ['CONFIRMED', 'DEPOSIT_PAID', 'PREPARING', 'COOKING', 'READY_FOR_DELIVERY', 'PENDING_DEPOSIT', 'APPROVED_WAITING_DEPOSIT'].includes(b.status),
    );

    return supplies.map((s) => {
      let committed = 0;
      for (const b of activeBookings) {
        committed += b.tableCount; // Mỗi mâm có 1 suất món
      }
      const maxPortions = s.maxDailyPortions || 60;
      const remaining = Math.max(0, maxPortions - committed);
      return {
        ...s,
        committedPortions: committed,
        remainingPortions: remaining,
      };
    });
  }

  async updateDishSupply(
    merchantId: string,
    dishId: string,
    dto: UpdateDishSupplyDto,
    actor = 'Bếp trưởng',
  ): Promise<CateringDishSupply> {
    const list = await this.getDishSupplies(merchantId);
    let item = list.find((s) => s.dishId === dishId || s.id === dishId);

    if (!item) {
      item = {
        id: dishId,
        merchantId,
        dishId,
        dishName: 'Món ăn tiệc',
        course: 'MAIN',
        packageNames: [],
        supplyStatus: dto.supplyStatus,
        maxDailyPortions: dto.maxDailyPortions || 60,
        committedPortions: dto.committedPortions || 0,
        remainingPortions: 60,
        updatedBy: actor,
        updatedAt: new Date(),
      };
      list.push(item);
    }

    item.supplyStatus = dto.supplyStatus;
    if (dto.maxDailyPortions !== undefined) item.maxDailyPortions = dto.maxDailyPortions;
    if (dto.committedPortions !== undefined) item.committedPortions = dto.committedPortions;
    if (dto.availableDateRange !== undefined) item.availableDateRange = dto.availableDateRange;
    if (dto.outOfStockReason !== undefined) item.outOfStockReason = dto.outOfStockReason;
    if (dto.restockExpectedAt !== undefined) item.restockExpectedAt = dto.restockExpectedAt;
    if (dto.suggestedReplacementDish !== undefined) item.suggestedReplacementDish = dto.suggestedReplacementDish;
    item.updatedBy = actor;
    item.updatedAt = new Date();

    // Đồng bộ sang trạng thái isSoldOut của món trong các gói tiệc
    for (const pkg of this.packages.values()) {
      if (pkg.merchantId === merchantId) {
        const targetDish = pkg.dishes.find((d) => d.id === dishId || d.name === item!.dishName);
        if (targetDish) {
          targetDish.isSoldOut = dto.supplyStatus === 'OUT_OF_STOCK' || dto.supplyStatus === 'UNAVAILABLE';
        }
      }
    }

    this.dishSupplies.set(merchantId, list);
    this.logger.log(`[Catering] Bếp đã cập nhật tình trạng nguyên liệu món ${item.dishName}: ${dto.supplyStatus}`);
    return item;
  }

  // ----------------------------------------------------------------------------
  // SECTION 6: CẢNH BÁO QUÁ TẢI TRONG 3 NGÀY VÀ 7 NGÀY (FORECAST OVERLOAD ENGINE)
  // ----------------------------------------------------------------------------

  async getForecastOverload(merchantId: string): Promise<CateringForecastOverload> {
    this.releaseExpiredHolds();
    const config = await this.getCapacityConfig(merchantId);
    const days: any[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const curDate = new Date(today);
      curDate.setDate(curDate.getDate() + i);
      const dateStr = curDate.toISOString().split('T')[0];

      const availability = await this.getMerchantAvailability(merchantId, dateStr, 10);
      const occupied = availability.totalBookedTables + availability.totalHeldTables;
      const capacityPercent = Math.min(100, Math.round((occupied / Math.max(1, config.maxTablesPerDay)) * 100));

      days.push({
        date: dateStr,
        status: availability.status,
        capacityPercent,
        totalBookedTables: availability.totalBookedTables,
        totalHeldTables: availability.totalHeldTables,
        maxTablesPerDay: config.maxTablesPerDay,
        isOverloaded: capacityPercent >= 80,
      });
    }

    const threeDays = days.slice(0, 3);
    const threeDaysAvg = Math.round(threeDays.reduce((acc, d) => acc + d.capacityPercent, 0) / 3);
    const sevenDaysAvg = Math.round(days.reduce((acc, d) => acc + d.capacityPercent, 0) / 7);

    const isThreeDaysOverloaded = threeDaysAvg >= 80 || threeDays.some((d) => d.capacityPercent >= 80);
    const isAllSevenDaysFullyBooked = days.every(
      (d) => d.capacityPercent >= 100 || d.status === 'FULLY_BOOKED' || d.status === 'BLOCKED',
    );

    let warningMessage: string | undefined;
    if (isAllSevenDaysFullyBooked) {
      warningMessage = 'Nhà hàng đã kín toàn bộ lịch phục vụ tiệc trong 7 ngày tới. Quý khách vui lòng chọn ngày sau tuần tới.';
    } else if (isThreeDaysOverloaded) {
      warningMessage = 'Nhà hàng đang tiếp nhận số lượng lớn đơn đặt tiệc trong tuần tới. Vui lòng kiểm tra lịch phục vụ trước khi đặt.';
    }

    return {
      merchantId,
      threeDaysAveragePercent: threeDaysAvg,
      sevenDaysAveragePercent: sevenDaysAvg,
      isThreeDaysOverloaded,
      isAllSevenDaysFullyBooked,
      warningMessage,
      days,
    };
  }

  // ----------------------------------------------------------------------------
  // SECTION 3: XÁC MINH NĂNG LỰC BẾP (KITCHEN VERIFICATION HANDSHAKE)
  // ----------------------------------------------------------------------------

  async requestKitchenCheck(bookingId: string, user: AuthenticatedUser): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);
    booking.status = 'PENDING_KITCHEN_CHECK';
    booking.kitchenCheckStatus = 'PENDING';
    const deadline = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 giờ làm việc
    booking.restaurantDeadline = deadline;

    booking.timeline.push({
      title: 'Hợp đồng chuyển yêu cầu xác minh sang Bếp trực tiếp',
      description: `Kiểm tra khả năng cung ứng nguyên liệu và công suất bếp cho ${booking.tableCount} mâm vào ngày ${booking.eventDate}. Thời hạn xử lý: 4 giờ làm việc.`,
      status: 'PENDING_KITCHEN_CHECK',
      timestamp: new Date(),
      actor: 'MERCHANT',
    });

    this.logAudit(booking.id, user.id, 'MERCHANT', 'REQUEST_KITCHEN_CHECK', 'PENDING_REVIEW', 'PENDING_KITCHEN_CHECK', 'Chuyển đơn sang Bếp thẩm định');
    this.sendNotification(
      booking.merchantId,
      'Yêu cầu xác minh nguyên liệu từ Hợp đồng',
      `Đơn #${booking.bookingCode} (${booking.tableCount} mâm) cần bếp kiểm tra nguyên liệu & công suất trong 4h.`,
      'NEW_BOOKING_REQUEST',
      booking.id,
    );

    booking.updatedAt = new Date();
    return booking;
  }

  async respondKitchenCheck(
    bookingId: string,
    user: AuthenticatedUser,
    dto: KitchenCheckBookingDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);
    booking.kitchenCheckStatus = dto.status;
    booking.kitchenNotes = dto.notes;
    booking.kitchenCheckedAt = new Date();

    if (dto.status === 'APPROVED') {
      booking.kitchenCheckStatus = 'APPROVED';
      booking.status = 'KITCHEN_APPROVED';
      booking.merchantNotes = dto.notes || 'Bếp đã xác nhận Có thể chế biến (Đủ nguyên liệu và công suất).';

      booking.timeline.push({
        title: 'Bếp xác nhận CÓ THỂ CHẾ BIẾN',
        description: `Bếp trưởng đã thẩm định nguyên liệu thực tế cho ${booking.tableCount} mâm. Kết quả: Có thể chế biến. Chờ Dịch vụ bấm "Xác nhận đơn" để gửi yêu cầu đặt cọc cho khách.`,
        status: 'KITCHEN_APPROVED',
        timestamp: new Date(),
        actor: 'MERCHANT',
      });

      this.logAudit(booking.id, user.id, 'MERCHANT', 'KITCHEN_CHECK_APPROVED', 'PENDING_KITCHEN_CHECK', 'KITCHEN_APPROVED', dto.notes);
      this.sendNotification(
        booking.merchantId,
        'Bếp đã xác nhận CÓ THỂ CHẾ BIẾN!',
        `Bếp đã kiểm tra nguyên liệu & công suất cho đơn #${booking.bookingCode} (${booking.tableCount} mâm). Bạn có thể bấm "Xác nhận đơn" để gửi yêu cầu đặt cọc cho khách hàng.`,
        'CAPACITY_VERIFIED',
        booking.id,
      );
    } else if (dto.status === 'PARTIAL_SHORTAGE') {
      booking.kitchenCheckStatus = 'PARTIAL_SHORTAGE';
      booking.status = 'PENDING_RESTAURANT_REVISION';
      booking.merchantNotes = `Bếp đề xuất thay đổi món: ${dto.notes || 'Cần đề xuất đổi món do thiếu nguyên liệu'}`;

      booking.timeline.push({
        title: 'Bếp đề xuất thay đổi món',
        description: `${booking.merchantNotes}. Dịch vụ cần trao đổi với khách hàng và chỉ cập nhật thực đơn khi khách hàng đồng ý.`,
        status: 'PENDING_RESTAURANT_REVISION',
        timestamp: new Date(),
        actor: 'MERCHANT',
      });

      this.logAudit(booking.id, user.id, 'MERCHANT', 'KITCHEN_CHECK_PARTIAL', 'PENDING_KITCHEN_CHECK', 'PENDING_RESTAURANT_REVISION', dto.notes);
      this.sendNotification(
        booking.merchantId,
        'Bếp đề xuất thay đổi món: Đơn #' + booking.bookingCode,
        `Bếp báo thiếu nguyên liệu cho đơn #${booking.bookingCode}. Vui lòng trao đổi với khách hàng trước khi điều chỉnh thực đơn.`,
        'MENU_PROPOSED',
        booking.id,
      );
    } else {
      booking.kitchenCheckStatus = 'UNABLE_TO_SERVE';
      booking.status = 'REJECTED';
      booking.isHoldingCapacity = false;
      booking.cancelReason = dto.notes || 'Bếp không thể chế biến do thiếu nguyên liệu hoặc quá tải công suất.';

      booking.timeline.push({
        title: 'Bếp báo KHÔNG THỂ CHẾ BIẾN',
        description: `Lý do từ bếp: ${booking.cancelReason}. Đơn tiệc đã bị từ chối và giải phóng công suất.`,
        status: 'REJECTED',
        timestamp: new Date(),
        actor: 'MERCHANT',
      });

      this.logAudit(booking.id, user.id, 'MERCHANT', 'KITCHEN_CHECK_REJECTED', 'PENDING_KITCHEN_CHECK', 'REJECTED', dto.notes);
      this.sendNotification(
        booking.merchantId,
        'Bếp từ chối đơn #' + booking.bookingCode,
        `Bếp báo không thể chế biến đơn #${booking.bookingCode}. Lý do: ${booking.cancelReason}`,
        'STATUS_CHANGE',
        booking.id,
      );
      this.sendNotification(
        booking.userId,
        'Yêu cầu đặt tiệc không thể thực hiện',
        `Rất tiếc nhà hàng không đủ công suất hoặc nguyên liệu phục vụ đơn #${booking.bookingCode}. Lý do: ${booking.cancelReason}`,
        'BOOKING_APPROVED',
        booking.id,
      );
    }

    booking.updatedAt = new Date();
    return booking;
  }

  // ----------------------------------------------------------------------------
  // SECTION 9: LỆNH CHẾ BIẾN CHÍNH THỨC & TIẾN ĐỘ BẾP (PRODUCTION ORDERS)
  // ----------------------------------------------------------------------------

  async getKitchenOrders(merchantId: string): Promise<{
    officialProductionOrders: FeastBooking[];
    forecastBookings: FeastBooking[];
  }> {
    this.releaseExpiredHolds();
    const all = Array.from(this.bookings.values()).filter((b) => b.merchantId === merchantId);

    const officialProductionOrders = all.filter((b) =>
      ['CONFIRMED', 'DEPOSIT_PAID', 'PREPARING', 'COOKING', 'READY_FOR_DELIVERY'].includes(b.status),
    );

    const forecastBookings = all.filter((b) =>
      ['PENDING_REVIEW', 'REQUESTED', 'PENDING_KITCHEN_CHECK', 'KITCHEN_APPROVED', 'PENDING_CUSTOMER_APPROVAL', 'PENDING_RESTAURANT_REVISION', 'APPROVED_WAITING_DEPOSIT', 'PENDING_DEPOSIT'].includes(b.status),
    );

    return { officialProductionOrders, forecastBookings };
  }

  async updateKitchenProgress(
    bookingId: string,
    user: AuthenticatedUser,
    dto: UpdateKitchenProgressDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);

    const isAllowedToCook = Boolean(
      booking.depositPaidAt ||
      booking.status === 'DEPOSIT_PAID' ||
      booking.status === 'CONFIRMED' ||
      booking.dispatchedToKitchen,
    );
    if (!isAllowedToCook) {
      throw new BadRequestException(
        'Bếp chưa được phép chế biến đơn này. Chỉ bắt đầu làm món sau khi đơn tiệc đã được xác nhận cọc và bàn giao lệnh chế biến chính thức!',
      );
    }

    const prevStatus = booking.status;
    booking.status = dto.progressStatus as FeastBookingStatus;

    let progressTitle = 'Bếp cập nhật tiến độ chế biến';
    if (dto.progressStatus === 'PREPARING') progressTitle = 'Bếp đang sơ chế & chuẩn bị nguyên liệu';
    else if (dto.progressStatus === 'COOKING') progressTitle = 'Bếp đang nấu nướng & chế biến các món tiệc';
    else if (dto.progressStatus === 'READY_FOR_DELIVERY') progressTitle = 'Bếp đã hoàn tất chế biến, sẵn sàng bàn giao xe tải vận chuyển';

    booking.timeline.push({
      title: progressTitle,
      description: dto.notes || `Trạng thái chế biến: ${dto.progressStatus}`,
      status: booking.status,
      timestamp: new Date(),
      actor: 'MERCHANT',
    });

    this.logAudit(booking.id, user.id, 'MERCHANT', 'UPDATE_KITCHEN_PROGRESS', prevStatus, booking.status, dto.notes);
    booking.updatedAt = new Date();
    return booking;
  }

  // ----------------------------------------------------------------------------
  // SECTION 10 & 11: KIỂM TRA SẴN SÀNG 24-48H & ĐIỀU CHỈNH SAU CỌC
  // ----------------------------------------------------------------------------

  async preEventCheck(
    bookingId: string,
    user: AuthenticatedUser,
    dto: PreEventCheckDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);
    const passed = dto.kitchenIngredientsReady && dto.staffAssigned && dto.equipmentReady && dto.transportVehicleReady;

    booking.preCheck = {
      bookingId,
      ...dto,
      completedAt: new Date(),
      passed,
    };

    booking.timeline.push({
      title: 'Kiểm tra sẵn sàng trước 24–48h (Pre-Event Check)',
      description: passed
        ? 'Đã đối soát toàn diện: Nguyên liệu thực tế đạt chuẩn, nhân viên và xe vận chuyển đã sẵn sàng.'
        : `Phát hiện điểm cần lưu ý: Bếp ${dto.kitchenNotes || 'cần theo dõi thêm'}, Hợp đồng ${dto.contractNotes || 'đang khắc phục'}.`,
      status: booking.status,
      timestamp: new Date(),
      actor: 'MERCHANT',
    });

    this.logAudit(booking.id, user.id, 'MERCHANT', 'PRE_EVENT_CHECK', booking.status, booking.status, `Passed: ${passed}`);
    booking.updatedAt = new Date();
    return booking;
  }

  async requestPostDepositChange(
    bookingId: string,
    user: AuthenticatedUser,
    dto: PostDepositChangeDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);
    const reasonText = dto.customerReason || dto.reason || 'Khách yêu cầu điều chỉnh';
    booking.merchantNotes = `Khách yêu cầu điều chỉnh sau cọc: ${reasonText}${dto.newTableCount ? ` (Đổi mâm: ${dto.newTableCount})` : ''}${dto.newEventDate ? ` (Đổi ngày: ${dto.newEventDate})` : ''}`;

    booking.timeline.push({
      title: 'Khách hàng gửi yêu cầu điều chỉnh sau đặt cọc',
      description: booking.merchantNotes,
      status: booking.status,
      timestamp: new Date(),
      actor: 'CUSTOMER',
    });

    this.logAudit(booking.id, user.id, 'CUSTOMER', 'REQUEST_POST_DEPOSIT_CHANGE', booking.status, booking.status, reasonText);

    this.sendNotification(
      booking.merchantId,
      'Yêu cầu điều chỉnh đơn sau cọc',
      `Khách yêu cầu sửa đơn #${booking.bookingCode}: ${reasonText}`,
      'NEW_BOOKING_REQUEST',
      booking.id,
    );

    booking.updatedAt = new Date();
    return booking;
  }

  // ----------------------------------------------------------------------------
  // SECTION 12: HỦY ĐƠN & HOÀN TIỀN (CANCELLATION & REFUND LIFECYCLE)
  // ----------------------------------------------------------------------------

  async cancelAndRefundBooking(
    bookingId: string,
    user: AuthenticatedUser,
    dto: CancelBookingAndRefundDto,
  ): Promise<FeastBooking> {
    const booking = await this.getBookingById(bookingId);
    const prevStatus = booking.status;

    booking.status = 'CANCELLED';
    booking.isHoldingCapacity = false;
    booking.cancelReason = dto.reason;
    booking.cancelledBy = user.roles.includes(Role.MERCHANT) ? 'MERCHANT' : 'CUSTOMER';

    if (dto.processRefund && booking.depositAmount > 0) {
      const refundPercent = dto.refundPercentage ?? 100;
      const refAmt = Math.round((booking.depositAmount * refundPercent) / 100);
      booking.refundStatus = 'REFUNDED';
      booking.refundAmount = refAmt;
      booking.refundTransactionRef = `REFUND-MOMO-${Date.now().toString().slice(-6)}`;
      booking.refundNotes = `Hoàn trả ${refundPercent}% tiền cọc (${refAmt.toLocaleString('vi-VN')}đ) do nhà hàng hủy đơn: ${dto.reason}`;
      booking.refundCompletedAt = new Date();
    } else {
      booking.refundStatus = 'NONE';
    }

    booking.timeline.push({
      title: 'Nhà hàng hủy đơn tiệc & Xử lý hoàn cọc',
      description: `Lý do hủy: ${booking.cancelReason}. ${booking.refundAmount ? `Đã hoàn trả ${booking.refundAmount.toLocaleString('vi-VN')}đ tiền cọc qua MoMo (Mã GD: ${booking.refundTransactionRef}).` : ''}`,
      status: 'CANCELLED',
      timestamp: new Date(),
      actor: 'MERCHANT',
    });

    this.logAudit(booking.id, user.id, 'MERCHANT', 'CANCEL_AND_REFUND', prevStatus, 'CANCELLED', booking.cancelReason);

    this.sendNotification(
      booking.userId,
      'THÔNG BÁO KHẨN: Đơn đặt tiệc bị hủy từ nhà hàng',
      `Đơn #${booking.bookingCode} đã bị hủy. Lý do: ${booking.cancelReason}. Số tiền hoàn: ${booking.refundAmount?.toLocaleString('vi-VN') || 0}đ.`,
      'BOOKING_CANCELLED',
      booking.id,
    );

    booking.updatedAt = new Date();
    return booking;
  }
}
