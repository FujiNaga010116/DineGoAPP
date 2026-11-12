export interface RevenueSummary {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  revenueByDay: { date: string; revenue: number; orderCount: number }[];
  topSellingDishes: { name: string; quantitySold: number; totalSales: number }[];
}

export interface AdminSystemOverview {
  totalGmv: number;
  foodDeliveryGmv: number;
  cateringFeastGmv: number;
  totalOrdersCount: number;
  totalUsersCount: number;
  totalMerchantsCount: number;
  activeDriversCount: number;
  monthlyGrowthRate: number;
  topPerformingMerchants: {
    merchantId: string;
    merchantName: string;
    totalOrders: number;
    gmv: number;
    rating: number;
  }[];
}

export interface MerchantReconciliation {
  reconciliationId: string;
  merchantId: string;
  merchantName: string;
  period: string; // e.g. "2026-11"
  totalGmv: number;
  platformCommissionRate: number; // e.g. 15% (BR-42)
  platformFee: number;
  totalShippingCollected: number;
  refundsDeducted: number;
  netPayoutToMerchant: number;
  status: 'PENDING_CONFIRMATION' | 'MERCHANT_CONFIRMED' | 'PAID';
  createdAt: Date;
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  targetType: 'MERCHANT' | 'USER' | 'RECONCILIATION' | 'COMPLAINT' | 'VOUCHER' | 'SYSTEM';
  targetId: string;
  targetName: string;
  reason?: string;
  performedBy: string;
  createdAt: Date;
}


