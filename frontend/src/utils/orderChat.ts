// ==============================================================================
// DineGo Frontend — Real-time Order Chat System (Customer <-> Merchant & Customer <-> Driver)
// - Supports cross-tab real-time sync via BroadcastChannel & LocalStorage
// - Auto-seeds initial welcome messages from Merchant and Driver
// - Instant quick reply chips (Canned Responses)
// ==============================================================================

import type { Order, OrderChatChannel, OrderChatMessage, OrderChatSenderRole } from '../types';

export const ORDER_CHAT_STORAGE_KEY = 'dinego_order_chat_messages_v1';
const CHAT_BROADCAST_CHANNEL = 'dinego_order_chat_broadcast';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHAT_BROADCAST_CHANNEL);
  }
} catch {
  broadcastChannel = null;
}

export function getAllChatMessages(): OrderChatMessage[] {
  try {
    const raw = localStorage.getItem(ORDER_CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveAllChatMessages(messages: OrderChatMessage[]): void {
  try {
    localStorage.setItem(ORDER_CHAT_STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent('dinego_order_chat_updated'));
  } catch {}
}

export function getOrderChatMessages(
  orderId: string,
  channel?: OrderChatChannel,
): OrderChatMessage[] {
  const all = getAllChatMessages();
  return all.filter((m) => {
    if (m.orderId !== orderId) return false;
    if (channel && m.channel !== channel) return false;
    return true;
  });
}

export function seedInitialOrderGreetings(order: Order, driverName?: string): void {
  const all = getAllChatMessages();
  let updated = false;

  // 1. Initial Merchant Greeting
  const hasMerchantMsg = all.some(
    (m) => m.orderId === order.id && m.channel === 'CUSTOMER_MERCHANT',
  );
  if (!hasMerchantMsg) {
    const merchantGreeting: OrderChatMessage = {
      id: `chat-${order.id}-merchant-init`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      channel: 'CUSTOMER_MERCHANT',
      senderRole: 'MERCHANT',
      senderId: order.merchant?.id || 'merchant-store',
      senderName: order.merchant?.name || 'Nhà hàng',
      message: `Chào bạn! Quán đã nhận đơn #${order.orderNumber} và đang chuẩn bị món. Bạn có lưu ý gì về khẩu vị (ít cay, không hành, ít đá...) thì cứ nhắn quán nhé!`,
      timestamp: new Date(Date.now() - 60000).toISOString(),
      isRead: false,
    };
    all.push(merchantGreeting);
    updated = true;
  }

  // 2. Initial Driver Greeting (when assigned)
  const drvName = driverName || order.assignedDriverName;
  if (drvName && (order.assignedDriverId || drvName !== 'Chưa ghép tài xế')) {
    const hasDriverMsg = all.some(
      (m) => m.orderId === order.id && m.channel === 'CUSTOMER_DRIVER',
    );
    if (!hasDriverMsg) {
      const driverGreeting: OrderChatMessage = {
        id: `chat-${order.id}-driver-init`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        channel: 'CUSTOMER_DRIVER',
        senderRole: 'DRIVER',
        senderId: order.assignedDriverId || 'driver-partner',
        senderName: drvName,
        message: `Chào bạn, mình là shipper ${drvName} phụ trách giao đơn #${order.orderNumber}. Mình sẽ giao món nóng hổi tới bạn trong thời gian sớm nhất!`,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      all.push(driverGreeting);
      updated = true;
    }
  }

  if (updated) {
    saveAllChatMessages(all);
  }
}

export function sendOrderChatMessage(params: {
  orderId: string;
  orderNumber: string;
  channel: OrderChatChannel;
  senderRole: OrderChatSenderRole;
  senderId: string;
  senderName: string;
  message: string;
}): OrderChatMessage {
  const newMsg: OrderChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    channel: params.channel,
    senderRole: params.senderRole,
    senderId: params.senderId,
    senderName: params.senderName,
    message: params.message.trim(),
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  const all = getAllChatMessages();
  all.push(newMsg);
  saveAllChatMessages(all);

  // Broadcast to other tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(newMsg);
    } catch {}
  }

  return newMsg;
}

export function markOrderMessagesAsRead(
  orderId: string,
  channel: OrderChatChannel,
  currentUserId: string,
): void {
  const all = getAllChatMessages();
  let modified = false;

  const next = all.map((m) => {
    if (m.orderId === orderId && m.channel === channel && m.senderId !== currentUserId && !m.isRead) {
      modified = true;
      return { ...m, isRead: true };
    }
    return m;
  });

  if (modified) {
    saveAllChatMessages(next);
  }
}

export function getUnreadChatCount(
  orderId: string,
  channel: OrderChatChannel,
  currentUserId: string,
): number {
  const all = getAllChatMessages();
  return all.filter(
    (m) =>
      m.orderId === orderId &&
      m.channel === channel &&
      m.senderId !== currentUserId &&
      m.isRead === false,
  ).length;
}

export function subscribeOrderChat(callback: (msg: OrderChatMessage) => void): () => void {
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object') {
      callback(event.data as OrderChatMessage);
    }
  };

  const handleCustomEvent = () => {
    // When local storage changes in the same window
    const all = getAllChatMessages();
    const latest = all[all.length - 1];
    if (latest) callback(latest);
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('dinego_order_chat_updated', handleCustomEvent);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('dinego_order_chat_updated', handleCustomEvent);
  };
}

export const QUICK_CANNED_REPLIES: Record<
  OrderChatSenderRole,
  Record<OrderChatChannel, string[]>
> = {
  CUSTOMER: {
    CUSTOMER_MERCHANT: [
      'Cho em xin thêm nước sốt / tương ớt ạ',
      'Ít đá ít đường giúp em nhé!',
      'Không để hành lá / rau thơm giúp em',
      'Quán làm nhanh giúp em đang vội nhé ạ',
    ],
    CUSTOMER_DRIVER: [
      'Bấm chuông giúp em khi tới nơi nhé',
      'Em đang xuống sảnh nhận hàng ạ',
      'Gửi bảo vệ sảnh giúp em nhé',
      'Tới cổng alo em ra liền ạ!',
    ],
  },
  MERCHANT: {
    CUSTOMER_MERCHANT: [
      'Quán đã nhận lưu ý và đang làm ngay nhé!',
      'Món ăn đang được đóng gói nóng hổi ạ',
      'Món đã sẵn sàng và bàn giao cho shipper rồi nhé',
      'Cảm ơn bạn đã ủng hộ quán!',
    ],
    CUSTOMER_DRIVER: [
      'Món đang chuẩn bị, khoảng 5 phút nữa xong nhé tài xế',
      'Món đã xong mời tài xế vào quầy lấy',
    ],
  },
  DRIVER: {
    CUSTOMER_MERCHANT: [
      'Tài xế đã có mặt tại quán chờ lấy món',
      'Quán chuẩn bị nhanh giúp tài xế nhé',
    ],
    CUSTOMER_DRIVER: [
      'Mình đang trên đường giao tới bạn nhé',
      'Mình đã đến trước cửa / sảnh rồi ạ',
      'Bạn đợi mình khoảng 2-3 phút nhé',
      'Cảm ơn bạn, chúc bạn ngon miệng!',
    ],
  },
  SYSTEM: {
    CUSTOMER_MERCHANT: [],
    CUSTOMER_DRIVER: [],
  },
};

