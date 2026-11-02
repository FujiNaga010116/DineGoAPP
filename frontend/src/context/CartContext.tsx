// ==============================================================================
// DineGo Frontend — Cart Context (Phase 5.1 & Phase 5.2 Integration)
// ==============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { VALID_VOUCHERS } from '../api/client';
import type { Cart, CartItem, CartItemTopping, MenuItem } from '../types';

interface CartContextType {
  cart: Cart;
  addItem: (
    merchantId: string,
    merchantName: string,
    item: MenuItem,
    quantity: number,
    toppings: CartItemTopping[],
    note?: string,
  ) => boolean;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  removeItem: (cartItemId: string) => void;
  applyVoucher: (code: string) => { success: boolean; message: string };
  removeVoucher: () => void;
  clearCart: () => void;
  cartCount: number;
}

const initialCart: Cart = {
  merchantId: null,
  merchantName: null,
  items: [],
  subtotal: 0,
  deliveryFee: 15000,
  discountAmount: 0,
  voucherCode: null,
  finalTotal: 0,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart>(() => {
    const saved = localStorage.getItem('dinego_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialCart;
      }
    }
    return initialCart;
  });

  useEffect(() => {
    localStorage.setItem('dinego_cart', JSON.stringify(cart));
  }, [cart]);

  // Recalculate totals
  const recalculateCart = (
    items: CartItem[],
    merchantId: string | null,
    merchantName: string | null,
    voucherCode: string | null,
  ): Cart => {
    if (items.length === 0) {
      return {
        ...initialCart,
      };
    }

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryFee = 15000;
    let discountAmount = 0;

    if (voucherCode && VALID_VOUCHERS[voucherCode]) {
      const v = VALID_VOUCHERS[voucherCode];
      if (subtotal >= v.minOrder) {
        discountAmount = Math.min(v.discount, subtotal);
      }
    }

    const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

    return {
      merchantId,
      merchantName,
      items,
      subtotal,
      deliveryFee,
      discountAmount,
      voucherCode,
      finalTotal,
    };
  };

  const addItem = (
    merchantId: string,
    merchantName: string,
    item: MenuItem,
    quantity: number,
    toppings: CartItemTopping[],
    note?: string,
  ): boolean => {
    // If cart has items from another merchant, reject or ask user
    if (cart.merchantId && cart.merchantId !== merchantId && cart.items.length > 0) {
      const confirmClear = window.confirm(
        `Giỏ hàng của bạn đang có món từ "${cart.merchantName}". Bạn có muốn xóa giỏ cũ để chọn món tại "${merchantName}" không?`,
      );
      if (!confirmClear) return false;
    }

    const toppingTotal = toppings.reduce((sum, t) => sum + t.price, 0);
    const itemSubtotal = (item.basePrice + toppingTotal) * quantity;
    const cartItemId = `${item.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newItem: CartItem = {
      id: cartItemId,
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      basePrice: item.basePrice,
      quantity,
      note,
      toppings,
      subtotal: itemSubtotal,
    };

    const newItems =
      cart.merchantId === merchantId ? [...cart.items, newItem] : [newItem];

    setCart(recalculateCart(newItems, merchantId, merchantName, cart.voucherCode));
    return true;
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    const newItems = cart.items.map((item) => {
      if (item.id === cartItemId) {
        const toppingTotal = item.toppings.reduce((sum, t) => sum + t.price, 0);
        return {
          ...item,
          quantity: newQuantity,
          subtotal: (item.basePrice + toppingTotal) * newQuantity,
        };
      }
      return item;
    });

    setCart(recalculateCart(newItems, cart.merchantId, cart.merchantName, cart.voucherCode));
  };

  const removeItem = (cartItemId: string) => {
    const newItems = cart.items.filter((item) => item.id !== cartItemId);
    const merchantId = newItems.length > 0 ? cart.merchantId : null;
    const merchantName = newItems.length > 0 ? cart.merchantName : null;
    setCart(recalculateCart(newItems, merchantId, merchantName, cart.voucherCode));
  };

  const applyVoucher = (code: string): { success: boolean; message: string } => {
    const normalized = code.trim().toUpperCase();
    const v = VALID_VOUCHERS[normalized];

    if (!v) {
      return { success: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' };
    }

    if (cart.subtotal < v.minOrder) {
      return {
        success: false,
        message: `Đơn hàng cần tối thiểu ${v.minOrder.toLocaleString('vi-VN')}đ để áp dụng mã này.`,
      };
    }

    setCart(recalculateCart(cart.items, cart.merchantId, cart.merchantName, normalized));
    return {
      success: true,
      message: `Đã áp dụng mã "${normalized}" thành công (-${v.discount.toLocaleString('vi-VN')}đ)!`,
    };
  };

  const removeVoucher = () => {
    setCart(recalculateCart(cart.items, cart.merchantId, cart.merchantName, null));
  };

  const clearCart = () => {
    setCart(initialCart);
    localStorage.removeItem('dinego_cart');
  };

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        updateQuantity,
        removeItem,
        applyVoucher,
        removeVoucher,
        clearCart,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
