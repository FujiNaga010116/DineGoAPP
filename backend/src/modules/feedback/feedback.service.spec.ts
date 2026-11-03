import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderStatus, Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { FeedbackService } from './feedback.service.js';

describe('FeedbackService (Sprint 5 — U047, U048, U051)', () => {
  let service: FeedbackService;
  let mockPrisma: any;

  const mockCustomer: AuthenticatedUser = {
    id: 'cust-1',
    email: 'khachhang@gmail.com',
    roles: [Role.CUSTOMER],
  };

  const mockMerchantOwner: AuthenticatedUser = {
    id: 'owner-1',
    email: 'owner@comtam.vn',
    roles: [Role.MERCHANT],
  };

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@dinego.vn',
    roles: [Role.ADMIN],
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: vi.fn(),
      },
      merchant: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    };

    service = new FeedbackService(mockPrisma as unknown as PrismaService);
  });

  describe('U047: createReview & getMerchantReviews', () => {
    it('should create review and update merchant average rating', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-100',
        userId: 'cust-1',
        merchantId: 'merch-1',
        status: OrderStatus.COMPLETED,
        merchant: { id: 'merch-1', name: 'Cơm Tấm Sài Gòn' },
      });
      mockPrisma.merchant.update.mockResolvedValue({});

      const review = await service.createReview(mockCustomer, {
        orderId: 'ord-100',
        rating: 5,
        comment: 'Cơm sườn ngon, giao nóng hổi!',
      });

      expect(review.rating).toBe(5);
      expect(review.comment).toBe('Cơm sườn ngon, giao nóng hổi!');
      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: 'merch-1' },
        data: { rating: 5 },
      });

      const merchantReviews = await service.getMerchantReviews('merch-1');
      expect(merchantReviews.totalReviews).toBe(1);
      expect(merchantReviews.averageRating).toBe(5);
    });

    it('should throw BadRequestException if order is not COMPLETED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-101',
        userId: 'cust-1',
        merchantId: 'merch-1',
        status: OrderStatus.PENDING,
        merchant: { id: 'merch-1', name: 'Cơm Tấm Sài Gòn' },
      });

      await expect(
        service.createReview(mockCustomer, {
          orderId: 'ord-101',
          rating: 4,
          comment: 'Chưa giao mà đã đánh giá',
        }),
      ).rejects.toThrow('Chỉ có thể đánh giá sau khi đơn hàng đã hoàn tất (COMPLETED)');
    });
  });

  describe('U048: replyToReview', () => {
    it('should allow merchant owner to reply to a customer review', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-102',
        userId: 'cust-1',
        merchantId: 'merch-1',
        status: OrderStatus.COMPLETED,
        merchant: { id: 'merch-1', name: 'Cơm Tấm Sài Gòn' },
      });
      mockPrisma.merchant.update.mockResolvedValue({});

      const review = await service.createReview(mockCustomer, {
        orderId: 'ord-102',
        rating: 5,
        comment: 'Ngon tuyệt cú mèo!',
      });

      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: 'merch-1',
        name: 'Cơm Tấm Sài Gòn',
        ownerId: 'owner-1',
      });

      const updatedReview = await service.replyToReview(review.id, mockMerchantOwner, {
        replyContent: 'Dạ quán cảm ơn quý khách nhiều ạ!',
      });

      expect(updatedReview.reply).toBeDefined();
      expect(updatedReview.reply?.replyContent).toBe('Dạ quán cảm ơn quý khách nhiều ạ!');
    });
  });

  describe('U051: createComplaint & resolveComplaint', () => {
    it('should allow customer to create complaint and admin to resolve with refund', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-103',
        orderNumber: 'DG-20261103-001',
        userId: 'cust-1',
        merchantId: 'merch-1',
        recipientPhone: '0901234567',
        user: { email: 'khachhang@gmail.com' },
      });

      const complaint = await service.createComplaint(mockCustomer, {
        orderId: 'ord-103',
        issueType: 'MISSING_ITEMS',
        description: 'Đơn hàng thiếu 1 phần canh chua',
      });

      expect(complaint.complaintCode).toMatch(/^DG-CMP-/);
      expect(complaint.status).toBe('OPEN');

      const resolved = await service.resolveComplaint(complaint.id, mockAdmin, {
        decision: 'REFUNDED',
        resolutionNotes: 'Đã hoàn tiền 35,000 VND vào ví MoMo cho khách hàng',
        compensationAmount: 35000,
      });

      expect(resolved.status).toBe('REFUNDED');
      expect(resolved.compensationAmount).toBe(35000);
      expect(resolved.adminResolutionNotes).toContain('Đã hoàn tiền 35,000 VND');
    });
  });
});

