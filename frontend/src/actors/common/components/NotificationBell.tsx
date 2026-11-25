// ==============================================================================
// DineGo Frontend — Universal Multi-Actor Notification Bell & Drawer Component
// Clean, modern, clutter-free notification center for all 4 actors
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
import type { Role } from '../../../types';
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
} from '../../../utils/notifications';

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
  MERCHANT: { label: 'Cửa hàng', color: '#D97706', bg: '#FFFBEB' },
  DRIVER: { label: 'Tài xế', color: '#0284C7', bg: '#E0F2FE' },
  ADMIN: { label: 'Admin', color: '#4F46E5', bg: '#EEF2FF' },
};

const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  ORDER: { label: 'Đơn hàng', color: '#0284C7', bg: '#F0F9FF', icon: <ShoppingBag size={16} /> },
  KITCHEN: { label: 'Bếp & Món', color: '#D97706', bg: '#FFFBEB', icon: <ChefHat size={16} /> },
  DELIVERY: { label: 'Giao nhận', color: '#059669', bg: '#ECFDF5', icon: <Bike size={16} /> },
  VOUCHER: { label: 'Voucher', color: '#7C3AED', bg: '#F5F3FF', icon: <Ticket size={16} /> },
  REVIEW: { label: 'Đánh giá', color: '#D97706', bg: '#FFFBEB', icon: <Star size={16} /> },
  KYC: { label: 'Pháp lý KYC', color: '#16A34A', bg: '#F0FDF4', icon: <ShieldCheck size={16} /> },
  CATERING: { label: 'Đặt tiệc', color: '#9333EA', bg: '#FAF5FF', icon: <Calendar size={16} /> },
  DISPUTE: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEF2F2', icon: <AlertTriangle size={16} /> },
  SYSTEM: { label: 'Hệ thống', color: '#4F46E5', bg: '#EEF2FF', icon: <Sparkles size={16} /> },
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
      `Đã gửi thông báo tới ${
        broadcastTarget === 'ALL' ? 'tất cả người dùng' : broadcastTarget
      }.`,
    );
    setTimeout(() => {
      setBroadcastSentNotice('');
      setShowComposer(false);
    }, 2200);
  };

  const roleMeta = ROLE_BADGE_META[actorRole];
  const hasReadItems = actorNotifications.some((n) => n.isRead);

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
            width: 350,
            maxWidth: 'calc(100vw - 32px)',
            background: '#FFFFFF',
            color: '#0F172A',
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: '0 18px 40px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: (CATEGORY_META[liveToast.category] || CATEGORY_META.SYSTEM).bg,
              color: (CATEGORY_META[liveToast.category] || CATEGORY_META.SYSTEM).color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {(CATEGORY_META[liveToast.category] || CATEGORY_META.SYSTEM).icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B' }}>
                {(CATEGORY_META[liveToast.category] || CATEGORY_META.SYSTEM).label} • Vừa xong
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
            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A', marginBottom: 2, lineHeight: 1.35 }}>
              {liveToast.title}
            </div>
            <div style={{ fontSize: '0.77rem', color: '#475569', lineHeight: 1.4 }}>
              {liveToast.message}
            </div>
          </div>
        </div>
      )}

      {/* Bell Trigger Button (Icon Only with Badge) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Thông báo (${unreadCount} chưa đọc)`}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 38,
          height: 38,
          borderRadius: 10,
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
            : '#334155',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.background = variant === 'dark' ? '#334155' : '#F1F5F9';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = variant === 'dark' ? '#334155' : '#E2E8F0';
            e.currentTarget.style.background = variant === 'dark' ? '#1E293B' : '#F8FAFC';
          }
        }}
      >
        <Bell size={18} color={unreadCount > 0 ? roleMeta.color : undefined} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 999,
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: '0.66rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
              boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 390,
            maxWidth: 'calc(100vw - 24px)',
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.18)',
            zIndex: 1500,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Clean Light Header */}
          <div
            style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A' }}>
                Thông báo
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#FEF2F2',
                    color: '#EF4444',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả là đã đọc"
                  style={{
                    padding: '5px 8px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: '#0284C7',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCheck size={14} />
                  <span>Đọc hết</span>
                </button>
              )}

              {hasReadItems && (
                <button
                  type="button"
                  onClick={handleClearRead}
                  title="Xóa thông báo đã đọc"
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowComposer((prev) => !prev)}
                title={showComposer ? 'Đóng khung gửi' : 'Gửi thông báo nhanh'}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: 'none',
                  background: showComposer ? roleMeta.bg : 'transparent',
                  color: showComposer ? roleMeta.color : '#64748B',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Optional Quick Notification Composer */}
          {showComposer && (
            <form
              onSubmit={handleSendBroadcast}
              style={{
                padding: '12px 16px',
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value as NotificationTargetRole)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    background: '#FFFFFF',
                    color: '#0F172A',
                  }}
                >
                  <option value="ALL">Gửi: Tất cả vai trò</option>
                  <option value="CUSTOMER">Gửi: Khách hàng</option>
                  <option value="MERCHANT">Gửi: Cửa hàng</option>
                  <option value="DRIVER">Gửi: Tài xế</option>
                  <option value="ADMIN">Gửi: Admin</option>
                </select>

                <select
                  value={broadcastCategory}
                  onChange={(e) => setBroadcastCategory(e.target.value as NotificationCategory)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    background: '#FFFFFF',
                    color: '#0F172A',
                  }}
                >
                  <option value="SYSTEM">Loại: Hệ thống</option>
                  <option value="ORDER">Loại: Đơn hàng</option>
                  <option value="VOUCHER">Loại: Voucher</option>
                  <option value="KYC">Loại: Pháp lý KYC</option>
                  <option value="DELIVERY">Loại: Giao nhận</option>
                </select>
              </div>

              <input
                type="text"
                required
                placeholder="Tiêu đề thông báo..."
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  background: '#FFFFFF',
                }}
              />

              <textarea
                rows={2}
                required
                placeholder="Nội dung chi tiết..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.76rem',
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
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  {broadcastSentNotice}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: roleMeta.color,
                    color: '#FFFFFF',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Gửi ngay
                </button>
              </div>
            </form>
          )}

          {/* Minimal Segmented Filter + Compact Category Select */}
          <div
            style={{
              padding: '8px 16px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              background: '#FAFAFA',
            }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: 'none',
                  background: filterMode === 'ALL' ? '#0F172A' : 'transparent',
                  color: filterMode === 'ALL' ? '#FFFFFF' : '#64748B',
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
                  borderRadius: 999,
                  border: 'none',
                  background: filterMode === 'UNREAD' ? '#0F172A' : 'transparent',
                  color: filterMode === 'UNREAD' ? '#FFFFFF' : '#64748B',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as 'ALL' | NotificationCategory)}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '0.73rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">Mọi danh mục</option>
              <option value="ORDER">Đơn hàng</option>
              <option value="DELIVERY">Giao nhận</option>
              <option value="VOUCHER">Voucher</option>
              <option value="REVIEW">Đánh giá</option>
              <option value="KYC">Pháp lý KYC</option>
            </select>
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {displayedNotifications.length === 0 ? (
              <div
                style={{
                  padding: '42px 24px',
                  textAlign: 'center',
                  color: '#64748B',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Bell size={22} color="#94A3B8" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155', marginBottom: 4 }}>
                  Không có thông báo nào
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                  Thông báo mới về đơn hàng, voucher và đánh giá sẽ hiển thị tại đây.
                </div>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const catMeta = CATEGORY_META[notif.category] || CATEGORY_META.SYSTEM;
                const isHovered = hoveredId === notif.id;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotification(notif)}
                    onMouseEnter={() => setHoveredId(notif.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F1F5F9',
                      background: isHovered
                        ? '#F8FAFC'
                        : notif.isRead
                        ? '#FFFFFF'
                        : '#F8FAFF',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: catMeta.bg,
                        color: catMeta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {catMeta.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: notif.isRead ? 600 : 700,
                            color: '#0F172A',
                            lineHeight: 1.35,
                          }}
                        >
                          {notif.title}
                        </span>

                        {!notif.isRead && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: '#0284C7',
                              flexShrink: 0,
                              marginTop: 5,
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '0.76rem',
                          color: '#475569',
                          lineHeight: 1.45,
                          marginBottom: 5,
                        }}
                      >
                        {notif.message}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.69rem',
                          color: '#94A3B8',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ color: catMeta.color, fontWeight: 600 }}>
                          {catMeta.label}
                        </span>
                        <span>•</span>
                        <span>{notif.createdAt}</span>
                        {notif.senderLabel && (
                          <>
                            <span>•</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {notif.senderLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
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
