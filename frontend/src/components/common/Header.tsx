// ==============================================================================
// DineGo Frontend — Customer Storefront Header (Consumer E-Commerce Layout)
// Strictly Customer-only navigation (No cross-role switcher clutter)
// Fixed horizontal overflow so right-side profile & dropdown never clip
// ==============================================================================

import React, { useState } from 'react';
import {
  ShoppingBag,
  MapPin,
  ChevronDown,
  LogOut,
  User as UserIcon,
  ClipboardList,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import type { Role, User } from '../../types';

export type NavTab =
  | 'home'
  | 'restaurant'
  | 'checkout'
  | 'orders'
  | 'catering'
  | 'group-order'
  | 'ai-guide'
  | 'tracking'
  | 'customer-profile'
  | 'dashboard'
  // Merchant Portal Tabs
  | 'merchant-orders'
  | 'merchant-menu'
  | 'merchant-catering'
  | 'merchant-analytics'
  | 'merchant-kyc'
  // Driver Portal Tabs
  | 'driver-orders'
  | 'driver-map'
  | 'driver-history'
  | 'driver-earnings'
  | 'driver-profile'
  // Admin Portal Tabs
  | 'admin-overview'
  | 'admin-merchants'
  | 'admin-drivers'
  | 'admin-users'
  | 'admin-complaints'
  | 'admin-reconciliation'
  | 'admin-knowledge'
  | 'admin-settings';

interface HeaderProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  currentUser: User | null;
  onOpenAuthModal: (mode?: 'login' | 'register', targetRole?: Role) => void;
  onLogout: () => void;
  onOpenMerchantRegisterModal?: () => void;
  activeOrdersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const { cartCount, cart } = useCart();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(
    currentUser?.address || '123 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. HCM',
  );
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Customer Utility Bar (Address & Hotline only — no role-switching clutter) */}
      <div
        style={{
          background: '#0F172A',
          color: '#CBD5E1',
          padding: '6px 0',
          fontSize: '0.76rem',
          borderBottom: '1px solid #1E293B',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            boxSizing: 'border-box',
          }}
        >
          {/* Left: Delivery Address Picker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              minWidth: 0,
              flex: 1,
            }}
            onClick={() => setAddressModalOpen(true)}
          >
            <MapPin size={13} color="#00B14F" style={{ flexShrink: 0 }} />
            <span style={{ color: '#94A3B8', flexShrink: 0 }}>Giao đến:</span>
            <strong
              style={{
                color: '#F8FAFC',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser?.address || deliveryAddress}
            </strong>
            <ChevronDown size={12} color="#94A3B8" style={{ flexShrink: 0 }} />
          </div>

          {/* Right: Customer Support Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <span style={{ color: '#94A3B8' }}>Giao nhanh 25 phút</span>
            <span style={{ color: '#334155' }}>|</span>
            <span style={{ color: '#CBD5E1', fontWeight: 600 }}>Tổng đài CSKH: 1900 8826</span>
          </div>
        </div>
      </div>

      {/* Main Customer Navigation Bar */}
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 66,
          gap: 14,
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* Brand Wordmark */}
        <div
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}
          onClick={() => onNavigate('home')}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#00B14F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: '0.98rem',
              letterSpacing: -0.5,
            }}
          >
            DG
          </div>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', letterSpacing: -0.6, lineHeight: 1 }}>
              Dine<span style={{ color: '#00B14F' }}>Go</span>
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748B', letterSpacing: 0.4, marginTop: 2 }}>
              GIAO ĐỒ ĂN & ĐẶT TIỆC
            </div>
          </div>
        </div>

        {/* Navigation Links (Responsive, scrollable without forcing container overflow) */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 66,
            flex: 1,
            minWidth: 0,
            justifyContent: 'center',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'home' as NavTab, label: 'Đặt đồ ăn', activeMatch: ['home', 'restaurant'] },
            { id: 'catering' as NavTab, label: 'Đặt tiệc lưu động', activeMatch: ['catering'] },
            { id: 'group-order' as NavTab, label: 'Đặt đơn nhóm', activeMatch: ['group-order'] },
            { id: 'ai-guide' as NavTab, label: 'Tư vấn thực đơn', activeMatch: ['ai-guide'] },
            { id: 'tracking' as NavTab, label: 'Theo dõi đơn', activeMatch: ['tracking'] },
            { id: 'orders' as NavTab, label: 'Đơn hàng', activeMatch: ['orders'], requiresAuth: true },
          ].map((item) => {
            const isActive = item.activeMatch.includes(currentTab);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.requiresAuth && !currentUser) {
                    onOpenAuthModal('login', 'CUSTOMER');
                  } else {
                    onNavigate(item.id);
                  }
                }}
                style={{
                  height: '100%',
                  padding: '0 11px',
                  background: 'transparent',
                  color: isActive ? '#00B14F' : '#334155',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.86rem',
                  borderBottom: isActive ? '2.5px solid #00B14F' : '2.5px solid transparent',
                  borderRadius: 0,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Cart & User Account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => onNavigate('checkout')}
            title="Giỏ hàng"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 13px',
              borderRadius: 8,
              background: cartCount > 0 ? '#00B14F' : '#F1F5F9',
              color: cartCount > 0 ? '#FFFFFF' : '#0F172A',
              fontWeight: 700,
              fontSize: '0.84rem',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            <ShoppingBag size={15} />
            <span>Giỏ hàng ({cartCount})</span>
            {cart.subtotal > 0 && (
              <span style={{ borderLeft: '1px solid rgba(255,255,255,0.35)', paddingLeft: 7 }}>
                {cart.subtotal.toLocaleString('vi-VN')}đ
              </span>
            )}
          </button>

          {!currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => onOpenAuthModal('login', 'CUSTOMER')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => onOpenAuthModal('register', 'CUSTOMER')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Đăng ký
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 10px 5px 6px',
                  borderRadius: 8,
                  background: currentTab === 'customer-profile' ? '#F0FDF4' : '#F8FAFC',
                  border: `1px solid ${currentTab === 'customer-profile' ? '#00B14F' : '#E2E8F0'}`,
                  cursor: 'pointer',
                  maxWidth: 190,
                }}
              >
                <img
                  src={
                    currentUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.fullName}
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: '0.83rem',
                    fontWeight: 600,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentUser.fullName}
                </span>
                <ChevronDown size={14} color="#64748B" style={{ flexShrink: 0 }} />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    onClick={() => setUserDropdownOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 190 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 240,
                      maxWidth: 'calc(100vw - 28px)',
                      background: '#FFFFFF',
                      borderRadius: 12,
                      boxShadow: '0 16px 36px rgba(15, 23, 42, 0.18)',
                      border: '1px solid #E2E8F0',
                      padding: 6,
                      zIndex: 300,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentUser.fullName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentUser.email}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('customer-profile');
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        background: currentTab === 'customer-profile' ? '#F0FDF4' : 'transparent',
                        textAlign: 'left',
                        fontSize: '0.84rem',
                        color: currentTab === 'customer-profile' ? '#00B14F' : '#334155',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <UserIcon size={15} /> Quản lý tài khoản
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('orders');
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        background: currentTab === 'orders' ? '#F0FDF4' : 'transparent',
                        textAlign: 'left',
                        fontSize: '0.84rem',
                        color: currentTab === 'orders' ? '#00B14F' : '#334155',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <ClipboardList size={15} /> Đơn hàng của tôi
                    </button>

                    <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        background: '#FEF2F2',
                        textAlign: 'left',
                        fontSize: '0.84rem',
                        color: '#DC2626',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <LogOut size={15} /> Đăng xuất tài khoản
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Address Picker Modal */}
      {addressModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460, padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6, color: '#0F172A' }}>
              Địa chỉ giao hàng
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
              Chọn địa chỉ nhận món để hệ thống tính phí vận chuyển và thời gian giao dự kiến
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {(currentUser?.savedAddresses && currentUser.savedAddresses.length > 0
                ? currentUser.savedAddresses.map((a) => `${a.label}: ${a.fullAddress}`)
                : [
                    '123 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. HCM',
                    '45 Lê Duẩn, P. Bến Nghé, Quận 1, TP. HCM',
                    'Tòa nhà Landmark 81, Vinhomes Central Park, Bình Thạnh',
                    '15 Mai Chí Thọ, P. An Phú, TP. Thủ Đức',
                  ]
              ).map((addr, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setDeliveryAddress(addr);
                    setAddressModalOpen(false);
                  }}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: `1px solid ${deliveryAddress === addr ? '#00B14F' : '#E2E8F0'}`,
                    background: deliveryAddress === addr ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: deliveryAddress === addr ? 700 : 500,
                    color: deliveryAddress === addr ? '#00B14F' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <MapPin size={15} style={{ flexShrink: 0 }} />
                  <span>{addr}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {currentUser && (
                <button
                  onClick={() => {
                    setAddressModalOpen(false);
                    onNavigate('customer-profile');
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', borderRadius: 8 }}
                >
                  Quản lý sổ địa chỉ
                </button>
              )}
              <button
                onClick={() => setAddressModalOpen(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px', borderRadius: 8 }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
