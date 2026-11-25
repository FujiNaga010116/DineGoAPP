// ==============================================================================
// DineGo Frontend — Comprehensive Merchant Catering Capacity & Booking Manager
// Fully implements Section 2, 3, 4, 5, 6, 8, 9 of Catering Booking Engine
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  DollarSign,
  Edit3,
  Eye,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  History,
  Info,
  Layers,
  Lock,
  MessageSquare,
  Minus,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Unlock,
  User,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { cateringApi } from '../../../api/client';
import { CateringDepositReceiptModal } from '../../customer/components/CateringDepositReceiptModal';
import type {
  AvailabilityStatus,
  CateringBookingStatus,
  CateringCapacityConfig,
  CateringDepositReceiptData,
  CateringDishSupply,
  CateringForecastOverload,
  CateringOrderDetails,
  KitchenCheckStatus,
  Merchant,
  PreEventReadinessCheckDto,
  SupplyStatus,
} from '../../../types';

interface MerchantCateringManagerProps {
  currentMerchant: Merchant | null;
  feastBookings: any[];
  onUpdateFeastBookings: (bookings: any[]) => void;
  onSyncCateringOrderFromMerchant?: (
    bookingId: string,
    bookingCode: string,
    action: string,
    extra?: any,
  ) => void;
  onOpenBillModal: (bill: any) => void;
  isAdminRole: boolean;
  autoOpenBookingId?: string | null;
  autoOpenAction?: 'REJECT' | 'VERIFY' | null;
  onClearAutoOpenAction?: () => void;
}

