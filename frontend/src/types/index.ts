// ==============================================================================
// DineGo Frontend — Core Types (Matching DineGo Backend Phase 0-6)
// ==============================================================================

export type Role = 'CUSTOMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'MOMO' | 'MOMO_QR' | 'MOMO_ATM' | 'COD';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  roles: Role[];
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  isAvailable: boolean;
}

export interface MenuItem {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
  categoryName?: string;
  isActive: boolean;
  isAvailable: boolean;
  toppings?: Topping[];
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  address: string;
  phoneNumber: string;
  logoUrl?: string;
  coverUrl?: string;
  rating?: number;
  reviewCount?: number;
  deliveryTimeMin?: number;
  deliveryTimeMax?: number;
  isActive: boolean;
  isOpen: boolean;
  categories?: string[];
}

export interface CartItemTopping {
  id: string;
  toppingId: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  imageUrl?: string;
  basePrice: number;
  quantity: number;
  note?: string;
  toppings: CartItemTopping[];
  subtotal: number;
}

export interface Cart {
  merchantId: string | null;
  merchantName: string | null;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  voucherCode: string | null;
  finalTotal: number;
}

export interface OrderItem {
  id: string;
  itemName: string;
  itemImage?: string | null;
  basePrice: number;
  quantity: number;
  subtotal: number;
  note?: string | null;
  toppings: {
    id: string;
    toppingName: string;
    toppingPrice: number;
  }[];
}

export interface PaymentSummary {
  id: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  transactionRef: string | null;
  paidAt: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  finalTotal: number;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  customerNote?: string | null;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  createdAt: string;
  merchant: {
    id: string;
    name: string;
    address: string;
    phoneNumber: string;
    logoUrl?: string | null;
  };
  items: OrderItem[];
  payment?: PaymentSummary | null;
}
