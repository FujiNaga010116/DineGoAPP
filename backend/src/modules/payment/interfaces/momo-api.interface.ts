// ==============================================================================
// DineGo Backend — MoMo API Interfaces (Phase 6)
// ==============================================================================

export interface MomoCreatePaymentRequest {
  partnerCode: string;
  partnerName?: string;
  storeId?: string;
  requestId: string;
  amount: number;
  orderId: string;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  lang: string;
  extraData: string;
  requestType: string;
  signature: string;
}

export interface MomoCreatePaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  signature?: string;
}
