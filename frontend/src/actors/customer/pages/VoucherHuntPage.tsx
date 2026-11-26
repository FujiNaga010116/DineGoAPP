// ==============================================================================
// DineGo Frontend — Event & Holiday Store Voucher Hunting Page (Customer Portal)
// Synchronized with Admin Campaign Manager (dinego_admin_vouchers & backend live sync)
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  Ticket,
  Store,
  Search,
  CheckCircle2,
  Copy,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { MOCK_MERCHANTS } from '../../../api/client';
import type { NavTab } from '../../common/components/Header';
import type { Merchant, User } from '../../../types';
import {
  ADMIN_VOUCHERS_KEY,
  EVENT_THEME_OPTIONS,
  claimVoucherForAccount,
  fetchRemoteAdminVouchers,
  fetchRemoteUserClaimedCodes,
  getEventThemeStyle,
  getUserClaimsKey,
  isWithinGoldenHours,
  loadAdminVouchers,
  loadUserClaimedCodes,
  type ManagedVoucher,
  type VoucherEventTheme,
} from '../../../utils/vouchers';

export interface VoucherHuntPageProps {
  merchants?: Merchant[];
  currentUser?: User | null;
  onSelectMerchant?: (merchant: Merchant) => void;
  onNavigate?: (tab: NavTab) => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}

