// ==============================================================================
// DineGo Frontend — Customer Storefront Home Page
// Editorial Hero Search, Photographic Category Grid, Flash Deals, Curated Restaurants
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
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
import { MOCK_MERCHANTS } from '../../../api/client';
import { calculateHaversineKm } from '../../../utils/routing';
import type { Merchant, User } from '../../../types';

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
    image: '/images/pho-thin.jpg',
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
    image: '/images/pizza-artisan.jpg',
  },
];

const getMerchantCardImage = (m?: Merchant): string => {
  if (m?.coverUrl) return m.coverUrl;
  if (m?.storeFrontImage) return m.storeFrontImage;
  const name = (m?.name || '').toLowerCase();
  if (name.includes('phở') || name.includes('bún')) {
    return '/images/pho-thin.jpg';
  }
  if (name.includes('trà sữa') || name.includes('cà phê')) {
    return '/images/tra-sua-ca-phe.jpg';
  }
  if (name.includes('pizza') || name.includes('pasta')) {
    return '/images/pizza-artisan.jpg';
  }
  return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=85';
};

const FeaturedHeroDishCard: React.FC<{
  featuredPool: Merchant[];
  fallbackMerchant?: Merchant;
  onSelectMerchant: (m: Merchant) => void;
}> = ({ featuredPool, fallbackMerchant, onSelectMerchant }) => {
  const [featuredIdx, setFeaturedIdx] = useState(0);

  useEffect(() => {
    if (featuredPool.length <= 1) return;
    const timer = window.setInterval(() => {
      setFeaturedIdx((prev) => (prev + 1) % featuredPool.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [featuredPool.length]);

  const activeFeaturedMerchant =
    featuredPool[featuredIdx % Math.max(1, featuredPool.length)] || fallbackMerchant;

  const handleRandomFeaturedDish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (featuredPool.length <= 1) return;
    let next = Math.floor(Math.random() * featuredPool.length);
    if (next === featuredIdx % featuredPool.length) {
      next = (next + 1) % featuredPool.length;
    }
    setFeaturedIdx(next);
  };

  return (
    <div
      key={activeFeaturedMerchant?.id || 'featured'}
      onClick={() => activeFeaturedMerchant && onSelectMerchant(activeFeaturedMerchant)}
      style={{
        position: 'relative',
        zIndex: 2,
        borderRadius: 24,
        background: '#FFFFFF',
        padding: 12,
        border: '1px solid #F3E4CC',
        boxShadow: '0 24px 54px rgba(138, 79, 24, 0.14)',
        cursor: 'pointer',
        animation: 'dinegoHeroCardSwap 0.35s ease-out',
      }}
    >
      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
        <img
          src={getMerchantCardImage(activeFeaturedMerchant)}
          alt={activeFeaturedMerchant?.name || 'Quán nổi bật'}
          style={{ width: '100%', height: 242, objectFit: 'cover', display: 'block' }}
        />
        {featuredPool.length > 1 && (
          <button
            type="button"
            onClick={handleRandomFeaturedDish}
            title="Đổi món ngẫu nhiên"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'rgba(255, 255, 255, 0.94)',
              color: '#1F1815',
              border: '1px solid #EDE0CC',
              borderRadius: 999,
              padding: '5px 10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            }}
          >
            <Dices size={13} color="#EA580C" />
            <span>Đổi món</span>
          </button>
        )}
      </div>

      <div style={{ padding: '14px 8px 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <span
            style={{
              background: '#009E49',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            Quán tiêu biểu trong tuần
          </span>
          <span style={{ fontSize: '0.82rem', color: '#D97706', fontWeight: 800 }}>
            {(activeFeaturedMerchant?.rating || 4.9).toFixed(1)} ★{' '}
            <span style={{ color: '#6B6258', fontWeight: 600 }}>
              ({activeFeaturedMerchant?.reviewCount ? `${activeFeaturedMerchant.reviewCount}+` : '1.200+'} đánh giá)
            </span>
          </span>
        </div>

        <h3 style={{ fontSize: '1.14rem', fontWeight: 900, color: '#1F1815', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {activeFeaturedMerchant?.name || 'Cơm Tấm Sài Gòn 1985 — Nguyễn Huệ'}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <span
            style={{
              background: '#EA580C',
              color: '#FFFFFF',
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: '0.74rem',
              fontWeight: 800,
            }}
          >
            Giảm 30.000đ
          </span>
          <span style={{ fontSize: '0.82rem', color: '#5C5248', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 270 }}>
            {activeFeaturedMerchant?.address || 'Món ngon nóng hổi • đơn từ 120.000đ'}
          </span>
        </div>
      </div>
    </div>
  );
};

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
    | 'ALL'
    | 'NEARBY'
    | 'NGON_RE'
    | 'SUPER_DEAL'
    | 'BUA_XE'
    | 'QUAN_MOI'
    | 'DAC_TUYEN'
  >('ALL');
  const filterTrackRef = useRef<HTMLDivElement | null>(null);
  const filterBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragMetaRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startLeft: number;
  }>({ active: false, moved: false, startX: 0, startLeft: 4 });
  const [glassPill, setGlassPill] = useState<{
    left: number;
    width: number;
    isDragging: boolean;
    isStretching: boolean;
  }>({ left: 4, width: 72, isDragging: false, isStretching: false });

  useEffect(() => {
    const updatePillFromActive = () => {
      const btn = filterBtnRefs.current[filterMode];
      if (!btn) return;
      setGlassPill((prev) => ({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
        isDragging: false,
        isStretching: prev.width !== btn.offsetWidth || prev.left !== btn.offsetLeft,
      }));
    };
    updatePillFromActive();
    const t = window.setTimeout(() => {
      setGlassPill((prev) => ({ ...prev, isStretching: false }));
    }, 260);
    window.addEventListener('resize', updatePillFromActive);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', updatePillFromActive);
    };
  }, [filterMode]);
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

  const featuredPool = allMerchantsList.filter(
    (m) =>
      m.isActive !== false &&
      m.kycStatus !== 'REJECTED' &&
      m.kycStatus !== 'PENDING_APPROVAL' &&
      !m.isCateringOnly,
  );

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
    const lowerName = m.name.toLowerCase();
    const lowerCats = (m.categories || []).join(' ').toLowerCase();
    let matchFilter = true;
    if (filterMode === 'NEARBY') matchFilter = distKm <= 5.0;
    if (filterMode === 'NGON_RE') {
      matchFilter =
        lowerName.includes('cơm') ||
        lowerName.includes('phở') ||
        lowerName.includes('bún') ||
        lowerName.includes('bánh') ||
        lowerCats.includes('cơm') ||
        lowerCats.includes('phở');
    }
    if (filterMode === 'SUPER_DEAL') matchFilter = (m.rating || 0) >= 4.7 && distKm <= 15.0;
    if (filterMode === 'BUA_XE') {
      matchFilter =
        lowerName.includes('trà sữa') ||
        lowerName.includes('cà phê') ||
        lowerName.includes('pizza') ||
        lowerName.includes('bánh') ||
        lowerCats.includes('trà sữa') ||
        lowerCats.includes('pizza');
    }
    if (filterMode === 'QUAN_MOI') {
      matchFilter = (m.reviewCount || 0) < 200 || m.id.startsWith('merchant-');
    }
    if (filterMode === 'DAC_TUYEN') matchFilter = (m.rating || 0) >= 4.8;

    return matchSearch && matchCategory && matchFilter;
  });

  // Sort merchants: nearest first for NEARBY, highest rating first for DAC_TUYEN
  const sortedMerchants = [...filteredMerchants].sort((a, b) => {
    if (filterMode === 'NEARBY') {
      return getMerchantDistanceKm(a) - getMerchantDistanceKm(b);
    }
    if (filterMode === 'DAC_TUYEN' || filterMode === 'SUPER_DEAL') {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  return (
    <div style={{ paddingBottom: 72 }}>
      {/* 1. WARM ILLUSTRATED HIGH-CONVERSION HERO SECTION */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #FDF6E9 0%, #FFFBF4 55%, #FFF1DC 100%)',
          borderBottom: '1px solid #F3E4CC',
          padding: '44px 0 48px',
          color: '#1F1815',
        }}
      >
        <style>{`
          @keyframes dinegoFloatLeaf {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-7px) rotate(5deg); }
          }
          @keyframes dinegoFloatLeafReverse {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(6px) rotate(-6deg); }
          }
          @keyframes dinegoSteamWave {
            0%, 100% { transform: translateY(0px); opacity: 0.65; }
            50% { transform: translateY(-6px); opacity: 0.95; }
          }
          @keyframes dinegoHeroCardSwap {
            0% { opacity: 0.55; transform: scale(0.985); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes dinegoDiagonalShine {
            0% { transform: translateX(-140%) skewX(-22deg); }
            45%, 100% { transform: translateX(240%) skewX(-22deg); }
          }
          .dinego-hero-search-btn {
            background: linear-gradient(135deg, #00A84E 0%, #008F42 100%);
            transition: all 0.22s ease;
          }
          .dinego-hero-search-btn:hover {
            background: linear-gradient(135deg, #047857 0%, #065F46 100%);
            transform: translateY(-1px);
            box-shadow: 0 10px 22px rgba(0, 143, 66, 0.35) !important;
          }
          .dinego-hero-pill-catering {
            background: #FFFFFF;
            border: 1px solid #EDE0CC;
            color: #2B221D;
            transition: all 0.2s ease;
          }
          .dinego-hero-pill-catering:hover {
            background: #FFF7ED !important;
            border-color: #FDBA74 !important;
            color: #C2410C !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 18px rgba(234, 88, 12, 0.14) !important;
          }
          .dinego-hero-pill-group {
            background: #FFFFFF;
            border: 1px solid #EDE0CC;
            color: #2B221D;
            transition: all 0.2s ease;
          }
          .dinego-hero-pill-group:hover {
            background: #ECFDF5 !important;
            border-color: #6EE7B7 !important;
            color: #047857 !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 18px rgba(5, 150, 105, 0.14) !important;
          }
          .dinego-voucher-shine {
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #F59E0B 0%, #EA580C 100%);
            transition: all 0.22s ease;
          }
          .dinego-voucher-shine::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 48%;
            height: 100%;
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.55) 50%,
              rgba(255, 255, 255, 0) 100%
            );
            animation: dinegoDiagonalShine 2.6s ease-in-out infinite;
            pointer-events: none;
          }
          .dinego-voucher-shine:hover {
            background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%) !important;
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 12px 24px rgba(234, 88, 12, 0.4) !important;
          }
        `}</style>
        {/* Soft Decorative Organic Shapes & Warm Glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -90,
            right: -60,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.24) 0%, rgba(251, 191, 36, 0.12) 60%, transparent 75%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -110,
            left: -80,
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(253, 224, 71, 0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.22fr 1fr',
              gap: 36,
              alignItems: 'center',
            }}
          >
            {/* Left Column: Warm Appetizing Copy, Pill Search & Quick Actions */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: '#009E49',
                  color: '#FFFFFF',
                  fontSize: '0.73rem',
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  marginBottom: 16,
                  boxShadow: '0 6px 16px rgba(0, 158, 73, 0.22)',
                }}
              >
                <Clock size={13} />
                <span>Giao hàng nội thành TP. Hồ Chí Minh • 15 - 25 phút</span>
              </div>

              <h1
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  fontSize: '2.55rem',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  letterSpacing: '-0.9px',
                  marginBottom: 14,
                  color: '#1F1815',
                }}
              >
                Đặt <span style={{ color: '#A84B14' }}>món ngon</span> từ quán quen,
                <svg
                  aria-hidden="true"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ display: 'inline-block', verticalAlign: 'top', marginLeft: 4, marginTop: -4 }}
                >
                  <path d="M5 12L10 7" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M9 16L17 12" stroke="#EA580C" strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M12 20L19 19" stroke="#FBBF24" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <br />
                giao <span style={{ color: '#A84B14' }}>nóng hổi</span> tận cửa.
              </h1>

              <p
                style={{
                  fontSize: '0.94rem',
                  color: '#5C5248',
                  lineHeight: 1.62,
                  marginBottom: 22,
                  maxWidth: 530,
                }}
              >
                Hơn 120 nhà hàng đối tác đã xác thực mặt bằng thực tế. Đặt món lẻ giao ngay, gom đơn cùng đồng nghiệp hoặc đặt bàn tiệc lưu động trọn gói.
              </p>

              {/* Pill Search Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  borderRadius: 999,
                  padding: '5px 5px 5px 14px',
                  maxWidth: 560,
                  border: '1px solid #EDE0CC',
                  boxShadow: '0 12px 28px rgba(120, 72, 24, 0.09)',
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginRight: 10,
                  }}
                >
                  <Search size={15} color="#B45309" />
                </div>
                <input
                  type="text"
                  placeholder="Tìm tên nhà hàng, cơm tấm, phở bò, trà sữa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      document.getElementById('merchant-directory')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.91rem',
                    color: '#1F1815',
                    background: 'transparent',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Xóa từ khóa"
                    onClick={() => setSearchQuery('')}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      border: 'none',
                      background: '#F1F5F9',
                      color: '#64748B',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      marginRight: 6,
                      flexShrink: 0,
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
                <button
                  className="dinego-hero-search-btn"
                  onClick={() => {
                    const el = document.getElementById('merchant-directory');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    padding: '11px 24px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 6px 14px rgba(0, 168, 78, 0.28)',
                  }}
                >
                  Tìm kiếm
                </button>
              </div>

              {/* Pill Delivery Location Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 12,
                  padding: '8px 14px',
                  background: '#FFFFFF',
                  borderRadius: 999,
                  border: '1px solid #EDE0CC',
                  fontSize: '0.81rem',
                  color: '#5C5248',
                  maxWidth: 560,
                  flexWrap: 'wrap',
                  boxShadow: '0 4px 12px rgba(120, 72, 24, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 190 }}>
                  <MapPin size={15} color="#009E49" style={{ flexShrink: 0 }} />
                  <span style={{ color: '#786D62' }}>Giao đến:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#1F1815',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 230,
                    }}
                    title={userAddressText}
                  >
                    {userAddressText}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      background: '#DCFCE7',
                      color: '#15803D',
                      padding: '3px 9px',
                      borderRadius: 999,
                      fontSize: '0.72rem',
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
                        color: '#1F1815',
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

              {/* Quick Service Pill Buttons (No Tư vấn thực đơn hôm nay) */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="dinego-hero-pill-catering"
                  onClick={() => onNavigate('catering')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 999,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(120, 72, 24, 0.05)',
                  }}
                >
                  Đặt tiệc lưu động (Cọc 30%) 🎉
                </button>
                <button
                  type="button"
                  className="dinego-hero-pill-group"
                  onClick={() => onNavigate('group-order')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 999,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(120, 72, 24, 0.05)',
                  }}
                >
                  Tạo phòng đặt đơn nhóm 👥
                </button>
                <button
                  type="button"
                  className="dinego-voucher-shine"
                  onClick={() => onNavigate('vouchers')}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 999,
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    cursor: 'pointer',
                    boxShadow: '0 8px 18px rgba(234, 88, 12, 0.28)',
                  }}
                >
                  Săn Voucher Sự kiện &amp; Lễ 🎁 <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Right Column: Dynamic Featured Dish Card with Floating Leaves & Doodles */}
            <div style={{ position: 'relative' }}>
              {/* Animated Steam SVG above card */}
              <svg
                aria-hidden="true"
                width="68"
                height="44"
                viewBox="0 0 68 44"
                fill="none"
                style={{
                  position: 'absolute',
                  top: -28,
                  right: 36,
                  zIndex: 0,
                  animation: 'dinegoSteamWave 3s ease-in-out infinite',
                }}
              >
                <path d="M14 40C8 29 20 19 14 6" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                <path d="M34 38C28 26 40 16 34 4" stroke="#FB923C" strokeWidth="3" strokeLinecap="round" />
                <path d="M54 40C48 29 60 19 54 8" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
              </svg>

              {/* Floating Basil Leaf Top-Left */}
              <svg
                aria-hidden="true"
                width="44"
                height="34"
                viewBox="0 0 44 34"
                fill="none"
                style={{
                  position: 'absolute',
                  top: -18,
                  left: 16,
                  zIndex: 3,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 6px 10px rgba(77,124,15,0.2))',
                  animation: 'dinegoFloatLeaf 4.5s ease-in-out infinite',
                }}
              >
                <path d="M4 28C10 10 26 3 41 5C39 20 27 31 4 28Z" fill="#65A30D" />
                <path d="M6 27C16 20 27 13 39 6" stroke="#D9F99D" strokeWidth="1.6" strokeLinecap="round" />
              </svg>

              {/* Floating Herb Leaf Bottom-Left */}
              <svg
                aria-hidden="true"
                width="48"
                height="38"
                viewBox="0 0 48 38"
                fill="none"
                style={{
                  position: 'absolute',
                  bottom: 18,
                  left: -26,
                  zIndex: 3,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 6px 10px rgba(77,124,15,0.22))',
                  animation: 'dinegoFloatLeafReverse 5s ease-in-out infinite',
                }}
              >
                <path d="M6 10C20 4 36 12 43 29C27 34 11 26 6 10Z" fill="#4D7C0F" />
                <path d="M8 11C19 16 31 22 41 28" stroke="#BEF264" strokeWidth="1.6" strokeLinecap="round" />
              </svg>

              {/* 4 Curved Corner Doodle Arcs Hugging the Card */}
              <svg
                aria-hidden="true"
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                style={{ position: 'absolute', top: -11, left: -11, zIndex: 3, pointerEvents: 'none' }}
              >
                <path d="M5 24C5 13 13 5 24 5" stroke="#DFC092" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
              <svg
                aria-hidden="true"
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                style={{ position: 'absolute', top: -11, right: -11, zIndex: 3, pointerEvents: 'none' }}
              >
                <path d="M6 5C17 5 25 13 25 24" stroke="#DFC092" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
              <svg
                aria-hidden="true"
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                style={{ position: 'absolute', bottom: -11, left: -11, zIndex: 3, pointerEvents: 'none' }}
              >
                <path d="M5 6C5 17 13 25 24 25" stroke="#DFC092" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
              <svg
                aria-hidden="true"
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                style={{ position: 'absolute', bottom: -11, right: -11, zIndex: 3, pointerEvents: 'none' }}
              >
                <path d="M6 25C17 25 25 17 25 6" stroke="#DFC092" strokeWidth="3.2" strokeLinecap="round" />
              </svg>

              <FeaturedHeroDishCard
                featuredPool={featuredPool}
                fallbackMerchant={allMerchantsList[0]}
                onSelectMerchant={onSelectMerchant}
              />
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

      {/* 3. RESTAURANT DIRECTORY (Moved right below Categories for instant ordering) */}
      <div id="merchant-directory" className="container" style={{ marginTop: 34 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            gap: 16,
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <h2
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.3px',
                margin: 0,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Quán ngon sẵn sàng giao</span>
              <span
                title={`${sortedMerchants.length} quán phù hợp`}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 46,
                  height: 32,
                  flexShrink: 0,
                  filter: 'drop-shadow(0 3px 6px rgba(0, 177, 79, 0.24))',
                }}
              >
                <svg
                  aria-hidden="true"
                  width="46"
                  height="32"
                  viewBox="0 0 46 32"
                  fill="none"
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <defs>
                    <linearGradient id="dinegoLeafBadgeGrad" x1="4" y1="28" x2="42" y2="4" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="55%" stopColor="#00B14F" />
                      <stop offset="100%" stopColor="#22C55E" />
                    </linearGradient>
                  </defs>
                  {/* Organic rounded leaf-pill silhouette */}
                  <path
                    d="M6 25C3.5 16 8.5 6.5 19.5 4.8C28.5 3.4 37.5 4.5 43 3.5C42.2 12.5 38.5 22.5 28.5 26.8C19.2 30.8 9 30 6 25Z"
                    fill="url(#dinegoLeafBadgeGrad)"
                  />
                  {/* Subtle top-left gloss highlight */}
                  <path
                    d="M9.5 17.5C9.5 11.5 14 7.5 21 6.5"
                    stroke="#FFFFFF"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.32"
                  />
                  {/* Delicate stem & short vein on bottom-left edge (clear of the number) */}
                  <path
                    d="M3 28.5C5.2 26.5 7.2 24.5 9.2 22.5"
                    stroke="#059669"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    color: '#FFFFFF',
                    fontSize: sortedMerchants.length > 99 ? '0.72rem' : '0.82rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    paddingRight: 2,
                    paddingTop: 1,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.18)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {sortedMerchants.length > 99 ? '99+' : sortedMerchants.length}
                </span>
              </span>
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0', whiteSpace: 'nowrap' }}>
              Bấm vào quán để xem thực đơn và đặt món ngay
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: '0 1 auto', justifyContent: 'flex-end' }}>
            {/* Liquid Glass Draggable Filter Bar */}
            <div style={{ maxWidth: '100%', overflowX: 'auto', paddingBottom: 2 }}>
              <div
                ref={filterTrackRef}
                onPointerDown={(e) => {
                  const track = filterTrackRef.current;
                  if (!track) return;
                  dragMetaRef.current = {
                    active: true,
                    moved: false,
                    startX: e.clientX,
                    startLeft: glassPill.left,
                  };
                }}
                onPointerMove={(e) => {
                  if (!dragMetaRef.current.active) return;
                  const track = filterTrackRef.current;
                  if (!track) return;
                  const delta = e.clientX - dragMetaRef.current.startX;
                  if (Math.abs(delta) > 5) {
                    if (!dragMetaRef.current.moved) {
                      dragMetaRef.current.moved = true;
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {}
                    }
                    const maxLeft = Math.max(4, track.scrollWidth - glassPill.width - 4);
                    const nextLeft = Math.max(4, Math.min(maxLeft, dragMetaRef.current.startLeft + delta));
                    const lensCenter = nextLeft + glassPill.width / 2;
                    let closestKey = filterMode;
                    let closestDist = Infinity;
                    for (const [key, el] of Object.entries(filterBtnRefs.current)) {
                      if (!el) continue;
                      const center = el.offsetLeft + el.offsetWidth / 2;
                      const d = Math.abs(center - lensCenter);
                      if (d < closestDist) {
                        closestDist = d;
                        closestKey = key as typeof filterMode;
                      }
                    }
                    setGlassPill((prev) => ({
                      ...prev,
                      left: nextLeft,
                      isDragging: true,
                      isStretching: true,
                    }));
                    if (closestKey !== filterMode) {
                      setFilterMode(closestKey);
                    }
                  }
                }}
                onPointerUp={(e) => {
                  if (!dragMetaRef.current.active) return;
                  const wasMoved = dragMetaRef.current.moved;
                  if (wasMoved) {
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {}
                  }
                  dragMetaRef.current.active = false;
                  dragMetaRef.current.moved = false;
                  if (wasMoved) {
                    const btn = filterBtnRefs.current[filterMode];
                    setGlassPill({
                      left: btn ? btn.offsetLeft : glassPill.left,
                      width: btn ? btn.offsetWidth : glassPill.width,
                      isDragging: false,
                      isStretching: false,
                    });
                  }
                }}
                onPointerCancel={() => {
                  dragMetaRef.current.active = false;
                  dragMetaRef.current.moved = false;
                  const btn = filterBtnRefs.current[filterMode];
                  setGlassPill({
                    left: btn ? btn.offsetLeft : glassPill.left,
                    width: btn ? btn.offsetWidth : glassPill.width,
                    isDragging: false,
                    isStretching: false,
                  });
                }}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: 999,
                  padding: 4,
                  gap: 2,
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  overflow: 'hidden',
                  cursor: glassPill.isDragging ? 'grabbing' : 'pointer',
                  boxShadow: 'inset 0 1px 3px rgba(15, 23, 42, 0.06)',
                }}
              >
                {/* Translucent Liquid Glass Lens Thumb (no backdropFilter to prevent square bleed) */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 4,
                    bottom: 4,
                    left: 0,
                    width: glassPill.width,
                    borderRadius: 999,
                    overflow: 'hidden',
                    transform: `translate3d(${glassPill.left}px, 0, 0) scale(${
                      glassPill.isDragging
                        ? '1.04, 1.03'
                        : glassPill.isStretching
                        ? '1.05, 0.95'
                        : '1, 1'
                    })`,
                    transition: glassPill.isDragging
                      ? 'transform 0.08s ease-out, width 0.14s ease'
                      : 'transform 0.4s cubic-bezier(0.34, 1.45, 0.64, 1), width 0.3s cubic-bezier(0.34, 1.35, 0.64, 1)',
                    background:
                      'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.58) 55%, rgba(236, 253, 245, 0.85) 100%)',
                    boxShadow: glassPill.isDragging
                      ? '0 6px 16px rgba(0, 177, 79, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08), inset 0 1.5px 1px rgba(255, 255, 255, 1), inset 0 0 0 1px rgba(255, 255, 255, 0.95)'
                      : '0 3px 10px rgba(15, 23, 42, 0.08), inset 0 1.5px 1px rgba(255, 255, 255, 1), inset 0 0 0 1px rgba(255, 255, 255, 0.9)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                >
                  {/* Top glossy specular highlight */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: '12%',
                      right: '12%',
                      height: '42%',
                      borderRadius: 999,
                      background:
                        'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 100%)',
                    }}
                  />
                </div>

                {[
                  { key: 'ALL' as const, label: 'Tất cả' },
                  { key: 'NEARBY' as const, label: '📍 Gần tôi' },
                  { key: 'NGON_RE' as const, label: '🍜 DineGo Ngon Rẻ' },
                  { key: 'SUPER_DEAL' as const, label: '🔥 Siêu Deal Quán Đỉnh' },
                  { key: 'BUA_XE' as const, label: '🧋 Bữa Xế Nửa Giá' },
                  { key: 'QUAN_MOI' as const, label: '✨ Quán Mới Giá Hời' },
                  { key: 'DAC_TUYEN' as const, label: '🏆 Quán Đặc Tuyển' },
                ].map((f) => {
                  const isActive = filterMode === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      ref={(el) => {
                        filterBtnRefs.current[f.key] = el;
                      }}
                      onClick={() => {
                        if (!dragMetaRef.current.moved) {
                          setFilterMode(f.key);
                        }
                      }}
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        padding: '7px 11px',
                        borderRadius: 999,
                        background: 'transparent',
                        color: isActive ? '#065F46' : '#475569',
                        fontSize: '0.77rem',
                        fontWeight: isActive ? 800 : 600,
                        cursor: glassPill.isDragging ? 'grabbing' : 'pointer',
                        border: 'none',
                        transition: 'color 0.2s ease',
                        textShadow: isActive ? '0 1px 0 rgba(255, 255, 255, 0.8)' : 'none',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Restaurant Cards Grid */}
        {sortedMerchants.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px dashed #CBD5E1',
              padding: '44px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
              Không tìm thấy quán phù hợp
            </div>
            <p style={{ fontSize: '0.86rem', color: '#64748B', marginBottom: 16 }}>
              Thử đổi từ khóa tìm kiếm hoặc bỏ bộ lọc để xem toàn bộ quán đang mở.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setFilterMode('ALL');
              }}
              style={{
                padding: '9px 18px',
                borderRadius: 999,
                background: '#00B14F',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Xem tất cả quán
            </button>
          </div>
        ) : (
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
            const isClosed = merchant.isOpen === false;
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
                  opacity: isClosed ? 0.72 : isOutOfRadius ? 0.8 : 1,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <div className="cover-wrapper" style={{ height: 172, position: 'relative' }}>
                  <img
                    src={getMerchantCardImage(merchant)}
                    alt={merchant.name}
                    loading="lazy"
                    style={{ filter: isClosed ? 'grayscale(0.45)' : 'none' }}
                  />
                  {isClosed ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: '#475569',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '4px 9px',
                        borderRadius: 6,
                      }}
                    >
                      Tạm đóng cửa
                    </span>
                  ) : isOutOfRadius ? (
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
                    <span style={{ color: isClosed ? '#64748B' : isOutOfRadius ? '#BE123C' : '#0F172A', fontWeight: 700 }}>
                      {isClosed ? 'Đang đóng cửa' : isOutOfRadius ? 'Xem menu' : 'Xem thực đơn →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
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
