// ==============================================================================
// DineGo Frontend — Universal Multi-Actor Notification Bell & Drawer Component
// Works in Customer Header, Merchant Seller Center, Driver Console & Admin Backoffice
// Includes Real-Time Toast Popup, Category Filtering & Cross-Actor Quick Broadcast
// ==============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Send,
  X,
  ShoppingBag,
  ChefHat,
  Bike,
  Ticket,
  Star,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Calendar,
} from 'lucide-react';
import type { Role } from '../../types';
import type { NavTab } from './Header';
import {
  loadAllActorNotifications,
  filterNotificationsForActor,
  markNotificationAsRead,
  markAllNotificationsReadForActor,
  clearReadNotificationsForActor,
  pushActorNotification,
  NOTIFICATIONS_STORAGE_KEY,
  NOTIFICATIONS_SYNC_CHANNEL,
  NOTIFICATIONS_UPDATED_EVENT,
  type ActorNotification,
  type NotificationCategory,
  type NotificationTargetRole,
} from '../../utils/notifications';

interface NotificationBellProps {
  actorRole: Role;
  userId?: string;
  merchantId?: string;
  driverId?: string;
  actorDisplayName?: string;
  onNavigate?: (tab: NavTab) => void;
  variant?: 'light' | 'dark' | 'seller' | 'admin';
}

const ROLE_BADGE_META: Record<Role, { label: string; color: string; bg: string }> = {
  CUSTOMER: { label: 'Khách hàng', color: '#00B14F', bg: '#ECFDF5' },
  MERCHANT: { label: 'Cửa hàng / Quán', color: '#D97706', bg: '#FFFBEB' },
  DRIVER: { label: 'Tài xế Giao hàng', color: '#0284C7', bg: '#E0F2FE' },
  ADMIN: { label: 'Quản trị viên Sàn', color: '#4F46E5', bg: '#EEF2FF' },
};

