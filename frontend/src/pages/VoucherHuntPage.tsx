// ==============================================================================
// DineGo Frontend — Event & Holiday Store Voucher Hunting Page (Customer Portal)
// Synchronized with Admin Campaign Manager (dinego_admin_vouchers & backend live sync)
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  Ticket,
  Sparkles,
  Store,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Copy,
  ArrowRight,
  Gift,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { MOCK_MERCHANTS } from '../api/client';
import type { NavTab } from '../components/common/Header';
import type { Merchant, User } from '../types';
import {
  ADMIN_VOUCHERS_KEY,
  EVENT_THEME_OPTIONS,
  claimVoucherForAccount,
  fetchRemoteAdminVouchers,
  fetchRemoteUserClaimedCodes,
  getEventThemeStyle,
  getUserClaimsKey,
  loadAdminVouchers,
  loadUserClaimedCodes,
  type ManagedVoucher,
  type VoucherEventTheme,
} from '../utils/vouchers';

export interface VoucherHuntPageProps {
  merchants?: Merchant[];
  currentUser?: User | null;
  onSelectMerchant?: (merchant: Merchant) => void;
  onNavigate?: (tab: NavTab) => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}

export const VoucherHuntPage: React.FC<VoucherHuntPageProps> = ({
  merchants = MOCK_MERCHANTS,
  currentUser,
  onSelectMerchant,
  onNavigate,
  onOpenAuthModal,
}) => {
  const [vouchers, setVouchers] = useState<ManagedVoucher[]>(() => loadAdminVouchers());
  const [claimedCodes, setClaimedCodes] = useState<string[]>(() =>
    loadUserClaimedCodes(currentUser?.id),
  );
  const [viewMode, setViewMode] = useState<'HUNT' | 'WALLET'>('HUNT');
  const [selectedEvent, setSelectedEvent] = useState<'ALL' | VoucherEventTheme>('ALL');
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  // Live sync with Admin changes (localStorage + backend API)
  useEffect(() => {
    let active = true;
    const syncAll = async () => {
      const localList = loadAdminVouchers();
      if (active) setVouchers(localList);
      if (currentUser?.id && active) {
        setClaimedCodes(loadUserClaimedCodes(currentUser.id));
      }

      const remoteList = await fetchRemoteAdminVouchers();
      if (active && remoteList) {
        setVouchers(remoteList);
      }
      if (currentUser?.id) {
        const remoteClaims = await fetchRemoteUserClaimedCodes(currentUser.id);
        if (active && remoteClaims) {
          setClaimedCodes(remoteClaims);
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_VOUCHERS_KEY) {
        setVouchers(loadAdminVouchers());
      }
      if (currentUser?.id && e.key === getUserClaimsKey(currentUser.id)) {
        setClaimedCodes(loadUserClaimedCodes(currentUser.id));
      }
    };

    const handleFocus = () => {
      void syncAll();
    };

    void syncAll();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    const interval = window.setInterval(() => {
      void syncAll();
    }, 3000);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(interval);
    };
  }, [currentUser?.id]);

  // Only active vouchers appear in HUNT mode (Admin pauses -> hidden from Hunt immediately)
  const displayedVouchers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (viewMode === 'HUNT') {
        if (!v.isActive || v.isFlashHunt === false) return false;
      } else {
        if (!claimedCodes.includes(v.code.toUpperCase())) return false;
      }

      const matchEvent =
        selectedEvent === 'ALL' || (v.eventTheme || 'ALL_PLATFORM') === selectedEvent;
      const matchMerchant =
        selectedMerchantId === 'ALL' || (v.merchantId || 'ALL') === selectedMerchantId;
      const matchQuery =
        !q ||
        v.code.toLowerCase().includes(q) ||
        v.title.toLowerCase().includes(q) ||
        (v.eventTag || '').toLowerCase().includes(q) ||
        (v.merchantName || '').toLowerCase().includes(q);

      return matchEvent && matchMerchant && matchQuery;
    });
  }, [vouchers, viewMode, claimedCodes, selectedEvent, selectedMerchantId, searchQuery]);

  const activeHuntCount = useMemo(
    () => vouchers.filter((v) => v.isActive && v.isFlashHunt !== false).length,
    [vouchers],
  );

  const handleHuntVoucher = async (voucher: ManagedVoucher) => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập tài khoản để săn và lưu mã giảm giá vào ví!');
      onOpenAuthModal?.('login');
      return;
    }

    const totalUsedOrClaimed = Math.max(
      Number(voucher.claimedCount || 0),
      Number(voucher.usageCount || 0),
    );
    if (totalUsedOrClaimed >= Number(voucher.maxUsage || 999999)) {
      showToast(`Rất tiếc! Mã "${voucher.code}" đã hết lượt săn trong đợt sự kiện này.`);
      return;
    }

    setClaimingCode(voucher.code);
    const { claimedCodes: nextCodes, updatedVouchers } = await claimVoucherForAccount(
      currentUser.id,
      voucher.code,
    );
    setClaimedCodes(nextCodes);
    setVouchers(updatedVouchers);
    setClaimingCode(null);
    showToast(`Săn thành công mã "${voucher.code}"! Mã đã được lưu vào Ví Voucher của bạn.`);
  };

  const handleUseNow = (voucher: ManagedVoucher) => {
    navigator.clipboard?.writeText?.(voucher.code);
    setCopiedCode(voucher.code);
    setTimeout(() => setCopiedCode(null), 2000);

    if (voucher.merchantId && voucher.merchantId !== 'ALL') {
      const targetMerchant = merchants.find((m) => m.id === voucher.merchantId);
      if (targetMerchant && onSelectMerchant) {
        onSelectMerchant(targetMerchant);
        return;
      }
    }
    onNavigate?.('home');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText?.(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã ${code} — Dán ở bước Thanh toán để giảm giá!`);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="container" style={{ paddingTop: 22, paddingBottom: 70 }}>
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 14,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 2000,
            fontWeight: 700,
            fontSize: '0.88rem',
          }}
        >
          <CheckCircle2 size={18} color="#00B14F" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero Event Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #00B14F 58%, #F97316 100%)',
          borderRadius: 22,
          padding: '28px 30px',
          color: '#FFFFFF',
          marginBottom: 22,
          boxShadow: '0 14px 34px rgba(0, 177, 79, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div style={{ maxWidth: 660 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: '0.76rem',
              fontWeight: 800,
              marginBottom: 10,
              backdropFilter: 'blur(4px)',
            }}
          >
            <Flame size={14} color="#FDE047" />
            <span>SĂN VOUCHER CỬA HÀNG • LỄ HỘI &amp; SỰ KIỆN ĐẶC BIỆT</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, margin: '0 0 8px 0', color: '#FFFFFF', lineHeight: 1.2 }}>
            Săn Phiếu Giảm Giá Theo Sự Kiện &amp; Ngày Lễ
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'rgba(255, 255, 255, 0.92)', margin: 0, lineHeight: 1.5 }}>
            Lưu ngay các mã ưu đãi độc quyền từ quán ăn yêu thích trong dịp Giáng Sinh, Lễ 30/4, Tết &amp; Flash Sale giờ vàng — kiểm duyệt trực tiếp bởi Quản trị viên DineGo.
          </p>
        </div>

        {/* Mode Switch: Hunt vs My Wallet */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.28)',
            padding: 5,
            borderRadius: 14,
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('HUNT')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: viewMode === 'HUNT' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'HUNT' ? '#065F46' : '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Gift size={16} />
            <span>Săn Deal ({activeHuntCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('WALLET')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: viewMode === 'WALLET' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'WALLET' ? '#065F46' : '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Wallet size={16} />
            <span>Ví của tôi ({claimedCodes.length})</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '16px 20px',
          marginBottom: 22,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Event / Holiday Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 4 }}>
            <Calendar size={14} color="var(--primary)" /> Sự kiện / Ngày lễ:
          </span>
          <button
            type="button"
            onClick={() => setSelectedEvent('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: selectedEvent === 'ALL' ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: selectedEvent === 'ALL' ? 'var(--primary)' : 'var(--bg-main)',
              color: selectedEvent === 'ALL' ? '#FFFFFF' : 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tất cả sự kiện
          </button>
          {EVENT_THEME_OPTIONS.map((ev) => {
            const active = selectedEvent === ev.value;
            return (
              <button
                key={ev.value}
                type="button"
                onClick={() => setSelectedEvent(ev.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: active ? `1.5px solid ${ev.badgeColor}` : '1px solid var(--border)',
                  background: active ? ev.badgeBg : 'var(--bg-main)',
                  color: active ? ev.badgeColor : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {ev.label}
              </button>
            );
          })}
        </div>

        {/* Store Filter + Search */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 250px' }}>
            <Store size={16} color="var(--primary)" />
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-main)',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: 'var(--text-main)',
              }}
            >
              <option value="ALL">Tất cả cửa hàng &amp; Toàn sàn DineGo</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  Chỉ quán: {m.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Tìm mã giảm giá, tên quán hoặc sự kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-main)',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Voucher Tickets Grid */}
      {displayedVouchers.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '54px 24px',
            textAlign: 'center',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Ticket size={44} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            {viewMode === 'WALLET'
              ? 'Ví voucher của bạn chưa có mã nào'
              : 'Chưa tìm thấy phiếu giảm giá phù hợp'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 18px 0' }}>
            {viewMode === 'WALLET'
              ? 'Hãy quay lại mục Săn Deal để săn các mã ưu đãi từ cửa hàng và ngày lễ!'
              : 'Thử chọn sự kiện khác hoặc bỏ bớt bộ lọc cửa hàng.'}
          </p>
          {viewMode === 'WALLET' && (
            <button
              type="button"
              onClick={() => setViewMode('HUNT')}
              className="btn btn-primary"
              style={{ padding: '10px 22px', borderRadius: 12, fontWeight: 700 }}
            >
              Khám phá Deal đang mở
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(430px, 1fr))',
            gap: 18,
          }}
        >
          {displayedVouchers.map((v) => {
            const themeStyle = getEventThemeStyle(v.eventTheme);
            const matchedMerchant =
              v.merchantId && v.merchantId !== 'ALL'
                ? merchants.find((m) => m.id === v.merchantId)
                : null;
            const isClaimed = claimedCodes.includes(v.code.toUpperCase());
            const claimedOrUsed = Math.max(
              Number(v.claimedCount || 0),
              Number(v.usageCount || 0),
            );
            const maxQuota = Math.max(1, Number(v.maxUsage || 100));
            const pct = Math.min(100, Math.round((claimedOrUsed / maxQuota) * 100));
            const isSoldOut = claimedOrUsed >= maxQuota;
            const remaining = Math.max(0, maxQuota - claimedOrUsed);

            return (
              <div
                key={v.id}
                style={{
                  background: '#FFFFFF',
                  border: `1.5px solid ${isClaimed ? '#86EFAC' : 'var(--border)'}`,
                  borderRadius: 18,
                  display: 'flex',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  opacity: v.isActive ? 1 : 0.7,
                }}
              >
                {/* Left Store / Platform Stub */}
                <div
                  style={{
                    width: 124,
                    flexShrink: 0,
                    background: matchedMerchant
                      ? '#0F172A'
                      : 'linear-gradient(160deg, #00B14F 0%, #047857 100%)',
                    color: '#FFFFFF',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    borderRight: '2px dashed #E2E8F0',
                    position: 'relative',
                  }}
                >
                  {matchedMerchant ? (
                    <img
                      src={matchedMerchant.logoUrl || matchedMerchant.coverUrl}
                      alt={matchedMerchant.name}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        objectFit: 'cover',
                        border: '2px solid rgba(255,255,255,0.85)',
                        marginBottom: 8,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Sparkles size={26} color="#FFFFFF" />
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, lineHeight: 1.25 }}>
                    {matchedMerchant ? matchedMerchant.name : v.merchantName || 'Toàn sàn DineGo'}
                  </div>
                </div>

                {/* Right Ticket Body & Action */}
                <div
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <div>
                    {/* Event Badge & Code Copy */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span
                        style={{
                          background: themeStyle.badgeBg,
                          color: themeStyle.badgeColor,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 999,
                        }}
                      >
                        {v.eventTag || themeStyle.label}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(v.code)}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Sao chép mã"
                      >
                        <Copy size={11} />
                        <span>{copiedCode === v.code ? 'Đã chép' : v.code}</span>
                      </button>
                    </div>

                    {/* Discount Value */}
                    <div style={{ fontSize: '1.16rem', fontWeight: 900, color: '#0F172A', marginBottom: 2 }}>
                      {v.discountType === 'PERCENTAGE'
                        ? `Giảm ${v.discountValue}%${v.maxDiscountAmount ? ` (tối đa ${(v.maxDiscountAmount / 1000).toFixed(0)}k)` : ''}`
                        : `Giảm ${v.discountValue.toLocaleString('vi-VN')}đ`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                      {v.title}
                    </div>
                  </div>

                  {/* Quota Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', fontWeight: 700, marginBottom: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> HSD: {v.endDate}
                      </span>
                      <span style={{ color: pct >= 85 ? '#DC2626' : '#047857' }}>
                        {isSoldOut ? 'Đã hết suất' : `Đã săn ${pct}% (còn ${remaining} lượt)`}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden', marginBottom: 10 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: pct >= 85 ? '#EF4444' : '#00B14F',
                          borderRadius: 999,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    {/* Action CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <ShieldCheck size={12} color="#00B14F" /> Duyệt bởi Admin
                      </span>

                      {isClaimed ? (
                        <button
                          type="button"
                          onClick={() => handleUseNow(v)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 10,
                            border: '1.5px solid var(--primary)',
                            background: '#ECFDF5',
                            color: '#065F46',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <span>Dùng ngay</span>
                          <ArrowRight size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSoldOut || !v.isActive || claimingCode === v.code}
                          onClick={() => void handleHuntVoucher(v)}
                          className="btn btn-primary"
                          style={{
                            padding: '7px 16px',
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            opacity: isSoldOut || !v.isActive ? 0.55 : 1,
                            cursor: isSoldOut || !v.isActive ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSoldOut ? 'Hết lượt' : claimingCode === v.code ? 'Đang săn...' : 'Săn Ngay'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

