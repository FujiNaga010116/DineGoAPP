// ==============================================================================
// DineGo Backend — Promotion Service (Phase 5.2)
// Architecture: Clean Architecture / Modular Monolith
// Database: Microsoft SQL Server via Prisma ORM
// ==============================================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DiscountType,
  PromotionScope,
  Role,
} from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CartService } from '../cart/cart.service.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { QueryPromotionDto } from './dto/query-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import type {
  PromotionResponse,
  VoucherValidationResult,
} from './interfaces/promotion-response.interface.js';

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);
  private liveVouchers: Record<string, unknown>[] | null = null;
  private readonly liveClaims = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  /**
   * Helper: Chuyển đổi Prisma model thành PromotionResponse an toàn
   */
  private mapToResponse(promo: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    discountType: string;
    discountValue: Prisma.Decimal | number;
    minOrderValue: Prisma.Decimal | number;
    maxDiscountAmount: Prisma.Decimal | number | null;
    startDate: Date;
    endDate: Date;
    maxUsage: number | null;
    currentUsage: number;
    maxUsagePerUser: number | null;
    scope: string;
    merchantId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): PromotionResponse {
    return {
      id: promo.id,
      code: promo.code,
      name: promo.name,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      minOrderValue: Number(promo.minOrderValue),
      maxDiscountAmount: promo.maxDiscountAmount ? Number(promo.maxDiscountAmount) : null,
      startDate: promo.startDate.toISOString(),
      endDate: promo.endDate.toISOString(),
      maxUsage: promo.maxUsage,
      currentUsage: promo.currentUsage,
      maxUsagePerUser: promo.maxUsagePerUser,
      scope: promo.scope,
      merchantId: promo.merchantId,
      isActive: promo.isActive,
      createdAt: promo.createdAt.toISOString(),
      updatedAt: promo.updatedAt.toISOString(),
    };
  }

  /**
   * Kiểm tra mã voucher và tính toán mức giảm giá dựa trên giỏ hàng hiện tại
   * Chống gian lận: Tính toán 100% phía server, không tin giá từ client
   * Lưu ý: Không tự ý tăng lượt dùng ở bước kiểm tra này.
   */
  async validateVoucherForCart(
    userId: string,
    code: string,
  ): Promise<VoucherValidationResult> {
    const normalizedCode = code.trim().toUpperCase();

    // 1. Lấy giỏ hàng thực tế từ Cart Engine
    const cart = await this.cartService.getCart(userId);
    const subtotal = cart.summary.subtotal;

    if (!cart.id || cart.summary.totalItems === 0 || subtotal <= 0) {
      return {
        isValid: false,
        code: normalizedCode,
        subtotal: 0,
        discountAmount: 0,
        finalTotal: 0,
        rejectionReason: 'Giỏ hàng đang trống, vui lòng chọn món trước khi áp dụng voucher',
      };
    }

    // 2. Tìm voucher trong database
    const promotion = await this.prisma.promotion.findUnique({
      where: { code: normalizedCode },
    });

    if (!promotion) {
      return {
        isValid: false,
        code: normalizedCode,
        subtotal,
        discountAmount: 0,
        finalTotal: subtotal,
        rejectionReason: 'Mã voucher không tồn tại trên hệ thống',
      };
    }

    // 3. Kiểm tra trạng thái hoạt động
    if (!promotion.isActive) {
      return {
        isValid: false,
        code: normalizedCode,
        subtotal,
        discountAmount: 0,
        finalTotal: subtotal,
        rejectionReason: 'Mã voucher hiện đang bị tạm khóa hoặc ngừng áp dụng',
      };
    }

    // 4. Kiểm tra thời hạn hiệu lực
    const now = new Date();
    if (now < promotion.startDate) {
      return {
        isValid: false,
        code: normalizedCode,
        subtotal,
        discountAmount: 0,
        finalTotal: subtotal,
        rejectionReason: 'Chương trình khuyến mãi chưa bắt đầu',
      };
    }

    if (now > promotion.endDate) {
      return {
        isValid: false,
        code: normalizedCode,
        subtotal,
        discountAmount: 0,
        finalTotal: subtotal,
        rejectionReason: 'Mã voucher đã hết hạn sử dụng',
      };
    }

    // 5. Kiểm tra giới hạn tổng lượt dùng
    if (promotion.maxUsage != null && promotion.currentUsage >= promotion.maxUsage) {
      return {
        isValid: false,
        code: normalizedCode,
        subtotal,
        discountAmount: 0,
        finalTotal: subtotal,
        rejectionReason: 'Mã voucher đã hết lượt sử dụng trên toàn hệ thống',
      };
    }

    // 6. Kiểm tra giới hạn lượt dùng của từng người dùng
    if (promotion.maxUsagePerUser != null) {
      const userUsageCount = await this.prisma.promotionUsage.count({
        where: {
          promotionId: promotion.id,
          userId,
        },
      });

      if (userUsageCount >= promotion.maxUsagePerUser) {
        return {
          isValid: false,
          code: normalizedCode,
          subtotal,
          discountAmount: 0,
          finalTotal: subtotal,
          rejectionReason: `Bạn đã sử dụng hết số lần cho phép của mã voucher này (${promotion.maxUsagePerUser} lần)`,
        };
      }
    }

    // 7. Kiểm tra phạm vi áp dụng (Scope & Merchant)
    if (promotion.scope === PromotionScope.MERCHANT) {
      if (!cart.merchant || cart.merchant.id !== promotion.merchantId) {
        return {
          isValid: false,
          code: normalizedCode,
          subtotal,
          discountAmount: 0,
          finalTotal: subtotal,
          rejectionReason: 'Mã voucher này chỉ áp dụng cho nhà hàng chỉ định',
        };
      }
    }

    // 8. Kiểm tra giá trị đơn hàng tối thiểu
    const minOrderValue = Number(promotion.minOrderValue);
    if (subtotal < minOrderValue) {
      return {
        isValid: false,
        code: normalizedCode,
        subtotal,
        discountAmount: 0,
        finalTotal: subtotal,
        rejectionReason: `Đơn hàng chưa đạt giá trị tối thiểu ${minOrderValue.toLocaleString('vi-VN')} VND để áp dụng mã này`,
      };
    }

    // 9. Tính toán số tiền giảm (Discount Amount)
    let rawDiscount = 0;
    const discountVal = Number(promotion.discountValue);

    if (promotion.discountType === DiscountType.PERCENTAGE) {
      rawDiscount = (subtotal * discountVal) / 100;
      if (promotion.maxDiscountAmount != null) {
        const maxDiscount = Number(promotion.maxDiscountAmount);
        rawDiscount = Math.min(rawDiscount, maxDiscount);
      }
    } else {
      // FIXED_AMOUNT
      rawDiscount = discountVal;
    }

    // Chống giảm âm hoặc vượt quá subtotal của giỏ hàng
    const safeDiscount = Math.max(0, Math.min(rawDiscount, subtotal));
    const discountAmount = Math.round(safeDiscount * 100) / 100;
    const finalTotal = Math.round(Math.max(0, subtotal - discountAmount) * 100) / 100;

    return {
      isValid: true,
      code: promotion.code,
      promotionId: promotion.id,
      name: promotion.name,
      description: promotion.description,
      discountType: promotion.discountType,
      discountValue: discountVal,
      subtotal,
      discountAmount,
      finalTotal,
    };
  }

  /**
   * Tạo mới chương trình khuyến mãi (ADMIN hoặc MERCHANT)
   */
  async createPromotion(
    user: AuthenticatedUser,
    dto: CreatePromotionDto,
  ): Promise<PromotionResponse> {
    const isAdmin = user.roles.includes(Role.ADMIN);
    const isMerchant = user.roles.includes(Role.MERCHANT);

    if (!isAdmin && !isMerchant) {
      throw new ForbiddenException(
        'Chỉ Quản trị viên (ADMIN) hoặc Chủ quán (MERCHANT) mới có quyền tạo khuyến mãi',
      );
    }

    const normalizedCode = dto.code.trim().toUpperCase();

    // 1. Kiểm tra mã duy nhất
    const existing = await this.prisma.promotion.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException(`Mã voucher "${normalizedCode}" đã tồn tại trên hệ thống`);
    }

    // 2. Kiểm tra khoảng thời gian
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    // 3. Kiểm tra giá trị giảm theo loại
    if (dto.discountType === DiscountType.PERCENTAGE) {
      if (dto.discountValue <= 0 || dto.discountValue > 100) {
        throw new BadRequestException('Phần trăm giảm giá phải trong khoảng từ 0.01% đến 100%');
      }
    }

    // 4. Kiểm tra quyền sở hữu Merchant
    let targetMerchantId: string | null = null;
    let targetScope = dto.scope ?? PromotionScope.GLOBAL;

    if (isMerchant && !isAdmin) {
      // Merchant chỉ được tạo voucher cho quán của mình
      if (!dto.merchantId) {
        throw new BadRequestException('Chủ quán phải chỉ định merchantId cho voucher');
      }

      const ownedMerchant = await this.prisma.merchant.findUnique({
        where: { id: dto.merchantId },
      });

      if (!ownedMerchant || ownedMerchant.ownerId !== user.id) {
        throw new ForbiddenException('Bạn chỉ có quyền tạo khuyến mãi cho nhà hàng do mình làm chủ');
      }

      targetMerchantId = dto.merchantId;
      targetScope = PromotionScope.MERCHANT;
    } else if (isAdmin) {
      if (targetScope === PromotionScope.MERCHANT) {
        if (!dto.merchantId) {
          throw new BadRequestException('Voucher phạm vi MERCHANT phải có merchantId');
        }
        const merchantExists = await this.prisma.merchant.findUnique({
          where: { id: dto.merchantId },
        });
        if (!merchantExists) {
          throw new NotFoundException('Nhà hàng được chỉ định không tồn tại');
        }
        targetMerchantId = dto.merchantId;
      }
    }

    const created = await this.prisma.promotion.create({
      data: {
        code: normalizedCode,
        name: dto.name,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue ?? 0,
        maxDiscountAmount: dto.maxDiscountAmount,
        startDate: start,
        endDate: end,
        maxUsage: dto.maxUsage,
        maxUsagePerUser: dto.maxUsagePerUser ?? 1,
        scope: targetScope,
        merchantId: targetMerchantId,
        isActive: true,
      },
    });

    return this.mapToResponse(created);
  }

  /**
   * Lấy danh sách khuyến mãi có phân trang và bộ lọc
   */
  async getPromotions(query: QueryPromotionDto): Promise<{
    items: PromotionResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PromotionWhereInput = {};

    if (query.merchantId) {
      where.merchantId = query.merchantId;
    }

    if (query.scope) {
      where.scope = query.scope;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return {
      items: items.map((p) => this.mapToResponse(p)),
      total,
      page,
      limit,
    };
  }

  /**
   * Lấy chi tiết một promotion
   */
  async getPromotionById(id: string): Promise<PromotionResponse> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('Không tìm thấy chương trình khuyến mãi');
    }

    return this.mapToResponse(promotion);
  }

  /**
   * Cập nhật thông tin promotion
   */
  async updatePromotion(
    user: AuthenticatedUser,
    id: string,
    dto: UpdatePromotionDto,
  ): Promise<PromotionResponse> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: { merchant: true },
    });

    if (!promotion) {
      throw new NotFoundException('Không tìm thấy chương trình khuyến mãi');
    }

    const isAdmin = user.roles.includes(Role.ADMIN);
    const isMerchant = user.roles.includes(Role.MERCHANT);

    if (!isAdmin) {
      if (!isMerchant || !promotion.merchant || promotion.merchant.ownerId !== user.id) {
        throw new ForbiddenException('Bạn không có quyền chỉnh sửa chương trình khuyến mãi này');
      }
    }

    const data: Prisma.PromotionUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.minOrderValue !== undefined) data.minOrderValue = dto.minOrderValue;
    if (dto.maxDiscountAmount !== undefined) data.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.maxUsage !== undefined) data.maxUsage = dto.maxUsage;
    if (dto.maxUsagePerUser !== undefined) data.maxUsagePerUser = dto.maxUsagePerUser;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    const updated = await this.prisma.promotion.update({
      where: { id },
      data,
    });

    return this.mapToResponse(updated);
  }

  /**
   * Bật hoặc tắt trạng thái kích hoạt của voucher
   */
  async toggleActive(
    user: AuthenticatedUser,
    id: string,
    isActive: boolean,
  ): Promise<PromotionResponse> {
    return this.updatePromotion(user, id, { isActive });
  }

  getLiveVouchers(): { vouchers: Record<string, unknown>[] | null } {
    return { vouchers: this.liveVouchers };
  }

  syncLiveVouchers(vouchers: Record<string, unknown>[]): {
    vouchers: Record<string, unknown>[];
  } {
    if (Array.isArray(vouchers)) {
      this.liveVouchers = vouchers;
    }
    return { vouchers: this.liveVouchers || [] };
  }

  claimLiveVoucher(payload: {
    userId: string;
    code: string;
  }): {
    claimed: boolean;
    vouchers: Record<string, unknown>[] | null;
    claimedCodes: string[];
  } {
    const userId = String(payload?.userId || '').trim();
    const code = String(payload?.code || '').trim().toUpperCase();
    if (!userId || !code) {
      throw new BadRequestException('Thiếu userId hoặc mã voucher');
    }
    const userSet = this.liveClaims.get(userId) || new Set<string>();
    const alreadyClaimed = userSet.has(code);
    if (!alreadyClaimed) {
      userSet.add(code);
      this.liveClaims.set(userId, userSet);
      if (this.liveVouchers) {
        this.liveVouchers = this.liveVouchers.map((v) =>
          String(v.code || '').toUpperCase() === code
            ? { ...v, claimedCount: Number(v.claimedCount || 0) + 1 }
            : v,
        );
      }
    }
    return {
      claimed: !alreadyClaimed,
      vouchers: this.liveVouchers,
      claimedCodes: Array.from(userSet),
    };
  }

  getLiveUserClaims(userId: string): { claimedCodes: string[] } {
    const set = this.liveClaims.get(String(userId || '').trim());
    return { claimedCodes: set ? Array.from(set) : [] };
  }
}
