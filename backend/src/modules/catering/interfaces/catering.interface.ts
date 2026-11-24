// ==============================================================================
// DineGo Backend — Catering Interfaces (State Machine, SLA & Capacity Model)
// ==============================================================================

export type EventType =
  | 'WEDDING'
  | 'DEATH_ANNIVERSARY'
  | 'HOUSEWARMING'
  | 'BIRTHDAY'
  | 'PARTY'
  | 'CORPORATE'
  | 'LONGEVITY'
  | 'OTHER';

export type DishCourse = 'APPETIZER' | 'MAIN' | 'SOUP' | 'DESSERT';

export interface FeastDish {
  id: string;
  name: string;
  course: DishCourse;
  description?: string;
  isOptional?: boolean;
  extraPrice?: number;
  isSoldOut?: boolean;
  allergens?: string;
}

export interface FeastPackage {
  id: string;
  merchantId: string;
  name: string;
  slug?: string;
  eventType: EventType;
  description?: string;
  dishes: FeastDish[];
  servingsPerTable: number; // 6 hoặc 10 người/mâm
  pricePerTable: number; // Đơn giá 1 mâm
  minTables?: number;
  maxTables?: number;
  maxTablesPerDay?: number; // Tương thích ngược
  imageUrl?: string;
  isAvailable: boolean;
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
  deliveryFee: number;
  serviceFee: number;
  equipmentFee: number;
  discountPercentage: number;
  discountAmount: number;
  totalEstimatedAmount: number;
  depositPercent: number;
  depositAmount: number;
  remainingAmount: number;
  minDepositRequired?: number;
  suggestedDeposit?: number;
}

// ------------------------------------------------------------------------------
// ENUMS PHÂN BIỆT RÕ RÀNG
// ------------------------------------------------------------------------------

/**
 * Trạng thái khả dụng của nhà hàng / khung giờ
 */
export type AvailabilityStatus =
  | 'AVAILABLE'     // Còn khả năng phục vụ
  | 'LIMITED'       // Sắp đầy công suất (>= 75%)
  | 'FULLY_BOOKED'  // Đã đầy công suất
  | 'BLOCKED'       // Tạm ngừng nhận đơn (Chủ quán chủ động khóa)
  | 'CLOSED'        // Nhà hàng không hoạt động
  | 'SOLD_OUT';     // Món ăn hoặc mâm tiệc hết hàng

/**
 * Trạng thái tiến trình của Đơn tiệc lưu động (State Machine chuẩn & đầy đủ theo yêu cầu thực tế)
 */
export type FeastBookingStatus =
  | 'PENDING_REVIEW'                  // Tiếp nhận yêu cầu, Chờ Hợp đồng kiểm tra sơ bộ
  | 'PENDING_KITCHEN_CHECK'           // Đã chuyển yêu cầu sang Bếp trực tiếp để thẩm định nguyên liệu & công suất
  | 'KITCHEN_APPROVED'                // Bếp đã xác nhận Có thể chế biến, chờ Hợp đồng xác nhận với khách
  | 'PENDING_RESTAURANT_CONFIRMATION' // (Tương thích ngược) Chờ nhà hàng xác minh
  | 'PENDING_CUSTOMER_APPROVAL'       // Chờ khách duyệt đề xuất thực đơn đổi món
  | 'PENDING_RESTAURANT_REVISION'     // Chờ nhà hàng điều chỉnh lại theo phản hồi của khách
  | 'PENDING_DEPOSIT'                 // Đã thống nhất hợp đồng, chờ khách cọc MoMo / VietQR
  | 'CONFIRMED'                       // Quán đã nhận cọc, chính thức chuyển Lệnh chế biến sang Bếp
  | 'PREPARING'                       // Bếp đang chuẩn bị nguyên liệu, sơ chế tại bếp
  | 'COOKING'                         // Bếp đang chế biến, nấu nướng món tiệc
  | 'READY_FOR_DELIVERY'              // Bếp chế biến xong, đóng gói chờ bàn giao xe vận chuyển
  | 'DELIVERING'                      // Xe tải đang vận chuyển bàn ghế & đồ ăn tới địa điểm
  | 'IN_SERVICE'                      // Đang bày cỗ & phục vụ thực khách tại tiệc
  | 'COMPLETED'                       // Tiệc hoàn tất trọn vẹn, xuất hóa đơn tổng & quyết toán
  | 'REJECTED'                        // Bị nhà hàng hoặc khách từ chối
  | 'EXPIRED'                         // Hết hạn giữ chỗ hoặc quá hạn phản hồi (SLA)
  | 'CANCELLED'                       // Đã hủy (Áp dụng chính sách hoàn cọc BR-44)
  // Legacy alias support:
  | 'REQUESTED'
  | 'APPROVED_WAITING_DEPOSIT'
  | 'DEPOSIT_PAID'
  | 'DELIVERED';

