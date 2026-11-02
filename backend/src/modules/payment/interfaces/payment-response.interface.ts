// ==============================================================================
// DineGo Backend — Payment Response Interfaces (Phase 6)
// ==============================================================================

import type { PaymentMethod, PaymentStatus } from '../../../common/enums/index.js';

export interface PaymentResponse {
  id: string;
  orderId: string;
  orderNumber?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  transactionRef: string | null;
  requestId: string;
  idempotencyKey: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMomoPaymentResponse {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
  message: string;
}

export interface PaymentListResponse {
  data: PaymentResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
