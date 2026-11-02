// ==============================================================================
// DineGo Backend — Cart Service Unit Tests (Phase 5.1)
// ==============================================================================

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MerchantStatus } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CartService } from './cart.service.js';

describe('CartService', () => {
  let service: CartService;

  const mockUser = { id: 'user-uuid-1' };
  const mockMerchant = {
    id: 'merchant-uuid-1',
    name: 'Quán Phở Thảo',
    slug: 'quan-pho-thao',
    address: '123 Cầu Giấy, Hà Nội',
    phoneNumber: '0912345678',
    logoUrl: null,
    status: MerchantStatus.APPROVED,
    isActive: true,
    isOpen: true,
  };

  const mockTopping = {
    id: 'topping-uuid-1',
    name: 'Thịt bò thêm',
    price: 15000,
    isActive: true,
    isAvailable: true,
  };

  const mockMenuItem = {
    id: 'item-uuid-1',
    merchantId: mockMerchant.id,
    name: 'Phở Bò Tái',
    slug: 'pho-bo-tai',
    imageUrl: 'https://example.com/pho.jpg',
    basePrice: 50000,
    isActive: true,
    isAvailable: true,
    merchant: mockMerchant,
    menuItemToppings: [
      {
        toppingId: mockTopping.id,
        topping: mockTopping,
      },
    ],
  };

  const mockPrisma = {
    cart: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    cartItemTopping: {
      create: vi.fn(),
    },
    menuItem: {
      findUnique: vi.fn(),
    },
    merchant: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return empty cart summary when user has no cart in DB', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getCart(mockUser.id);
      expect(result.id).toBeNull();
      expect(result.merchant).toBeNull();
      expect(result.items).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
      expect(result.summary.subtotal).toBe(0);
    });

    it('should return cart with items and correct subtotal calculated from DB prices', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: mockUser.id,
        merchantId: mockMerchant.id,
        merchant: mockMerchant,
        items: [
          {
            id: 'cart-item-1',
            cartId: 'cart-1',
            menuItemId: mockMenuItem.id,
            quantity: 2,
            note: 'Không hành',
            menuItem: mockMenuItem,
            toppings: [
              {
                id: 'cit-1',
                cartItemId: 'cart-item-1',
                toppingId: mockTopping.id,
                topping: mockTopping,
              },
            ],
          },
        ],
      });

      const result = await service.getCart(mockUser.id);
      expect(result.id).toBe('cart-1');
      expect(result.merchant?.name).toBe('Quán Phở Thảo');
      expect(result.items).toHaveLength(1);
      // Unit price: 50,000 + 15,000 = 65,000
      expect(result.items[0].itemUnitPrice).toBe(65000);
      // Subtotal: 65,000 * 2 = 130,000
      expect(result.items[0].itemSubtotal).toBe(130000);
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.subtotal).toBe(130000);
    });
  });

  describe('addItem', () => {
    it('should throw NotFoundException if menuItem does not exist', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(mockUser.id, {
          menuItemId: 'non-existent-id',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if menuItem is unavailable or inactive', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        ...mockMenuItem,
        isAvailable: false,
      });

      await expect(
        service.addItem(mockUser.id, {
          menuItemId: mockMenuItem.id,
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if merchant is closed', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        ...mockMenuItem,
        merchant: { ...mockMerchant, isOpen: false },
      });

      await expect(
        service.addItem(mockUser.id, {
          menuItemId: mockMenuItem.id,
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if topping does not belong to the menuItem', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);

      await expect(
        service.addItem(mockUser.id, {
          menuItemId: mockMenuItem.id,
          quantity: 1,
          toppingIds: ['unrelated-topping-id'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if cart has items from a different merchant and clearExisting is false', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: mockUser.id,
        merchantId: 'different-merchant-id',
        items: [{ id: 'old-item-1' }],
      });
      mockPrisma.merchant.findUnique.mockResolvedValue({
        name: 'Quán Khác',
      });

      await expect(
        service.addItem(mockUser.id, {
          menuItemId: mockMenuItem.id,
          quantity: 1,
          clearExisting: false,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should clear old items and switch merchant if clearExisting is true', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: mockUser.id,
        merchantId: 'different-merchant-id',
        items: [{ id: 'old-item-1', toppings: [] }],
      });
      mockPrisma.cart.update.mockResolvedValue({});
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.cartItem.create.mockResolvedValue({ id: 'new-item-1' });

      // Mock getCart response after add
      mockPrisma.cart.findUnique
        .mockResolvedValueOnce({
          id: 'cart-1',
          userId: mockUser.id,
          merchantId: 'different-merchant-id',
          items: [{ id: 'old-item-1', toppings: [] }],
        })
        .mockResolvedValueOnce({
          id: 'cart-1',
          userId: mockUser.id,
          merchantId: mockMerchant.id,
          merchant: mockMerchant,
          items: [
            {
              id: 'new-item-1',
              menuItemId: mockMenuItem.id,
              quantity: 1,
              note: null,
              menuItem: mockMenuItem,
              toppings: [],
            },
          ],
        });

      const res = await service.addItem(mockUser.id, {
        menuItemId: mockMenuItem.id,
        quantity: 1,
        clearExisting: true,
      });

      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
      expect(res.merchant?.id).toBe(mockMerchant.id);
    });

    it('should stack quantity if identical item with same toppings and note is added', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: mockUser.id,
        merchantId: mockMerchant.id,
        items: [
          {
            id: 'item-1',
            menuItemId: mockMenuItem.id,
            quantity: 2,
            note: 'Không hành',
            menuItem: mockMenuItem,
            toppings: [{ toppingId: mockTopping.id, topping: mockTopping }],
          },
        ],
      });
      mockPrisma.cartItem.update.mockResolvedValue({});

      await service.addItem(mockUser.id, {
        menuItemId: mockMenuItem.id,
        quantity: 3,
        toppingIds: [mockTopping.id],
        note: 'Không hành',
      });

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5 }, // 2 + 3 = 5
      });
    });
  });

  describe('updateItemQuantity', () => {
    it('should update quantity successfully', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cart: { userId: mockUser.id },
      });
      mockPrisma.cartItem.update.mockResolvedValue({});
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      await service.updateItemQuantity(mockUser.id, 'item-1', { quantity: 4 });
      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 4 },
      });
    });

    it('should throw NotFoundException if item belongs to another user', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cart: { userId: 'different-user-id' }, // User isolation!
      });

      await expect(
        service.updateItemQuantity(mockUser.id, 'item-1', { quantity: 4 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem and clearCart', () => {
    it('should remove item and reset merchantId if cart is empty', async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        cart: { userId: mockUser.id },
      });
      mockPrisma.cartItem.delete.mockResolvedValue({});
      mockPrisma.cartItem.count.mockResolvedValue(0);
      mockPrisma.cart.update.mockResolvedValue({});
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      await service.removeItem(mockUser.id, 'item-1');
      expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(mockPrisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { merchantId: null },
      });
    });

    it('should clear all items and reset merchantId on clearCart', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        userId: mockUser.id,
        items: [],
      });
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.cart.update.mockResolvedValue({});

      await service.clearCart(mockUser.id);
      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
      expect(mockPrisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { merchantId: null },
      });
    });
  });
});
