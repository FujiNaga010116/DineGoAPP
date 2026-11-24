// ==============================================================================
// DineGo Frontend — Multi-Actor Real-Time Notification Center
// Supports CUSTOMER, MERCHANT, DRIVER, ADMIN, and ALL-actor broadcasts
// Synced via localStorage + CustomEvent + BroadcastChannel across tabs/portals
// ==============================================================================

import type { Role } from '../types';
import type { NavTab } from '../components/common/Header';

export type NotificationTargetRole = Role | 'ALL';

export type NotificationCategory =
  | 'ORDER'
  | 'KITCHEN'
  | 'DELIVERY'
  | 'VOUCHER'
  | 'REVIEW'
  | 'KYC'
  | 'CATERING'
  | 'DISPUTE'
  | 'SYSTEM';

export interface ActorNotification {
  id: string;
  targetRole: NotificationTargetRole;
  targetUserId?: string | null;
  targetMerchantId?: string | null;
  targetDriverId?: string | null;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  timestampMs: number;
  isRead: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  actionTab?: NavTab;
  orderRef?: string;
  senderLabel?: string;
}

export const NOTIFICATIONS_STORAGE_KEY = 'dinego_actor_notifications_v1';
export const NOTIFICATIONS_SYNC_CHANNEL = 'dinego_notifications_sync';
export const NOTIFICATIONS_UPDATED_EVENT = 'dinego_notifications_updated';

function formatNowVi(): string {
  return new Date().toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const DEFAULT_SEED_NOTIFICATIONS: ActorNotification[] = [
  // MERCHANT seeds
  {
    id: 'notif-seed-mer-1',
    targetRole: 'MERCHANT',
    category: 'KYC',
    title: '🛡️ Hồ sơ pháp lý & Định danh Chủ quán đã xác thực',
    message:
      'Hồ sơ GPKD, chứng nhận VSATTP và Avatar nhận diện chủ sở hữu cửa hàng đã được đồng bộ trên hệ thống DineGo Seller.',
    createdAt: 'Hôm nay, 08:30',
    timestampMs: Date.now() - 3600 * 1000 * 3,
    isRead: false,
    priority: 'normal',
    actionTab: 'merchant-kyc',
    senderLabel: 'Ban Quản Trị DineGo',
  },
  {
    id: 'notif-seed-mer-2',
    targetRole: 'MERCHANT',
    category: 'ORDER',
    title: '🍳 Nhắc nhở vận hành Bếp & Bàn giao Shipper',
    message:
      'Vui lòng xác nhận tiếp nhận đơn mới trong vòng 3 phút và bấm xác nhận bàn giao khi tài xế đã tới quán.',
    createdAt: 'Hôm nay, 09:00',
    timestampMs: Date.now() - 3600 * 1000 * 2,
    isRead: false,
    priority: 'high',
    actionTab: 'merchant-orders',
    senderLabel: 'Hệ thống Điều phối',
  },
  // CUSTOMER seeds
  {
    id: 'notif-seed-cus-1',
    targetRole: 'CUSTOMER',
    category: 'VOUCHER',
    title: '🎟️ Săn mã Voucher độc quyền từ các Quán ăn yêu thích!',
    message:
      'Các đối tác nhà hàng vừa phát hành nhiều mã giảm giá trực tiếp tại gian hàng. Lưu mã ngay tại mục Săn Voucher!',
    createdAt: 'Hôm nay, 09:15',
    timestampMs: Date.now() - 3600 * 1000 * 1.8,
    isRead: false,
    priority: 'normal',
    actionTab: 'vouchers',
    senderLabel: 'DineGo Rewards',
  },
  {
    id: 'notif-seed-cus-2',
    targetRole: 'CUSTOMER',
    category: 'ORDER',
    title: '⭐ Đánh giá món ăn & Nhận phản hồi trực tiếp từ Chủ quán',
    message:
      'Sau khi đơn hàng hoàn tất, bạn có thể gửi đánh giá sao và nhận phản hồi trực tiếp từ nhà hàng ngay trên thẻ đơn hàng.',
    createdAt: 'Hôm nay, 09:40',
    timestampMs: Date.now() - 3600 * 1000 * 1.2,
    isRead: false,
    priority: 'normal',
    actionTab: 'orders',
    senderLabel: 'DineGo CSKH',
  },
  // DRIVER seeds
  {
    id: 'notif-seed-drv-1',
    targetRole: 'DRIVER',
    category: 'DELIVERY',
    title: '🛵 Hệ thống định tuyến GPS & Đối soát ca trực sẵn sàng',
    message:
      'Bật trạng thái "Đang trực tuyến" để nhận chuyến mới. Nhớ bấm "Báo đã đến nhà hàng" để quán xác nhận bàn giao món.',
    createdAt: 'Hôm nay, 08:45',
    timestampMs: Date.now() - 3600 * 1000 * 2.5,
    isRead: false,
    priority: 'high',
    actionTab: 'driver-orders',
    senderLabel: 'DineGo Express',
  },
  // ADMIN seeds
  {
    id: 'notif-seed-adm-1',
    targetRole: 'ADMIN',
    category: 'KYC',
    title: '📋 Trung tâm Thẩm định KYC & Giám sát Đa Tác Nhân',
    message:
      'Hệ thống đang ghi nhận thời gian thực mọi thay đổi Hồ sơ pháp lý cửa hàng, Voucher quán, Khiếu nại và Đơn hàng toàn sàn.',
    createdAt: 'Hôm nay, 08:00',
    timestampMs: Date.now() - 3600 * 1000 * 4,
    isRead: false,
    priority: 'normal',
    actionTab: 'admin-merchants',
    senderLabel: 'DineGo Core',
  },
];

export function loadAllActorNotifications(): ActorNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback to seed
  }
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_NOTIFICATIONS));
  } catch {}
  return DEFAULT_SEED_NOTIFICATIONS;
}

