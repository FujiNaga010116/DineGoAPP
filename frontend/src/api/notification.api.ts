// ==============================================================================
// DineGo Frontend — Notification API Client
// Syncs multi-actor notifications with NestJS + SQL Server backend
// ==============================================================================

import type { ActorNotification } from '../utils/notifications';
import { safeRequest } from './http';

function hasAuthToken(): boolean {
  try {
    return Boolean(localStorage.getItem('dinego_access_token'));
  } catch {
    return false;
  }
}

export const notificationApi = {
  async list(params: {
    role: string;
    merchantId?: string;
    driverId?: string;
  }): Promise<ActorNotification[] | null> {
    if (!hasAuthToken()) return null;
    const qs = new URLSearchParams();
    qs.set('role', params.role);
    if (params.merchantId) qs.set('merchantId', params.merchantId);
    if (params.driverId) qs.set('driverId', params.driverId);
    return safeRequest<ActorNotification[]>(`/notifications?${qs.toString()}`);
  },

  async createBatch(items: ActorNotification[]): Promise<ActorNotification[] | null> {
    if (!hasAuthToken() || !items.length) return null;
    return safeRequest<ActorNotification[]>('/notifications', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  async markAsRead(notificationId: string): Promise<void> {
    if (!hasAuthToken() || !notificationId) return;
    await safeRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
    });
  },

  async markAllAsRead(params: {
    role: string;
    merchantId?: string;
    driverId?: string;
  }): Promise<void> {
    if (!hasAuthToken()) return;
    await safeRequest('/notifications/read-all', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  async clearRead(params: {
    role: string;
    merchantId?: string;
    driverId?: string;
  }): Promise<void> {
    if (!hasAuthToken()) return;
    const qs = new URLSearchParams();
    qs.set('role', params.role);
    if (params.merchantId) qs.set('merchantId', params.merchantId);
    if (params.driverId) qs.set('driverId', params.driverId);
    await safeRequest(`/notifications/clear-read?${qs.toString()}`, {
      method: 'DELETE',
    });
  },
};
