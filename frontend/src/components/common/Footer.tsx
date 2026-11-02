// ==============================================================================
// DineGo Frontend — Footer Component
// ==============================================================================

import React from 'react';
import { Flame, ShieldCheck, Zap, Database, Smartphone } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-wrap">
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 40,
            marginBottom: 40,
          }}
        >
          {/* Brand Col */}
          <div>
            <div className="brand-logo" style={{ marginBottom: 16 }}>
              <Flame size={26} color="#FF5722" />
              <div>
                Dine<span className="brand-badge">Go</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
              Hệ thống đặt món và giao đồ ăn thông minh. Kiến trúc Clean Architecture, Modular Monolith, tích hợp MoMo All-in-One Gateway v2.
            </p>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>© 2026 DineGo Nhóm 17</span>
            </div>
          </div>

          {/* Tech Spec */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
              Công nghệ Backend
            </h4>
            <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color="#FF5722" />
                <span>NestJS 12 + TypeScript 5.8 (ESM)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="#3B82F6" />
                <span>Microsoft SQL Server Express 2022 (SSMS)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} color="#10B981" />
                <span>Prisma ORM (5 Active Migrations)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Smartphone size={16} color="#D82D8B" />
                <span>MoMo All-in-One Gateway v2 (HMAC-SHA256)</span>
              </li>
            </ul>
          </div>

          {/* Phase status */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
              Tiến độ phát triển
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                <span>Phase 0–4: Auth, Catalog, Merchant</span>
                <span>✓ Xong</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                <span>Phase 5.1: Cart Engine</span>
                <span>✓ Xong</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                <span>Phase 5.2: Promotion Engine</span>
                <span>✓ Xong</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                <span>Phase 5.3: Order Engine</span>
                <span>✓ Xong</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D82D8B', fontWeight: 700 }}>
                <span>Phase 6: MoMo Payment Engine</span>
                <span>✓ Hoàn thành</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span>DineGo Frontend Prototype — Phục vụ mục đích xem trước và đối soát API hệ thống</span>
          <span style={{ color: '#D82D8B', fontWeight: 600 }}>MoMo Sandbox Connected</span>
        </div>
      </div>
    </footer>
  );
};
