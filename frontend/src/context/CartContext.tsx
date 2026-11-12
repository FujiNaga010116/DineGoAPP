// ==============================================================================
// DineGo Frontend — Cart Context (Phase 5.1 & Phase 5.2 Integration)
// ==============================================================================

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { loadAdminVouchers } from '../utils/vouchers';
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

const getCartStorageKey = (userId?: string | null) =>
  `dinego_cart_${userId ? userId : 'guest'}`;

const readCartFromStorage = (key: string): Cart => {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return initialCart;
    }
  }
  return initialCart;
};

export const CartProvider: React.FC<{ children: React.ReactNode; userId?: string | null }> = ({
  children,
  userId = null,
}) => {
  const ownerId = userId ?? null;
  const prevOwnerRef = useRef<string | null>(ownerId);
  const [cartState, setCartState] = useState<{ ownerId: string | null; data: Cart }>(() => {
    localStorage.removeItem('dinego_cart');
    return {
      ownerId,
      data: readCartFromStorage(getCartStorageKey(ownerId)),
    };
  });

  const cart: Cart = cartState.ownerId === ownerId ? cartState.data : initialCart;

  const setCart: React.Dispatch<React.SetStateAction<Cart>> = (action) => {
    setCartState((prev) => {
      const currentData =
        prev.ownerId === ownerId ? prev.data : readCartFromStorage(getCartStorageKey(ownerId));
      const nextData = typeof action === 'function' ? action(currentData) : action;
      return { ownerId, data: nextData };
    });
  };

  useEffect(() => {
    const prevOwner = prevOwnerRef.current;
    if (prevOwner === ownerId) return;
    prevOwnerRef.current = ownerId;

    const nextKey = getCartStorageKey(ownerId);
    let nextCart = readCartFromStorage(nextKey);

    // Transfer guest draft cart once when authenticating, then delete guest storage
    // so subsequent accounts never inherit another session's draft items.
    if (prevOwner === null && ownerId !== null) {
      const guestKey = getCartStorageKey(null);
      const guestCart = readCartFromStorage(guestKey);
      localStorage.removeItem(guestKey);

      if (guestCart.items.length > 0 && nextCart.items.length === 0) {
        nextCart = guestCart;
        localStorage.setItem(nextKey, JSON.stringify(guestCart));
      }
    }

    setCartState({ ownerId, data: nextCart });
  }, [ownerId]);

  useEffect(() => {
    const key = getCartStorageKey(cartState.ownerId);
    if (cartState.data.items.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(cartState.data));
    }
  }, [cartState]);

  // Read Admin System Settings & Admin Vouchers from localStorage for live cross-actor sync
  const getLiveAdminSettings = () => {
    try {
      const raw = localStorage.getItem('dinego_admin_settings');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      platformCommissionRate: 15,
      peakHourSurgeFee: 5000,
      minOrderForFreeShipping: 100000,
      autoDispatchRangeKm: 3.5,
      maintenanceMode: false,
    };
  };

  const resolveVoucherByCode = (
    rawCode: string,
  ): {
    code: string;
    title: string;
    discountType: 'FIXED_AMOUNT' | 'PERCENTAGE';
    discountValue: number;
    maxDiscountAmount?: number;
    minOrder: number;
    isActive: boolean;
    usageCount: number;
    maxUsage: number;
    merchantId?: string;
    merchantName?: string;
  } | null => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return null;

    const adminVouchers = loadAdminVouchers();
    const foundAdmin = adminVouchers.find((v) => String(v.code).toUpperCase() === code);
    if (foundAdmin) {
      return {
        code: String(foundAdmin.code).toUpperCase(),
        title: foundAdmin.title || code,
        discountType: foundAdmin.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT',
        discountValue: Number(foundAdmin.discountValue) || 0,
        maxDiscountAmount: foundAdmin.maxDiscountAmount ? Number(foundAdmin.maxDiscountAmount) : undefined,
        minOrder: Number(foundAdmin.minOrder) || 0,
        isActive: foundAdmin.isActive !== false,
        usageCount: Number(foundAdmin.usageCount) || 0,
        maxUsage: Number(foundAdmin.maxUsage) || 999999,
        merchantId: foundAdmin.merchantId || 'ALL',
        merchantName: foundAdmin.merchantName || 'Toàn sàn DineGo',
      };
    }

    return null;
  };

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
    const settings = getLiveAdminSettings();
    const minFreeShip = Number(settings?.minOrderForFreeShipping ?? 100000);
    const surgeFee = Number(settings?.peakHourSurgeFee ?? 0);
    const deliveryFee =
      minFreeShip > 0 && subtotal >= minFreeShip ? 0 : Math.max(0, 15000 + surgeFee);
    let discountAmount = 0;

    let effectiveVoucherCode = voucherCode;
    if (!effectiveVoucherCode && merchantId) {
      try {
        const rawPre = localStorage.getItem('dinego_preselected_voucher');
        if (rawPre) {
          const parsedPre = JSON.parse(rawPre);
          if (
            parsedPre?.code &&
            (!parsedPre.merchantId || parsedPre.merchantId === 'ALL' || parsedPre.merchantId === merchantId)
          ) {
            effectiveVoucherCode = String(parsedPre.code).toUpperCase();
          }
        }
      } catch {}
    }

    if (effectiveVoucherCode) {
      const v = resolveVoucherByCode(effectiveVoucherCode);
      const merchantAllowed =
        !v?.merchantId || v.merchantId === 'ALL' || !merchantId || v.merchantId === merchantId;
      if (!v || !v.isActive || v.usageCount >= v.maxUsage || !merchantAllowed) {
        effectiveVoucherCode = null;
      } else if (subtotal >= v.minOrder) {
        let rawDiscount =
          v.discountType === 'PERCENTAGE'
            ? Math.round((subtotal * v.discountValue) / 100)
            : v.discountValue;
        if (v.discountType === 'PERCENTAGE' && v.maxDiscountAmount) {
          rawDiscount = Math.min(rawDiscount, v.maxDiscountAmount);
        }
        discountAmount = Math.min(rawDiscount, subtotal + deliveryFee);
        try {
          localStorage.removeItem('dinego_preselected_voucher');
        } catch {}
      } else {
        // Keep voucher code remembered ONLY if preselected, otherwise clear active voucher code until minOrder met
        effectiveVoucherCode = null;
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
      voucherCode: effectiveVoucherCode,
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
    const v = resolveVoucherByCode(normalized);

    if (!v) {
      return { success: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' };
    }

    if (!v.isActive || v.usageCount >= v.maxUsage) {
      return {
        success: false,
        message: `Mã "${normalized}" hiện đang tạm dừng hoặc đã hết lượt sử dụng.`,
      };
    }

    if (v.merchantId && v.merchantId !== 'ALL' && cart.merchantId && v.merchantId !== cart.merchantId) {
      return {
        success: false,
        message: `Mã "${normalized}" chỉ áp dụng cho cửa hàng ${v.merchantName || v.merchantId}.`,
      };
    }

    if (cart.subtotal < v.minOrder) {
      return {
        success: false,
        message: `Đơn hàng cần tối thiểu ${v.minOrder.toLocaleString('vi-VN')}đ để áp dụng mã này.`,
      };
    }

    const updatedCart = recalculateCart(cart.items, cart.merchantId, cart.merchantName, normalized);
    setCart(updatedCart);
    return {
      success: true,
      message: `Đã áp dụng mã "${normalized}" thành công (-${updatedCart.discountAmount.toLocaleString('vi-VN')}đ)!`,
    };
  };

  const removeVoucher = () => {
    try {
      localStorage.removeItem('dinego_preselected_voucher');
    } catch {}
    setCart(recalculateCart(cart.items, cart.merchantId, cart.merchantName, null));
  };

  const clearCart = () => {
    setCart(initialCart);
    localStorage.removeItem(getCartStorageKey(ownerId));
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
