// ==============================================================================
// DineGo Frontend — Multi-Actor Real-Time Notification Center
// Supports CUSTOMER, MERCHANT, DRIVER, ADMIN, and ALL-actor broadcasts
// Synced via localStorage + CustomEvent + BroadcastChannel across tabs/portals
// ==============================================================================

import type { Role } from '../types';
import type { NavTab } from '../actors/common/components/Header';
import { notificationApi } from '../api/notification.api';

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
  readByUserIds?: string[];
  clearedByUserIds?: string[];
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
      'Vui lòng xác nhận tiếp nhận đơn mới trong vòng 3 phút và bấm xác nhận bàn giao khi tài xế đã tới quán trong bán kính 100m.',
    createdAt: 'Hôm nay, 09:00',
    timestampMs: Date.now() - 3600 * 1000 * 2,
    isRead: false,
    priority: 'high',
    actionTab: 'merchant-orders',
    senderLabel: 'Hệ thống Điều phối',
  },
  {
    id: 'notif-seed-mer-3',
    targetRole: 'MERCHANT',
    category: 'VOUCHER',
    title: '🎟️ Tạo mã giảm giá độc quyền để kích cầu doanh thu quán',
    message:
      'Chương trình Flash Sale giờ vàng đang mở! Bạn có thể phát hành voucher độc quyền giảm giá trực tiếp cho khách quen.',
    createdAt: 'Hôm nay, 09:20',
    timestampMs: Date.now() - 3600 * 1000 * 1.5,
    isRead: false,
    priority: 'normal',
    actionTab: 'merchant-vouchers',
    senderLabel: 'Kênh Khuyến Mãi',
  },
  {
    id: 'notif-seed-mer-4',
    targetRole: 'MERCHANT',
    category: 'REVIEW',
    title: '⭐ Khách hàng vừa để lại đánh giá 5 sao cho món Cơm Tấm Sườn',
    message:
      'Thực khách Nguyễn Văn An khen ngợi chất lượng món ăn nóng hổi và thời gian chuẩn bị món nhanh chóng.',
    createdAt: 'Hôm nay, 09:45',
    timestampMs: Date.now() - 3600 * 1000 * 0.8,
    isRead: false,
    priority: 'normal',
    actionTab: 'merchant-analytics',
    senderLabel: 'CSKH Đánh Giá',
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
  {
    id: 'notif-seed-cus-3',
    targetRole: 'CUSTOMER',
    category: 'DELIVERY',
    title: '📍 Đơn hàng đang được Shipper DineGo Express giao tới bạn',
    message:
      'Tài xế đang di chuyển trên lộ trình tối ưu và dự kiến có mặt tại điểm giao trong vòng 15 phút. Theo dõi trực tiếp trên bản đồ!',
    createdAt: 'Hôm nay, 10:10',
    timestampMs: Date.now() - 3600 * 1000 * 0.5,
    isRead: false,
    priority: 'high',
    actionTab: 'tracking',
    senderLabel: 'DineGo Tracking',
  },
  // DRIVER seeds
  {
    id: 'notif-seed-drv-1',
    targetRole: 'DRIVER',
    category: 'DELIVERY',
    title: '🛵 Hệ thống định tuyến GPS & Geofence 100m sẵn sàng',
    message:
      'Bật trạng thái "Đang trực tuyến" để nhận chuyến mới. Nhớ bấm "Báo đã đến nhà hàng" trong bán kính 100m để quán bàn giao món.',
    createdAt: 'Hôm nay, 08:45',
    timestampMs: Date.now() - 3600 * 1000 * 2.5,
    isRead: false,
    priority: 'high',
    actionTab: 'driver-orders',
    senderLabel: 'DineGo Express',
  },
  {
    id: 'notif-seed-drv-2',
    targetRole: 'DRIVER',
    category: 'ORDER',
    title: '💰 Đơn hàng giao thành công — Tiền cước đã cộng vào Ví thu nhập',
    message:
      'Chuyến xe hoàn thành đúng hẹn. Bạn nhận được 100% tiền cước vận chuyển và tiền tip từ khách hàng.',
    createdAt: 'Hôm nay, 09:30',
    timestampMs: Date.now() - 3600 * 1000 * 1.3,
    isRead: false,
    priority: 'normal',
    actionTab: 'driver-earnings',
    senderLabel: 'Ví Tài Xế',
  },
  {
    id: 'notif-seed-drv-3',
    targetRole: 'DRIVER',
    category: 'KYC',
    title: '📸 Xác thực ảnh chân dung & Giấy tờ xe thành công',
    message:
      'Hồ sơ phương tiện Honda Winner X và ảnh chân dung đồng phục của bạn đã được kiểm duyệt hợp lệ trên hệ thống.',
    createdAt: 'Hôm nay, 09:50',
    timestampMs: Date.now() - 3600 * 1000 * 0.7,
    isRead: false,
    priority: 'normal',
    actionTab: 'driver-profile',
    senderLabel: 'Ban Thẩm Định',
  },
  {
    id: 'notif-seed-drv-4',
    targetRole: 'DRIVER',
    category: 'DELIVERY',
    title: '🎁 Thưởng ca trực năng động hôm nay',
    message:
      'Hoàn thành 5 chuyến xe trong ca trực để nhận thêm thưởng 50.000đ từ DineGo Express!',
    createdAt: 'Hôm nay, 10:15',
    timestampMs: Date.now() - 3600 * 1000 * 0.3,
    isRead: false,
    priority: 'high',
    actionTab: 'driver-history',
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
  {
    id: 'notif-seed-adm-2',
    targetRole: 'ADMIN',
    category: 'DISPUTE',
    title: '⚖️ Cảnh báo giám sát đối soát & Khiếu nại vận chuyển',
    message:
      'Đội ngũ điều hành ghi nhận tỷ lệ giao hàng đúng hẹn đạt 98.4%. Không có tranh chấp nghiêm trọng cần can thiệp khẩn cấp.',
    createdAt: 'Hôm nay, 09:10',
    timestampMs: Date.now() - 3600 * 1000 * 2.2,
    isRead: false,
    priority: 'high',
    actionTab: 'admin-complaints',
    senderLabel: 'Hệ Thống Phân Xử',
  },
  {
    id: 'notif-seed-adm-3',
    targetRole: 'ADMIN',
    category: 'DELIVERY',
    title: '🛵 Đội ngũ tài xế hoàn tất xác thực chân dung & phương tiện',
    message:
      'Đã duyệt bổ sung các tài xế mới đủ điều kiện tham gia mạng lưới vận chuyển DineGo Express.',
    createdAt: 'Hôm nay, 09:55',
    timestampMs: Date.now() - 3600 * 1000 * 0.6,
    isRead: false,
    priority: 'normal',
    actionTab: 'admin-drivers',
    senderLabel: 'Quản Lý Tài Xế',
  },
];

export function loadAllActorNotifications(): ActorNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge missing seed notifications so all 4 actors always have initial operational notifications
        const existingIds = new Set(parsed.map((p: any) => p.id));
        const missingSeeds = DEFAULT_SEED_NOTIFICATIONS.filter((s) => !existingIds.has(s.id));
        if (missingSeeds.length > 0) {
          const merged = [...parsed, ...missingSeeds];
          localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
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
  void notificationApi.createBatch([newNotif]);
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
  void notificationApi.createBatch(createdList);
  return createdList;
}

export function isNotificationReadForUser(
  notif: ActorNotification,
  userId?: string,
): boolean {
  if (userId && Array.isArray(notif.readByUserIds)) {
    return notif.readByUserIds.includes(userId);
  }
  return Boolean(notif.isRead);
}

export function mergeServerNotifications(
  serverItems: ActorNotification[],
): ActorNotification[] {
  const current = loadAllActorNotifications();
  const byId = new Map<string, ActorNotification>();
  for (const item of current) {
    byId.set(item.id, item);
  }
  for (const s of serverItems) {
    const existing = byId.get(s.id);
    byId.set(s.id, {
      ...existing,
      ...s,
      isRead: Boolean(s.isRead),
      readByUserIds: undefined,
    });
  }
  const merged = Array.from(byId.values())
    .sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0))
    .slice(0, 120);
  saveAllActorNotifications(merged);
  return merged;
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
    if (context.userId && n.clearedByUserIds?.includes(context.userId)) {
      return false;
    }
    if (n.targetRole !== 'ALL' && n.targetRole !== context.role) {
      return false;
    }
    if (n.targetMerchantId) {
      return context.role === 'MERCHANT' && n.targetMerchantId === context.merchantId;
    }
    if (n.targetDriverId) {
      return context.role === 'DRIVER' && n.targetDriverId === context.driverId;
    }
    if (n.targetUserId) {
      return n.targetUserId === context.userId;
    }
    return true;
  });
}

