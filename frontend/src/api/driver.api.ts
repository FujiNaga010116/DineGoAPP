// ==============================================================================
// DineGo Frontend — Driver Portal API Client
// Gom nhóm các API dành cho Tài xế (Cập nhật GPS, Trạng thái giao hàng, Khiếu nại/Bom hàng)
// ==============================================================================

import type { SafeRequestFn } from './admin.api';

export function createDriverApi(safeRequest: SafeRequestFn) {
  return {
    updateOrderGps: (orderId: string, payload: { lat: number; lng: number; driverId?: string }) =>
      safeRequest(`/tracking/orders/${encodeURIComponent(orderId)}/gps`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateOrderDeliveryStatus: (
      orderId: string,
      payload: { status: string; assignedDriverId?: string; assignedDriverName?: string },
    ) =>
      safeRequest(`/admin/database/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    reportDeliveryDispute: (dispute: Record<string, any>) =>
      safeRequest('/admin/database/disputes', {
        method: 'POST',
        body: JSON.stringify(dispute),
      }),
    requestWithdrawal: (withdrawal: Record<string, any>) =>
      safeRequest('/admin/database/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ ...withdrawal, actorType: 'DRIVER' }),
      }),
  };
}