export function saveAllActorNotifications(list: ActorNotification[], latestAdded?: ActorNotification): void {
  const trimmed = list.slice(0, 120);
  try {
    const serialized = JSON.stringify(trimmed);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, serialized);
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
        detail: { list: trimmed, latestAdded },
      }),
    );
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(NOTIFICATIONS_SYNC_CHANNEL);
      ch.postMessage({ type: 'SYNC_NOTIFICATIONS', list: trimmed, latestAdded });
      ch.close();
    }
  } catch {}
}

export function pushActorNotification(
  params: Omit<ActorNotification, 'id' | 'createdAt' | 'timestampMs' | 'isRead'> & {
    id?: string;
    createdAt?: string;
  },
): ActorNotification {
  const current = loadAllActorNotifications();
  const newNotif: ActorNotification = {
    id: params.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    targetRole: params.targetRole,
    targetUserId: params.targetUserId,
    targetMerchantId: params.targetMerchantId,
    targetDriverId: params.targetDriverId,
    category: params.category,
    title: params.title,
    message: params.message,
    createdAt: params.createdAt || formatNowVi(),
    timestampMs: Date.now(),
    isRead: false,
    priority: params.priority || 'normal',
    actionTab: params.actionTab,
    orderRef: params.orderRef,
    senderLabel: params.senderLabel || 'Hệ thống DineGo',
  };

  const next = [newNotif, ...current];
  saveAllActorNotifications(next, newNotif);
  return newNotif;
}

export function pushMultiActorNotifications(
  items: Array<Omit<ActorNotification, 'id' | 'createdAt' | 'timestampMs' | 'isRead'>>,
): ActorNotification[] {
  if (!items.length) return [];
  const current = loadAllActorNotifications();
  const nowStr = formatNowVi();
  const nowMs = Date.now();
  const createdList: ActorNotification[] = items.map((params, idx) => ({
    id: `notif-${nowMs}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    targetRole: params.targetRole,
    targetUserId: params.targetUserId,
    targetMerchantId: params.targetMerchantId,
    targetDriverId: params.targetDriverId,
    category: params.category,
    title: params.title,
    message: params.message,
    createdAt: nowStr,
    timestampMs: nowMs + idx,
    isRead: false,
    priority: params.priority || 'normal',
    actionTab: params.actionTab,
    orderRef: params.orderRef,
    senderLabel: params.senderLabel || 'Hệ thống DineGo',
  }));

  const next = [...createdList, ...current];
  saveAllActorNotifications(next, createdList[0]);
  return createdList;
}

export function filterNotificationsForActor(
  all: ActorNotification[],
  context: {
    role: Role;
    userId?: string;
    merchantId?: string;
    driverId?: string;
  },
): ActorNotification[] {
  return all.filter((n) => {
    if (n.targetRole !== 'ALL' && n.targetRole !== context.role) {
      return false;
    }
    if (context.role === 'MERCHANT' && n.targetMerchantId && context.merchantId) {
      return n.targetMerchantId === context.merchantId;
    }
    if (context.role === 'DRIVER' && n.targetDriverId && context.driverId) {
      return n.targetDriverId === context.driverId;
    }
    if (context.role === 'CUSTOMER' && n.targetUserId && context.userId) {
      return n.targetUserId === context.userId;
    }
    return true;
  });
}

export function markNotificationAsRead(notifId: string): ActorNotification[] {
  const current = loadAllActorNotifications();
  const next = current.map((n) => (n.id === notifId ? { ...n, isRead: true } : n));
  saveAllActorNotifications(next);
  return next;
}

export function markAllNotificationsReadForActor(context: {
  role: Role;
  userId?: string;
  merchantId?: string;
  driverId?: string;
}): ActorNotification[] {
  const current = loadAllActorNotifications();
  const matchedIds = new Set(filterNotificationsForActor(current, context).map((n) => n.id));
  const next = current.map((n) => (matchedIds.has(n.id) ? { ...n, isRead: true } : n));
  saveAllActorNotifications(next);
  return next;
}

export function clearReadNotificationsForActor(context: {
  role: Role;
  userId?: string;
  merchantId?: string;
  driverId?: string;
}): ActorNotification[] {
  const current = loadAllActorNotifications();
  const matchedIds = new Set(filterNotificationsForActor(current, context).map((n) => n.id));
  const next = current.filter((n) => !(matchedIds.has(n.id) && n.isRead));
  saveAllActorNotifications(next);
  return next;
}
