// ==============================================================================
// DineGo Frontend — Standalone Driver Partner Portal & Customer Order Tracking
// - Each Driver has their own dedicated DriverProfile & User Account (1-to-1)
// - Includes Driver Account & Vehicle Management ('driver-profile')
// - No cross-role switching buttons (Logout only)
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Bike,
  MapPin,
  Phone,
  CheckCircle2,
  Navigation,
  Store,
  Crosshair,
  RotateCcw,
  Star,
  Wallet,
  ClipboardList,
  ArrowUpRight,
  LogOut,
  User as UserIcon,
  Save,
  Lock,
  ShieldAlert,
  History,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Package,
  StickyNote,
  Check,
  X,
  AlertTriangle,
  Camera,
  Upload,
  MessageSquare,
  Banknote,
  QrCode,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { VietQrPaymentModal } from '../components/common/VietQrPaymentModal';
import type {
  DeliveryDisputeReason,
  DeliveryDisputeReport,
  DriverProfile,
  DriverShift,
  MenuItem,
  Merchant,
  Order,
  OrderItem,
  OrderStatus,
  OrderChatChannel,
  User,
} from '../types';
import { OrderChatModal } from '../components/common/OrderChatModal';
import type { NavTab } from '../components/common/Header';
import {
  MOCK_DRIVERS,
  MOCK_MENU_ITEMS,
  MOCK_MERCHANTS,
  adminApi,
  isDriverProfileVerified,
} from '../api/client';
import { DeliveryMap } from '../components/common/DeliveryMap';
import { NotificationBell } from '../components/common/NotificationBell';
import {
  calculateBearingDeg,
  calculateHaversineKm,
  fetchRoadRoute,
  publishLiveTracking,
  readLiveTracking,
  resolveCustomerCoords,
  resolveDriverStartCoords,
  resolveMerchantCoords,
  subscribeLiveTracking,
  syncGpsToBackend,
  type LatLngPoint,
  type LiveOrderTrackingPayload,
} from '../utils/routing';

type TrackingStatus =
  | 'ASSIGNED'
  | 'ARRIVED_AT_STORE'
  | 'DELIVERING'
  | 'ARRIVED_AT_DESTINATION'
  | 'DELIVERED';

interface TrackingState {
  orderNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  customerAddress: string;
  driverName: string;
  driverPhone: string;
  licensePlate: string;
  driverRating: number;
  status: TrackingStatus;
  currentLat: number;
  currentLng: number;
  heading: number;
  storeLat: number;
  storeLng: number;
  customerLat: number;
  customerLng: number;
  distanceKm: number;
  etaMinutes: number;
}

