// ==============================================================================
// DineGo Frontend — Commercial Storefront Footer (Customer Portal Only)
// ==============================================================================

import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import type { Role } from '../../types';
import type { NavTab } from './Header';

interface FooterProps {
  onNavigate?: (tab: NavTab) => void;
  onOpenAuthModal?: (mode?: 'login' | 'register', targetRole?: Role) => void;
  onOpenMerchantRegisterModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
}) => {
  return (
    <footer
      style={{
        background: '#0F172A',
        color: '#94A3B8',
        padding: '56px 0 32px',
        marginTop: 'auto',
        borderTop: '1px solid #1E293B',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr',
            gap: 40,
            marginBottom: 44,
          }}
        >
          {/* Column 1: Company Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#00B14F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  letterSpacing: -0.5,
                }}
              >
                DG
              </div>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                Dine<span style={{ color: '#00B14F' }}>Go</span>
              </span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.86rem', lineHeight: 1.65, marginBottom: 18 }}>
              Nền tảng đặt món trực tuyến, giao hàng tức thời và dịch vụ đặt tiệc lưu động dành cho gia đình và doanh nghiệp tại Việt Nam.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: '#CBD5E1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={14} color="#64748B" />
                <span>Tòa nhà Saigon Centre, 65 Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} color="#64748B" />
                <span>Tổng đài CSKH: 1900 8826 (07:00 - 23:00)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} color="#64748B" />
                <span>hotro@dinego.vn</span>
              </div>
            </div>
          </div>

          {/* Column 2: Customer Services */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Dịch vụ đặt món
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li>
                <button
                  onClick={() => onNavigate?.('home')}
                  style={{ background: 'transparent', color: '#94A3B8', fontSize: '0.86rem', padding: 0 }}
                >
                  Đặt đồ ăn giao nhanh
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('catering')}
                  style={{ background: 'transparent', color: '#94A3B8', fontSize: '0.86rem', padding: 0 }}
                >
                  Đặt tiệc & Sự kiện lưu động
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('group-order')}
                  style={{ background: 'transparent', color: '#94A3B8', fontSize: '0.86rem', padding: 0 }}
                >
                  Đặt đơn nhóm văn phòng
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('ai-guide')}
                  style={{ background: 'transparent', color: '#94A3B8', fontSize: '0.86rem', padding: 0 }}
                >
                  Tư vấn thực đơn theo khẩu vị
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('orders')}
                  style={{ background: 'transparent', color: '#94A3B8', fontSize: '0.86rem', padding: 0 }}
                >
                  Tra cứu lịch sử đơn hàng
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Regional Specialties */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Khu vực phục vụ
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li>TP. Hồ Chí Minh (Quận 1 - Quận 12, Thủ Đức)</li>
              <li>Hà Nội (Hoàn Kiếm, Ba Đình, Cầu Giấy)</li>
              <li>Đà Nẵng (Hải Châu, Sơn Trà, Ngũ Hành Sơn)</li>
              <li>Cần Thơ & Khu vực Đồng bằng Sông Cửu Long</li>
            </ul>
          </div>

          {/* Column 4: Policies & Payment */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Chính sách & Thanh toán
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <li>Quy chế hoạt động sàn TMĐT</li>
              <li>Chính sách bảo mật thông tin</li>
              <li>Quy trình giải quyết tranh chấp</li>
              <li>Tiêu chuẩn kiểm định VSATTP</li>
            </ul>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 10px', borderRadius: 6, background: '#1E293B', color: '#E2E8F0', fontSize: '0.75rem', fontWeight: 600 }}>
                MoMo QR
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 6, background: '#1E293B', color: '#E2E8F0', fontSize: '0.75rem', fontWeight: 600 }}>
                Tiền mặt (COD)
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 6, background: '#1E293B', color: '#E2E8F0', fontSize: '0.75rem', fontWeight: 600 }}>
                VietQR
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #1E293B',
            paddingTop: 22,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#64748B',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>© 2026 Công ty Cổ phần Công nghệ Ẩm thực DineGo Việt Nam. GPKD số 0318992810.</div>
          <div>Đã đăng ký Bộ Công Thương • Bảo mật thanh toán chuẩn PCI-DSS</div>
        </div>
      </div>
    </footer>
  );
};
