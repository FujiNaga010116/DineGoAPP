// ==============================================================================
// DineGo Backend — Dashboard & Admin Controller (Sprint 5 — U043 đến U046)
// ==============================================================================

import {
  Body,
  Controller,
  Delete,
  Get,
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
  @ApiOperation({
    summary: 'U044: Dashboard tổng quan toàn hệ thống dành cho Admin',
    description: 'Tổng GMV sàn (đơn thường + đơn cỗ), tổng user, số quán, shipper và top quán doanh thu cao.',
  })
  getAdminSystemOverview() {
    return this.dashboardService.getAdminSystemOverview();
  }

  @Patch('admin/merchants/:id/status')
  @ApiOperation({
    summary: 'U045: Admin kiểm duyệt quán (Duyệt, Từ chối hoặc Khóa quán)',
  })
  @ApiParam({ name: 'id', description: 'ID nhà hàng' })
  updateMerchantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantApprovalDto,
    @CurrentUser() adminUser?: AuthenticatedUser,
  ) {
    return this.dashboardService.updateMerchantStatus(id, dto, adminUser);
  }

  @Patch('admin/users/:id/status')
  @ApiOperation({
    summary: 'U045: Admin khóa hoặc mở khóa tài khoản người dùng',
  })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() adminUser?: AuthenticatedUser,
  ) {
    return this.dashboardService.updateUserStatus(id, dto, adminUser);
  }

  @Get('admin/users')
  @ApiOperation({
    summary: 'U045: Admin lấy danh sách toàn bộ người dùng và vai trò trên hệ thống',
  })
  getAllUsers() {
    return this.dashboardService.getAllUsers();
  }

  @Get('admin/drivers')
  @ApiOperation({
    summary: 'U045: Admin lấy danh sách đội ngũ tài xế giao hàng và số chuyến hoàn tất',
  })
  getDrivers() {
    return this.dashboardService.getDrivers();
  }

  @Patch('admin/drivers/:id/status')
  @ApiOperation({
    summary: 'U045: Admin đình chỉ hoặc mở khóa quyền nhận chuyến của tài xế',
  })
  @ApiParam({ name: 'id', description: 'ID tài khoản tài xế' })
  updateDriverStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDriverStatusDto,
    @CurrentUser() adminUser?: AuthenticatedUser,
  ) {
    return this.dashboardService.updateDriverStatus(id, dto, adminUser);
  }

  @Get('admin/settings')
  @ApiOperation({
    summary: 'U045: Admin xem cấu hình vận hành toàn sàn (hoa hồng, phụ phí, bán kính ghép đơn, bảo trì)',
  })
  getSystemSettings() {
    return this.dashboardService.getSystemSettings();
  }

  @Patch('admin/settings')
  @ApiOperation({
    summary: 'U045: Admin cập nhật cấu hình vận hành toàn sàn và đồng bộ tỷ lệ hoa hồng',
  })
  updateSystemSettings(
    @Body() dto: UpdateSystemSettingsDto,
    @CurrentUser() adminUser?: AuthenticatedUser,
  ) {
    return this.dashboardService.updateSystemSettings(dto, adminUser);
  }

  @Get('admin/audit-logs')
  @ApiOperation({
    summary: 'U045: Nhật ký kiểm toán các thao tác quản trị của Admin (Audit Logs)',
  })
  getAdminAuditLogs() {
    return this.dashboardService.getAdminAuditLogs();
  }

  @Get('admin/reconciliation/monthly')
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
  @ApiOperation({
    summary: 'U046: Admin xác nhận giải ngân công nợ cuối kỳ cho nhà hàng',
  })
  @ApiParam({ name: 'id', description: 'Mã kỳ đối soát (reconciliationId)' })
  confirmReconciliationPayout(
    @Param('id') id: string,
    @CurrentUser() adminUser?: AuthenticatedUser,
  ) {
    return this.dashboardService.confirmReconciliationPayout(id, adminUser);
  }

  // ----------------------------------------------------------------------------
  // LIVE SQL SERVER DATABASE LEDGER ENDPOINTS (NO HARDCODED DEMO DATA)
  // ----------------------------------------------------------------------------

  @Get('admin/database/ledger')
  @ApiOperation({
    summary: 'Lấy toàn bộ dữ liệu giao dịch thực tế từ SQL Server (orders, feast_orders, complaints, reviews)',
  })
  getDatabaseLedger() {
    return this.dashboardService.getDatabaseLedger();
  }

  @Post('admin/database/orders')
  @ApiOperation({
    summary: 'Lưu đơn đặt đồ ăn mới trực tiếp vào SQL Server (orders, order_items, payments)',
  })
  upsertDatabaseOrder(@Body() body: Record<string, any>) {
    return this.dashboardService.upsertDatabaseOrder(body);
  }

  @Patch('admin/database/orders/:id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái đơn hàng & tài xế trực tiếp trong SQL Server',
  })
  updateDatabaseOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string; assignedDriverId?: string; assignedDriverName?: string },
  ) {
    return this.dashboardService.updateDatabaseOrderStatus(id, body);
  }

  @Post('admin/database/feast-bookings')
  @ApiOperation({
    summary: 'Lưu hợp đồng đặt tiệc & mâm cỗ mới trực tiếp vào SQL Server (feast_orders, bookings)',
  })
  upsertDatabaseFeastBooking(@Body() body: Record<string, any>) {
    return this.dashboardService.upsertDatabaseFeastBooking(body);
  }

  @Patch('admin/database/feast-bookings/:id')
  @ApiOperation({
    summary: 'Cập nhật trạng thái hợp đồng đặt tiệc trực tiếp trong SQL Server (feast_orders)',
  })
  updateDatabaseFeastBookingStatus(
    @Param('id') id: string,
    @Body() body: { status: string; depositPaid?: boolean },
  ) {
    return this.dashboardService.updateDatabaseFeastBookingStatus(id, body);
  }

  @Post('admin/database/complaints')
  @ApiOperation({
    summary: 'Ghi nhận khiếu nại đơn hàng mới trực tiếp vào bảng complaints trong SQL Server',
  })
  createDatabaseComplaint(@Body() body: Record<string, any>) {
    return this.dashboardService.createDatabaseComplaint(body);
  }

  @Patch('admin/database/complaints/:id/resolve')
  @ApiOperation({
    summary: 'Admin xử lý & phán quyết khiếu nại trực tiếp trên bảng complaints trong SQL Server',
  })
  resolveDatabaseComplaint(
    @Param('id') id: string,
    @Body()
    body: {
      status: string;
      resolutionNotes?: string;
      compensationAmount?: number;
      faultParty?: 'MERCHANT' | 'DRIVER' | 'PLATFORM';
    },
  ) {
    return this.dashboardService.resolveDatabaseComplaint(id, body);
  }

  @Post('admin/database/disputes')
  @ApiOperation({ summary: 'Ghi nhận báo cáo bom hàng của tài xế trực tiếp vào SQL Server' })
  createDatabaseDispute(@Body() body: Record<string, any>) {
    return this.dashboardService.createDatabaseDispute(body);
  }

  @Patch('admin/database/disputes/:id/resolve')
  @ApiOperation({ summary: 'Admin phân xử báo cáo bom hàng trực tiếp trên SQL Server' })
  resolveDatabaseDispute(
    @Param('id') id: string,
    @Body() body: { status: 'COMPENSATED_DRIVER' | 'REJECTED'; adminNote?: string },
  ) {
    return this.dashboardService.resolveDatabaseDispute(id, body);
  }

  @Post('admin/database/withdrawals')
  @ApiOperation({ summary: 'Lưu yêu cầu rút tiền của Nhà hàng / Tài xế vào SQL Server' })
  createDatabaseWithdrawal(@Body() body: Record<string, any>) {
    return this.dashboardService.createDatabaseWithdrawal(body);
  }

  @Patch('admin/database/withdrawals/:id/process')
  @ApiOperation({ summary: 'Admin duyệt hoặc từ chối lệnh rút tiền trên SQL Server' })
  processDatabaseWithdrawal(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; note?: string },
  ) {
    return this.dashboardService.processDatabaseWithdrawal(id, body);
  }

  @Get('admin/database/knowledge')
  @ApiOperation({ summary: 'Lấy danh sách tri thức AI RAG từ bảng knowledge_base_vectors' })
  getKnowledgeChunks() {
    return this.dashboardService.getKnowledgeChunks();
  }

  @Post('admin/database/knowledge')
  @ApiOperation({ summary: 'Thêm đoạn tri thức mới vào bảng knowledge_base_vectors' })
  createKnowledgeChunk(@Body() body: { source: string; content: string }) {
    return this.dashboardService.createKnowledgeChunk(body);
  }

  @Delete('admin/database/knowledge/:id')
  @ApiOperation({ summary: 'Xóa đoạn tri thức khỏi bảng knowledge_base_vectors' })
  deleteKnowledgeChunk(@Param('id') id: string) {
    return this.dashboardService.deleteKnowledgeChunk(id);
  }

  @Get('admin/database/ai-prompt')
  @ApiOperation({ summary: 'Lấy System Prompt huấn luyện AI từ SQL Server' })
  getAiSystemPrompt() {
    return this.dashboardService.getAiSystemPrompt();
  }

  @Post('admin/database/ai-prompt')
  @ApiOperation({ summary: 'Lưu System Prompt huấn luyện AI vào SQL Server' })
  saveAiSystemPrompt(@Body() body: { prompt: string }) {
    return this.dashboardService.saveAiSystemPrompt(body.prompt);
  }
}

