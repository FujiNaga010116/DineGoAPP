export type EventType =
  | 'WEDDING'
  | 'DEATH_ANNIVERSARY'
  | 'HOUSEWARMING'
  | 'PARTY'
  | 'OTHER';

export type DishCourse = 'APPETIZER' | 'MAIN' | 'SOUP' | 'DESSERT';

export interface FeastDish {
  id: string;
  name: string;
  course: DishCourse;
  description?: string;
  extraPrice?: number;
}

export interface FeastPackage {
  id: string;
  merchantId: string;
  name: string;
  eventType: EventType;
  description?: string;
  dishes: FeastDish[];
  servingsPerTable: number; // Thường là 6 hoặc 10 người/mâm
  pricePerTable: number; // Đơn giá 1 mâm
  maxTablesPerDay: number; // Công suất tối đa/ngày
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeastQuoteBreakdown {
  packageId: string;
  packageName: string;
  tableCount: number;
  basePricePerTable: number;
  tablesSubtotal: number;
  customDishesSurcharge: number;
  discountPercentage: number;
  discountAmount: number;
  serviceFee: number;
  totalEstimatedAmount: number;
  minDepositRequired: number; // 30% - 50%
  suggestedDeposit: number;
}

export type FeastBookingStatus =
  | 'REQUESTED'
  | 'APPROVED_WAITING_DEPOSIT'
  | 'DEPOSIT_PAID'
  | 'PREPARING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface BookingTimelineEvent {
  title: string;
  description: string;
  status: FeastBookingStatus;
  timestamp: Date;
  actor: 'CUSTOMER' | 'MERCHANT' | 'SYSTEM';
}

export interface FeastBooking {
  id: string;
  bookingCode: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  merchantId: string;
  packageId: string;
  packageName: string;
  eventType: EventType;
  eventDate: string; // YYYY-MM-DD
  eventTime: string; // HH:mm
  eventLocation: string;
  tableCount: number;
  guestCount: number;
  customDishes: string[];
  specialNotes?: string;
  totalAmount: number;
  depositRate: number; // 30 - 50%
  depositAmount: number;
  depositPaidAt?: Date;
  remainingAmount: number;
  remainingPaidAt?: Date;
  isFullyPaid: boolean;
  status: FeastBookingStatus;
  merchantNotes?: string;
  timeline: BookingTimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CateringNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'BOOKING_APPROVED' | 'DEPOSIT_SUCCESS' | 'PAYMENT_REMINDER' | 'STATUS_CHANGE';
  bookingId: string;
  isRead: boolean;
  createdAt: Date;
}

