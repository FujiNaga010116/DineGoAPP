// ==============================================================================
// DineGo Frontend — Market-Grade Header Navigation (GrabFood / ShopeeFood Style)
// Guest State, Login/Register Trigger, Location Picker, Cart, Role Badges
// ==============================================================================

import React, { useState } from 'react';
import {
  ShoppingBag,
  Flame,
  Clock,
  Sparkles,
  UtensilsCrossed,
  Users,
  Compass,
  Bike,
  BarChart3,
  MapPin,
  LogIn,
  UserPlus,
  LogOut,
  ChevronDown,
  User as UserIcon,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import type { User } from '../../types';

export type NavTab =
  | 'home'
  | 'restaurant'
  | 'checkout'
  | 'orders'
  | 'catering'
  | 'group-order'
  | 'ai-guide'
  | 'tracking'
  | 'dashboard';

interface HeaderProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  currentUser: User | null;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenMerchantRegisterModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenMerchantRegisterModal,
}) => {
  const { cartCount, cart } = useCart();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('123 Nguyễn Huệ, P. Bến Nghé, Quận 1');
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const getRoleBadge = (user: User) => {
    if (user.roles.includes('ADMIN')) {
      return { label: 'Admin Sàn', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', icon: <ShieldCheck size={13} /> };
    }
    if (user.roles.includes('MERCHANT')) {
      return { label: 'Chủ Quán', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', icon: <Store size={13} /> };
    }
    if (user.roles.includes('DRIVER')) {
      return { label: 'Tài Xế', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)', icon: <Bike size={13} /> };
    }
    return { label: 'Khách Hàng', color: '#00B14F', bg: 'rgba(0, 177, 79, 0.12)', icon: <UserIcon size={13} /> };
  };

  const badge = currentUser ? getRoleBadge(currentUser) : null;

  return (
    <header className="header-glass" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Top Location Bar (GrabFood Signature) */}
      <div
        style={{
          background: '#0F172A',
          color: '#E2E8F0',
          padding: '6px 20px',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setAddressModalOpen(true)}>
          <MapPin size={14} color="#00B14F" />
          <span style={{ color: '#94A3B8' }}>Giao đến:</span>
          <strong style={{ color: '#F8FAFC' }}>{deliveryAddress}</strong>
          <ChevronDown size={12} color="#94A3B8" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#F59E0B', fontWeight: 600 }}>🔥 Miễn phí giao hàng đơn từ 0đ hôm nay</span>
          <span style={{ color: '#94A3B8' }}>Hotline: 1900 8826</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="container header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 74 }}>
        {/* Brand Logo */}
        <div
          className="brand-logo"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          onClick={() => onNavigate('home')}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #00B14F 0%, #00873C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0, 177, 79, 0.35)',
            }}
          >
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#111827', letterSpacing: -0.5 }}>
              Dine<span style={{ color: '#00B14F' }}>Go</span>
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#00B14F', letterSpacing: 1.5, marginTop: -4 }}>
              DELIVERY & FEAST
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Sprint 1 to 5) */}
        <nav className="nav-links">
          <button
            className={`nav-item ${currentTab === 'home' || currentTab === 'restaurant' ? 'active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            <Sparkles size={16} />
            Khám phá
          </button>

          <button
            className={`nav-item ${currentTab === 'catering' ? 'active' : ''}`}
            onClick={() => onNavigate('catering')}
          >
            <UtensilsCrossed size={16} />
            Mâm cỗ tiệc
          </button>

          <button
            className={`nav-item ${currentTab === 'group-order' ? 'active' : ''}`}
            onClick={() => onNavigate('group-order')}
          >
            <Users size={16} />
            Đặt nhóm
          </button>

          <button
            className={`nav-item ${currentTab === 'ai-guide' ? 'active' : ''}`}
            onClick={() => onNavigate('ai-guide')}
          >
            <Compass size={16} />
            AI Guide
          </button>

          <button
            className={`nav-item ${currentTab === 'tracking' ? 'active' : ''}`}
            onClick={() => onNavigate('tracking')}
          >
            <Bike size={16} />
            Lộ trình giao
          </button>

          <button
            className={`nav-item ${currentTab === 'orders' ? 'active' : ''}`}
            onClick={() => {
              if (!currentUser) {
                onOpenAuthModal('login');
              } else {
                onNavigate('orders');
              }
            }}
          >
            <Clock size={16} />
            Đơn của tôi
          </button>

          {/* Tab Quản lý: chỉ hiện cho Merchant hoặc Admin */}
          {currentUser && (currentUser.roles.includes('ADMIN') || currentUser.roles.includes('MERCHANT')) && (
            <button
              className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => onNavigate('dashboard')}
            >
              <BarChart3 size={16} />
              Quản trị sàn
            </button>
          )}
        </nav>

        {/* Right Section: Cart + Auth Buttons / User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mở Quán Bán Hàng (Đối tác Nhà Hàng) */}
          {onOpenMerchantRegisterModal && (
            <button
              onClick={onOpenMerchantRegisterModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#D97706',
                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Store size={15} /> Mở Quán Bán Hàng
            </button>
          )}

          {/* Cart Button */}
          <button
            className="cart-btn"
            onClick={() => onNavigate('checkout')}
            title="Xem giỏ hàng"
          >
            <ShoppingBag size={18} />
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            {cart.subtotal > 0 && (
              <span style={{ borderLeft: '1px solid rgba(255,255,255,0.4)', paddingLeft: 8, fontSize: '0.88rem' }}>
                {cart.subtotal.toLocaleString('vi-VN')}đ
              </span>
            )}
          </button>

          {/* GUEST MODE: Chức năng Đăng nhập & Đăng ký */}
          {!currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => onOpenAuthModal('login')}
                className="btn btn-secondary"
                style={{
                  padding: '9px 16px',
                  borderRadius: 12,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LogIn size={16} />
                Đăng nhập
              </button>

              <button
                onClick={() => onOpenAuthModal('register')}
                className="btn btn-primary"
                style={{
                  padding: '9px 18px',
                  borderRadius: 12,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <UserPlus size={16} />
                Đăng ký
              </button>
            </div>
          ) : (
            /* LOGGED IN USER PROFILE & DROPDOWN */
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 14px 6px 8px',
                  borderRadius: 24,
                  background: '#FFFFFF',
                  border: '1.5px solid #E5E7EB',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                }}
              >
                <img
                  src={
                    currentUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.fullName}
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.fullName}
                  </div>
                  {badge && (
                    <div
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: badge.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      {badge.icon} {badge.label}
                    </div>
                  )}
                </div>
                <ChevronDown size={14} color="#6B7280" />
              </div>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '115%',
                    right: 0,
                    width: 240,
                    background: '#FFFFFF',
                    borderRadius: 16,
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #E5E7EB',
                    padding: 8,
                    zIndex: 200,
                  }}
                >
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                      {currentUser.fullName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {currentUser.email}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenAuthModal('login');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      color: '#374151',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserIcon size={16} /> Đổi tài khoản / Vai trò
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('orders');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      color: '#374151',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Clock size={16} /> Đơn hàng của tôi
                  </button>

                  <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      color: '#EF4444',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} /> Đăng xuất (Về Guest)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Address Picker Modal */}
      {addressModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420, padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8, color: '#111827' }}>
              Chọn địa chỉ nhận hàng
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 16 }}>
              DineGo sẽ tính toán chính xác phí ship và thời gian giao hàng tới bạn
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                '123 Nguyễn Huệ, P. Bến Nghé, Quận 1',
                '45 Lê Duẩn, P. Bến Nghé, Quận 1',
                'Tòa nhà Landmark 81, Vinhomes Central Park, Bình Thạnh',
                '15 Mai Chí Thọ, P. An Phú, TP. Thủ Đức',
              ].map((addr, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setDeliveryAddress(addr);
                    setAddressModalOpen(false);
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${deliveryAddress === addr ? '#00B14F' : '#E5E7EB'}`,
                    background: deliveryAddress === addr ? '#F0FDF4' : '#F9FAFB',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: deliveryAddress === addr ? 700 : 500,
                    color: deliveryAddress === addr ? '#00B14F' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <MapPin size={16} />
                  <span>{addr}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setAddressModalOpen(false)}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '10px' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
