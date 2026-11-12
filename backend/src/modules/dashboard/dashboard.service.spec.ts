import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MerchantStatus, OrderStatus, Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService (Sprint 5 — U043, U044, U045, U046)', () => {
  let service: DashboardService;
  let mockPrisma: any;

  const mockMerchantUser: AuthenticatedUser = {
    id: 'merchant-user-1',
    email: 'owner@comtam.vn',
    roles: [Role.MERCHANT],
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      merchant: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      userRole: {
        count: vi.fn().mockResolvedValue(12),
      },
      userSession: {
        updateMany: vi.fn(),
      },
    };

    service = new DashboardService(mockPrisma as unknown as PrismaService);
  });

  describe('U043: getMerchantRevenueReport', () => {
    it('should calculate revenue and completed orders for merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'merchant-1',
        name: 'Cơm Tấm Sài Gòn',
        ownerId: 'merchant-user-1',
      });

      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          status: OrderStatus.COMPLETED,
          finalTotal: 100000,
          subtotal: 90000,
          deliveryFee: 10000,
          createdAt: new Date('2026-11-01T12:00:00Z'),
          items: [{ itemName: 'Cơm Sườn', quantity: 2, subtotal: 90000 }],
        },
        {
          id: 'ord-2',
          status: OrderStatus.COMPLETED,
          finalTotal: 200000,
          subtotal: 180000,
          deliveryFee: 20000,
          createdAt: new Date('2026-11-02T12:00:00Z'),
          items: [{ itemName: 'Cơm Ba Rọi', quantity: 3, subtotal: 180000 }],
        },
      ]);

      const report = await service.getMerchantRevenueReport(
        'merchant-1',
        mockMerchantUser,
        {},
      );

      expect(report.completedOrders).toBe(2);
      expect(report.totalRevenue).toBe(300000);
      expect(report.averageOrderValue).toBe(150000);
      expect(report.revenueByDay.length).toBe(2);
      expect(report.topSellingDishes.length).toBe(2);
    });
  });

  describe('U044: getAdminSystemOverview', () => {
    it('should aggregate platform GMV, counts and top merchants', async () => {
      mockPrisma.order.count.mockResolvedValue(120);
      mockPrisma.order.findMany.mockResolvedValue([
        { finalTotal: 500000 },
        { finalTotal: 300000 },
      ]);
      mockPrisma.user.count.mockResolvedValue(150);
      mockPrisma.merchant.count.mockResolvedValue(20);

      mockPrisma.merchant.findMany.mockResolvedValue([
        {
          id: 'm-1',
          name: 'Cơm Tấm Ba Ghiền',
          orders: [
            { id: 'o-1', finalTotal: 300000 },
            { id: 'o-2', finalTotal: 200000 },
          ],
        },
      ]);

      const overview = await service.getAdminSystemOverview();

      expect(overview.foodDeliveryGmv).toBe(800000);
      expect(overview.cateringFeastGmv).toBe(0);
      expect(overview.totalGmv).toBe(800000);
      expect(overview.totalOrdersCount).toBe(120);
      expect(overview.totalUsersCount).toBe(150);
      expect(overview.totalMerchantsCount).toBe(20);
      expect(overview.topPerformingMerchants.length).toBe(1);
      expect(overview.topPerformingMerchants[0].gmv).toBe(500000);
    });
  });

  describe('U045: Admin moderation (merchant status & user status)', () => {
    it('should update merchant status to ACTIVE', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'm-1',
        name: 'Quán Ăn Ngon',
      });
      mockPrisma.merchant.update.mockResolvedValue({
        id: 'm-1',
        name: 'Quán Ăn Ngon',
        status: MerchantStatus.ACTIVE,
      });

      const res = await service.updateMerchantStatus('m-1', {
        status: MerchantStatus.ACTIVE,
        reason: 'Hồ sơ đạt tiêu chuẩn an toàn thực phẩm',
      });
      expect(res.status).toBe(MerchantStatus.ACTIVE);
      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: { status: MerchantStatus.ACTIVE },
      });
    });

    it('should update user status and revoke sessions when deactivated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'spammer@gmail.com',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u-1',
        isActive: false,
      });
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 });

      const res = await service.updateUserStatus('u-1', {
        isActive: false,
        reason: 'Spam đánh giá ảo',
      });
      expect(res.isActive).toBe(false);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('U046: getMonthlyReconciliation', () => {
    it('should return monthly reconciliation breakdown for all merchants with 15% commission', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([
        {
          id: 'm-1',
          name: 'Phở Gia Truyền',
          slug: 'pho-gia-truyen',
          orders: [
            { id: 'o-1', finalTotal: 1000000, deliveryFee: 30000 },
          ],
        },
      ]);

      const list = await service.getMonthlyReconciliation(undefined, '2026-11');
      expect(list.length).toBe(1);
      expect(list[0].period).toBe('2026-11');
      expect(list[0].totalGmv).toBe(1000000);
      expect(list[0].platformCommissionRate).toBe(15);
      expect(list[0].platformFee).toBe(150000);
      expect(list[0].netPayoutToMerchant).toBe(850000);
    });
  });
});
