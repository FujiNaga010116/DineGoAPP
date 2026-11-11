// ==============================================================================
// DineGo Frontend — Restaurant Detail & Menu Page (GrabFood Market Style)
// Verified Partner Badge, Cover Banner, Category Filters, Dish Cards, Customizer Modal
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Tag,
  Search,
  ThumbsUp,
  Share2,
} from 'lucide-react';
import { MOCK_MENU_ITEMS } from '../api/client';
import { useCart } from '../context/CartContext';
import { hasVerifiedCustomerAddress } from '../utils/routing';
import type {
  CartItemTopping,
  MenuItem,
  Merchant,
  Topping,
  User,
} from '../types';

interface RestaurantPageProps {
  merchant: Merchant;
  onBack: () => void;
  onGoToCheckout: () => void;
  menuItems?: Record<string, MenuItem[]>;
  currentUser?: User | null;
  onRequireAddressSetup?: (afterSetup: () => void) => void;
}

export const RestaurantPage: React.FC<RestaurantPageProps> = ({
  merchant,
  onBack,
  onGoToCheckout,
  menuItems,
  currentUser,
  onRequireAddressSetup,
}) => {
  const { addItem, cartCount, cart } = useCart();
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedToppings, setSelectedToppings] = useState<CartItemTopping[]>([]);
  const [itemNote, setItemNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const rawMenuItems = (menuItems && menuItems[merchant.id]) || MOCK_MENU_ITEMS[merchant.id] || [];

  // Group categories dynamically
  const categories = useMemo(() => {
    const list = [{ id: 'all', label: 'Tất cả món' }];
    const uniqueCats = Array.from(new Set(rawMenuItems.map((i) => i.category || 'Món chính')));
    uniqueCats.forEach((cat) => {
      list.push({ id: cat, label: cat });
    });
    return list;
  }, [rawMenuItems]);

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
            bottom: 30,
            right: 30,
            zIndex: 999,
            background: 'var(--primary)',
            color: '#fff',
            padding: '14px 24px',
            borderRadius: 14,
            boxShadow: '0 10px 30px rgba(0, 177, 79, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 700,
            fontSize: '0.95rem',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <Check size={20} />
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
        <div style={{ height: 240, position: 'relative' }}>
          <img
            src={merchant.coverUrl}
            alt={merchant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%)',
            }}
          />
          {/* Status & Badge Pills on Cover */}
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
            <span
              style={{
                background: 'rgba(0, 177, 79, 0.95)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                backdropFilter: 'blur(4px)',
              }}
            >
              <ShieldCheck size={14} />
              DineGo Partner Quán Chuẩn
            </span>
            <span
              style={{
                background: 'rgba(255, 87, 34, 0.95)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ThumbsUp size={13} />
              Quán ngon chọn lọc
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
                <span style={{ fontWeight: 600 }}>Cách bạn 1.8 km</span>
              </div>

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

              {/* KYC Anti-Fraud Verification Badge & Owner Name */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    background: 'rgba(0, 177, 79, 0.1)',
                    color: '#059669',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <ShieldCheck size={14} /> Quán Thực Tế Đã Thẩm Định KYC
                </span>
                {merchant.ownerName && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Chủ quán: <strong style={{ color: 'var(--text-main)' }}>{merchant.ownerName}</strong>
                  </span>
                )}
                {merchant.phoneNumber && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Hotline: <strong style={{ color: 'var(--primary)' }}>{merchant.phoneNumber}</strong>
                  </span>
                )}
              </div>

              {/* Promo Vouchers Ribbon */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255, 87, 34, 0.08)',
                    border: '1px dashed var(--secondary)',
                    padding: '6px 14px',
                    borderRadius: 10,
                    color: 'var(--secondary)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  <Tag size={14} />
                  <span>Mã DINEGO50: Giảm 50k đơn từ 150k</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(0, 177, 79, 0.08)',
                    border: '1px dashed var(--primary)',
                    padding: '6px 14px',
                    borderRadius: 10,
                    color: 'var(--primary)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  <Tag size={14} />
                  <span>FREESHIP: Miễn phí vận chuyển 15k</span>
                </div>
              </div>
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
        {/* Category Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                fontSize: '0.88rem',
                fontWeight: activeCategory === cat.id ? 700 : 500,
                background: activeCategory === cat.id ? 'var(--primary)' : 'var(--bg-main)',
                color: activeCategory === cat.id ? '#FFFFFF' : 'var(--text-main)',
                border: activeCategory === cat.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Sparkles size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {activeCategory === 'all' ? 'Tất cả các món thơm ngon' : activeCategory}
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
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
