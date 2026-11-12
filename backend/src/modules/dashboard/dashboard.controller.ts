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
  UpdateDriverStatusDto,
  UpdateMerchantApprovalDto,
  UpdateSystemSettingsDto,
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
    @CurrentUser() adminUser: AuthenticatedUser,
  ) {
    return this.dashboardService.updateMerchantStatus(id, dto, adminUser);
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
    @CurrentUser() adminUser: AuthenticatedUser,
  ) {
    return this.dashboardService.updateUserStatus(id, dto, adminUser);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U045: Admin lấy danh sách toàn bộ người dùng và vai trò trên hệ thống',
  })
  getAllUsers() {
    return this.dashboardService.getAllUsers();
  }

  @Get('admin/drivers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U045: Admin lấy danh sách đội ngũ tài xế giao hàng và số chuyến hoàn tất',
  })
  getDrivers() {
    return this.dashboardService.getDrivers();
  }

  @Patch('admin/drivers/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U045: Admin đình chỉ hoặc mở khóa quyền nhận chuyến của tài xế',
  })
  @ApiParam({ name: 'id', description: 'ID tài khoản tài xế' })
  updateDriverStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDriverStatusDto,
    @CurrentUser() adminUser: AuthenticatedUser,
  ) {
    return this.dashboardService.updateDriverStatus(id, dto, adminUser);
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U045: Admin xem cấu hình vận hành toàn sàn (hoa hồng, phụ phí, bán kính ghép đơn, bảo trì)',
  })
  getSystemSettings() {
    return this.dashboardService.getSystemSettings();
  }

  @Patch('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U045: Admin cập nhật cấu hình vận hành toàn sàn và đồng bộ tỷ lệ hoa hồng',
  })
  updateSystemSettings(
    @Body() dto: UpdateSystemSettingsDto,
    @CurrentUser() adminUser: AuthenticatedUser,
  ) {
    return this.dashboardService.updateSystemSettings(dto, adminUser);
  }

  @Get('admin/audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U045: Nhật ký kiểm toán các thao tác quản trị của Admin (Audit Logs)',
  })
  getAdminAuditLogs() {
    return this.dashboardService.getAdminAuditLogs();
  }

  @Get('admin/reconciliation/monthly')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U046: Bảng đối soát doanh thu cuối tháng và tính hoa hồng (BR-42)',
    description: 'Tính toán hoa hồng sàn giữ lại, doanh thu GMV và số tiền thực chuyển (Net Payout).',
  })
  getMonthlyReconciliation(
    @Query('merchantId') merchantId?: string,
    @Query('month') month?: string,
  ) {
    return this.dashboardService.getMonthlyReconciliation(merchantId, month);
  }

  @Patch('admin/reconciliation/:id/payout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U046: Admin xác nhận giải ngân công nợ cuối kỳ cho nhà hàng',
  })
  @ApiParam({ name: 'id', description: 'Mã kỳ đối soát (reconciliationId)' })
  confirmReconciliationPayout(
    @Param('id') id: string,
    @CurrentUser() adminUser: AuthenticatedUser,
  ) {
    return this.dashboardService.confirmReconciliationPayout(id, adminUser);
  }
}