const getVoucherMerchantThumb = (m?: Merchant | null, fallbackName?: string): string => {
  const name = (m?.name || fallbackName || '').toLowerCase();
  if (name.includes('phở')) return '/images/pho-thin.jpg';
  if (name.includes('trà sữa') || name.includes('cà phê') || name.includes('gong cha')) {
    return '/images/tra-sua-ca-phe.jpg';
  }
  if (name.includes('pizza') || name.includes('pasta')) return '/images/pizza-artisan.jpg';
  if (name.includes('cơm')) return '/images/catering-housewarming.jpg';
  if (name.includes('bún')) return '/images/feast-bbq.jpg';
  if (name.includes('bánh')) return '/images/feast-buffet.jpg';
  if (name.includes('cỗ') || name.includes('tiệc') || name.includes('hoàng gia')) {
    return '/images/catering-memorial.jpg';
  }
  if (m?.coverUrl) return m.coverUrl;
  if (m?.storeFrontImage) return m.storeFrontImage;
  if (m?.logoUrl) return m.logoUrl;
  return '/images/feast-buffet.jpg';
};

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
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const hasGolden = vouchers.some(
      (v) => v.eventTheme === 'FLASH_SALE' && v.goldenStartTime && v.goldenEndTime,
    );
    if (!hasGolden) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [vouchers]);
  const [detailVoucher, setDetailVoucher] = useState<ManagedVoucher | null>(null);

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
    const handleCustom = () => {
      setVouchers(loadAdminVouchers());
    };
    const ch =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_vouchers_sync') : null;
    if (ch) {
      ch.onmessage = () => setVouchers(loadAdminVouchers());
    }

    void syncAll();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('dinego_vouchers_updated', handleCustom);
    const interval = window.setInterval(() => {
      void syncAll();
    }, 10000);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('dinego_vouchers_updated', handleCustom);
      ch?.close();
      window.clearInterval(interval);
    };
  }, [currentUser?.id]);

  // Only active & non-expired vouchers appear in HUNT mode (Admin pauses -> hidden from Hunt immediately)
  const displayedVouchers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const todayStr = new Date().toISOString().split('T')[0];
    return vouchers.filter((v) => {
      if (viewMode === 'HUNT') {
        if (!v.isActive || v.isFlashHunt === false) return false;
        if (v.endDate && v.endDate < todayStr) return false;
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
    try {
      localStorage.setItem(
        'dinego_preselected_voucher',
        JSON.stringify({
          code: voucher.code.toUpperCase(),
          merchantId: voucher.merchantId || 'ALL',
        }),
      );
    } catch {}
    setCopiedCode(voucher.code);
    setTimeout(() => setCopiedCode(null), 2000);

    if (voucher.merchantId && voucher.merchantId !== 'ALL') {
      const targetMerchant = merchants.find((m) => m.id === voucher.merchantId);
      if (targetMerchant && onSelectMerchant) {
        onSelectMerchant(targetMerchant);
        return;
      }
    }
    showToast(`Đã chọn sẵn mã "${voucher.code}"! Chọn món để hệ thống tự động áp dụng giảm giá.`);
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

      {/* Scoped Hover Transitions for Voucher Cards & Buttons */}
      <style>{`
        .dinego-voucher-card {
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .dinego-voucher-card:hover {
          transform: translateY(-3px);
          border-color: #86EFAC !important;
          box-shadow: 0 12px 26px rgba(0, 177, 79, 0.12) !important;
        }
        .dinego-voucher-card .dinego-voucher-thumb {
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dinego-voucher-card:hover .dinego-voucher-thumb {
          transform: scale(1.06);
        }
        .dinego-voucher-copy {
          transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
        }
        .dinego-voucher-copy:hover {
          background-color: #ECFDF5 !important;
          border-color: #00B14F !important;
          color: #009643 !important;
        }
        .dinego-voucher-link {
          transition: color 0.16s ease;
        }
        .dinego-voucher-link:hover {
          color: #009643 !important;
        }
        .dinego-voucher-cta {
          transition: background-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
        }
        .dinego-voucher-cta:not(:disabled):hover {
          background-color: #009643 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 177, 79, 0.28);
        }
        .dinego-voucher-cta:not(:disabled):active {
          transform: translateY(0);
        }
        .dinego-voucher-used {
          transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
        }
        .dinego-voucher-used:hover {
          background-color: #00B14F !important;
          color: #FFFFFF !important;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Clean Editorial Header & Mode Switch */}
      <div
        style={{
          background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFBEB 100%)',
          border: '1px solid #DCFCE7',
          borderRadius: 20,
          padding: '22px 26px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 18,
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              margin: '0 0 6px 0',
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            Săn Ưu Đãi &amp; Mã Giảm Giá
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
            Lưu mã giảm giá từ quán ăn yêu thích và các đợt ưu đãi theo mùa — áp dụng tự động khi thanh toán.
          </p>
        </div>

        {/* Clean Segmented Switch: Săn Deal vs Ví của tôi */}
        <div
          style={{
            display: 'inline-flex',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            padding: 4,
            borderRadius: 999,
            gap: 4,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('HUNT')}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              background: viewMode === 'HUNT' ? '#00B14F' : 'transparent',
              color: viewMode === 'HUNT' ? '#FFFFFF' : '#475569',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.16s ease',
            }}
          >
            <Ticket size={15} />
            <span>Săn Deal ({activeHuntCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('WALLET')}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              background: viewMode === 'WALLET' ? '#00B14F' : 'transparent',
              color: viewMode === 'WALLET' ? '#FFFFFF' : '#475569',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.16s ease',
            }}
          >
            <Wallet size={15} />
            <span>Ví của tôi ({claimedCodes.length})</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: '14px 18px',
          marginBottom: 22,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
        }}
      >
        {/* Event / Holiday Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setSelectedEvent('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: selectedEvent === 'ALL' ? '1px solid #00B14F' : '1px solid #E2E8F0',
              background: selectedEvent === 'ALL' ? '#ECFDF5' : '#F8FAFC',
              color: selectedEvent === 'ALL' ? '#009643' : '#334155',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tất cả
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
                  border: active ? `1px solid ${ev.badgeColor}` : '1px solid #E2E8F0',
                  background: active ? ev.badgeBg : '#F8FAFC',
                  color: active ? ev.badgeColor : '#334155',
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px' }}>
            <Store size={15} color="#64748B" />
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#0F172A',
              }}
            >
              <option value="ALL">Tất cả cửa hàng &amp; Toàn sàn DineGo</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Tìm mã giảm giá, tên quán..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 440px), 1fr))',
            gap: 14,
          }}
        >
          {displayedVouchers.map((v) => {
            const themeStyle = getEventThemeStyle(v.eventTheme);
            const matchedMerchant =
              v.merchantId && v.merchantId !== 'ALL'
                ? merchants.find(
                    (m) =>
                      m.id === v.merchantId ||
                      (v.merchantName && m.name.toLowerCase() === v.merchantName.toLowerCase()),
                  )
                : null;
            const isStoreVoucher = Boolean(matchedMerchant || (v.merchantId && v.merchantId !== 'ALL'));
            const isClaimed = claimedCodes.includes(v.code.toUpperCase());
            const claimedOrUsed = Math.max(
              Number(v.claimedCount || 0),
              Number(v.usageCount || 0),
            );
            const maxQuota = Math.max(1, Number(v.maxUsage || 100));
            const pct = Math.min(100, Math.round((claimedOrUsed / maxQuota) * 100));
            const isSoldOut = claimedOrUsed >= maxQuota;
            const remaining = Math.max(0, maxQuota - claimedOrUsed);

            const shortDiscount =
              v.discountType === 'PERCENTAGE'
                ? `${v.discountValue}%`
                : v.discountValue >= 1000
                  ? `${Math.round(v.discountValue / 1000)}K`
                  : `${v.discountValue}đ`;
            const golden = isWithinGoldenHours(v, nowMs);

            return (
              <div
                key={v.id}
                className="dinego-voucher-card"
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${isClaimed ? '#86EFAC' : '#E2E8F0'}`,
                  borderRadius: 14,
                  display: 'flex',
                  height: 128,
                  overflow: 'visible',
                  boxShadow: isClaimed
                    ? '0 4px 12px rgba(0, 177, 79, 0.08)'
                    : '0 2px 8px rgba(15, 23, 42, 0.04)',
                  position: 'relative',
                  opacity: v.isActive ? 1 : 0.7,
                }}
              >
                {/* Left Ticket Stub — Compact Uniform 108px */}
                <div
                  style={{
                    width: 108,
                    flexShrink: 0,
                    background: isStoreVoucher
                      ? '#0F172A'
                      : 'linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 100%)',
                    borderRadius: '13px 0 0 13px',
                    padding: '10px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: isStoreVoucher ? 'flex-end' : 'center',
                    textAlign: 'center',
                    borderRight: '1.5px dashed #CBD5E1',
                    position: 'relative',
                  }}
                >
                  {isStoreVoucher && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '13px 0 0 13px',
                        overflow: 'hidden',
                        pointerEvents: 'none',
                      }}
                    >
                      <img
                        src={getVoucherMerchantThumb(matchedMerchant, v.merchantName)}
                        alt=""
                        loading="lazy"
                        className="dinego-voucher-thumb"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(180deg, rgba(15, 23, 42, 0.04) 0%, rgba(15, 23, 42, 0.25) 45%, rgba(15, 23, 42, 0.86) 100%)',
                        }}
                      />
                    </div>
                  )}

                  {/* Top & Bottom Ticket Cutout Notches */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      background: 'var(--bg-main)',
                      borderBottom: '1px solid #E2E8F0',
                      zIndex: 2,
                    }}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      bottom: -6,
                      right: -6,
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      background: 'var(--bg-main)',
                      borderTop: '1px solid #E2E8F0',
                      zIndex: 2,
                    }}
                  />

                  {!isStoreVoucher && (
                    <img
                      src="/images/dinego-logo.png"
                      alt="DineGo"
                      loading="lazy"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        objectFit: 'contain',
                        background: '#FFFFFF',
                        border: '1px solid #BBF7D0',
                        padding: 3,
                        marginBottom: 4,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '1.15rem',
                      fontWeight: 900,
                      color: isStoreVoucher ? '#FFFFFF' : '#009643',
                      lineHeight: 1.05,
                      marginBottom: 2,
                      textShadow: isStoreVoucher ? '0 2px 6px rgba(0, 0, 0, 0.65)' : 'none',
                    }}
                  >
                    -{shortDiscount}
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: isStoreVoucher ? 'rgba(255, 255, 255, 0.95)' : '#047857',
                      lineHeight: 1.2,
                      textShadow: isStoreVoucher ? '0 1px 4px rgba(0, 0, 0, 0.75)' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {matchedMerchant ? matchedMerchant.name : v.merchantName || 'Toàn sàn'}
                  </div>
                </div>

                {/* Right Ticket Body — Uniform Compact Layout */}
                <div
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0,
                  }}
                >
                  {/* Top Row: Event Tag + Code Copy */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        background: themeStyle.badgeBg,
                        color: themeStyle.badgeColor,
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 165,
                      }}
                    >
                      {v.eventTag || themeStyle.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(v.code)}
                      className="dinego-voucher-copy"
                      style={{
                        background: '#F8FAFC',
                        border: '1px dashed #CBD5E1',
                        borderRadius: 6,
                        padding: '2px 7px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0,
                      }}
                      title="Sao chép mã"
                    >
                      <Copy size={10} />
                      <span>{copiedCode === v.code ? 'Đã chép' : v.code}</span>
                    </button>
                  </div>

                  {/* Middle: Headline + Single-Line Info */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {v.discountType === 'PERCENTAGE'
                        ? `Giảm ${v.discountValue}%${v.maxDiscountAmount ? ` • Tối đa ${(v.maxDiscountAmount / 1000).toFixed(0)}k` : ''}`
                        : `Giảm ${v.discountValue.toLocaleString('vi-VN')}đ`}
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: '#64748B',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 2,
                      }}
                    >
                      Đơn từ {Number(v.minOrder || 0).toLocaleString('vi-VN')}đ • HSD {v.endDate}
                      {golden.label ? ` • ${golden.label}` : ''}
                    </div>
                  </div>

                  {/* Bottom: Thin Progress + Actions */}
                  <div>
                    <div style={{ height: 3, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden', marginBottom: 7 }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.72rem' }}>
                        <button
                          type="button"
                          onClick={() => setDetailVoucher(v)}
                          className="dinego-voucher-link"
                          style={{
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                            color: '#64748B',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textDecoration: 'underline',
                            textUnderlineOffset: 2,
                            cursor: 'pointer',
                          }}
                        >
                          Điều kiện
                        </button>
                        <span style={{ color: pct >= 85 ? '#DC2626' : '#009643', fontWeight: 700 }}>
                          {isSoldOut ? 'Hết lượt' : `Còn ${remaining} lượt`}
                        </span>
                      </div>

                      {isClaimed ? (
                        <button
                          type="button"
                          onClick={() => handleUseNow(v)}
                          className="dinego-voucher-used"
                          style={{
                            padding: '5px 12px',
                            borderRadius: 999,
                            border: '1px solid #00B14F',
                            background: '#ECFDF5',
                            color: '#009643',
                            fontWeight: 800,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <span>Dùng ngay</span>
                          <ArrowRight size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSoldOut || !v.isActive || !golden.active || claimingCode === v.code}
                          onClick={() => void handleHuntVoucher(v)}
                          className="dinego-voucher-cta"
                          style={{
                            padding: '5px 14px',
                            borderRadius: 999,
                            border: 'none',
                            background: isSoldOut || !v.isActive || !golden.active ? '#E2E8F0' : '#00B14F',
                            color: isSoldOut || !v.isActive || !golden.active ? '#64748B' : '#FFFFFF',
                            fontWeight: 800,
                            fontSize: '0.76rem',
                            cursor: isSoldOut || !v.isActive || !golden.active ? 'not-allowed' : 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          {isSoldOut
                            ? 'Hết lượt'
                            : !golden.active
                            ? golden.countdownText || `Mở lúc ${v.goldenStartTime}`
                            : claimingCode === v.code
                            ? 'Đang lưu...'
                            : 'Lưu mã'}
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

      {/* Voucher Detail Modal */}
      {detailVoucher && (() => {
        const dv = detailVoucher;
        const dvTheme = getEventThemeStyle(dv.eventTheme);
        const dvClaimed = claimedCodes.includes(dv.code.toUpperCase());
        const dvUsed = Math.max(Number(dv.claimedCount || 0), Number(dv.usageCount || 0));
        const dvMax = Math.max(1, Number(dv.maxUsage || 100));
        const dvRem = Math.max(0, dvMax - dvUsed);
        const dvSoldOut = dvRem <= 0;

        return (
          <div
            onClick={() => setDetailVoucher(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2100,
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                width: '100%',
                maxWidth: 460,
                overflow: 'hidden',
                boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #00B14F 100%)', padding: '18px 22px', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase' }}>
                    {dv.eventTag || dvTheme.label}
                  </span>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: 900 }}>
                    Mã ưu đãi: {dv.code}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailVoucher(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFFFFF', width: 32, height: 32, borderRadius: 999, cursor: 'pointer', fontWeight: 800 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#166534' }}>
                    {dv.discountType === 'PERCENTAGE'
                      ? `Giảm ${dv.discountValue}%${dv.maxDiscountAmount ? ` (tối đa ${dv.maxDiscountAmount.toLocaleString('vi-VN')}đ)` : ''}`
                      : `Giảm ${dv.discountValue.toLocaleString('vi-VN')}đ`}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#15803D', marginTop: 2 }}>{dv.title}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.82rem' }}>
                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700 }}>Đơn tối thiểu</div>
                    <div style={{ color: '#0F172A', fontWeight: 800, marginTop: 2 }}>{Number(dv.minOrder || 0).toLocaleString('vi-VN')}đ</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700 }}>Hạn sử dụng</div>
                    <div style={{ color: '#0F172A', fontWeight: 800, marginTop: 2 }}>{dv.endDate}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700 }}>Phạm vi áp dụng</div>
                    <div style={{ color: '#0F172A', fontWeight: 800, marginTop: 2 }}>{dv.merchantId && dv.merchantId !== 'ALL' ? dv.merchantName : 'Toàn sàn DineGo'}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700 }}>Lượt còn lại</div>
                    <div style={{ color: dvSoldOut ? '#DC2626' : '#059669', fontWeight: 800, marginTop: 2 }}>{dvRem} / {dvMax} lượt</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#475569', background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', lineHeight: 1.5 }}>
                  <strong>Điều kiện áp dụng:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                    <li>Mỗi đơn hàng chỉ áp dụng tối đa 01 mã khuyến mãi.</li>
                    <li>Không áp dụng đồng thời với mã giảm giá khác, không quy đổi thành tiền mặt.</li>
                    <li>Hệ thống tự động kiểm tra điều kiện giá trị đơn tối thiểu &amp; phạm vi quán tại bước Thanh toán.</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(dv.code)}
                    style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Sao chép mã
                  </button>
                  {dvClaimed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailVoucher(null);
                        handleUseNow(dv);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '9px 18px', borderRadius: 10, fontWeight: 800, fontSize: '0.82rem' }}
                    >
                      Dùng ngay
                    </button>
                  ) : (() => {
                    const dvGolden = isWithinGoldenHours(dv, nowMs);
                    const dvDisabled = dvSoldOut || !dv.isActive || !dvGolden.active || claimingCode === dv.code;
                    return (
                      <button
                        type="button"
                        disabled={dvDisabled}
                        onClick={() => {
                          void handleHuntVoucher(dv);
                          setDetailVoucher(null);
                        }}
                        className="btn btn-primary"
                        style={{
                          padding: '9px 18px',
                          borderRadius: 10,
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          opacity: dvDisabled ? 0.55 : 1,
                          cursor: dvDisabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {dvSoldOut
                          ? 'Hết lượt'
                          : !dvGolden.active
                          ? dvGolden.countdownText || `Mở lúc ${dv.goldenStartTime}`
                          : claimingCode === dv.code
                          ? 'Đang săn...'
                          : 'Săn Ngay'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

