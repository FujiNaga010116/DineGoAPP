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
  Sparkles,
  Dices,
  Flame,
  AlertTriangle,
  X,
  Compass,
} from 'lucide-react';
import { MOCK_MERCHANTS } from '../api/client';
import { calculateHaversineKm } from '../utils/routing';
import type { Merchant, User } from '../types';

interface HomePageProps {
  onSelectMerchant: (merchant: Merchant) => void;
  onNavigate: (tab: any) => void;
  merchants?: Merchant[];
  onOpenMerchantRegisterModal?: () => void;
  currentUser?: User | null;
  onOpenAddressSetup?: () => void;
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
    image: '/images/tra-sua-ca-phe.jpg',
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
  currentUser,
  onOpenAddressSetup,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'ALL' | 'NEARBY_3KM' | 'NEARBY_5KM' | 'WITHIN_15KM' | 'TOP_RATED'
  >('ALL');
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 18 });

  // Random Recommendation State ("Hôm nay ăn gì?")
  const [randomModalOpen, setRandomModalOpen] = useState(false);
  const [randomMerchant, setRandomMerchant] = useState<Merchant | null>(null);

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

  // Determine user location from default saved address or user coordinates
  const defaultSaved =
    currentUser?.savedAddresses?.find((a) => a.isDefault) ||
    currentUser?.savedAddresses?.[0];
  const userLat =
    typeof defaultSaved?.latitude === 'number'
      ? defaultSaved.latitude
      : typeof currentUser?.addressLat === 'number'
      ? currentUser.addressLat
      : 10.7736;
  const userLng =
    typeof defaultSaved?.longitude === 'number'
      ? defaultSaved.longitude
      : typeof currentUser?.addressLng === 'number'
      ? currentUser.addressLng
      : 106.7037;
  const userAddressText =
    defaultSaved?.fullAddress ||
    currentUser?.address ||
    'Bến Nghé, Quận 1, TP. Hồ Chí Minh';

  // Distance helper
  const getMerchantDistanceKm = (m: Merchant): number => {
    if (typeof m.latitude === 'number' && typeof m.longitude === 'number') {
      return calculateHaversineKm(
        { lat: userLat, lng: userLng },
        { lat: m.latitude, lng: m.longitude },
      );
    }
    return 2.5;
  };

  // Highly rated & nearby merchants for "Hôm nay ăn gì?" section (< 5km)
  const nearbyRecommendations = allMerchantsList
    .filter((m) => {
      const isApprovedAndActive =
        m.isActive !== false &&
        m.kycStatus !== 'REJECTED' &&
        m.kycStatus !== 'PENDING_APPROVAL' &&
        !m.isCateringOnly;
      if (!isApprovedAndActive) return false;
      const d = getMerchantDistanceKm(m);
      return d <= 5.0;
    })
    .sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));

  // Count within delivery radius (<= 15km)
  const countWithin15Km = allMerchantsList.filter((m) => {
    return (
      m.isActive !== false &&
      m.kycStatus !== 'REJECTED' &&
      !m.isCateringOnly &&
      getMerchantDistanceKm(m) <= 15.0
    );
  }).length;

  const handlePickRandomMerchant = () => {
    const pool =
      nearbyRecommendations.length > 0
        ? nearbyRecommendations
        : allMerchantsList.filter((m) => getMerchantDistanceKm(m) <= 15.0);
    if (pool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    setRandomMerchant(pool[randomIndex]);
    setRandomModalOpen(true);
  };

  const filteredMerchants = allMerchantsList.filter((m) => {
    const isApprovedAndActive =
      m.isActive !== false &&
      m.kycStatus !== 'REJECTED' &&
      m.kycStatus !== 'PENDING_APPROVAL' &&
      !m.isCateringOnly;
    if (!isApprovedAndActive) return false;

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

    const distKm = getMerchantDistanceKm(m);
    let matchFilter = true;
    if (filterMode === 'TOP_RATED') matchFilter = (m.rating || 0) >= 4.8;
    if (filterMode === 'NEARBY_3KM') matchFilter = distKm <= 3.0;
    if (filterMode === 'NEARBY_5KM') matchFilter = distKm <= 5.0;
    if (filterMode === 'WITHIN_15KM') matchFilter = distKm <= 15.0;

    return matchSearch && matchCategory && matchFilter;
  });

  // Sort merchants: when filtered by distance, sort by closest distance first
  const sortedMerchants = [...filteredMerchants].sort((a, b) => {
    const distA = getMerchantDistanceKm(a);
    const distB = getMerchantDistanceKm(b);
    if (filterMode === 'NEARBY_3KM' || filterMode === 'NEARBY_5KM' || filterMode === 'WITHIN_15KM') {
      return distA - distB;
    }
    return 0;
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

              {/* Delivery Location Status Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 14,
                  padding: '9px 14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  fontSize: '0.84rem',
                  color: '#E2E8F0',
                  maxWidth: 580,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
                  <MapPin size={16} color="#34D399" style={{ flexShrink: 0 }} />
                  <span style={{ color: '#94A3B8' }}>Giao đến:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 240,
                    }}
                    title={userAddressText}
                  >
                    {userAddressText}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      background: 'rgba(52, 211, 153, 0.15)',
                      color: '#34D399',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    {countWithin15Km} quán trong bán kính
                  </span>
                  {onOpenAddressSetup && (
                    <button
                      onClick={onOpenAddressSetup}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6EE7B7',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Đổi vị trí
                    </button>
                  )}
                </div>
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
                <span style={{ color: '#475569' }}>|</span>
                <span
                  onClick={() => onNavigate('vouchers')}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#FDE047' }}
                >
                  Săn Voucher Sự kiện &amp; Lễ <ArrowRight size={14} color="#FDE047" />
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
                image: '/images/tra-sua-ca-phe.jpg',
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

      {/* 3.5 "HÔM NAY ĂN GÌ? • GỢI Ý QUÁN NGON GẦN BẠN (< 5KM)" */}
      <div className="container" style={{ marginTop: 40 }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: 16,
            padding: '24px 28px',
            color: '#FFFFFF',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background decorative glow */}
          <div
            style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 177, 79, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(0, 177, 79, 0.18)',
                  color: '#34D399',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                <Flame size={14} color="#34D399" />
                Giao nhanh 15 - 20 phút • Chuẩn độ nóng sốt
              </div>
              <h2
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Hôm nay ăn gì? • Gợi ý quán ngon gần bạn
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#94A3B8', margin: '4px 0 0 0' }}>
                Không biết chọn món gì? DineGo tự động đề xuất các quán chuẩn vị trong bán kính lý tưởng (&lt; 5km) quanh vị trí của bạn.
              </p>
            </div>

            {/* Random Pick Button */}
            <button
              onClick={handlePickRandomMerchant}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '11px 20px',
                borderRadius: 10,
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 177, 79, 0.4)',
                transition: 'transform 0.15s ease',
              }}
            >
              <Dices size={18} />
              <span>Gợi ý ngẫu nhiên 1 quán</span>
            </button>
          </div>

          {/* Cards grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {nearbyRecommendations.slice(0, 4).map((rec) => {
              const dKm = getMerchantDistanceKm(rec);
              const eta = Math.max(15, Math.round(12 + dKm * 3.2));
              return (
                <div
                  key={rec.id}
                  onClick={() => onSelectMerchant(rec)}
                  style={{
                    background: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <img
                    src={
                      rec.coverUrl ||
                      'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80'
                    }
                    alt={rec.name}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 10,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {rec.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: '#94A3B8',
                        marginTop: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {rec.categories?.join(' • ') || 'Món ngon nổi tiếng'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 6,
                        fontSize: '0.76rem',
                        color: '#34D399',
                        fontWeight: 700,
                      }}
                    >
                      <span>📍 {dKm.toFixed(1)} km</span>
                      <span style={{ color: '#64748B' }}>•</span>
                      <span>⏱️ ~{eta}p</span>
                      <span style={{ color: '#64748B' }}>•</span>
                      <span style={{ color: '#FBBF24', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <Star size={11} fill="#FBBF24" /> {rec.rating || 4.8}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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
              Danh sách nhà hàng đối tác ({sortedMerchants.length})
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '2px 0 0 0' }}>
              Bán kính giao hàng tối đa 15km • Ưu tiên quán gần để đảm bảo độ tươi nóng khi tới nơi
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
              flexWrap: 'wrap',
            }}
          >
            <span style={{ padding: '0 8px', color: '#64748B', display: 'flex', alignItems: 'center' }}>
              <SlidersHorizontal size={14} />
            </span>
            {[
              { key: 'ALL' as const, label: 'Tất cả' },
              { key: 'NEARBY_3KM' as const, label: '⚡ Siêu gần (< 3km)' },
              { key: 'NEARBY_5KM' as const, label: '🛵 Gần bạn (< 5km)' },
              { key: 'WITHIN_15KM' as const, label: '📍 Bán kính (≤ 15km)' },
              { key: 'TOP_RATED' as const, label: '⭐ Đánh giá 4.8+' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterMode(f.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  background: filterMode === f.key ? '#0F172A' : 'transparent',
                  color: filterMode === f.key ? '#FFFFFF' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
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
          {sortedMerchants.map((merchant) => {
            const distKm = getMerchantDistanceKm(merchant);
            const isOutOfRadius = distKm > 15.0;
            const etaMin = Math.max(15, Math.round(12 + distKm * 3.2));
            const etaMax = etaMin + 10;

            return (
              <div
                key={merchant.id}
                onClick={() => onSelectMerchant(merchant)}
                className="card-restaurant"
                style={{
                  borderRadius: 12,
                  border: isOutOfRadius ? '1px solid #FECDD3' : '1px solid #E2E8F0',
                  opacity: isOutOfRadius ? 0.8 : 1,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <div className="cover-wrapper" style={{ height: 172, position: 'relative' }}>
                  <img
                    src={
                      merchant.coverUrl ||
                      'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'
                    }
                    alt={merchant.name}
                  />
                  {isOutOfRadius ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: '#BE123C',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      <AlertTriangle size={12} /> Ngoài bán kính ({distKm.toFixed(1)}km &gt; 15km)
                    </span>
                  ) : distKm <= 3.0 ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: '#00B14F',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 9px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Flame size={12} /> Siêu gần ({distKm.toFixed(1)}km)
                    </span>
                  ) : (
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
                  )}
                  <span className="eta-badge">
                    <Clock size={12} /> {etaMin}-{etaMax} phút
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
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#0F172A', fontWeight: 700 }}>
                      <Star size={13} fill="#F59E0B" color="#F59E0B" />
                      {merchant.rating || 4.8}
                    </span>
                    <span style={{ color: '#CBD5E1' }}>•</span>
                    <span>{merchant.reviewCount || 500}+ đánh giá</span>
                    <span style={{ color: '#CBD5E1' }}>•</span>
                    <span style={{ color: isOutOfRadius ? '#E11D48' : '#00B14F', fontWeight: 700 }}>
                      📍 {distKm.toFixed(1)} km
                    </span>
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
                    <span style={{ color: distKm <= 5 ? '#00B14F' : '#64748B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {distKm <= 5 ? <Flame size={12} color="#00B14F" /> : <Tag size={12} />}
                      {distKm <= 5 ? 'Chuẩn độ nóng sốt' : 'Đơn tối thiểu 30k'}
                    </span>
                    <span style={{ color: isOutOfRadius ? '#BE123C' : '#0F172A', fontWeight: 700 }}>
                      {isOutOfRadius ? 'Xem menu' : 'Xem thực đơn →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* 5. RANDOM RECOMMENDATION MODAL ("Hôm nay ăn gì?") */}
      {randomModalOpen && randomMerchant && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              maxWidth: 440,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ position: 'relative', height: 180 }}>
              <img
                src={
                  randomMerchant.coverUrl ||
                  'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'
                }
                alt={randomMerchant.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => setRandomModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
                  color: '#FFFFFF',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Sparkles size={14} /> Gợi ý chuẩn vị hôm nay
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                {randomMerchant.name}
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '0 0 14px 0' }}>
                {randomMerchant.address}
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 12,
                  padding: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  textAlign: 'center',
                  marginBottom: 18,
                  border: '1px solid #E2E8F0',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Khoảng cách</div>
                  <div style={{ fontWeight: 800, color: '#00B14F', fontSize: '0.92rem', marginTop: 2 }}>
                    📍 {getMerchantDistanceKm(randomMerchant).toFixed(1)} km
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Đánh giá</div>
                  <div style={{ fontWeight: 800, color: '#F59E0B', fontSize: '0.92rem', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <Star size={13} fill="#F59E0B" /> {randomMerchant.rating || 4.8}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Dự kiến giao</div>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem', marginTop: 2 }}>
                    ⏱️ ~{Math.max(15, Math.round(12 + getMerchantDistanceKm(randomMerchant) * 3.2))}p
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handlePickRandomMerchant}
                  style={{
                    flex: 1,
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Dices size={16} /> Đổi quán khác
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectMerchant(randomMerchant);
                    setRandomModalOpen(false);
                  }}
                  style={{
                    flex: 1.4,
                    background: '#00B14F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  Xem menu &amp; Đặt ngay <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
