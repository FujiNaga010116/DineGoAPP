// ==============================================================================
// DineGo Frontend — Commercial Storefront Footer (Customer Portal Only)
// ==============================================================================

import React from 'react';
import { Phone, Mail, MapPin, Store, Bike } from 'lucide-react';
import type { Role } from '../../../types';
import type { NavTab } from './Header';

interface FooterProps {
  onNavigate?: (tab: NavTab) => void;
  onOpenAuthModal?: (mode?: 'login' | 'register', targetRole?: Role) => void;
  onOpenMerchantRegisterModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAuthModal,
  onOpenMerchantRegisterModal,
}) => {
  return (
    <footer
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FBF6 55%, #E4F7ED 100%)',
        color: '#374151',
        padding: '26px 0 20px',
        marginTop: 'auto',
        borderTop: '1px solid #D1FAE5',
      }}
    >
      <div className="container">
        {/* Main Row: Brand + Contact (Left) & Compact Partner Actions (Right) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
            paddingBottom: 18,
            borderBottom: '1px solid rgba(0, 177, 79, 0.14)',
          }}
        >
          {/* Brand & High-Contrast Info */}
          <div style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <img
                src="/images/dinego-logo.png"
                alt="DineGo Logo"
                style={{
                  width: 36,
                  height: 36,
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: '#111827',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                DineGo
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#009643',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                <MapPin size={11} />
                TP. Hồ Chí Minh
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#4B5563', margin: '0 0 8px', lineHeight: 1.5 }}>
              Đặt món giao nhanh, đặt tiệc lưu động và săn ưu đãi mỗi ngày.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: '0.82rem', color: '#111827', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Phone size={14} color="#00B14F" />
                1900 8826 <span style={{ color: '#6B7280', fontWeight: 500 }}>(07:00 – 23:00)</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} color="#FF5722" />
                hotro@dinego.vn
              </span>
            </div>
          </div>

          {/* Compact Partner Actions */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <button
              type="button"
              onClick={() => onOpenMerchantRegisterModal?.()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: '#00B14F',
                color: '#FFFFFF',
                border: '1px solid #00B14F',
                borderRadius: 10,
                padding: '9px 15px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 177, 79, 0.22)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#009643';
                e.currentTarget.style.borderColor = '#009643';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#00B14F';
                e.currentTarget.style.borderColor = '#00B14F';
              }}
            >
              <Store size={14} />
              Đăng ký mở quán
            </button>

            <button
              type="button"
              onClick={() => onOpenAuthModal?.('register', 'DRIVER')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: '#F9FAFB',
                color: '#111827',
                border: '1px solid #D1D5DB',
                borderRadius: 10,
                padding: '9px 15px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFF7ED';
                e.currentTarget.style.color = '#EA580C';
                e.currentTarget.style.borderColor = '#FDBA74';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F9FAFB';
                e.currentTarget.style.color = '#111827';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
            >
              <Bike size={14} color="#FF5722" />
              Đăng ký tài xế
            </button>
          </div>
        </div>

        {/* Bottom Copyright & Payment Chips */}
        <div
          style={{
            paddingTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: '0.78rem',
            color: '#4B5563',
          }}
        >
          <span>© 2026 DineGo Việt Nam • Giao hàng nội thành TP. Hồ Chí Minh</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {['MoMo', 'VietQR', 'Tiền mặt'].map((method) => (
              <span
                key={method}
                style={{
                  background: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #D1FAE5',
                  borderRadius: 6,
                  padding: '3px 9px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
