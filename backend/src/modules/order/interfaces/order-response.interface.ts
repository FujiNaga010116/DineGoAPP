// ==============================================================================
// DineGo Backend — Order Response Interfaces (Phase 5.3)
// ==============================================================================

import type { OrderStatus } from '../../../common/enums/index.js';

export interface OrderItemToppingResponse {
  id: string;
  toppingId: string | null;
  toppingName: string;
  toppingPrice: number;
}

export interface OrderItemResponse {
  id: string;
  menuItemId: string | null;
  itemName: string;
  itemImage: string | null;
  basePrice: number;
  quantity: number;
  subtotal: number;
  note: string | null;
  toppings: OrderItemToppingResponse[];
}

export interface OrderMerchantSummary {
  id: string;
  name: string;
  slug: string;
  address: string;
  phoneNumber: string;
  logoUrl: string | null;
}

export interface OrderUserSummary {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
}

export interface OrderPromotionSummary {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
}

export interface OrderPaymentSummary {
  id: string;
  paymentMethod: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  transactionRef: string | null;
  paidAt: string | null;
}

export interface OrderResponse {
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
  customerNote: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  merchant: OrderMerchantSummary;
  user?: OrderUserSummary;
  promotion?: OrderPromotionSummary | null;
  payment?: OrderPaymentSummary | null;
  items: OrderItemResponse[];
}

export interface OrderListResponse {
  items: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
