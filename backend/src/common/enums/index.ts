// ==============================================================================
// DineGo Backend Common Enums
// Phase 2 / Phase 3 / Phase 4: Shared domain enums
// Note: SQL Server stores these as NVARCHAR, domain validation is handled in code.
// ==============================================================================

export enum Role {
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum MerchantStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum DeliveryType {
  MERCHANT_SELF = 'MERCHANT_SELF',
  DINEGO_SHIPPER = 'DINEGO_SHIPPER',
  BOTH = 'BOTH',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum PromotionScope {
  GLOBAL = 'GLOBAL',
  MERCHANT = 'MERCHANT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CancelledBy {
  USER = 'USER',
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export enum PaymentMethod {
  MOMO = 'MOMO',
  MOMO_QR = 'MOMO_QR',
  MOMO_ATM = 'MOMO_ATM',
  COD = 'COD',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

