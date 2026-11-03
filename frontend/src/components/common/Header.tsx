// ==============================================================================
// DineGo Frontend — Header Navigation Component (All Sprints 1 - 5)
// ==============================================================================

import React from 'react';
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
  UserCheck,
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
  currentUser: User;
  onOpenAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onOpenAuthModal,
}) => {
  const { cartCount, cart } = useCart();

  const getRoleBadge = (user: User) => {
    if (user.roles.includes('ADMIN')) return { label: 'Admin', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
    if (user.roles.includes('MERCHANT')) return { label: 'Chủ Quán', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    if (user.roles.includes('DRIVER')) return { label: 'Tài Xế', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' };
    return { label: 'Khách Hàng', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
  };

  const badge = getRoleBadge(currentUser);

  return (
    <header className="header-glass" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        {/* Brand */}
        <div
          className="brand-logo"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          onClick={() => onNavigate('home')}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(255, 87, 34, 0.4)',
            }}
          >
            <Flame size={22} />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: -0.5 }}>
            Dine<span className="brand-badge">Go</span>
          </div>
        </div>

        {/* Navigation Tabs covering all 5 sprints */}
        <nav className="nav-links" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`nav-item ${currentTab === 'home' || currentTab === 'restaurant' ? 'active' : ''}`}
            onClick={() => onNavigate('home')}
            style={{ fontSize: '0.85rem' }}
          >
            <Sparkles size={15} />
            Khám phá
          </button>

          <button
            className={`nav-item ${currentTab === 'catering' ? 'active' : ''}`}
            onClick={() => onNavigate('catering')}
            style={{ fontSize: '0.85rem' }}
          >
            <UtensilsCrossed size={15} />
            Mâm cỗ sự kiện
          </button>

          <button
            className={`nav-item ${currentTab === 'group-order' ? 'active' : ''}`}
            onClick={() => onNavigate('group-order')}
            style={{ fontSize: '0.85rem' }}
          >
            <Users size={15} />
            Đặt nhóm
          </button>

          <button
            className={`nav-item ${currentTab === 'ai-guide' ? 'active' : ''}`}
            onClick={() => onNavigate('ai-guide')}
            style={{ fontSize: '0.85rem' }}
          >
            <Compass size={15} />
            AI Guide
          </button>

          <button
            className={`nav-item ${currentTab === 'tracking' ? 'active' : ''}`}
            onClick={() => onNavigate('tracking')}
            style={{ fontSize: '0.85rem' }}
          >
            <Bike size={15} />
            Lộ trình giao
          </button>

          <button
            className={`nav-item ${currentTab === 'orders' ? 'active' : ''}`}
            onClick={() => onNavigate('orders')}
            style={{ fontSize: '0.85rem' }}
          >
            <Clock size={15} />
            Đơn của tôi
          </button>

          <button
            className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
            style={{ fontSize: '0.85rem' }}
          >
            <BarChart3 size={15} />
            Quản trị & Báo cáo
          </button>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* User profile & Role switcher button */}
          <div
            onClick={onOpenAuthModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 20,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Bấm để đổi vai trò hoặc đăng nhập tài khoản khác"
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: badge.color,
                background: badge.bg,
                padding: '2px 8px',
                borderRadius: 12,
              }}
            >
              {badge.label}
            </span>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.fullName}
            </span>
          </div>

          {/* Cart Button */}
          <button
            className="cart-btn"
            onClick={() => onNavigate('checkout')}
            title="Xem giỏ hàng và thanh toán"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <ShoppingBag size={17} />
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            {cart.subtotal > 0 && (
              <span style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: 6 }}>
                {cart.subtotal.toLocaleString('vi-VN')}đ
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