function formatShiftDateTime(iso: string | null): string {
  if (!iso) return 'Đang hoạt động';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatShiftDuration(startedAt: string, endedAt: string | null, referenceMs: number): string {
  const startMs = new Date(startedAt).getTime();
  const endMs = endedAt ? new Date(endedAt).getTime() : referenceMs;
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return '—';
  const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return `${hours} giờ ${mins} phút`;
  if (mins > 0) return `${mins} phút ${secs} giây`;
  return `${secs} giây`;
}

function resolveOrderMerchantMeta(order: Order, merchantsList: Merchant[]) {
  const matched =
    merchantsList.find((m) => m.id === order.merchant?.id) ||
    merchantsList.find(
      (m) => m.name.trim().toLowerCase() === (order.merchant?.name || '').trim().toLowerCase(),
    );
  const rawAddr = (order.merchant?.address || '').trim();
  const cleanAddr =
    rawAddr && rawAddr !== 'Địa chỉ quán'
      ? rawAddr
      : matched?.address || 'Đang cập nhật địa chỉ quán';
  return {
    name: order.merchant?.name || matched?.name || 'Đối tác nhà hàng',
    address: cleanAddr,
    phoneNumber: order.merchant?.phoneNumber || matched?.phoneNumber || '—',
    logoUrl: order.merchant?.logoUrl || matched?.logoUrl || null,
    latitude: order.merchant?.latitude ?? matched?.latitude,
    longitude: order.merchant?.longitude ?? matched?.longitude,
  };
}

function resolveOrderDishImage(
  item: OrderItem,
  order: Order,
  menuMap: Record<string, MenuItem[]>,
  merchantsList: Merchant[],
): string | null {
  if (item.itemImage) return item.itemImage;
  const merchantMeta = resolveOrderMerchantMeta(order, merchantsList);
  const matchedMerchant =
    merchantsList.find((m) => m.id === order.merchant?.id) ||
    merchantsList.find(
      (m) => m.name.trim().toLowerCase() === merchantMeta.name.trim().toLowerCase(),
    );
  const candidateLists: MenuItem[][] = [
    menuMap[order.merchant?.id || ''] || [],
    matchedMerchant ? menuMap[matchedMerchant.id] || [] : [],
    ...Object.values(menuMap),
    ...Object.values(MOCK_MENU_ITEMS),
  ];
  const targetName = (item.itemName || '').trim().toLowerCase();
  for (const list of candidateLists) {
    const found = list.find((d) => d.name.trim().toLowerCase() === targetName && d.imageUrl);
    if (found?.imageUrl) return found.imageUrl;
  }
  return merchantMeta.logoUrl;
}

function translateOrderStatusLabel(status: OrderStatus): {
  label: string;
  bg: string;
  color: string;
} {
  switch (status) {
    case 'PENDING':
      return { label: 'Đơn mới • Chờ nhận', bg: '#FEF3C7', color: '#B45309' };
    case 'CONFIRMED':
      return { label: 'Đã xác nhận • Chờ tới quán', bg: '#E0F2FE', color: '#0369A1' };
    case 'PREPARING':
      return { label: 'Bếp đang chuẩn bị món', bg: '#EDE9FE', color: '#6D28D9' };
    case 'READY_FOR_PICKUP':
      return { label: 'Món đã xong • Chờ lấy', bg: '#DCFCE7', color: '#15803D' };
    case 'DELIVERING':
      return { label: 'Đang giao tới khách', bg: '#DBEAFE', color: '#1D4ED8' };
    case 'COMPLETED':
      return { label: 'Đã hoàn tất', bg: '#DCFCE7', color: '#166534' };
    case 'CANCELLED':
      return { label: 'Đã hủy', bg: '#FEE2E2', color: '#DC2626' };
  }
}

function estimateOrderRouteMetrics(
  order: Order,
  merchantMeta: ReturnType<typeof resolveOrderMerchantMeta>,
) {
  const storePt =
    typeof merchantMeta.latitude === 'number' && typeof merchantMeta.longitude === 'number'
      ? { lat: merchantMeta.latitude, lng: merchantMeta.longitude }
      : resolveMerchantCoords(order.merchant?.id, merchantMeta.address);
  const custPt =
    typeof order.deliveryLatitude === 'number' && typeof order.deliveryLongitude === 'number'
      ? { lat: order.deliveryLatitude, lng: order.deliveryLongitude }
      : resolveCustomerCoords(order.deliveryAddress || '', storePt);
  const distKm = Math.max(0.2, Math.round(calculateHaversineKm(storePt, custPt) * 10) / 10);
  const etaMins = Math.max(5, Math.ceil(distKm * 3.5 + 3));
  return { distanceKm: distKm, etaMinutes: etaMins };
}

const DISPUTE_REASON_LABELS: Record<DeliveryDisputeReason, string> = {
  NO_ANSWER: 'Khách không nghe máy / Chặn liên lạc nhiều lần (>10 phút)',
  REFUSED_ORDER: 'Khách từ chối nhận hàng / Bom đơn không lý do',
  WRONG_ADDRESS: 'Địa chỉ sai / Không có người nhận tại điểm giao',
  UNABLE_COLLECT: 'Từ chối thanh toán COD khi nhận món',
  ADDRESS_TOO_FAR: 'Khách tự ý đổi địa chỉ xa (>1km) không chịu trả phụ phí',
};

function compressEvidenceFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh'));
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      const img = new Image();
      img.onload = () => {
        const maxDim = 680;
        const ratio = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(raw);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

function generateGpsEvidenceCard(params: {
  orderNumber: string;
  driverName: string;
  licensePlate: string;
  lat: number;
  lng: number;
  distanceKm: number;
  customerAddress: string;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 640, 360);
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 612, 332);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('DINEGO GPS EVIDENCE SNAPSHOT', 32, 54);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`Đơn hàng: #${params.orderNumber}`, 32, 98);
  ctx.fillText(`Tài xế: ${params.driverName} (${params.licensePlate})`, 32, 130);

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(
    `GPS hiện trường: ${params.lat.toFixed(5)}°N, ${params.lng.toFixed(5)}°E`,
    32,
    176,
  );
  ctx.fillText(`Khoảng cách tới điểm giao: ${params.distanceKm.toFixed(2)} km`, 32, 208);

  ctx.fillStyle = '#FCD34D';
  ctx.font = '15px sans-serif';
  ctx.fillText(`Địa chỉ giao: ${params.customerAddress.slice(0, 56)}`, 32, 254);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Ghi nhận lúc: ${new Date().toLocaleString('vi-VN')}`, 32, 304);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export interface TrackingPageProps {
  activeOrder?: Order | null;
  allOrders?: Order[];
  activeTab?: NavTab;
  onNavigate?: (tab: NavTab) => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrderDetails?: (orderId: string, updates: Partial<Order>) => void;
  onAcceptDriverOrder?: (orderId: string, driver: DriverProfile) => void;
  onMarkDriverArrivedAtStore?: (orderId: string) => void;
  onConfirmCustomerReceipt?: (orderId: string) => void;
  isDriverMode?: boolean;
  currentDriver?: DriverProfile;
  currentUser?: User | null;
  onUpdateDriverProfile?: (updatedDriver: DriverProfile, updatedUser?: User) => void;
  merchants?: Merchant[];
  menuItemsMap?: Record<string, MenuItem[]>;
  driverShifts?: DriverShift[];
  onStartDriverShift?: (driver: DriverProfile) => void;
  onEndDriverShift?: (driverId: string, reason?: 'MANUAL_OFFLINE' | 'LOGOUT') => void;
  driverDisputes?: DeliveryDisputeReport[];
  onSubmitDeliveryDispute?: (report: DeliveryDisputeReport) => void;
  onOpenReviewModal?: (order: Order) => void;
  onExploreFood?: () => void;
  onLogout?: () => void;
}

export const TrackingPage: React.FC<TrackingPageProps> = ({
  activeOrder,
  allOrders = [],
  activeTab = 'tracking',
  onNavigate,
  onUpdateOrderStatus,
  onUpdateOrderDetails,
  onAcceptDriverOrder,
  onMarkDriverArrivedAtStore,
  onConfirmCustomerReceipt,
  isDriverMode = false,
  currentDriver = MOCK_DRIVERS[0],
  currentUser,
  onUpdateDriverProfile,
  merchants = MOCK_MERCHANTS,
  menuItemsMap = MOCK_MENU_ITEMS,
  driverShifts = [],
  onStartDriverShift,
  onEndDriverShift,
  driverDisputes = [],
  onSubmitDeliveryDispute,
  onOpenReviewModal,
  onExploreFood,
  onLogout,
}) => {
  const isDriverPortal =
    isDriverMode || String(activeTab).startsWith('driver-');
  const isDriverApproved = isDriverProfileVerified(currentDriver);
  const [driverOnline, setDriverOnline] = useState(
    isDriverApproved && currentDriver.status !== 'OFFLINE',
  );
  const [shiftHistoryFilter, setShiftHistoryFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED'>('ALL');
  const [expandedShiftIds, setExpandedShiftIds] = useState<Record<string, boolean>>({});
  const [checkedPickupItems, setCheckedPickupItems] = useState<Record<string, boolean>>({});
  const [previewFoodImage, setPreviewFoodImage] = useState<{ src: string; title: string } | null>(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState<DeliveryDisputeReason>('NO_ANSWER');
  const [disputeCallCount, setDisputeCallCount] = useState<number>(3);
  const [disputeWaitMins, setDisputeWaitMins] = useState<number>(10);
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeEvidenceImages, setDisputeEvidenceImages] = useState<string[]>([]);
  const [disputeError, setDisputeError] = useState('');
  const [disputeSuccessBanner, setDisputeSuccessBanner] = useState('');
  const [isOrderChatOpen, setIsOrderChatOpen] = useState(false);
  const [orderChatDefaultChannel, setOrderChatDefaultChannel] = useState<OrderChatChannel>('CUSTOMER_MERCHANT');
  const [vietQrPaymentOrder, setVietQrPaymentOrder] = useState<Order | null>(null);

  const handleOpenOrderChat = (channel: OrderChatChannel = 'CUSTOMER_MERCHANT') => {
    setOrderChatDefaultChannel(channel);
    setIsOrderChatOpen(true);
  };

  const handleConfirmCashPayment = (targetOrder: Order) => {
    const confirmed = window.confirm(
      `Xác nhận bạn đã thu đủ ${(targetOrder.finalTotal || 0).toLocaleString('vi-VN')}đ tiền mặt từ khách hàng?`
    );
    if (!confirmed) return;

    const updated: Order = {
      ...targetOrder,
      paymentStatus: 'PAID',
      payment: {
        id: targetOrder.payment?.id || `pay-${Date.now()}`,
        paymentMethod: 'COD',
        paymentStatus: 'SUCCESS',
        amount: targetOrder.finalTotal,
        currency: 'VND',
        transactionRef: 'COD-CASH-CONFIRMED',
        paidAt: new Date().toISOString(),
      },
    };

    onUpdateOrderDetails?.(targetOrder.id, {
      paymentStatus: 'PAID',
      payment: updated.payment,
    });
    try {
      const savedAll = localStorage.getItem('dinego_all_orders');
      if (savedAll) {
        const list: Order[] = JSON.parse(savedAll);
        const next = list.map((o) => (o.id === targetOrder.id ? updated : o));
        localStorage.setItem('dinego_all_orders', JSON.stringify(next));
      }
      const savedCust = localStorage.getItem('dinego_customer_orders');
      if (savedCust) {
        const list: Order[] = JSON.parse(savedCust);
        const next = list.map((o) => (o.id === targetOrder.id ? updated : o));
        localStorage.setItem('dinego_customer_orders', JSON.stringify(next));
      }
    } catch (e) {
      console.error('Failed to sync cash payment:', e);
    }

    window.dispatchEvent(
      new CustomEvent('dinego_order_payment_updated', {
        detail: { orderId: targetOrder.id, updatedOrder: updated },
      })
    );
    alert(`✓ Đã xác nhận thu đủ ${(targetOrder.finalTotal || 0).toLocaleString('vi-VN')}đ tiền mặt!`);
  };

  useEffect(() => {
    const handlePaymentUpdated = (e: any) => {
      const { updatedOrder } = e.detail || {};
      if (updatedOrder && activeOrder && updatedOrder.id === activeOrder.id) {
        onUpdateOrderDetails?.(updatedOrder.id, {
          paymentStatus: updatedOrder.paymentStatus,
          payment: updatedOrder.payment,
        });
      }
    };
    window.addEventListener('dinego_order_payment_updated', handlePaymentUpdated);
    return () => {
      window.removeEventListener('dinego_order_payment_updated', handlePaymentUpdated);
    };
  }, [activeOrder?.id]);
  const [shiftTickMs, setShiftTickMs] = useState<number>(() => Date.now());
  const activeShift = driverShifts.find((s) => s.status === 'ACTIVE') || null;
  const [withdrawnNotice, setWithdrawnNotice] = useState(false);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [driverWithdrawals, setDriverWithdrawals] = useState<
    Array<{
      id: string;
      driverId: string;
      driverName: string;
      driverPhone: string;
      licensePlate: string;
      bankName: string;
      bankAccountNumber: string;
      bankAccountHolder: string;
      amount: number;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      note?: string;
      createdAt: string;
      processedAt?: string;
    }>
  >(() => {
    try {
      const saved = localStorage.getItem('dinego_driver_withdrawals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dinego_driver_withdrawals', JSON.stringify(driverWithdrawals));
    } catch {}
  }, [driverWithdrawals]);

  const [adminComplaints, setAdminComplaints] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('dinego_admin_complaints');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('dinego_admin_complaints');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setAdminComplaints(parsed);
        }
      } catch {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('dinego_complaints_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('dinego_complaints_updated', handleSync);
    };
  }, []);

  const [profileSavedNotice, setProfileSavedNotice] = useState('');
  const [profileErrorNotice, setProfileErrorNotice] = useState('');

  // Editable Driver Profile fields
  const [drvFullName, setDrvFullName] = useState(currentDriver.fullName);
  const [drvPhone, setDrvPhone] = useState(currentDriver.phoneNumber);
  const [drvEmail, setDrvEmail] = useState(currentDriver.email);
  const [drvNationalId, setDrvNationalId] = useState(currentDriver.nationalId);
  const [drvLicenseNum, setDrvLicenseNum] = useState(currentDriver.driverLicenseNumber);
  const [drvVehicleType, setDrvVehicleType] = useState(currentDriver.vehicleType);
  const [drvLicensePlate, setDrvLicensePlate] = useState(currentDriver.licensePlate);
  const [drvZone, setDrvZone] = useState(currentDriver.operatingZone);
  const [drvBankName, setDrvBankName] = useState(currentDriver.bankName);
  const [drvBankAcc, setDrvBankAcc] = useState(currentDriver.bankAccountNumber);
  const [drvBankHolder, setDrvBankHolder] = useState(currentDriver.bankAccountHolder);
  const [drvEmergency, setDrvEmergency] = useState(currentDriver.emergencyContact || '');
  const [drvPortraitUrl, setDrvPortraitUrl] = useState(
    currentDriver.portraitUrl || currentDriver.avatarUrl || '',
  );
  const [drvDriverLicenseImg, setDrvDriverLicenseImg] = useState(
    currentDriver.driverLicenseFrontUrl || '',
  );
  const [drvNationalIdImg, setDrvNationalIdImg] = useState(
    currentDriver.nationalIdFrontUrl || '',
  );
  const [drvNewPassword, setDrvNewPassword] = useState('');

  useEffect(() => {
    setDrvFullName(currentDriver.fullName);
    setDrvPhone(currentDriver.phoneNumber);
    setDrvEmail(currentDriver.email);
    setDrvNationalId(currentDriver.nationalId);
    setDrvLicenseNum(currentDriver.driverLicenseNumber);
    setDrvVehicleType(currentDriver.vehicleType);
    setDrvLicensePlate(currentDriver.licensePlate);
    setDrvZone(currentDriver.operatingZone);
    setDrvBankName(currentDriver.bankName);
    setDrvBankAcc(currentDriver.bankAccountNumber);
    setDrvBankHolder(currentDriver.bankAccountHolder);
    setDrvEmergency(currentDriver.emergencyContact || '');
    setDrvPortraitUrl(currentDriver.portraitUrl || currentDriver.avatarUrl || '');
    setDrvDriverLicenseImg(currentDriver.driverLicenseFrontUrl || '');
    setDrvNationalIdImg(currentDriver.nationalIdFrontUrl || '');
    setDriverOnline(isDriverProfileVerified(currentDriver) && currentDriver.status !== 'OFFLINE');
    setProfileErrorNotice('');
  }, [currentDriver]);

  useEffect(() => {
    if (!isDriverPortal || !activeShift) return;
    const timer = setInterval(() => {
      setShiftTickMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isDriverPortal, activeShift]);

  const handleToggleDriverShiftOnline = () => {
    if (!isDriverApproved) return;
    const nextOnline = !driverOnline;
    setDriverOnline(nextOnline);
    const updatedDriver: DriverProfile = {
      ...currentDriver,
      status: nextOnline ? 'ONLINE' : 'OFFLINE',
    };
    onUpdateDriverProfile?.(updatedDriver);
    if (nextOnline) {
      onStartDriverShift?.(updatedDriver);
    } else {
      onEndDriverShift?.(currentDriver.id, 'MANUAL_OFFLINE');
    }
  };

  const initialStore =
    activeOrder?.merchant?.latitude != null && activeOrder?.merchant?.longitude != null
      ? { lat: activeOrder.merchant.latitude, lng: activeOrder.merchant.longitude }
      : activeOrder
      ? resolveMerchantCoords(activeOrder.merchant?.id, activeOrder.merchant?.address)
      : { lat: 10.7769, lng: 106.7009 };
  const initialCustomerAddress = activeOrder?.deliveryAddress || '';
  const initialCustomer =
    activeOrder?.deliveryLatitude != null && activeOrder?.deliveryLongitude != null
      ? { lat: activeOrder.deliveryLatitude, lng: activeOrder.deliveryLongitude }
      : activeOrder
      ? resolveCustomerCoords(initialCustomerAddress, initialStore)
      : initialStore;
  const initialDriverStart = resolveDriverStartCoords(initialStore, currentDriver.id);

  const [tracking, setTracking] = useState<TrackingState>(() => {
    if (!activeOrder) {
      return {
        orderNumber: '',
        restaurantName: '',
        restaurantAddress: '',
        customerAddress: '',
        driverName: currentDriver.fullName,
        driverPhone: currentDriver.phoneNumber,
        licensePlate: currentDriver.licensePlate,
        driverRating: currentDriver.rating,
        status: 'ASSIGNED',
        currentLat: initialStore.lat,
        currentLng: initialStore.lng,
        heading: 0,
        storeLat: initialStore.lat,
        storeLng: initialStore.lng,
        customerLat: initialStore.lat,
        customerLng: initialStore.lng,
        distanceKm: 0,
        etaMinutes: 0,
      };
    }

    const orderNum = activeOrder.orderNumber;
    const existingSync = readLiveTracking(orderNum);
    if (existingSync) {
      return {
        orderNumber: existingSync.orderNumber,
        restaurantName: existingSync.storeName,
        restaurantAddress: existingSync.storeAddress,
        customerAddress: existingSync.customerAddress,
        driverName: existingSync.driverName,
        driverPhone: existingSync.driverPhone,
        licensePlate: existingSync.licensePlate,
        driverRating: existingSync.driverRating,
        status: existingSync.status === 'PICKED_UP' ? 'DELIVERING' : existingSync.status,
        currentLat: existingSync.currentLat,
        currentLng: existingSync.currentLng,
        heading: existingSync.heading,
        storeLat: existingSync.storeLat,
        storeLng: existingSync.storeLng,
        customerLat: existingSync.customerLat,
        customerLng: existingSync.customerLng,
        distanceKm: existingSync.distanceKm,
        etaMinutes: existingSync.etaMinutes,
      };
    }

    const isPreDelivery =
      activeOrder.status === 'PENDING' ||
      activeOrder.status === 'CONFIRMED' ||
      activeOrder.status === 'PREPARING' ||
      activeOrder.status === 'READY_FOR_PICKUP';
    const initialStatus: TrackingStatus =
      activeOrder.status === 'COMPLETED'
        ? 'DELIVERED'
        : isPreDelivery
        ? activeOrder.driverArrivedAtStore
          ? 'ARRIVED_AT_STORE'
          : 'ASSIGNED'
        : 'DELIVERING';
    const startShipperPt =
      initialStatus === 'ASSIGNED'
        ? initialDriverStart
        : initialStatus === 'DELIVERED'
        ? initialCustomer
        : initialStore;
    const startDist = calculateHaversineKm(startShipperPt, initialCustomer);
    return {
      orderNumber: orderNum,
      restaurantName: activeOrder.merchant?.name || '',
      restaurantAddress: activeOrder.merchant?.address || '',
      customerAddress: initialCustomerAddress,
      driverName: currentDriver.fullName,
      driverPhone: currentDriver.phoneNumber,
      licensePlate: currentDriver.licensePlate,
      driverRating: currentDriver.rating,
      status: initialStatus,
      currentLat: startShipperPt.lat,
      currentLng: startShipperPt.lng,
      heading: calculateBearingDeg(
        startShipperPt,
        initialStatus === 'ASSIGNED' ? initialStore : initialCustomer,
      ),
      storeLat: initialStore.lat,
      storeLng: initialStore.lng,
      customerLat: initialCustomer.lat,
      customerLng: initialCustomer.lng,
      distanceKm: startDist,
      etaMinutes: Math.max(4, Math.ceil(startDist * 3.5)),
    };
  });

  const [routePoints, setRoutePoints] = useState<[number, number][]>([
    [initialStore.lat, initialStore.lng],
    [initialCustomer.lat, initialCustomer.lng],
  ]);
  const [driverToStorePoints, setDriverToStorePoints] = useState<[number, number][]>([]);
  const [routeSource, setRouteSource] = useState<'osrm' | 'fallback'>('osrm');
  const [gpsStatusNotice, setGpsStatusNotice] = useState('');
  const [isAutoMoving, setIsAutoMoving] = useState(false);

  // --- Delivery Dispute & Operational Mechanism States (Images 1-6) ---
  const [waitTimerActive, setWaitTimerActive] = useState(false);
  const [waitTimerSeconds, setWaitTimerSeconds] = useState(600); // 10 minutes SLA countdown
  const [customerCallLogs, setCustomerCallLogs] = useState<string[]>([]);
  const [storeWaitSeconds, setStoreWaitSeconds] = useState(0);
  const [claimedStoreWaitBonus, setClaimedStoreWaitBonus] = useState(false);
  const [isDivertModalOpen, setIsDivertModalOpen] = useState(false);
  const [divertNewAddress, setDivertNewAddress] = useState('');
  const [divertExtraKm, setDivertExtraKm] = useState(2);
  const [divertSuccessNotice, setDivertSuccessNotice] = useState('');

  // 10-Minute SLA Wait Timer Effect
  useEffect(() => {
    if (!waitTimerActive || waitTimerSeconds <= 0) return;
    const interval = setInterval(() => {
      setWaitTimerSeconds((prev) => {
        if (prev <= 1) {
          setWaitTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [waitTimerActive, waitTimerSeconds]);

  // Store Delay Timer Effect (counts elapsed time at store until merchant hands over food)
  useEffect(() => {
    const isAtStoreWaiting =
      tracking.status === 'ARRIVED_AT_STORE' &&
      !activeOrder?.merchantConfirmedPickup &&
      activeOrder?.status !== 'DELIVERING' &&
      activeOrder?.status !== 'COMPLETED';
    if (!isAtStoreWaiting) return;
    const interval = setInterval(() => {
      setStoreWaitSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [tracking.status, activeOrder?.merchantConfirmedPickup, activeOrder?.status]);

  const routeCursorRef = useRef<number>(0);
  const prevActiveOrderIdRef = useRef<string | null>(activeOrder?.id || null);
  const latestTrackingRef = useRef<TrackingState>(tracking);
  latestTrackingRef.current = tracking;

  const broadcastTrackingState = (nextState: TrackingState) => {
    const payload: LiveOrderTrackingPayload = {
      orderId: activeOrder?.id,
      orderNumber: nextState.orderNumber,
      status: nextState.status,
      currentLat: nextState.currentLat,
      currentLng: nextState.currentLng,
      heading: nextState.heading,
      distanceKm: nextState.distanceKm,
      etaMinutes: nextState.etaMinutes,
      storeLat: nextState.storeLat,
      storeLng: nextState.storeLng,
      storeName: nextState.restaurantName,
      storeAddress: nextState.restaurantAddress,
      customerLat: nextState.customerLat,
      customerLng: nextState.customerLng,
      customerAddress: nextState.customerAddress,
      driverId: currentDriver.id,
      driverName: nextState.driverName,
      driverPhone: nextState.driverPhone,
      licensePlate: nextState.licensePlate,
      driverRating: nextState.driverRating,
      updatedAt: new Date().toISOString(),
    };
    publishLiveTracking(payload);
  };

  useEffect(() => {
    if (activeOrder) {
      const orderChanged = prevActiveOrderIdRef.current !== activeOrder.id;
      prevActiveOrderIdRef.current = activeOrder.id;

      let mappedStatus: TrackingStatus = 'DELIVERING';
      if (activeOrder.status === 'PENDING' || activeOrder.status === 'CONFIRMED') {
        mappedStatus = activeOrder.driverArrivedAtStore ? 'ARRIVED_AT_STORE' : 'ASSIGNED';
      } else if (activeOrder.status === 'PREPARING' || activeOrder.status === 'READY_FOR_PICKUP') {
        mappedStatus = activeOrder.driverArrivedAtStore ? 'ARRIVED_AT_STORE' : 'ASSIGNED';
      } else if (activeOrder.status === 'DELIVERING') {
        mappedStatus = 'DELIVERING';
      } else if (activeOrder.status === 'COMPLETED') {
        mappedStatus = 'DELIVERED';
      }

      const nextStore =
        activeOrder.merchant?.latitude != null && activeOrder.merchant?.longitude != null
          ? { lat: activeOrder.merchant.latitude, lng: activeOrder.merchant.longitude }
          : resolveMerchantCoords(
              activeOrder.merchant?.id,
              activeOrder.merchant?.address,
            );
      const nextCustomer =
        activeOrder.deliveryLatitude != null && activeOrder.deliveryLongitude != null
          ? { lat: activeOrder.deliveryLatitude, lng: activeOrder.deliveryLongitude }
          : resolveCustomerCoords(
              activeOrder.deliveryAddress,
              nextStore,
            );
      const synced = readLiveTracking(activeOrder.orderNumber);
      const fallbackShipper =
        mappedStatus === 'ASSIGNED'
          ? resolveDriverStartCoords(nextStore, currentDriver.id)
          : mappedStatus === 'DELIVERED'
          ? nextCustomer
          : nextStore;

      setTracking((prev) => {
        const useSyncedCoords =
          synced && prev.orderNumber === synced.orderNumber
            ? {
                lat: synced.currentLat,
                lng: synced.currentLng,
                heading: synced.heading,
                dist: synced.distanceKm,
                eta: synced.etaMinutes,
              }
            : synced && !isDriverPortal
            ? {
                lat: synced.currentLat,
                lng: synced.currentLng,
                heading: synced.heading,
                dist: synced.distanceKm,
                eta: synced.etaMinutes,
              }
            : null;

        const baseDist =
          mappedStatus === 'DELIVERED'
            ? 0
            : calculateHaversineKm(fallbackShipper, nextCustomer);

        const resolvedDriverStatus: TrackingStatus =
          isDriverPortal && prev.orderNumber === activeOrder.orderNumber
            ? prev.status === 'ARRIVED_AT_DESTINATION' && mappedStatus === 'DELIVERING'
              ? 'ARRIVED_AT_DESTINATION'
              : prev.status === 'ARRIVED_AT_STORE' && mappedStatus === 'ASSIGNED'
              ? 'ARRIVED_AT_STORE'
              : mappedStatus
            : mappedStatus;

        return {
          ...prev,
          orderNumber: activeOrder.orderNumber,
          restaurantName: activeOrder.merchant?.name || prev.restaurantName,
          restaurantAddress: activeOrder.merchant?.address || prev.restaurantAddress,
          customerAddress: activeOrder.deliveryAddress || prev.customerAddress,
          driverName: currentDriver.fullName,
          driverPhone: currentDriver.phoneNumber,
          licensePlate: currentDriver.licensePlate,
          driverRating: currentDriver.rating,
          status:
            synced && !isDriverPortal
              ? synced.status === 'PICKED_UP'
                ? 'DELIVERING'
                : synced.status
              : resolvedDriverStatus,
          storeLat: nextStore.lat,
          storeLng: nextStore.lng,
          customerLat: nextCustomer.lat,
          customerLng: nextCustomer.lng,
          currentLat: useSyncedCoords ? useSyncedCoords.lat : fallbackShipper.lat,
          currentLng: useSyncedCoords ? useSyncedCoords.lng : fallbackShipper.lng,
          heading: useSyncedCoords
            ? useSyncedCoords.heading
            : calculateBearingDeg(fallbackShipper, nextCustomer),
          distanceKm: useSyncedCoords ? useSyncedCoords.dist : baseDist,
          etaMinutes: useSyncedCoords
            ? useSyncedCoords.eta
            : mappedStatus === 'DELIVERED'
            ? 0
            : Math.max(3, Math.ceil(baseDist * 3.5)),
        };
      });
      if (orderChanged) {
        routeCursorRef.current = 0;
      }
    } else {
      prevActiveOrderIdRef.current = null;
      setIsAutoMoving(false);
      setGpsStatusNotice('');
      setRoutePoints([]);
      setDriverToStorePoints([]);
      setTracking((prev) => ({
        ...prev,
        orderNumber: '',
        restaurantName: '',
        restaurantAddress: '',
        customerAddress: '',
        driverName: currentDriver.fullName,
        driverPhone: currentDriver.phoneNumber,
        licensePlate: currentDriver.licensePlate,
        driverRating: currentDriver.rating,
        status: 'ASSIGNED',
        distanceKm: 0,
        etaMinutes: 0,
      }));
    }
  }, [activeOrder, currentDriver, isDriverPortal]);

  // Fetch real OpenStreetMap / OSRM road route whenever Store or Customer changes
  useEffect(() => {
    let cancelled = false;
    if (!activeOrder || !tracking.orderNumber) {
      setRoutePoints([]);
      return;
    }
    const storePt: LatLngPoint = { lat: tracking.storeLat, lng: tracking.storeLng };
    const custPt: LatLngPoint = {
      lat: tracking.customerLat,
      lng: tracking.customerLng,
    };

    fetchRoadRoute([storePt, custPt]).then((res) => {
      if (cancelled) return;
      setRoutePoints(res.coordinates);
      setRouteSource(res.source);

      // Update planned distance if shipper is still at store before departure
      const cur = latestTrackingRef.current;
      const distFromStore = calculateHaversineKm(
        { lat: cur.currentLat, lng: cur.currentLng },
        storePt,
      );
      if (
        (cur.status === 'ARRIVED_AT_STORE' || cur.status === 'ASSIGNED') &&
        distFromStore < 0.05
      ) {
        setTracking((prev) => ({
          ...prev,
          distanceKm: res.distanceKm,
          etaMinutes: res.durationMin,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeOrder, tracking.orderNumber, tracking.storeLat, tracking.storeLng, tracking.customerLat, tracking.customerLng]);

  // Fetch approach route (Driver -> Store) when status is ASSIGNED
  useEffect(() => {
    let cancelled = false;
    if (!activeOrder || !tracking.orderNumber || tracking.status !== 'ASSIGNED') {
      setDriverToStorePoints([]);
      return;
    }
    const startPt: LatLngPoint = {
      lat: tracking.currentLat,
      lng: tracking.currentLng,
    };
    const storePt: LatLngPoint = {
      lat: tracking.storeLat,
      lng: tracking.storeLng,
    };
    fetchRoadRoute([startPt, storePt]).then((res) => {
      if (!cancelled) {
        setDriverToStorePoints(res.coordinates);
      }
    });
    return () => {
      cancelled = true;
    };
    // Only re-fetch driver->store route when order changes or status enters ASSIGNED
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder, tracking.status, tracking.storeLat, tracking.storeLng, tracking.orderNumber]);

  // Subscribe to live BroadcastChannel updates from Driver tab when viewing as Customer
  useEffect(() => {
    if (isDriverPortal || !tracking.orderNumber) return;
    return subscribeLiveTracking(tracking.orderNumber, (payload) => {
      setTracking((prev) => ({
        ...prev,
        status: payload.status === 'PICKED_UP' ? 'DELIVERING' : payload.status,
        currentLat: payload.currentLat,
        currentLng: payload.currentLng,
        heading: payload.heading,
        distanceKm: payload.distanceKm,
        etaMinutes: payload.etaMinutes,
        driverName: payload.driverName,
        driverPhone: payload.driverPhone,
        licensePlate: payload.licensePlate,
      }));
    });
  }, [isDriverPortal, tracking.orderNumber]);

  // Smooth step-by-step GPS simulation following actual OSRM street coordinates
  useEffect(() => {
    if (!isAutoMoving) return;

    const timer = setInterval(() => {
      const cur = latestTrackingRef.current;
      if (cur.status === 'DELIVERED') {
        setIsAutoMoving(false);
        return;
      }

      const hasMerchantConfirmedPickup =
        Boolean(activeOrder?.merchantConfirmedPickup) ||
        activeOrder?.status === 'DELIVERING' ||
        activeOrder?.status === 'COMPLETED';

      // Advance from ARRIVED_AT_STORE into DELIVERING only after merchant confirms handover
      let workingStatus: TrackingStatus = cur.status;
      if (workingStatus === 'ARRIVED_AT_STORE') {
        if (!hasMerchantConfirmedPickup) {
          setIsAutoMoving(false);
          setGpsStatusNotice(
            'Đã tới quán! Vui lòng chờ Cửa hàng bấm "Xác nhận bàn giao món cho Tài xế" để mở khóa bước lấy hàng.',
          );
          return;
        }
        workingStatus = 'DELIVERING';
        routeCursorRef.current = 0;
        syncWithGlobalOrder('DELIVERING');
      }

      const activePoly =
        workingStatus === 'ASSIGNED' && driverToStorePoints.length >= 2
          ? driverToStorePoints
          : routePoints;

      if (activePoly.length < 2) return;

      const stride = Math.max(1, Math.floor(activePoly.length / 26));
      const nextIdx = Math.min(activePoly.length - 1, routeCursorRef.current + stride);
      routeCursorRef.current = nextIdx;

      const [nextLat, nextLng] = activePoly[nextIdx];
      const nextPt: LatLngPoint = { lat: nextLat, lng: nextLng };
      const prevPt: LatLngPoint = { lat: cur.currentLat, lng: cur.currentLng };
      const heading = calculateBearingDeg(prevPt, nextPt);

      const targetPt: LatLngPoint =
        workingStatus === 'ASSIGNED'
          ? { lat: cur.storeLat, lng: cur.storeLng }
          : { lat: cur.customerLat, lng: cur.customerLng };

      const distToTarget = calculateHaversineKm(nextPt, targetPt);
      const isLastPoint = nextIdx >= activePoly.length - 1;

      if (workingStatus === 'ASSIGNED' && (distToTarget <= 0.1 || isLastPoint)) {
        const arrivedStoreState: TrackingState = {
          ...cur,
          status: 'ARRIVED_AT_STORE',
          currentLat: cur.storeLat,
          currentLng: cur.storeLng,
          heading,
          distanceKm: calculateHaversineKm(
            { lat: cur.storeLat, lng: cur.storeLng },
            { lat: cur.customerLat, lng: cur.customerLng },
          ),
          etaMinutes: Math.max(
            3,
            Math.ceil(
              calculateHaversineKm(
                { lat: cur.storeLat, lng: cur.storeLng },
                { lat: cur.customerLat, lng: cur.customerLng },
              ) * 3.5,
            ),
          ),
        };
        routeCursorRef.current = 0;
        setTracking(arrivedStoreState);
        broadcastTrackingState(arrivedStoreState);
        syncGpsToBackend(activeOrder?.id, cur.storeLat, cur.storeLng, heading);
        syncWithGlobalOrder('ARRIVED_AT_STORE');
        setGpsStatusNotice(
          hasMerchantConfirmedPickup
            ? 'Geofence <100m tại nhà hàng đã kích hoạt! Bấm "2. Đã lấy món & Đi giao" hoặc "Mô phỏng di chuyển GPS" để giao tới khách.'
            : 'Geofence <100m tại nhà hàng đã kích hoạt! Đang chờ Cửa hàng xác nhận bàn giao món để mở khóa "2. Đã lấy món & Đi giao".',
        );
        setIsAutoMoving(false);
        return;
      }

      if (workingStatus === 'DELIVERING' && (distToTarget <= 0.1 || isLastPoint)) {
        const distFinal = Math.min(0.05, distToTarget);
        const arrivedCustState: TrackingState = {
          ...cur,
          status: 'ARRIVED_AT_DESTINATION',
          currentLat: nextLat,
          currentLng: nextLng,
          heading,
          distanceKm: distFinal,
          etaMinutes: 1,
        };
        setTracking(arrivedCustState);
        broadcastTrackingState(arrivedCustState);
        syncGpsToBackend(activeOrder?.id, nextLat, nextLng, heading);
        syncWithGlobalOrder('ARRIVED_AT_DESTINATION');
        setGpsStatusNotice(
          'Đã vào bán kính 100m quanh khách hàng — Sẵn sàng xác nhận giao hàng!',
        );
        setIsAutoMoving(false);
        return;
      }

      const remainingKm =
        workingStatus === 'ASSIGNED'
          ? Math.round(
              (distToTarget +
                calculateHaversineKm(
                  { lat: cur.storeLat, lng: cur.storeLng },
                  { lat: cur.customerLat, lng: cur.customerLng },
                )) *
                100,
            ) / 100
          : Math.round(distToTarget * 100) / 100;

      const updated: TrackingState = {
        ...cur,
        status: workingStatus,
        currentLat: nextLat,
        currentLng: nextLng,
        heading,
        distanceKm: remainingKm,
        etaMinutes: Math.max(1, Math.ceil(remainingKm * 3.5)),
      };

      setTracking(updated);
      broadcastTrackingState(updated);
      syncGpsToBackend(activeOrder?.id, nextLat, nextLng, heading);
    }, 750);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoMoving, routePoints, driverToStorePoints, activeOrder?.id]);

  const syncWithGlobalOrder = (newTrackingStatus: TrackingStatus) => {
    if (!activeOrder) return;
    if (newTrackingStatus === 'ARRIVED_AT_STORE') {
      onMarkDriverArrivedAtStore?.(activeOrder.id);
    } else if (newTrackingStatus === 'DELIVERING' || newTrackingStatus === 'ARRIVED_AT_DESTINATION') {
      onUpdateOrderStatus?.(activeOrder.id, 'DELIVERING');
    } else if (newTrackingStatus === 'DELIVERED') {
      onUpdateOrderStatus?.(activeOrder.id, 'COMPLETED');
    }
  };

  const handleUseDeviceGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatusNotice('Trình duyệt không hỗ trợ Geolocation GPS.');
      return;
    }
    setIsAutoMoving(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        const cur = latestTrackingRef.current;
        const heading =
          pos.coords.heading ??
          calculateBearingDeg({ lat: cur.currentLat, lng: cur.currentLng }, { lat, lng });
        const distToCustomer = calculateHaversineKm(
          { lat, lng },
          { lat: cur.customerLat, lng: cur.customerLng },
        );
        const nextStatus: TrackingStatus =
          distToCustomer <= 0.1 ? 'ARRIVED_AT_DESTINATION' : cur.status;
        const updated: TrackingState = {
          ...cur,
          currentLat: lat,
          currentLng: lng,
          heading,
          status: nextStatus,
          distanceKm: Math.round(distToCustomer * 100) / 100,
          etaMinutes: Math.max(1, Math.ceil(distToCustomer * 3.5)),
        };
        setTracking(updated);
        broadcastTrackingState(updated);
        syncGpsToBackend(activeOrder?.id, lat, lng, heading);
        setGpsStatusNotice(`Đã lấy tọa độ GPS thực tế từ thiết bị (${lat}, ${lng}).`);
      },
      (err) => {
        setGpsStatusNotice(`Không thể truy cập GPS thiết bị: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  const handleMapClickPoint = (point: LatLngPoint) => {
    setIsAutoMoving(false);
    const cur = latestTrackingRef.current;
    const heading = calculateBearingDeg(
      { lat: cur.currentLat, lng: cur.currentLng },
      point,
    );
    const distStore = calculateHaversineKm(point, {
      lat: cur.storeLat,
      lng: cur.storeLng,
    });
    const distCust = calculateHaversineKm(point, {
      lat: cur.customerLat,
      lng: cur.customerLng,
    });

    let nextStatus = cur.status;
    if (cur.status === 'ASSIGNED' && distStore <= 0.1) {
      nextStatus = 'ARRIVED_AT_STORE';
      syncWithGlobalOrder('ARRIVED_AT_STORE');
      setGpsStatusNotice('Geofence <100m quanh nhà hàng được kích hoạt.');
    } else if (cur.status === 'DELIVERING' && distCust <= 0.1) {
      nextStatus = 'ARRIVED_AT_DESTINATION';
      syncWithGlobalOrder('ARRIVED_AT_DESTINATION');
      setGpsStatusNotice('Geofence <100m quanh khách hàng được kích hoạt.');
    } else {
      setGpsStatusNotice(`Đã đặt vị trí GPS tới (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}).`);
    }

    const updated: TrackingState = {
      ...cur,
      currentLat: point.lat,
      currentLng: point.lng,
      heading,
      status: nextStatus,
      distanceKm: Math.round(distCust * 100) / 100,
      etaMinutes: distCust <= 0.1 ? 1 : Math.max(1, Math.ceil(distCust * 3.5)),
    };
    setTracking(updated);
    broadcastTrackingState(updated);
    syncGpsToBackend(activeOrder?.id, point.lat, point.lng, heading);
  };

  const handleStepAction = (nextStatus: TrackingStatus) => {
    const cur = latestTrackingRef.current;
    setGpsStatusNotice('');
    const hasMerchantConfirmedPickup =
      Boolean(activeOrder?.merchantConfirmedPickup) ||
      activeOrder?.status === 'DELIVERING' ||
      activeOrder?.status === 'COMPLETED';

    if (nextStatus === 'ARRIVED_AT_STORE') {
      const distToStoreKm = calculateHaversineKm(
        { lat: cur.currentLat, lng: cur.currentLng },
        { lat: cur.storeLat, lng: cur.storeLng },
      );
      if (distToStoreKm > 0.1) {
        alert(
          `⚠️ Không thể xác nhận có mặt tại quán:\n\nVị trí GPS hiện tại của bạn đang cách nhà hàng ${(distToStoreKm * 1000).toFixed(0)}m (> 100m bán kính cho phép).\n\nTheo quy định chống gian lận của DineGo, tài xế phải di chuyển vào phạm vi 100m quanh nhà hàng mới được bấm "1. Đã đến nhà hàng" để nhận đơn. Vui lòng di chuyển tới quán hoặc dùng nút mô phỏng vị trí gần quán.`,
        );
        return;
      }
      const dist = calculateHaversineKm(
        { lat: cur.storeLat, lng: cur.storeLng },
        { lat: cur.customerLat, lng: cur.customerLng },
      );
      const updated: TrackingState = {
        ...cur,
        status: 'ARRIVED_AT_STORE',
        currentLat: cur.storeLat,
        currentLng: cur.storeLng,
        distanceKm: Math.round(dist * 100) / 100,
        etaMinutes: Math.max(3, Math.ceil(dist * 3.5)),
      };
      routeCursorRef.current = 0;
      setTracking(updated);
      broadcastTrackingState(updated);
      syncWithGlobalOrder('ARRIVED_AT_STORE');
      if (activeOrder?.id) {
        onMarkDriverArrivedAtStore?.(activeOrder.id);
      }
    } else if (nextStatus === 'DELIVERING') {
      if (!hasMerchantConfirmedPickup) {
        alert(
          'Chưa thể lấy món: Cửa hàng chưa bấm "Xác nhận bàn giao món cho Tài xế". Vui lòng đợi cửa hàng xác nhận để mở khóa nút lấy món.',
        );
        return;
      }
      const dist = calculateHaversineKm(
        { lat: cur.storeLat, lng: cur.storeLng },
        { lat: cur.customerLat, lng: cur.customerLng },
      );
      const updated: TrackingState = {
        ...cur,
        status: 'DELIVERING',
        currentLat: cur.storeLat,
        currentLng: cur.storeLng,
        heading: calculateBearingDeg(
          { lat: cur.storeLat, lng: cur.storeLng },
          { lat: cur.customerLat, lng: cur.customerLng },
        ),
        distanceKm: Math.round(dist * 100) / 100,
        etaMinutes: Math.max(3, Math.ceil(dist * 3.5)),
      };
      routeCursorRef.current = 0;
      setTracking(updated);
      broadcastTrackingState(updated);
      syncWithGlobalOrder('DELIVERING');
    } else if (nextStatus === 'ARRIVED_AT_DESTINATION') {
      if (!hasMerchantConfirmedPickup) {
        alert(
          'Chưa thể tới điểm giao: Cửa hàng chưa xác nhận bàn giao món cho bạn. Vui lòng hoàn tất bước 2 sau khi quán xác nhận.',
        );
        return;
      }
      const nearLat = +(cur.customerLat - 0.0002).toFixed(6);
      const nearLng = +(cur.customerLng - 0.0002).toFixed(6);
      const updated: TrackingState = {
        ...cur,
        status: 'ARRIVED_AT_DESTINATION',
        currentLat: nearLat,
        currentLng: nearLng,
        distanceKm: 0.03,
        etaMinutes: 1,
      };
      routeCursorRef.current = Math.max(0, routePoints.length - 1);
      setIsAutoMoving(false);
      setTracking(updated);
      broadcastTrackingState(updated);
      syncGpsToBackend(activeOrder?.id, nearLat, nearLng, cur.heading);
      syncWithGlobalOrder('ARRIVED_AT_DESTINATION');
    } else if (nextStatus === 'DELIVERED') {
      if (cur.distanceKm > 0.1) {
        alert('Chưa thể hoàn tất: Bạn cần di chuyển vào phạm vi 100m quanh địa chỉ khách hàng để xác nhận giao thành công.');
        return;
      }
      if (!activeOrder?.customerConfirmedReceipt) {
        alert('Chưa thể hoàn tất: Khách hàng chưa bấm "Xác nhận đã nhận được hàng". Vui lòng yêu cầu khách xác nhận trên ứng dụng hoặc gửi Tố cáo bom hàng nếu khách không nhận.');
        return;
      }
      const isPaid =
        activeOrder.paymentStatus === 'PAID' ||
        activeOrder.payment?.paymentStatus === 'SUCCESS' ||
        activeOrder.paymentMethod === 'MOMO_QR' ||
        activeOrder.paymentMethod === 'MOMO';
      if (!isPaid) {
        alert(
          `Chưa thể hoàn tất: Đơn hàng chưa được thanh toán! Vui lòng bấm "Thu tiền mặt" hoặc mở "VietQR" để khách quét mã thanh toán số tiền ${activeOrder.finalTotal.toLocaleString('vi-VN')}đ trước khi bàn giao món.`
        );
        return;
      }
      const updated: TrackingState = {
        ...cur,
        status: 'DELIVERED',
        currentLat: cur.customerLat,
        currentLng: cur.customerLng,
        distanceKm: 0,
        etaMinutes: 0,
      };
      setIsAutoMoving(false);
      setTracking(updated);
      broadcastTrackingState(updated);
      syncWithGlobalOrder('DELIVERED');
    }
  };

  const handleToggleWaitTimer = () => {
    if (!waitTimerActive && waitTimerSeconds === 0) {
      setWaitTimerSeconds(600);
    }
    setWaitTimerActive((prev) => !prev);
  };

  const handleFastForwardWaitTimer = () => {
    setWaitTimerSeconds(0);
    setWaitTimerActive(false);
  };

  const handleRecordCustomerCall = () => {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setCustomerCallLogs((prev) => [...prev, timeStr]);
    setDisputeCallCount((prev) => Math.max(prev + 1, customerCallLogs.length + 1));
  };

  const handleClaimStoreWaitBonus = () => {
    if (!activeOrder || claimedStoreWaitBonus) return;
    onUpdateOrderDetails?.(activeOrder.id, {
      waitFeeBonus: 10000,
      waitFeeMerchantPenalty: true,
    });
    setClaimedStoreWaitBonus(true);
    alert('Đã ghi nhận hỗ trợ cước chờ +10.000đ vào thu nhập của bạn (Khấu trừ vào phí nhà hàng do làm chậm >15p).');
  };

  const handleDriverCancelStoreDelay = () => {
    if (!activeOrder) return;
    if (window.confirm('Quán ngâm đơn >20 phút. Bạn có chắc chắn muốn hủy đơn không bị phạt tỷ lệ nhận/hủy? Hệ thống sẽ điều phối tài xế khác khi món ăn sẵn sàng.')) {
      onUpdateOrderStatus?.(activeOrder.id, 'CANCELLED');
    }
  };

  const handleConfirmDivertFee = () => {
    if (!activeOrder || !divertNewAddress.trim()) return;
    const extraKm = Math.max(1, Number(divertExtraKm) || 1);
    const surcharge = extraKm * 10000;
    onUpdateOrderDetails?.(activeOrder.id, {
      divertedAddress: divertNewAddress.trim(),
      extraDistanceKm: extraKm,
      extraDistanceFee: surcharge,
      deliveryAddress: `${activeOrder.deliveryAddress} ➔ Đổi sang: ${divertNewAddress.trim()} (+${extraKm}km, +${surcharge.toLocaleString('vi-VN')}đ)`,
    });
    setIsDivertModalOpen(false);
    setDivertSuccessNotice(`Đã ghi nhận khách đồng ý phụ phí +${surcharge.toLocaleString('vi-VN')}đ (+${extraKm}km) đổi địa chỉ.`);
  };

  const handleRejectDivertAndDispute = () => {
    setIsDivertModalOpen(false);
    setDisputeReason('ADDRESS_TOO_FAR');
    setDisputeDesc(`Khách tự ý yêu cầu đổi địa chỉ sang ${divertNewAddress.trim()} (xa thêm +${divertExtraKm}km) nhưng từ chối thanh toán phụ phí phát sinh 10.000đ/km theo quy định.`);
    setIsDisputeModalOpen(true);
  };

  const handleOpenDisputeModal = () => {
    setDisputeReason('NO_ANSWER');
    setDisputeCallCount(Math.max(customerCallLogs.length, 3));
    const waitedMins = Math.max(10, Math.ceil((600 - waitTimerSeconds) / 60));
    setDisputeWaitMins(waitedMins);
    setDisputeDesc(
      customerCallLogs.length > 0
        ? `Đã đứng tại điểm giao, thực hiện ${customerCallLogs.length} cuộc gọi liên lạc (${customerCallLogs.join(', ')}). Khách không nghe máy hoặc từ chối nhận.`
        : ''
    );
    setDisputeEvidenceImages([]);
    setDisputeError('');
    setIsDisputeModalOpen(true);
  };

  const handleUploadEvidenceFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setDisputeError('');
    try {
      const remainingSlots = Math.max(0, 4 - disputeEvidenceImages.length);
      const selected = files.slice(0, remainingSlots);
      const converted = await Promise.all(selected.map((f) => compressEvidenceFile(f)));
      setDisputeEvidenceImages((prev) => [...prev, ...converted]);
    } catch {
      setDisputeError('Không thể đọc ảnh bằng chứng. Vui lòng thử lại với định dạng JPG/PNG.');
    } finally {
      e.target.value = '';
    }
  };

  const handleAttachGpsSnapshotEvidence = () => {
    if (!activeOrder) return;
    if (disputeEvidenceImages.length >= 4) {
      setDisputeError('Tối đa 4 ảnh bằng chứng cho mỗi hồ sơ tố cáo.');
      return;
    }
    const cur = latestTrackingRef.current;
    const dataUrl = generateGpsEvidenceCard({
      orderNumber: activeOrder.orderNumber,
      driverName: currentDriver.fullName,
      licensePlate: currentDriver.licensePlate || 'Chưa cập nhật',
      lat: cur.currentLat,
      lng: cur.currentLng,
      distanceKm: cur.distanceKm,
      customerAddress: activeOrder.deliveryAddress,
    });
    if (dataUrl) {
      setDisputeError('');
      setDisputeEvidenceImages((prev) => [...prev, dataUrl]);
    }
  };

  const handleSubmitDisputeForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setDisputeError('');
    if (disputeEvidenceImages.length === 0) {
      setDisputeError('Vui lòng đính kèm ít nhất 1 hình ảnh bằng chứng (ảnh món tại điểm giao, lịch sử cuộc gọi hoặc ảnh chụp tọa độ GPS).');
      return;
    }
    if (disputeDesc.trim().length < 10) {
      setDisputeError('Vui lòng mô tả rõ sự việc tối thiểu 10 ký tự để Admin có căn cứ phân xử.');
      return;
    }

    const cur = latestTrackingRef.current;
    const now = new Date();
    const isCOD = activeOrder.payment?.paymentMethod === 'COD';
    const report: DeliveryDisputeReport = {
      id: `disp-${now.getTime()}`,
      reportCode: `BOM-${String(now.getTime()).slice(-6)}`,
      orderId: activeOrder.id,
      orderNumber: activeOrder.orderNumber,
      driverId: currentDriver.id,
      driverName: currentDriver.fullName,
      driverPhone: currentDriver.phoneNumber,
      customerId: activeOrder.customerId,
      customerName: activeOrder.recipientName,
      customerPhone: activeOrder.recipientPhone,
      deliveryAddress: activeOrder.deliveryAddress,
      merchantName: activeOrder.merchant?.name || 'Nhà hàng',
      orderTotal: activeOrder.finalTotal || 0,
      compensationAmount: activeOrder.deliveryFee || 15000,
      paymentMethod: activeOrder.payment?.paymentMethod || 'COD',
      reason: disputeReason,
      reasonLabel: DISPUTE_REASON_LABELS[disputeReason],
      description: disputeDesc.trim(),
      callAttemptsCount: Math.max(0, disputeCallCount),
      waitMinutes: Math.max(0, disputeWaitMins),
      evidenceImages: disputeEvidenceImages,
      callLogTimestamps: customerCallLogs.length > 0 ? customerCallLogs : [now.toLocaleTimeString('vi-VN')],
      waitSecondsElapsed: 600 - waitTimerSeconds,
      riskFundPayout: isCOD,
      merchantKeepPayout: !isCOD,
      customerCodBlocked: true,
      gpsSnapshot: {
        lat: cur.currentLat,
        lng: cur.currentLng,
        distanceToCustomerKm: Math.round(cur.distanceKm * 100) / 100,
      },
      status: 'PENDING_REVIEW',
      createdAt: now.toISOString(),
    };

    onSubmitDeliveryDispute?.(report);
    setIsAutoMoving(false);
    setIsDisputeModalOpen(false);
    setDisputeSuccessBanner(
      `Đã gửi hồ sơ tố cáo #${report.reportCode} cho đơn #${report.orderNumber} kèm ${report.evidenceImages.length} ảnh bằng chứng tới Admin.`,
    );
  };

  const handleSaveDriverAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorNotice('');

    if (
      !drvFullName.trim() ||
      !drvPhone.trim() ||
      !drvEmail.trim() ||
      !drvNationalId.trim() ||
      !drvLicenseNum.trim() ||
      !drvVehicleType.trim() ||
      !drvLicensePlate.trim() ||
      !drvZone.trim() ||
      !drvBankName.trim() ||
      !drvBankAcc.trim() ||
      !drvBankHolder.trim() ||
      !drvPortraitUrl.trim()
    ) {
      setProfileSavedNotice('');
      if (!drvPortraitUrl.trim()) {
        setProfileErrorNotice(
          'Bắt buộc chụp hoặc tải lên Ảnh chân dung trực diện của tài xế để đối soát khuôn mặt và xác thực danh tính sinh trắc học trước khi được duyệt vào làm!',
        );
      } else {
        setProfileErrorNotice(
          'Vui lòng điền đầy đủ thông tin cá nhân, ảnh chụp chân dung, số CCCD, số GPLX, thông tin xe & biển số, khu vực hoạt động và tài khoản ngân hàng bắt buộc (*).',
        );
      }
      return;
    }

    const wasApproved = isDriverProfileVerified(currentDriver);
    const updatedDriver: DriverProfile = {
      ...currentDriver,
      fullName: drvFullName.trim(),
      phoneNumber: drvPhone.trim(),
      email: drvEmail.trim(),
      avatarUrl: drvPortraitUrl.trim(),
      portraitUrl: drvPortraitUrl.trim(),
      portraitVerifiedAt: currentDriver.portraitVerifiedAt || new Date().toISOString(),
      driverLicenseFrontUrl: drvDriverLicenseImg.trim(),
      nationalIdFrontUrl: drvNationalIdImg.trim(),
      nationalId: drvNationalId.trim(),
      driverLicenseNumber: drvLicenseNum.trim(),
      vehicleType: drvVehicleType.trim(),
      licensePlate: drvLicensePlate.trim().toUpperCase(),
      operatingZone: drvZone.trim(),
      bankName: drvBankName.trim(),
      bankAccountNumber: drvBankAcc.trim(),
      bankAccountHolder: drvBankHolder.trim().toUpperCase(),
      emergencyContact: drvEmergency.trim(),
      kycStatus: 'VERIFIED',
      status: !wasApproved ? 'ONLINE' : currentDriver.status,
    };

    const updatedUser: User | undefined = currentUser
      ? {
          ...currentUser,
          fullName: drvFullName.trim(),
          phoneNumber: drvPhone.trim(),
          email: drvEmail.trim(),
          avatarUrl: drvPortraitUrl.trim(),
          address: drvZone.trim(),
          bankName: drvBankName.trim(),
          bankAccountNumber: drvBankAcc.trim(),
          bankAccountHolder: drvBankHolder.trim().toUpperCase(),
          ...(drvNewPassword.trim() ? { password: drvNewPassword.trim() } : {}),
        }
      : undefined;

    setTracking((prev) => ({
      ...prev,
      driverName: updatedDriver.fullName,
      driverPhone: updatedDriver.phoneNumber,
      licensePlate: updatedDriver.licensePlate,
    }));
    onUpdateDriverProfile?.(updatedDriver, updatedUser);
    setDrvNewPassword('');

    if (!wasApproved) {
      setDriverOnline(true);
      onStartDriverShift?.(updatedDriver);
      setProfileSavedNotice(
        'Hoàn tất đăng ký xe & thông tin cá nhân thành công! Tài khoản tài xế của bạn đã được mở khóa để nhận và vận chuyển hàng.',
      );
      onNavigate?.('driver-orders');
    } else {
      setProfileSavedNotice('Đã lưu thông tin hồ sơ tài xế và phương tiện thành công.');
      setTimeout(() => setProfileSavedNotice(''), 3000);
    }
  };

  const isDriverSubTab =
    activeTab === 'driver-orders' ||
    activeTab === 'driver-map' ||
    activeTab === 'driver-history' ||
    activeTab === 'driver-earnings' ||
    activeTab === 'driver-profile';

  // Strictly scope completed trips & earnings to THIS driver only
  const completedDriverOrders = allOrders.filter(
    (o) => o.status === 'COMPLETED' && o.assignedDriverId === currentDriver.id,
  );
  // Queue only shows active unassigned orders or orders claimed by THIS driver
  const availableDriverOrders = allOrders.filter(
    (o) =>
      o.status !== 'COMPLETED' &&
      o.status !== 'CANCELLED' &&
      (!o.assignedDriverId || o.assignedDriverId === currentDriver.id),
  );
  const tripShippingFeeTotal = completedDriverOrders.reduce(
    (s, o) => s + (o.deliveryFee || 15000),
    0,
  );
  const compensatedDisputesTotal = driverDisputes
    .filter((d) => d.status === 'COMPENSATED_DRIVER')
    .reduce((s, d) => s + (Number(d.compensationAmount) || 15000), 0);
  const baseSeedGrossShipping = Math.max(0, (currentDriver.walletBalance || 0) - compensatedDisputesTotal);
  const totalShippingEarned = tripShippingFeeTotal + baseSeedGrossShipping;
  const driverNetIncome = Math.round(totalShippingEarned * 0.85) + compensatedDisputesTotal;
  const approvedWithdrawnTotal = driverWithdrawals
    .filter((w) => w.driverId === currentDriver.id && w.status === 'APPROVED')
    .reduce((s, w) => s + w.amount, 0);

  const driverPenaltiesList = adminComplaints.filter(
    (c) =>
      c.status === 'REFUNDED' &&
      c.faultParty === 'DRIVER' &&
      ((c.driverId && c.driverId === currentDriver.id) ||
        (c.driverName &&
          c.driverName.trim().toLowerCase() === currentDriver.fullName.trim().toLowerCase()) ||
        completedDriverOrders.some((o) => o.orderNumber === c.orderNumber) ||
        allOrders.some(
          (o) => o.orderNumber === c.orderNumber && o.assignedDriverId === currentDriver.id,
        )),
  );
  const driverPenaltiesTotal = driverPenaltiesList.reduce(
    (s, c) => s + (Number(c.compensationAmount) || 0),
    0,
  );
  const driverWalletBalance = Math.max(
    0,
    driverNetIncome - approvedWithdrawnTotal - driverPenaltiesTotal,
  );

  // ============================================================================
  // 1. STANDALONE DRIVER PARTNER PORTAL (DARK SIDEBAR + OPERATIONAL WORKSPACE)
  // ============================================================================
  if (isDriverMode || isDriverSubTab) {
    // Force unverified drivers onto the mandatory vehicle & KYC onboarding screen
    const currentDriverTab: NavTab = !isDriverApproved
      ? 'driver-profile'
      : isDriverSubTab
      ? activeTab
      : 'driver-orders';

    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', maxWidth: '100vw', overflow: 'hidden', background: '#F1F5F9', color: '#0F172A' }}>
        {/* Left Sidebar — Driver Partner Shell */}
        <aside
          style={{
            width: 268,
            background: '#0F172A',
            color: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            borderRight: '1px solid #1E293B',
            height: '100vh',
            overflowY: 'auto',
            zIndex: 40,
          }}
        >
          {/* Driver Brand Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#0284C7',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                }}
              >
                DRV
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.02rem', color: '#FFFFFF', letterSpacing: -0.3 }}>
                  DineGo Driver
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600 }}>
                  TÀI KHOẢN TÀI XẾ ĐỘC LẬP
                </div>
              </div>
            </div>
          </div>

          {/* Driver Personal & Vehicle Info Box */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B', background: '#1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {currentDriver.avatarUrl ? (
                <img
                  src={currentDriver.avatarUrl}
                  alt={currentDriver.fullName}
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #38BDF8' }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    border: '2px solid #38BDF8',
                    flexShrink: 0,
                  }}
                >
                  {(currentDriver.fullName || 'TX')
                    .trim()
                    .split(/\s+/)
                    .slice(-2)
                    .map((w) => w[0]?.toUpperCase() || '')
                    .join('') || 'TX'}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>{currentDriver.fullName}</div>
                <div style={{ fontSize: '0.73rem', color: '#94A3B8' }}>{currentDriver.email}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginBottom: 4 }}>
              Phương tiện: <strong>{currentDriver.vehicleType || 'Chưa đăng ký'}</strong>
            </div>
            <div
              style={{
                fontSize: '0.76rem',
                color: currentDriver.licensePlate ? '#38BDF8' : '#FBBF24',
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Biển số: {currentDriver.licensePlate || 'Chưa cập nhật'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color:
                    currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                      ? '#EF4444'
                      : !isDriverApproved
                      ? '#FBBF24'
                      : driverOnline
                      ? '#34D399'
                      : '#94A3B8',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background:
                      currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                        ? '#EF4444'
                        : !isDriverApproved
                        ? '#F59E0B'
                        : driverOnline
                        ? '#10B981'
                        : '#64748B',
                  }}
                />
                {currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                  ? 'Bị Admin đình chỉ'
                  : !isDriverApproved
                  ? 'Chờ hoàn tất hồ sơ'
                  : driverOnline
                  ? 'Đang trực tuyến'
                  : 'Đã nghỉ ca'}
              </span>
              <button
                type="button"
                disabled={!isDriverApproved || currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false}
                title={
                  currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                    ? 'Tài khoản tài xế đang bị Admin tạm đình chỉ nhận chuyến'
                    : !isDriverApproved
                    ? 'Vui lòng hoàn tất đăng ký xe & thông tin cá nhân để bật nhận chuyến'
                    : undefined
                }
                onClick={handleToggleDriverShiftOnline}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background:
                    !isDriverApproved || currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                      ? '#1E293B'
                      : driverOnline
                      ? '#334155'
                      : '#0284C7',
                  border:
                    !isDriverApproved || currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                      ? '1px solid #334155'
                      : 'none',
                  color:
                    !isDriverApproved || currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                      ? '#64748B'
                      : '#FFFFFF',
                  cursor:
                    !isDriverApproved || currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {driverOnline && isDriverApproved && currentDriver.status !== 'SUSPENDED' ? 'Nghỉ ca' : 'Bật nhận chuyến'}
              </button>
            </div>
            {isDriverApproved && activeShift && driverOnline && (
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 9px',
                  borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  fontSize: '0.7rem',
                  color: '#A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span>Ca #{activeShift.shiftCode}</span>
                <strong>{activeShift.tripsCount} đơn • {formatShiftDuration(activeShift.startedAt, null, shiftTickMs)}</strong>
              </div>
            )}
          </div>

          {/* Driver Sidebar Navigation */}
          <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {[
              {
                id: 'driver-orders' as NavTab,
                label: 'Nhận & Xử Lý Chuyến',
                icon: <ClipboardList size={17} />,
              },
              {
                id: 'driver-map' as NavTab,
                label: 'Bản Đồ Điều Hướng GPS',
                icon: <Navigation size={17} />,
              },
              {
                id: 'driver-history' as NavTab,
                label: 'Lịch Sử Ca Giao Hàng',
                icon: <History size={17} />,
              },
              {
                id: 'driver-earnings' as NavTab,
                label: 'Ví Thu Nhập & Đối Soát',
                icon: <Wallet size={17} />,
              },
              {
                id: 'driver-profile' as NavTab,
                label: !isDriverApproved ? 'Hoàn Tất Hồ Sơ & Xe' : 'Quản Lý Tài Khoản & Xe',
                icon: <UserIcon size={17} />,
              },
            ].map((item) => {
              const active = currentDriverTab === item.id;
              const locked = !isDriverApproved && item.id !== 'driver-profile';
              return (
                <button
                  key={item.id}
                  type="button"
                  title={
                    locked
                      ? 'Hoàn tất thủ tục đăng ký xe & thông tin cá nhân để mở khóa'
                      : undefined
                  }
                  onClick={() => {
                    if (locked) {
                      setProfileErrorNotice(
                        'Bạn bắt buộc phải hoàn tất đăng ký xe & thông tin cá nhân trước khi sử dụng tính năng vận chuyển.',
                      );
                      return;
                    }
                    onNavigate?.(item.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '11px 14px',
                    borderRadius: 8,
                    background: active ? '#0284C7' : 'transparent',
                    color: locked ? '#64748B' : active ? '#FFFFFF' : '#CBD5E1',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.86rem',
                    textAlign: 'left',
                    opacity: locked ? 0.65 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {locked && <Lock size={14} color="#F59E0B" />}
                </button>
              );
            })}
          </nav>

          {/* Driver Sidebar Footer — Logout Only (Sticky at bottom) */}
          <div
            style={{
              padding: 16,
              borderTop: '1px solid #1E293B',
              marginTop: 'auto',
              position: 'sticky',
              bottom: 0,
              background: '#0F172A',
              zIndex: 10,
            }}
          >
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#1E293B',
                  border: '1px solid #334155',
                  color: '#F87171',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={15} /> Đăng xuất tài khoản
              </button>
            )}
          </div>
        </aside>

        {/* Right Main Operational Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>
          {/* Top Operational Header (Always Fixed at Top, Never Clipped) */}
          <header
            style={{
              minHeight: 64,
              height: 64,
              flexShrink: 0,
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
              gap: 14,
              zIndex: 50,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              overflow: 'visible',
            }}
          >
            {/* Left: Driver Title & Shift Badge on 1 single row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flexShrink: 1 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                }}
              >
                <Bike size={18} />
              </div>
              <h1
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: 0,
                  letterSpacing: -0.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 1,
                }}
              >
                {currentDriverTab === 'driver-orders' && 'Bảng Điều Phối & Xác Nhận Giao Nhận'}
                {currentDriverTab === 'driver-map' && 'Bản Đồ Lộ Trình Thời Gian Thực & Geofence 100m'}
                {currentDriverTab === 'driver-history' && 'Lịch Sử Ca Làm Việc & Chuyến Đã Giao'}
                {currentDriverTab === 'driver-earnings' && 'Ví Thu Nhập Tài Xế & Lịch Sử Đối Soát'}
                {currentDriverTab === 'driver-profile' &&
                  (!isDriverApproved
                    ? 'Hoàn Tất Thủ Tục Đăng Ký Xe & Thông Tin Cá Nhân'
                    : 'Quản Lý Hồ Sơ Tài Xế & Thông Tin Phương Tiện')}
              </h1>
              {isDriverApproved && (
                <button
                  onClick={handleToggleDriverShiftOnline}
                  title={driverOnline ? 'Bấm để chuyển sang ngoại tuyến' : 'Bấm để trực tuyến nhận đơn'}
                  style={{
                    background: driverOnline ? '#ECFDF5' : '#F1F5F9',
                    color: driverOnline ? '#047857' : '#64748B',
                    border: `1px solid ${driverOnline ? '#A7F3D0' : '#CBD5E1'}`,
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: driverOnline ? '#10B981' : '#94A3B8',
                      boxShadow: driverOnline ? '0 0 6px #10B981' : 'none',
                    }}
                  />
                  <span>
                    {driverOnline
                      ? (activeShift ? `Trực ca #${activeShift.shiftCode}` : 'Đang trực tuyến')
                      : 'Ngoại tuyến'}
                  </span>
                </button>
              )}
            </div>

            {/* Right: Driver Status Chips & Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flexShrink: 0, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
              {/* Chip 1: Đánh giá sao */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  padding: '4px 9px',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  color: '#92400E',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Đánh giá từ khách hàng"
              >
                <Star size={12} fill="#F59E0B" color="#F59E0B" style={{ flexShrink: 0 }} />
                <span>
                  <strong style={{ color: '#B45309' }}>{currentDriver.rating} ★</strong>{' '}
                  <span style={{ color: '#78350F' }}>({currentDriver.completedTrips + completedDriverOrders.length})</span>
                </span>
              </div>

              {/* Chip 2: Số dư ví thu nhập */}
              <div
                onClick={() => onNavigate?.('driver-earnings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  color: '#0369A1',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Số dư ví khả dụng — Bấm để mở Ví thu nhập"
              >
                <Wallet size={13} color="#0284C7" style={{ flexShrink: 0 }} />
                <span>
                  Ví: <strong style={{ color: '#0284C7', fontWeight: 800 }}>{driverWalletBalance.toLocaleString('vi-VN')}đ</strong>
                </span>
              </div>

              {/* Real-time Notification Bell */}
              <NotificationBell
                actorRole="DRIVER"
                userId={currentUser?.id}
                driverId={currentDriver.id}
                actorDisplayName={currentDriver.fullName}
                onNavigate={onNavigate}
                variant="light"
              />

              {/* Driver Profile Card Chip */}
              <div
                onClick={() => onNavigate?.('driver-profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '4px 10px 4px 5px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                title="Hồ sơ tài xế — Bấm để quản lý thông tin & phương tiện"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
              >
                <img
                  src={
                    currentDriver.portraitUrl ||
                    currentDriver.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                  }
                  alt={currentDriver.fullName}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #0284C7',
                    flexShrink: 0,
                  }}
                />
                <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentDriver.fullName}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: '#0284C7', fontWeight: 600 }}>
                    {currentDriver.licensePlate || 'DineGo Express'}
                  </div>
                </div>
              </div>

              {/* Subtle Divider */}
              <div style={{ height: 20, width: 1, background: '#E2E8F0', flexShrink: 0 }} />

              {/* Nút Đăng xuất ở góc phải trên cùng */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Đăng xuất tài khoản tài xế"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#DC2626';
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#DC2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FEF2F2';
                    e.currentTarget.style.color = '#DC2626';
                    e.currentTarget.style.borderColor = '#FECACA';
                  }}
                >
                  <LogOut size={13} />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          </header>

          {/* Scrollable Content Workspace Below Fixed Header */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 28, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {disputeSuccessBanner && (
              <div
                style={{
                  marginBottom: 20,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} color="#D97706" />
                  <span>{disputeSuccessBanner}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDisputeSuccessBanner('')}
                  style={{ background: 'transparent', color: '#B45309', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  Đóng
                </button>
              </div>
            )}

            {profileSavedNotice && currentDriverTab !== 'driver-profile' && (
              <div
                style={{
                  marginBottom: 20,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span>{profileSavedNotice}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setProfileSavedNotice('')}
                  style={{
                    background: 'transparent',
                    color: '#047857',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  Đóng
                </button>
              </div>
            )}

            {/* TAB 1: DRIVER ORDERS & ACTIVE DISPATCH */}
            {currentDriverTab === 'driver-orders' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* Active Order Dispatch Card */}
                {!activeOrder ? (
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      padding: '44px 24px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: '#F0F9FF',
                        color: '#0284C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px',
                      }}
                    >
                      <Bike size={26} />
                    </div>
                    <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                      Chưa có chuyến đang thực hiện
                    </h2>
                    <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: 1.55, margin: 0 }}>
                      Tài khoản mới của bạn hiện đang trống. Khi có đơn hàng mới trong danh sách bên phải, nhấn{' '}
                      <strong>Nhận giao</strong> để bắt đầu hành trình.
                    </p>
                  </div>
                ) : (() => {
                  const activeMerchant = resolveOrderMerchantMeta(activeOrder, merchants);
                  const activeMetrics = estimateOrderRouteMetrics(activeOrder, activeMerchant);
                  const activeStatusBadge = translateOrderStatusLabel(activeOrder.status);
                  const isCod = activeOrder.payment?.paymentMethod === 'COD';
                  const activeItems = activeOrder.items || [];
                  const totalUnits = activeItems.reduce((sum, it) => sum + it.quantity, 0);
                  const checkedCount = activeItems.filter(
                    (it, i) => checkedPickupItems[`${activeOrder.id}:${it.id || i}`],
                  ).length;
                  const stepIdx =
                    tracking.status === 'DELIVERED'
                      ? 4
                      : tracking.status === 'ARRIVED_AT_DESTINATION'
                      ? 3
                      : tracking.status === 'DELIVERING'
                      ? 2
                      : tracking.status === 'ARRIVED_AT_STORE'
                      ? 1
                      : 0;

                  return (
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 14,
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Top Operational Banner */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #0F172A 0%, #0369A1 100%)',
                        color: '#FFFFFF',
                        padding: '18px 22px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: 0.4,
                              padding: '3px 9px',
                              borderRadius: 999,
                              background: 'rgba(255,255,255,0.16)',
                              color: '#E0F2FE',
                            }}
                          >
                            Chuyến đang thực hiện • Bước {stepIdx}/4
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: 999,
                              background: activeStatusBadge.bg,
                              color: activeStatusBadge.color,
                            }}
                          >
                            {activeStatusBadge.label}
                          </span>
                        </div>
                        <h2 style={{ fontSize: '1.14rem', fontWeight: 800, color: '#FFFFFF', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                          #{tracking.orderNumber}
                        </h2>
                      </div>

                      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <div style={{ fontSize: '0.72rem', color: '#BAE6FD', fontWeight: 600 }}>Cước chuyến</div>
                        <div style={{ fontSize: '1.22rem', fontWeight: 800, color: '#34D399' }}>
                          +{(activeOrder.deliveryFee || 15000).toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: '10px 22px 0' }}>
                      {[1, 2, 3, 4].map((num) => (
                        <div
                          key={num}
                          style={{
                            height: 5,
                            borderRadius: 999,
                            background: stepIdx >= num ? (num === 4 ? '#10B981' : '#0284C7') : '#E2E8F0',
                            transition: 'background 0.2s ease',
                          }}
                        />
                      ))}
                    </div>

                    <div style={{ padding: 22 }}>
                      {/* Route Pickup -> Dropoff Timeline with Restaurant Photo */}
                      <div
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 12,
                          padding: 16,
                          border: '1px solid #E2E8F0',
                          marginBottom: 18,
                        }}
                      >
                        {/* Store Pickup */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            {activeMerchant.logoUrl ? (
                              <img
                                src={activeMerchant.logoUrl}
                                alt={activeMerchant.name}
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 10,
                                  objectFit: 'cover',
                                  border: '2px solid #F59E0B',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 10,
                                  background: '#FEF3C7',
                                  color: '#D97706',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid #F59E0B',
                                }}
                              >
                                <Store size={19} />
                              </div>
                            )}
                            <div style={{ width: 2, height: 22, borderLeft: '2px dashed #CBD5E1', margin: '4px 0' }} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                                1. Điểm lấy món (Nhà hàng)
                              </span>
                              {activeMerchant.phoneNumber !== '—' && (
                                <a
                                  href={`tel:${activeMerchant.phoneNumber}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    color: '#0284C7',
                                    background: '#E0F2FE',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    textDecoration: 'none',
                                  }}
                                >
                                  <Phone size={11} /> {activeMerchant.phoneNumber}
                                </a>
                              )}
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A', marginTop: 2 }}>
                              {activeMerchant.name}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>
                              {activeMerchant.address}
                            </div>
                          </div>
                        </div>

                        {/* Customer Dropoff */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 2 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              background: '#DCFCE7',
                              color: '#15803D',
                              border: '2px solid #22C55E',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <MapPin size={20} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>
                                2. Điểm giao hàng (Khách nhận)
                              </span>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#0F172A',
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                ~{tracking.distanceKm > 0 ? tracking.distanceKm : activeMetrics.distanceKm} km • ~{tracking.etaMinutes > 0 ? tracking.etaMinutes : activeMetrics.etaMinutes} phút
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                                {activeOrder.recipientName}
                              </span>
                              <a
                                href={`tel:${activeOrder.recipientPhone}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  color: '#15803D',
                                  background: '#DCFCE7',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  textDecoration: 'none',
                                }}
                              >
                                <Phone size={11} /> {activeOrder.recipientPhone}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleOpenOrderChat('CUSTOMER_DRIVER')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  color: '#0284C7',
                                  background: '#E0F2FE',
                                  border: '1px solid #BAE6FD',
                                  padding: '2px 9px',
                                  borderRadius: 999,
                                  cursor: 'pointer',
                                }}
                              >
                                <MessageSquare size={11} /> Nhắn tin với Khách
                              </button>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>
                              {tracking.customerAddress}
                            </div>
                          </div>
                        </div>

                        {activeOrder.customerNote && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: '#FFFBEB',
                              border: '1px solid #FDE68A',
                              color: '#92400E',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <StickyNote size={15} color="#D97706" style={{ flexShrink: 0 }} />
                            <span>
                              <strong>Ghi chú khách hàng:</strong> {activeOrder.customerNote}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Visual Dish Checklist with Photos */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <UtensilsCrossed size={15} color="#0284C7" />
                            <span>Đối chiếu món &amp; hình ảnh tại bếp ({totalUnits} phần)</span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: 999,
                              background: checkedCount === activeItems.length && activeItems.length > 0 ? '#DCFCE7' : '#F1F5F9',
                              color: checkedCount === activeItems.length && activeItems.length > 0 ? '#15803D' : '#475569',
                            }}
                          >
                            Đã kiểm {checkedCount}/{activeItems.length} món
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {activeItems.map((item, idx) => {
                            const checkKey = `${activeOrder.id}:${item.id || idx}`;
                            const isChecked = Boolean(checkedPickupItems[checkKey]);
                            const imgUrl = resolveOrderDishImage(item, activeOrder, menuItemsMap, merchants);
                            return (
                              <div
                                key={checkKey}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '10px 12px',
                                  borderRadius: 10,
                                  border: `1.5px solid ${isChecked ? '#86EFAC' : '#E2E8F0'}`,
                                  background: isChecked ? '#F0FDF4' : '#FFFFFF',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {/* Food Photo Thumbnail (Click to enlarge) */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    imgUrl && setPreviewFoodImage({ src: imgUrl, title: item.itemName })
                                  }
                                  title={imgUrl ? 'Nhấn để phóng to ảnh món' : undefined}
                                  style={{
                                    position: 'relative',
                                    width: 58,
                                    height: 58,
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    padding: 0,
                                    background: '#F1F5F9',
                                    border: '1px solid #CBD5E1',
                                    cursor: imgUrl ? 'zoom-in' : 'default',
                                  }}
                                >
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={item.itemName}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#94A3B8',
                                      }}
                                    >
                                      <UtensilsCrossed size={22} />
                                    </div>
                                  )}
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: 3,
                                      left: 3,
                                      background: '#0F172A',
                                      color: '#FFFFFF',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: 5,
                                    }}
                                  >
                                    {item.quantity}x
                                  </span>
                                </button>

                                {/* Dish Details */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                                    {item.itemName}
                                  </div>
                                  {item.toppings && item.toppings.length > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>
                                      Topping: {item.toppings.map((t) => t.toppingName).join(', ')}
                                    </div>
                                  )}
                                  {item.note && (
                                    <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: 2 }}>
                                      Ghi chú món: {item.note}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                                    Giá trị món: {item.subtotal.toLocaleString('vi-VN')}đ
                                  </div>
                                </div>

                                {/* Interactive Item Verification Checkbox */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCheckedPickupItems((prev) => ({
                                      ...prev,
                                      [checkKey]: !isChecked,
                                    }))
                                  }
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: `1px solid ${isChecked ? '#16A34A' : '#CBD5E1'}`,
                                    background: isChecked ? '#16A34A' : '#F8FAFC',
                                    color: isChecked ? '#FFFFFF' : '#475569',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <Check size={13} />
                                  {isChecked ? 'Đã kiểm' : 'Kiểm món'}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* COD / MoMo Collection Box */}
                        <div
                          style={{
                            marginTop: 12,
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: isCod ? '#FEF2F2' : '#ECFDF5',
                            border: `1px solid ${isCod ? '#FECACA' : '#A7F3D0'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: isCod ? '#991B1B' : '#065F46' }}>
                              Thu hộ khách hàng khi giao:
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isCod ? '#DC2626' : '#059669' }}>
                              {isCod ? 'Khách trả tiền mặt (COD)' : 'Đã thanh toán trước qua MoMo — KHÔNG thu thêm tiền'}
                            </div>
                          </div>
                          <div style={{ fontSize: '1.12rem', fontWeight: 900, color: isCod ? '#DC2626' : '#059669' }}>
                            {isCod ? `${(activeOrder.finalTotal || 0).toLocaleString('vi-VN')}đ` : '0đ'}
                          </div>
                        </div>
                      </div>

                      {/* Stepper Controls + Open GPS Shortcut */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                          Cập nhật tiến độ giao hàng:
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('driver-map')}
                          style={{
                            padding: '5px 11px',
                            borderRadius: 7,
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            cursor: 'pointer',
                          }}
                        >
                          <Navigation size={13} /> Mở bản đồ GPS
                        </button>
                      </div>

                      {/* 2-Condition Verification Gate + Stepper Controls */}
                      {(() => {
                        const hasMerchantConfirmedPickup =
                          Boolean(activeOrder.merchantConfirmedPickup) ||
                          activeOrder.status === 'DELIVERING' ||
                          activeOrder.status === 'COMPLETED';
                        const hasPickedUpFood =
                          stepIdx >= 2 ||
                          activeOrder.status === 'DELIVERING' ||
                          activeOrder.status === 'COMPLETED';
                        const isWithin100m =
                          tracking.distanceKm <= 0.1 || tracking.status === 'ARRIVED_AT_DESTINATION';
                        const hasCustomerConfirmed = Boolean(activeOrder.customerConfirmedReceipt);
                        const isPaid =
                          activeOrder.paymentStatus === 'PAID' ||
                          activeOrder.payment?.paymentStatus === 'SUCCESS' ||
                          activeOrder.paymentMethod === 'MOMO_QR' ||
                          activeOrder.paymentMethod === 'MOMO';
                        const canFinishDelivery = hasPickedUpFood && isWithin100m && hasCustomerConfirmed && isPaid;

                        return (
                          <>
                            {!hasPickedUpFood ? (
                              <div
                                style={{
                                  marginBottom: 12,
                                  padding: '11px 14px',
                                  borderRadius: 10,
                                  background: hasMerchantConfirmedPickup ? '#ECFDF5' : '#FFFBEB',
                                  border: `1px solid ${hasMerchantConfirmedPickup ? '#86EFAC' : '#FDE68A'}`,
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 5,
                                }}
                              >
                                <div style={{ fontWeight: 800, color: hasMerchantConfirmedPickup ? '#065F46' : '#92400E' }}>
                                  Điều kiện mở khóa nút &ldquo;2. Đã lấy món &amp; Đi giao&rdquo;:
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    color: hasMerchantConfirmedPickup ? '#15803D' : '#DC2626',
                                    fontWeight: 700,
                                  }}
                                >
                                  {hasMerchantConfirmedPickup ? (
                                    <CheckCircle2 size={14} color="#16A34A" />
                                  ) : (
                                    <Lock size={14} color="#DC2626" />
                                  )}
                                  <span>
                                    {hasMerchantConfirmedPickup
                                      ? `Cửa hàng đã xác nhận bàn giao món${
                                          activeOrder.merchantConfirmedPickupAt
                                            ? ` (${new Date(activeOrder.merchantConfirmedPickupAt).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              })})`
                                            : ''
                                        } — Bấm "2. Đã lấy món & Đi giao" để bắt đầu giao!`
                                      : `Đang chờ Cửa hàng bấm "Xác nhận bàn giao món cho Tài xế" (Trạng thái bếp: ${activeStatusBadge.label})`}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <>
                              <div
                                style={{
                                  marginBottom: 12,
                                  padding: '11px 14px',
                                  borderRadius: 10,
                                  background: canFinishDelivery ? '#ECFDF5' : '#FFFBEB',
                                  border: `1px solid ${canFinishDelivery ? '#86EFAC' : '#FDE68A'}`,
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 5,
                                }}
                              >
                                <div style={{ fontWeight: 800, color: canFinishDelivery ? '#065F46' : '#92400E' }}>
                                  Điều kiện mở khóa nút &ldquo;4. Hoàn tất giao hàng&rdquo;:
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isWithin100m ? '#15803D' : '#B45309', fontWeight: 600 }}>
                                  {isWithin100m ? <CheckCircle2 size={14} color="#16A34A" /> : <Clock size={14} color="#D97706" />}
                                  <span>
                                    {isWithin100m
                                      ? '1. Đã tới điểm giao trong bán kính <100m'
                                      : `1. Cần di chuyển vào bán kính <100m quanh khách (hiện còn ${tracking.distanceKm.toFixed(2)} km)`}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: hasCustomerConfirmed ? '#15803D' : '#DC2626', fontWeight: 700 }}>
                                  {hasCustomerConfirmed ? <CheckCircle2 size={14} color="#16A34A" /> : <Lock size={14} color="#DC2626" />}
                                  <span>
                                    {hasCustomerConfirmed
                                      ? `2. Khách hàng đã xác nhận nhận hàng${
                                          activeOrder.customerConfirmedAt
                                            ? ` (${new Date(activeOrder.customerConfirmedAt).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              })})`
                                            : ''
                                        }`
                                      : '2. Đang chờ khách hàng bấm "Xác nhận đã nhận được hàng" trên app khách'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isPaid ? '#15803D' : '#DC2626', fontWeight: 700 }}>
                                  {isPaid ? <CheckCircle2 size={14} color="#16A34A" /> : <Lock size={14} color="#DC2626" />}
                                  <span>
                                    {isPaid
                                      ? `3. Đã thanh toán đầy đủ (${activeOrder.paymentMethod === 'COD' ? 'Đã thu tiền mặt' : activeOrder.paymentMethod === 'VIETQR_ON_DELIVERY' ? 'Đã nhận chuyển khoản VietQR' : 'Đã trả trước Online'})`
                                      : `3. Chưa thanh toán: Cần thu ${activeOrder.finalTotal.toLocaleString('vi-VN')}đ (Tiền mặt hoặc Quét mã VietQR)`}
                                  </span>
                                </div>
                              </div>

                              {/* Payment Status Banner & Quick Action for Driver */}
                              <div
                                style={{
                                  marginBottom: 12,
                                  padding: '12px 14px',
                                  borderRadius: 10,
                                  background: isPaid ? '#F0FDF4' : '#FEF2F2',
                                  border: `1.5px solid ${isPaid ? '#86EFAC' : '#FCA5A5'}`,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 10,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '0.86rem',
                                      color: isPaid ? '#15803D' : '#DC2626',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    {isPaid ? (
                                      <>
                                        <CheckCircle2 size={16} color="#16A34A" />
                                        <span>ĐÃ THANH TOÁN (0đ CẦN THU)</span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle size={16} color="#DC2626" />
                                        <span>CHƯA THANH TOÁN • CẦN THU ${activeOrder.finalTotal.toLocaleString('vi-VN')}đ</span>
                                      </>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: isPaid ? '#166534' : '#991B1B', marginTop: 2 }}>
                                    {isPaid
                                      ? 'Đơn đã quyết toán online qua Sàn. Tuyệt đối KHÔNG thu thêm tiền của khách.'
                                      : 'Đồng kiểm: Cho khách xem tem bao bì rồi thu tiền mặt hoặc mở VietQR cho khách quét.'}
                                  </div>
                                </div>

                                {!isPaid && (
                                  <div style={{ display: 'inline-flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmCashPayment(activeOrder)}
                                      style={{
                                        padding: '6px 11px',
                                        borderRadius: 7,
                                        background: '#059669',
                                        color: '#FFFFFF',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      <Banknote size={13} />
                                      <span>Thu tiền mặt</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setVietQrPaymentOrder(activeOrder)}
                                      style={{
                                        padding: '6px 11px',
                                        borderRadius: 7,
                                        background: '#0284C7',
                                        color: '#FFFFFF',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      <QrCode size={13} />
                                      <span>Mở VietQR</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                              </>
                            )}

                            {stepIdx <= 1 && (() => {
                              const distToStoreMeters = Math.round(
                                calculateHaversineKm(
                                  { lat: tracking.currentLat, lng: tracking.currentLng },
                                  { lat: tracking.storeLat, lng: tracking.storeLng },
                                ) * 1000,
                              );
                              const isDriverWithinStoreGeofence = distToStoreMeters <= 100;
                              return (
                                <div
                                  style={{
                                    marginBottom: 8,
                                    padding: '7px 12px',
                                    borderRadius: 7,
                                    background: isDriverWithinStoreGeofence ? '#F0FDF4' : '#FFFBEB',
                                    border: isDriverWithinStoreGeofence ? '1px solid #86EFAC' : '1px solid #FDE68A',
                                    fontSize: '0.74rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    color: isDriverWithinStoreGeofence ? '#15803D' : '#92400E',
                                    fontWeight: 700,
                                    flexWrap: 'wrap',
                                    gap: 6,
                                  }}
                                >
                                  <span>
                                    Khoảng cách tới quán: <strong>{distToStoreMeters}m</strong>{' '}
                                    {isDriverWithinStoreGeofence ? '(✓ Trong phạm vi ≤100m)' : '(⚠️ Ở xa >100m - Chưa thể xác nhận)'}
                                  </span>
                                  {!isDriverWithinStoreGeofence && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nearLat = tracking.storeLat + 0.0002;
                                        const nearLng = tracking.storeLng + 0.0002;
                                        const updated: TrackingState = {
                                          ...tracking,
                                          currentLat: nearLat,
                                          currentLng: nearLng,
                                        };
                                        latestTrackingRef.current = updated;
                                        setTracking(updated);
                                        broadcastTrackingState(updated);
                                        setGpsStatusNotice(
                                          'Đã mô phỏng GPS di chuyển xe vào phạm vi 30m quanh quán! Giờ bạn có thể bấm "1. Đã đến nhà hàng".',
                                        );
                                      }}
                                      style={{
                                        padding: '3px 8px',
                                        borderRadius: 5,
                                        border: '1px solid #CBD5E1',
                                        background: '#FFFFFF',
                                        color: '#B45309',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      📍 [Mô phỏng] Tới sát quán (30m)
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <button
                                onClick={() => handleStepAction('ARRIVED_AT_STORE')}
                                style={{
                                  padding: '11px 14px',
                                  borderRadius: 9,
                                  border: '1.5px solid #CBD5E1',
                                  background: tracking.status === 'ARRIVED_AT_STORE' ? '#0284C7' : stepIdx > 1 ? '#F0F9FF' : '#FFFFFF',
                                  color: tracking.status === 'ARRIVED_AT_STORE' ? '#FFFFFF' : '#0F172A',
                                  fontWeight: 700,
                                  fontSize: '0.83rem',
                                  cursor: 'pointer',
                                }}
                              >
                                1. Đã đến nhà hàng
                              </button>
                              <button
                                type="button"
                                disabled={!hasMerchantConfirmedPickup}
                                title={
                                  !hasMerchantConfirmedPickup
                                    ? 'Chờ Cửa hàng bấm Xác nhận bàn giao món cho Tài xế'
                                    : undefined
                                }
                                onClick={() => handleStepAction('DELIVERING')}
                                style={{
                                  padding: '11px 14px',
                                  borderRadius: 9,
                                  border: hasMerchantConfirmedPickup
                                    ? stepIdx < 2
                                      ? '1.5px solid #00B14F'
                                      : '1.5px solid #0284C7'
                                    : '1.5px solid #CBD5E1',
                                  background: !hasMerchantConfirmedPickup
                                    ? '#CBD5E1'
                                    : tracking.status === 'DELIVERING'
                                    ? '#0284C7'
                                    : stepIdx > 2
                                    ? '#F0F9FF'
                                    : '#00B14F',
                                  color: !hasMerchantConfirmedPickup
                                    ? '#64748B'
                                    : stepIdx > 2 && tracking.status !== 'DELIVERING'
                                    ? '#0F172A'
                                    : '#FFFFFF',
                                  fontWeight: 800,
                                  fontSize: '0.83rem',
                                  cursor: hasMerchantConfirmedPickup ? 'pointer' : 'not-allowed',
                                  boxShadow:
                                    hasMerchantConfirmedPickup && stepIdx < 2
                                      ? '0 4px 12px rgba(0, 177, 79, 0.28)'
                                      : 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                {!hasMerchantConfirmedPickup && <Lock size={14} />}
                                {hasMerchantConfirmedPickup && stepIdx < 2 && <CheckCircle2 size={14} />}
                                <span>2. Đã lấy món &amp; Đi giao</span>
                              </button>
                              <button
                                type="button"
                                disabled={!hasMerchantConfirmedPickup}
                                title={
                                  !hasMerchantConfirmedPickup
                                    ? 'Cần xác nhận lấy món sau khi Cửa hàng bàn giao'
                                    : undefined
                                }
                                onClick={() => handleStepAction('ARRIVED_AT_DESTINATION')}
                                style={{
                                  padding: '11px 14px',
                                  borderRadius: 9,
                                  border: '1.5px solid #CBD5E1',
                                  background: !hasMerchantConfirmedPickup
                                    ? '#E2E8F0'
                                    : tracking.status === 'ARRIVED_AT_DESTINATION'
                                    ? '#0284C7'
                                    : stepIdx > 3
                                    ? '#F0F9FF'
                                    : '#FFFFFF',
                                  color: !hasMerchantConfirmedPickup
                                    ? '#94A3B8'
                                    : tracking.status === 'ARRIVED_AT_DESTINATION'
                                    ? '#FFFFFF'
                                    : '#0F172A',
                                  fontWeight: 700,
                                  fontSize: '0.83rem',
                                  cursor: hasMerchantConfirmedPickup ? 'pointer' : 'not-allowed',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                }}
                              >
                                {!hasMerchantConfirmedPickup && <Lock size={14} />}
                                <span>3. Đã tới điểm giao (&lt;100m)</span>
                              </button>
                              <button
                                type="button"
                                disabled={!canFinishDelivery}
                                title={
                                  !hasPickedUpFood
                                    ? 'Cần lấy món từ cửa hàng trước'
                                    : !hasCustomerConfirmed
                                    ? 'Chờ khách hàng bấm Xác nhận đã nhận được hàng'
                                    : !isWithin100m
                                    ? 'Cần tới gần điểm giao <100m'
                                    : undefined
                                }
                                onClick={() => handleStepAction('DELIVERED')}
                                style={{
                                  padding: '11px 14px',
                                  borderRadius: 9,
                                  background: canFinishDelivery ? '#059669' : '#CBD5E1',
                                  color: canFinishDelivery ? '#FFFFFF' : '#64748B',
                                  fontWeight: 800,
                                  fontSize: '0.83rem',
                                  cursor: canFinishDelivery ? 'pointer' : 'not-allowed',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                }}
                              >
                                {!canFinishDelivery && <Lock size={14} />}
                                <span>4. Hoàn tất giao hàng</span>
                              </button>
                            </div>

                            {/* Operational Case 6: Store Delay (>15-20 mins) & Wait Fee */}
                            {tracking.status === 'ARRIVED_AT_STORE' && !hasMerchantConfirmedPickup && (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 12,
                                  borderRadius: 10,
                                  background: '#FFFBEB',
                                  border: '1.5px solid #FDE68A',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#B45309', fontSize: '0.82rem' }}>
                                    <Clock size={15} />
                                    <span>SLA Thời gian chờ tại quán:</span>
                                  </div>
                                  <span style={{ fontWeight: 800, color: '#92400E', fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums' }}>
                                    {Math.floor(storeWaitSeconds / 60)} phút {storeWaitSeconds % 60}s
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#78350F', lineHeight: 1.4 }}>
                                  Quán cần bàn giao món trong vòng 15 phút. Nếu ngâm đơn &gt;15p, bạn được nhận phụ phí cước chờ (+10.000đ). Nếu &gt;20p, bạn có quyền hủy đơn miễn phí.
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                                  <button
                                    type="button"
                                    disabled={claimedStoreWaitBonus}
                                    onClick={handleClaimStoreWaitBonus}
                                    style={{
                                      flex: 1,
                                      padding: '7px 10px',
                                      borderRadius: 7,
                                      background: claimedStoreWaitBonus ? '#E2E8F0' : '#F59E0B',
                                      color: claimedStoreWaitBonus ? '#64748B' : '#FFFFFF',
                                      border: 'none',
                                      fontWeight: 700,
                                      fontSize: '0.74rem',
                                      cursor: claimedStoreWaitBonus ? 'default' : 'pointer',
                                    }}
                                  >
                                    {claimedStoreWaitBonus ? '✓ Đã nhận cước chờ (+10.000đ)' : '+ Nhận cước chờ (+10.000đ do quán trễ)'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleDriverCancelStoreDelay}
                                    style={{
                                      padding: '7px 10px',
                                      borderRadius: 7,
                                      background: '#FFFFFF',
                                      border: '1px solid #DC2626',
                                      color: '#DC2626',
                                      fontWeight: 700,
                                      fontSize: '0.74rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Hủy đơn miễn phí (&gt;20p ngâm)
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Operational Case 2: Divert Address / Surcharge (>1km) */}
                            {tracking.status === 'DELIVERING' && (
                              <button
                                type="button"
                                onClick={() => setIsDivertModalOpen(true)}
                                style={{
                                  marginTop: 10,
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: 8,
                                  background: '#F0FDF4',
                                  border: '1px solid #BBF7D0',
                                  color: '#15803D',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  cursor: 'pointer',
                                }}
                              >
                                <Navigation size={14} />
                                <span>Khách yêu cầu đổi địa chỉ giao khác? (Tính phụ phí +10k/km)</span>
                              </button>
                            )}

                            {divertSuccessNotice && (
                              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#F0FDF4', color: '#166534', fontSize: '0.78rem', fontWeight: 600 }}>
                                {divertSuccessNotice}
                              </div>
                            )}

                            {/* Operational Case 1: 10-Minute SLA Wait Timer & Call Log Verification */}
                            {(tracking.status === 'ARRIVED_AT_DESTINATION' || isWithin100m) && (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 14,
                                  borderRadius: 10,
                                  background: '#F8FAFC',
                                  border: '1.5px solid #CBD5E1',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 10,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Clock size={15} color="#0284C7" />
                                    <span>Quy chuẩn SLA chờ khách nhận hàng (10 phút)</span>
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                      style={{
                                        fontWeight: 900,
                                        fontSize: '0.95rem',
                                        color: waitTimerSeconds === 0 ? '#DC2626' : '#0284C7',
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {Math.floor(waitTimerSeconds / 60)}:{String(waitTimerSeconds % 60).padStart(2, '0')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={handleToggleWaitTimer}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        background: waitTimerActive ? '#FEF2F2' : '#E0F2FE',
                                        color: waitTimerActive ? '#DC2626' : '#0369A1',
                                        border: 'none',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {waitTimerActive ? 'Tạm dừng' : waitTimerSeconds === 0 ? 'Đặt lại' : 'Bắt đầu chờ'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleFastForwardWaitTimer}
                                      title="Thử nghiệm nhanh: đếm hết 10 phút"
                                      style={{
                                        padding: '4px 6px',
                                        borderRadius: 6,
                                        background: '#F1F5F9',
                                        color: '#64748B',
                                        border: '1px solid #CBD5E1',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Hết giờ
                                    </button>
                                  </div>
                                </div>

                                {/* Checklist Verification */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tracking.distanceKm <= 0.05 ? '#15803D' : '#D97706', fontWeight: 600 }}>
                                    <span>{tracking.distanceKm <= 0.05 ? '✓' : '•'} Đứng trong bán kính 50m (GPS hiện tại: {(tracking.distanceKm * 1000).toFixed(0)}m)</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: waitTimerSeconds === 0 ? '#15803D' : '#64748B', fontWeight: 600 }}>
                                    <span>{waitTimerSeconds === 0 ? '✓' : '•'} Đồng hồ đếm ngược đủ 10 phút {waitTimerSeconds === 0 ? '(Đã thỏa điều kiện)' : '(Đang chạy)'}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: customerCallLogs.length >= 3 ? '#15803D' : '#B45309', fontWeight: 600 }}>
                                    <span>{customerCallLogs.length >= 3 ? '✓' : '•'} Tối thiểu 3 cuộc gọi cách nhau &gt;= 2p ({customerCallLogs.length}/3 cuộc)</span>
                                  </div>
                                </div>

                                {/* Call Log Button & List */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                  <button
                                    type="button"
                                    onClick={handleRecordCustomerCall}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 6,
                                      background: '#0F172A',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      fontWeight: 700,
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Phone size={13} />
                                    <span>Ghi nhận 1 cuộc gọi cho khách (+1)</span>
                                  </button>
                                  {customerCallLogs.length > 0 && (
                                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                      Lịch sử gọi: {customerCallLogs.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Bom Hang / Dispute Evidence Trigger */}
                            <button
                              type="button"
                              onClick={handleOpenDisputeModal}
                              style={{
                                marginTop: 12,
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 9,
                                background: '#FEF2F2',
                                border: '1.5px solid #FECACA',
                                color: '#DC2626',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 7,
                                cursor: 'pointer',
                              }}
                            >
                              <AlertTriangle size={15} />
                              <span>Khách bom hàng / Không liên lạc được? Tố cáo &amp; Gửi bằng chứng</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  );
                })()}

                {/* Right Column: Queue of Available Orders in Area (Rich Visual Cards with Food Photos) */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E2E8F0',
                    padding: 22,
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Package size={18} color="#0284C7" />
                      <span>Danh Sách Đơn Trong Khu Vực ({availableDriverOrders.length})</span>
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 16 }}>
                    Xem nhanh ảnh món ăn, địa điểm lấy/giao và cước phí trước khi nhấn nhận giao.
                  </p>

                  {availableDriverOrders.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 16px',
                        borderRadius: 10,
                        background: '#F8FAFC',
                        border: '1px dashed #CBD5E1',
                        textAlign: 'center',
                        fontSize: '0.84rem',
                        color: '#64748B',
                      }}
                    >
                      Hiện chưa có đơn hàng nào đang chờ giao.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {availableDriverOrders.map((ord) => {
                        const isAssignedToMe = ord.assignedDriverId === currentDriver.id;
                        const merchantMeta = resolveOrderMerchantMeta(ord, merchants);
                        const metrics = estimateOrderRouteMetrics(ord, merchantMeta);
                        const statusInfo = translateOrderStatusLabel(ord.status);
                        const isCod = ord.payment?.paymentMethod === 'COD';
                        const ordItems = ord.items || [];
                        const totalDishes = ordItems.reduce((s, it) => s + it.quantity, 0);

                        return (
                          <div
                            key={ord.id}
                            style={{
                              padding: 15,
                              borderRadius: 12,
                              border: `1.5px solid ${isAssignedToMe ? '#38BDF8' : '#E2E8F0'}`,
                              background: isAssignedToMe ? '#F0F9FF' : '#FFFFFF',
                              boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
                            }}
                          >
                            {/* Card Header: Merchant + Order Code + Payout */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                {merchantMeta.logoUrl ? (
                                  <img
                                    src={merchantMeta.logoUrl}
                                    alt={merchantMeta.name}
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 9,
                                      objectFit: 'cover',
                                      border: '1px solid #E2E8F0',
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 9,
                                      background: '#FEF3C7',
                                      color: '#D97706',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Store size={18} />
                                  </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.89rem', color: '#0F172A' }}>
                                    {merchantMeta.name}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                                      #{ord.orderNumber}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        padding: '2px 7px',
                                        borderRadius: 999,
                                        background: statusInfo.bg,
                                        color: statusInfo.color,
                                      }}
                                    >
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#059669' }}>
                                  +{(ord.deliveryFee || 15000).toLocaleString('vi-VN')}đ
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                  ~{metrics.distanceKm} km • ~{metrics.etaMinutes}p
                                </div>
                              </div>
                            </div>

                            {/* Dish Photo Thumbnails Strip */}
                            {ordItems.length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '9px 10px',
                                  borderRadius: 9,
                                  background: isAssignedToMe ? '#E0F2FE' : '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  marginBottom: 10,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                  {ordItems.slice(0, 3).map((item, i) => {
                                    const imgUrl = resolveOrderDishImage(item, ord, menuItemsMap, merchants);
                                    return (
                                      <div
                                        key={item.id || i}
                                        onClick={() =>
                                          imgUrl && setPreviewFoodImage({ src: imgUrl, title: item.itemName })
                                        }
                                        title={item.itemName}
                                        style={{
                                          position: 'relative',
                                          width: 44,
                                          height: 44,
                                          borderRadius: 8,
                                          overflow: 'hidden',
                                          background: '#FFFFFF',
                                          border: '1px solid #CBD5E1',
                                          cursor: imgUrl ? 'zoom-in' : 'default',
                                        }}
                                      >
                                        {imgUrl ? (
                                          <img
                                            src={imgUrl}
                                            alt={item.itemName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                          />
                                        ) : (
                                          <div
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              color: '#94A3B8',
                                            }}
                                          >
                                            <UtensilsCrossed size={16} />
                                          </div>
                                        )}
                                        <span
                                          style={{
                                            position: 'absolute',
                                            bottom: 1,
                                            right: 1,
                                            background: '#0F172A',
                                            color: '#FFFFFF',
                                            fontSize: '0.62rem',
                                            fontWeight: 800,
                                            padding: '0 4px',
                                            borderRadius: 4,
                                          }}
                                        >
                                          {item.quantity}x
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {ordItems.length > 3 && (
                                    <div
                                      style={{
                                        width: 34,
                                        height: 44,
                                        borderRadius: 8,
                                        background: '#E2E8F0',
                                        color: '#334155',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      +{ordItems.length - 3}
                                    </div>
                                  )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: '0.79rem',
                                      fontWeight: 700,
                                      color: '#0F172A',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {ordItems.map((it) => `${it.quantity}x ${it.itemName}`).join(', ')}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>
                                    Tổng {totalDishes} phần •{' '}
                                    <strong style={{ color: isCod ? '#DC2626' : '#059669' }}>
                                      {isCod
                                        ? `Thu hộ COD: ${(ord.finalTotal || 0).toLocaleString('vi-VN')}đ`
                                        : 'MoMo • Thu hộ 0đ'}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Pickup -> Dropoff Quick Route + Action Button */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                              <div style={{ fontSize: '0.76rem', color: '#475569', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <strong style={{ color: '#B45309' }}>Lấy:</strong> {merchantMeta.address}
                                </div>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <strong style={{ color: '#15803D' }}>Giao:</strong> {ord.recipientName} — {ord.deliveryAddress}
                                </div>
                              </div>

                              {isAssignedToMe ? (
                                <span
                                  style={{
                                    padding: '7px 12px',
                                    borderRadius: 8,
                                    background: '#DCFCE7',
                                    color: '#15803D',
                                    fontSize: '0.76rem',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                  }}
                                >
                                  Đang nhận giao
                                </span>
                              ) : (
                                <button
                                  disabled={currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false}
                                  onClick={() => {
                                    if (currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false) {
                                      alert('Tài khoản tài xế của bạn đang bị Admin tạm đình chỉ nhận chuyến.');
                                      return;
                                    }
                                    if (!driverOnline) {
                                      setDriverOnline(true);
                                      onUpdateDriverProfile?.({ ...currentDriver, status: 'ONLINE' });
                                    }
                                    if (onAcceptDriverOrder) {
                                      onAcceptDriverOrder(ord.id, currentDriver);
                                    } else {
                                      onUpdateOrderStatus?.(ord.id, 'DELIVERING');
                                    }
                                  }}
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: 8,
                                    background:
                                      currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                                        ? '#CBD5E1'
                                        : '#0284C7',
                                    color:
                                      currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                                        ? '#64748B'
                                        : '#FFFFFF',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    cursor:
                                      currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                                        ? 'not-allowed'
                                        : 'pointer',
                                    flexShrink: 0,
                                  }}
                                >
                                  {currentDriver.status === 'SUSPENDED' || currentUser?.isActive === false
                                    ? 'Đang bị đình chỉ'
                                    : 'Nhận giao ngay'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: DRIVER GPS MAP & TELEMETRY */}
            {currentDriverTab === 'driver-map' && (
              !activeOrder ? (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    padding: '52px 24px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: '#F0F9FF',
                      color: '#0284C7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <Navigation size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                    Chưa có chuyến giao đang hoạt động
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: 460, margin: '0 auto 18px' }}>
                    Bản đồ lộ trình GPS và vùng Geofence 100m sẽ kích hoạt sau khi bạn chọn{' '}
                    <strong>Nhận giao</strong> một đơn hàng trong mục Điều phối chuyến.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('driver-orders')}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 8,
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                    }}
                  >
                    Về mục Nhận &amp; Xử Lý Chuyến
                  </button>
                </div>
              ) : (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Bản Đồ Lộ Trình Giao Hàng — #{tracking.orderNumber}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                      Tài xế: {currentDriver.fullName} ({currentDriver.licensePlate}) • Khoảng cách còn lại:{' '}
                      <strong>{tracking.distanceKm} km</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button
                      onClick={() => setIsAutoMoving(!isAutoMoving)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: isAutoMoving ? '#DC2626' : '#0284C7',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {isAutoMoving ? 'Tạm dừng di chuyển' : 'Mô phỏng di chuyển GPS'}
                    </button>
                    <button
                      onClick={handleUseDeviceGps}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#ECFEFF',
                        color: '#0369A1',
                        border: '1px solid #BAE6FD',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Crosshair size={14} />
                      Dùng GPS thật
                    </button>
                    <button
                      type="button"
                      disabled={
                        !activeOrder.merchantConfirmedPickup &&
                        activeOrder.status !== 'DELIVERING' &&
                        activeOrder.status !== 'COMPLETED'
                      }
                      title={
                        !activeOrder.merchantConfirmedPickup &&
                        activeOrder.status !== 'DELIVERING' &&
                        activeOrder.status !== 'COMPLETED'
                          ? 'Chờ Cửa hàng xác nhận bàn giao món trước khi vào điểm giao khách'
                          : undefined
                      }
                      onClick={() => handleStepAction('ARRIVED_AT_DESTINATION')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background:
                          activeOrder.merchantConfirmedPickup ||
                          activeOrder.status === 'DELIVERING' ||
                          activeOrder.status === 'COMPLETED'
                            ? '#F1F5F9'
                            : '#E2E8F0',
                        color:
                          activeOrder.merchantConfirmedPickup ||
                          activeOrder.status === 'DELIVERING' ||
                          activeOrder.status === 'COMPLETED'
                            ? '#0F172A'
                            : '#94A3B8',
                        border: '1px solid #CBD5E1',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor:
                          activeOrder.merchantConfirmedPickup ||
                          activeOrder.status === 'DELIVERING' ||
                          activeOrder.status === 'COMPLETED'
                            ? 'pointer'
                            : 'not-allowed',
                      }}
                    >
                      Vào vùng Geofence (&lt;100m)
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenDisputeModal}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
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
                      <AlertTriangle size={14} />
                      Tố cáo bom hàng
                    </button>
                  </div>
                </div>

                {gpsStatusNotice && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      color: '#0369A1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    {gpsStatusNotice}
                  </div>
                )}

                {/* Real OpenStreetMap + OSRM Interactive Map */}
                <DeliveryMap
                  store={{
                    lat: tracking.storeLat,
                    lng: tracking.storeLng,
                    name: tracking.restaurantName,
                    address: tracking.restaurantAddress,
                  }}
                  customer={{
                    lat: tracking.customerLat,
                    lng: tracking.customerLng,
                    label: 'Điểm giao khách',
                    address: tracking.customerAddress,
                  }}
                  shipper={{
                    lat: tracking.currentLat,
                    lng: tracking.currentLng,
                    name: tracking.driverName,
                    plate: tracking.licensePlate,
                    heading: tracking.heading,
                  }}
                  routePoints={routePoints}
                  driverToStorePoints={
                    tracking.status === 'ASSIGNED' ? driverToStorePoints : undefined
                  }
                  status={tracking.status}
                  distanceKm={tracking.distanceKm}
                  etaMinutes={tracking.etaMinutes}
                  routeSource={routeSource}
                  height={400}
                  showGeofenceCircles={true}
                  onMapClickPoint={handleMapClickPoint}
                  accentColor="#0284C7"
                />

                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 8,
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                    <span>
                      Tọa độ GPS: <strong>{tracking.currentLat.toFixed(5)}°N, {tracking.currentLng.toFixed(5)}°E</strong>
                    </span>
                    <span>
                      Geofence 100m:{' '}
                      <strong style={{ color: tracking.distanceKm <= 0.1 ? '#16A34A' : '#D97706' }}>
                        {tracking.distanceKm <= 0.1
                          ? 'Đạt chuẩn mở khóa giao hàng'
                          : 'Đang ngoài bán kính 100m'}
                      </strong>
                    </span>
                  </div>
                </div>
              )
            )}

            {/* TAB 3: DRIVER SHIFT & DELIVERY HISTORY */}
            {currentDriverTab === 'driver-history' && (() => {
              const filteredShifts = driverShifts.filter((s) =>
                shiftHistoryFilter === 'ALL' ? true : s.status === shiftHistoryFilter,
              );
              const totalShiftTrips = driverShifts.reduce((acc, s) => acc + s.tripsCount, 0);
              const totalShiftNet = driverShifts.reduce((acc, s) => acc + s.netIncomeEarned, 0);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {/* Current Active Shift / Off-Shift Status Banner */}
                  {activeShift ? (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #0F172A 0%, #0369A1 100%)',
                        color: '#FFFFFF',
                        borderRadius: 12,
                        padding: '20px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: '50%',
                              background: '#34D399',
                              boxShadow: '0 0 0 4px rgba(52, 211, 153, 0.25)',
                            }}
                          />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#BAE6FD' }}>
                            Ca giao hàng đang hoạt động • #{activeShift.shiftCode}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.18rem', fontWeight: 800, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                          Thời lượng ca: {formatShiftDuration(activeShift.startedAt, null, shiftTickMs)}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#E0F2FE' }}>
                          Bắt đầu lúc {formatShiftDateTime(activeShift.startedAt)} • Đã giao{' '}
                          <strong>{activeShift.tripsCount} đơn</strong> • Thực nhận trong ca:{' '}
                          <strong>{activeShift.netIncomeEarned.toLocaleString('vi-VN')}đ</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleDriverShiftOnline}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 8,
                          background: '#FFFFFF',
                          color: '#0F172A',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                        }}
                      >
                        Kết thúc &amp; Chốt ca
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 12,
                        padding: '18px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                          Hiện tại bạn đang nghỉ ca
                        </div>
                        <div style={{ fontSize: '0.83rem', color: '#64748B' }}>
                          Nhấn &ldquo;Bật nhận chuyến&rdquo; để bắt đầu ghi nhận một ca giao hàng mới cho khu vực {currentDriver.operatingZone}.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleDriverShiftOnline}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 8,
                          background: '#0284C7',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                        }}
                      >
                        Bật nhận chuyến ngay
                      </button>
                    </div>
                  )}

                  {/* Summary Stats Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, fontVariantNumeric: 'tabular-nums' }}>
                    <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                        Tổng số ca đã ghi nhận
                      </div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A' }}>
                        {driverShifts.length} ca
                      </div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                        Tổng đơn hoàn tất trong các ca
                      </div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0284C7' }}>
                        {totalShiftTrips} đơn
                      </div>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                        Thực nhận tích lũy theo ca (85%)
                      </div>
                      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#059669' }}>
                        {totalShiftNet.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>

                  {/* Shift History Header & Filters */}
                  <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          Nhật Ký Các Ca Giao Hàng ({filteredShifts.length})
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
                          Mỗi ca trực được lưu mốc thời gian bật/nghỉ ca, thời lượng chạy, phương tiện và toàn bộ đơn hàng đã hoàn tất.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {(
                          [
                            { id: 'ALL', label: `Tất cả (${driverShifts.length})` },
                            { id: 'ACTIVE', label: 'Đang chạy' },
                            { id: 'ENDED', label: 'Đã chốt ca' },
                          ] as const
                        ).map((flt) => (
                          <button
                            key={flt.id}
                            type="button"
                            onClick={() => setShiftHistoryFilter(flt.id)}
                            style={{
                              padding: '7px 14px',
                              borderRadius: 999,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              border: '1px solid #CBD5E1',
                              background: shiftHistoryFilter === flt.id ? '#0F172A' : '#FFFFFF',
                              color: shiftHistoryFilter === flt.id ? '#FFFFFF' : '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            {flt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredShifts.length === 0 ? (
                      <div
                        style={{
                          padding: '36px 20px',
                          borderRadius: 10,
                          background: '#F8FAFC',
                          border: '1px dashed #CBD5E1',
                          textAlign: 'center',
                          color: '#64748B',
                          fontSize: '0.86rem',
                        }}
                      >
                        {driverShifts.length === 0
                          ? 'Chưa có ca giao hàng nào được ghi nhận. Khi bạn bật nhận chuyến hoặc hoàn tất giao đơn, lịch sử ca sẽ tự động hiển thị tại đây.'
                          : 'Không có ca giao hàng nào khớp bộ lọc đã chọn.'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {filteredShifts.map((shift, idx) => {
                          const isExpanded = expandedShiftIds[shift.id] ?? (idx === 0 || shift.status === 'ACTIVE');
                          const isActive = shift.status === 'ACTIVE';
                          return (
                            <div
                              key={shift.id}
                              style={{
                                borderRadius: 10,
                                border: `1px solid ${isActive ? '#7DD3FC' : '#E2E8F0'}`,
                                background: isActive ? '#F0F9FF' : '#F8FAFC',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                onClick={() =>
                                  setExpandedShiftIds((prev) => ({
                                    ...prev,
                                    [shift.id]: !isExpanded,
                                  }))
                                }
                                style={{
                                  padding: '16px 18px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: 12,
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                                      Ca #{shift.shiftCode}
                                    </span>
                                    <span
                                      style={{
                                        padding: '3px 9px',
                                        borderRadius: 999,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        background: isActive ? '#DCFCE7' : '#E2E8F0',
                                        color: isActive ? '#15803D' : '#334155',
                                      }}
                                    >
                                      {isActive
                                        ? 'Đang hoạt động'
                                        : shift.endReason === 'LOGOUT'
                                        ? 'Đã chốt (Đăng xuất)'
                                        : 'Đã nghỉ ca'}
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <Clock size={13} />
                                      {formatShiftDuration(shift.startedAt, shift.endedAt, shiftTickMs)}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                      <Calendar size={13} color="#64748B" />
                                      {formatShiftDateTime(shift.startedAt)} → {formatShiftDateTime(shift.endedAt)}
                                    </span>
                                    <span>
                                      Xe: <strong>{shift.vehicleType}</strong> ({shift.licensePlate}) • Khu vực: <strong>{shift.operatingZone}</strong>
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontVariantNumeric: 'tabular-nums' }}>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                      {shift.tripsCount} đơn • Cước {shift.grossShippingEarned.toLocaleString('vi-VN')}đ
                                    </div>
                                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#059669' }}>
                                      Thực nhận: +{shift.netIncomeEarned.toLocaleString('vi-VN')}đ
                                    </div>
                                  </div>
                                  {isExpanded ? <ChevronUp size={18} color="#475569" /> : <ChevronDown size={18} color="#475569" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div style={{ borderTop: '1px solid #E2E8F0', background: '#FFFFFF', padding: '14px 18px' }}>
                                  {shift.trips.length === 0 ? (
                                    <div style={{ fontSize: '0.82rem', color: '#64748B', fontStyle: 'italic' }}>
                                      Chưa có đơn hàng hoàn tất nào trong ca này.
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                        Chi tiết đơn giao trong ca ({shift.trips.length})
                                      </div>
                                      {shift.trips.map((trip) => (
                                        <div
                                          key={trip.orderId}
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: 10,
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            background: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            fontSize: '0.82rem',
                                          }}
                                        >
                                          <div>
                                            <div style={{ fontWeight: 700, color: '#0F172A' }}>
                                              #{trip.orderNumber} — {trip.merchantName}
                                            </div>
                                            <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
                                              Khách: {trip.recipientName} • Giao tại: {trip.deliveryAddress}
                                            </div>
                                            <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 2 }}>
                                              Hoàn tất lúc: {formatShiftDateTime(trip.completedAt)}
                                            </div>
                                          </div>
                                          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                              Cước: {trip.deliveryFee.toLocaleString('vi-VN')}đ
                                            </div>
                                            <div style={{ fontWeight: 800, color: '#059669' }}>
                                              +{trip.netEarning.toLocaleString('vi-VN')}đ
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Driver Bom-Hang Disputes & Evidence Archive */}
                  <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <AlertTriangle size={18} color="#DC2626" />
                          <span>Hồ Sơ Tố Cáo Bom Hàng &amp; Bằng Chứng Đã Gửi ({driverDisputes.length})</span>
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
                          Theo dõi trạng thái thẩm định của Admin đối với các đơn khách không nhận hàng và hình ảnh bằng chứng kèm theo.
                        </p>
                      </div>
                    </div>

                    {driverDisputes.length === 0 ? (
                      <div
                        style={{
                          padding: '28px 18px',
                          borderRadius: 10,
                          background: '#F8FAFC',
                          border: '1px dashed #CBD5E1',
                          textAlign: 'center',
                          color: '#64748B',
                          fontSize: '0.84rem',
                        }}
                      >
                        Chưa có hồ sơ tố cáo bom hàng nào.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {driverDisputes.map((disp) => {
                          const dispBadge =
                            disp.status === 'COMPENSATED_DRIVER'
                              ? { label: `Admin đã duyệt • Bồi hoàn +${disp.compensationAmount.toLocaleString('vi-VN')}đ`, bg: '#DCFCE7', color: '#15803D' }
                              : disp.status === 'REJECTED'
                              ? { label: 'Admin đã từ chối hồ sơ', bg: '#FEE2E2', color: '#DC2626' }
                              : { label: 'Chờ Admin thẩm định bằng chứng', bg: '#FEF3C7', color: '#B45309' };

                          return (
                            <div
                              key={disp.id}
                              style={{
                                padding: 16,
                                borderRadius: 10,
                                border: '1px solid #E2E8F0',
                                background: '#F8FAFC',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                                    #{disp.reportCode} • Đơn #{disp.orderNumber} ({disp.merchantName})
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 2 }}>
                                    Khách: <strong>{disp.customerName}</strong> ({disp.customerPhone}) • {disp.deliveryAddress}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    background: dispBadge.bg,
                                    color: dispBadge.color,
                                  }}
                                >
                                  {dispBadge.label}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.82rem', color: '#DC2626', fontWeight: 700, marginBottom: 4 }}>
                                Lý do: {disp.reasonLabel}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 8 }}>{disp.description}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 10 }}>
                                Gửi lúc: {formatShiftDateTime(disp.createdAt)} • Đã gọi {disp.callAttemptsCount} lần • Chờ {disp.waitMinutes} phút
                                {disp.gpsSnapshot
                                  ? ` • GPS: ${disp.gpsSnapshot.lat.toFixed(4)}, ${disp.gpsSnapshot.lng.toFixed(4)} (cách ${disp.gpsSnapshot.distanceToCustomerKm} km)`
                                  : ''}
                              </div>

                              {disp.evidenceImages.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {disp.evidenceImages.map((imgSrc, imgIdx) => (
                                    <img
                                      key={imgIdx}
                                      src={imgSrc}
                                      alt={`Bằng chứng ${imgIdx + 1}`}
                                      onClick={() =>
                                        setPreviewFoodImage({
                                          src: imgSrc,
                                          title: `Bằng chứng #${disp.reportCode} (${imgIdx + 1})`,
                                        })
                                      }
                                      style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 8,
                                        objectFit: 'cover',
                                        border: '1px solid #CBD5E1',
                                        cursor: 'zoom-in',
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB 4: DRIVER WALLET & EARNINGS LEDGER */}
            {currentDriverTab === 'driver-earnings' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 24, fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ background: '#FFFFFF', padding: 22, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                      Tổng cước giao hàng tích lũy
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
                      {totalShippingEarned.toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: 4 }}>
                      {currentDriver.completedTrips + completedDriverOrders.length} chuyến hoàn thành
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: 22, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                      Số dư ví hiện tại (Thực nhận 85%)
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284C7' }}>
                      {driverWalletBalance.toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 4 }}>
                      Tổng thu nhập: {driverNetIncome.toLocaleString('vi-VN')}đ • Đã rút: {approvedWithdrawnTotal.toLocaleString('vi-VN')}đ
                      {driverPenaltiesTotal > 0 && (
                        <div style={{ color: '#DC2626', fontWeight: 700, marginTop: 2 }}>
                          • Phạt trừ sự cố giao hàng: -{driverPenaltiesTotal.toLocaleString('vi-VN')}đ
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: 22, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: 6 }}>
                      Tài khoản nhận đối soát
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                      {currentDriver.bankName || 'Chưa cập nhật'} • {currentDriver.bankAccountNumber || '—'}
                    </div>
                    {(() => {
                      const myWithdrawals = driverWithdrawals.filter((w) => w.driverId === currentDriver.id);
                      const approvedTotal = myWithdrawals
                        .filter((w) => w.status === 'APPROVED')
                        .reduce((s, w) => s + w.amount, 0);
                      const pendingReq = myWithdrawals.find((w) => w.status === 'PENDING');
                      const availableToWithdraw = Math.max(0, driverNetIncome - approvedTotal - driverPenaltiesTotal);
                      const canWithdraw = availableToWithdraw > 0 && !pendingReq;

                      return (
                        <>
                          <div style={{ fontSize: '0.76rem', color: '#64748B', marginBottom: 8 }}>
                            Số dư khả dụng rút:{' '}
                            <strong style={{ color: '#059669' }}>
                              {availableToWithdraw.toLocaleString('vi-VN')}đ
                            </strong>
                            {' • '}Tối thiểu 50.000đ
                          </div>
                          {!pendingReq && availableToWithdraw > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <input
                                type="number"
                                min={50000}
                                max={availableToWithdraw}
                                step={10000}
                                value={withdrawAmountInput}
                                onChange={(e) => {
                                  setWithdrawAmountInput(e.target.value);
                                  if (withdrawError) setWithdrawError('');
                                }}
                                placeholder={`Nhập số tiền muốn rút (tối đa ${availableToWithdraw.toLocaleString('vi-VN')}đ)`}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: withdrawError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                                  fontSize: '0.8rem',
                                  background: '#FFFFFF',
                                }}
                              />
                              {withdrawError && (
                                <div style={{ fontSize: '0.74rem', color: '#DC2626', marginTop: 4, fontWeight: 600 }}>
                                  {withdrawError}
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            disabled={!canWithdraw}
                            onClick={() => {
                              if (!canWithdraw) return;
                              const parsedAmount = Number(withdrawAmountInput);
                              if (!withdrawAmountInput.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
                                setWithdrawError('Vui lòng nhập số tiền muốn rút.');
                                return;
                              }
                              if (parsedAmount < 50000) {
                                setWithdrawError('Hạn mức rút tối thiểu là 50.000đ.');
                                return;
                              }
                              if (parsedAmount > availableToWithdraw) {
                                setWithdrawError(
                                  `Số tiền rút không được vượt quá số dư khả dụng (${availableToWithdraw.toLocaleString('vi-VN')}đ).`,
                                );
                                return;
                              }
                              const newReq = {
                                id: `wd-${Date.now()}`,
                                driverId: currentDriver.id,
                                driverName: currentDriver.fullName,
                                driverPhone: currentDriver.phoneNumber,
                                licensePlate: currentDriver.licensePlate,
                                bankName: currentDriver.bankName || 'Ngân hàng liên kết',
                                bankAccountNumber: currentDriver.bankAccountNumber || '—',
                                bankAccountHolder: currentDriver.bankAccountHolder || currentDriver.fullName,
                                amount: parsedAmount,
                                status: 'PENDING' as const,
                                createdAt: new Date().toLocaleString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }),
                              };
                              void adminApi.createDatabaseWithdrawal({
                                ...newReq,
                                actorType: 'DRIVER',
                                actorId: currentDriver.id,
                                actorName: currentDriver.fullName,
                                actorPhone: currentDriver.phoneNumber,
                              });
                              setDriverWithdrawals((prev) => [newReq, ...prev]);
                              setWithdrawAmountInput('');
                              setWithdrawError('');
                              setWithdrawnNotice(true);
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 6,
                              background: canWithdraw ? '#059669' : '#CBD5E1',
                              color: canWithdraw ? '#FFFFFF' : '#64748B',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: canWithdraw ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <ArrowUpRight size={15} />{' '}
                            {pendingReq ? 'Đang chờ Admin duyệt rút tiền' : 'Gửi yêu cầu rút tiền về ngân hàng'}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {withdrawnNotice && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: '#FEF3C7',
                      color: '#92400E',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      marginBottom: 20,
                      border: '1px solid #FDE68A',
                    }}
                  >
                    Đã gửi yêu cầu rút tiền về tài khoản {currentDriver.bankName} ({currentDriver.bankAccountNumber}). Trạng thái: <strong>Chờ Admin duyệt & giải ngân</strong>.
                  </div>
                )}

                {driverWithdrawals.filter((w) => w.driverId === currentDriver.id).length > 0 && (
                  <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, marginBottom: 20 }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>
                      Lịch sử Yêu cầu Rút tiền (Đồng bộ Admin)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {driverWithdrawals
                        .filter((w) => w.driverId === currentDriver.id)
                        .map((w) => (
                          <div
                            key={w.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              borderRadius: 8,
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              fontSize: '0.82rem',
                            }}
                          >
                            <div>
                              <strong style={{ color: '#0F172A' }}>{w.amount.toLocaleString('vi-VN')}đ</strong> → {w.bankName} ({w.bankAccountNumber})
                              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                                Gửi lúc: {w.createdAt}
                                {w.processedAt ? ` • Xử lý: ${w.processedAt}` : ''}
                                {w.note ? ` • Ghi chú: ${w.note}` : ''}
                              </div>
                            </div>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background:
                                  w.status === 'APPROVED'
                                    ? '#DCFCE7'
                                    : w.status === 'REJECTED'
                                    ? '#FEE2E2'
                                    : '#FEF3C7',
                                color:
                                  w.status === 'APPROVED'
                                    ? '#15803D'
                                    : w.status === 'REJECTED'
                                    ? '#DC2626'
                                    : '#B45309',
                              }}
                            >
                              {w.status === 'APPROVED'
                                ? 'Admin đã giải ngân'
                                : w.status === 'REJECTED'
                                ? 'Đã từ chối'
                                : 'Chờ Admin duyệt'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {driverPenaltiesList.length > 0 && (
                  <div style={{ background: '#FFF1F2', borderRadius: 12, border: '1px solid #FECDD3', padding: 20, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#BE123C', fontWeight: 800, fontSize: '0.92rem', marginBottom: 12 }}>
                      <AlertTriangle size={18} />
                      <span>Biên Bản Khấu Trừ &amp; Xử Phạt Sự Cố Vận Chuyển ({driverPenaltiesList.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {driverPenaltiesList.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #FEE2E2',
                            borderRadius: 8,
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                              Đơn hàng #{p.orderNumber} ({p.code})
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#991B1B', marginTop: 2 }}>
                              Lý do sự cố: <strong>{p.issueType}</strong>
                            </div>
                            {p.resolutionNotes && (
                              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                                Quyết định Admin: {p.resolutionNotes}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#DC2626' }}>
                              -{(Number(p.compensationAmount) || 0).toLocaleString('vi-VN')}đ
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: 3,
                                fontSize: '0.7rem',
                                color: '#991B1B',
                                fontWeight: 700,
                                background: '#FEE2E2',
                                padding: '2px 8px',
                                borderRadius: 4,
                              }}
                            >
                              Đã khấu trừ ví
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Bảng Kê Chuyến Giao Hoàn Tất ({completedDriverOrders.length})
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
                        Đối soát thu nhập từng đơn giao hàng đã hoàn thành bởi {currentDriver.fullName}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('driver-history')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#F0F9FF',
                        border: '1px solid #BAE6FD',
                        color: '#0284C7',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <History size={15} /> Xem lịch sử theo từng ca trực
                    </button>
                  </div>

                  {completedDriverOrders.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 18px',
                        borderRadius: 10,
                        background: '#F8FAFC',
                        border: '1px dashed #CBD5E1',
                        textAlign: 'center',
                        color: '#64748B',
                        fontSize: '0.85rem',
                      }}
                    >
                      Chưa có chuyến giao hàng hoàn tất nào được ghi nhận vào ví.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                        <thead>
                          <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                            <th style={{ padding: '10px 14px' }}>Mã đơn</th>
                            <th style={{ padding: '10px 14px' }}>Điểm lấy → Điểm giao</th>
                            <th style={{ padding: '10px 14px' }}>Cước gộp</th>
                            <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thực nhận (85%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedDriverOrders.map((ord) => {
                            const fee = ord.deliveryFee || 15000;
                            const net = Math.round(fee * 0.85);
                            return (
                              <tr key={ord.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>#{ord.orderNumber}</td>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{ord.merchant?.name}</div>
                                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                                    Giao tới: {ord.recipientName} — {ord.deliveryAddress}
                                  </div>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155' }}>{fee.toLocaleString('vi-VN')}đ</td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                                  +{net.toLocaleString('vi-VN')}đ
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DRIVER ACCOUNT & VEHICLE PROFILE MANAGEMENT */}
            {currentDriverTab === 'driver-profile' && (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: 28,
                }}
              >
                {!isDriverApproved && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: '16px 18px',
                      borderRadius: 10,
                      background: '#FFFBEB',
                      border: '1.5px solid #F59E0B',
                      color: '#92400E',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <ShieldAlert size={22} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#78350F', marginBottom: 4 }}>
                        Bắt buộc hoàn tất thủ tục đăng ký xe &amp; thông tin cá nhân
                      </div>
                      <div style={{ fontSize: '0.83rem', lineHeight: 1.55 }}>
                        Tài khoản tài xế của bạn mới được khởi tạo. Để đảm bảo an toàn vận chuyển và đối soát cước phí, vui lòng bổ sung đầy đủ{' '}
                        <strong>CCCD, Giấy phép lái xe, Thông tin phương tiện &amp; biển kiểm soát, Khu vực hoạt động và Tài khoản ngân hàng</strong>. Sau khi hoàn tất, các mục nhận chuyến và bản đồ điều hướng sẽ được mở khóa ngay lập tức.
                      </div>
                    </div>
                  </div>
                )}

                {profileErrorNotice && (
                  <div
                    style={{
                      marginBottom: 18,
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      color: '#DC2626',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <ShieldAlert size={17} color="#DC2626" style={{ flexShrink: 0 }} />
                    <span>{profileErrorNotice}</span>
                  </div>
                )}

                {profileSavedNotice && (
                  <div
                    style={{
                      marginBottom: 18,
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={17} color="#059669" />
                    <span>{profileSavedNotice}</span>
                  </div>
                )}

                <form onSubmit={handleSaveDriverAccount}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                    {!isDriverApproved
                      ? 'Đăng Ký Phương Tiện & Xác Thực Hồ Sơ Cá Nhân Tài Xế'
                      : 'Quản Lý Thông Tin Tài Khoản & Phương Tiện Tài Xế'}
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: 22 }}>
                    {!isDriverApproved
                      ? 'Hoàn thành các trường thông tin có dấu (*) bên dưới để được cấp quyền nhận và vận chuyển đơn hàng trên DineGo'
                      : 'Cập nhật thông tin cá nhân, giấy phép lái xe, biển số phương tiện và tài khoản ngân hàng nhận thu nhập'}
                  </p>

                  {/* 1. KHỐI CHỤP ẢNH CHÂN DUNG & ĐỐI SOÁT KHUÔN MẶT SINH TRẮC HỌC (BẮT BUỘC ĐỂ VÀO LÀM) */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: drvPortraitUrl ? '1.5px solid #10B981' : '1.5px dashed #CBD5E1',
                      borderRadius: 14,
                      padding: 22,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            background: drvPortraitUrl ? '#ECFDF5' : '#FEF3C7',
                            color: drvPortraitUrl ? '#059669' : '#D97706',
                            padding: 8,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Camera size={22} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                            1. Ảnh Chụp Chân Dung Trực Diện Của Tài Xế (Bắt buộc xác thực vào làm) *
                          </h4>
                          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                            Yêu cầu: Nhìn thẳng, rõ ngũ quan, không đeo khẩu trang/kính đen, đủ ánh sáng. Dùng đối chiếu người nhận món thực tế & chống gian lận tài khoản.
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '5px 12px',
                          borderRadius: 8,
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          background: drvPortraitUrl ? '#DCFCE7' : '#FEE2E2',
                          color: drvPortraitUrl ? '#166534' : '#991B1B',
                          border: drvPortraitUrl ? '1px solid #BBF7D0' : '1px solid #FECACA',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {drvPortraitUrl ? '✓ Đã xác thực chân dung' : '⚠️ Bắt buộc phải có ảnh'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(160px, 180px) 1fr',
                        gap: 22,
                        alignItems: 'center',
                      }}
                    >
                      {/* Portrait Preview Frame */}
                      <div
                        style={{
                          height: 200,
                          borderRadius: 12,
                          border: drvPortraitUrl ? '2px solid #10B981' : '2px dashed #CBD5E1',
                          background: '#FFFFFF',
                          overflow: 'hidden',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                        }}
                      >
                        {drvPortraitUrl ? (
                          <>
                            <img
                              src={drvPortraitUrl}
                              alt="Ảnh chân dung tài xế"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'linear-gradient(to top, rgba(15,23,42,0.85), transparent)',
                                padding: '8px 10px',
                                textAlign: 'center',
                                color: '#34D399',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                              }}
                            >
                              ✓ Ảnh khuôn mặt hợp lệ
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: 14, color: '#94A3B8' }}>
                            <Camera size={40} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
                            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B' }}>
                              Chưa có ảnh chân dung
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 2 }}>
                              Chụp hoặc tải ảnh lên
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Controls & Presets */}
                      <div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                            ĐƯỜNG DẪN ẢNH CHÂN DUNG HOẶC TẢI LÊN TỪ MÁY
                          </label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              required
                              placeholder="Dán link ảnh chân dung (URL) hoặc chọn ảnh mẫu bên dưới..."
                              value={drvPortraitUrl}
                              onChange={(e) => setDrvPortraitUrl(e.target.value)}
                              style={{
                                flex: 1,
                                minWidth: 200,
                                padding: '10px 14px',
                                borderRadius: 8,
                                border: '1px solid #CBD5E1',
                                fontSize: '0.84rem',
                                background: '#FFFFFF',
                              }}
                            />
                            <label
                              style={{
                                background: '#0284C7',
                                color: '#FFFFFF',
                                padding: '10px 16px',
                                borderRadius: 8,
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Upload size={15} />
                              <span>Tải ảnh từ máy</span>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      if (ev.target?.result) {
                                        setDrvPortraitUrl(String(ev.target.result));
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', marginBottom: 8 }}>
                            HOẶC CHỌN NHANH ẢNH CHÂN DUNG TÀI XẾ MẪU (CHUẨN BẢO HỘ ĐỐI TÁC DINEGO):
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[
                              {
                                label: '👨 Nam tài xế 1',
                                url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
                              },
                              {
                                label: '👨 Nam tài xế 2',
                                url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
                              },
                              {
                                label: '👩 Nữ tài xế',
                                url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
                              },
                              {
                                label: '👨 Tài xế thanh niên',
                                url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
                              },
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setDrvPortraitUrl(preset.url)}
                                style={{
                                  padding: '7px 14px',
                                  borderRadius: 8,
                                  border: drvPortraitUrl === preset.url ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                                  background: drvPortraitUrl === preset.url ? '#F0F9FF' : '#FFFFFF',
                                  color: drvPortraitUrl === preset.url ? '#0369A1' : '#475569',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Scans Row: CCCD & GPLX */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                        marginTop: 18,
                        paddingTop: 16,
                        borderTop: '1px solid #E2E8F0',
                      }}
                    >
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          ẢNH CHỤP CĂN CƯỚC CÔNG DÂN (CCCD) MẶT TRƯỚC
                        </label>
                        <input
                          type="text"
                          placeholder="Link ảnh chụp CCCD hoặc dán URL..."
                          value={drvNationalIdImg}
                          onChange={(e) => setDrvNationalIdImg(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            fontSize: '0.82rem',
                            background: '#FFFFFF',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          ẢNH CHỤP GIẤY PHÉP LÁI XE (GPLX A1/A2)
                        </label>
                        <input
                          type="text"
                          placeholder="Link ảnh chụp GPLX hoặc dán URL..."
                          value={drvDriverLicenseImg}
                          onChange={(e) => setDrvDriverLicenseImg(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            fontSize: '0.82rem',
                            background: '#FFFFFF',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                    2. Thông Tin Cá Nhân &amp; Phương Tiện Vận Chuyển
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Họ và tên tài xế *
                      </label>
                      <input
                        type="text"
                        required
                        value={drvFullName}
                        onChange={(e) => setDrvFullName(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số điện thoại liên lạc *
                      </label>
                      <input
                        type="text"
                        required
                        value={drvPhone}
                        onChange={(e) => setDrvPhone(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Email tài khoản *
                      </label>
                      <input
                        type="email"
                        required
                        value={drvEmail}
                        onChange={(e) => setDrvEmail(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số Căn cước công dân (CCCD) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 079094008124"
                        value={drvNationalId}
                        onChange={(e) => setDrvNationalId(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số Giấy phép lái xe (GPLX) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 790198024112"
                        value={drvLicenseNum}
                        onChange={(e) => setDrvLicenseNum(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Loại xe máy đăng ký *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Honda Winner X 150cc"
                        value={drvVehicleType}
                        onChange={(e) => setDrvVehicleType(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Biển kiểm soát phương tiện *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 59-X3 892.14"
                        value={drvLicensePlate}
                        onChange={(e) => setDrvLicensePlate(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Khu vực hoạt động chính *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Quận 1, Quận 3, Bình Thạnh"
                        value={drvZone}
                        onChange={(e) => setDrvZone(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Ngân hàng thụ hưởng *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Vietcombank"
                        value={drvBankName}
                        onChange={(e) => setDrvBankName(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số tài khoản ngân hàng *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 0071001928401"
                        value={drvBankAcc}
                        onChange={(e) => setDrvBankAcc(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Chủ tài khoản ngân hàng *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: NGUYEN VAN A"
                        value={drvBankHolder}
                        onChange={(e) => setDrvBankHolder(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Liên hệ khẩn cấp (Người thân)
                      </label>
                      <input
                        type="text"
                        value={drvEmergency}
                        onChange={(e) => setDrvEmergency(e.target.value)}
                        placeholder="Số điện thoại & Họ tên người thân"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                      />
                    </div>
                    {isDriverApproved && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          Đổi mật khẩu đăng nhập (Bỏ trống nếu giữ nguyên)
                        </label>
                        <input
                          type="password"
                          value={drvNewPassword}
                          onChange={(e) => setDrvNewPassword(e.target.value)}
                          placeholder="Nhập mật khẩu mới nếu muốn thay đổi..."
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      borderRadius: 8,
                      background: !isDriverApproved ? '#059669' : '#0284C7',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Save size={16} />{' '}
                    {!isDriverApproved
                      ? 'Hoàn tất đăng ký xe & Mở khóa vận chuyển hàng'
                      : 'Lưu thông tin tài xế & phương tiện'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Lightbox Preview for Dish Verification Photo */}
        {previewFoodImage && (
          <div
            onClick={() => setPreviewFoodImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                maxWidth: 420,
                width: '100%',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>
                  {previewFoodImage.title}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFoodImage(null)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: '#F1F5F9',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <img
                src={previewFoodImage.src}
                alt={previewFoodImage.title}
                style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        )}

        {/* Driver Bom-Hang Report & Evidence Modal */}
        {isDisputeModalOpen && activeOrder && (
          <div
            onClick={() => setIsDisputeModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 9998,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                maxWidth: 560,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#FEF2F2',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={20} color="#DC2626" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#991B1B' }}>
                      Tố cáo khách bom hàng &amp; Gửi bằng chứng
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#B91C1C' }}>
                      Đơn #{activeOrder.orderNumber} • Khách: {activeOrder.recipientName} ({activeOrder.recipientPhone})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(false)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: '#FFFFFF',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitDisputeForm} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    fontSize: '0.78rem',
                    color: '#0369A1',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <strong>Xác thực GPS tự động:</strong> Vị trí của bạn ({tracking.currentLat.toFixed(5)}°N, {tracking.currentLng.toFixed(5)}°E) • Cách điểm giao{' '}
                  <strong>{tracking.distanceKm.toFixed(2)} km</strong>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Lý do tố cáo *
                  </label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value as DeliveryDisputeReason)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                  >
                    {(Object.keys(DISPUTE_REASON_LABELS) as DeliveryDisputeReason[]).map((key) => (
                      <option key={key} value={key}>
                        {DISPUTE_REASON_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Số cuộc gọi cho khách *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={disputeCallCount}
                      onChange={(e) => setDisputeCallCount(Number(e.target.value) || 1)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Thời gian đã chờ (phút) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={disputeWaitMins}
                      onChange={(e) => setDisputeWaitMins(Number(e.target.value) || 5)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Hình ảnh bằng chứng (Tối thiểu 1 ảnh, tối đa 4 ảnh) *
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: disputeEvidenceImages.length >= 4 ? 'not-allowed' : 'pointer',
                        opacity: disputeEvidenceImages.length >= 4 ? 0.5 : 1,
                      }}
                    >
                      <Upload size={14} />
                      <span>Tải ảnh hiện trường / Lịch sử gọi</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={disputeEvidenceImages.length >= 4}
                        onChange={handleUploadEvidenceFiles}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={disputeEvidenceImages.length >= 4}
                      onClick={handleAttachGpsSnapshotEvidence}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#F0F9FF',
                        border: '1px solid #7DD3FC',
                        color: '#0369A1',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: disputeEvidenceImages.length >= 4 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Camera size={14} />
                      <span>Đính kèm ảnh thẻ tọa độ GPS</span>
                    </button>
                  </div>

                  {disputeEvidenceImages.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                      {disputeEvidenceImages.map((src, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 78, height: 78 }}>
                          <img
                            src={src}
                            alt={`Evidence ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #CBD5E1' }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDisputeEvidenceImages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            style={{
                              position: 'absolute',
                              top: -6,
                              right: -6,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#DC2626',
                              color: '#FFFFFF',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mô tả chi tiết bằng chứng (tối thiểu 10 ký tự) *
                  </label>
                  <textarea
                    rows={3}
                    value={disputeDesc}
                    onChange={(e) => setDisputeDesc(e.target.value)}
                    placeholder="VD: Đã đứng trước địa chỉ giao lúc 17:45, gọi khách 4 cuộc không nghe máy, đã chụp ảnh món ăn tại cổng và ảnh lịch sử cuộc gọi..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem', resize: 'vertical' }}
                  />
                </div>

                {disputeError && (
                  <div style={{ padding: '9px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.8rem', fontWeight: 700 }}>
                    {disputeError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setIsDisputeModalOpen(false)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 8,
                      background: '#F1F5F9',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '9px 18px',
                      borderRadius: 8,
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                  >
                    Gửi tố cáo &amp; Chốt đơn bom hàng
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Divert Modal (Image 2: Khách tự ý đổi địa chỉ xa hơn khi shipper đã nhận món) */}
        {isDivertModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                width: '100%',
                maxWidth: 480,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Navigation size={18} color="#38BDF8" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    Quy Trình Khách Đổi Địa Chỉ Giao Hàng
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDivertModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    fontSize: '0.78rem',
                    color: '#15803D',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Chính sách DineGo:</strong>
                  <br />• <strong>Khoảng cách &lt; 1km:</strong> Shipper linh động hỗ trợ giao, khách tip thêm tùy tâm.
                  <br />• <strong>Khoảng cách &gt; 1km:</strong> Phụ phí <strong>10.000đ/km phát sinh</strong>. Shipper có quyền từ chối nếu khách không chấp nhận trả phí.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Địa chỉ mới khách yêu cầu giao tới:
                  </label>
                  <input
                    type="text"
                    value={divertNewAddress}
                    onChange={(e) => setDivertNewAddress(e.target.value)}
                    placeholder="VD: Số 45 Lê Lợi, Phường Bến Nghé, Quận 1..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Khoảng cách phát sinh thêm (km):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      step={0.5}
                      value={divertExtraKm}
                      onChange={(e) => setDivertExtraKm(Math.max(1, Number(e.target.value) || 1))}
                      style={{ width: 100, padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                    />
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                      = Phụ phí: <span style={{ color: '#059669' }}>{(divertExtraKm * 10000).toLocaleString('vi-VN')}đ</span> (10.000đ/km)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10 }}>
                  <button
                    type="button"
                    disabled={!divertNewAddress.trim()}
                    onClick={handleConfirmDivertFee}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 8,
                      background: divertNewAddress.trim() ? '#059669' : '#CBD5E1',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      cursor: divertNewAddress.trim() ? 'pointer' : 'not-allowed',
                      border: 'none',
                    }}
                  >
                    ✓ Khách đồng ý trả phụ phí (+{(divertExtraKm * 10000).toLocaleString('vi-VN')}đ)
                  </button>

                  <button
                    type="button"
                    disabled={!divertNewAddress.trim()}
                    onClick={handleRejectDivertAndDispute}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 8,
                      background: '#FEF2F2',
                      color: '#DC2626',
                      border: '1.5px solid #FECACA',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      cursor: divertNewAddress.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ✕ Khách từ chối trả phí ➔ Từ chối giao &amp; Tố cáo bom hàng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Order Chat Modal for Driver Console */}
        <OrderChatModal
          isOpen={isOrderChatOpen}
          onClose={() => setIsOrderChatOpen(false)}
          order={activeOrder || null}
          currentUserRole="DRIVER"
          currentUserId={currentDriver.id}
          currentUserName={currentDriver.fullName}
          defaultChannel={orderChatDefaultChannel}
          assignedDriverName={currentDriver.fullName}
        />

        {/* Dynamic VietQR Payment Modal for Driver */}
        <VietQrPaymentModal
          isOpen={Boolean(vietQrPaymentOrder)}
          onClose={() => setVietQrPaymentOrder(null)}
          order={vietQrPaymentOrder}
          viewerRole="DRIVER"
          onPaymentSuccess={(updated) => {
            onUpdateOrderDetails?.(updated.id, {
              paymentStatus: updated.paymentStatus,
              payment: updated.payment,
            });
          }}
        />
      </div>
    );
  }

  // ============================================================================
  // 2. CUSTOMER ORDER TRACKING VIEW (RENDERED INSIDE CUSTOMER STOREFRONT)
  // ============================================================================
  if (!activeOrder) {
    return (
      <div className="container" style={{ padding: '64px 20px', maxWidth: 680, textAlign: 'center' }}>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: '44px 28px',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#F0FDF4',
              color: '#00B14F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Bike size={30} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
            Chưa có đơn hàng nào đang giao
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem', marginBottom: 24, lineHeight: 1.6 }}>
            Khi bạn đặt đơn hàng bằng tài khoản của mình, hành trình tài xế và bản đồ giao hàng trực tiếp sẽ hiển thị tại đây.
          </p>
          {onExploreFood && (
            <button
              onClick={onExploreFood}
              className="btn btn-primary"
              style={{ padding: '11px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.92rem' }}
            >
              Khám phá nhà hàng & Đặt món ngay
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '24px 20px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#00B14F',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            Theo dõi hành trình đơn hàng trực tuyến
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: '4px 0 0 0', fontVariantNumeric: 'tabular-nums' }}>
            Đơn hàng #{tracking.orderNumber}
          </h1>
        </div>

        <button
          onClick={() => {
            setTracking((p) => ({
              ...p,
              status: 'DELIVERING',
              distanceKm: 1.4,
              etaMinutes: 8,
            }));
          }}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#334155',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RotateCcw size={14} /> Làm mới vị trí
        </button>
      </div>

      {/* 4-Step Progress Bar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {[
          { key: 'ASSIGNED', label: '1. Đã ghép tài xế', desc: 'Tài xế đã nhận đơn' },
          { key: 'ARRIVED_AT_STORE', label: '2. Đang lấy món', desc: 'Tài xế tại nhà hàng' },
          { key: 'DELIVERING', label: '3. Đang giao hàng', desc: `Dự kiến ${tracking.etaMinutes} phút` },
          { key: 'DELIVERED', label: '4. Đã giao thành công', desc: 'Hoàn tất đơn hàng' },
        ].map((st, idx) => {
          const orderIdx = ['ASSIGNED', 'ARRIVED_AT_STORE', 'DELIVERING', 'ARRIVED_AT_DESTINATION', 'DELIVERED'].indexOf(
            tracking.status,
          );
          const active =
            idx === 0
              ? orderIdx >= 0
              : idx === 1
              ? orderIdx >= 1
              : idx === 2
              ? orderIdx >= 2
              : orderIdx >= 4;

          return (
            <div
              key={st.key}
              style={{
                borderTop: `3px solid ${active ? '#00B14F' : '#E2E8F0'}`,
                paddingTop: 10,
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: active ? '#0F172A' : '#94A3B8' }}>
                {st.label}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>{st.desc}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Live Map */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 12, paddingBottom: 0 }}>
            <DeliveryMap
              store={{
                lat: tracking.storeLat,
                lng: tracking.storeLng,
                name: tracking.restaurantName,
                address: tracking.restaurantAddress,
              }}
              customer={{
                lat: tracking.customerLat,
                lng: tracking.customerLng,
                label: 'Điểm nhận hàng của bạn',
                address: tracking.customerAddress,
              }}
              shipper={{
                lat: tracking.currentLat,
                lng: tracking.currentLng,
                name: tracking.driverName,
                plate: tracking.licensePlate,
                heading: tracking.heading,
              }}
              routePoints={routePoints}
              driverToStorePoints={
                tracking.status === 'ASSIGNED' ? driverToStorePoints : undefined
              }
              status={tracking.status}
              distanceKm={tracking.distanceKm}
              etaMinutes={tracking.etaMinutes}
              routeSource={routeSource}
              height={380}
              showGeofenceCircles={true}
              accentColor="#00B14F"
            />
          </div>

          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.84rem',
              color: '#475569',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>Khoảng cách còn lại: <strong>{tracking.distanceKm.toFixed(2)} km</strong></span>
            <span>Thời gian dự kiến: <strong style={{ color: '#00B14F' }}>{tracking.etaMinutes} phút</strong></span>
          </div>
        </div>

        {/* Right: Driver Info & Delivery Address */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
              Thông tin tài xế giao đơn
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.02rem', color: '#0F172A' }}>{tracking.driverName}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 2 }}>
                  Biển số: <strong>{tracking.licensePlate}</strong> • Đánh giá {tracking.driverRating} ★
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleOpenOrderChat('CUSTOMER_DRIVER')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#15803D',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                  }}
                >
                  <MessageSquare size={13} /> Nhắn tin
                </button>
                <a
                  href={`tel:${tracking.driverPhone}`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: '#F0FDF4',
                    color: '#00B14F',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Phone size={14} /> {tracking.driverPhone}
                </a>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, fontSize: '0.84rem', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ marginBottom: 6 }}>
                  <strong>Nhà hàng:</strong> {tracking.restaurantName}
                </div>
                <div>
                  <strong>Giao đến:</strong> {tracking.customerAddress}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenOrderChat('CUSTOMER_MERCHANT')}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: '#EFF6FF',
                  border: '1px solid #BAE6FD',
                  color: '#0284C7',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Store size={13} /> Chat với Quán
              </button>
            </div>
          </div>

          {/* Customer On-Delivery Payment Alert Banner */}
          {activeOrder && activeOrder.status !== 'COMPLETED' && activeOrder.status !== 'CANCELLED' && (() => {
            const isCustPaid =
              activeOrder.paymentStatus === 'PAID' ||
              activeOrder.payment?.paymentStatus === 'SUCCESS' ||
              activeOrder.paymentMethod === 'MOMO_QR' ||
              activeOrder.paymentMethod === 'MOMO';
            return (
              <div
                style={{
                  marginBottom: 16,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: isCustPaid ? '#F0FDF4' : '#EFF6FF',
                  border: `1.5px solid ${isCustPaid ? '#86EFAC' : '#93C5FD'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: isCustPaid ? '#15803D' : '#1E40AF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isCustPaid ? (
                      <>
                        <CheckCircle2 size={18} color="#16A34A" />
                        <span>Đã thanh toán an toàn qua Sàn (0đ cần thu)</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={18} color="#0284C7" />
                        <span>Thanh toán khi nhận món • Cần trả: ${activeOrder.finalTotal.toLocaleString('vi-VN')}đ</span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: isCustPaid ? '#166534' : '#1E3A8A', marginTop: 2 }}>
                    {isCustPaid
                      ? 'Đơn hàng đã được thanh toán đầy đủ. Quý khách vui lòng nhận món và không cần đưa thêm tiền.'
                      : 'Đồng kiểm: Bạn được kiểm tra bao bì, tem dán rồi trả tiền mặt cho tài xế hoặc quét mã VietQR.'}
                  </div>
                </div>

                {!isCustPaid && (
                  <button
                    type="button"
                    onClick={() => setVietQrPaymentOrder(activeOrder)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <QrCode size={15} />
                    <span>Mở mã VietQR chuyển khoản</span>
                  </button>
                )}
              </div>
            );
          })()}

          {activeOrder && activeOrder.status !== 'COMPLETED' && activeOrder.status !== 'CANCELLED' && (
            <div
              style={{
                background: activeOrder.customerConfirmedReceipt ? '#ECFDF5' : '#FFFFFF',
                border: `1.5px solid ${activeOrder.customerConfirmedReceipt ? '#10B981' : '#86EFAC'}`,
                borderRadius: 12,
                padding: 18,
              }}
            >
              {activeOrder.customerConfirmedReceipt ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#065F46' }}>
                  <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Đã xác nhận nhận được hàng</div>
                    <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 2 }}>
                      Shipper hiện có thể hoàn tất đơn giao hàng này trên hệ thống.
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', marginBottom: 4 }}>
                    Xác nhận nhận hàng từ tài xế
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                    Vui lòng chỉ bấm xác nhận sau khi bạn đã trực tiếp nhận đủ món từ shipper.
                  </p>
                  <button
                    type="button"
                    onClick={() => onConfirmCustomerReceipt?.(activeOrder.id)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 9,
                      background: '#00B14F',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Xác nhận đã nhận được hàng</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {tracking.status === 'DELIVERED' && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803D', fontWeight: 800, marginBottom: 8 }}>
                <CheckCircle2 size={18} /> Đơn hàng đã giao thành công
              </div>
              <p style={{ fontSize: '0.82rem', color: '#166534', marginBottom: 14 }}>
                Cảm ơn bạn đã đặt món trên DineGo. Hãy chia sẻ đánh giá để giúp nhà hàng nâng cao chất lượng phục vụ.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {activeOrder && onOpenReviewModal && (
                  <button
                    onClick={() => onOpenReviewModal(activeOrder)}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: 8,
                      background: '#00B14F',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Star size={14} /> Đánh giá món ăn
                  </button>
                )}
                {onExploreFood && (
                  <button
                    onClick={onExploreFood}
                    style={{
                      padding: '9px 14px',
                      borderRadius: 8,
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                    }}
                  >
                    Đặt thêm món
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Button for Customer */}
      <div
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 40,
        }}
      >
        <button
          type="button"
          onClick={() => handleOpenOrderChat('CUSTOMER_MERCHANT')}
          style={{
            padding: '12px 20px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '0.88rem',
            border: 'none',
            boxShadow: '0 10px 25px -5px rgba(0, 177, 79, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <MessageSquare size={18} />
          <span>Nhắn tin đơn hàng</span>
        </button>
      </div>

      {/* Real-time Order Chat Modal for Customer */}
      <OrderChatModal
        isOpen={isOrderChatOpen}
        onClose={() => setIsOrderChatOpen(false)}
        order={activeOrder}
        currentUserRole="CUSTOMER"
        currentUserId={currentUser?.id || 'guest-customer'}
        currentUserName={currentUser?.fullName || activeOrder.recipientName || 'Khách hàng'}
        defaultChannel={orderChatDefaultChannel}
        assignedDriverName={tracking.driverName}
      />

      {/* Dynamic VietQR Payment Modal for Customer */}
      <VietQrPaymentModal
        isOpen={Boolean(vietQrPaymentOrder)}
        onClose={() => setVietQrPaymentOrder(null)}
        order={vietQrPaymentOrder}
        viewerRole="CUSTOMER"
        onPaymentSuccess={(updated) => {
          onUpdateOrderDetails?.(updated.id, {
            paymentStatus: updated.paymentStatus,
            payment: updated.payment,
          });
        }}
      />
    </div>
  );
};
