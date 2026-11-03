// ==============================================================================
// DineGo Backend — Order Service Unit Tests (Phase 5.3)
// ==============================================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CancelledBy,
  DiscountType,
  OrderStatus,
  PromotionScope,
  Role,
} from '../../common/enums/index.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { OrderService } from './order.service.js';

describe('OrderService', () => {
  let service: OrderService;
  let mockPrisma: any;

  const mockCustomerUser: AuthenticatedUser = {
    id: 'user-customer-1',
    email: 'customer@dinego.vn',
    fullName: 'Customer One',
    roles: [Role.CUSTOMER],
    isActive: true,
  };

  const mockMerchantUser: AuthenticatedUser = {
    id: 'user-merchant-1',
    email: 'merchant@dinego.vn',
    fullName: 'Merchant One',
    roles: [Role.MERCHANT],
    isActive: true,
  };

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@dinego.vn',
    fullName: 'Admin One',
    roles: [Role.ADMIN],
    isActive: true,
  };

  const mockMerchant = {
    id: 'merchant-1',
    ownerId: 'user-merchant-1',
    name: 'Phở Hà Nội',
    slug: 'pho-ha-noi',
    address: '123 Phố Huế',
    phoneNumber: '0901234567',
    logoUrl: 'https://cdn.dinego.vn/logo.png',
    isActive: true,
    isOpen: true,
  };

  const mockMenuItem = {
    id: 'menu-item-1',
    merchantId: 'merchant-1',
    name: 'Phở Bò Tái Lăn',
    basePrice: 65000,
    imageUrl: 'https://cdn.dinego.vn/pho.png',
    isActive: true,
    isAvailable: true,
  };

  const mockTopping = {
    id: 'topping-1',
    merchantId: 'merchant-1',
    name: 'Quẩy giòn',
    price: 10000,
    isActive: true,
    isAvailable: true,
  };

  const mockCart = {
    id: 'cart-1',
    userId: 'user-customer-1',
    merchantId: 'merchant-1',
    merchant: mockMerchant,
    items: [
      {
        id: 'cart-item-1',
        cartId: 'cart-1',
        menuItemId: 'menu-item-1',
        quantity: 2,
        note: 'Ít hành',
        menuItem: mockMenuItem,
        toppings: [
          {
            id: 'cit-1',
            cartItemId: 'cart-item-1',
            toppingId: 'topping-1',
            topping: mockTopping,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn(),
      },
      cart: {
        findUnique: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      cartItem: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      cartItemTopping: {
        create: vi.fn(),
      },
      merchant: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      menuItem: {
        findUnique: vi.fn(),
      },
      topping: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      promotion: {
        findUnique: vi.fn(),
      },
      promotionUsage: {
        count: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      $executeRaw: vi.fn(),
    };

    service = new OrderService(mockPrisma as unknown as PrismaService);
  });

  describe('createOrder', () => {
    const validDto = {
      deliveryAddress: '123 Lê Lợi, Quận 1, TP. HCM',
      recipientName: 'Nguyễn Văn A',
      recipientPhone: '0901234567',
      customerNote: 'Giao nhanh giúp em',
    };

    it('should create order successfully from valid cart without voucher', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findUnique.mockResolvedValue(mockTopping);

      const createdOrderData = {
        id: 'order-1',
        orderNumber: 'DG20261028-ABC123',
        userId: 'user-customer-1',
        merchantId: 'merchant-1',
        promotionId: null,
        status: OrderStatus.PENDING,
        subtotal: 150000, // (65k + 10k) * 2 = 150k
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 150000,
        deliveryAddress: validDto.deliveryAddress,
        recipientName: validDto.recipientName,
        recipientPhone: validDto.recipientPhone,
        customerNote: validDto.customerNote,
        cancelReason: null,
        cancelledBy: null,
        cancelledAt: null,
        idempotencyKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        merchant: mockMerchant,
        items: [
          {
            id: 'oi-1',
            menuItemId: 'menu-item-1',
            itemName: 'Phở Bò Tái Lăn',
            itemImage: mockMenuItem.imageUrl,
            basePrice: 65000,
            quantity: 2,
            subtotal: 150000,
            note: 'Ít hành',
            toppings: [
              {
                id: 'oit-1',
                toppingId: 'topping-1',
                toppingName: 'Quẩy giòn',
                toppingPrice: 10000,
              },
            ],
          },
        ],
      };

      mockPrisma.order.create.mockResolvedValue(createdOrderData);

      const result = await service.createOrder(mockCustomerUser, validDto);

      expect(result).toBeDefined();
      expect(result.subtotal).toBe(150000);
      expect(result.finalTotal).toBe(150000);
      expect(result.discountAmount).toBe(0);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
      expect(mockPrisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { merchantId: null },
      });
    });

    it('should reject order creation if cart is empty', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-empty',
        userId: 'user-customer-1',
        merchantId: null,
        items: [],
      });

      await expect(
        service.createOrder(mockCustomerUser, validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject order creation if merchant is inactive', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.merchant.findUnique.mockResolvedValue({
        ...mockMerchant,
        isActive: false,
      });

      await expect(
        service.createOrder(mockCustomerUser, validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject order creation if menu item is unavailable', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        ...mockMenuItem,
        isAvailable: false,
      });

      await expect(
        service.createOrder(mockCustomerUser, validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject order creation if topping is unavailable', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findUnique.mockResolvedValue({
        ...mockTopping,
        isAvailable: false,
      });

      await expect(
        service.createOrder(mockCustomerUser, validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing order if idempotency key was previously created by same user', async () => {
      const existing = {
        id: 'order-existing',
        orderNumber: 'DG20261028-EXIST1',
        userId: 'user-customer-1',
        merchantId: 'merchant-1',
        status: OrderStatus.PENDING,
        subtotal: 150000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 150000,
        deliveryAddress: validDto.deliveryAddress,
        recipientName: validDto.recipientName,
        recipientPhone: validDto.recipientPhone,
        idempotencyKey: 'idem-key-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        merchant: mockMerchant,
        items: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue(existing);

      const result = await service.createOrder(mockCustomerUser, {
        ...validDto,
        idempotencyKey: 'idem-key-123',
      });

      expect(result.id).toBe('order-existing');
      expect(mockPrisma.cart.findUnique).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if idempotency key belongs to another user', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-other-user',
        userId: 'other-user-999',
        idempotencyKey: 'idem-key-123',
      });

      await expect(
        service.createOrder(mockCustomerUser, {
          ...validDto,
          idempotencyKey: 'idem-key-123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should apply FIXED_AMOUNT voucher and record usage atomically', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findUnique.mockResolvedValue(mockTopping);

      const mockPromotion = {
        id: 'promo-30k',
        code: 'DINEGO30K',
        name: 'Giảm 30K',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 30000,
        minOrderValue: 100000,
        maxDiscountAmount: null,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        maxUsage: 100,
        currentUsage: 10,
        maxUsagePerUser: 2,
        scope: PromotionScope.GLOBAL,
        isActive: true,
      };

      mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
      mockPrisma.promotionUsage.count.mockResolvedValue(0);
      mockPrisma.$executeRaw.mockResolvedValue(1); // atomic update succeeds

      const createdOrderData = {
        id: 'order-promo-1',
        orderNumber: 'DG20261028-PROMO1',
        userId: 'user-customer-1',
        merchantId: 'merchant-1',
        promotionId: 'promo-30k',
        status: OrderStatus.PENDING,
        subtotal: 150000,
        discountAmount: 30000,
        deliveryFee: 0,
        finalTotal: 120000,
        deliveryAddress: validDto.deliveryAddress,
        recipientName: validDto.recipientName,
        recipientPhone: validDto.recipientPhone,
        customerNote: null,
        cancelReason: null,
        cancelledBy: null,
        cancelledAt: null,
        idempotencyKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        merchant: mockMerchant,
        promotion: mockPromotion,
        items: [],
      };

      mockPrisma.order.create.mockResolvedValue(createdOrderData);

      const result = await service.createOrder(mockCustomerUser, {
        ...validDto,
        voucherCode: 'DINEGO30K',
      });

      expect(result.subtotal).toBe(150000);
      expect(result.discountAmount).toBe(30000);
      expect(result.finalTotal).toBe(120000);
      expect(mockPrisma.promotionUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          promotionId: 'promo-30k',
          userId: 'user-customer-1',
          discountAmount: 30000,
        }),
      });
    });

    it('should reject order if voucher reaches total usage limit during concurrent update', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findUnique.mockResolvedValue(mockTopping);

      const mockPromotion = {
        id: 'promo-sold-out',
        code: 'SOLDOUT',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 10000,
        minOrderValue: 50000,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        maxUsage: 10,
        currentUsage: 9,
        maxUsagePerUser: 1,
        scope: PromotionScope.GLOBAL,
        isActive: true,
      };

      mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
      mockPrisma.promotionUsage.count.mockResolvedValue(0);
      mockPrisma.$executeRaw.mockResolvedValue(0); // 0 rows updated because limit was hit concurrently

      await expect(
        service.createOrder(mockCustomerUser, {
          ...validDto,
          voucherCode: 'SOLDOUT',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrders', () => {
    it('should list only own orders for CUSTOMER role', async () => {
      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'DG20261028-111111',
          userId: 'user-customer-1',
          merchantId: 'merchant-1',
          status: OrderStatus.PENDING,
          subtotal: 100000,
          discountAmount: 0,
          deliveryFee: 0,
          finalTotal: 100000,
          deliveryAddress: '123 Đường A',
          recipientName: 'Anh A',
          recipientPhone: '0901234567',
          createdAt: new Date(),
          updatedAt: new Date(),
          merchant: mockMerchant,
          items: [],
        },
      ]);

      const result = await service.getOrders(mockCustomerUser, { page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-customer-1' },
        }),
      );
    });

    it('should allow ADMIN to list orders across all users and merchants', async () => {
      mockPrisma.order.count.mockResolvedValue(5);
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getOrders(mockAdminUser, { page: 1, limit: 10 });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('getOrderById', () => {
    it('should allow customer to view their own order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'DG20261028-111111',
        userId: 'user-customer-1',
        merchantId: 'merchant-1',
        status: OrderStatus.PENDING,
        subtotal: 100000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 100000,
        deliveryAddress: '123 Đường A',
        recipientName: 'Anh A',
        recipientPhone: '0901234567',
        createdAt: new Date(),
        updatedAt: new Date(),
        merchant: mockMerchant,
        items: [],
      });

      const res = await service.getOrderById(mockCustomerUser, 'ord-1');
      expect(res.id).toBe('ord-1');
    });

    it('should throw ForbiddenException if another customer tries to view order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        userId: 'other-user',
        merchantId: 'merchant-1',
      });
      mockPrisma.merchant.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrderById(mockCustomerUser, 'ord-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrderById(mockCustomerUser, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelOrder', () => {
    it('should allow customer to cancel order in PENDING status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-pending',
        orderNumber: 'DG20261028-PENDING',
        userId: 'user-customer-1',
        merchantId: 'merchant-1',
        status: OrderStatus.PENDING,
        merchant: mockMerchant,
      });

      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      const cancelledOrder = {
        id: 'ord-pending',
        orderNumber: 'DG20261028-PENDING',
        userId: 'user-customer-1',
        merchantId: 'merchant-1',
        status: OrderStatus.CANCELLED,
        cancelReason: 'Bận việc đột xuất',
        cancelledBy: CancelledBy.USER,
        cancelledAt: new Date(),
        subtotal: 100000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 100000,
        deliveryAddress: '123 Đường A',
        recipientName: 'Anh A',
        recipientPhone: '0901234567',
        createdAt: new Date(),
        updatedAt: new Date(),
        merchant: mockMerchant,
        items: [],
      };
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(cancelledOrder);

      const res = await service.cancelOrder(mockCustomerUser, 'ord-pending', {
        cancelReason: 'Bận việc đột xuất',
      });

      expect(res.status).toBe(OrderStatus.CANCELLED);
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'ord-pending',
            status: { in: [OrderStatus.PENDING] },
          }),
          data: expect.objectContaining({
            status: OrderStatus.CANCELLED,
            cancelledBy: CancelledBy.USER,
          }),
        }),
      );
    });

    it('should reject customer cancellation if order was concurrently confirmed (updateMany count === 0)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-race',
        userId: 'user-customer-1',
        status: OrderStatus.PENDING,
        merchant: mockMerchant,
      });

      // Transaction updateMany thất bại do luồng khác vừa đổi trạng thái (count = 0)
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      // Khi đọc lại trong tx, trạng thái đã thành CONFIRMED
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'ord-race',
        userId: 'user-customer-1',
        status: OrderStatus.PENDING,
        merchant: mockMerchant,
      }).mockResolvedValueOnce({
        id: 'ord-race',
        userId: 'user-customer-1',
        status: OrderStatus.CONFIRMED,
        merchant: mockMerchant,
      });

      await expect(
        service.cancelOrder(mockCustomerUser, 'ord-race', {
          cancelReason: 'Hủy đơn trễ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject customer cancellation if order is already CONFIRMED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-confirmed',
        userId: 'user-customer-1',
        status: OrderStatus.CONFIRMED,
        merchant: mockMerchant,
      });

      await expect(
        service.cancelOrder(mockCustomerUser, 'ord-confirmed', {
          cancelReason: 'Hủy đơn',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateOrderStatus', () => {
    it('should transition status from PENDING to CONFIRMED for merchant', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'DG20261028-111111',
        status: OrderStatus.PENDING,
        merchantId: 'merchant-1',
        merchant: mockMerchant,
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'DG20261028-111111',
        status: OrderStatus.CONFIRMED,
        subtotal: 100000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 100000,
        deliveryAddress: '123',
        recipientName: 'A',
        recipientPhone: '0901234567',
        createdAt: new Date(),
        updatedAt: new Date(),
        merchant: mockMerchant,
        items: [],
      });

      const res = await service.updateOrderStatus(mockMerchantUser, 'ord-1', {
        status: OrderStatus.CONFIRMED,
      });

      expect(res.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should reject invalid transition (e.g. PENDING directly to COMPLETED)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.PENDING,
        merchantId: 'merchant-1',
        merchant: mockMerchant,
      });

      await expect(
        service.updateOrderStatus(mockMerchantUser, 'ord-1', {
          status: OrderStatus.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('estimateShippingFee (U017)', () => {
    it('should calculate base fee (15000 VND) for distance <= 2km', async () => {
      const res = await service.estimateShippingFee({ distanceKm: 1.8 });
      expect(res.distanceKm).toBe(1.8);
      expect(res.shippingFee).toBe(15000);
      expect(res.estimatedDurationMinutes).toBeGreaterThanOrEqual(15);
    });

    it('should calculate tiered fee according to BR-13 for distance between 2km and 5km', async () => {
      // 3.5km => 15000 + ceil(3.5-2)*5000 = 15000 + 2*5000 = 25000
      const res = await service.estimateShippingFee({ distanceKm: 3.5 });
      expect(res.shippingFee).toBe(25000);
    });

    it('should calculate tiered fee according to BR-13 for distance > 5km', async () => {
      // 7.2km => 30000 + ceil(7.2-5)*7000 = 30000 + 3*7000 = 51000
      const res = await service.estimateShippingFee({ distanceKm: 7.2 });
      expect(res.shippingFee).toBe(51000);
    });

    it('should compute distance using Haversine if coordinates and merchantId provided', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'merchant-1',
        latitude: 10.776889,
        longitude: 106.700806,
      });

      const res = await service.estimateShippingFee({
        merchantId: 'merchant-1',
        customerLat: 10.782000,
        customerLng: 106.705000,
      });

      expect(res.distanceKm).toBeGreaterThan(0);
      expect(res.shippingFee).toBeGreaterThanOrEqual(15000);
    });
  });

  describe('reorder (U022)', () => {
    it('should re-populate user cart from past order items', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-old-1',
        userId: 'user-customer-1',
        merchantId: 'merchant-1',
        merchant: { id: 'merchant-1', isActive: true },
        items: [
          {
            id: 'item-1',
            menuItemId: 'menu-item-1',
            quantity: 2,
            note: 'Không cay',
            toppings: [{ toppingName: 'Quẩy giòn' }],
          },
        ],
      });

      mockPrisma.cart.upsert.mockResolvedValue({ id: 'cart-1', userId: 'user-customer-1' });
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.menuItem.findUnique.mockResolvedValue({ id: 'menu-item-1', isAvailable: true });
      mockPrisma.cartItem.create.mockResolvedValue({ id: 'new-cit-1' });
      mockPrisma.topping.findFirst.mockResolvedValue({ id: 'topping-1' });
      mockPrisma.cartItemTopping.create.mockResolvedValue({});

      const res = await service.reorder(mockCustomerUser, 'ord-old-1');

      expect(res.success).toBe(true);
      expect(res.itemCount).toBe(1);
      expect(mockPrisma.cartItem.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if order does not belong to user', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-other',
        userId: 'different-user',
        merchant: { isActive: true },
      });

      await expect(
        service.reorder(mockCustomerUser, 'ord-other'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