export type SupplyStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNAVAILABLE';

export interface CateringDishSupply {
  id: string;
  merchantId: string;
  dishId: string;
  dishName: string;
  course: DishCourse;
  packageNames: string[];
  supplyStatus: SupplyStatus;
  maxDailyPortions?: number; // Số suất tối đa có thể chế biến nếu xác định được
  committedPortions: number; // Số suất đã cam kết cho các đơn khác
  remainingPortions?: number; // Khả năng cung ứng còn lại
  availableDateRange?: string; // Ngày hoặc khoảng thời gian khả dụng
  outOfStockReason?: string; // Lý do thiếu nguyên liệu
  restockExpectedAt?: string; // Thời gian dự kiến bổ sung nguyên liệu
  suggestedReplacementDish?: string; // Món thay thế gợi ý
  updatedBy?: string;
  updatedAt: Date;
}

export type KitchenCheckStatus = 'PENDING' | 'APPROVED' | 'PARTIAL_SHORTAGE' | 'UNABLE_TO_SERVE';

export interface KitchenCheckRequestDto {
  bookingId: string;
  status: KitchenCheckStatus;
  notes?: string;
  proposedReplacements?: {
    originalDishName: string;
    replacementDishName: string;
    reason: string;
  }[];
}

export interface PreEventReadinessCheckDto {
  bookingId: string;
  kitchenIngredientsReady: boolean;
  kitchenPrepProgressPercent: number;
  kitchenNotes?: string;
  staffAssigned: boolean;
  equipmentReady: boolean;
  transportVehicleReady: boolean;
  contractNotes?: string;
  completedAt: Date;
  passed: boolean;
}

export interface ForecastOverloadDay {
  date: string;
  status: AvailabilityStatus;
  capacityPercent: number;
  totalBookedTables: number;
  totalHeldTables: number;
  maxTablesPerDay: number;
  isOverloaded: boolean; // >= 80%
}

export interface CateringForecastOverload {
  merchantId: string;
  threeDaysAveragePercent: number;
  sevenDaysAveragePercent: number;
  isThreeDaysOverloaded: boolean; // >= 80%
  isAllSevenDaysFullyBooked: boolean; // 7 ngày đều >= 100%
  warningMessage?: string;
  days: ForecastOverloadDay[];
}

export interface BookingTimelineEvent {
  title: string;
  description: string;
  status: FeastBookingStatus;
  timestamp: Date;
  actor: 'CUSTOMER' | 'MERCHANT' | 'SYSTEM' | 'ADMIN';
}

export interface CateringMenuProposalItem {
  dishId: string;
  dishName: string;
  course: DishCourse;
  action: 'KEEP' | 'REPLACE' | 'ADD' | 'REMOVE';
  originalDishName?: string;
  extraPrice: number;
  allergens?: string;
}

export interface CateringMenuProposalDto {
  versionNumber: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED' | 'EXPIRED';
  reason: string;
  dishes: CateringMenuProposalItem[];
  diffSummary: {
    added: string[];
    removed: string[];
    replaced: { from: string; to: string }[];
  };
  priceDeltaPerTable: number;
  newTotalAmount: number;
  expiresAt: Date;
  createdAt: Date;
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
  eventLatitude?: number;
  eventLongitude?: number;
  tableCount: number;
  guestCount: number;
  guestCountPerTable?: number;
  
