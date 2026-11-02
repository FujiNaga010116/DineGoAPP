// ==============================================================================
// DineGo Backend — Promotion Service Unit Tests (Phase 5.2)
// ==============================================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscountType, PromotionScope, Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CartService } from '../cart/cart.service.js';
import { PromotionService } from './promotion.service.js';

describe('PromotionService', () => {
  let service: PromotionService;

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-user-id',
    email: 'admin@dinego.vn',
    fullName: 'Admin User',
    roles: [Role.ADMIN],
    isActive: true,
  };

  const mockMerchantUser: AuthenticatedUser = {
    id: 'merchant-user-id',
    email: 'owner@dinego.vn',
    fullName: 'Merchant Owner',
    roles: [Role.MERCHANT],
    isActive: true,
  };

  const mockCustomerUser: AuthenticatedUser = {
    id: 'customer-user-id',
    email: 'customer@dinego.vn',
    fullName: 'Customer User',
    roles: [Role.CUSTOMER],
    isActive: true,
  };

  const mockCart = {
    id: 'cart-1',
    merchant: {
      id: 'merchant-1',
      name: 'Quán Phở Thảo',
      slug: 'quan-pho-thao',
      address: '123 Cầu Giấy',
      phoneNumber: '0912345678',
      logoUrl: null,
      isOpen: true,
      isActive: true,
    },
    items: [],
    summary: {
      totalItems: 2,
      subtotal: 200000, // 200,000 VND
    },
  };

  const mockPrisma = {
    promotion: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    promotionUsage: {
      count: vi.fn(),
    },
    merchant: {
      findUnique: vi.fn(),
    },
  };

  const mockCartService = {
    getCart: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CartService, useValue: mockCartService },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateVoucherForCart', () => {
    it('should reject if cart is empty', async () => {
      mockCartService.getCart.mockResolvedValue({
        id: 'cart-1',
        summary: { totalItems: 0, subtotal: 0 },
      });

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'DINEGO50',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('Giỏ hàng đang trống');
    });

    it('should reject if voucher does not exist', async () => {
      mockCartService.getCart.mockResolvedValue(mockCart);
      mockPrisma.promotion.findUnique.mockResolvedValue(null);

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'INVALID_CODE',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('không tồn tại');
    });

    it('should reject if voucher is inactive', async () => {
      mockCartService.getCart.mockResolvedValue(mockCart);
      mockPrisma.promotion.findUnique.mockResolvedValue({
        code: 'INACTIVE_CODE',
        isActive: false,
      });

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'INACTIVE_CODE',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('tạm khóa hoặc ngừng áp dụng');
    });

    it('should reject if voucher is not started or has expired', async () => {
      mockCartService.getCart.mockResolvedValue(mockCart);

      // Not started yet
      mockPrisma.promotion.findUnique.mockResolvedValue({
        code: 'NOT_STARTED',
        isActive: true,
        startDate: new Date(Date.now() + 86400000), // tomorrow
        endDate: new Date(Date.now() + 172800000),
      });

      let res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'NOT_STARTED',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('chưa bắt đầu');

      // Expired
      mockPrisma.promotion.findUnique.mockResolvedValue({
        code: 'EXPIRED',
        isActive: true,
        startDate: new Date(Date.now() - 172800000),
        endDate: new Date(Date.now() - 86400000), // yesterday
      });

      res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'EXPIRED',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('hết hạn sử dụng');
    });

    it('should reject if voucher has reached overall maxUsage limit', async () => {
      mockCartService.getCart.mockResolvedValue(mockCart);
      mockPrisma.promotion.findUnique.mockResolvedValue({
        code: 'MAXED_OUT',
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        maxUsage: 100,
        currentUsage: 100, // max reached
      });

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'MAXED_OUT',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('hết lượt sử dụng');
    });

    it('should reject if user exceeded maxUsagePerUser', async () => {
      mockCartService.getCart.mockResolvedValue(mockCart);
      mockPrisma.promotion.findUnique.mockResolvedValue({
        id: 'promo-1',
        code: 'USER_LIMIT',
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        maxUsagePerUser: 1,
      });
      mockPrisma.promotionUsage.count.mockResolvedValue(1); // already used 1 time

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'USER_LIMIT',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('hết số lần cho phép');
    });

    it('should reject if scope is MERCHANT and cart has different merchant', async () => {
      mockCartService.getCart.mockResolvedValue(mockCart); // merchant id is 'merchant-1'
      mockPrisma.promotion.findUnique.mockResolvedValue({
        id: 'promo-1',
        code: 'OTHER_MERCHANT',
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        scope: PromotionScope.MERCHANT,
        merchantId: 'different-merchant-99',
      });

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'OTHER_MERCHANT',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('chỉ áp dụng cho nhà hàng chỉ định');
    });

    it('should reject if subtotal is below minOrderValue', async () => {
      mockCartService.getCart.mockResolvedValue(mockCart); // subtotal is 200,000
      mockPrisma.promotion.findUnique.mockResolvedValue({
        id: 'promo-1',
        code: 'HIGH_MIN',
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        minOrderValue: 300000, // requires 300k
      });

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'HIGH_MIN',
      );
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('chưa đạt giá trị tối thiểu');
    });

    it('should calculate PERCENTAGE discount correctly with maxDiscountAmount cap', async () => {
      mockCartService.getCart.mockResolvedValue(mockCart); // subtotal is 200,000
      mockPrisma.promotion.findUnique.mockResolvedValue({
        id: 'promo-1',
        code: 'SALE20',
        name: 'Giảm 20% tối đa 30K',
        description: null,
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20, // 20% of 200,000 is 40,000
        maxDiscountAmount: 30000, // cap at 30,000
        minOrderValue: 100000,
        scope: PromotionScope.GLOBAL,
      });
      mockPrisma.promotionUsage.count.mockResolvedValue(0);

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'SALE20',
      );
      expect(res.isValid).toBe(true);
      expect(res.subtotal).toBe(200000);
      expect(res.discountAmount).toBe(30000); // capped at 30,000
      expect(res.finalTotal).toBe(170000); // 200k - 30k = 170k
    });

    it('should calculate FIXED_AMOUNT discount and never exceed subtotal', async () => {
      mockCartService.getCart.mockResolvedValue({
        ...mockCart,
        summary: { totalItems: 1, subtotal: 40000 }, // subtotal is 40,000
      });
      mockPrisma.promotion.findUnique.mockResolvedValue({
        id: 'promo-1',
        code: 'BIG50',
        name: 'Giảm 50K',
        description: null,
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50000, // 50,000 discount > 40,000 subtotal
        minOrderValue: 0,
        scope: PromotionScope.GLOBAL,
      });
      mockPrisma.promotionUsage.count.mockResolvedValue(0);

      const res = await service.validateVoucherForCart(
        mockCustomerUser.id,
        'BIG50',
      );
      expect(res.isValid).toBe(true);
      expect(res.subtotal).toBe(40000);
      expect(res.discountAmount).toBe(40000); // capped at subtotal, cannot exceed!
      expect(res.finalTotal).toBe(0); // non-negative!
    });
  });

  describe('createPromotion', () => {
    it('should throw ForbiddenException if user is CUSTOMER', async () => {
      await expect(
        service.createPromotion(mockCustomerUser, {
          code: 'PROMO1',
          name: 'Promo 1',
          discountType: DiscountType.FIXED_AMOUNT,
          discountValue: 10000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if voucher code already exists', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createPromotion(mockAdminUser, {
          code: 'DUPLICATE',
          name: 'Duplicate Promo',
          discountType: DiscountType.FIXED_AMOUNT,
          discountValue: 10000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if endDate is before or equal startDate', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);

      await expect(
        service.createPromotion(mockAdminUser, {
          code: 'BAD_DATE',
          name: 'Bad Date',
          discountType: DiscountType.FIXED_AMOUNT,
          discountValue: 10000,
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() - 86400000), // earlier!
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow ADMIN to create GLOBAL promotion successfully', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);
      const start = new Date(Date.now() - 10000);
      const end = new Date(Date.now() + 86400000);

      mockPrisma.promotion.create.mockResolvedValue({
        id: 'new-promo-id',
        code: 'ADMIN_PROMO',
        name: 'Admin Promo',
        description: null,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        minOrderValue: 100000,
        maxDiscountAmount: 50000,
        startDate: start,
        endDate: end,
        maxUsage: 100,
        currentUsage: 0,
        maxUsagePerUser: 1,
        scope: PromotionScope.GLOBAL,
        merchantId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createPromotion(mockAdminUser, {
        code: 'ADMIN_PROMO',
        name: 'Admin Promo',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        minOrderValue: 100000,
        maxDiscountAmount: 50000,
        startDate: start,
        endDate: end,
      });

      expect(res.code).toBe('ADMIN_PROMO');
      expect(res.discountValue).toBe(15);
      expect(mockPrisma.promotion.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if MERCHANT tries to create promotion for a merchant they do not own', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'unowned-merchant',
        ownerId: 'someone-else-id', // Not mockMerchantUser.id!
      });

      await expect(
        service.createPromotion(mockMerchantUser, {
          code: 'UNOWNED_MERCHANT',
          name: 'Voucher',
          discountType: DiscountType.FIXED_AMOUNT,
          discountValue: 10000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          merchantId: 'unowned-merchant',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updatePromotion and toggleActive', () => {
    it('should update promotion successfully for ADMIN', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue({
        id: 'promo-1',
        merchant: null,
      });
      mockPrisma.promotion.update.mockResolvedValue({
        id: 'promo-1',
        code: 'PROMO1',
        name: 'Updated Name',
        description: null,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        minOrderValue: 0,
        maxDiscountAmount: null,
        startDate: new Date(),
        endDate: new Date(),
        maxUsage: null,
        currentUsage: 0,
        maxUsagePerUser: 1,
        scope: PromotionScope.GLOBAL,
        merchantId: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.toggleActive(mockAdminUser, 'promo-1', false);
      expect(res.isActive).toBe(false);
      expect(mockPrisma.promotion.update).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if promotion does not exist on update', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePromotion(mockAdminUser, 'non-existent', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
