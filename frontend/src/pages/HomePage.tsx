// ==============================================================================
// DineGo Frontend — Market-Grade Home Page (GrabFood / ShopeeFood Pro Style)
// Hero Banners, Food Categories Icons, Flash Sale Countdown, Smart Filters, Restaurant Cards
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Star,
  Clock,
  MapPin,
  Search,
  ArrowRight,
  Sparkles,
  Tag,
  Flame,
  Percent,
  CheckCircle2,
  Bike,
  Compass,
  UtensilsCrossed,
  Users,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { MOCK_MERCHANTS, MOCK_MENU_ITEMS } from '../api/client';
import type { Merchant } from '../types';

interface HomePageProps {
  onSelectMerchant: (merchant: Merchant) => void;
  onNavigate: (tab: any) => void;
  merchants?: Merchant[];
  onOpenMerchantRegisterModal?: () => void;
}

const CATEGORIES = [
  { id: 'all', name: 'Tất cả', icon: '🍽️' },
  { id: 'com', name: 'Cơm tấm', icon: '🍚' },
  { id: 'pho', name: 'Phở & Bún', icon: '🍜' },
  { id: 'tra-sua', name: 'Trà sữa', icon: '🧋' },
  { id: 'mam-co', name: 'Mâm cỗ tiệc', icon: '🍱' },
  { id: 'an-nhanh', name: 'Đồ ăn nhanh', icon: '🍔' },
  { id: 'pizza', name: 'Pizza & Mì', icon: '🍕' },
  { id: 'chay', name: 'Món chay', icon: '🥗' },
];

