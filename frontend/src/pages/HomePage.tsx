// ==============================================================================
// DineGo Frontend — Customer Storefront Home Page
// Editorial Hero Search, Photographic Category Grid, Flash Deals, Curated Restaurants
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Star,
  Clock,
  Search,
  ArrowRight,
  Tag,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import { MOCK_MERCHANTS } from '../api/client';
import type { Merchant } from '../types';

interface HomePageProps {
  onSelectMerchant: (merchant: Merchant) => void;
  onNavigate: (tab: any) => void;
  merchants?: Merchant[];
  onOpenMerchantRegisterModal?: () => void;
}

const CATEGORIES = [
  {
    id: 'all',
    name: 'Tất cả danh mục',
    count: '120+ quán',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'com',
    name: 'Cơm tấm & Cơm văn phòng',
    count: '38 quán',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'pho',
    name: 'Phở, Bún & Món nước',
    count: '42 quán',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'tra-sua',
    name: 'Trà sữa & Cà phê',
    count: '54 quán',
    image: 'https://images.unsplash.com/photo-1558857563-b37cfb8cb36b?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'mam-co',
    name: 'Đặt tiệc & Mâm cỗ',
    count: 'Dịch vụ lưu động',
    image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'pizza',
    name: 'Pizza, Burger & Âu Mỹ',
    count: '26 quán',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  onSelectMerchant,
  onNavigate,
  merchants,
  onOpenMerchantRegisterModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'NEARBY' | 'TOP_RATED'>('ALL');
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 2, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const allMerchantsList = merchants || MOCK_MERCHANTS;

  const filteredMerchants = allMerchantsList.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.address.toLowerCase().includes(searchQuery.toLowerCase());

    let matchCategory = true;
    if (selectedCategory === 'com')
      matchCategory = Boolean(m.name.includes('Cơm') || (m.categories && m.categories.includes('Cơm')));
    if (selectedCategory === 'pho')
      matchCategory = Boolean(m.name.includes('Phở') || m.name.includes('Bún') || (m.categories && m.categories.includes('Phở / Bún')));
    if (selectedCategory === 'tra-sua')
      matchCategory = Boolean(m.name.includes('Trà Sữa') || (m.categories && m.categories.includes('Trà sữa')));
    if (selectedCategory === 'pizza')
      matchCategory = Boolean(m.name.includes('Pizza') || (m.categories && m.categories.includes('Pizza')));

    let matchFilter = true;
    if (filterMode === 'TOP_RATED') matchFilter = (m.rating || 0) >= 4.8;
    if (filterMode === 'NEARBY') matchFilter = (m.deliveryTimeMin || 20) <= 15;

    return matchSearch && matchCategory && matchFilter;
  });

  return (
    <div style={{ paddingBottom: 72 }}>
      {/* 1. EDITORIAL HERO SECTION WITH INTEGRATED SEARCH */}
      <div
        style={{
          background: '#0F172A',
          borderBottom: '1px solid #1E293B',
          padding: '44px 0',
          color: '#FFFFFF',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.35fr 1fr',
              gap: 32,
              alignItems: 'center',
            }}
          >
            {/* Left Column: Headline & Search Bar */}
            <div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 4,
                  background: 'rgba(0, 177, 79, 0.18)',
                  color: '#34D399',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  marginBottom: 14,
                }}
              >
                Giao hàng nội thành TP. Hồ Chí Minh • 15 - 25 phút
              </div>

              <h1
                style={{
                  fontSize: '2.35rem',
                  fontWeight: 800,
                  lineHeight: 1.18,
                  letterSpacing: '-0.8px',
                  marginBottom: 14,
                  color: '#F8FAFC',
                }}
              >
                Đặt món ngon từ quán quen, <br />
                giao nóng hổi tận cửa.
              </h1>

              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#94A3B8',
                  lineHeight: 1.6,
                  marginBottom: 24,
                  maxWidth: 540,
                }}
              >
                Hơn 120 nhà hàng đối tác đã xác thực mặt bằng thực tế. Đặt món lẻ giao ngay, gom đơn cùng đồng nghiệp hoặc đặt bàn tiệc lưu động trọn gói.
              </p>

              {/* Unified Search Bar */}
              <div
                style={{
                  display: 'flex',
                  background: '#FFFFFF',
                  borderRadius: 12,
                  padding: 6,
                  maxWidth: 580,
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flex: 1,
                    padding: '0 14px',
                  }}
                >
                  <Search size={18} color="#64748B" />
                  <input
                    type="text"
                    placeholder="Tìm tên nhà hàng, cơm tấm, phở bò, trà sữa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      fontSize: '0.92rem',
                      color: '#0F172A',
                      background: 'transparent',
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const el = document.getElementById('merchant-directory');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    background: '#00B14F',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    padding: '12px 24px',
                    borderRadius: 8,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tìm kiếm
                </button>
              </div>

              {/* Service Quick Links */}
              <div style={{ display: 'flex', gap: 20, marginTop: 20, fontSize: '0.84rem', color: '#CBD5E1', flexWrap: 'wrap' }}>
                <span
                  onClick={() => onNavigate('catering')}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  Đặt tiệc lưu động (Cọc 30%) <ArrowRight size={14} color="#00B14F" />
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <span
                  onClick={() => onNavigate('group-order')}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  Tạo phòng đặt đơn nhóm <ArrowRight size={14} color="#00B14F" />
                </span>
                <span style={{ color: '#475569' }}>|</span>
                <span
                  onClick={() => onNavigate('ai-guide')}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  Tư vấn thực đơn hôm nay <ArrowRight size={14} color="#00B14F" />
                </span>
              </div>
            </div>

            {/* Right Column: Featured Editorial Card */}
            <div
              onClick={() => onSelectMerchant(allMerchantsList[0])}
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                background: '#1E293B',
                border: '1px solid #334155',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80"
                alt="Cơm Tấm Sài Gòn 1985"
                style={{ width: '100%', height: 250, objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Quán tiêu biểu trong tuần
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#FBBF24', fontWeight: 700 }}>
                    4.9 ★ (1.200+ đánh giá)
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>
                  Cơm Tấm Sài Gòn 1985 — Nguyễn Huệ
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0 }}>
                  Sườn cọng nướng than hoa truyền thống • Giảm 30.000đ cho đơn từ 120.000đ
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PHOTOGRAPHIC CATEGORY GRID (NO EMOJIS) */}
      <div className="container" style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
              Danh mục ẩm thực
            </h2>
          </div>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              style={{ background: 'transparent', color: '#00B14F', fontSize: '0.85rem', fontWeight: 700 }}
            >
              Hiển thị tất cả
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
            gap: 14,
          }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  if (cat.id === 'mam-co') {
                    onNavigate('catering');
                  } else {
                    setSelectedCategory(cat.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  borderRadius: 12,
                  background: '#FFFFFF',
                  border: isSelected ? '2px solid #00B14F' : '1px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 14px rgba(0, 177, 79, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: isSelected ? '#00B14F' : '#0F172A',
                      lineHeight: 1.3,
                    }}
                  >
                    {cat.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>{cat.count}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TIME-LIMITED PROMOTIONS (KHUNG GIỜ ƯU ĐÃI) */}
      <div className="container" style={{ marginTop: 36 }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            padding: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid #F1F5F9',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Ưu đãi khung giờ trưa & tối
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Giá ưu đãi trực tiếp từ nhà hàng đối tác, áp dụng đồng thời với mã vận chuyển
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', marginRight: 4 }}>
                Kết thúc sau:
              </span>
              <span style={{ background: '#0F172A', color: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.82rem' }}>
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span style={{ fontWeight: 700, color: '#64748B' }}>:</span>
              <span style={{ background: '#0F172A', color: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.82rem' }}>
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span style={{ fontWeight: 700, color: '#64748B' }}>:</span>
              <span style={{ background: '#DC2626', color: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.82rem' }}>
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            {[
              {
                name: 'Cơm Tấm Sườn Cọng Nướng Than',
                merchantName: 'Cơm Tấm Sài Gòn 1985',
                originalPrice: 65000,
                salePrice: 45000,
                discount: '-30%',
                image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
                remaining: 'Còn 12 phần',
              },
              {
                name: 'Phở Bò Tái Lăn Truyền Thống',
                merchantName: 'Phở Thìn Lò Đúc 1979',
                originalPrice: 75000,
                salePrice: 55000,
                discount: '-27%',
                image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&auto=format&fit=crop&q=80',
                remaining: 'Còn 9 phần',
              },
              {
                name: 'Trà Sữa Ô Long Hoàng Kim',
                merchantName: 'Gong Cha Premium',
                originalPrice: 55000,
                salePrice: 35000,
                discount: '-36%',
                image: 'https://images.unsplash.com/photo-1558857563-b37cfb8cb36b?w=400&auto=format&fit=crop&q=80',
                remaining: 'Còn 18 ly',
              },
              {
                name: 'Pizza Hải Sản Sốt Pesto',
                merchantName: 'Pizza Artisan & Pasta',
                originalPrice: 185000,
                salePrice: 139000,
                discount: '-25%',
                image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
                remaining: 'Còn 7 bánh',
              },
            ].map((dish, i) => (
              <div
                key={i}
                onClick={() => onSelectMerchant(allMerchantsList[i % allMerchantsList.length])}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
                  <img
                    src={dish.image}
                    alt={dish.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      background: '#DC2626',
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {dish.discount}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.3, marginBottom: 2 }}>
                      {dish.name}
                    </h4>
                    <p style={{ fontSize: '0.76rem', color: '#64748B', margin: 0 }}>{dish.merchantName}</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontVariantNumeric: 'tabular-nums' }}>
                    <div>
                      <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', marginRight: 6 }}>
                        {dish.salePrice.toLocaleString('vi-VN')}đ
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', textDecoration: 'line-through' }}>
                        {dish.originalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>{dish.remaining}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. RESTAURANT DIRECTORY */}
      <div id="merchant-directory" className="container" style={{ marginTop: 40 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            gap: 14,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', margin: 0 }}>
              Danh sách nhà hàng đối tác ({filteredMerchants.length})
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '2px 0 0 0' }}>
              Tất cả gian hàng đều đã được kiểm định địa chỉ thực tế và giấy phép VSATTP
            </p>
          </div>

          {/* Clean Filter Segmented Bar */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: 4,
              gap: 4,
            }}
          >
            <span style={{ padding: '0 8px', color: '#64748B', display: 'flex', alignItems: 'center' }}>
              <SlidersHorizontal size={14} />
            </span>
            {[
              { key: 'ALL' as const, label: 'Đề xuất' },
              { key: 'TOP_RATED' as const, label: 'Đánh giá trên 4.8' },
              { key: 'NEARBY' as const, label: 'Giao nhanh 15 phút' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterMode(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 7,
                  background: filterMode === f.key ? '#0F172A' : 'transparent',
                  color: filterMode === f.key ? '#FFFFFF' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Restaurant Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 20,
          }}
        >
          {filteredMerchants.map((merchant) => (
            <div
              key={merchant.id}
              onClick={() => onSelectMerchant(merchant)}
              className="card-restaurant"
              style={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
            >
              <div className="cover-wrapper" style={{ height: 172 }}>
                <img
                  src={
                    merchant.coverUrl ||
                    'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'
                  }
                  alt={merchant.name}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: '#0F172A',
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                  }}
                >
                  Đối tác chính thức
                </span>
                <span className="eta-badge">
                  <Clock size={12} /> {merchant.deliveryTimeMin}-{merchant.deliveryTimeMax} phút
                </span>
              </div>

              <div className="info" style={{ padding: 16 }}>
                <h3 className="title" style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0F172A' }}>
                  {merchant.name}
                </h3>

                <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 8 }}>
                  {merchant.categories?.join(' • ') || 'Ẩm thực Việt Nam'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.8rem',
                    color: '#475569',
                    marginBottom: 10,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#0F172A', fontWeight: 700 }}>
                    <Star size={13} fill="#F59E0B" color="#F59E0B" />
                    {merchant.rating || 4.8}
                  </span>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <span>{merchant.reviewCount || 500}+ đánh giá</span>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <span>1.4 km</span>
                </div>

                <div
                  style={{
                    fontSize: '0.76rem',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginBottom: 10,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <MapPin size={12} color="#94A3B8" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{merchant.address}</span>
                </div>

                <div
                  style={{
                    paddingTop: 10,
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.76rem',
                  }}
                >
                  <span style={{ color: '#00B14F', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Tag size={12} /> Giảm 30.000đ đơn từ 120k
                  </span>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Xem thực đơn →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Partner Onboarding Banner */}
        <div
          style={{
            marginTop: 48,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: '28px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#00B14F', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Hợp tác kinh doanh cùng DineGo
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              Mở rộng doanh thu nhà hàng của bạn trên nền tảng DineGo
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
              Hệ thống quản lý bếp trực tiếp, chủ động bật/tắt món theo ngày, nhận đơn đặt tiệc lưu động và đối soát doanh thu tự động hàng tháng.
            </p>
          </div>

          {onOpenMerchantRegisterModal && (
            <button
              onClick={onOpenMerchantRegisterModal}
              style={{
                padding: '12px 24px',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: 10,
                background: '#0F172A',
                color: '#FFFFFF',
              }}
            >
              Đăng ký mở gian hàng đối tác
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
