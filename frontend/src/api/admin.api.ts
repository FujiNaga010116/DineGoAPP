// ==============================================================================
// DineGo Frontend — Admin Portal API Client
// Tách riêng từ client.ts để dễ bảo trì & tránh xung đột Git khi làm việc nhóm
// ==============================================================================

export type SafeRequestFn = <T = any>(path: string, options?: RequestInit) => Promise<T | null>;

export function createAdminApi(safeRequest: SafeRequestFn) {
  return {
    getSystemOverview: () => safeRequest('/admin/dashboard/overview'),
    getAllUsers: () => safeRequest('/admin/users'),
    updateUserStatus: (userId: string, isActive: boolean, reason?: string, email?: string) =>
      safeRequest(`/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive, reason, email }),
      }),
    updateMerchantStatus: (
      merchantId: string,
      status: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
      reason?: string,
    ) =>
      safeRequest(`/admin/merchants/${encodeURIComponent(merchantId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    getDrivers: () => safeRequest('/admin/drivers'),
    updateDriverStatus: (driverId: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) =>
      safeRequest(`/admin/drivers/${encodeURIComponent(driverId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    getSystemSettings: () => safeRequest('/admin/settings'),
    updateSystemSettings: (payload: {
      platformCommissionRate?: number;
      peakHourSurgeFee?: number;
      minOrderForFreeShipping?: number;
      autoDispatchRangeKm?: number;
      maintenanceMode?: boolean;
      reason?: string;
    }) =>
      safeRequest('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    getAuditLogs: () => safeRequest('/admin/audit-logs'),
    getMonthlyReconciliation: (merchantId?: string, month?: string) => {
      const params = new URLSearchParams();
      if (merchantId) params.set('merchantId', merchantId);
      if (month) params.set('month', month);
      const qs = params.toString();
      return safeRequest(`/admin/reconciliation/monthly${qs ? `?${qs}` : ''}`);
    },
    confirmReconciliationPayout: (reconciliationId: string) =>
      safeRequest(`/admin/reconciliation/${encodeURIComponent(reconciliationId)}/payout`, {
        method: 'PATCH',
      }),
    getComplaints: (merchantId?: string) =>
      safeRequest(`/complaints${merchantId ? `?merchantId=${encodeURIComponent(merchantId)}` : ''}`),
    resolveComplaint: (
      complaintId: string,
      payload: {
        decision: 'RESOLVED_REFUND' | 'RESOLVED_COMPENSATE' | 'REJECTED';
        resolutionNotes: string;
        compensationAmount?: number;
        faultParty?: 'MERCHANT' | 'DRIVER' | 'PLATFORM';
      },
    ) =>
      safeRequest(`/complaints/${encodeURIComponent(complaintId)}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    getDatabaseLedger: () =>
      safeRequest<{
        orders: any[];
        feastBookings: any[];
        complaints: any[];
        reviews: any[];
        deliveryDisputes?: any[];
        merchantWithdrawals?: any[];
        driverWithdrawals?: any[];
      }>('/admin/database/ledger'),
    saveDatabaseOrder: (order: Record<string, any>) =>
      safeRequest('/admin/database/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      }),
    updateDatabaseOrderStatus: (
      orderId: string,
      payload: { status: string; assignedDriverId?: string; assignedDriverName?: string },
    ) =>
      safeRequest(`/admin/database/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    saveDatabaseFeastBooking: (booking: Record<string, any>) =>
      safeRequest('/admin/database/feast-bookings', {
        method: 'POST',
        body: JSON.stringify(booking),
      }),
    updateDatabaseFeastBookingStatus: (
      bookingId: string,
      payload: { status: string; depositPaid?: boolean },
    ) =>
      safeRequest(`/admin/database/feast-bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    createDatabaseComplaint: (complaint: Record<string, any>) =>
      safeRequest('/admin/database/complaints', {
        method: 'POST',
        body: JSON.stringify(complaint),
      }),
    resolveDatabaseComplaint: (
      complaintId: string,
      payload: {
        status: string;
        resolutionNotes?: string;
        compensationAmount?: number;
        faultParty?: 'MERCHANT' | 'DRIVER' | 'PLATFORM';
      },
    ) =>
      safeRequest(`/admin/database/complaints/${encodeURIComponent(complaintId)}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    createDatabaseDispute: (dispute: Record<string, any>) =>
      safeRequest('/admin/database/disputes', {
        method: 'POST',
        body: JSON.stringify(dispute),
      }),
    resolveDatabaseDispute: (
      disputeId: string,
      status: 'COMPENSATED_DRIVER' | 'REJECTED',
      adminNote?: string,
    ) =>
      safeRequest(`/admin/database/disputes/${encodeURIComponent(disputeId)}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote }),
      }),
    createDatabaseWithdrawal: (withdrawal: Record<string, any>) =>
      safeRequest('/admin/database/withdrawals', {
        method: 'POST',
        body: JSON.stringify(withdrawal),
      }),
    processDatabaseWithdrawal: (
      withdrawalId: string,
      status: 'APPROVED' | 'REJECTED',
      note?: string,
    ) =>
      safeRequest(`/admin/database/withdrawals/${encodeURIComponent(withdrawalId)}/process`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      }),
    getKnowledgeChunks: () =>
      safeRequest<Array<{ id: string; source: string; content: string; authorName: string; createdAt: string }>>(
        '/admin/database/knowledge',
      ),
    createKnowledgeChunk: (payload: { source: string; content: string }) =>
      safeRequest<{ id: string; source: string; content: string; authorName: string; createdAt: string }>(
        '/admin/database/knowledge',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ),
    deleteKnowledgeChunk: (id: string) =>
      safeRequest(`/admin/database/knowledge/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    getAiSystemPrompt: () => safeRequest<{ prompt: string }>('/admin/database/ai-prompt'),
    saveAiSystemPrompt: (prompt: string) =>
      safeRequest<{ saved: boolean; prompt: string }>('/admin/database/ai-prompt', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }),
  };
}
