// ==============================================================================
// DineGo Frontend — Restaurant Detail & Menu Page
// ==============================================================================

import React, { useState } from 'react';
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
} from 'lucide-react';
import { MOCK_MENU_ITEMS } from '../api/client';
import { useCart } from '../context/CartContext';
import type {
  CartItemTopping,
  MenuItem,
  Merchant,
  Topping,
} from '../types';

interface RestaurantPageProps {
  merchant: Merchant;
  onBack: () => void;
  onGoToCheckout: () => void;
}

export const RestaurantPage: React.FC<RestaurantPageProps> = ({
  merchant,
  onBack,
  onGoToCheckout,
}) => {
  const { addItem, cartCount, cart } = useCart();
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedToppings, setSelectedToppings] = useState<CartItemTopping[]>([]);
  const [itemNote, setItemNote] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const menuItems = MOCK_MENU_ITEMS[merchant.id] ?? [];

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

    const success = addItem(
      merchant.id,
      merchant.name,
      selectedDish,
      quantity,
      selectedToppings,
      itemNote || undefined,
    );

    if (success) {
      setToastMessage(`Đã thêm ${quantity}x "${selectedDish.name}" vào giỏ!`);
      setSelectedDish(null);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const currentDishToppingTotal = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const currentDishTotalPrice =
    selectedDish ? (selectedDish.basePrice + currentDishToppingTotal) * quantity : 0;

  return (
    <div className="container" style={{ paddingTop: 20 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            zIndex: 999,
            background: 'var(--success)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 700,
          }}
        >
          <Check size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          fontWeight: 600,
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={18} />
        <span>Quay lại danh sách quán</span>
      </button>

      {/* Restaurant Header Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          marginBottom: 36,
        }}
      >
        <div style={{ height: 220, position: 'relative' }}>
          <img
            src={merchant.coverUrl}
            alt={merchant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(11,15,25,0.9) 0%, transparent 70%)',
            }}
          />
        </div>

        <div style={{ padding: '24px 32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                {merchant.name}
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  color: 'var(--text-secondary)',
                  fontSize: '0.92rem',
                }}
              >
                <span className="star-rating" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={16} fill="#F59E0B" color="#F59E0B" />
                  {merchant.rating} ({merchant.reviewCount}+ đánh giá)
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={16} />
                  {merchant.deliveryTimeMin}-{merchant.deliveryTimeMax} phút giao hàng
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  marginTop: 8,
                }}
              >
                <MapPin size={15} />
                <span>{merchant.address}</span>
              </div>
            </div>

            {/* Floating Cart Quick Info */}
            {cartCount > 0 && cart.merchantId === merchant.id && (
              <button
                className="cart-btn"
                onClick={onGoToCheckout}
                style={{ padding: '12px 24px', fontSize: '1rem' }}
              >
                <ShoppingBag size={20} />
                <span>Xem giỏ ({cartCount} món - {cart.subtotal.toLocaleString('vi-VN')}đ)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Sparkles size={22} color="var(--primary)" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
            Thực đơn món ăn đặc sắc
          </h2>
        </div>

        {menuItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Nhà hàng chưa cập nhật danh sách món.</p>
        ) : (
          <div className="grid-dishes">
            {menuItems.map((dish) => (
              <div key={dish.id} className="dish-card">
                <img src={dish.imageUrl} alt={dish.name} className="dish-img" />
                <div className="dish-info">
                  <h3 className="dish-name">{dish.name}</h3>
                  <p className="dish-desc">{dish.description}</p>
                  <div className="dish-footer">
                    <span className="dish-price">{dish.basePrice.toLocaleString('vi-VN')}đ</span>
                    <button
                      className="btn-add-cart"
                      onClick={() => handleOpenDishModal(dish)}
                      title="Tùy chọn món và topping"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dish Topping Customization Modal */}
      {selectedDish && (
        <div className="modal-overlay" onClick={() => setSelectedDish(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedDish(null)}>
              ✕
            </button>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <img
                src={selectedDish.imageUrl}
                alt={selectedDish.name}
                style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover' }}
              />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  {selectedDish.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {selectedDish.description}
                </p>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginTop: 6 }}>
                  {selectedDish.basePrice.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>

            {/* Topping Selection */}
            {selectedDish.toppings && selectedDish.toppings.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                  Chọn món ăn kèm (Topping)
                </h4>
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
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'rgba(255, 87, 34, 0.12)' : 'var(--bg-card)',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-strong)'}`,
                              background: isSelected ? 'var(--primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            {isSelected && <Check size={14} />}
                          </div>
                          <span style={{ fontSize: '0.92rem', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                            {top.name}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                          +{top.price.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Note */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Ghi chú cho quán (không bắt buộc)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Ít cay, nhiều hành, nước lèo riêng..."
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Quantity and Submit */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 16,
                borderTop: '1px solid var(--border)',
              }}
            >
              {/* Quantity Counter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                }}
              >
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ background: 'transparent', color: '#fff', padding: 4 }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  style={{ background: 'transparent', color: '#fff', padding: 4 }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddToCart}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 16px var(--primary-glow)',
                }}
              >
                Thêm vào giỏ • {currentDishTotalPrice.toLocaleString('vi-VN')}đ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