export const MerchantCateringManager: React.FC<MerchantCateringManagerProps> = ({
  currentMerchant,
  feastBookings,
  onUpdateFeastBookings,
  onSyncCateringOrderFromMerchant,
  onOpenBillModal,
  isAdminRole,
  autoOpenBookingId,
  autoOpenAction,
  onClearAutoOpenAction,
}) => {
  const [subTab, setSubTab] = useState<'bookings' | 'kitchen' | 'calendar' | 'capacity'>('bookings');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllPlatformFeasts, setShowAllPlatformFeasts] = useState(false);

  // Bếp trực tiếp & Bảng nguyên liệu món ăn
  const [dishSupplies, setDishSupplies] = useState<CateringDishSupply[]>([]);
  const [loadingSupplies, setLoadingSupplies] = useState(false);
  const [editingSupply, setEditingSupply] = useState<CateringDishSupply | null>(null);
  const [kitchenSubTab, setKitchenSubTab] = useState<'supplies' | 'queue' | 'production' | 'forecast'>('supplies');

  // Cảnh báo công suất 3 ngày & 7 ngày
  const [forecastOverload, setForecastOverload] = useState<CateringForecastOverload | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Modal Bếp xác minh
  const [kitchenCheckingBooking, setKitchenCheckingBooking] = useState<any | null>(null);
  const [kitchenCheckStatus, setKitchenCheckStatus] = useState<KitchenCheckStatus>('APPROVED');
  const [kitchenCheckNotes, setKitchenCheckNotes] = useState('');
  const [kitchenReplacementDish, setKitchenReplacementDish] = useState('');

  // Modal Kiểm tra sẵn sàng 24-48h
  const [preEventCheckingBooking, setPreEventCheckingBooking] = useState<any | null>(null);
  const [preEventKitchenReady, setPreEventKitchenReady] = useState(true);
  const [preEventPrepPercent, setPreEventPrepPercent] = useState(85);
  const [preEventStaffAssigned, setPreEventStaffAssigned] = useState(true);
  const [preEventEquipmentReady, setPreEventEquipmentReady] = useState(true);
  const [preEventVehicleReady, setPreEventVehicleReady] = useState(true);
  const [preEventNotes, setPreEventNotes] = useState('');

  // Modal Hủy đơn & Hoàn tiền cọc
  const [cancelRefundBooking, setCancelRefundBooking] = useState<any | null>(null);
  const [cancelRefundReason, setCancelRefundReason] = useState('');
  const [cancelRefundPercent, setCancelRefundPercent] = useState(100);

  // Modal Bill / Phiếu thu tiền cọc chính thức
  const [depositReceiptBooking, setDepositReceiptBooking] = useState<CateringDepositReceiptData | null>(null);

  // Thông báo Lệnh chế biến gửi sang Bếp trực tiếp (Không cần lặp lại xác nhận nhân lực)
  const [kitchenAlertToast, setKitchenAlertToast] = useState<{
    bookingCode: string;
    tableCount: number;
    packageName: string;
  } | null>(null);

  // Modals
  const [verifyingBooking, setVerifyingBooking] = useState<any | null>(null);
  const [verifyAction, setVerifyAction] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');
  const [verifyReason, setVerifyReason] = useState('');

  const [proposingBooking, setProposingBooking] = useState<any | null>(null);
  const [proposalReason, setProposalReason] = useState('');
  const [proposalPriceDelta, setProposalPriceDelta] = useState<number>(0);
  const [proposalDishes, setProposalDishes] = useState<any[]>([]);

  const [viewingAuditBooking, setViewingAuditBooking] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Capacity config state
  const [capacityConfig, setCapacityConfig] = useState<CateringCapacityConfig>({
    merchantId: currentMerchant?.id || '',
    maxOrdersPerDay: 5,
    maxTablesPerDay: 50,
    maxTablesPerSlot: 25,
    minNoticeHours: 72,
    prepBufferHours: 3.0,
    transitBufferHours: 1.0,
    serviceBufferHours: 3.0,
    cleanupBufferHours: 1.5,
    isActive: true,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState('');

  // Calendar slot blocking state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [dayAvailability, setDayAvailability] = useState<any | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState('');

  const merchantId = currentMerchant?.id || 'merchant-catering-hoang-gia';

  // Tự động mở modal thẩm định / từ chối khi điều hướng từ Bếp trực tiếp
  useEffect(() => {
    if (autoOpenBookingId && feastBookings.length > 0) {
      const cleanId = autoOpenBookingId.startsWith('ord-catering-')
        ? autoOpenBookingId.replace('ord-catering-', '')
        : autoOpenBookingId;
      const target = feastBookings.find(
        (b) => b.id === cleanId || b.bookingCode === autoOpenBookingId || b.id === autoOpenBookingId || b.bookingCode === cleanId,
      );
      if (target) {
        if (target.dispatchedToKitchen || target.status === 'CONFIRMED' || target.depositPaid) {
          // Đơn tiệc này đã được thẩm định & cọc xong & bàn giao Bếp -> Chuyển thẳng sang tab Bếp Lệnh chế biến, KHÔNG mở modal thẩm định lại!
          setSubTab('kitchen');
          setKitchenSubTab('production');
          onClearAutoOpenAction?.();
          return;
        }
        setVerifyingBooking(target);
        setVerifyAction(autoOpenAction === 'REJECT' ? 'REJECT' : 'ACCEPT');
        if (autoOpenAction === 'REJECT') {
          setVerifyReason('Nhà hàng đã kín công suất mâm hoặc nhân sự trong ngày này.');
        }
        onClearAutoOpenAction?.();
      }
    }
  }, [autoOpenBookingId, autoOpenAction, feastBookings, onClearAutoOpenAction]);

  // Lọc danh sách đơn tiệc hiển thị
  const visibleBookings = useMemo(() => {
    return feastBookings.filter((fb) => {
      const matchMerchant = isAdminRole || showAllPlatformFeasts || !fb.merchantId || fb.merchantId === currentMerchant?.id;
      if (!matchMerchant) return false;

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING_CONFIRMATION') {
          return (
            fb.status === 'PENDING_APPROVAL' ||
            fb.status === 'PENDING_RESTAURANT_CONFIRMATION' ||
            fb.status === 'REQUESTED' ||
            fb.status === 'PENDING_REVIEW' ||
            fb.status === 'KITCHEN_APPROVED'
          );
        }
        if (statusFilter === 'PENDING_KITCHEN') {
          return fb.status === 'PENDING_KITCHEN_CHECK';
        }
        if (statusFilter === 'PENDING_PROPOSAL') {
          return fb.status === 'PENDING_CUSTOMER_APPROVAL' || fb.status === 'PENDING_RESTAURANT_REVISION';
        }
        if (statusFilter === 'PENDING_DEPOSIT') {
          return (fb.status === 'APPROVED_WAITING_DEPOSIT' || fb.status === 'APPROVED' || fb.status === 'PENDING_DEPOSIT') && !fb.depositPaid;
        }
        if (statusFilter === 'CONFIRMED') {
          return fb.status === 'DEPOSIT_PAID' || fb.depositPaid || fb.status === 'CONFIRMED' || fb.status === 'PREPARING';
        }
        if (statusFilter === 'COMPLETED') return fb.status === 'COMPLETED';
        if (statusFilter === 'REJECTED_EXPIRED') return fb.status === 'REJECTED' || fb.status === 'EXPIRED' || fb.status === 'CANCELLED';
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          fb.bookingCode?.toLowerCase().includes(q) ||
          fb.customerName?.toLowerCase().includes(q) ||
          fb.customerPhone?.toLowerCase().includes(q) ||
          fb.packageName?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [feastBookings, currentMerchant, isAdminRole, showAllPlatformFeasts, statusFilter, searchQuery]);

  // Thống kê nhanh công suất hôm nay / tuần này
  const capacityStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings = feastBookings.filter(
      (b) =>
        (!b.merchantId || b.merchantId === currentMerchant?.id) &&
        b.eventDate === todayStr &&
        b.status !== 'CANCELLED' &&
        b.status !== 'REJECTED' &&
        b.status !== 'EXPIRED',
    );

    const bookedTables = todayBookings.reduce((sum, b) => sum + (b.tableCount || 0), 0);
    const maxTables = capacityConfig.maxTablesPerDay;
    const remainingTables = Math.max(0, maxTables - bookedTables);
    const utilizationRate = Math.min(100, Math.round((bookedTables / maxTables) * 100));

    let utilizationStatus: AvailabilityStatus = 'AVAILABLE';
    if (utilizationRate >= 100) utilizationStatus = 'FULLY_BOOKED';
    else if (utilizationRate >= 75) utilizationStatus = 'LIMITED';

    return {
      todayBookedTables: bookedTables,
      maxTables,
      remainingTables,
      utilizationRate,
      utilizationStatus,
      pendingApprovalCount: feastBookings.filter(
        (b) => (!b.merchantId || b.merchantId === currentMerchant?.id) && (b.status === 'PENDING_APPROVAL' || b.status === 'PENDING_RESTAURANT_CONFIRMATION' || b.status === 'REQUESTED'),
      ).length,
    };
  }, [feastBookings, currentMerchant, capacityConfig]);

  // Tải cấu hình công suất ban đầu từ API
  useEffect(() => {
    if (!merchantId) return;
    cateringApi.getCapacityConfig(merchantId).then((res) => {
      if (res) setCapacityConfig(res);
    });
  }, [merchantId]);

  // Tải tình trạng slot ngày được chọn
  useEffect(() => {
    if (!merchantId || !selectedCalendarDate) return;
    setLoadingAvailability(true);
    cateringApi.getMerchantAvailability(merchantId, selectedCalendarDate, 10).then((res) => {
      setDayAvailability(res);
      setLoadingAvailability(false);
    });
  }, [merchantId, selectedCalendarDate]);

  // Tải bảng tình trạng nguyên liệu món ăn cho Bếp
  const refreshDishSupplies = () => {
    if (!merchantId) return;
    setLoadingSupplies(true);
    cateringApi.getDishSupplies(merchantId).then((res) => {
      if (res && Array.isArray(res)) setDishSupplies(res);
      setLoadingSupplies(false);
    });
  };

  // Tải cảnh báo công suất 3 ngày & 7 ngày
  const refreshForecast = () => {
    if (!merchantId) return;
    setLoadingForecast(true);
    cateringApi.getForecastOverload(merchantId).then((res) => {
      if (res) setForecastOverload(res);
      setLoadingForecast(false);
    });
  };

  useEffect(() => {
    refreshDishSupplies();
    refreshForecast();
  }, [merchantId]);

  // Hợp đồng chuyển yêu cầu xác minh sang Bếp trực tiếp (SLA 4h)
  const handleRequestKitchenCheck = async (booking: any) => {
    const nowIso = new Date().toISOString();
    const deadlineIso = new Date(Date.now() + 4 * 3600000).toISOString();
    onUpdateFeastBookings(
      feastBookings.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              status: 'PENDING_KITCHEN_CHECK',
              bookingStatus: 'PENDING_KITCHEN_CHECK',
              kitchenCheckStatus: 'PENDING',
              restaurantDeadline: deadlineIso,
            }
          : b,
      ),
    );
    void cateringApi.requestKitchenCheck(booking.id);
  };

  // Bếp phản hồi thẩm định năng lực
  const handleConfirmKitchenCheck = async () => {
    if (!kitchenCheckingBooking) return;
    const nowIso = new Date().toISOString();

    if (kitchenCheckStatus === 'APPROVED') {
      onUpdateFeastBookings(
        feastBookings.map((b) =>
          b.id === kitchenCheckingBooking.id
            ? {
                ...b,
                status: 'KITCHEN_APPROVED',
                bookingStatus: 'KITCHEN_APPROVED',
                kitchenCheckStatus: 'APPROVED',
                kitchenNotes: kitchenCheckNotes || 'Bếp đã xác nhận Có thể chế biến (Đủ nguyên liệu & công suất).',
              }
            : b,
        ),
      );
      void cateringApi.respondKitchenCheck(kitchenCheckingBooking.id, {
        status: 'APPROVED',
        notes: kitchenCheckNotes || 'Có thể chế biến',
      });
      setKitchenCheckingBooking(null);
    } else if (kitchenCheckStatus === 'PARTIAL_SHORTAGE') {
      if (!kitchenCheckNotes.trim() && !kitchenReplacementDish.trim()) {
        alert('Vui lòng nhập ghi chú hoặc đề xuất món thay thế khi thiếu nguyên liệu!');
        return;
      }
      onUpdateFeastBookings(
        feastBookings.map((b) =>
          b.id === kitchenCheckingBooking.id
            ? {
                ...b,
                status: 'PENDING_RESTAURANT_REVISION',
                bookingStatus: 'PENDING_RESTAURANT_REVISION',
                kitchenCheckStatus: 'PARTIAL_SHORTAGE',
                kitchenNotes: kitchenCheckNotes || 'Bếp báo thiếu nguyên liệu, đề xuất đổi món',
              }
            : b,
        ),
      );
      void cateringApi.respondKitchenCheck(kitchenCheckingBooking.id, {
        status: 'PARTIAL_SHORTAGE',
        notes: kitchenCheckNotes,
        proposedReplacements: kitchenReplacementDish
          ? [{ originalDishName: 'Món thiếu', replacementDishName: kitchenReplacementDish, reason: kitchenCheckNotes }]
          : undefined,
      });
      setKitchenCheckingBooking(null);
    } else {
      // UNABLE_TO_SERVE
      if (!kitchenCheckNotes.trim()) {
        alert('Bắt buộc nhập lý do không thể chế biến (như thiếu nguyên liệu, hết món hoặc quá tải công suất)!');
        return;
      }
      onUpdateFeastBookings(
        feastBookings.map((b) =>
          b.id === kitchenCheckingBooking.id
            ? {
                ...b,
                status: 'REJECTED',
                bookingStatus: 'REJECTED',
                kitchenCheckStatus: 'UNABLE_TO_SERVE',
                cancelReason: kitchenCheckNotes || 'Bếp không đủ khả năng đáp ứng công suất hoặc thực đơn vào thời gian này.',
              }
            : b,
        ),
      );
      void cateringApi.respondKitchenCheck(kitchenCheckingBooking.id, {
        status: 'UNABLE_TO_SERVE',
        notes: kitchenCheckNotes,
      });
      setKitchenCheckingBooking(null);
    }
  };

  // Bếp cập nhật tiến độ chế biến (PREPARING -> COOKING -> READY_FOR_DELIVERY)
  const handleUpdateKitchenProgress = async (
    booking: any,
    nextProgress: 'PREPARING' | 'COOKING' | 'READY_FOR_DELIVERY',
  ) => {
    onUpdateFeastBookings(
      feastBookings.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              status: nextProgress,
              bookingStatus: nextProgress,
            }
          : b,
      ),
    );
    void cateringApi.updateKitchenProgress(booking.id, { progressStatus: nextProgress });
  };

  // Lưu kiểm tra sẵn sàng trước 24-48h
  const handlePreEventCheckSubmit = async () => {
    if (!preEventCheckingBooking) return;
    const passed = preEventKitchenReady && preEventStaffAssigned && preEventEquipmentReady && preEventVehicleReady;
    const checkData = {
      bookingId: preEventCheckingBooking.id,
      kitchenIngredientsReady: preEventKitchenReady,
      kitchenPrepProgressPercent: preEventPrepPercent,
      kitchenNotes: preEventNotes,
      staffAssigned: preEventStaffAssigned,
      equipmentReady: preEventEquipmentReady,
      transportVehicleReady: preEventVehicleReady,
      contractNotes: preEventNotes,
    };
    onUpdateFeastBookings(
      feastBookings.map((b) =>
        b.id === preEventCheckingBooking.id
          ? {
              ...b,
              preCheck: { ...checkData, completedAt: new Date().toISOString(), passed },
            }
          : b,
      ),
    );
    void cateringApi.preEventCheck(preEventCheckingBooking.id, checkData);
    setPreEventCheckingBooking(null);
  };

  // Hủy đơn & Hoàn tiền cọc chính thức
  const handleCancelRefundSubmit = async () => {
    if (!cancelRefundBooking || !cancelRefundReason.trim()) return;
    const nowIso = new Date().toISOString();
    const refundAmt = Math.round(((cancelRefundBooking.depositAmount || 0) * cancelRefundPercent) / 100);

    const updatedBookings = feastBookings.map((b) =>
      b.id === cancelRefundBooking.id
        ? {
            ...b,
            status: 'CANCELLED',
            bookingStatus: 'CANCELLED',
            cancelReason: cancelRefundReason,
            refundStatus: 'REFUNDED',
            refundAmount: refundAmt,
            refundTransactionRef: `REFUND-MOMO-${Date.now().toString().slice(-6)}`,
            refundCompletedAt: nowIso,
          }
        : b,
    );
    onUpdateFeastBookings(updatedBookings);

    try {
      const noticePayload = {
        bookingId: cancelRefundBooking.id,
        bookingCode: cancelRefundBooking.bookingCode,
        merchantName: cancelRefundBooking.merchantName || currentMerchant?.name || 'Nhà hàng tiệc DineGo',
        reason: cancelRefundReason,
        eventDate: cancelRefundBooking.eventDate,
        refundAmount: refundAmt,
        refundStatus: 'REFUNDED',
        timestamp: nowIso,
      };
      localStorage.setItem('dinego_customer_rejection_notice', JSON.stringify(noticePayload));
      const bc = new BroadcastChannel('dinego_customer_notices_sync');
      bc.postMessage(noticePayload);
      bc.close();
    } catch {}

    onSyncCateringOrderFromMerchant?.(cancelRefundBooking.id, cancelRefundBooking.bookingCode, 'REJECTED', {
      reason: cancelRefundReason,
      refundAmount: refundAmt,
      refundStatus: 'REFUNDED',
    });

    void cateringApi.cancelAndRefundBooking(cancelRefundBooking.id, {
      reason: cancelRefundReason,
      processRefund: true,
      refundPercentage: cancelRefundPercent,
    });

    setCancelRefundBooking(null);
  };

  // Mở Hóa đơn / Phiếu thu tiền cọc chính thức
  const handleOpenDepositReceipt = (b: any) => {
    const receiptData: CateringDepositReceiptData = {
      receiptCode: b.depositReceiptCode || `REC-COC-${b.bookingCode}`,
      bookingCode: b.bookingCode,
      orderId: b.id,
      merchantName: currentMerchant?.name || 'Nhà hàng Tiệc Lưu Động DineGo',
      merchantPhone: (currentMerchant as any)?.phone || currentMerchant?.phoneNumber || '',
      merchantAddress: currentMerchant?.address || '',
      customerName: b.customerName || 'Quý khách hàng',
      customerPhone: b.customerPhone || '',
      customerEmail: b.customerEmail || '',
      eventAddress: b.eventLocation || b.eventAddress || b.address || '',
      eventDate: b.eventDate,
      eventTime: b.eventTime,
      partyTypeTitle: b.partyTypeTitle || 'Tiệc lưu động',
      packageName: b.packageName || 'Gói tiệc tiêu chuẩn',
      tableCount: b.tableCount,
      guestCountPerTable: b.guestCountPerTable || 10,
      totalEstimatedAmount: b.totalAmount || (b.subtotal || 0),
      depositRate: b.depositRate || 30,
      depositAmount: b.depositAmount || Math.round((b.totalAmount || 0) * 0.3),
      remainingAmount: b.remainingAmount || Math.round((b.totalAmount || 0) * 0.7),
      paymentMethod: b.depositPaymentMethod || 'Ví MoMo / Chuyển khoản VietQR',
      transactionRef: b.depositTransactionRef || `MOMO-${b.bookingCode}`,
      paidAt: b.depositPaidAt || b.createdAt || new Date().toISOString(),
      dispatchedToKitchen: Boolean(
        b.dispatchedToKitchen ||
        ['CONFIRMED', 'PREPARING', 'COOKING', 'READY_FOR_DELIVERY', 'DELIVERING', 'IN_SERVICE', 'COMPLETED'].includes(b.status),
      ),
    };
    setDepositReceiptBooking(receiptData);
  };

  // Hợp đồng xác nhận tiền cọc thành công & xuất Bill cọc & chuyển lệnh cho Bếp
  const handleConfirmDepositAndDispatch = async (b: any, dispatchNow = true) => {
    try {
      await cateringApi.confirmDeposit(b.id, {
        paymentMethod: 'Chuyển khoản VietQR / MoMo',
        dispatchToKitchen: dispatchNow,
      });
      const nowIso = new Date().toISOString();
      const recCode = `REC-COC-${b.bookingCode}`;
      const updated = feastBookings.map((item) =>
        item.id === b.id
          ? {
              ...item,
              status: 'CONFIRMED',
              bookingStatus: 'CONFIRMED',
              depositPaid: true,
              depositPaidAt: nowIso,
              depositReceiptCode: recCode,
              depositPaymentMethod: 'Chuyển khoản VietQR / MoMo',
              dispatchedToKitchen: dispatchNow,
              dispatchedToKitchenAt: dispatchNow ? nowIso : undefined,
              preCheck: {
                passed: true,
                completedAt: nowIso,
                staffAssigned: true,
                equipmentReady: true,
                transportVehicleReady: true,
                kitchenIngredientsReady: true,
                contractNotes: 'Nhân lực, trang thiết bị và nguyên liệu đã sẵn sàng tự động sau khi nhận cọc.',
              },
            }
          : item,
      );
      onUpdateFeastBookings(updated);

      // Tạo thông báo Lệnh chế biến gửi thẳng đến Bếp trực tiếp
      const kitchenNotice = {
        type: 'NEW_KITCHEN_ORDER',
        id: `notice-kitchen-${b.id}-${Date.now()}`,
        bookingId: b.id,
        bookingCode: b.bookingCode,
        packageName: b.packageName,
        tableCount: b.tableCount,
        dishes: b.dishes,
        eventDate: b.eventDate,
        eventTime: b.eventTime,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        address: b.address || b.eventAddress,
        dietaryNotes: b.dietaryNotes,
        timestamp: nowIso,
      };

      try {
        localStorage.setItem('dinego_kitchen_dispatch_notice', JSON.stringify(kitchenNotice));
        localStorage.setItem('dinego_feast_bookings', JSON.stringify(updated));
        if (typeof BroadcastChannel !== 'undefined') {
          const kitchenCh = new BroadcastChannel('dinego_kitchen_sync');
          kitchenCh.postMessage(JSON.stringify(kitchenNotice));
          kitchenCh.close();
          const feastCh = new BroadcastChannel('dinego_feasts_sync');
          feastCh.postMessage(JSON.stringify(updated));
          feastCh.close();
        }
      } catch {}

      setKitchenAlertToast({
        bookingCode: b.bookingCode,
        tableCount: b.tableCount,
        packageName: b.packageName || 'Gói tiệc tiêu chuẩn',
      });

      onSyncCateringOrderFromMerchant?.(b.id, b.bookingCode, 'CONFIRM_DEPOSIT', {
        confirmedAt: nowIso,
        depositReceiptCode: recCode,
        depositPaid: true,
      });
      handleOpenDepositReceipt({
        ...b,
        status: 'CONFIRMED',
        depositPaid: true,
        depositPaidAt: nowIso,
        depositReceiptCode: recCode,
        dispatchedToKitchen: dispatchNow,
      });
    } catch (err: any) {
      alert('Lỗi khi xác nhận tiền cọc: ' + (err.message || 'Thao tác thất bại'));
    }
  };

  // Bàn giao lệnh chế biến cho Bếp trực tiếp
  const handleDispatchToKitchen = async (b: any) => {
    try {
      await cateringApi.dispatchToKitchen(b.id);
      const nowIso = new Date().toISOString();
      const updated = feastBookings.map((item) =>
        item.id === b.id
          ? {
              ...item,
              dispatchedToKitchen: true,
              dispatchedToKitchenAt: nowIso,
              status: 'CONFIRMED',
              bookingStatus: 'CONFIRMED',
            }
          : item,
      );
      onUpdateFeastBookings(updated);
      try {
        localStorage.setItem('dinego_feast_bookings', JSON.stringify(updated));
        if (typeof BroadcastChannel !== 'undefined') {
          const feastCh = new BroadcastChannel('dinego_feasts_sync');
          feastCh.postMessage(JSON.stringify(updated));
          feastCh.close();
        }
      } catch {}
      onSyncCateringOrderFromMerchant?.(b.id, b.bookingCode, 'CONFIRM_DEPOSIT', {
        confirmedAt: nowIso,
        depositPaid: true,
      });
      alert(`Đã bàn giao Lệnh chế biến cho đơn #${b.bookingCode} sang Bếp trực tiếp thành công! Bếp có thể bắt đầu sơ chế và nấu.`);
    } catch (err: any) {
      alert('Lỗi bàn giao bếp: ' + (err.message || 'Thao tác thất bại'));
    }
  };

  // Lưu tình trạng nguyên liệu món ăn
  const handleSaveDishSupplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupply) return;
    await cateringApi.updateDishSupply(merchantId, editingSupply.dishId, editingSupply);
    setDishSupplies((prev) =>
      prev.map((s) => (s.dishId === editingSupply.dishId ? { ...s, ...editingSupply } : s)),
    );
    setEditingSupply(null);
  };

  // Xử lý lưu cấu hình công suất
  const handleSaveCapacityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await cateringApi.updateCapacityConfig(merchantId, capacityConfig);
      if (res) setCapacityConfig(res);
      setConfigNotice('✓ Đã cập nhật cấu hình công suất và thời gian đệm phục vụ thành công!');
      setTimeout(() => setConfigNotice(''), 4000);
    } catch {
      setConfigNotice('Đã lưu cấu hình bộ nhớ local.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Khóa / Mở slot lịch
  const handleToggleBlock = async (timeSlot?: string, isBlocked = true) => {
    await cateringApi.toggleBlockSlot(merchantId, {
      date: selectedCalendarDate,
      timeSlot,
      isBlocked,
      reason: blockReasonInput || 'Chủ quán chủ động khóa lịch',
    });
    setBlockReasonInput('');
    // Refresh availability
    const res = await cateringApi.getMerchantAvailability(merchantId, selectedCalendarDate, 10);
    if (res) setDayAvailability(res);
  };

  // Xác minh năng lực phục vụ (Accept / Reject)
  const handleConfirmVerification = async () => {
    if (!verifyingBooking) return;
    const nowIso = new Date().toISOString();

    if (verifyAction === 'ACCEPT') {
      const depositRate = verifyingBooking.depositRate || 30;
      const depositAmt = verifyingBooking.depositAmount || Math.round((verifyingBooking.totalAmount || 0) * (depositRate / 100));
      const updatedBookings = feastBookings.map((b) =>
        b.id === verifyingBooking.id
          ? {
              ...b,
              status: 'APPROVED',
              bookingStatus: 'PENDING_DEPOSIT',
              depositPaid: false,
              depositDeadline: new Date(Date.now() + 24 * 3600000).toISOString(),
              merchantNotes: verifyReason || 'Nhà hàng đã xác minh đủ khả năng phục vụ.',
            }
          : b,
      );
      onUpdateFeastBookings(updatedBookings);

      // Tạo thông báo xác nhận đơn & mã QR chuyển tiền cọc cho khách hàng
      const approvalNotice = {
        type: 'FEAST_APPROVED_PAY_DEPOSIT',
        id: `notice-approval-${verifyingBooking.id}-${Date.now()}`,
        bookingId: verifyingBooking.id,
        bookingCode: verifyingBooking.bookingCode,
        orderId: `ord-catering-${verifyingBooking.id}`,
        customerId: verifyingBooking.customerId,
        customerPhone: verifyingBooking.customerPhone,
        merchantName: currentMerchant?.name || verifyingBooking.merchantName || 'Nhà hàng Tiệc DineGo Catering',
        merchantPhone: (currentMerchant as any)?.phone || currentMerchant?.phoneNumber || '',
        packageName: verifyingBooking.packageName,
        tableCount: verifyingBooking.tableCount,
        totalAmount: verifyingBooking.totalAmount || 0,
        depositAmount: depositAmt,
        depositRate: depositRate,
        eventDate: verifyingBooking.eventDate,
        eventTime: verifyingBooking.eventTime,
        timestamp: nowIso,
        isDismissed: false,
      };

      try {
        localStorage.setItem('dinego_customer_approval_notice', JSON.stringify(approvalNotice));
        localStorage.setItem('dinego_feast_bookings', JSON.stringify(updatedBookings));
        if (typeof BroadcastChannel !== 'undefined') {
          const noticeCh = new BroadcastChannel('dinego_customer_notices_sync');
          noticeCh.postMessage(JSON.stringify(approvalNotice));
          noticeCh.close();
          const feastCh = new BroadcastChannel('dinego_feasts_sync');
          feastCh.postMessage(JSON.stringify(updatedBookings));
          feastCh.close();
        }
      } catch {}

      onSyncCateringOrderFromMerchant?.(verifyingBooking.id, verifyingBooking.bookingCode, 'APPROVED', {
        confirmedAt: nowIso,
        merchantNotes: verifyReason,
        depositAmount: depositAmt,
        depositRate: depositRate,
      });
      void cateringApi.verifyCapacity(verifyingBooking.id, {
        action: 'ACCEPT',
        reason: verifyReason,
      });
    } else {
      const finalReason = verifyReason.trim() || 'Nhà hàng không đủ công suất hoặc nguyên liệu phục vụ vào thời gian này.';
      const updatedBookings = feastBookings.map((b) =>
        b.id === verifyingBooking.id
          ? {
              ...b,
              status: 'REJECTED',
              bookingStatus: 'REJECTED',
              cancelReason: finalReason,
              rejectedAt: nowIso,
            }
          : b,
      );
      onUpdateFeastBookings(updatedBookings);
      try {
        localStorage.setItem('dinego_feast_bookings', JSON.stringify(updatedBookings));
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('dinego_feasts_sync');
          ch.postMessage(JSON.stringify(updatedBookings));
          ch.close();
        }
      } catch {}

      onSyncCateringOrderFromMerchant?.(verifyingBooking.id, verifyingBooking.bookingCode, 'REJECTED', {
        reason: finalReason,
      });
      void cateringApi.verifyCapacity(verifyingBooking.id, {
        action: 'REJECT',
        reason: finalReason,
      });

      // Tạo thông báo nổi bật cho khách hàng (Customer Rejection Notice)
      const customerNotice = {
        id: `notice-${verifyingBooking.id}-${Date.now()}`,
        bookingId: verifyingBooking.id,
        bookingCode: verifyingBooking.bookingCode,
        customerId: verifyingBooking.customerId,
        customerPhone: verifyingBooking.customerPhone,
        merchantName: currentMerchant?.name || verifyingBooking.merchantName || 'Nhà hàng DineGo',
        packageName: verifyingBooking.packageName,
        tableCount: verifyingBooking.tableCount,
        eventDate: verifyingBooking.eventDate,
        eventTime: verifyingBooking.eventTime,
        reason: finalReason,
        timestamp: nowIso,
        isDismissed: false,
      };
      try {
        localStorage.setItem('dinego_customer_rejection_notice', JSON.stringify(customerNotice));
        if (typeof BroadcastChannel !== 'undefined') {
          const noticeCh = new BroadcastChannel('dinego_customer_notices_sync');
          noticeCh.postMessage(JSON.stringify(customerNotice));
          noticeCh.close();
        }
      } catch {}
    }

    setVerifyingBooking(null);
    setVerifyReason('');
  };

  // Mở modal đề xuất đổi thực đơn
  const handleOpenProposalModal = (booking: any) => {
    setProposingBooking(booking);
    setProposalReason('');
    setProposalPriceDelta(0);
    // Danh sách món từ booking hoặc gói cỗ
    const currentDishes = booking.dishes || [
      'Súp Gà Ngô Non Hải Sâm',
      'Gỏi Tôm Thịt Ngó Sen',
      'Gà Ta Hấp Lá Chanh',
      'Tôm Sú Hấp Nước Dừa',
      'Bò Úc Sốt Tiêu Đen Bánh Bao',
      'Cá Tầm Nướng Muối Ớt',
      'Xôi Gấc Song Hỷ',
      'Canh Măng Nấu Sườn Non',
      'Chè Hạt Sen Long Nhãn',
    ];
    setProposalDishes(
      currentDishes.map((name: string, idx: number) => ({
        dishId: `dish-${idx + 1}`,
        dishName: name,
        course: idx === 0 ? 'SOUP' : idx === currentDishes.length - 1 ? 'DESSERT' : 'MAIN',
        action: 'KEEP',
        originalDishName: name,
        extraPrice: 0,
      })),
    );
  };

  // Gửi đề xuất đổi thực đơn
  const handleSubmitProposal = async () => {
    if (!proposingBooking || !proposalReason.trim()) return;

    const diffAdded = proposalDishes.filter((d) => d.action === 'ADD').map((d) => d.dishName);
    const diffRemoved = proposalDishes.filter((d) => d.action === 'REMOVE').map((d) => d.dishName);
    const diffReplaced = proposalDishes
      .filter((d) => d.action === 'REPLACE')
      .map((d) => ({ from: d.originalDishName || '', to: d.dishName }));

    const proposalObj = {
      versionNumber: (proposingBooking.menuProposals?.length || 0) + 1,
      status: 'PROPOSED',
      reason: proposalReason,
      dishes: proposalDishes,
      diffSummary: { added: diffAdded, removed: diffRemoved, replaced: diffReplaced },
      priceDeltaPerTable: proposalPriceDelta,
      newTotalAmount: proposingBooking.totalAmount + proposalPriceDelta * proposingBooking.tableCount,
      expiresAt: new Date(Date.now() + 12 * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    onUpdateFeastBookings(
      feastBookings.map((b) =>
        b.id === proposingBooking.id
          ? {
              ...b,
              status: 'PENDING_APPROVAL',
              bookingStatus: 'PENDING_CUSTOMER_APPROVAL',
              customerDeadline: proposalObj.expiresAt,
              activeProposal: proposalObj,
              menuProposals: [...(b.menuProposals || []), proposalObj],
            }
          : b,
      ),
    );

    void cateringApi.proposeMenu(proposingBooking.id, {
      reason: proposalReason,
      dishes: proposalDishes,
      priceDeltaPerTable: proposalPriceDelta,
    });

    setProposingBooking(null);
  };

  // Mở lịch sử audit
  const handleOpenAudit = async (booking: any) => {
    setViewingAuditBooking(booking);
    setLoadingAudit(true);
    const logs = await cateringApi.getBookingAuditHistory(booking.id);
    setAuditLogs(logs || []);
    setLoadingAudit(false);
  };

  // Helper build bill data
  const buildFeastBillData = (fb: any, billCode: string, completedAt: string) => {
    const depositPercent = fb.depositPercent || 30;
    const totalAmount = fb.totalAmount || 0;
    const depositAmount = fb.depositAmount || Math.round((totalAmount * depositPercent) / 100);
    const remainingAmount = fb.remainingAmount ?? (totalAmount - depositAmount);

    return {
      billCode,
      bookingCode: fb.bookingCode,
      merchantName: fb.merchantName || currentMerchant?.name || 'DineGo Catering Kitchen',
      customerName: fb.customerName,
      customerPhone: fb.customerPhone,
      eventAddress: fb.address || fb.eventAddress || 'Tại điểm tổ chức tiệc',
      partyTypeTitle: fb.partyTypeTitle || 'Tiệc lưu động trọn gói',
      packageName: fb.packageName,
      tableCount: fb.tableCount,
      guestCountPerTable: fb.guestCountPerTable || 10,
      eventDate: fb.eventDate,
      eventTime: fb.eventTime,
      dishes: fb.dishes || [],
      customNote: fb.note || fb.customNote,
      subtotal: totalAmount,
      discountAmount: fb.discountAmount || 0,
      totalAmount,
      depositPercent: depositPercent as 30 | 50,
      depositAmount,
      remainingAmount,
      completedAt,
      issuedFor: 'MERCHANT' as const,
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* THÔNG BÁO BÀN GIAO LỆNH CHẾ BIẾN CHO BẾP TRỰC TIẾP */}
      {kitchenAlertToast && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '2px solid #10B981',
            borderRadius: 14,
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: '#059669',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Flame size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#065F46' }}>
                🔔 Đã giao Lệnh chế biến cho Bếp trực tiếp: Đơn tiệc #{kitchenAlertToast.bookingCode} ({kitchenAlertToast.tableCount} mâm)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: 2 }}>
                Đã nhận cọc &amp; thẩm định năng lực thành công. Lệnh chế biến chính thức đã chuyển sang Bếp để bắt đầu sơ chế &amp; nấu nướng, không cần lặp lại xác nhận nhân lực!
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setSubTab('kitchen');
                setKitchenSubTab('production');
                setKitchenAlertToast(null);
              }}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                background: '#059669',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              👨‍🍳 Xem tại Bếp trực tiếp
            </button>
            <button
              type="button"
              onClick={() => setKitchenAlertToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#065F46',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 1. CAPACITY OVERVIEW BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 14,
          padding: '20px 24px',
          color: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 10px', borderRadius: 999 }}>
                Hệ thống Chống Quá Tải Tiệc
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                Hôm nay: {new Date().toLocaleDateString('vi-VN')}
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '8px 0 4px', color: '#F8FAFC' }}>
              Công suất phục vụ: {capacityStats.todayBookedTables} / {capacityStats.maxTables} mâm ({capacityStats.utilizationRate}%)
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0 }}>
              {capacityStats.remainingTables > 0
                ? `Còn khả năng tiếp nhận thêm tối đa ${capacityStats.remainingTables} mâm tiệc cho các khung giờ hôm nay.`
                : 'Đã đạt 100% công suất nhà bếp. Hệ thống tự động chuyển sang trạng thái HẾT CHỖ để tránh quá tải.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Đơn chờ duyệt năng lực</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: capacityStats.pendingApprovalCount > 0 ? '#F59E0B' : '#10B981' }}>
                {capacityStats.pendingApprovalCount} đơn
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSubTab('capacity')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <Settings size={14} /> Cấu hình công suất
            </button>
          </div>
        </div>

        {/* Utilization Bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700, marginBottom: 6, color: '#CBD5E1' }}>
            <span>Mức độ tải nhà bếp</span>
            <span>
              {capacityStats.utilizationStatus === 'AVAILABLE' && '🟢 Đang an toàn (< 75%)'}
              {capacityStats.utilizationStatus === 'LIMITED' && '🟡 Sắp đầy công suất (LIMITED)'}
              {capacityStats.utilizationStatus === 'FULLY_BOOKED' && '🔴 Đã đầy công suất (FULLY BOOKED)'}
            </span>
          </div>
          <div style={{ width: '100%', height: 8, borderRadius: 999, background: 'rgba(255, 255, 255, 0.15)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${capacityStats.utilizationRate}%`,
                height: '100%',
                borderRadius: 999,
                background:
                  capacityStats.utilizationRate >= 100
                    ? '#EF4444'
                    : capacityStats.utilizationRate >= 75
                    ? '#F59E0B'
                    : '#10B981',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 10, flexWrap: 'wrap' }}>
        {[
          { id: 'bookings' as const, label: `Hợp đồng Đặt tiệc (${visibleBookings.length})`, icon: <FileText size={16} /> },
          { id: 'kitchen' as const, label: `Bếp trực tiếp & Nguyên liệu (${dishSupplies.length})`, icon: <ChefHat size={16} /> },
          { id: 'calendar' as const, label: 'Lịch công suất & Cảnh báo quá tải', icon: <Calendar size={16} /> },
          { id: 'capacity' as const, label: 'Cấu hình công suất & Vùng đệm', icon: <Settings size={16} /> },
        ].map((t) => {
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 8,
                fontSize: '0.86rem',
                fontWeight: active ? 800 : 600,
                background: active ? '#00B14F' : '#F8FAFC',
                color: active ? '#FFFFFF' : '#475569',
                border: active ? '1px solid #00B14F' : '1px solid #E2E8F0',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: BOOKINGS MANAGEMENT */}
      {subTab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'PENDING_CONFIRMATION', label: 'Chờ thẩm định năng lực' },
                { id: 'PENDING_KITCHEN', label: 'Chờ Bếp duyệt (4h)' },
                { id: 'PENDING_PROPOSAL', label: 'Đang thương lượng món' },
                { id: 'PENDING_DEPOSIT', label: 'Chờ khách cọc' },
                { id: 'CONFIRMED', label: 'Đã nhận cọc / Chuẩn bị' },
                { id: 'COMPLETED', label: 'Đã hoàn tất' },
                { id: 'REJECTED_EXPIRED', label: 'Từ chối / Hết hạn' },
              ].map((f) => {
                const active = statusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: active ? '#ECFDF5' : '#FFFFFF',
                      color: active ? '#00B14F' : '#64748B',
                      border: active ? '1.5px solid #00B14F' : '1px solid #CBD5E1',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Tìm theo mã đơn, tên khách..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '7px 12px 7px 32px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    width: 210,
                  }}
                />
              </div>

              {!isAdminRole && (
                <button
                  type="button"
                  onClick={() => setShowAllPlatformFeasts((prev) => !prev)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: showAllPlatformFeasts ? '#EFF6FF' : '#F8FAFC',
                    color: showAllPlatformFeasts ? '#1D4ED8' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  {showAllPlatformFeasts ? 'Chỉ xem quán này' : 'Xem toàn sàn'}
                </button>
              )}
            </div>
          </div>

          {/* Bookings Table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Mã hợp đồng</th>
                    <th style={{ padding: '12px 16px' }}>Gói tiệc &amp; Quy mô</th>
                    <th style={{ padding: '12px 16px' }}>Khách &amp; Điểm tổ chức</th>
                    <th style={{ padding: '12px 16px' }}>Thời gian &amp; Hạn SLA</th>
                    <th style={{ padding: '12px 16px' }}>Giá trị &amp; Cọc</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px 18px', textAlign: 'center', color: '#64748B' }}>
                        Không tìm thấy hợp đồng đặt tiệc nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    visibleBookings.map((fb) => {
                      const isKitchenCheckPending = fb.status === 'PENDING_KITCHEN_CHECK';
                      const isKitchenApproved = fb.kitchenCheckStatus === 'APPROVED' || fb.status === 'KITCHEN_APPROVED';
                      const isNewBooking =
                        (fb.status === 'PENDING_APPROVAL' ||
                          fb.status === 'PENDING_RESTAURANT_CONFIRMATION' ||
                          fb.status === 'REQUESTED' ||
                          fb.status === 'PENDING_REVIEW') &&
                        !isKitchenApproved &&
                        !isKitchenCheckPending;
                      const isPendingConfirm = isNewBooking || isKitchenCheckPending || isKitchenApproved;
                      const isCustomerApproving = fb.status === 'PENDING_CUSTOMER_APPROVAL' || fb.activeProposal?.status === 'PROPOSED';
                      const isDepositWaiting = (fb.status === 'APPROVED_WAITING_DEPOSIT' || fb.status === 'APPROVED' || fb.status === 'PENDING_DEPOSIT') && !fb.depositPaid;
                      const isConfirmed = fb.depositPaid || fb.status === 'DEPOSIT_PAID' || fb.status === 'CONFIRMED' || fb.status === 'PREPARING';
                      const isCompleted = fb.status === 'COMPLETED';
                      const isRejected = fb.status === 'REJECTED' || fb.status === 'CANCELLED' || fb.status === 'EXPIRED';

                      return (
                        <tr key={fb.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>
                            <div>#{fb.bookingCode}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: 2 }}>
                              {new Date(fb.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{fb.packageName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                              {fb.tableCount} mâm • ~{fb.tableCount * (fb.guestCountPerTable || 10)} khách
                            </div>
                            {fb.dietaryNotes && (
                              <div style={{ fontSize: '0.73rem', color: '#B45309', background: '#FEF3C7', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
                                ⚠️ {fb.dietaryNotes}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#334155' }}>{fb.customerName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{fb.customerPhone}</div>
                            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: 3, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              📍 {fb.address || fb.eventAddress}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', color: '#334155' }}>
                            <div style={{ fontWeight: 700 }}>{fb.eventTime} • {fb.eventDate}</div>
                            {isPendingConfirm && (
                              <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 700, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={11} /> Hạn duyệt: 24h
                              </div>
                            )}
                            {isCustomerApproving && (
                              <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={11} /> Khách đang duyệt (Hạn 12h)
                              </div>
                            )}
                            {isDepositWaiting && (
                              <div style={{ fontSize: '0.72rem', color: fb.customerReportedPaid ? '#0284C7' : '#D97706', fontWeight: 700, marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={11} /> {fb.customerReportedPaid ? '⚡ Khách báo đã CK cọc!' : 'Chờ khách cọc (Hạn 24h)'}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>
                              {(fb.totalAmount || 0).toLocaleString('vi-VN')}đ
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: fb.depositPaid ? '#059669' : '#D97706',
                                fontWeight: 700,
                                marginTop: 2,
                              }}
                            >
                              {fb.depositPaid
                                ? `✓ Đã cọc (${fb.depositPercent || 30}%): ${(fb.depositAmount || 0).toLocaleString('vi-VN')}đ`
                                : `⏳ Tiền cọc: ${(fb.depositAmount || 0).toLocaleString('vi-VN')}đ`}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            {/* Nút hành động theo từng State */}
                            {isPendingConfirm && (
                              <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {isKitchenCheckPending && (
                                  <>
                                    <span
                                      style={{
                                        padding: '5px 10px',
                                        borderRadius: 6,
                                        fontSize: '0.74rem',
                                        fontWeight: 800,
                                        background: '#FEF3C7',
                                        color: '#B45309',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        border: '1px solid #FDE68A',
                                      }}
                                    >
                                      <Clock size={12} /> Chờ Bếp xác nhận (4h)
                                    </span>
                                    <button
                                      type="button"
                                      disabled
                                      title="Cần Bếp xác nhận khả năng chế biến trước khi duyệt đơn"
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        background: '#F1F5F9',
                                        color: '#94A3B8',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        border: '1px solid #CBD5E1',
                                        cursor: 'not-allowed',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      🔒 Xác nhận đơn
                                    </button>
                                  </>
                                )}

                                {isNewBooking && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestKitchenCheck(fb)}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 5px rgba(15, 23, 42, 0.2)',
                                      }}
                                      title="Chuyển sang Bếp trực tiếp để kiểm tra nguyên liệu & công suất"
                                    >
                                      <Send size={12} color="#F59E0B" /> Gửi Bếp xác nhận
                                    </button>
                                    <button
                                      type="button"
                                      disabled
                                      title="Vui lòng bấm 'Gửi Bếp xác nhận' trước. Chỉ xác nhận đơn sau khi Bếp đồng ý chế biến."
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        background: '#F1F5F9',
                                        color: '#94A3B8',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        border: '1px solid #CBD5E1',
                                        cursor: 'not-allowed',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      🔒 Xác nhận đơn
                                    </button>
                                  </>
                                )}

                                {isKitchenApproved && (
                                  <>
                                    <span
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        background: '#DCFCE7',
                                        color: '#15803D',
                                        border: '1px solid #86EFAC',
                                      }}
                                    >
                                      ✓ Bếp: Có thể chế biến
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVerifyingBooking(fb);
                                        setVerifyAction('ACCEPT');
                                        setVerifyReason('Nhà hàng đã xác nhận đơn tiệc sau khi Bếp đồng ý khả năng chế biến.');
                                      }}
                                      style={{
                                        padding: '6px 14px',
                                        borderRadius: 6,
                                        background: 'linear-gradient(135deg, #059669, #047857)',
                                        color: '#FFFFFF',
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                      }}
                                    >
                                      <Check size={13} /> Xác nhận đơn (Gửi khách cọc)
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenProposalModal(fb)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #CBD5E1',
                                    background: '#F8FAFC',
                                    color: '#0F172A',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Đề xuất đổi món
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelRefundBooking(fb);
                                    setCancelRefundReason('Nhà hàng đã kín công suất vào khung giờ này.');
                                    setCancelRefundPercent(100);
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #FCA5A5',
                                    background: '#FFFFFF',
                                    color: '#DC2626',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Từ chối
                                </button>
                              </div>
                            )}

                            {isCustomerApproving && (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8' }}>
                                  Đã gửi đề xuất v{fb.activeProposal?.versionNumber || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenProposalModal(fb)}
                                  style={{ fontSize: '0.74rem', color: '#00B14F', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                  Điều chỉnh lại đề xuất
                                </button>
                              </div>
                            )}

                            {isDepositWaiting && (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                                {fb.customerReportedPaid && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284C7', background: '#E0F2FE', padding: '2px 6px', borderRadius: 4 }}>
                                    ⚡ Khách đã CK cọc
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDepositAndDispatch(fb, true)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                    color: '#FFFFFF',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                                  }}
                                >
                                  💰 Xác nhận cọc &amp; Giao Bếp
                                </button>
                              </div>
                            )}

                            {isConfirmed && (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#DCFCE7', color: '#15803D' }}>
                                    ✓ Đã cọc • Đã giao Bếp
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDepositReceipt(fb)}
                                    style={{
                                      padding: '6px 11px',
                                      borderRadius: 6,
                                      background: '#ECFDF5',
                                      color: '#047857',
                                      border: '1px solid #A7F3D0',
                                      fontSize: '0.76rem',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    🧾 Xem Bill cọc
                                  </button>

                                  {!fb.dispatchedToKitchen && (
                                    <button
                                      type="button"
                                      onClick={() => handleDispatchToKitchen(fb)}
                                      style={{
                                        padding: '6px 11px',
                                        borderRadius: 6,
                                        background: '#2563EB',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      👨‍🍳 Bàn giao Bếp
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubTab('kitchen');
                                      setKitchenSubTab('production');
                                    }}
                                    style={{
                                      padding: '6px 11px',
                                      borderRadius: 6,
                                      background: '#EFF6FF',
                                      color: '#1D4ED8',
                                      border: '1px solid #BFDBFE',
                                      fontSize: '0.76rem',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      cursor: 'pointer',
                                    }}
                                    title="Xem tiến độ chế biến của Bếp"
                                  >
                                    <Flame size={12} color="#DC2626" /> Xem Bếp nấu
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nowIso = new Date().toISOString();
                                      const billCode = `BILL-${String(fb.bookingCode).slice(-6)}`;
                                      onUpdateFeastBookings(
                                        feastBookings.map((item) =>
                                          item.id === fb.id
                                            ? { ...item, status: 'COMPLETED', finalBillCode: billCode, completedAt: nowIso }
                                            : item,
                                        ),
                                      );
                                      onSyncCateringOrderFromMerchant?.(fb.id, fb.bookingCode, 'COMPLETE', {
                                        finalBillCode: billCode,
                                        completedAt: nowIso,
                                      });
                                      onOpenBillModal(buildFeastBillData(fb, billCode, nowIso));
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 6,
                                      background: '#00B14F',
                                      color: '#FFFFFF',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Printer size={13} /> Hoàn tất &amp; Xuất Bill
                                  </button>
                                </div>
                              </div>
                            )}

                            {!isCompleted && !isRejected && (
                              <div style={{ marginTop: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelRefundBooking(fb);
                                    setCancelRefundReason('');
                                    setCancelRefundPercent(100);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#DC2626',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0,
                                  }}
                                >
                                  Hủy đơn &amp; Hoàn cọc
                                </button>
                              </div>
                            )}

                            {isCompleted && (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800, background: '#D1FAE5', color: '#065F46' }}>
                                  ✓ Đã hoàn thành tiệc
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenBillModal(
                                      buildFeastBillData(
                                        fb,
                                        fb.finalBillCode || `BILL-${String(fb.bookingCode).slice(-6)}`,
                                        fb.completedAt || new Date().toISOString(),
                                      ),
                                    )
                                  }
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    background: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                >
                                  <Printer size={13} /> Xem Bill tổng
                                </button>
                              </div>
                            )}

                            {isRejected && (
                              <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, background: '#FEE2E2', color: '#DC2626' }}>
                                {fb.status === 'EXPIRED' ? 'Hết hạn phản hồi' : 'Đã từ chối'}
                              </span>
                            )}

                            <div style={{ marginTop: 4 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenAudit(fb)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '0.72rem',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <History size={11} /> Lịch sử ({fb.timeline?.length || 1})
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: KITCHEN PRODUCTION & INGREDIENT SUPPLY BOARD */}
      {subTab === 'kitchen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Thông báo thời gian thực cho Bếp trực tiếp khi có lệnh tiệc đã nhận cọc */}
          {feastBookings.some(
            (b) =>
              (!b.merchantId || b.merchantId === currentMerchant?.id) &&
              b.dispatchedToKitchen &&
              ['CONFIRMED', 'DEPOSIT_PAID'].includes(b.status),
          ) && (
            <div
              style={{
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                border: '1.5px solid #10B981',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flame size={24} color="#DC2626" />
                <div>
                  <div style={{ fontWeight: 800, color: '#065F46', fontSize: '0.9rem' }}>
                    🔔 THÔNG BÁO CHO BẾP: Có đơn tiệc đã nhận cọc thành công và chuyển Lệnh chế biến sang Bếp!
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 2 }}>
                    Nhà hàng đã xác nhận đủ công suất &amp; nhân lực. Bếp được phép lập tức bắt đầu sơ chế và nấu món tại mục <strong>&ldquo;Lệnh chế biến chính thức&rdquo;</strong>.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKitchenSubTab('production')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  background: '#059669',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Mở Lệnh chế biến ({
                  feastBookings.filter(
                    (b) =>
                      (!b.merchantId || b.merchantId === currentMerchant?.id) &&
                      b.dispatchedToKitchen &&
                      ['CONFIRMED', 'DEPOSIT_PAID'].includes(b.status),
                  ).length
                })
              </button>
            </div>
          )}

          {/* Sub-navigation for Kitchen */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'supplies' as const, label: `Bảng nguyên liệu món (${dishSupplies.length})`, icon: <Layers size={15} /> },
                {
                  id: 'queue' as const,
                  label: `Yêu cầu xác minh từ Hợp đồng (${
                    feastBookings.filter(
                      (b) => (!b.merchantId || b.merchantId === currentMerchant?.id) && b.status === 'PENDING_KITCHEN_CHECK',
                    ).length
                  })`,
                  icon: <Clock size={15} color="#D97706" />,
                },
                {
                  id: 'production' as const,
                  label: `Lệnh chế biến chính thức (${
                    feastBookings.filter(
                      (b) =>
                        (!b.merchantId || b.merchantId === currentMerchant?.id) &&
                        ['CONFIRMED', 'DEPOSIT_PAID', 'PREPARING', 'COOKING', 'READY_FOR_DELIVERY'].includes(b.status),
                    ).length
                  })`,
                  icon: <Flame size={15} color="#DC2626" />,
                },
                { id: 'forecast' as const, label: 'Lịch tiệc dự kiến (Forecast)', icon: <Calendar size={15} /> },
              ].map((k) => {
                const active = kitchenSubTab === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKitchenSubTab(k.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: active ? 800 : 600,
                      background: active ? '#0F172A' : '#FFFFFF',
                      color: active ? '#FFFFFF' : '#475569',
                      border: active ? '1px solid #0F172A' : '1px solid #CBD5E1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {k.icon}
                    {k.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={refreshDishSupplies}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={loadingSupplies ? 'animate-spin' : ''} /> Làm mới nguyên liệu
            </button>
          </div>

          {/* VIEW 1: BẢNG NGUYÊN LIỆU MÓN ĂN */}
          {kitchenSubTab === 'supplies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Stat chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>TỔNG MÓN TRONG MENU TIỆC</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                    {dishSupplies.length} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#64748B' }}>món</span>
                  </div>
                </div>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534' }}>ĐỦ NGUYÊN LIỆU (AVAILABLE)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: 4 }}>
                    {dishSupplies.filter((s) => s.supplyStatus === 'AVAILABLE').length}{' '}
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#166534' }}>món</span>
                  </div>
                </div>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#B45309' }}>SẮP HẾT NGUYÊN LIỆU (LOW STOCK)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>
                    {dishSupplies.filter((s) => s.supplyStatus === 'LOW_STOCK').length}{' '}
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#B45309' }}>món</span>
                  </div>
                </div>
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#991B1B' }}>TẠM HẾT / THIẾU NGUYÊN LIỆU</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
                    {dishSupplies.filter((s) => s.supplyStatus === 'OUT_OF_STOCK' || s.supplyStatus === 'UNAVAILABLE').length}{' '}
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#991B1B' }}>món</span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px' }}>Món ăn &amp; Phân loại</th>
                      <th style={{ padding: '12px 14px' }}>Tình trạng nguyên liệu</th>
                      <th style={{ padding: '12px 14px' }}>Đã cam kết / Tối đa ngày</th>
                      <th style={{ padding: '12px 14px' }}>Khả dụng &amp; Thời gian bổ sung</th>
                      <th style={{ padding: '12px 14px' }}>Món thay thế gợi ý</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác Bếp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dishSupplies.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
                          Chưa có món tiệc nào được thiết lập nguyên liệu. Bấm "Làm mới nguyên liệu" để tải.
                        </td>
                      </tr>
                    ) : (
                      dishSupplies.map((item) => {
                        const isOut = item.supplyStatus === 'OUT_OF_STOCK' || item.supplyStatus === 'UNAVAILABLE';
                        const isLow = item.supplyStatus === 'LOW_STOCK';
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.dishName}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                                {item.course === 'APPETIZER' && '🥗 Khai vị'}
                                {item.course === 'MAIN' && '🍲 Món chính'}
                                {item.course === 'SOUP' && '🥣 Món súp'}
                                {item.course === 'DESSERT' && '🍮 Tráng miệng'}
                                {item.packageNames?.length > 0 && ` • Gói: ${item.packageNames.join(', ')}`}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: isOut ? '#FEE2E2' : isLow ? '#FEF3C7' : '#DCFCE7',
                                  color: isOut ? '#DC2626' : isLow ? '#B45309' : '#15803D',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {isOut ? '🔴 Tạm hết / Ngừng nhận' : isLow ? '🟡 Sắp hết' : '🟢 Đầy đủ nguyên liệu'}
                              </span>
                              {item.outOfStockReason && (
                                <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: 4 }}>
                                  Lý do: {item.outOfStockReason}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>
                                {item.committedPortions} / {item.maxDailyPortions || 60} suất
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 2 }}>
                                Còn nhận được: {item.remainingPortions ?? (item.maxDailyPortions || 60)} suất
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                                {item.availableDateRange || 'Khả dụng quanh năm'}
                              </div>
                              {item.restockExpectedAt && (
                                <div style={{ fontSize: '0.72rem', color: '#0284C7', marginTop: 2 }}>
                                  Dự kiến nhập: {item.restockExpectedAt}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                                {item.suggestedReplacementDish || 'Chưa thiết lập'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => setEditingSupply({ ...item })}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  color: '#0F172A',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Edit3 size={12} /> Cập nhật
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: HÀNG ĐỢI XÁC MINH NGUYÊN LIỆU TỪ HỢP ĐỒNG (SLA 4h) */}
          {kitchenSubTab === 'queue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 14, fontSize: '0.84rem', color: '#B45309' }}>
                ⚡ <strong>Quy định nghiệp vụ Bếp:</strong> Đây là các đơn tiệc đang chờ Bếp trưởng thẩm định nguyên liệu thực tế và công suất chế biến. Thời hạn phản hồi tiêu chuẩn là <strong>4 giờ làm việc</strong>. Sau khi Bếp xác nhận ĐỦ ĐIỀU KIỆN, bộ phận Hợp đồng mới chuyển khách đặt cọc.
              </div>

              {feastBookings.filter(
                (b) => (!b.merchantId || b.merchantId === currentMerchant?.id) && b.status === 'PENDING_KITCHEN_CHECK',
              ).length === 0 ? (
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 36, textAlign: 'center', color: '#64748B' }}>
                  <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>Hiện không có yêu cầu nào chờ Bếp xác minh</div>
                  <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Tất cả các đơn tiệc mới đã được thẩm định hoặc chưa có yêu cầu chuyển sang.</div>
                </div>
              ) : (
                feastBookings
                  .filter((b) => (!b.merchantId || b.merchantId === currentMerchant?.id) && b.status === 'PENDING_KITCHEN_CHECK')
                  .map((b) => (
                    <div
                      key={b.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #F59E0B',
                        borderRadius: 12,
                        padding: 18,
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: 6 }}>
                              SLA: 4 GIỜ LÀM VIỆC
                            </span>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
                              Đơn tiệc #{b.bookingCode}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84rem', color: '#334155', marginTop: 4 }}>
                            Khách hàng: <strong>{b.customerName}</strong> ({b.customerPhone}) • Quy mô:{' '}
                            <strong style={{ color: '#00B14F' }}>{b.tableCount} mâm</strong> ({b.guestCount || b.tableCount * 10} khách)
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>
                            Thời gian phục vụ: <strong>{b.eventTime}</strong> ngày <strong>{b.eventDate}</strong> • Địa điểm: {b.address || b.eventAddress}
                          </div>
                          {b.dietaryNotes && (
                            <div style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: 4, fontWeight: 700 }}>
                              ⚠️ Lưu ý dị ứng/chay: {b.dietaryNotes}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setKitchenCheckingBooking(b);
                              setKitchenCheckStatus('APPROVED');
                              setKitchenCheckNotes('Bếp đã kiểm tra nguyên liệu thực tế và nhân sự: CÓ THỂ CHẾ BIẾN.');
                            }}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 8,
                              background: '#00B14F',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Check size={14} /> Có thể chế biến
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setKitchenCheckingBooking(b);
                              setKitchenCheckStatus('PARTIAL_SHORTAGE');
                              setKitchenCheckNotes('Bếp thiếu một phần nguyên liệu, đề xuất đổi món.');
                              setKitchenReplacementDish('');
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              background: '#FFFBEB',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                            }}
                          >
                            Đề xuất thay đổi món
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setKitchenCheckingBooking(b);
                              setKitchenCheckStatus('UNABLE_TO_SERVE');
                              setKitchenCheckNotes('');
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              background: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                            }}
                          >
                            Không thể chế biến
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* VIEW 3: LỆNH CHẾ BIẾN CHÍNH THỨC (CHỈ SAU KHI CỌC) */}
          {kitchenSubTab === 'production' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 14, fontSize: '0.84rem', color: '#166534' }}>
                👨‍🍳 <strong>Lệnh chế biến chính thức:</strong> Đây là các đơn tiệc đã ký hợp đồng và khách đã hoàn tất đặt cọc. Bếp được phép sơ chế, nấu nướng và cập nhật tiến độ theo từng giai đoạn chuẩn bị.
              </div>

              {feastBookings.filter(
                (b) =>
                  (!b.merchantId || b.merchantId === currentMerchant?.id) &&
                  ['CONFIRMED', 'DEPOSIT_PAID', 'PREPARING', 'COOKING', 'READY_FOR_DELIVERY'].includes(b.status),
              ).length === 0 ? (
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 36, textAlign: 'center', color: '#64748B' }}>
                  <Flame size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>Chưa có lệnh chế biến chính thức nào cần nấu</div>
                  <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Các đơn tiệc sau khi khách nộp cọc thành công sẽ tự động hiển thị tại đây.</div>
                </div>
              ) : (
                feastBookings
                  .filter(
                    (b) =>
                      (!b.merchantId || b.merchantId === currentMerchant?.id) &&
                      ['CONFIRMED', 'DEPOSIT_PAID', 'PREPARING', 'COOKING', 'READY_FOR_DELIVERY'].includes(b.status),
                  )
                  .map((b) => {
                    const isConfirmed = b.status === 'CONFIRMED' || b.status === 'DEPOSIT_PAID';
                    const isPreparing = b.status === 'PREPARING';
                    const isCooking = b.status === 'COOKING';
                    const isReady = b.status === 'READY_FOR_DELIVERY';

                    const isDepositConfirmed = Boolean(b.depositPaid) || b.status === 'DEPOSIT_PAID' || b.status === 'CONFIRMED';
                    const isDispatched = b.dispatchedToKitchen !== false;
                    const canCook = isDepositConfirmed && isDispatched;

                    return (
                      <div
                        key={b.id}
                        style={{
                          background: '#FFFFFF',
                          border: isReady ? '1.5px solid #10B981' : isCooking ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                          borderRadius: 12,
                          padding: 18,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, background: canCook ? '#DCFCE7' : '#FEF3C7', color: canCook ? '#15803D' : '#B45309', padding: '3px 8px', borderRadius: 6 }}>
                                LỆNH CHẾ BIẾN #{String(b.bookingCode).slice(-6)}
                              </span>
                              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '1.05rem' }}>
                                {b.packageName} ({b.tableCount} mâm)
                              </span>
                            </div>
                            <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: 4 }}>
                              Giờ bàn giao xe vận chuyển: <strong>{b.eventTime}</strong> ngày <strong>{b.eventDate}</strong>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 2 }}>
                              Địa chỉ tiệc: {b.address || b.eventAddress} • Khách hàng: {b.customerName} ({b.customerPhone})
                            </div>
                            {b.dietaryNotes && (
                              <div style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: 4, fontWeight: 700 }}>
                                ⚠️ Ghi chú đặc biệt: {b.dietaryNotes}
                              </div>
                            )}
                          </div>

                          {/* Progress Controls */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  background: isReady ? '#D1FAE5' : isCooking ? '#FEE2E2' : isPreparing ? '#FEF3C7' : canCook ? '#E0F2FE' : '#F1F5F9',
                                  color: isReady ? '#065F46' : isCooking ? '#991B1B' : isPreparing ? '#92400E' : canCook ? '#0369A1' : '#64748B',
                                }}
                              >
                                {isReady && '✓ ĐÃ NẤU XONG • CHỜ XE'}
                                {isCooking && '🔥 ĐANG NẤU NƯỚNG'}
                                {isPreparing && '🔪 ĐANG SƠ CHẾ NGUYÊN LIỆU'}
                                {!isReady && !isCooking && !isPreparing && (canCook ? '📋 ĐÃ NHẬN LỆNH NẤU (ĐÃ CỌC)' : '🔒 CHỜ NHẬN CỌC & LỆNH BẾP')}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              {/* Nút xem Bill cọc */}
                              <button
                                type="button"
                                onClick={() => handleOpenDepositReceipt(b)}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: 6,
                                  background: '#ECFDF5',
                                  color: '#047857',
                                  border: '1px solid #A7F3D0',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  cursor: 'pointer',
                                }}
                              >
                                🧾 Xem Bill cọc
                              </button>

                              {!canCook ? (
                                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '6px 10px', borderRadius: 6, fontSize: '0.74rem', color: '#B45309', fontWeight: 700 }}>
                                  🔒 Chờ Hợp đồng nhận cọc &amp; bàn giao lệnh
                                </div>
                              ) : (
                                <>
                                  {isConfirmed && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateKitchenProgress(b, 'PREPARING')}
                                      style={{
                                        padding: '7px 14px',
                                        borderRadius: 6,
                                        background: '#D97706',
                                        color: '#FFFFFF',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      🔪 Bắt đầu Sơ chế
                                    </button>
                                  )}
                                  {isPreparing && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateKitchenProgress(b, 'COOKING')}
                                      style={{
                                        padding: '7px 14px',
                                        borderRadius: 6,
                                        background: '#DC2626',
                                        color: '#FFFFFF',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      🔥 Bắt đầu Nấu nướng
                                    </button>
                                  )}
                                  {isCooking && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateKitchenProgress(b, 'READY_FOR_DELIVERY')}
                                      style={{
                                        padding: '7px 14px',
                                        borderRadius: 6,
                                        background: '#00B14F',
                                        color: '#FFFFFF',
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      🍽️ Hoàn tất chế biến (Bàn giao xe)
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* VIEW 4: LỊCH TIỆC DỰ KIẾN (FORECAST CALENDAR) */}
          {kitchenSubTab === 'forecast' && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                Lịch tiệc dự kiến 14 ngày tới (Bếp lập kế hoạch mua nguyên liệu)
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
                Tổng hợp số đơn tiệc và tổng số mâm cần nấu để bếp trưởng chủ động đặt hàng hải sản, thịt tươi và rau củ theo ngày.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {Array.from({ length: 14 }).map((_, idx) => {
                  const d = new Date();
                  d.setDate(d.getDate() + idx);
                  const dateStr = d.toISOString().split('T')[0];
                  const dayBookings = feastBookings.filter(
                    (b) =>
                      (!b.merchantId || b.merchantId === currentMerchant?.id) &&
                      b.eventDate === dateStr &&
                      b.status !== 'CANCELLED' &&
                      b.status !== 'REJECTED' &&
                      b.status !== 'EXPIRED',
                  );
                  const totalTables = dayBookings.reduce((sum, b) => sum + (b.tableCount || 0), 0);

                  return (
                    <div
                      key={dateStr}
                      style={{
                        background: totalTables > 0 ? '#F8FAFC' : '#FFFFFF',
                        border: totalTables > 0 ? '1.5px solid #00B14F' : '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>
                        {idx === 0 ? 'Hôm nay' : idx === 1 ? 'Ngày mai' : `+${idx} ngày`}
                      </div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem', marginTop: 2 }}>
                        {dateStr}
                      </div>
                      <div style={{ marginTop: 8, fontSize: '0.82rem' }}>
                        Số đơn tiệc: <strong>{dayBookings.length}</strong>
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: totalTables > 0 ? '#00B14F' : '#94A3B8' }}>
                        Tổng số mâm: {totalTables} mâm
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: CALENDAR & CAPACITY OVERLOAD FORECAST */}
      {subTab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* BANNER CẢNH BÁO CÔNG SUẤT 3 NGÀY VÀ 7 NGÀY (SECTION 6) */}
          <div
            style={{
              background: forecastOverload?.isThreeDaysOverloaded ? '#FEF2F2' : '#F0FDF4',
              border: forecastOverload?.isThreeDaysOverloaded ? '1.5px solid #FCA5A5' : '1.5px solid #BBF7D0',
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} color={forecastOverload?.isThreeDaysOverloaded ? '#DC2626' : '#166534'} />
                  <span style={{ fontWeight: 800, fontSize: '0.98rem', color: forecastOverload?.isThreeDaysOverloaded ? '#991B1B' : '#14532D' }}>
                    ĐÁNH GIÁ CÔNG SUẤT 3 NGÀY &amp; 7 NGÀY TỚI (CHỐNG QUÁ TẢI TIỆC)
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', color: forecastOverload?.isThreeDaysOverloaded ? '#B91C1C' : '#15803D', marginTop: 4 }}>
                  {forecastOverload?.warningMessage || 'Nhà hàng hoạt động bình thường, công suất phục vụ trong tuần tới ổn định.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ background: '#FFFFFF', padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>TẢI 3 NGÀY TỚI</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (forecastOverload?.threeDaysAveragePercent || 0) >= 80 ? '#DC2626' : '#0F172A' }}>
                    {forecastOverload?.threeDaysAveragePercent || 0}%
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>TẢI 7 NGÀY TỚI</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (forecastOverload?.sevenDaysAveragePercent || 0) >= 80 ? '#DC2626' : '#0F172A' }}>
                    {forecastOverload?.sevenDaysAveragePercent || 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 20 }}>
          {/* Left: Day picker */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#00B14F" /> Chọn ngày kiểm tra công suất
            </h3>
            <input
              type="date"
              value={selectedCalendarDate}
              onChange={(e) => setSelectedCalendarDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#0F172A',
                marginBottom: 16,
              }}
            />

            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 14, fontSize: '0.82rem', color: '#475569' }}>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Chủ động Khóa/Mở ngày này:</div>
              <input
                type="text"
                placeholder="Lý do khóa (bảo trì bếp, tiệc nội bộ)..."
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.8rem', marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleToggleBlock(undefined, true)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Lock size={13} /> Khóa cả ngày
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleBlock(undefined, false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Unlock size={13} /> Mở khóa
                </button>
              </div>
            </div>
          </div>

          {/* Right: Slot breakdown */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>
              Chi tiết công suất phục vụ ngày: {selectedCalendarDate}
            </h3>

            {loadingAvailability ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748B' }}>Đang tính toán công suất thời gian thực...</div>
            ) : dayAvailability ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, background: dayAvailability.isBlocked ? '#FEE2E2' : '#F0FDF4', border: `1px solid ${dayAvailability.isBlocked ? '#FCA5A5' : '#BBF7D0'}` }}>
                  {dayAvailability.isBlocked ? <Lock size={20} color="#DC2626" /> : <CheckCircle2 size={20} color="#10B981" />}
                  <div>
                    <div style={{ fontWeight: 800, color: dayAvailability.isBlocked ? '#991B1B' : '#166534', fontSize: '0.92rem' }}>
                      {dayAvailability.isBlocked ? 'Ngày này đang bị KHÓA NHẬN TIỆC' : 'Ngày này đang MỞ NHẬN TIỆC'}
                    </div>
                    {dayAvailability.blockReason && (
                      <div style={{ fontSize: '0.78rem', color: '#DC2626', marginTop: 2 }}>
                        Lý do: {dayAvailability.blockReason}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Tổng mâm tối đa/ngày</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                      {dayAvailability.maxTablesPerDay} mâm
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Đã xác nhận / Đang giữ chỗ</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#D97706', marginTop: 2 }}>
                      {dayAvailability.totalBookedTables + dayAvailability.totalHeldTables} mâm
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Khả năng nhận thêm</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: dayAvailability.totalRemainingTables > 0 ? '#10B981' : '#EF4444', marginTop: 2 }}>
                      {dayAvailability.totalRemainingTables} mâm
                    </div>
                  </div>
                </div>

                {/* Slots Breakdown */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', margin: '8px 0 0' }}>
                  Phân bổ theo khung giờ cao điểm:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dayAvailability.slots?.map((slot: any) => (
                    <div
                      key={slot.timeSlot}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: slot.status === 'BLOCKED' ? '#F8FAFC' : '#FFFFFF',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>
                          Khung giờ {slot.timeSlot} ({slot.timeSlot.includes('10:00') ? 'Tiệc trưa' : 'Tiệc chiều tối'})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                          Đã đặt: {slot.bookedTables} • Giữ chỗ: {slot.heldTables} • Còn trống:{' '}
                          <strong style={{ color: slot.remainingTables > 0 ? '#00B14F' : '#DC2626' }}>
                            {slot.remainingTables}/{slot.maxCapacityTables} mâm
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background:
                              slot.status === 'AVAILABLE'
                                ? '#D1FAE5'
                                : slot.status === 'LIMITED'
                                ? '#FEF3C7'
                                : slot.status === 'FULLY_BOOKED'
                                ? '#FEE2E2'
                                : '#F1F5F9',
                            color:
                              slot.status === 'AVAILABLE'
                                ? '#065F46'
                                : slot.status === 'LIMITED'
                                ? '#92400E'
                                : slot.status === 'FULLY_BOOKED'
                                ? '#991B1B'
                                : '#475569',
                          }}
                        >
                          {slot.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleBlock(slot.timeSlot, slot.status !== 'BLOCKED')}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: slot.status === 'BLOCKED' ? '#00B14F' : '#DC2626',
                          }}
                        >
                          {slot.status === 'BLOCKED' ? 'Mở slot' : 'Khóa slot'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        </div>
      )}

      {/* SUBTAB 3: CAPACITY CONFIGURATION */}
      {subTab === 'capacity' && (
        <form onSubmit={handleSaveCapacityConfig} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, maxWidth: 650 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
            Cấu hình Công suất Bếp &amp; Vùng đệm Vận hành
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 20 }}>
            Thiết lập giới hạn số lượng mâm cỗ tối đa để tránh quá tải bếp và đảm bảo chất lượng phục vụ tiệc
          </p>

          {configNotice && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#DCFCE7', color: '#15803D', fontSize: '0.84rem', fontWeight: 700, marginBottom: 16 }}>
              {configNotice}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Số đơn tối đa nhận / ngày *
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={capacityConfig.maxOrdersPerDay}
                onChange={(e) => setCapacityConfig({ ...capacityConfig, maxOrdersPerDay: parseInt(e.target.value, 10) || 1 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Tổng mâm tối đa / ngày *
              </label>
              <input
                type="number"
                min={5}
                max={200}
                value={capacityConfig.maxTablesPerDay}
                onChange={(e) => setCapacityConfig({ ...capacityConfig, maxTablesPerDay: parseInt(e.target.value, 10) || 10 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Số mâm tối đa / 1 khung giờ (Slot) *
              </label>
              <input
                type="number"
                min={5}
                max={100}
                value={capacityConfig.maxTablesPerSlot}
                onChange={(e) => setCapacityConfig({ ...capacityConfig, maxTablesPerSlot: parseInt(e.target.value, 10) || 10 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Thời gian đặt trước tối thiểu (giờ) *
              </label>
              <input
                type="number"
                min={12}
                max={360}
                value={capacityConfig.minNoticeHours}
                onChange={(e) => setCapacityConfig({ ...capacityConfig, minNoticeHours: parseInt(e.target.value, 10) || 72 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Mặc định: 72 giờ (3 ngày theo BR-24)</span>
            </div>
          </div>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginBottom: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
            Thời gian đệm xoay vòng thiết bị &amp; nhân sự (Buffer Time):
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Sơ chế &amp; nấu nướng tại bếp (giờ)
              </label>
              <input
                type="number"
                step="0.5"
                value={capacityConfig.prepBufferHours}
                onChange={(e) => setCapacityConfig({ ...capacityConfig, prepBufferHours: parseFloat(e.target.value) || 3.0 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Vận chuyển đồ tiệc tới địa điểm (giờ)
              </label>
              <input
                type="number"
                step="0.5"
                value={capacityConfig.transitBufferHours}
                onChange={(e) => setCapacityConfig({ ...capacityConfig, transitBufferHours: parseFloat(e.target.value) || 1.0 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Thời gian ăn tiệc &amp; phục vụ (giờ)
              </label>
              <input
                type="number"
                step="0.5"
                value={capacityConfig.serviceBufferHours}
                onChange={(e) => setCapacityConfig({ ...capacityConfig, serviceBufferHours: parseFloat(e.target.value) || 3.0 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Thu dọn bát đĩa, thiết bị (giờ)
              </label>
              <input
                type="number"
                step="0.5"
                value={capacityConfig.cleanupBufferHours}
                onChange={(e) => setCapacityConfig({ ...capacityConfig, cleanupBufferHours: parseFloat(e.target.value) || 1.5 })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            style={{
              padding: '11px 24px',
              borderRadius: 8,
              background: '#00B14F',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Save size={16} /> {savingConfig ? 'Đang lưu...' : 'Lưu cấu hình công suất'}
          </button>
        </form>
      )}

      {/* MODAL 1: THẨM ĐỊNH NĂNG LỰC NHÀ HÀNG (VERIFY CAPACITY) */}
      {verifyingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setVerifyingBooking(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: verifyAction === 'ACCEPT' ? '#00B14F' : '#DC2626',
                    textTransform: 'uppercase',
                  }}
                >
                  {verifyAction === 'ACCEPT' ? 'Thẩm định khả năng phục vụ tiệc' : 'Từ chối & Hủy hợp đồng đặt tiệc'}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                  Hợp đồng #{verifyingBooking.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingBooking(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Checklist thẩm định */}
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: '0.82rem', color: '#334155' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Thông tin cần đối soát trước khi duyệt:</div>
              <div>• <strong>Gói cỗ &amp; Quy mô:</strong> {verifyingBooking.packageName} ({verifyingBooking.tableCount} mâm)</div>
              <div>• <strong>Thời gian:</strong> {verifyingBooking.eventTime} ngày {verifyingBooking.eventDate}</div>
              <div>• <strong>Địa điểm:</strong> {verifyingBooking.address || verifyingBooking.eventAddress}</div>
              {verifyingBooking.dietaryNotes && (
                <div style={{ color: '#B45309', marginTop: 4 }}>• <strong>Dị ứng/Món chay:</strong> {verifyingBooking.dietaryNotes}</div>
              )}
              {verifyingBooking.equipmentNotes && (
                <div style={{ color: '#1D4ED8', marginTop: 2 }}>• <strong>Thiết bị/Bàn ghế:</strong> {verifyingBooking.equipmentNotes}</div>
              )}
            </div>

            {verifyAction === 'REJECT' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
                  Gợi ý lý do từ chối nhanh (bấm chọn):
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    'Nhà hàng đã kín công suất mâm trong ngày này',
                    'Bếp không đủ công suất chuẩn bị thực đơn quy mô này',
                    'Không đủ nguyên liệu tươi cho các món trong thực đơn',
                    'Thiếu nhân sự phục vụ & thiết bị lưu động',
                    'Địa điểm tổ chức vượt quá bán kính phục vụ',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setVerifyReason(r)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: verifyReason === r ? '1px solid #DC2626' : '1px solid #E2E8F0',
                        background: verifyReason === r ? '#FEE2E2' : '#FFFFFF',
                        color: verifyReason === r ? '#B91C1C' : '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: verifyAction === 'REJECT' ? '#DC2626' : '#334155',
                  marginBottom: 6,
                }}
              >
                {verifyAction === 'REJECT' ? 'Lý do từ chối (bắt buộc gửi cho khách):' : 'Ý kiến nhà hàng gửi cho khách hàng:'}
              </label>
              <textarea
                rows={3}
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                placeholder={verifyAction === 'REJECT' ? 'Nhập chi tiết lý do từ chối nhận tiệc...' : 'Nhập ghi chú xác nhận khả năng phục vụ...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: verifyAction === 'REJECT' ? '1px solid #FCA5A5' : '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setVerifyingBooking(null)}
                style={{ padding: '9px 16px', borderRadius: 8, background: '#F1F5F9', color: '#475569', fontSize: '0.84rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmVerification}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  background: verifyAction === 'ACCEPT' ? '#00B14F' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {verifyAction === 'ACCEPT' ? 'Xác nhận Đủ năng lực & Chờ cọc' : 'Xác nhận Từ chối & Gửi thông báo cho khách'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ĐỀ XUẤT ĐỔI MÓN THỰC ĐƠN (MENU REVISION PROPOSAL) */}
      {proposingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setProposingBooking(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              padding: 24,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>
                  Đề xuất Thay đổi Thực đơn (Menu Revision)
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                  Đơn tiệc #{proposingBooking.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProposingBooking(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Lý do điều chỉnh thực đơn (Hiển thị rõ ràng cho khách duyệt) *
              </label>
              <input
                type="text"
                placeholder="VD: Thiếu tôm càng xanh tươi sống, đề xuất đổi sang tôm sú to loại 1..."
                value={proposalReason}
                onChange={(e) => setProposalReason(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Chênh lệch đơn giá mỗi mâm (VND)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  step="10000"
                  value={proposalPriceDelta}
                  onChange={(e) => setProposalPriceDelta(parseInt(e.target.value, 10) || 0)}
                  style={{ width: 180, padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.78rem', color: proposalPriceDelta < 0 ? '#10B981' : proposalPriceDelta > 0 ? '#D97706' : '#64748B', fontWeight: 700 }}>
                  {proposalPriceDelta < 0
                    ? `Giảm ${Math.abs(proposalPriceDelta).toLocaleString('vi-VN')}đ/mâm`
                    : proposalPriceDelta > 0
                    ? `Phụ thu thêm ${proposalPriceDelta.toLocaleString('vi-VN')}đ/mâm`
                    : 'Giữ nguyên đơn giá mâm'}
                </span>
              </div>
            </div>

            {/* Danh sách món điều chỉnh */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                Điều chỉnh từng món ăn trong mâm:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                {proposalDishes.map((dish, idx) => (
                  <div
                    key={dish.dishId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                      background: dish.action === 'REPLACE' ? '#FEF3C7' : dish.action === 'REMOVE' ? '#FEE2E2' : '#FFFFFF',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{idx + 1}. </span>
                      {dish.action === 'REPLACE' ? (
                        <input
                          type="text"
                          value={dish.dishName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProposalDishes(proposalDishes.map((d) => (d.dishId === dish.dishId ? { ...d, dishName: val } : d)));
                          }}
                          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #D97706', fontSize: '0.82rem', fontWeight: 700, width: '70%' }}
                        />
                      ) : (
                        <span style={{ textDecoration: dish.action === 'REMOVE' ? 'line-through' : 'none', color: dish.action === 'REMOVE' ? '#DC2626' : '#0F172A' }}>
                          {dish.dishName}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setProposalDishes(
                            proposalDishes.map((d) => (d.dishId === dish.dishId ? { ...d, action: d.action === 'REPLACE' ? 'KEEP' : 'REPLACE' } : d)),
                          );
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: '1px solid #CBD5E1',
                          background: dish.action === 'REPLACE' ? '#D97706' : '#FFFFFF',
                          color: dish.action === 'REPLACE' ? '#FFFFFF' : '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        Đổi món
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProposalDishes(
                            proposalDishes.map((d) => (d.dishId === dish.dishId ? { ...d, action: d.action === 'REMOVE' ? 'KEEP' : 'REMOVE' } : d)),
                          );
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: '1px solid #FCA5A5',
                          background: dish.action === 'REMOVE' ? '#DC2626' : '#FFFFFF',
                          color: dish.action === 'REMOVE' ? '#FFFFFF' : '#DC2626',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        Bỏ món
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setProposingBooking(null)}
                style={{ padding: '9px 16px', borderRadius: 8, background: '#F1F5F9', color: '#475569', fontSize: '0.84rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!proposalReason.trim()}
                onClick={handleSubmitProposal}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  background: proposalReason.trim() ? '#00B14F' : '#CBD5E1',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: proposalReason.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Gửi Đề xuất cho Khách (Hạn duyệt 12h)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT HISTORY TIMELINE */}
      {viewingAuditBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setViewingAuditBooking(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              padding: 24,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Lịch sử Thao tác #{viewingAuditBooking.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingAuditBooking(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(viewingAuditBooking.timeline || []).map((ev: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 12, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: '#00B14F', marginTop: 4 }} />
                    {idx < (viewingAuditBooking.timeline?.length || 1) - 1 && (
                      <div style={{ width: 2, flex: 1, background: '#E2E8F0', margin: '4px 0' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>{ev.title}</div>
                    <div style={{ color: '#475569', marginTop: 2 }}>{ev.description}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 3 }}>
                      {new Date(ev.timestamp || Date.now()).toLocaleString('vi-VN')} • Tác nhân: <strong>{ev.actor}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CẬP NHẬT TÌNH TRẠNG NGUYÊN LIỆU MÓN ĂN (BẾP) */}
      {editingSupply && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setEditingSupply(null)}
        >
          <form
            onSubmit={handleSaveDishSupplySubmit}
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#00B14F', textTransform: 'uppercase' }}>
                  Bếp cập nhật nguyên liệu
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                  {editingSupply.dishName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupply(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Tình trạng nguyên liệu:
                </label>
                <select
                  value={editingSupply.supplyStatus}
                  onChange={(e) => setEditingSupply({ ...editingSupply, supplyStatus: e.target.value as any })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontWeight: 700 }}
                >
                  <option value="AVAILABLE">🟢 Đầy đủ nguyên liệu (AVAILABLE)</option>
                  <option value="LOW_STOCK">🟡 Sắp hết / Cần nhập bổ sung (LOW_STOCK)</option>
                  <option value="OUT_OF_STOCK">🔴 Tạm hết nguyên liệu (OUT_OF_STOCK)</option>
                  <option value="UNAVAILABLE">⚪ Ngừng phục vụ món này (UNAVAILABLE)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Số suất tối đa chế biến / ngày:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingSupply.maxDailyPortions || 60}
                    onChange={(e) => setEditingSupply({ ...editingSupply, maxDailyPortions: parseInt(e.target.value, 10) || 60 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Dự kiến bổ sung ngày:
                  </label>
                  <input
                    type="date"
                    value={editingSupply.restockExpectedAt || ''}
                    onChange={(e) => setEditingSupply({ ...editingSupply, restockExpectedAt: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Lý do thiếu / hết nguyên liệu:
                </label>
                <input
                  type="text"
                  placeholder="VD: Hải sản tươi không về kịp do biển động, rau đặc sản trái vụ..."
                  value={editingSupply.outOfStockReason || ''}
                  onChange={(e) => setEditingSupply({ ...editingSupply, outOfStockReason: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Món thay thế đề xuất:
                </label>
                <input
                  type="text"
                  placeholder="VD: Tôm Sú Hấp Nước Dừa, Gà Ta Hấp Lá Chanh..."
                  value={editingSupply.suggestedReplacementDish || ''}
                  onChange={(e) => setEditingSupply({ ...editingSupply, suggestedReplacementDish: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setEditingSupply(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                style={{ padding: '8px 18px', borderRadius: 8, background: '#00B14F', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Lưu tình trạng món
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: BẾP THẨM ĐỊNH NĂNG LỰC ĐƠN TIỆC */}
      {kitchenCheckingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setKitchenCheckingBooking(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>
                  Bếp thẩm định năng lực đơn tiệc
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                  Đơn tiệc #{kitchenCheckingBooking.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setKitchenCheckingBooking(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: '0.82rem', color: '#334155' }}>
              <div>• <strong>Gói cỗ:</strong> {kitchenCheckingBooking.packageName} ({kitchenCheckingBooking.tableCount} mâm)</div>
              <div>• <strong>Thời gian:</strong> {kitchenCheckingBooking.eventTime} ngày {kitchenCheckingBooking.eventDate}</div>
              <div>• <strong>Địa điểm:</strong> {kitchenCheckingBooking.address || kitchenCheckingBooking.eventAddress}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Kết quả kiểm tra từ Bếp:
              </label>
              <select
                value={kitchenCheckStatus}
                onChange={(e) => setKitchenCheckStatus(e.target.value as any)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.86rem', fontWeight: 700 }}
              >
                <option value="APPROVED">🟢 Có thể chế biến (Đủ nguyên liệu, công suất bếp sẵn sàng)</option>
                <option value="PARTIAL_SHORTAGE">🟡 Đề xuất thay đổi món (Thiếu một phần nguyên liệu)</option>
                <option value="UNABLE_TO_SERVE">🔴 Không thể chế biến (Bắt buộc nhập lý do: thiếu nguyên liệu, quá tải...)</option>
              </select>
            </div>

            {kitchenCheckStatus === 'PARTIAL_SHORTAGE' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#B45309', marginBottom: 4 }}>
                  Món đề xuất thay thế:
                </label>
                <input
                  type="text"
                  placeholder="VD: Đổi Tôm càng sang Tôm sú, đổi Gỏi sứa sang Gỏi ngó sen..."
                  value={kitchenReplacementDish}
                  onChange={(e) => setKitchenReplacementDish(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #FDE68A', background: '#FFFBEB', fontSize: '0.84rem' }}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Ghi chú chi tiết từ Bếp trưởng:
              </label>
              <textarea
                rows={3}
                placeholder="Nhập ghi chú gửi cho bộ phận Hợp đồng..."
                value={kitchenCheckNotes}
                onChange={(e) => setKitchenCheckNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setKitchenCheckingBooking(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmKitchenCheck}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: kitchenCheckStatus === 'APPROVED' ? '#00B14F' : kitchenCheckStatus === 'PARTIAL_SHORTAGE' ? '#D97706' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Gửi phản hồi cho Hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: KIỂM TRA SẴN SÀNG TRƯỚC 24-48H (READINESS CHECK) */}
      {preEventCheckingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPreEventCheckingBooking(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase' }}>
                  Kiểm tra sẵn sàng trước 24–48h
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                  Đơn tiệc #{preEventCheckingBooking.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreEventCheckingBooking(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                Đối soát liên phòng ban (Bếp &amp; Hợp đồng):
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', color: '#0F172A', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={preEventKitchenReady}
                  onChange={(e) => setPreEventKitchenReady(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: '#00B14F' }}
                />
                <span><strong>Bếp:</strong> Nguyên liệu thực tế đạt chuẩn tươi sống 100%</span>
              </label>

              <div style={{ paddingLeft: 27 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748B', marginBottom: 4 }}>
                  <span>Tiến độ sơ chế tại bếp</span>
                  <strong>{preEventPrepPercent}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preEventPrepPercent}
                  onChange={(e) => setPreEventPrepPercent(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', accentColor: '#00B14F' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', color: '#0F172A', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={preEventStaffAssigned}
                  onChange={(e) => setPreEventStaffAssigned(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: '#00B14F' }}
                />
                <span><strong>Nhân sự:</strong> Đã phân công đủ nhân viên phục vụ &amp; kỹ thuật</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', color: '#0F172A', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={preEventEquipmentReady}
                  onChange={(e) => setPreEventEquipmentReady(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: '#00B14F' }}
                />
                <span><strong>Thiết bị:</strong> Bàn ghế, bát đĩa, khăn trải bàn đã khử khuẩn &amp; đóng thùng</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', color: '#0F172A', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={preEventVehicleReady}
                  onChange={(e) => setPreEventVehicleReady(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: '#00B14F' }}
                />
                <span><strong>Vận chuyển:</strong> Xe tải chuyên dụng đã chốt lộ trình &amp; giờ khởi hành</span>
              </label>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Ghi chú kiểm tra:
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú về địa điểm, lối vào xe tải..."
                  value={preEventNotes}
                  onChange={(e) => setPreEventNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setPreEventCheckingBooking(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handlePreEventCheckSubmit}
                style={{ padding: '8px 18px', borderRadius: 8, background: '#1D4ED8', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Xác nhận hoàn tất kiểm tra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: HỦY ĐƠN & HOÀN TIỀN CỌC (CANCELLATION & REFUND) */}
      {cancelRefundBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setCancelRefundBooking(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                  Hủy đơn tiệc &amp; Hoàn trả tiền cọc
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                  Đơn tiệc #{cancelRefundBooking.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelRefundBooking(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.88rem' }}>
                Thông tin hoàn trả tiền cọc cho khách hàng:
              </div>
              <div style={{ fontSize: '0.82rem', color: '#B91C1C', marginTop: 4 }}>
                • Tiền cọc đã nhận: <strong>{(cancelRefundBooking.depositAmount || 0).toLocaleString('vi-VN')}đ</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#B91C1C', marginTop: 2 }}>
                • Tỷ lệ hoàn cọc (Nhà hàng chủ động hủy): <strong>{cancelRefundPercent}%</strong> (
                {Math.round(((cancelRefundBooking.depositAmount || 0) * cancelRefundPercent) / 100).toLocaleString('vi-VN')}đ)
              </div>
              <div style={{ fontSize: '0.76rem', color: '#991B1B', marginTop: 6 }}>
                💡 Hệ thống sẽ tự động hoàn tiền về Ví MoMo của khách hàng và gửi thông báo khẩn cấp lên màn hình của khách.
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
                Lý do hủy đơn (bắt buộc nhập để thông báo cho khách):
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do cụ thể: Nhà hàng gặp sự cố thiết bị bếp, kín công suất đột xuất..."
                value={cancelRefundReason}
                onChange={(e) => setCancelRefundReason(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #FCA5A5', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Gợi ý lý do nhanh (bấm chọn):
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  'Nhà hàng đã kín công suất mâm trong ngày này',
                  'Bếp không đủ công suất chuẩn bị thực đơn quy mô này',
                  'Không đủ nguyên liệu tươi cho các món trong thực đơn',
                  'Thiếu nhân sự phục vụ & thiết bị lưu động',
                  'Địa điểm tổ chức vượt quá bán kính phục vụ',
                ].map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => setCancelRefundReason(txt)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer',
                    }}
                  >
                    {txt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelRefundBooking(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCancelRefundSubmit}
                disabled={!cancelRefundReason.trim()}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: !cancelRefundReason.trim() ? '#CBD5E1' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: !cancelRefundReason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Xác nhận Hủy &amp; Hoàn cọc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: BILL / PHIẾU THU TIỀN ĐẶT CỌC CHÍNH THỨC */}
      <CateringDepositReceiptModal
        receipt={depositReceiptBooking}
        onClose={() => setDepositReceiptBooking(null)}
      />
    </div>
  );
};