export const HomePage: React.FC<HomePageProps> = ({
  onSelectMerchant,
  onNavigate,
  merchants,
  onOpenMerchantRegisterModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'NEARBY' | 'TOP_RATED' | 'PROMO'>('ALL');

  // Flash Sale Countdown timer
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

  // Filter restaurants
  const filteredMerchants = allMerchantsList.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.address.toLowerCase().includes(searchQuery.toLowerCase());

    let matchCategory = true;
    if (selectedCategory === 'com') matchCategory = Boolean(m.name.includes('Cơm') || (m.categories && m.categories.includes('Cơm')));
    if (selectedCategory === 'pho') matchCategory = Boolean(m.name.includes('Phở') || (m.categories && m.categories.includes('Phở / Bún')));
    if (selectedCategory === 'tra-sua') matchCategory = Boolean(m.name.includes('Trà Sữa') || (m.categories && m.categories.includes('Trà sữa')));
    if (selectedCategory === 'pizza') matchCategory = Boolean(m.name.includes('Pizza') || (m.categories && m.categories.includes('Pizza')));
    if (selectedCategory === 'mam-co') matchCategory = true; // Chuyển sang cỗ hoặc hiển thị quán phục vụ cỗ

    let matchFilter = true;
    if (filterMode === 'TOP_RATED') matchFilter = (m.rating || 0) >= 4.8;
    if (filterMode === 'NEARBY') matchFilter = (m.deliveryTimeMin || 20) <= 15;

    return matchSearch && matchCategory && matchFilter;
  });

  return (
    <div style={{ paddingBottom: 64 }}>
      {/* 1. HERO PROMOTIONAL BANNER CAROUSEL (GrabFood Signature) */}
      <div className="container" style={{ marginTop: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.65fr 1fr',
            gap: 20,
          }}
        >
          {/* Main Giant Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #00B14F 0%, #007A34 100%)',
              borderRadius: 22,
              padding: '32px 36px',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 177, 79, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -20,
                bottom: -30,
                width: 260,
                height: 260,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#FFFFFF',
                color: '#00B14F',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 800,
                width: 'fit-content',
                marginBottom: 12,
              }}
            >
              <Sparkles size={14} /> SIÊU ĐẠI TIỆC DINEGO x MOMO
            </div>

            <h1 style={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1.2, marginBottom: 10, letterSpacing: -0.5 }}>
              Giảm 50% Đơn Đầu Tiên <br />
              <span style={{ color: '#FACC15' }}>Freeship Toàn Thành Phố</span>
            </h1>

            <p style={{ fontSize: '0.92rem', opacity: 0.92, marginBottom: 20, maxWidth: 480, lineHeight: 1.5 }}>
              Nhập mã <strong>DINEGO50</strong> khi thanh toán qua MoMo All-in-One Gateway. Thức ăn nóng hổi giao tận nơi chỉ 20 phút!
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => onSelectMerchant(MOCK_MERCHANTS[0])}
                className="btn"
                style={{
                  background: '#FFFFFF',
                  color: '#00B14F',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  padding: '11px 22px',
                  borderRadius: 14,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                }}
              >
                Đặt món ngay <ArrowRight size={16} />
              </button>

              <button
                onClick={() => onNavigate('catering')}
                className="btn"
                style={{
                  background: 'rgba(0, 0, 0, 0.22)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  padding: '11px 20px',
                  borderRadius: 14,
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                Đặt mâm cỗ tiệc
              </button>
            </div>
          </div>

          {/* Sub Promotional Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* AI Guide Promo */}
            <div
              onClick={() => onNavigate('ai-guide')}
              style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                borderRadius: 20,
                padding: '20px 22px',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(49, 46, 129, 0.18)',
                position: 'relative',
                overflow: 'hidden',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(49, 46, 129, 0.28)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(49, 46, 129, 0.18)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <Compass size={17} color="#A78BFA" />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  AI Culinary Guide
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4 }}>
                Chưa biết hôm nay ăn gì?
              </h3>
              <p style={{ fontSize: '0.82rem', opacity: 0.85, lineHeight: 1.45, margin: 0 }}>
                Chat với AI để nhận gợi ý món ăn chuẩn vị 3 miền theo khẩu vị và ngân sách.
              </p>
            </div>

            {/* Group Order Promo */}
            <div
              onClick={() => onNavigate('group-order')}
              style={{
                background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                border: '1.5px solid #FDBA74',
                borderRadius: 20,
                padding: '20px 22px',
                color: '#9A3412',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(255, 87, 34, 0.08)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 87, 34, 0.16)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 87, 34, 0.08)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <Users size={17} color="#EA580C" />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Đặt Đơn Cùng Nhóm
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4, color: '#9A3412' }}>
                Đặt Cùng Bạn Bè & Chia Tiền
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#C2410C', lineHeight: 1.45, margin: 0 }}>
                Tạo phòng nhóm mã PIN 6 số, chọn món cùng lúc và Split Bill tự động siêu vui.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY ICONS BAR (GrabFood Circle Style) */}
      <div className="container" style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827' }}>
            Khám Phá Theo Danh Mục Món Ăn
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#00B14F', fontWeight: 700, cursor: 'pointer' }}>
            Xem tất cả →
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 28,
            overflowX: 'auto',
            paddingBottom: 12,
            scrollbarWidth: 'none',
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
                className="category-item-circle"
                style={{ minWidth: 96, flexShrink: 0 }}
              >
                <div
                  className="circle-icon"
                  style={{
                    borderColor: isSelected ? '#00B14F' : '#E5E7EB',
                    background: isSelected ? '#F0FDF4' : '#FFFFFF',
                    boxShadow: isSelected ? '0 6px 16px rgba(0, 177, 79, 0.25)' : 'var(--shadow-xs)',
                    transform: isSelected ? 'scale(1.05)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{cat.icon}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#00B14F' : '#374151',
                    textAlign: 'center',
                    marginTop: 2,
                  }}
                >
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. FLASH SALE COUNTDOWN SECTION (Giờ Vàng Giá Sốc) */}
      <div className="container" style={{ marginTop: 32 }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid #E5E7EB',
            padding: 24,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Flame size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
                  Giờ Vàng Món Ngon Giá Sốc
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                  Ưu đãi chớp nhoáng kết hợp MoMo — Số lượng có hạn
                </p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6B7280', marginRight: 4 }}>
                KẾT THÚC TRONG:
              </span>
              <span style={{ background: '#111827', color: '#fff', padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: '0.85rem' }}>
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span style={{ fontWeight: 800 }}>:</span>
              <span style={{ background: '#111827', color: '#fff', padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: '0.85rem' }}>
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span style={{ fontWeight: 800 }}>:</span>
              <span style={{ background: '#EF4444', color: '#fff', padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: '0.85rem' }}>
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Flash sale items grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                name: 'Cơm Tấm Sườn Cọng Nướng Than',
                merchantName: 'Cơm Tấm Sài Gòn 1985',
                originalPrice: 65000,
                salePrice: 35000,
                discount: '-46%',
                image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
                soldPercent: 88,
              },
              {
                name: 'Phở Bò Tái Lăn Hà Nội',
                merchantName: 'Phở Thìn Lò Đúc 1979',
                originalPrice: 75000,
                salePrice: 49000,
                discount: '-35%',
                image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&auto=format&fit=crop&q=80',
                soldPercent: 72,
              },
              {
                name: 'Trà Sữa Trân Châu Hoàng Kim',
                merchantName: 'Gong Cha Premium',
                originalPrice: 55000,
                salePrice: 29000,
                discount: '-47%',
                image: 'https://images.unsplash.com/photo-1558857563-b37cfb8cb36b?w=400&auto=format&fit=crop&q=80',
                soldPercent: 94,
              },
              {
                name: 'Pizza Hải Sản Pesto Xanh',
                merchantName: 'Pizza Artisan & Pasta',
                originalPrice: 185000,
                salePrice: 125000,
                discount: '-32%',
                image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
                soldPercent: 65,
              },
            ].map((dish, i) => (
              <div
                key={i}
                onClick={() => onSelectMerchant(MOCK_MERCHANTS[i % MOCK_MERCHANTS.length])}
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 16,
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: '#FAFAFA',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00B14F';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                  <img
                    src={dish.image}
                    alt={dish.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      background: '#EF4444',
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {dish.discount}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                      {dish.name}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>{dish.merchantName}</p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#EF4444' }}>
                        {dish.salePrice.toLocaleString()} đ
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'line-through' }}>
                        {dish.originalPrice.toLocaleString()} đ
                      </span>
                    </div>

                    <div style={{ marginTop: 4 }}>
                      <div style={{ height: 4, width: '100%', background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${dish.soldPercent}%`, background: '#EF4444' }} />
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 700, marginTop: 2 }}>
                        Đã bán {dish.soldPercent}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. SMART FILTER & RESTAURANT LISTINGS (GrabFood Standard) */}
      <div className="container" style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 14 }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827' }}>
              Quán Ngon Giao Tận Nơi ({filteredMerchants.length})
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>
              Tuyển chọn các nhà hàng được yêu thích nhất gần khu vực của bạn
            </p>
          </div>

          {/* Search box & Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="text"
                placeholder="Tìm quán ăn, món ngon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '9px 12px 9px 36px',
                  borderRadius: 20,
                  border: '1.5px solid #E5E7EB',
                  fontSize: '0.85rem',
                  width: 220,
                  background: '#FFFFFF',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setFilterMode('ALL')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: filterMode === 'ALL' ? '#00B14F' : '#E5E7EB',
                  background: filterMode === 'ALL' ? '#F0FDF4' : '#FFFFFF',
                  color: filterMode === 'ALL' ? '#00B14F' : '#4B5563',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                Tất cả
              </button>

              <button
                onClick={() => setFilterMode('TOP_RATED')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: filterMode === 'TOP_RATED' ? '#00B14F' : '#E5E7EB',
                  background: filterMode === 'TOP_RATED' ? '#F0FDF4' : '#FFFFFF',
                  color: filterMode === 'TOP_RATED' ? '#00B14F' : '#4B5563',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ⭐ Đánh giá 4.8+
              </button>

              <button
                onClick={() => setFilterMode('NEARBY')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: filterMode === 'NEARBY' ? '#00B14F' : '#E5E7EB',
                  background: filterMode === 'NEARBY' ? '#F0FDF4' : '#FFFFFF',
                  color: filterMode === 'NEARBY' ? '#00B14F' : '#4B5563',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ⚡ Giao nhanh dưới 15p
              </button>
            </div>
          </div>
        </div>

        {/* Restaurant Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 22,
          }}
        >
          {filteredMerchants.map((merchant) => (
            <div
              key={merchant.id}
              onClick={() => onSelectMerchant(merchant)}
              className="card-restaurant"
            >
              {/* Cover Image & Badges */}
              <div className="cover-wrapper">
                <img
                  src={
                    merchant.coverUrl ||
                    'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'
                  }
                  alt={merchant.name}
                />
                <span className="discount-badge">GIẢM TỚI 50K</span>
                <span className="eta-badge">
                  <Clock size={12} /> {merchant.deliveryTimeMin}-{merchant.deliveryTimeMax} phút
                </span>
              </div>

              {/* Info Block */}
              <div className="info">
                <h3 className="title">{merchant.name}</h3>

                <div className="meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#D97706', fontWeight: 700 }}>
                    <Star size={14} fill="#F59E0B" color="#F59E0B" />
                    <span>{merchant.rating || 4.8}</span>
                  </div>
                  <span>•</span>
                  <span>{merchant.reviewCount || 500}+ đánh giá</span>
                  <span>•</span>
                  <span>1.4 km</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: 6 }}>
                  {merchant.categories?.join(' • ') || 'Món Việt truyền thống'}
                </div>

                <div className="voucher-strip">
                  <Tag size={13} />
                  <span>Mã DINEGO50 • Freeship đơn từ 0đ qua MoMo</span>
                </div>

                {/* KYC Verified Tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: '0.72rem', background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                    ✓ KYC Mặt Bằng Thật
                  </span>
                  {merchant.ownerName && (
                    <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      Đại diện: {merchant.ownerName.split('(')[0].trim()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Merchant Recruitment / Onboarding Banner */}
        <div
          style={{
            marginTop: 48,
            background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
            borderRadius: 24,
            padding: '32px 36px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0, 177, 79, 0.2)', color: '#00B14F', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 800, marginBottom: 12 }}>
              <Store size={14} /> Dành Cho Chủ Quán Ăn Thực Tế
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '0 0 8px 0', color: '#FFFFFF' }}>
              Bạn Có Quán Ăn Thật? Hãy Mở Gian Hàng Cùng DineGo
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#9CA3AF', lineHeight: 1.5 }}>
              Cung cấp ảnh mặt tiền quán, địa chỉ và số điện thoại để thẩm định phòng chống gian lận. Quán của bạn sẽ được kích hoạt công cụ quản lý Menu theo ngày đi chợ, tiếp nhận đơn và nhận tiền doanh thu minh bạch!
            </p>
          </div>

          {onOpenMerchantRegisterModal && (
            <button
              onClick={onOpenMerchantRegisterModal}
              className="btn btn-primary"
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: 800,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(0, 177, 79, 0.4)',
              }}
            >
              <ShieldCheck size={20} />
              <span>Đăng Ký Mở Quán Ngay (Miễn Phí)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
