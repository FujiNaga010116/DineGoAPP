// ==============================================================================
// DineGo Frontend — Catering & Feast Booking API Client
// ==============================================================================

import type { SafeRequestFn } from './admin.api';

export function createCateringApi(safeRequest: SafeRequestFn) {
  return {
    getPackages: (query?: { eventType?: string; merchantId?: string; minPrice?: number; maxPrice?: number }) => {
      const params = query ? '?' + new URLSearchParams(query as any).toString() : '';
      return safeRequest<any[]>(`/catering/packages${params}`);
    },
    getPackageById: (id: string) =>
      safeRequest<any>(`/catering/packages/${encodeURIComponent(id)}`),
    calculateQuote: (dto: { packageId: string; tableCount: number; customDishes?: string[] }) =>
      safeRequest<any>('/catering/quote', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    getMerchantAvailability: (merchantId: string, date: string, tables = 10) =>
      safeRequest<any>(`/catering/merchants/${encodeURIComponent(merchantId)}/availability?date=${encodeURIComponent(date)}&tables=${tables}`),
    getCapacityConfig: (merchantId: string) =>
      safeRequest<any>(`/catering/merchants/${encodeURIComponent(merchantId)}/capacity-config`),
    updateCapacityConfig: (merchantId: string, dto: any) =>
      safeRequest<any>(`/catering/merchants/${encodeURIComponent(merchantId)}/capacity-config`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    toggleBlockSlot: (merchantId: string, dto: { date: string; timeSlot?: string; isBlocked: boolean; reason?: string }) =>
      safeRequest<any>(`/catering/merchants/${encodeURIComponent(merchantId)}/slots/toggle-block`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    toggleDishSoldOut: (packageId: string, dishId: string, isSoldOut: boolean) =>
      safeRequest<any>(`/catering/packages/${encodeURIComponent(packageId)}/dishes/${encodeURIComponent(dishId)}/toggle-sold-out`, {
        method: 'PATCH',
        body: JSON.stringify({ isSoldOut }),
      }),
    createBooking: (dto: any) =>
      safeRequest<any>('/catering/bookings', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    verifyCapacity: (bookingId: string, dto: { action: 'ACCEPT' | 'REJECT'; reason?: string }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/verify-capacity`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    proposeMenu: (bookingId: string, dto: { reason: string; dishes: any[]; priceDeltaPerTable?: number }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/propose-menu`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    respondProposal: (
      bookingId: string,
      dto: {
        proposalId?: string;
        action: 'ACCEPT' | 'REJECT' | 'REVISE';
        notes?: string;
        customerFeedback?: string;
      },
    ) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/respond-proposal`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    initiateDepositPayment: (bookingId: string, dto: { paymentMethod: string }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/pay-deposit`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    confirmDepositPayment: (bookingId: string, transId?: string) => {
      const query = transId ? `?transId=${encodeURIComponent(transId)}` : '';
      return safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/confirm-deposit${query}`, {
        method: 'POST',
      });
    },
    settleRemainingBalance: (bookingId: string, dto: { paymentMethod: string }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/pay-remaining`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    reviewBooking: (bookingId: string, dto: { status: string; merchantNotes?: string }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    getBookingTimeline: (bookingId: string) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/timeline`),
    getBookingAuditHistory: (bookingId: string) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/audit-history`),
    getMerchantBookings: (merchantId: string) =>
      safeRequest<any[]>(`/catering/merchant/${encodeURIComponent(merchantId)}/bookings`),
    getUserBookings: () =>
      safeRequest<any[]>('/catering/user/me/bookings'),
    getDishSupplies: (merchantId: string) =>
      safeRequest<any[]>(`/catering/merchants/${encodeURIComponent(merchantId)}/dish-supplies`),
    updateDishSupply: (merchantId: string, dishId: string, dto: any) =>
      safeRequest<any>(`/catering/merchants/${encodeURIComponent(merchantId)}/dish-supplies/${encodeURIComponent(dishId)}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    getForecastOverload: (merchantId: string) =>
      safeRequest<any>(`/catering/merchants/${encodeURIComponent(merchantId)}/forecast-overload`),
    requestKitchenCheck: (bookingId: string) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/request-kitchen-check`, {
        method: 'POST',
      }),
    respondKitchenCheck: (bookingId: string, dto: { status: string; notes?: string; proposedReplacements?: any[] }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/respond-kitchen-check`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    getKitchenOrders: (merchantId: string) =>
      safeRequest<any>(`/catering/merchants/${encodeURIComponent(merchantId)}/kitchen-orders`),
    updateKitchenProgress: (bookingId: string, dto: { progressStatus: string; notes?: string }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/kitchen-progress`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    preEventCheck: (bookingId: string, dto: any) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/pre-event-check`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    cancelAndRefundBooking: (bookingId: string, dto: { reason: string; processRefund: boolean; refundPercentage?: number }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/cancel-refund`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    requestPostDepositChange: (bookingId: string, dto: any) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/request-post-deposit-change`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    confirmDeposit: (bookingId: string, options?: { transId?: string; paymentMethod?: string; dispatchToKitchen?: boolean }) => {
      const q = new URLSearchParams();
      if (options?.transId) q.append('transId', options.transId);
      if (options?.paymentMethod) q.append('paymentMethod', options.paymentMethod);
      if (options?.dispatchToKitchen) q.append('dispatchToKitchen', 'true');
      const qs = q.toString() ? `?${q.toString()}` : '';
      return safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/confirm-deposit${qs}`, {
        method: 'POST',
      });
    },
    dispatchToKitchen: (bookingId: string) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/dispatch-kitchen`, {
        method: 'POST',
      }),
    payDeposit: (bookingId: string, dto: { paymentMethod: string }) =>
      safeRequest<any>(`/catering/bookings/${encodeURIComponent(bookingId)}/pay-deposit`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  };
}
