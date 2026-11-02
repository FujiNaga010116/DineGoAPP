import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantStatus, Role } from '../../common/enums/index.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MerchantService } from './merchant.service.js';

describe('MerchantService', () => {
  let service: MerchantService;

  const mockPrisma = {
    merchant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    userRole: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    menuItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    topping: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    menuItemTopping: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MerchantService>(MerchantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // 1. MERCHANT PROFILE TESTS
  // ============================================================================
  describe('createMerchant', () => {
    it('should create merchant with PENDING status and automatically grant MERCHANT role', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      mockPrisma.userRole.findUnique.mockResolvedValue(null); // doesn't have MERCHANT role yet
      mockPrisma.userRole.create.mockResolvedValue({ id: 'r1' });
      mockPrisma.merchant.create.mockResolvedValue({
        id: 'm1',
        ownerId: 'u1',
        name: 'Phở Gia Truyền',
        slug: 'pho-gia-truyen',
        status: MerchantStatus.PENDING,
      });

      const res = await service.createMerchant('u1', {
        name: 'Phở Gia Truyền',
        address: '123 Lý Tự Trọng, Q.1',
        phoneNumber: '0901234567',
      });

      expect(res.status).toBe(MerchantStatus.PENDING);
      expect(res.slug).toBe('pho-gia-truyen');
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'u1', role: Role.MERCHANT },
      });
    });

    it('should handle slug collision by appending random suffix', async () => {
      // First slug exists
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'existing' });
      mockPrisma.userRole.findUnique.mockResolvedValue({ id: 'r1' }); // already merchant
      mockPrisma.merchant.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'm2', ...data }));

      const res = await service.createMerchant('u1', {
        name: 'Cơm Tấm',
        address: '456 Lê Lợi, Q.1',
        phoneNumber: '0901234567',
      });

      expect(res.slug).toMatch(/^com-tam-[a-z0-9]+$/);
    });
  });

  describe('getMerchants (Public)', () => {
    it('should only return approved and active merchants', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([
        { id: 'm1', name: 'Quán 1', status: MerchantStatus.APPROVED, isActive: true },
      ]);
      mockPrisma.merchant.count.mockResolvedValue(1);

      const result = await service.getMerchants({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.merchant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: MerchantStatus.APPROVED,
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('getMerchantById', () => {
    it('should allow public access if merchant is APPROVED', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'm1',
        ownerId: 'u1',
        status: MerchantStatus.APPROVED,
        isActive: true,
      });

      const res = await service.getMerchantById('m1');
      expect(res.id).toBe('m1');
    });

    it('should reject access (404) if merchant is PENDING and user is not owner/admin', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'm1',
        ownerId: 'owner-id',
        status: MerchantStatus.PENDING,
      });

      await expect(
        service.getMerchantById('m1', {
          id: 'stranger-id',
          email: 'stranger@dinego.vn',
          fullName: 'Stranger',
          roles: [Role.CUSTOMER],
          isActive: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow access if merchant is PENDING but user is owner', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'm1',
        ownerId: 'owner-id',
        status: MerchantStatus.PENDING,
      });

      const res = await service.getMerchantById('m1', {
        id: 'owner-id',
        email: 'owner@dinego.vn',
        fullName: 'Owner',
        roles: [Role.MERCHANT],
        isActive: true,
      });

      expect(res.id).toBe('m1');
    });
  });

  describe('updateMerchant (IDOR protection)', () => {
    it('should reject update (403 Forbidden) if user is not the merchant owner and not admin', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'm1',
        ownerId: 'owner-id',
      });

      await expect(
        service.updateMerchant('m1', 'hacker-id', false, { name: 'Hack Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow update if user is the merchant owner', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'm1',
        ownerId: 'owner-id',
      });
      mockPrisma.merchant.update.mockResolvedValue({
        id: 'm1',
        name: 'New Name',
      });

      const res = await service.updateMerchant('m1', 'owner-id', false, { name: 'New Name' });
      expect(res.name).toBe('New Name');
    });
  });

  describe('approveMerchant (Admin)', () => {
    it('should update merchant status to APPROVED', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'm1', status: MerchantStatus.PENDING });
      mockPrisma.merchant.update.mockResolvedValue({ id: 'm1', status: MerchantStatus.APPROVED });

      const res = await service.approveMerchant('m1', { status: MerchantStatus.APPROVED });
      expect(res.status).toBe(MerchantStatus.APPROVED);
    });
  });

  // ============================================================================
  // 2. CATEGORY TESTS
  // ============================================================================
  describe('deleteCategory', () => {
    it('should prevent deleting category (400 BadRequest) if it contains menu items', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'm1', ownerId: 'u1' });
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        merchantId: 'm1',
        _count: { menuItems: 3 }, // 3 active items!
      });

      await expect(service.deleteCategory('m1', 'cat-1', 'u1', false)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // 3. MENU ITEM & TOPPING TESTS
  // ============================================================================
  describe('createMenuItem', () => {
    it('should reject menuItem creation if category does not belong to this merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'm1', ownerId: 'u1' });
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-foreign',
        merchantId: 'm2', // belongs to m2!
      });

      await expect(
        service.createMenuItem('m1', 'u1', false, {
          categoryId: 'cat-foreign',
          name: 'Phở Bò',
          basePrice: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('linkToppingToMenuItem', () => {
    it('should prevent linking a topping from another merchant (Cross-merchant isolation)', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'm1', ownerId: 'u1' });
      mockPrisma.menuItem.findFirst.mockResolvedValue({ id: 'item-1', merchantId: 'm1' });
      mockPrisma.topping.findFirst.mockResolvedValue(null); // not found in m1!

      await expect(
        service.linkToppingToMenuItem('m1', 'item-1', 'topping-m2', 'u1', false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
