// ==============================================================================
// DineGo Backend — Feedback, Review & Complaint Service (Sprint 5 — U047, U048, U051)
// Architecture: Clean Architecture / Modular Monolith
// ==============================================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { OrderStatus, Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CreateComplaintDto, ResolveComplaintDto } from './dto/create-complaint.dto.js';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto.js';
import type {
  ComplaintItem,
  ReviewItem,
} from './interfaces/feedback.interface.js';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  // In-memory Stores for Reviews and Complaints
  private readonly reviews = new Map<string, ReviewItem>();
  private readonly complaints = new Map<string, ComplaintItem>();

  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // U047: ĐÁNH GIÁ QUÁN VÀ MÓN ĂN SAU ĐƠN HÀNG
  // ----------------------------------------------------------------------------

  async createReview(user: AuthenticatedUser, dto: CreateReviewDto): Promise<ReviewItem> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { merchant: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần đánh giá');
    }

    if (order.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá đơn hàng do chính mình đặt');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể đánh giá sau khi đơn hàng đã hoàn tất (COMPLETED)');
    }

    // Kiểm tra không đánh giá trùng lặp
    for (const r of this.reviews.values()) {
      if (r.orderId === dto.orderId) {
        throw new ConflictException('Đơn hàng này đã được bạn gửi đánh giá trước đó');
      }
    }

    const reviewId = crypto.randomUUID();
    const review: ReviewItem = {
      id: reviewId,
      orderId: order.id,
      userId: user.id,
      customerName: user.email.split('@')[0],
      merchantId: order.merchantId,
      rating: dto.rating,
      comment: dto.comment.trim(),
      images: dto.images,
      createdAt: new Date(),
    };

    this.reviews.set(reviewId, review);

    // Tính lại điểm trung bình của nhà hàng và cập nhật vào DB
    const allMerchantReviews = Array.from(this.reviews.values()).filter(
      (r) => r.merchantId === order.merchantId,
    );
    const avgRating =
      allMerchantReviews.reduce((sum, r) => sum + r.rating, 0) / allMerchantReviews.length;

    await this.prisma.merchant.update({
      where: { id: order.merchantId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });

    this.logger.log(`[Review] Khách ${user.email} đã đánh giá ${dto.rating} sao cho quán ${order.merchant.name}`);
    return review;
  }

  async getMerchantReviews(merchantId: string): Promise<{
    merchantId: string;
    averageRating: number;
    totalReviews: number;
    reviews: ReviewItem[];
  }> {
    const merchantReviews = Array.from(this.reviews.values())
      .filter((r) => r.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totalReviews = merchantReviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round((merchantReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
        : 5.0;

    return {
      merchantId,
      averageRating,
      totalReviews,
      reviews: merchantReviews,
    };
  }

  // ----------------------------------------------------------------------------
  // U048: MERCHANT PHẢN HỒI ĐÁNH GIÁ CỦA KHÁCH
  // ----------------------------------------------------------------------------

  async replyToReview(
    reviewId: string,
    user: AuthenticatedUser,
    dto: ReplyReviewDto,
  ): Promise<ReviewItem> {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy bản ghi đánh giá');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: review.merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Không tìm thấy quán tương ứng');
    }

    if (merchant.ownerId !== user.id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Chỉ chủ quán hoặc Admin mới có quyền phản hồi đánh giá');
    }

    review.reply = {
      merchantId: merchant.id,
      merchantName: merchant.name,
      replyContent: dto.replyContent.trim(),
      repliedAt: new Date(),
    };

    this.logger.log(`[Review] Nhà hàng ${merchant.name} đã phản hồi đánh giá của khách`);
    return review;
  }

  // ----------------------------------------------------------------------------
  // U051: KHIẾU NẠI & XỬ LÝ CỦA ADMIN
  // ----------------------------------------------------------------------------

  async createComplaint(user: AuthenticatedUser, dto: CreateComplaintDto): Promise<ComplaintItem> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần khiếu nại');
    }

    if (order.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể khiếu nại đơn hàng do chính mình đặt');
    }

    const complaintId = crypto.randomUUID();
    const complaintCode = `DG-CMP-${Date.now().toString().slice(-6)}`;

    const complaint: ComplaintItem = {
      id: complaintId,
      complaintCode,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: user.id,
      customerName: user.email.split('@')[0],
      customerPhone: order.recipientPhone,
      merchantId: order.merchantId,
      issueType: dto.issueType,
      description: dto.description.trim(),
      evidenceImages: dto.evidenceImages,
      status: 'OPEN',
      createdAt: new Date(),
    };

    this.complaints.set(complaintId, complaint);
    this.logger.warn(`[Complaint Alert] Khách hàng tạo khiếu nại ${complaintCode} cho đơn ${order.orderNumber}. Lý do: ${dto.issueType}`);

    return complaint;
  }

  async getComplaints(user: AuthenticatedUser, merchantId?: string): Promise<ComplaintItem[]> {
    let list = Array.from(this.complaints.values());

    if (user.roles.includes(Role.ADMIN)) {
      if (merchantId) list = list.filter((c) => c.merchantId === merchantId);
    } else if (user.roles.includes(Role.MERCHANT)) {
      const myMerchants = await this.prisma.merchant.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });
      const ids = myMerchants.map((m) => m.id);
      list = list.filter((c) => ids.includes(c.merchantId));
    } else {
      list = list.filter((c) => c.userId === user.id);
    }

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async resolveComplaint(
    complaintId: string,
    adminUser: AuthenticatedUser,
    dto: ResolveComplaintDto,
  ): Promise<ComplaintItem> {
    if (!adminUser.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Chỉ Quản trị viên (Admin) mới có thẩm quyền giải quyết khiếu nại');
    }

    const complaint = this.complaints.get(complaintId);
    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    complaint.status = dto.decision;
    complaint.adminResolutionNotes = dto.resolutionNotes.trim();
    complaint.compensationAmount = dto.compensationAmount ?? 0;
    complaint.resolvedAt = new Date();

    this.logger.log(`[Complaint Resolved] Admin ${adminUser.email} đã giải quyết khiếu nại ${complaint.complaintCode}: ${dto.decision}`);
    return complaint;
  }
}

