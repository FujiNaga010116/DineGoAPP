// ==============================================================================
// DineGo Frontend — Header Navigation Component
// ==============================================================================

import React from 'react';
import { ShoppingBag, Flame, Clock, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { CURRENT_USER } from '../../api/client';

interface HeaderProps {
  currentTab: 'home' | 'restaurant' | 'checkout' | 'orders';
  onNavigate: (tab: 'home' | 'restaurant' | 'checkout' | 'orders') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const { cartCount, cart } = useCart();

  return (
    <header className="header-glass">
      <div className="container header-inner">
        {/* Brand */}
        <div
          className="brand-logo"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('home')}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FF5722 0%, #FF7043 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(255, 87, 34, 0.4)',
            }}
          >
            <Flame size={24} />
          </div>
          <div>
            Dine<span className="brand-badge">Go</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav-links">
          <button
            className={`nav-item ${currentTab === 'home' ? 'active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            <Sparkles size={16} />
            Khám phá
          </button>
          <button
            className={`nav-item ${currentTab === 'orders' ? 'active' : ''}`}
            onClick={() => onNavigate('orders')}
          >
            <Clock size={16} />
            Đơn của tôi
          </button>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* User badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.85rem',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
              }}
            />
            <span style={{ fontWeight: 600 }}>{CURRENT_USER.fullName}</span>
          </div>

          {/* Cart Button */}
          <button
            className="cart-btn"
            onClick={() => onNavigate('checkout')}
            title="Xem giỏ hàng và thanh toán"
          >
            <ShoppingBag size={18} />
            <span>Giỏ hàng</span>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            {cart.subtotal > 0 && (
              <span
                style={{
                  borderLeft: '1px solid rgba(255,255,255,0.3)',
                  paddingLeft: 8,
                  fontSize: '0.88rem',
                }}
              >
                {cart.subtotal.toLocaleString('vi-VN')}đ
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
