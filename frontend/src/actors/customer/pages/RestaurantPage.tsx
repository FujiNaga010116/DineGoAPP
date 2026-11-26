// ==============================================================================
// DineGo Frontend — Restaurant Detail & Menu Page (GrabFood Market Style)
// Verified Partner Badge, Cover Banner, Category Filters, Dish Cards, Customizer Modal
// ==============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  ShoppingBag,
  ShieldCheck,
  Search,
  Share2,
  Ticket,
  AlertTriangle,
} from 'lucide-react';
import { MOCK_MENU_ITEMS } from '../../../api/client';
import { useCart } from '../../../context/CartContext';
import { calculateHaversineKm, hasVerifiedCustomerAddress } from '../../../utils/routing';
import {
  ADMIN_VOUCHERS_KEY,
  claimVoucherForAccount,
  fetchRemoteAdminVouchers,
  isWithinGoldenHours,
  loadAdminVouchers,
  loadUserClaimedCodes,
  type ManagedVoucher,
} from '../../../utils/vouchers';
import type {
  CartItemTopping,
  MenuItem,
  Merchant,
  Topping,
  User,
} from '../../../types';

interface RestaurantPageProps {
  merchant: Merchant;
  onBack: () => void;
  onGoToCheckout: () => void;
  menuItems?: Record<string, MenuItem[]>;
  currentUser?: User | null;
  onRequireAddressSetup?: (afterSetup: () => void) => void;
}

const getStoreVoucherBg = (m: Merchant): string => {
  const name = (m.name || '').toLowerCase();
  if (name.includes('phở')) return '/images/pho-thin.jpg';
  if (name.includes('trà sữa') || name.includes('cà phê') || name.includes('gong cha')) {
    return '/images/tra-sua-ca-phe.jpg';
  }
  if (name.includes('pizza') || name.includes('pasta')) return '/images/pizza-artisan.jpg';
  if (name.includes('cơm')) return '/images/catering-housewarming.jpg';
  if (name.includes('bún')) return '/images/feast-bbq.jpg';
  if (name.includes('bánh')) return '/images/feast-buffet.jpg';
  if (name.includes('cỗ') || name.includes('tiệc') || name.includes('hoàng gia')) {
    return '/images/catering-memorial.jpg';
  }
  return m.coverUrl || m.storeFrontImage || m.logoUrl || '/images/feast-buffet.jpg';
};