  pricePerTable: number;
  tablesSubtotal: number;
  deliveryFee: number;
  serviceFee: number;
  equipmentFee: number;
  discountAmount: number;
  totalAmount: number;

  depositRate: number; // 30 - 50%
  depositAmount: number;
  depositPaid?: boolean;
  depositPaidAt?: Date;
  depositTransactionRef?: string;
  depositReceiptCode?: string;
  depositPaymentMethod?: string;
  dispatchedToKitchen?: boolean;
  dispatchedToKitchenAt?: Date;
  dispatchedBy?: string;
  remainingAmount: number;
  remainingPaidAt?: Date;
  isFullyPaid: boolean;
  status: FeastBookingStatus;

  // Giữ chỗ (Hold Slot)
  isHoldingCapacity: boolean;
  holdExpiresAt?: Date;

  // Hạn phản hồi SLA
  restaurantDeadline?: Date;
  customerDeadline?: Date;
  depositDeadline?: Date;

  // Đề xuất thực đơn
  menuProposals?: CateringMenuProposalDto[];
  activeProposal?: CateringMenuProposalDto;

  // Yêu cầu đặc biệt
  dietaryNotes?: string;
  equipmentNotes?: string;
  customDishes?: string[];
  specialNotes?: string;
  merchantNotes?: string;
  cancelReason?: string;
  cancelledBy?: string;

  // Nghiệp vụ Bếp & Kiểm tra sẵn sàng
  kitchenCheckStatus?: KitchenCheckStatus;
  kitchenNotes?: string;
  kitchenCheckedAt?: Date;
  preCheck?: PreEventReadinessCheckDto;

  // Nghiệp vụ Hoàn tiền cọc (Refund Management)
  refundStatus?: 'NONE' | 'REFUND_PENDING' | 'REFUNDED' | 'REFUND_FAILED';
  refundAmount?: number;
  refundTransactionRef?: string;
  refundNotes?: string;
  refundCompletedAt?: Date;

  timeline: BookingTimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CateringCapacityConfig {
  id?: string;
  merchantId: string;
  maxOrdersPerDay: number;
  maxTablesPerDay: number;
  maxTablesPerSlot: number;
  minNoticeHours: number;
  prepBufferHours: number;
  transitBufferHours: number;
  serviceBufferHours: number;
  cleanupBufferHours: number;
  isActive: boolean;
}

export interface CateringBlockedSlot {
  id?: string;
  merchantId: string;
  blockDate: string; // YYYY-MM-DD
  timeSlot?: string; // e.g. "10:00-14:00" hoặc null
  reason?: string;
  createdAt?: Date;
}

export interface SlotAvailability {
  timeSlot: string; // "10:00-14:00" | "17:00-21:00"
  status: AvailabilityStatus;
  maxCapacityTables: number;
  bookedTables: number;
  heldTables: number;
  remainingTables: number;
  isAvailable: boolean;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
  maxTablesPerDay: number;
  totalBookedTables: number;
  totalHeldTables: number;
  totalRemainingTables: number;
  slots: SlotAvailability[];
  isBlocked: boolean;
  blockReason?: string;
  alternativeSuggestions?: {
    recommendedDates?: string[];
    recommendedSlots?: string[];
    alternativeMerchants?: { id: string; name: string; availableTables: number }[];
  };
}

export interface CateringNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | 'NEW_BOOKING_REQUEST'
    | 'CAPACITY_VERIFIED'
    | 'MENU_PROPOSED'
    | 'PROPOSAL_ACCEPTED'
    | 'PROPOSAL_REJECTED'
    | 'BOOKING_APPROVED'
    | 'DEPOSIT_SUCCESS'
    | 'PAYMENT_REMINDER'
    | 'STATUS_CHANGE'
    | 'BOOKING_EXPIRED'
    | 'BOOKING_CANCELLED';
  bookingId: string;
  isRead: boolean;
  createdAt: Date;
}
