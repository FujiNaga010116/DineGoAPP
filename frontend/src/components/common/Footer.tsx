// ==============================================================================
// DineGo Frontend — Modern Slate Footer Component (GrabFood Market Style)
// ==============================================================================

import React from 'react';
import { Flame, ShieldCheck, Zap, Database, Smartphone, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ background: '#0F172A', color: '#94A3B8', padding: '48px 0 28px', marginTop: 'auto' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 36,
            marginBottom: 36,
          }}
        >
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <Flame size={22} />
              </div>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                Dine<span style={{ color: 'var(--primary)' }}>Go</span>
              </span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 16 }}>
              Nền tảng giao đồ ăn và mâm cỗ trực tuyến thế hệ mới. Trải nghiệm mượt mà theo tiêu chuẩn thị trường GrabFood, tích hợp MoMo Gateway v2.
            </p>
            <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
              © 2026 DineGo Vietnam • Nhóm 17
            </div>
          </div>

          {/* Tech Spec */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontSize: '0.98rem', fontWeight: 800, marginBottom: 14 }}>
              Kiến Trúc Kỹ Thuật (Sprints 1 - 5)
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={15} color="var(--primary)" />
                <span style={{ color: '#CBD5E1' }}>NestJS 11 + TypeScript 5.7 (ESM)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={15} color="#38BDF8" />
                <span style={{ color: '#CBD5E1' }}>Microsoft SQL Server 2022/2025 (`dinego_db`)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={15} color="#34D399" />
                <span style={{ color: '#CBD5E1' }}>Prisma ORM v6 (18 Quan hệ thực thể)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Smartphone size={15} color="#F472B6" />
                <span style={{ color: '#CBD5E1' }}>Cổng thanh toán MoMo OpenAPI v2 (HMAC-SHA256)</span>
              </li>
            </ul>
          </div>

          {/* Sprints Summary */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontSize: '0.98rem', fontWeight: 800, marginBottom: 14 }}>
              Tiến Độ Sprints Nghiệm Thu
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34D399' }}>
                <span>Sprint 1 & 2: Food Delivery & Cart</span>
                <span>✓ Hoàn tất</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34D399' }}>
                <span>Sprint 2: Group Order & Split Bill</span>
                <span>✓ Hoàn tất</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34D399' }}>
                <span>Sprint 3: Catering Feast & Đặt cọc</span>
                <span>✓ Hoàn tất</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34D399' }}>
                <span>Sprint 4: AI Culinary Guide & GPS Tracking</span>
                <span>✓ Hoàn tất</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38BDF8' }}>
                <span>Sprint 5: Merchant/Admin Dashboard & MoMo</span>
                <span>✓ Hoàn thành</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#64748B',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>DineGo Food Delivery Ecosystem • Đồ án tốt nghiệp / Bài tập lớn Nhóm 17</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Phát triển với tinh thần nghiêm túc và cầu thị</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
