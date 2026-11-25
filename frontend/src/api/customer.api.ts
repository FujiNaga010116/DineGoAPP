// ==============================================================================
// DineGo Frontend — Customer Portal API Client
// Gom nhóm các API dành cho Khách hàng (AI Chatbox, Lịch sử chat, Đặt nhóm, Voucher)
// ==============================================================================

import type { SafeRequestFn } from './admin.api';

export function createCustomerApi(safeRequest: SafeRequestFn) {
  return {
    sendWidgetChat: (payload: {
      message: string;
      userId?: string;
      userEmail?: string;
      sessionId?: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string; recommendedIds?: string[] }>;
    }) =>
      safeRequest<{
        sessionId: string;
        reply: string;
        recommendations?: any[];
        quickActions?: Array<{ label: string; tab: string }>;
        llmProvider?: string;
      }>('/ai/widget-chat', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getWidgetSessions: (userId: string, email?: string) => {
      const qs = email ? `?email=${encodeURIComponent(email)}` : '';
      return safeRequest<Array<{ id: string; title: string; lastMessage: string; updatedAt: string }>>(
        `/ai/widget-sessions/${encodeURIComponent(userId)}${qs}`,
      );
    },
    getWidgetSessionMessages: (sessionId: string) =>
      safeRequest<Array<{ id: string; sender: 'ai' | 'user'; text: string; timestamp: string }>>(
        `/ai/widget-sessions/${encodeURIComponent(sessionId)}/messages`,
      ),
    getLivePromotions: () => safeRequest<any[]>('/promotions/live'),
    syncLivePromotions: (vouchers: any[]) =>
      safeRequest('/promotions/live/sync', {
        method: 'POST',
        body: JSON.stringify({ vouchers }),
      }),
    claimPromotion: (code: string, userId: string) =>
      safeRequest('/promotions/live/claim', {
        method: 'POST',
        body: JSON.stringify({ code, userId }),
      }),
    getGroupOrderRooms: () => safeRequest<any[]>('/group-orders/live/rooms'),
    createOrUpdateGroupRoom: (room: Record<string, any>) =>
      safeRequest('/group-orders/live/rooms', {
        method: 'POST',
        body: JSON.stringify(room),
      }),
    getGroupOrderAccounts: () => safeRequest<any[]>('/group-orders/live/accounts'),
    syncGroupOrderAccount: (account: Record<string, any>) =>
      safeRequest('/group-orders/live/accounts/sync', {
        method: 'POST',
        body: JSON.stringify(account),
      }),
  };
}
