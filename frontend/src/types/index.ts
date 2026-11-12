// ==============================================================================
// DineGo Frontend — Core Types (Multi-Actor 1-to-1 Account Architecture)
// ==============================================================================

export type Role = 'CUSTOMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'DELIVERING'
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

export interface SavedAddress {
  id: string;
  label: string; // Nhà riêng, Văn phòng, Khác
  recipientName: string;
  phone: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  mapReferenceName?: string;
  mapVerified?: boolean;
  isDefault: boolean;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  address?: string;
  addressLat?: number;
  addressLng?: number;
  dateOfBirth?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  savedAddresses?: SavedAddress[];
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  roles: Role[];
  merchantId?: string; // 1-to-1 binding for MERCHANT role
  driverId?: string;   // 1-to-1 binding for DRIVER role
  isActive?: boolean;
  createdAt?: string;
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
  category?: string;
  categoryName?: string;
  isActive: boolean;
  isAvailable: boolean;
  toppings?: Topping[];
}

export type MerchantKycStatus = 'PENDING_APPROVAL' | 'VERIFIED' | 'REJECTED';

export interface Merchant {
  id: string;
  ownerUserId?: string;
  ownerEmail?: string;
  name: string;
  slug: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phoneNumber: string;
  ownerName?: string;
  storeFrontImage?: string;
  businessLicenseImage?: string;
  businessLicenseNumber?: string;
  foodSafetyCertNumber?: string;
  taxCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  commissionRate?: number;
  openingHours?: string;
  kycStatus?: MerchantKycStatus;
  verifiedAt?: string;
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

export interface DriverProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string;
  licensePlate: string;
  vehicleType: string;
  nationalId: string;
  driverLicenseNumber: string;
  operatingZone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  emergencyContact?: string;
  rating: number;
  completedTrips: number;
  acceptanceRate: string;
  walletBalance: number;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'SUSPENDED';
  kycStatus: 'VERIFIED' | 'PENDING_APPROVAL' | 'REJECTED';
  joinedAt: string;
}

export interface DriverShiftTrip {
  orderId: string;
  orderNumber: string;
  merchantName: string;
  deliveryAddress: string;
  recipientName: string;
  deliveryFee: number;
  netEarning: number;
  completedAt: string;
}

export interface DriverShift {
  id: string;
  shiftCode: string;
  driverId: string;
  driverName: string;
  operatingZone: string;
  vehicleType: string;
  licensePlate: string;
  startedAt: string;
  endedAt: string | null;
  status: 'ACTIVE' | 'ENDED';
  endReason?: 'MANUAL_OFFLINE' | 'LOGOUT';
  tripsCount: number;
  grossShippingEarned: number;
  netIncomeEarned: number;
  trips: DriverShiftTrip[];
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

export type DeliveryDisputeReason =
  | 'NO_ANSWER'
  | 'REFUSED_ORDER'
  | 'WRONG_ADDRESS'
  | 'UNABLE_COLLECT';

export interface DeliveryDisputeReport {
  id: string;
  reportCode: string;
  orderId: string;
  orderNumber: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  merchantName: string;
  orderTotal: number;
  compensationAmount: number;
  paymentMethod: string;
  reason: DeliveryDisputeReason;
  reasonLabel: string;
  description: string;
  callAttemptsCount: number;
  waitMinutes: number;
  evidenceImages: string[];
  gpsSnapshot?: {
    lat: number;
    lng: number;
    distanceToCustomerKm: number;
  };
  status: 'PENDING_REVIEW' | 'COMPENSATED_DRIVER' | 'REJECTED';
  adminNote?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerEmail?: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  finalTotal: number;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  recipientName: string;
  recipientPhone: string;
  customerNote?: string | null;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  driverArrivedAtStore?: boolean;
  driverArrivedAtStoreAt?: string | null;
  merchantConfirmedPickup?: boolean;
  merchantConfirmedPickupAt?: string | null;
  customerConfirmedReceipt?: boolean;
  customerConfirmedAt?: string | null;
  deliveryDispute?: DeliveryDisputeReport | null;
  createdAt: string;
  merchant: {
    id: string;
    name: string;
    address: string;
    phoneNumber: string;
    logoUrl?: string | null;
    latitude?: number;
    longitude?: number;
  };
  items: OrderItem[];
  payment?: PaymentSummary | null;
}