const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  ORDER: { label: 'Đơn hàng', color: '#0284C7', bg: '#E0F2FE', icon: <ShoppingBag size={14} /> },
  KITCHEN: { label: 'Bếp & Món', color: '#D97706', bg: '#FEF3C7', icon: <ChefHat size={14} /> },
  DELIVERY: { label: 'Giao nhận', color: '#059669', bg: '#D1FAE5', icon: <Bike size={14} /> },
  VOUCHER: { label: 'Voucher', color: '#7C3AED', bg: '#EDE9FE', icon: <Ticket size={14} /> },
  REVIEW: { label: 'Đánh giá', color: '#B45309', bg: '#FEF3C7', icon: <Star size={14} /> },
  KYC: { label: 'Pháp lý KYC', color: '#15803D', bg: '#DCFCE7', icon: <ShieldCheck size={14} /> },
  CATERING: { label: 'Đặt tiệc', color: '#9333EA', bg: '#F3E8FF', icon: <Calendar size={14} /> },
  DISPUTE: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2', icon: <AlertTriangle size={14} /> },
  SYSTEM: { label: 'Hệ thống', color: '#4F46E5', bg: '#EEF2FF', icon: <Sparkles size={14} /> },
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  actorRole,
  userId,
  merchantId,
  driverId,
  actorDisplayName,
  onNavigate,
  variant = 'light',
}) => {
  const [allNotifs, setAllNotifs] = useState<ActorNotification[]>(() => loadAllActorNotifications());
  const [isOpen, setIsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | NotificationCategory>('ALL');
  const [liveToast, setLiveToast] = useState<ActorNotification | null>(null);

  // Quick Cross-Actor Broadcast Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<NotificationTargetRole>('ALL');
  const [broadcastCategory, setBroadcastCategory] = useState<NotificationCategory>('SYSTEM');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSentNotice, setBroadcastSentNotice] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastToastIdRef = useRef<string | null>(null);

  const actorContext = useMemo(
    () => ({ role: actorRole, userId, merchantId, driverId }),
    [actorRole, userId, merchantId, driverId],
  );

  useEffect(() => {
    const checkAndShowLiveToast = (latest?: ActorNotification) => {
      if (!latest || latest.id === lastToastIdRef.current) return;
      const matches = filterNotificationsForActor([latest], actorContext);
      if (matches.length > 0) {
        lastToastIdRef.current = latest.id;
        setLiveToast(latest);
      }
    };

    const handleCustomUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.list) {
        setAllNotifs(detail.list);
        checkAndShowLiveToast(detail.latestAdded);
      } else {
        setAllNotifs(loadAllActorNotifications());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === NOTIFICATIONS_STORAGE_KEY) {
        const loaded = loadAllActorNotifications();
        setAllNotifs(loaded);
        if (loaded[0] && !loaded[0].isRead) {
          checkAndShowLiveToast(loaded[0]);
        }
      }
    };

    const ch =
      typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel(NOTIFICATIONS_SYNC_CHANNEL)
        : null;
    if (ch) {
      ch.onmessage = (ev) => {
        if (ev.data?.list) {
          setAllNotifs(ev.data.list);
          checkAndShowLiveToast(ev.data.latestAdded);
        } else {
          setAllNotifs(loadAllActorNotifications());
        }
      };
    }

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleCustomUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleCustomUpdate);
      window.removeEventListener('storage', handleStorage);
      ch?.close();
    };
  }, [actorContext]);

  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => setLiveToast(null), 4800);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const actorNotifications = useMemo(
    () => filterNotificationsForActor(allNotifs, actorContext),
    [allNotifs, actorContext],
  );

  const unreadCount = useMemo(
    () => actorNotifications.filter((n) => !n.isRead).length,
    [actorNotifications],
  );

  const displayedNotifications = useMemo(() => {
    return actorNotifications.filter((n) => {
      if (filterMode === 'UNREAD' && n.isRead) return false;
      if (selectedCategory !== 'ALL' && n.category !== selectedCategory) return false;
      return true;
    });
  }, [actorNotifications, filterMode, selectedCategory]);

  const handleClickNotification = (notif: ActorNotification) => {
    const updated = markNotificationAsRead(notif.id);
    setAllNotifs(updated);
    if (notif.actionTab && onNavigate) {
      onNavigate(notif.actionTab);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    const updated = markAllNotificationsReadForActor(actorContext);
    setAllNotifs(updated);
  };

  const handleClearRead = () => {
    const updated = clearReadNotificationsForActor(actorContext);
    setAllNotifs(updated);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    const defaultActionTab: Record<NotificationTargetRole, NavTab> = {
      ALL: 'home',
      CUSTOMER: 'orders',
      MERCHANT: 'merchant-orders',
      DRIVER: 'driver-orders',
      ADMIN: 'admin-overview',
    };

    const senderRoleName = ROLE_BADGE_META[actorRole].label;
    const senderText = actorDisplayName
      ? `${senderRoleName} (${actorDisplayName})`
      : senderRoleName;

    pushActorNotification({
      targetRole: broadcastTarget,
      category: broadcastCategory,
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
      priority: 'high',
      actionTab: defaultActionTab[broadcastTarget],
      senderLabel: senderText,
    });

    setBroadcastTitle('');
    setBroadcastMessage('');
    setBroadcastSentNotice(
      `✅ Đã phát thông báo tới ${
        broadcastTarget === 'ALL' ? 'Tất cả 4 Actor toàn sàn' : `Actor ${broadcastTarget}`
      }!`,
    );
    setTimeout(() => {
      setBroadcastSentNotice('');
      setShowComposer(false);
    }, 2400);
  };

  const roleMeta = ROLE_BADGE_META[actorRole];

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Real-Time Floating Toast Notification */}
      {liveToast && (
        <div
          onClick={() => {
            handleClickNotification(liveToast);
            setLiveToast(null);
          }}
          style={{
            position: 'fixed',
            top: 76,
            right: 24,
            zIndex: 9999,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            background: '#0F172A',
            color: '#F8FAFC',
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.35)',
            border: '1px solid #334155',
            borderLeft: `4px solid ${CATEGORY_META[liveToast.category]?.color || '#00B14F'}`,
            cursor: 'pointer',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#38BDF8',
                letterSpacing: 0.4,
              }}
            >
              🔔 Thông báo mới • {liveToast.senderLabel || roleMeta.label}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLiveToast(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF', marginBottom: 3 }}>
            {liveToast.title}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#CBD5E1', lineHeight: 1.4 }}>
            {liveToast.message}
          </div>
        </div>
      )}

      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Thông báo ${roleMeta.label} (${unreadCount} chưa đọc)`}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '7px 11px',
          borderRadius: 8,
          background: isOpen
            ? roleMeta.bg
            : variant === 'dark'
            ? '#1E293B'
            : '#F8FAFC',
          border: isOpen
            ? `1.5px solid ${roleMeta.color}`
            : variant === 'dark'
            ? '1px solid #334155'
            : '1px solid #E2E8F0',
          color: isOpen
            ? roleMeta.color
            : variant === 'dark'
            ? '#F8FAFC'
            : '#0F172A',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.82rem',
          transition: 'all 0.15s ease',
        }}
      >
        <Bell size={16} color={unreadCount > 0 ? roleMeta.color : undefined} />
        <span className="hide-mobile" style={{ fontSize: '0.78rem' }}>
          Thông báo
        </span>
        {unreadCount > 0 && (
          <span
            style={{
              minWidth: 19,
              height: 19,
              padding: '0 5px',
              borderRadius: 999,
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 420,
            maxWidth: 'calc(100vw - 24px)',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 22px 50px rgba(15, 23, 42, 0.22)',
            zIndex: 1500,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '14px 18px',
              background: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '0.96rem' }}>Trung Tâm Thông Báo</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: roleMeta.bg,
                    color: roleMeta.color,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                  }}
                >
                  Actor: {roleMeta.label}
                </span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: 2 }}>
                Đồng bộ thời gian thực giữa Khách hàng • Cửa hàng • Tài xế • Admin
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowComposer((prev) => !prev)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: showComposer ? '#334155' : roleMeta.color,
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.73rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                flexShrink: 0,
              }}
              title="Gửi thông báo tới các Actor khác"
            >
              <Send size={12} />
              <span>{showComposer ? 'Đóng gửi' : 'Gửi TB'}</span>
            </button>
          </div>

          {/* Cross-Actor Quick Notification Composer */}
          {showComposer && (
            <form
              onSubmit={handleSendBroadcast}
              style={{
                padding: '14px 18px',
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>
                📢 Phát thông báo nhanh tới các Actor trong hệ thống
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                    GỬI TỚI ACTOR
                  </label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value as NotificationTargetRole)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="ALL">🌐 Tất cả 4 Actor (Toàn sàn)</option>
                    <option value="CUSTOMER">🛍️ Khách hàng (CUSTOMER)</option>
                    <option value="MERCHANT">🏪 Cửa hàng / Quán (MERCHANT)</option>
                    <option value="DRIVER">🛵 Tài xế (DRIVER)</option>
                    <option value="ADMIN">🛡️ Quản trị viên (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                    LOẠI THÔNG BÁO
                  </label>
                  <select
                    value={broadcastCategory}
                    onChange={(e) => setBroadcastCategory(e.target.value as NotificationCategory)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="SYSTEM">Hệ thống / Vận hành</option>
                    <option value="ORDER">Đơn hàng</option>
                    <option value="VOUCHER">Khuyến mãi & Voucher</option>
                    <option value="KYC">Hồ sơ pháp lý KYC</option>
                    <option value="DELIVERY">Giao nhận & Tài xế</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                required
                placeholder="Tiêu đề thông báo (VD: Quán vừa tung mã giảm 30K / Cập nhật KYC)..."
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.8rem',
                  background: '#FFFFFF',
                }}
              />

              <textarea
                rows={2}
                required
                placeholder="Nội dung chi tiết gửi tới Actor..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  background: '#FFFFFF',
                  resize: 'none',
                }}
              />

              {broadcastSentNotice && (
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                  }}
                >
                  {broadcastSentNotice}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#00B14F',
                    color: '#FFFFFF',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Send size={12} />
                  <span>Phát thông báo ngay</span>
                </button>
              </div>
            </form>
          )}

          {/* Filter & Action Toolbar */}
          <div
            style={{
              padding: '10px 14px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setFilterMode('ALL')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: filterMode === 'ALL' ? '#0F172A' : '#E2E8F0',
                    color: filterMode === 'ALL' ? '#FFFFFF' : '#475569',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tất cả ({actorNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('UNREAD')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: filterMode === 'UNREAD' ? '#EF4444' : '#E2E8F0',
                    color: filterMode === 'UNREAD' ? '#FFFFFF' : '#475569',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0284C7',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Đánh dấu tất cả là đã đọc"
                  >
                    <CheckCheck size={13} />
                    <span>Đọc tất cả</span>
                  </button>
                )}
                {actorNotifications.some((n) => n.isRead) && (
                  <button
                    type="button"
                    onClick={handleClearRead}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Xóa thông báo đã đọc"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
              {(
                [
                  { id: 'ALL', label: 'Tất cả mục' },
                  { id: 'ORDER', label: 'Đơn hàng' },
                  { id: 'DELIVERY', label: 'Giao nhận' },
                  { id: 'VOUCHER', label: 'Voucher' },
                  { id: 'REVIEW', label: 'Đánh giá' },
                  { id: 'KYC', label: 'Pháp lý KYC' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    border:
                      selectedCategory === cat.id ? `1px solid ${roleMeta.color}` : '1px solid #CBD5E1',
                    background: selectedCategory === cat.id ? roleMeta.bg : '#FFFFFF',
                    color: selectedCategory === cat.id ? roleMeta.color : '#475569',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: 390, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {displayedNotifications.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: '0.84rem',
                }}
              >
                <Bell size={28} color="#CBD5E1" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Không có thông báo nào
                </div>
                <div style={{ fontSize: '0.76rem' }}>
                  Mọi biến động đơn hàng, đánh giá, voucher và hồ sơ pháp lý sẽ hiển thị tức thời tại đây.
                </div>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const catMeta = CATEGORY_META[notif.category] || CATEGORY_META.SYSTEM;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotification(notif)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F1F5F9',
                      background: notif.isRead ? '#FFFFFF' : '#F0F9FF',
                      borderLeft: notif.isRead ? '3px solid transparent' : `3px solid ${catMeta.color}`,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: catMeta.bg,
                        color: catMeta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {catMeta.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '1px 7px',
                            borderRadius: 4,
                            background: catMeta.bg,
                            color: catMeta.color,
                          }}
                        >
                          {catMeta.label}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600 }}>
                          {notif.createdAt}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.83rem',
                          fontWeight: notif.isRead ? 700 : 800,
                          color: '#0F172A',
                          marginBottom: 3,
                          lineHeight: 1.35,
                        }}
                      >
                        {notif.title}
                      </div>

                      <div
                        style={{
                          fontSize: '0.77rem',
                          color: '#475569',
                          lineHeight: 1.4,
                        }}
                      >
                        {notif.message}
                      </div>

                      {notif.senderLabel && (
                        <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 4, fontWeight: 600 }}>
                          Từ: {notif.senderLabel}
                        </div>
                      )}
                    </div>

                    {!notif.isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#0284C7',
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
