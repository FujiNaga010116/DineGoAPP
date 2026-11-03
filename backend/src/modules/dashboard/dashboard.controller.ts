// ==============================================================================
// DineGo Backend — Dashboard & Admin Controller (Sprint 5 — U043 đến U046)
// ==============================================================================

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import {
  DateRangeQueryDto,
  UpdateMerchantApprovalDto,
  UpdateUserStatusDto,
} from './dto/dashboard-query.dto.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Admin & Merchant Dashboard (Sprint 5 — U043 đến U046)')
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('merchant/reports/revenue/:merchantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U043: Báo cáo doanh thu nhà hàng (theo ngày/tuần/tháng & món bán chạy)',
    description: 'Thống kê tổng doanh thu, số đơn hoàn tất, AOV và biểu đồ doanh thu theo ngày.',
  })
  @ApiParam({ name: 'merchantId', description: 'ID nhà hàng' })
  getMerchantRevenueReport(
    @Param('merchantId') merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.dashboardService.getMerchantRevenueReport(merchantId, user, query);
  }

  @Get('admin/dashboard/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U044: Dashboard tổng quan toàn hệ thống dành cho Admin',
    description: 'Tổng GMV sàn (đơn thường + đơn cỗ), tổng user, số quán, shipper và top quán doanh thu cao.',
  })
  getAdminSystemOverview() {
    return this.dashboardService.getAdminSystemOverview();
  }

  @Patch('admin/merchants/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U045: Admin kiểm duyệt quán (Duyệt, Từ chối hoặc Khóa quán)',
  })
  @ApiParam({ name: 'id', description: 'ID nhà hàng' })
  updateMerchantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantApprovalDto,
  ) {
    return this.dashboardService.updateMerchantStatus(id, dto);
  }

  @Patch('admin/users/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U045: Admin khóa hoặc mở khóa tài khoản người dùng',
  })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.dashboardService.updateUserStatus(id, dto);
  }

  @Get('admin/reconciliation/monthly')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U046: Bảng đối soát doanh thu cuối tháng và tính hoa hồng (BR-42)',
    description: 'Tính toán hoa hồng sàn giữ lại (15%), doanh thu GMV và số tiền thực chuyển (Net Payout).',
  })
  getMonthlyReconciliation(
    @Query('merchantId') merchantId?: string,
    @Query('month') month?: string,
  ) {
    return this.dashboardService.getMonthlyReconciliation(merchantId, month);
  }
}

