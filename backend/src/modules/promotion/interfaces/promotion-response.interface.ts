// ==============================================================================
// DineGo Backend — Promotion Response Interfaces (Phase 5.2)
// ==============================================================================

export interface PromotionResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  maxUsage: number | null;
  currentUsage: number;
  maxUsagePerUser: number | null;
  scope: string;
  merchantId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherValidationResult {
  isValid: boolean;
  code: string;
  promotionId?: string;
  name?: string;
  description?: string | null;
  discountType?: string;
  discountValue?: number;
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  rejectionReason?: string;
}