export function markNotificationAsRead(
  notifId: string,
  userId?: string,
): ActorNotification[] {
  const current = loadAllActorNotifications();
  const next = current.map((n) => {
    if (n.id !== notifId) return n;
    const isScoped = Boolean(n.targetUserId || n.targetMerchantId || n.targetDriverId);
    const prevReaders = Array.isArray(n.readByUserIds) ? n.readByUserIds : [];
    const nextReaders =
      userId && !prevReaders.includes(userId) ? [...prevReaders, userId] : prevReaders;
    return {
      ...n,
      isRead: isScoped || !userId ? true : n.isRead,
      readByUserIds: userId ? nextReaders : n.readByUserIds,
    };
  });
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
  const next = current.map((n) => {
    if (!matchedIds.has(n.id)) return n;
    const isScoped = Boolean(n.targetUserId || n.targetMerchantId || n.targetDriverId);
    const prevReaders = Array.isArray(n.readByUserIds) ? n.readByUserIds : [];
    const nextReaders =
      context.userId && !prevReaders.includes(context.userId)
        ? [...prevReaders, context.userId]
        : prevReaders;
    return {
      ...n,
      isRead: isScoped || !context.userId ? true : n.isRead,
      readByUserIds: context.userId ? nextReaders : n.readByUserIds,
    };
  });
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
  const next = current
    .map((n) => {
      if (!(matchedIds.has(n.id) && isNotificationReadForUser(n, context.userId))) {
        return n;
      }
      if (context.userId) {
        const prevCleared = Array.isArray(n.clearedByUserIds) ? n.clearedByUserIds : [];
        if (!prevCleared.includes(context.userId)) {
          return { ...n, clearedByUserIds: [...prevCleared, context.userId] };
        }
        return n;
      }
      return null;
    })
    .filter((n): n is ActorNotification => n !== null);
  saveAllActorNotifications(next);
  return next;
}