export const RestaurantPage: React.FC<RestaurantPageProps> = ({
  merchant,
  onBack,
  onGoToCheckout,
  menuItems,
  currentUser,
  onRequireAddressSetup,
}) => {
  const { addItem, cartCount, cart, applyVoucher, removeVoucher } = useCart();
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedToppings, setSelectedToppings] = useState<CartItemTopping[]>([]);
  const [itemNote, setItemNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Customer location & merchant distance calculation
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

  const merchantDistanceKm =
    typeof merchant.latitude === 'number' && typeof merchant.longitude === 'number'
      ? calculateHaversineKm(
          { lat: userLat, lng: userLng },
          { lat: merchant.latitude, lng: merchant.longitude },
        )
      : 2.2;
  const isOverRadius = merchantDistanceKm > 15;

  const [allVouchers, setAllVouchers] = useState<ManagedVoucher[]>(() => loadAdminVouchers());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [restaurantReviews, setRestaurantReviews] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('dinego_merchant_reviews');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const reloadReviews = () => {
      try {
        const raw = localStorage.getItem('dinego_merchant_reviews');
        if (raw) setRestaurantReviews(JSON.parse(raw));
      } catch {}
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'dinego_merchant_reviews') reloadReviews();
    };
    const ch =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_reviews_sync') : null;
    if (ch) {
      ch.onmessage = () => reloadReviews();
    }
    window.addEventListener('storage', handleStorage);
    window.addEventListener('dinego_reviews_updated', reloadReviews);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dinego_reviews_updated', reloadReviews);
      ch?.close();
    };
  }, []);

  const matchedReviews = useMemo(() => {
    const mNameNorm = (merchant.name || '').trim().toLowerCase();
    return restaurantReviews.filter((r) => {
      if (r.merchantId && r.merchantId === merchant.id) return true;
      if (r.merchantName && String(r.merchantName).trim().toLowerCase() === mNameNorm) return true;
      return false;
    });
  }, [restaurantReviews, merchant.id, merchant.name]);
  const [claimedCodes, setClaimedCodes] = useState<string[]>(() =>
    loadUserClaimedCodes(currentUser?.id),
  );
  const [preselectedCode, setPreselectedCode] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem('dinego_preselected_voucher');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.merchantId || parsed.merchantId === 'ALL' || parsed.merchantId === merchant.id) {
          return String(parsed.code || '').toUpperCase() || null;
        }
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    const hasGolden = allVouchers.some(
      (v) => v.eventTheme === 'FLASH_SALE' && v.goldenStartTime && v.goldenEndTime,
    );
    if (!hasGolden) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [allVouchers]);

  useEffect(() => {
    let active = true;
    const syncVouchers = async () => {
      if (active) {
        setAllVouchers(loadAdminVouchers());
        setClaimedCodes(loadUserClaimedCodes(currentUser?.id));
      }
      const remote = await fetchRemoteAdminVouchers();
      if (active && remote) {
        setAllVouchers(remote);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_VOUCHERS_KEY) {
        setAllVouchers(loadAdminVouchers());
      }
    };
    const handleVoucherEvent = () => {
      setAllVouchers(loadAdminVouchers());
    };
    const ch =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_vouchers_sync') : null;
    if (ch) {
      ch.onmessage = () => setAllVouchers(loadAdminVouchers());
    }
    void syncVouchers();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('dinego_vouchers_updated', handleVoucherEvent);
    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dinego_vouchers_updated', handleVoucherEvent);
      ch?.close();
    };
  }, [currentUser?.id, merchant.id]);

  // Active & non-expired Shop Vouchers belonging exclusively to this restaurant
  const shopVouchers = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const merchantNameLower = (merchant.name || '').toLowerCase();
    return allVouchers.filter(
      (v) =>
        v.isActive !== false &&
        (!v.endDate || v.endDate >= todayStr) &&
        (v.merchantId === merchant.id ||
          (v.merchantId &&
            v.merchantId !== 'ALL' &&
            v.merchantName &&
            v.merchantName.toLowerCase() === merchantNameLower)) &&
        Math.max(Number(v.claimedCount || 0), Number(v.usageCount || 0)) <
          Number(v.maxUsage || 999999),
    );
  }, [allVouchers, merchant.id, merchant.name]);

  // Active & non-expired Platform Vouchers usable at any restaurant
  const platformVouchers = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allVouchers.filter(
      (v) =>
        v.isActive !== false &&
        (!v.endDate || v.endDate >= todayStr) &&
        (!v.merchantId || v.merchantId === 'ALL') &&
        Math.max(Number(v.claimedCount || 0), Number(v.usageCount || 0)) <
          Number(v.maxUsage || 999999),
    );
  }, [allVouchers]);

  const handleSelectStoreVoucher = async (v: ManagedVoucher) => {
    const codeUpper = v.code.toUpperCase();
    // Claim to user wallet if logged in and not yet claimed
    if (currentUser?.id && !claimedCodes.includes(codeUpper)) {
      const { claimedCodes: nextClaimed, updatedVouchers } = await claimVoucherForAccount(
        currentUser.id,
        codeUpper,
      );
      setClaimedCodes(nextClaimed);
      setAllVouchers(updatedVouchers);
    }

    // If cart currently belongs to this merchant and meets minOrder, apply immediately
    if (cart.merchantId === merchant.id && cart.subtotal >= v.minOrder) {
      const res = applyVoucher(codeUpper);
      if (res.success) {
        setPreselectedCode(null);
        setToastMessage(`🎉 Đã áp mã "${codeUpper}" của quán thành công! (${res.message})`);
        setTimeout(() => setToastMessage(null), 3200);
        return;
      }
    }

    // Otherwise preselect so as soon as user adds items >= minOrder, it auto-applies
    try {
      localStorage.setItem(
        'dinego_preselected_voucher',
        JSON.stringify({ code: codeUpper, merchantId: v.merchantId || 'ALL' }),
      );
    } catch {}
    setPreselectedCode(codeUpper);
    setToastMessage(
      `✅ Đã lưu & chọn mã "${codeUpper}"! Mã sẽ tự động giảm giá ngay khi giỏ hàng tại quán đạt từ ${v.minOrder.toLocaleString('vi-VN')}đ.`,
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const rawMenuItems = (menuItems && menuItems[merchant.id]) || MOCK_MENU_ITEMS[merchant.id] || [];

  // Group categories dynamically (aligned with category || categoryName in filter)
  const categories = useMemo(() => {
    const list = [{ id: 'all', label: 'Tất cả món' }];
    const uniqueCats = Array.from(
      new Set(rawMenuItems.map((i) => i.category || i.categoryName || 'Món chính')),
    );
    uniqueCats.forEach((cat) => {
      list.push({ id: cat, label: cat });
    });
    return list;
  }, [rawMenuItems]);

  const catTrackRef = useRef<HTMLDivElement | null>(null);
  const catBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const catDragRef = useRef<{ active: boolean; moved: boolean; startX: number; startLeft: number }>({
    active: false,
    moved: false,
    startX: 0,
    startLeft: 0,
  });
  const [catPill, setCatPill] = useState<{
    left: number;
    width: number;
    dragging: boolean;
    ready: boolean;
  }>({ left: 0, width: 0, dragging: false, ready: false });

  useEffect(() => {
    const syncCatPill = () => {
      const btn = catBtnRefs.current[activeCategory];
      if (!btn) return;
      setCatPill((prev) => ({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
        dragging: false,
        ready: true,
      }));
    };
    const rafId = window.requestAnimationFrame(syncCatPill);
    window.addEventListener('resize', syncCatPill);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncCatPill);
    };
  }, [activeCategory, categories.length]);

  const filteredMenuItems = useMemo(() => {
    return rawMenuItems.filter((dish) => {
      const matchSearch =
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dish.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        activeCategory === 'all' || (dish.category || dish.categoryName || 'Món chính') === activeCategory;
      return matchSearch && matchCat;
    });
  }, [rawMenuItems, searchQuery, activeCategory]);

  const handleOpenDishModal = (dish: MenuItem) => {
    setSelectedDish(dish);
    setQuantity(1);
    setSelectedToppings([]);
    setItemNote('');
  };

  const handleToggleTopping = (topping: Topping) => {
    const exists = selectedToppings.find((t) => t.toppingId === topping.id);
    if (exists) {
      setSelectedToppings(selectedToppings.filter((t) => t.toppingId !== topping.id));
    } else {
      setSelectedToppings([
        ...selectedToppings,
        {
          id: `${topping.id}-${Date.now()}`,
          toppingId: topping.id,
          name: topping.name,
          price: topping.price,
        },
      ]);
    }
  };

  const handleAddToCart = () => {
    if (!selectedDish) return;

    const performAddToCart = () => {
      const success = addItem(
        merchant.id,
        merchant.name,
        selectedDish,
        quantity,
        selectedToppings,
        itemNote || undefined,
      );

      if (success) {
        setToastMessage(`Đã thêm ${quantity}x "${selectedDish.name}" vào giỏ hàng!`);
        setSelectedDish(null);
        setTimeout(() => setToastMessage(null), 3000);
      }
    };

    if (
      currentUser &&
      currentUser.roles.includes('CUSTOMER') &&
      !hasVerifiedCustomerAddress(currentUser) &&
      onRequireAddressSetup
    ) {
      onRequireAddressSetup(performAddToCart);
      return;
    }

    performAddToCart();
  };

  const currentDishToppingTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const currentDishTotalPrice =
    selectedDish ? (selectedDish.basePrice + currentDishToppingTotal) * quantity : 0;

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 14,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 2000,
            fontWeight: 700,
            fontSize: '0.88rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <CheckCircle2 size={18} color="#00B14F" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back button & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            padding: '8px 16px',
            borderRadius: 12,
            color: 'var(--text-main)',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.color = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-main)';
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại trang chủ</span>
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              padding: '8px 14px',
              borderRadius: 12,
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Share2 size={15} />
            <span>Chia sẻ quán</span>
          </button>
        </div>
      </div>

      {/* Restaurant Header Card (GrabFood Style) */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: 28,
        }}
      >
        <div style={{ height: 220, position: 'relative', background: '#F1F5F9' }}>
          <img
            src={merchant.coverUrl || getStoreVoucherBg(merchant)}
            alt={merchant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0.08) 55%, transparent 100%)',
            }}
          />
          {/* Single Clean Verified Partner Badge */}
          <div style={{ position: 'absolute', top: 14, left: 14 }}>
            <span
              style={{
                background: 'rgba(0, 177, 79, 0.92)',
                color: '#FFFFFF',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backdropFilter: 'blur(4px)',
              }}
            >
              <ShieldCheck size={14} />
              Đối tác xác thực
            </span>
          </div>
        </div>

        {/* Restaurant Body Info */}
        <div style={{ padding: '24px 28px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {merchant.name}
                </h1>
                <span
                  style={{
                    background: 'rgba(0, 177, 79, 0.1)',
                    color: 'var(--primary)',
                    padding: '3px 10px',
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  Đang mở cửa
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  color: 'var(--text-muted)',
                  fontSize: '0.92rem',
                  flexWrap: 'wrap',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: '#B45309',
                    fontWeight: 700,
                    background: '#FEF3C7',
                    padding: '3px 10px',
                    borderRadius: 8,
                  }}
                >
                  <Star size={15} fill="#F59E0B" color="#F59E0B" />
                  {merchant.rating} ({merchant.reviewCount}+ đánh giá)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                  <Clock size={16} color="var(--primary)" />
                  {merchant.deliveryTimeMin} - {merchant.deliveryTimeMax} phút giao hàng
                </span>
                <span>•</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: isOverRadius ? '#E11D48' : 'var(--primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isOverRadius ? <AlertTriangle size={14} color="#E11D48" /> : <MapPin size={14} color="var(--primary)" />}
                  Cách bạn {merchantDistanceKm.toFixed(1)} km
                  {isOverRadius && ' (Ngoài bán kính 15km)'}
                </span>
              </div>

              {isOverRadius && (
                <div
                  style={{
                    marginTop: 12,
                    marginBottom: 12,
                    padding: '10px 14px',
                    background: '#FFF1F2',
                    border: '1px solid #FECDD3',
                    borderRadius: 10,
                    color: '#9F1239',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: '0.84rem',
                  }}
                >
                  <AlertTriangle size={18} color="#E11D48" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 800 }}>Vượt quá bán kính giao hàng tối đa 15 km ({merchantDistanceKm.toFixed(1)} km)</div>
                    <div style={{ fontSize: '0.78rem', marginTop: 2, color: '#BE123C', lineHeight: 1.4 }}>
                      DineGo giới hạn bán kính 15km để đồ ăn khi giao tới tay bạn luôn giữ được nhiệt độ nóng sốt và hương vị ngon nhất. Bạn có thể tham khảo menu nhưng đơn hàng sẽ không thể giao tới địa chỉ hiện tại.
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                }}
              >
                <MapPin size={15} color="var(--primary)" />
                <span>{merchant.address}</span>
              </div>

              {(merchant.ownerName || merchant.phoneNumber) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginTop: 8,
                    flexWrap: 'wrap',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {merchant.ownerName && (
                    <span>
                      Chủ quán: <strong style={{ color: 'var(--text-main)' }}>{merchant.ownerName}</strong>
                    </span>
                  )}
                  {merchant.phoneNumber && (
                    <span>
                      Hotline: <strong style={{ color: 'var(--primary)' }}>{merchant.phoneNumber}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick Cart Summary Pill if items in cart for this merchant */}
            {cartCount > 0 && cart.merchantId === merchant.id && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (
                    currentUser &&
                    currentUser.roles.includes('CUSTOMER') &&
                    !hasVerifiedCustomerAddress(currentUser) &&
                    onRequireAddressSetup
                  ) {
                    onRequireAddressSetup(onGoToCheckout);
                    return;
                  }
                  onGoToCheckout();
                }}
                style={{
                  padding: '14px 26px',
                  borderRadius: 16,
                  fontSize: '1rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 8px 24px rgba(0, 177, 79, 0.35)',
                }}
              >
                <ShoppingBag size={20} />
                <span>Xem giỏ hàng ({cartCount} món • {cart.subtotal.toLocaleString('vi-VN')}đ)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Storefront Exclusive Shop Vouchers & Platform Vouchers Section (Synced with VoucherHuntPage) */}
      {(shopVouchers.length > 0 || platformVouchers.length > 0) && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
            marginBottom: 24,
          }}
        >
          <style>{`
            .dinego-shop-voucher {
              transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease, border-color 0.2s ease;
            }
            .dinego-shop-voucher:hover {
              transform: translateY(-2px);
              border-color: #86EFAC !important;
              box-shadow: 0 10px 22px rgba(0, 177, 79, 0.12) !important;
            }
            .dinego-shop-voucher .dinego-shop-voucher-img {
              transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .dinego-shop-voucher:hover .dinego-shop-voucher-img {
              transform: scale(1.06);
            }
            .dinego-shop-voucher-btn {
              transition: background-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
            }
            .dinego-shop-voucher-btn:not(:disabled):hover {
              background-color: #009643 !important;
              transform: translateY(-1px);
              box-shadow: 0 4px 10px rgba(0, 177, 79, 0.26);
            }
            .dinego-voucher-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(0, 177, 79, 0.42) #F1F5F9;
            }
            .dinego-voucher-scroll::-webkit-scrollbar {
              height: 6px;
            }
            .dinego-voucher-scroll::-webkit-scrollbar-track {
              background: #F1F5F9;
              border-radius: 999px;
            }
            .dinego-voucher-scroll::-webkit-scrollbar-thumb {
              background: rgba(0, 177, 79, 0.36);
              border-radius: 999px;
              transition: background-color 0.2s ease;
            }
            .dinego-voucher-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(0, 177, 79, 0.72);
            }
          `}</style>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#ECFDF5',
                  color: '#009643',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ticket size={19} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  Ưu đãi áp dụng tại {merchant.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Lưu &amp; áp dụng mã trực tiếp vào giỏ hàng của bạn
                </div>
              </div>
            </div>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                background: '#ECFDF5',
                color: '#009643',
                border: '1px solid #BBF7D0',
                fontSize: '0.76rem',
                fontWeight: 700,
              }}
            >
              {shopVouchers.length} mã quán • {platformVouchers.length} mã toàn sàn
            </span>
          </div>

          <div
            className="dinego-voucher-scroll"
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 12,
              overflowX: 'auto',
              padding: '4px 2px 10px',
              scrollSnapType: 'x mandatory',
            }}
          >
            {[...shopVouchers, ...platformVouchers].map((v) => {
              const isShopVoucher = Boolean(v.merchantId && v.merchantId !== 'ALL');
              const codeUpper = v.code.toUpperCase();
              const isAppliedNow =
                cart.merchantId === merchant.id &&
                cart.voucherCode &&
                cart.voucherCode.toUpperCase() === codeUpper;
              const isPreselected = !isAppliedNow && preselectedCode === codeUpper;
              const isClaimed = claimedCodes.includes(codeUpper);
              const claimedOrUsed = Math.max(Number(v.claimedCount || 0), Number(v.usageCount || 0));
              const maxQuota = Math.max(1, Number(v.maxUsage || 200));
              const pct = Math.min(100, Math.round((claimedOrUsed / maxQuota) * 100));
              const remaining = Math.max(0, maxQuota - claimedOrUsed);
              const shortDiscount =
                v.discountType === 'PERCENTAGE'
                  ? `${v.discountValue}%`
                  : v.discountValue >= 1000
                    ? `${Math.round(Number(v.discountValue) / 1000)}K`
                    : `${v.discountValue}đ`;
              const golden = isWithinGoldenHours(v, nowMs);

              return (
                <div
                  key={v.id}
                  className="dinego-shop-voucher"
                  style={{
                    flex: '0 0 336px',
                    maxWidth: '86vw',
                    scrollSnapAlign: 'start',
                    background: '#FFFFFF',
                    borderRadius: 14,
                    border: isAppliedNow
                      ? '1.5px solid #00B14F'
                      : '1px solid #E2E8F0',
                    height: 114,
                    display: 'flex',
                    overflow: 'visible',
                    boxShadow: isAppliedNow
                      ? '0 4px 12px rgba(0, 177, 79, 0.1)'
                      : '0 2px 6px rgba(15, 23, 42, 0.04)',
                    position: 'relative',
                  }}
                >
                  {/* Left Perforated Stub */}
                  <div
                    style={{
                      width: 92,
                      flexShrink: 0,
                      background: isShopVoucher
                        ? '#0F172A'
                        : 'linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 100%)',
                      borderRadius: '13px 0 0 13px',
                      padding: '8px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: isShopVoucher ? 'flex-end' : 'center',
                      textAlign: 'center',
                      borderRight: '1.5px dashed #CBD5E1',
                      position: 'relative',
                    }}
                  >
                    {isShopVoucher && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '13px 0 0 13px',
                          overflow: 'hidden',
                          pointerEvents: 'none',
                        }}
                      >
                        <img
                          src={getStoreVoucherBg(merchant)}
                          alt=""
                          loading="lazy"
                          className="dinego-shop-voucher-img"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(180deg, rgba(15,23,42,0.04) 0%, rgba(15,23,42,0.28) 45%, rgba(15,23,42,0.85) 100%)',
                          }}
                        />
                      </div>
                    )}

                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        borderBottom: '1px solid #E2E8F0',
                        zIndex: 2,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        bottom: -6,
                        right: -6,
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        borderTop: '1px solid #E2E8F0',
                        zIndex: 2,
                      }}
                    />

                    {!isShopVoucher && (
                      <img
                        src="/images/dinego-logo.png"
                        alt="DineGo"
                        loading="lazy"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          objectFit: 'contain',
                          background: '#FFFFFF',
                          border: '1px solid #BBF7D0',
                          padding: 3,
                          marginBottom: 4,
                          position: 'relative',
                          zIndex: 1,
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        fontSize: '1.08rem',
                        fontWeight: 900,
                        color: isShopVoucher ? '#FFFFFF' : '#009643',
                        lineHeight: 1.05,
                        textShadow: isShopVoucher ? '0 2px 6px rgba(0,0,0,0.65)' : 'none',
                      }}
                    >
                      -{shortDiscount}
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        color: isShopVoucher ? 'rgba(255,255,255,0.92)' : '#047857',
                        marginTop: 2,
                      }}
                    >
                      {isShopVoucher ? 'Tại quán' : 'Toàn sàn'}
                    </div>
                  </div>

                  {/* Right Body */}
                  <div
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span
                        style={{
                          background: '#F8FAFC',
                          border: '1px dashed #CBD5E1',
                          borderRadius: 6,
                          padding: '1px 7px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v.code}
                      </span>
                      {isClaimed && (
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#009643', whiteSpace: 'nowrap' }}>
                          Đã lưu ví
                        </span>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {v.discountType === 'PERCENTAGE'
                          ? `Giảm ${v.discountValue}%${v.maxDiscountAmount ? ` • Tối đa ${(v.maxDiscountAmount / 1000).toFixed(0)}k` : ''}`
                          : `Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}đ`}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Đơn từ {Number(v.minOrder).toLocaleString('vi-VN')}đ
                        {golden.label ? ` • ${golden.label}` : ''}
                      </div>
                    </div>

                    <div>
                      <div style={{ height: 3, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden', marginBottom: 6 }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: pct >= 85 ? '#EF4444' : '#00B14F',
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: pct >= 85 ? '#DC2626' : '#009643' }}>
                          Còn {remaining} lượt
                        </span>

                        {isAppliedNow ? (
                          <button
                            type="button"
                            onClick={() => removeVoucher()}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: '#ECFDF5',
                              color: '#009643',
                              border: '1px solid #00B14F',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✓ Đang áp dụng
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!golden.active}
                            onClick={() => handleSelectStoreVoucher(v)}
                            className="dinego-shop-voucher-btn"
                            style={{
                              padding: '4px 12px',
                              borderRadius: 999,
                              background: !golden.active
                                ? '#E2E8F0'
                                : isPreselected
                                ? '#ECFDF5'
                                : '#00B14F',
                              color: !golden.active
                                ? '#64748B'
                                : isPreselected
                                ? '#009643'
                                : '#FFFFFF',
                              border: isPreselected && golden.active ? '1px solid #00B14F' : 'none',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: !golden.active ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {!golden.active
                              ? golden.countdownText || `Mở lúc ${v.goldenStartTime}`
                              : isPreselected
                              ? 'Đã chọn mã'
                              : 'Lưu & Áp mã'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Menu Categories Bar & Search Filter */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '14px 20px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        {/* Liquid Glass Draggable & Clickable Category Filter */}
        <div style={{ maxWidth: '100%', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          <div
            ref={catTrackRef}
            onPointerDown={(e) => {
              const track = catTrackRef.current;
              if (!track) return;
              catDragRef.current = {
                active: true,
                moved: false,
                startX: e.clientX,
                startLeft: catPill.left,
              };
            }}
            onPointerMove={(e) => {
              if (!catDragRef.current.active) return;
              const track = catTrackRef.current;
              if (!track) return;
              const dx = e.clientX - catDragRef.current.startX;
              if (Math.abs(dx) > 5) {
                catDragRef.current.moved = true;
                try {
                  if (!track.hasPointerCapture(e.pointerId)) {
                    track.setPointerCapture(e.pointerId);
                  }
                } catch {}
              }
              if (!catDragRef.current.moved) return;
              const maxLeft = Math.max(0, track.clientWidth - catPill.width - 4);
              const clampedLeft = Math.min(maxLeft, Math.max(4, catDragRef.current.startLeft + dx));
              setCatPill((prev) => ({ ...prev, left: clampedLeft, dragging: true }));

              const center = clampedLeft + catPill.width / 2;
              let closest = categories[0]?.id || 'all';
              let bestDist = Infinity;
              for (const c of categories) {
                const btn = catBtnRefs.current[c.id];
                if (!btn) continue;
                const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
                const dist = Math.abs(center - btnCenter);
                if (dist < bestDist) {
                  bestDist = dist;
                  closest = c.id;
                }
              }
              if (closest !== activeCategory) {
                setActiveCategory(closest);
              }
            }}
            onPointerUp={(e) => {
              if (!catDragRef.current.active) return;
              const wasMoved = catDragRef.current.moved;
              catDragRef.current.active = false;
              catDragRef.current.moved = false;
              const track = catTrackRef.current;
              if (track) {
                try {
                  if (track.hasPointerCapture(e.pointerId)) {
                    track.releasePointerCapture(e.pointerId);
                  }
                } catch {}
              }
              if (wasMoved) {
                const btn = catBtnRefs.current[activeCategory];
                if (btn) {
                  setCatPill({
                    left: btn.offsetLeft,
                    width: btn.offsetWidth,
                    dragging: false,
                    ready: true,
                  });
                }
              }
            }}
            onPointerCancel={() => {
              catDragRef.current.active = false;
              catDragRef.current.moved = false;
              const btn = catBtnRefs.current[activeCategory];
              if (btn) {
                setCatPill({
                  left: btn.offsetLeft,
                  width: btn.offsetWidth,
                  dragging: false,
                  ready: true,
                });
              }
            }}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: 4,
              borderRadius: 999,
              background: 'rgba(241, 245, 249, 0.85)',
              border: '1px solid rgba(203, 213, 225, 0.7)',
              boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.05)',
              userSelect: 'none',
              touchAction: 'pan-y',
              cursor: catPill.dragging ? 'grabbing' : 'grab',
            }}
          >
            {catPill.ready && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 4,
                  bottom: 4,
                  left: catPill.left,
                  width: catPill.width,
                  borderRadius: 999,
                  background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.56) 54%, rgba(0, 177, 79, 0.12) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.94)',
                  boxShadow:
                    'inset 0 1.5px 2px rgba(255, 255, 255, 0.98), inset 0 -2px 5px rgba(0, 177, 79, 0.14), 0 4px 12px rgba(15, 23, 42, 0.10)',
                  transform: catPill.dragging ? 'scale(1.04, 1.07)' : 'scale(1)',
                  transition: catPill.dragging
                    ? 'transform 0.12s ease'
                    : 'left 0.34s cubic-bezier(0.22, 1, 0.36, 1), width 0.34s cubic-bezier(0.22, 1, 0.36, 1), transform 0.22s ease',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  ref={(el) => {
                    catBtnRefs.current[cat.id] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (!catDragRef.current.moved) {
                      setActiveCategory(cat.id);
                    }
                  }}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    padding: '7px 15px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'transparent',
                    color: isSelected ? '#009643' : '#334155',
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.18s ease',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input in Menu */}
        <div
          style={{
            position: 'relative',
            width: 260,
          }}
        >
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Tìm món tại quán này..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 12,
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Dishes Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {activeCategory === 'all' ? 'Thực đơn món ăn' : activeCategory}
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>
            ({filteredMenuItems.length} món)
          </span>
        </div>

        {filteredMenuItems.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
              Không tìm thấy món ăn nào phù hợp với tìm kiếm của bạn.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 20,
            }}
          >
            {filteredMenuItems.map((dish) => (
              <div
                key={dish.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  padding: 16,
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 177, 79, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                {/* Left: Dish Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {dish.name}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      marginBottom: 12,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.45,
                    }}
                  >
                    {dish.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: dish.isAvailable ? 'var(--primary)' : 'var(--text-muted)',
                      }}
                    >
                      {dish.basePrice.toLocaleString('vi-VN')}đ
                    </span>

                    {!dish.isAvailable ? (
                      <span
                        style={{
                          background: '#FEE2E2',
                          color: '#DC2626',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '5px 10px',
                          borderRadius: 8,
                          border: '1px solid #FCA5A5',
                        }}
                      >
                        Tạm hết hôm nay
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenDishModal(dish)}
                        style={{
                          background: 'var(--primary)',
                          color: '#FFFFFF',
                          border: 'none',
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0, 177, 79, 0.3)',
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        title="Chọn món và tùy chỉnh topping"
                      >
                        <Plus size={20} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Dish Photo Thumbnail */}
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 14,
                    overflow: 'hidden',
                    flexShrink: 0,
                    position: 'relative',
                    opacity: dish.isAvailable ? 1 : 0.6,
                  }}
                >
                  <img
                    src={dish.imageUrl}
                    alt={dish.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {!dish.isAvailable && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.45)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textAlign: 'center',
                      }}
                    >
                      Hết hàng
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Reviews & Merchant Replies Section */}
      <div
        style={{
          marginTop: 28,
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '24px 28px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 18,
            paddingBottom: 14,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              ⭐ Đánh giá từ Thực khách & Phản hồi của Quán ({matchedReviews.length})
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
              Mọi đánh giá từ đơn hàng đã hoàn tất và phản hồi trực tiếp từ chủ quán {merchant.name}
            </p>
          </div>
          {matchedReviews.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                padding: '8px 14px',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#D97706' }}>
                {(
                  matchedReviews.reduce((s, r) => s + Number(r.rating || 5), 0) / matchedReviews.length
                ).toFixed(1)}{' '}
                ★
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E' }}>
                ({matchedReviews.length} lượt đánh giá)
              </span>
            </div>
          )}
        </div>

        {matchedReviews.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: '#F8FAFC',
              borderRadius: 14,
              border: '1px dashed #CBD5E1',
              color: '#64748B',
              fontSize: '0.88rem',
            }}
          >
            Chưa có đánh giá nào cho quán <strong>{merchant.name}</strong>. Hãy đặt món và trở thành thực khách đầu tiên đánh giá nhé!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {matchedReviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  padding: '16px 18px',
                  borderRadius: 14,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                        👤 {rev.customerName || 'Khách hàng'}
                      </span>
                      {rev.orderRef && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          Đơn #{rev.orderRef}
                        </span>
                      )}
                      {rev.itemsSummary && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#ECFDF5',
                            color: '#047857',
                            border: '1px solid #A7F3D0',
                          }}
                        >
                          🍽️ {rev.itemsSummary}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                      🕒 {rev.date || 'Vừa xong'}
                    </div>
                  </div>
                  <div style={{ color: '#F59E0B', fontWeight: 900, fontSize: '0.95rem' }}>
                    {'★'.repeat(Number(rev.rating || 5))}
                    {'☆'.repeat(Math.max(0, 5 - Number(rev.rating || 5)))}
                  </div>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#1E293B', lineHeight: 1.5 }}>
                  “{rev.comment}”
                </div>

                {rev.reply && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#F0FDF4',
                      borderLeft: '3px solid #10B981',
                      fontSize: '0.82rem',
                      color: '#065F46',
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 3, color: '#047857' }}>
                      💬 Phản hồi từ quán {merchant.name}:
                    </div>
                    <div>{rev.reply}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dish Customization Modal (GrabFood Style) */}
      {selectedDish && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedDish(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div style={{ position: 'relative' }}>
              <div style={{ height: 180, width: '100%', position: 'relative' }}>
                <img
                  src={selectedDish.imageUrl}
                  alt={selectedDish.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => setSelectedDish(null)}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: 'rgba(15, 23, 42, 0.7)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '20px 24px 12px 24px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                  {selectedDish.name}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  {selectedDish.description}
                </p>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {selectedDish.basePrice.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>

            {/* Modal Body: Toppings & Options */}
            <div style={{ padding: '12px 24px 20px 24px', flex: 1 }}>
              {selectedDish.toppings && selectedDish.toppings.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Món ăn kèm thêm (Topping)
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tùy chọn không giới hạn</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedDish.toppings.map((top) => {
                      const isSelected = !!selectedToppings.find((t) => t.toppingId === top.id);
                      return (
                        <div
                          key={top.id}
                          onClick={() => handleToggleTopping(top)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: 14,
                            background: isSelected ? 'rgba(0, 177, 79, 0.08)' : 'var(--bg-main)',
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                border: `2px solid ${isSelected ? 'var(--primary)' : '#CBD5E1'}`,
                                background: isSelected ? 'var(--primary)' : '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                              }}
                            >
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                            <span
                              style={{
                                fontSize: '0.92rem',
                                fontWeight: isSelected ? 700 : 500,
                                color: 'var(--text-main)',
                              }}
                            >
                              {top.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.92rem',
                              color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                            }}
                          >
                            +{top.price.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Note */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: 8,
                  }}
                >
                  Ghi chú cho quán chuẩn bị món
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ít cơm, nhiều ớt, để mỡ hành riêng..."
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Modal Footer: Stepper & Submit Button */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              {/* Stepper */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '6px 12px',
                }}
              >
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ fontWeight: 800, minWidth: 24, textAlign: 'center', fontSize: '1rem' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Submit button */}
              <button
                onClick={handleAddToCart}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: 14,
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>Thêm vào giỏ hàng • {currentDishTotalPrice.toLocaleString('vi-VN')}đ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
