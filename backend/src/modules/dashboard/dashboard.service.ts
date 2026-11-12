// ==============================================================================
// DineGo Backend — Dashboard & Reconciliation Service (Sprint 5 — U043 đến U046)
// Architecture: Clean Architecture / Modular Monolith
// ==============================================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import {
  DateRangeQueryDto,
  UpdateDriverStatusDto,
  UpdateMerchantApprovalDto,
  UpdateSystemSettingsDto,
  UpdateUserStatusDto,
} from './dto/dashboard-query.dto.js';
import type {
  AdminAuditLogEntry,
  AdminDriverSummary,
  AdminSystemOverview,
  AdminSystemSettings,
  MerchantReconciliation,
  RevenueSummary,
} from './interfaces/dashboard.interface.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly stateFilePath = path.resolve(process.cwd(), '.data', 'admin-state.json');
  private readonly isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  private readonly paidReconciliations = new Set<string>();
  private readonly driverStatuses = new Map<string, 'ACTIVE' | 'SUSPENDED'>();
  private systemSettings: AdminSystemSettings = {
    platformCommissionRate: 15,
    peakHourSurgeFee: 5000,
    minOrderForFreeShipping: 100000,
    autoDispatchRangeKm: 3.5,
    maintenanceMode: false,
    updatedAt: new Date('2026-11-01T08:00:00Z'),
    updatedBy: 'admin@dinego.vn',
  };

  private readonly auditLogs: AdminAuditLogEntry[] = [
    {
      id: 'aud-seed-01',
      action: 'APPROVED_MERCHANT_KYC',
      targetType: 'MERCHANT',
      targetId: 'merchant-com-tam',
      targetName: 'Cơm Tấm Sài Gòn 1985',
      reason: 'Giấy phép VSATTP & GPKD hợp lệ',
      performedBy: 'admin@dinego.vn',
      createdAt: new Date('2026-11-01T09:00:00Z'),
    },
    {
      id: 'aud-seed-02',
      action: 'PAYOUT_CONFIRMED',
      targetType: 'RECONCILIATION',
      targetId: 'REC-2026-10-COMTAM',
      targetName: 'Cơm Tấm Sài Gòn 1985 (Kỳ 10/2026)',
      reason: 'Đã ủy nhiệm chi Vietcombank 85% doanh thu ròng',
      performedBy: 'admin@dinego.vn',
      createdAt: new Date('2026-11-02T15:30:00Z'),
    },
  ];

  constructor(private readonly prisma: PrismaService) {
    this.loadPersistedState();
  }

  private loadPersistedState(): void {
    if (this.isTestEnv) return;
    try {
      if (!fs.existsSync(this.stateFilePath)) return;
      const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as {
        paidReconciliations?: string[];
        driverStatuses?: Record<string, 'ACTIVE' | 'SUSPENDED'>;
        systemSettings?: AdminSystemSettings;
        auditLogs?: AdminAuditLogEntry[];
      };

      if (Array.isArray(parsed.paidReconciliations)) {
        this.paidReconciliations.clear();
        for (const id of parsed.paidReconciliations) {
          this.paidReconciliations.add(id);
        }
      }
      if (parsed.driverStatuses && typeof parsed.driverStatuses === 'object') {
        this.driverStatuses.clear();
        for (const [k, v] of Object.entries(parsed.driverStatuses)) {
          this.driverStatuses.set(k, v);
        }
      }
      if (parsed.systemSettings) {
        this.systemSettings = {
          ...this.systemSettings,
          ...parsed.systemSettings,
          updatedAt: new Date(parsed.systemSettings.updatedAt || Date.now()),
        };
      }
      if (Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0) {
        this.auditLogs.splice(
          0,
          this.auditLogs.length,
          ...parsed.auditLogs.map((entry) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
          })),
        );
      }
    } catch (error) {
      this.logger.warn(`Không thể đọc trạng thái Admin lưu trữ: ${(error as Error).message}`);
    }
  }

  private persistState(): void {
    if (this.isTestEnv) return;
    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        paidReconciliations: Array.from(this.paidReconciliations),
        driverStatuses: Object.fromEntries(this.driverStatuses.entries()),
        systemSettings: this.systemSettings,
        auditLogs: this.auditLogs,
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      this.logger.warn(`Không thể lưu trạng thái Admin xuống đĩa: ${(error as Error).message}`);
    }
  }

  // ----------------------------------------------------------------------------
  // U043: DASHBOARD BÁO CÁO DOANH THU NHÀ HÀNG (MERCHANT REPORTS)
  // ----------------------------------------------------------------------------

  async getMerchantRevenueReport(
    merchantId: string,
    user: AuthenticatedUser,
    _query: DateRangeQueryDto,
  ): Promise<RevenueSummary> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Không tìm thấy nhà hàng');
    }

    // Kiểm tra quyền: Chủ quán hoặc Admin
    if (merchant.ownerId !== user.id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Bạn không có quyền xem báo cáo của nhà hàng này');
    }

    // Lấy danh sách đơn hàng của quán
    const orders = await this.prisma.order.findMany({
      where: { merchantId },
      include: {
        items: true,
      },
    });

    let totalRevenue = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    const dishSalesMap = new Map<string, { name: string; quantity: number; sales: number }>();
    const dayRevenueMap = new Map<string, { revenue: number; count: number }>();

    for (const ord of orders) {
      const dayKey = ord.createdAt.toISOString().split('T')[0];
      if (!dayRevenueMap.has(dayKey)) {
        dayRevenueMap.set(dayKey, { revenue: 0, count: 0 });
      }

      if (ord.status === OrderStatus.COMPLETED) {
        completedOrders++;
        const finalVal = Number(ord.finalTotal);
        totalRevenue += finalVal;

        const dayData = dayRevenueMap.get(dayKey)!;
        dayData.revenue += finalVal;
        dayData.count += 1;

        // Thống kê món bán chạy
        for (const item of ord.items) {
          const prev = dishSalesMap.get(item.itemName) || {
            name: item.itemName,
            quantity: 0,
            sales: 0,
          };
          prev.quantity += item.quantity;
          prev.sales += Number(item.subtotal);
          dishSalesMap.set(item.itemName, prev);
        }
      } else if (ord.status === OrderStatus.CANCELLED) {
        cancelledOrders++;
      }
    }

    const totalOrders = orders.length;
    const averageOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

    const topSellingDishes = Array.from(dishSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((d) => ({
        name: d.name,
        quantitySold: d.quantity,
        totalSales: d.sales,
      }));

    const revenueByDay = Array.from(dayRevenueMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orderCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
      cancelledOrders,
      averageOrderValue,
      revenueByDay,
      topSellingDishes,
    };
  }

  // ----------------------------------------------------------------------------
  // U044: DASHBOARD TỔNG QUAN TOÀN HỆ THỐNG DÀNH CHO ADMIN
  // ----------------------------------------------------------------------------

  async getAdminSystemOverview(): Promise<AdminSystemOverview> {
    const [totalOrders, completedOrders, totalUsers, totalMerchants, activeDriversCount] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.findMany({
        where: { status: OrderStatus.COMPLETED },
        select: { finalTotal: true },
      }),
      this.prisma.user.count(),
      this.prisma.merchant.count(),
      this.prisma.userRole ? this.prisma.userRole.count({ where: { role: Role.DRIVER } }) : Promise.resolve(0),
    ]);

    const foodDeliveryGmv = completedOrders.reduce((sum, o) => sum + Number(o.finalTotal), 0);
    const cateringFeastGmv = 0;
    const totalGmv = foodDeliveryGmv + cateringFeastGmv;

    const merchants = await this.prisma.merchant.findMany({
      include: {
        orders: {
          where: { status: OrderStatus.COMPLETED },
          select: { finalTotal: true },
        },
      },
    });

    const topPerformingMerchants = merchants
      .map((m) => {
        const gmv = m.orders.reduce((sum, o) => sum + Number(o.finalTotal), 0);
        return {
          merchantId: m.id,
          merchantName: m.name,
          totalOrders: m.orders.length,
          gmv,
          rating: Number(m.rating),
        };
      })
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5);

    return {
      totalGmv,
      foodDeliveryGmv,
      cateringFeastGmv,
      totalOrdersCount: totalOrders,
      totalUsersCount: totalUsers,
      totalMerchantsCount: totalMerchants,
      activeDriversCount,
      monthlyGrowthRate: 0,
      topPerformingMerchants,
    };
  }

  // ----------------------------------------------------------------------------
  // U045: ADMIN KIỂM DUYỆT QUÁN & KHÓA/MỞ TÀI KHOẢN
  // ----------------------------------------------------------------------------

  async updateMerchantStatus(
    merchantId: string,
    dto: UpdateMerchantApprovalDto,
    adminUser?: AuthenticatedUser,
  ) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      throw new NotFoundException('Không tìm thấy nhà hàng cần kiểm duyệt');
    }

    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { status: dto.status },
    });

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: `MERCHANT_${dto.status}`,
      targetType: 'MERCHANT',
      targetId: merchantId,
      targetName: updated.name,
      reason: dto.reason || 'Kiểm duyệt bởi Quản trị viên',
      performedBy: adminUser?.email || 'admin@dinego.vn',
      createdAt: new Date(),
    });
    this.persistState();

    this.logger.log(`[Admin Audit] Nhà hàng "${updated.name}" (${merchantId}) chuyển trạng thái sang: ${dto.status}. Lý do: ${dto.reason || 'N/A'}`);
    return updated;
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    adminUser?: AuthenticatedUser,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: dto.isActive },
    });

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: dto.isActive ? 'USER_UNLOCKED' : 'USER_LOCKED',
      targetType: 'USER',
      targetId: userId,
      targetName: updated.email,
      reason: dto.reason || (dto.isActive ? 'Mở khóa tài khoản' : 'Vi phạm điều khoản nền tảng'),
      performedBy: adminUser?.email || 'admin@dinego.vn',
      createdAt: new Date(),
    });
    this.persistState();

    // Nếu khóa tài khoản, thu hồi lập tức tất cả các phiên đăng nhập đang hoạt động
    if (!dto.isActive) {
      await this.prisma.userSession.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
      this.logger.warn(`[Security Alert] Tài khoản user ${userId} đã bị khóa, toàn bộ token bị thu hồi.`);
    }

    return updated;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        roles: true,
        merchants: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      isActive: u.isActive,
      roles: u.roles.map((r) => r.role),
      merchants: u.merchants,
      createdAt: u.createdAt,
    }));
  }

  async getDrivers(): Promise<AdminDriverSummary[]> {
    const drivers = await this.prisma.user.findMany({
      where: {
        roles: {
          some: { role: Role.DRIVER },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completedDeliveries = this.prisma.orderTracking
      ? await this.prisma.orderTracking.findMany({
          where: { deliveryStatus: 'DELIVERED' },
          select: { driverId: true },
        })
      : [];

    const tripCounts = new Map<string, number>();
    for (const d of completedDeliveries) {
      if (d.driverId) {
        tripCounts.set(d.driverId, (tripCounts.get(d.driverId) || 0) + 1);
      }
    }

    return drivers.map((u) => {
      const override = this.driverStatuses.get(u.id);
      const status: 'ACTIVE' | 'SUSPENDED' =
        override || (u.isActive ? 'ACTIVE' : 'SUSPENDED');
      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber,
        isActive: u.isActive,
        status,
        completedTrips: tripCounts.get(u.id) || 0,
        createdAt: u.createdAt,
      };
    });
  }

  async updateDriverStatus(
    driverId: string,
    dto: UpdateDriverStatusDto,
    adminUser?: AuthenticatedUser,
  ) {
    const isActive = dto.status === 'ACTIVE';
    this.driverStatuses.set(driverId, dto.status);

    let targetName = driverId;
    const existingUser = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (existingUser) {
      const updated = await this.prisma.user.update({
        where: { id: driverId },
        data: { isActive },
      });
      targetName = updated.fullName || updated.email;
    }

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: dto.status === 'SUSPENDED' ? 'DRIVER_SUSPENDED' : 'DRIVER_ACTIVATED',
      targetType: 'DRIVER',
      targetId: driverId,
      targetName,
      reason:
        dto.reason ||
        (dto.status === 'SUSPENDED'
          ? 'Tạm đình chỉ nhận chuyến để rà soát vận hành'
          : 'Khôi phục quyền nhận chuyến giao hàng'),
      performedBy: adminUser?.email || 'admin@dinego.vn',
      createdAt: new Date(),
    });
    this.persistState();

    return {
      id: driverId,
      status: dto.status,
      isActive,
      updatedAt: new Date(),
    };
  }

  getSystemSettings(): AdminSystemSettings {
    return this.systemSettings;
  }

  updateSystemSettings(
    dto: UpdateSystemSettingsDto,
    adminUser?: AuthenticatedUser,
  ): AdminSystemSettings {
    const actor = adminUser?.email || 'admin@dinego.vn';
    this.systemSettings = {
      platformCommissionRate:
        dto.platformCommissionRate ?? this.systemSettings.platformCommissionRate,
      peakHourSurgeFee: dto.peakHourSurgeFee ?? this.systemSettings.peakHourSurgeFee,
      minOrderForFreeShipping:
        dto.minOrderForFreeShipping ?? this.systemSettings.minOrderForFreeShipping,
      autoDispatchRangeKm:
        dto.autoDispatchRangeKm ?? this.systemSettings.autoDispatchRangeKm,
      maintenanceMode: dto.maintenanceMode ?? this.systemSettings.maintenanceMode,
      updatedAt: new Date(),
      updatedBy: actor,
    };

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: 'SYSTEM_SETTINGS_UPDATED',
      targetType: 'SYSTEM',
      targetId: 'system-config',
      targetName: `Hoa hồng ${this.systemSettings.platformCommissionRate}% • Bán kính ${this.systemSettings.autoDispatchRangeKm}km`,
      reason: dto.reason || 'Cập nhật cấu hình vận hành toàn sàn',
      performedBy: actor,
      createdAt: new Date(),
    });
    this.persistState();

    return this.systemSettings;
  }

  getAdminAuditLogs(): AdminAuditLogEntry[] {
    return this.auditLogs;
  }

  // ----------------------------------------------------------------------------
  // U046: ĐỐI SOÁT CUỐI THÁNG & TÍNH HOA HỒNG (BR-42)
  // ----------------------------------------------------------------------------

  async getMonthlyReconciliation(
    merchantId?: string,
    period = '2026-11',
  ): Promise<MerchantReconciliation[]> {
    const merchants = await this.prisma.merchant.findMany({
      where: merchantId ? { id: merchantId } : {},
      include: {
        orders: {
          where: { status: OrderStatus.COMPLETED },
          select: { finalTotal: true, deliveryFee: true },
        },
      },
    });

    const commissionRate = this.systemSettings.platformCommissionRate; // Đồng bộ cấu hình sàn (mặc định 15% theo BR-42)

    return merchants.map((m) => {
      const totalGmv = m.orders.reduce((sum, o) => sum + Number(o.finalTotal), 0);
      const totalShippingCollected = m.orders.reduce((sum, o) => sum + Number(o.deliveryFee), 0);
      const platformFee = Math.round((totalGmv * commissionRate) / 100);
      const refundsDeducted = 0;
      const netPayoutToMerchant = totalGmv - platformFee - refundsDeducted;
      const reconciliationId = `REC-${period}-${m.slug.toUpperCase().slice(0, 8)}`;

      return {
        reconciliationId,
        merchantId: m.id,
        merchantName: m.name,
        period,
        totalGmv,
        platformCommissionRate: commissionRate,
        platformFee,
        totalShippingCollected,
        refundsDeducted,
        netPayoutToMerchant,
        status: this.paidReconciliations.has(reconciliationId) ? 'PAID' : 'PENDING_CONFIRMATION',
        createdAt: new Date(),
      };
    });
  }

  confirmReconciliationPayout(
    reconciliationId: string,
    adminUser?: AuthenticatedUser,
  ): { reconciliationId: string; status: 'PAID'; paidAt: Date } {
    this.paidReconciliations.add(reconciliationId);
    const netPct = 100 - this.systemSettings.platformCommissionRate;
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: 'PAYOUT_CONFIRMED',
      targetType: 'RECONCILIATION',
      targetId: reconciliationId,
      targetName: reconciliationId,
      reason: `Admin xác nhận giải ngân công nợ cuối kỳ (${netPct}% Net Payout)`,
      performedBy: adminUser?.email || 'admin@dinego.vn',
      createdAt: new Date(),
    });
    this.persistState();
    return {
      reconciliationId,
      status: 'PAID',
      paidAt: new Date(),
    };
  }
}

