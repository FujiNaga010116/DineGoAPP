// ==============================================================================
// DineGo Frontend — Merchant Portal API Client
// Gom nhóm các API dành cho Nhà hàng (Đơn hàng, Đặt mâm cỗ/Bếp, Rút doanh thu)
// ==============================================================================

import type { SafeRequestFn } from './admin.api';

export function createMerchantApi(safeRequest: SafeRequestFn) {
  return {
    saveOrder: (order: Record<string, any>) =>
      safeRequest('/admin/database/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      }),
    updateOrderStatus: (
      orderId: string,
      payload: { status: string; assignedDriverId?: string; assignedDriverName?: string },
    ) =>
      safeRequest(`/admin/database/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    getMerchantBookings: (merchantId: string) =>
      safeRequest<any[]>(`/catering/merchant/${encodeURIComponent(merchantId)}/bookings`),
    getKitchenOrders: (merchantId: string) =>
      safeRequest<any>(`/catering/merchants/${encodeURIComponent(merchantId)}/kitchen-orders`),
    requestWithdrawal: (withdrawal: Record<string, any>) =>
      safeRequest('/admin/database/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ ...withdrawal, actorType: 'MERCHANT' }),
      }),
  };
}
