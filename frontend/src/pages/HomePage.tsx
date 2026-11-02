// ==============================================================================
// DineGo Frontend — Home Page Component
// ==============================================================================

import React, { useState } from 'react';
import { Star, Clock, MapPin, Search, ArrowRight, Sparkles, Tag } from 'lucide-react';
import { MOCK_MERCHANTS } from '../api/client';
import type { Merchant } from '../types';

interface HomePageProps {
  onSelectMerchant: (merchant: Merchant) => void;
  onNavigate: (tab: 'home' | 'restaurant' | 'checkout' | 'orders') => void;
}

const CATEGORIES = ['Tất cả', 'Phở / Bún', 'Cơm', 'Trà sữa', 'Pizza', 'Món Việt'];

export const HomePage: React.FC<HomePageProps> = ({ onSelectMerchant, onNavigate: _onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMerchants = MOCK_MERCHANTS.filter((m) => {
    const matchCategory =
      selectedCategory === 'Tất cả' ||
      (m.categories && m.categories.includes(selectedCategory));
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="container">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-pill">
            <Sparkles size={16} />
            Ưu đãi MoMo: Giảm 50.000đ cho đơn đầu tiên
          </div>
          <h1 className="hero-title">
            Thưởng thức <span>món ngon chuẩn vị</span> giao tận cửa chỉ 20 phút
          </h1>
          <p className="hero-desc">
            Đặt món trực tuyến từ các quán ăn danh tiếng, hỗ trợ thanh toán tức thì qua cổng MoMo All-in-One Gateway v2 và tích điểm thưởng.
          </p>

          {/* Quick Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 8px 6px 18px',
              maxWidth: 480,
            }}
          >
            <Search size={20} color="var(--text-muted)" style={{ marginRight: 10 }} />
            <input
              type="text"
              placeholder="Tìm quán ăn, món phở, cơm tấm, trà sữa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.95rem',
                flexGrow: 1,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Hero Visual badge */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-strong)',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(216, 45, 139, 0.15)',
                color: '#D82D8B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.2rem',
              }}
            >
              M
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Cổng thanh toán</div>
              <div style={{ fontWeight: 700, color: '#D82D8B' }}>MoMo All-in-One v2</div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-strong)',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tag size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Voucher khả dụng</div>
              <div style={{ fontWeight: 700, color: '#10B981' }}>DINEGO50, FREESHIP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="category-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
            Nhà hàng nổi bật
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Tìm thấy {filteredMerchants.length} nhà hàng đang hoạt động
          </p>
        </div>
      </div>

      {/* Restaurant Grid */}
      <div className="grid-restaurants">
        {filteredMerchants.map((merchant) => (
          <div
            key={merchant.id}
            className="card-restaurant"
            onClick={() => onSelectMerchant(merchant)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={merchant.coverUrl}
                alt={merchant.name}
                className="card-cover"
                loading="lazy"
              />
              <span className="badge-open">Đang mở cửa</span>
            </div>

            <div className="card-body">
              <h3 className="card-name">{merchant.name}</h3>

              <div className="card-meta">
                <span className="meta-item star-rating">
                  <Star size={15} fill="#F59E0B" />
                  {merchant.rating} ({merchant.reviewCount})
                </span>
                <span>•</span>
                <span className="meta-item">
                  <Clock size={15} />
                  {merchant.deliveryTimeMin}-{merchant.deliveryTimeMax} phút
                </span>
              </div>

              <div className="card-address">
                <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                {merchant.address}
              </div>

              <button className="btn-view-menu">
                <span>Xem thực đơn</span>
                <ArrowRight size={15} style={{ display: 'inline', marginLeft: 6 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
