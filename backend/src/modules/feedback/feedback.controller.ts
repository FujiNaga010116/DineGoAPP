// ==============================================================================
// DineGo Backend — Feedback, Review & Complaint Controller (Sprint 5 — U047, U048, U051)
// ==============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CreateComplaintDto, ResolveComplaintDto } from './dto/create-complaint.dto.js';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto.js';
import { FeedbackService } from './feedback.service.js';

@ApiTags('Feedback, Reviews & Complaints (Sprint 5 — U047, U048, U051)')
@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // ----------------------------------------------------------------------------
  // U047: CUSTOMER REVIEW
  // ----------------------------------------------------------------------------

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'U047: Khách hàng đánh giá sao và bình luận sau khi hoàn tất đơn hàng' })
  @ApiResponse({ status: 201, description: 'Đã gửi đánh giá thành công' })
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.feedbackService.createReview(user, dto);
  }

  @Get('merchants/:merchantId/reviews')
  @ApiOperation({ summary: 'U047: Xem danh sách đánh giá và điểm trung bình của nhà hàng' })
  @ApiParam({ name: 'merchantId', description: 'ID của nhà hàng' })
  async getMerchantReviews(@Param('merchantId') merchantId: string) {
    return this.feedbackService.getMerchantReviews(merchantId);
  }

  // ----------------------------------------------------------------------------
  // U048: MERCHANT REPLY TO REVIEW
  // ----------------------------------------------------------------------------

  @Post('reviews/:id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'U048: Nhà hàng hoặc Admin phản hồi đánh giá của thực khách' })
  @ApiParam({ name: 'id', description: 'ID đánh giá' })
  async replyToReview(
    @Param('id') reviewId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.feedbackService.replyToReview(reviewId, user, dto);
  }

  // ----------------------------------------------------------------------------
  // U051: COMPLAINTS & RESOLUTION
  // ----------------------------------------------------------------------------

  @Post('complaints')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'U051: Khách hàng gửi khiếu nại về món ăn, thiếu đồ, vệ sinh hoặc tài xế' })
  @ApiResponse({ status: 201, description: 'Khiếu nại đã được ghi nhận' })
  async createComplaint(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.feedbackService.createComplaint(user, dto);
  }

  @Get('complaints')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'U051: Danh sách khiếu nại (Admin xem toàn hệ thống, Merchant xem theo quán, Customer xem đơn của mình)' })
  @ApiQuery({ name: 'merchantId', required: false })
  async getComplaints(
    @CurrentUser() user: AuthenticatedUser,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.feedbackService.getComplaints(user, merchantId);
  }

  @Patch('complaints/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'U051: Admin xử lý khiếu nại (Hoàn tiền, bồi thường hoặc từ chối)' })
  @ApiParam({ name: 'id', description: 'ID khiếu nại' })
  async resolveComplaint(
    @Param('id') complaintId: string,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Body() dto: ResolveComplaintDto,
  ) {
    return this.feedbackService.resolveComplaint(complaintId, adminUser, dto);
  }
}

