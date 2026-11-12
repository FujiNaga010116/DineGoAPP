// ==============================================================================
// DineGo Frontend — Catering & Event Feast Page (GrabFood-Style 5-Step Flow)
// Step 1: Party Type -> Step 2: Store & Feast List -> Step 3: Details & Notes
// -> Step 4: Checkout & Voucher -> Step 5: Quote & MoMo Deposit
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Cake,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  Heart,
  Home,
  MapPin,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  User as UserIcon,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  CATERING_NOTE_SUGGESTIONS,
  EVENT_TIME_SLOTS,
  FEAST_PACKAGES,
  PARTY_TYPES,
  calculateFeastPricing,
  calculateVoucherDiscount,
  type BookingRecord,
  type FeastPackage,
  type PartyTypeId,
} from '../data/cateringCatalog';
import type { Order, User } from '../types';
import {
  AddressMapPicker,
  type AddressPickerValue,
} from '../components/common/AddressMapPicker';
import {
  calculateHaversineKm,
  getDefaultVerifiedAddress,
} from '../utils/routing';
import {
  loadAdminVouchers,
  saveAdminVouchers,
  type ManagedVoucher,
} from '../utils/vouchers';

interface CateringPageProps {
  currentUser?: User | null;
  onOrderPlaced?: (order: Order) => void;
}

type CateringStep = 1 | 2 | 3 | 4 | 5;
type SortMode = 'recommended' | 'price-asc' | 'rating-desc';

const STEP_ITEMS: { step: CateringStep; label: string; shortLabel: string }[] = [
  { step: 1, label: 'Chọn loại tiệc', shortLabel: 'Chọn tiệc' },
  { step: 2, label: 'Cửa hàng & Mâm', shortLabel: 'Chọn mâm' },
  { step: 3, label: 'Chi tiết & Ghi chú', shortLabel: 'Tùy chỉnh' },
  { step: 4, label: 'Thanh toán', shortLabel: 'Thanh toán' },
  { step: 5, label: 'Đặt cọc MoMo', shortLabel: 'Đặt cọc' },
];

const getCateringStorageKey = (userId?: string | null) =>
  `dinego_catering_${userId ? userId : 'guest'}`;

const renderPartyIcon = (id: PartyTypeId, color: string) => {
  const props = { size: 28, color };
  switch (id) {
    case 'wedding':
      return <Heart {...props} />;
    case 'memorial':
      return <Flame {...props} />;
    case 'birthday':
      return <Cake {...props} />;
    case 'housewarming':
      return <Home {...props} />;
    case 'corporate':
      return <Briefcase {...props} />;
    case 'longevity':
      return <Award {...props} />;
  }
};

export const CateringPage: React.FC<CateringPageProps> = ({
  currentUser,
  onOrderPlaced,
}) => {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'wizard' | 'bookings'>('wizard');
  const [currentStep, setCurrentStep] = useState<CateringStep>(1);
  const [selectedPartyType, setSelectedPartyType] = useState<PartyTypeId | null>(null);
  const [showAllPackages, setShowAllPackages] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');

  // Selected Package & Customization (Steps 2-3)
  const [selectedPackage, setSelectedPackage] = useState<FeastPackage>(FEAST_PACKAGES[0]);
  const [tableCount, setTableCount] = useState<number>(5);
  const [customNote, setCustomNote] = useState<string>('');

  // Checkout Details (Step 4)
  const defaultEventDate = useMemo(
    () =>
      new Date(Date.now() + 5 * 24 * 3600 * 1000)
        .toISOString()
        .split('T')[0],
    [],
  );
  const verifiedDefault = getDefaultVerifiedAddress(currentUser);
  const [eventDate, setEventDate] = useState<string>(defaultEventDate);
  const [eventTime, setEventTime] = useState<string>('18:00');
  const [eventAddress, setEventAddress] = useState<string>(
    verifiedDefault?.fullAddress || currentUser?.address || '',
  );
  const [eventLat, setEventLat] = useState<number | undefined>(
    verifiedDefault?.latitude,
  );
  const [eventLng, setEventLng] = useState<number | undefined>(
    verifiedDefault?.longitude,
  );
  const [mapReferenceName, setMapReferenceName] = useState<string | undefined>(
    verifiedDefault?.mapReferenceName || verifiedDefault?.fullAddress,
  );
  const [isAddressMapSynced, setIsAddressMapSynced] = useState<boolean>(
    Boolean(verifiedDefault),
  );
  const [mapPickerKey, setMapPickerKey] = useState<number>(0);
  const [contactName, setContactName] = useState<string>(
    verifiedDefault?.recipientName || currentUser?.fullName || '',
  );
  const [contactPhone, setContactPhone] = useState<string>(
    verifiedDefault?.phone || currentUser?.phoneNumber || '',
  );
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Voucher State (Step 4)
  const [appliedVoucher, setAppliedVoucher] = useState<ManagedVoucher | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');
  const [voucherFeedback, setVoucherFeedback] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  // Deposit State (Step 5)
  const [depositPercent, setDepositPercent] = useState<30 | 50>(30);
  const [activeMomoModal, setActiveMomoModal] = useState<BookingRecord | null>(null);
  const [depositSuccessCode, setDepositSuccessCode] = useState<string | null>(null);

  // Bookings Persistence
  const getInitialBookings = (userId?: string | null): BookingRecord[] => {
    const key = getCateringStorageKey(userId);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Ignore malformed local data
      }
    }
    if (userId === 'u-user1-001') {
      return [
        {
          id: 'bk-sample-01',
          bookingCode: 'DG-FEAST-902144',
          partyTypeTitle: 'Tân gia & Khai trương',
          merchantName: 'Cơm Tấm & Cỗ Gia Truyền 1985',
          packageName: 'Mâm Cỗ Tân Gia Thịnh Vượng',
          tableCount: 6,
          eventDate: defaultEventDate,
          eventTime: '18:00',
          eventAddress: 'Biệt thự 12, Thảo Điền, TP. Thủ Đức',
          totalAmount: 14250000,
          depositAmount: 4275000,
          remainingAmount: 9975000,
          status: 'DEPOSIT_PAID',
          createdAt: '2026-11-01',
        },
      ];
    }
    return [];
  };

  const cateringOwnerId = currentUser?.id ?? null;
  const [bookingState, setBookingState] = useState<{
    ownerId: string | null;
    items: BookingRecord[];
  }>(() => ({
    ownerId: cateringOwnerId,
    items: getInitialBookings(cateringOwnerId),
  }));
  const bookings =
    bookingState.ownerId === cateringOwnerId ? bookingState.items : [];
  const setBookings = (
    updater: BookingRecord[] | ((prev: BookingRecord[]) => BookingRecord[]),
  ) => {
    setBookingState((prev) => {
      const current =
        prev.ownerId === cateringOwnerId
          ? prev.items
          : getInitialBookings(cateringOwnerId);
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ownerId: cateringOwnerId, items: next };
    });
  };

  useEffect(() => {
    localStorage.setItem(
      getCateringStorageKey(bookingState.ownerId),
      JSON.stringify(bookingState.items),
    );
  }, [bookingState]);

  // Computed Pricing & Validation
  const pricing = useMemo(
    () =>
      calculateFeastPricing(
        selectedPackage.pricePerTable,
        tableCount,
        depositPercent,
        appliedVoucher,
      ),
    [selectedPackage.pricePerTable, tableCount, depositPercent, appliedVoucher],
  );

  const eventDateTimeMs = useMemo(() => {
    if (!eventDate) return 0;
    const timePart = eventTime || '18:00';
    return new Date(`${eventDate}T${timePart}:00`).getTime();
  }, [eventDate, eventTime]);

  const hoursUntilEvent = (eventDateTimeMs - Date.now()) / (1000 * 3600);
  const isValidAdvanceTime = Number.isFinite(hoursUntilEvent) && hoursUntilEvent >= 72;

  const selectedPartyObj = useMemo(
    () => PARTY_TYPES.find((p) => p.id === selectedPartyType) || null,
    [selectedPartyType],
  );

  // Filtered & Sorted Packages for Step 2
  const filteredPackages = useMemo(() => {
    const base =
      showAllPackages || !selectedPartyType
        ? FEAST_PACKAGES
        : FEAST_PACKAGES.filter((pkg) => pkg.partyTypes.includes(selectedPartyType));

    const sorted = [...base];
    if (sortMode === 'price-asc') {
      sorted.sort((a, b) => a.pricePerTable - b.pricePerTable);
    } else if (sortMode === 'rating-desc') {
      sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    }
    return sorted;
  }, [selectedPartyType, showAllPackages, sortMode]);

  const availableVouchers = useMemo(() => {
    return loadAdminVouchers().filter(
      (v) =>
        v.isActive !== false &&
        Number(v.usageCount || 0) < Number(v.maxUsage || 999999),
    );
  }, [isVoucherModalOpen]);

  // Step Navigation Helper
  const goToStep = (step: CateringStep) => {
    setViewMode('wizard');
    setCurrentStep(step);
    setCheckoutError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPartyType = (partyId: PartyTypeId) => {
    setSelectedPartyType(partyId);
    setShowAllPackages(false);
    const firstMatch = FEAST_PACKAGES.find((p) => p.partyTypes.includes(partyId));
    if (firstMatch) setSelectedPackage(firstMatch);
    goToStep(2);
  };

  const handleSelectPackage = (pkg: FeastPackage) => {
    setSelectedPackage(pkg);
    goToStep(3);
  };

  const handleAppendNoteSuggestion = (suggestion: string) => {
    setCustomNote((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return suggestion;
      if (trimmed.toLowerCase().includes(suggestion.toLowerCase())) return prev;
      return `${trimmed}; ${suggestion}`;
    });
  };

  const handleProceedFromCheckout = () => {
    if (!eventAddress.trim()) {
      setCheckoutError('Vui lòng nhập địa chỉ tổ chức tiệc tại gia hoặc địa điểm sự kiện.');
      return;
    }
    if (
      !isAddressMapSynced ||
      typeof eventLat !== 'number' ||
      typeof eventLng !== 'number'
    ) {
      setCheckoutError(
        'Địa chỉ tổ chức tiệc chưa khớp hoặc không tìm thấy trên bản đồ! Vui lòng kiểm tra lại ký tự, bấm "Tìm trên bản đồ" hoặc nhấp trực tiếp vị trí đúng trên bản đồ.',
      );
      return;
    }
    if (!contactPhone.trim()) {
      setCheckoutError('Vui lòng nhập số điện thoại liên hệ để bếp trưởng xác nhận lịch.');
      return;
    }
    if (!isValidAdvanceTime) {
      setCheckoutError(
        'Vui lòng chọn thời gian tổ chức trước tối thiểu 72 giờ (3 ngày) để bếp chuẩn bị nguyên liệu tươi.',
      );
      return;
    }
    setCheckoutError('');
    goToStep(5);
  };

  const handleApplyVoucherCode = (codeRaw: string) => {
    const code = codeRaw.trim().toUpperCase();
    if (!code) return;
    const found = availableVouchers.find((v) => v.code.toUpperCase() === code);
    if (!found) {
      setVoucherFeedback({
        text: `Không tìm thấy mã "${code}" hoặc mã đã hết lượt.`,
        isError: true,
      });
      return;
    }
    if (pricing.afterVolumeTotal < Number(found.minOrder || 0)) {
      setVoucherFeedback({
        text: `Mã ${found.code} áp dụng cho đơn từ ${Number(found.minOrder).toLocaleString()}đ.`,
        isError: true,
      });
      return;
    }
    setAppliedVoucher(found);
    setVoucherCodeInput('');
    setVoucherFeedback({
      text: `Đã áp dụng mã ${found.code} (-${calculateVoucherDiscount(found, pricing.afterVolumeTotal).toLocaleString()}đ).`,
      isError: false,
    });
    setIsVoucherModalOpen(false);
  };

  const handleCreateBooking = () => {
    if (!isValidAdvanceTime) {
      goToStep(4);
      setCheckoutError(
        'Vui lòng chọn thời gian tổ chức tiệc trước tối thiểu 72 giờ (3 ngày) theo quy định của nhà hàng.',
      );
      return;
    }

    const newBooking: BookingRecord = {
      id: `bk-${Date.now()}`,
      bookingCode: `DG-FEAST-${Date.now().toString().slice(-6)}`,
      partyTypeTitle: selectedPartyObj?.title || 'Đặt tiệc lưu động',
      merchantId: selectedPackage.merchantId,
      merchantName: selectedPackage.merchantName,
      serviceArea: selectedPackage.serviceArea,
      packageName: selectedPackage.name,
      pricePerTable: selectedPackage.pricePerTable,
      guestCountPerTable: selectedPackage.guestCountPerTable,
      imageUrl: selectedPackage.imageUrl,
      dishes: selectedPackage.dishes,
      tableCount,
      eventDate,
      eventTime,
      eventAddress: eventAddress.trim(),
      eventLat,
      eventLng,
      contactName: contactName.trim() || currentUser?.fullName || 'Khách hàng DineGo',
      contactPhone: contactPhone.trim() || currentUser?.phoneNumber || '0901000004',
      customNote: customNote.trim() || undefined,
      voucherCode: appliedVoucher?.code,
      voucherDiscount: pricing.voucherDiscountAmount || undefined,
      grossTotal: pricing.grossTotal,
      discountAmount: pricing.volumeDiscountAmount + pricing.voucherDiscountAmount,
      depositPercent,
      totalAmount: pricing.netTotal,
      depositAmount: pricing.depositAmount,
      remainingAmount: pricing.remainingAmount,
      status: 'PENDING_DEPOSIT',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setBookings([newBooking, ...bookings]);

    if (appliedVoucher) {
      const updated = loadAdminVouchers().map((v) =>
        v.code.toUpperCase() === appliedVoucher.code.toUpperCase()
          ? { ...v, usageCount: Number(v.usageCount || 0) + 1 }
          : v,
      );
      saveAdminVouchers(updated);
    }

    try {
      const existingFeastsRaw = localStorage.getItem('dinego_feast_bookings');
      const existingFeasts = existingFeastsRaw ? JSON.parse(existingFeastsRaw) : [];
      const syncedFeast = {
        id: newBooking.id,
        bookingCode: newBooking.bookingCode,
        customerName: newBooking.contactName || 'Khách hàng DineGo',
        customerPhone: newBooking.contactPhone || '0901000004',
        partyTypeTitle: newBooking.partyTypeTitle || 'Đặt tiệc lưu động',
        merchantId: newBooking.merchantId || selectedPackage.merchantId,
        merchantName: newBooking.merchantName || selectedPackage.merchantName,
        packageName: `${newBooking.packageName} (${selectedPackage.guestCountPerTable} người/bàn)`,
        tableCount: newBooking.tableCount,
        guestCountPerTable: selectedPackage.guestCountPerTable,
        dishes: selectedPackage.dishes,
        eventDate: newBooking.eventDate,
        eventTime: newBooking.eventTime || '18:00',
        address: newBooking.eventAddress || currentUser?.address || 'TP. Hồ Chí Minh',
        note: newBooking.customNote,
        subtotal: pricing.grossTotal,
        discountAmount: pricing.volumeDiscountAmount + pricing.voucherDiscountAmount,
        depositPercent,
        totalAmount: newBooking.totalAmount,
        depositAmount: newBooking.depositAmount,
        status: 'PENDING_APPROVAL',
        depositPaid: false,
      };
      const nextFeasts = [
        syncedFeast,
        ...(Array.isArray(existingFeasts) ? existingFeasts : []),
      ];
      localStorage.setItem('dinego_feast_bookings', JSON.stringify(nextFeasts));
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('dinego_feasts_sync');
        ch.postMessage(JSON.stringify(nextFeasts));
        ch.close();
      }
    } catch {
      // Ignore storage sync failure
    }

    setActiveMomoModal(newBooking);
  };

  const handleConfirmMomoDeposit = (bookingId: string) => {
    const paidRecord =
      bookings.find((b) => b.id === bookingId) ||
      (activeMomoModal?.id === bookingId ? activeMomoModal : undefined);

    setBookings(
      bookings.map((b) => (b.id === bookingId ? { ...b, status: 'DEPOSIT_PAID' } : b)),
    );
    try {
      const existingFeastsRaw = localStorage.getItem('dinego_feast_bookings');
      if (existingFeastsRaw) {
        const parsed = JSON.parse(existingFeastsRaw);
        if (Array.isArray(parsed)) {
          const updatedFeasts = parsed.map((fb: Record<string, unknown>) =>
            fb.id === bookingId ? { ...fb, depositPaid: true } : fb,
          );
          localStorage.setItem('dinego_feast_bookings', JSON.stringify(updatedFeasts));
          if (typeof BroadcastChannel !== 'undefined') {
            const ch = new BroadcastChannel('dinego_feasts_sync');
            ch.postMessage(JSON.stringify(updatedFeasts));
            ch.close();
          }
        }
      }
    } catch {
      // Ignore storage sync failure
    }

    setActiveMomoModal(null);
    setCurrentStep(1);
    setAppliedVoucher(null);
    setVoucherFeedback(null);

    if (paidRecord && onOrderPlaced) {
      const matchedPkg =
        FEAST_PACKAGES.find((p) => p.name === paidRecord.packageName) || selectedPackage;
      const guestCount = paidRecord.guestCountPerTable || matchedPkg.guestCountPerTable || 6;
      const unitPrice = paidRecord.pricePerTable || matchedPkg.pricePerTable;
      const gross = paidRecord.grossTotal ?? unitPrice * paidRecord.tableCount;
      const discount = paidRecord.discountAmount ?? Math.max(0, gross - paidRecord.totalAmount);
      const depositPct: 30 | 50 =
        paidRecord.depositPercent ||
        (paidRecord.totalAmount > 0 &&
          Math.round((paidRecord.depositAmount / paidRecord.totalAmount) * 100) >= 45
          ? 50
          : 30);

      const cateringOrder: Order = {
        id: `ord-catering-${paidRecord.id}`,
        orderNumber: paidRecord.bookingCode,
        orderType: 'CATERING',
        customerId: currentUser?.id || 'guest',
        customerEmail: currentUser?.email,
        status: 'CONFIRMED',
        subtotal: gross,
        discountAmount: discount,
        deliveryFee: 0,
        finalTotal: paidRecord.totalAmount,
        deliveryAddress: paidRecord.eventAddress || 'TP. Hồ Chí Minh',
        deliveryLatitude: paidRecord.eventLat ?? eventLat,
        deliveryLongitude: paidRecord.eventLng ?? eventLng,
        recipientName: paidRecord.contactName || currentUser?.fullName || 'Khách hàng DineGo',
        recipientPhone: paidRecord.contactPhone || currentUser?.phoneNumber || '0901000004',
        customerNote: paidRecord.customNote || null,
        createdAt: new Date().toISOString(),
        merchant: {
          id: paidRecord.merchantId || matchedPkg.merchantId,
          name: paidRecord.merchantName || matchedPkg.merchantName,
          address: matchedPkg.merchantAddress || paidRecord.serviceArea || matchedPkg.serviceArea,
          phoneNumber: '1900 1000',
          logoUrl: paidRecord.imageUrl || matchedPkg.imageUrl,
          latitude: matchedPkg.merchantLat,
          longitude: matchedPkg.merchantLng,
        },
        items: [
          {
            id: `item-${paidRecord.id}`,
            itemName: `${paidRecord.packageName} (${guestCount} khách/mâm)`,
            itemImage: paidRecord.imageUrl || matchedPkg.imageUrl,
            basePrice: unitPrice,
            quantity: paidRecord.tableCount,
            subtotal: gross,
            note: paidRecord.customNote || null,
            toppings: [],
          },
        ],
        payment: {
          id: `pay-${paidRecord.id}`,
          paymentMethod: 'MOMO_QR',
          paymentStatus: 'SUCCESS',
          amount: paidRecord.depositAmount,
          currency: 'VND',
          transactionRef: `MOMO-FEAST-${paidRecord.bookingCode.slice(-6)}`,
          paidAt: new Date().toISOString(),
        },
        cateringDetails: {
          bookingCode: paidRecord.bookingCode,
          partyTypeTitle: paidRecord.partyTypeTitle || 'Đặt tiệc lưu động',
          packageName: paidRecord.packageName,
          merchantRating: matchedPkg.rating,
          merchantReviewCount: matchedPkg.reviewCount,
          tableCount: paidRecord.tableCount,
          guestCountPerTable: guestCount,
          eventDate: paidRecord.eventDate,
          eventTime: paidRecord.eventTime || '18:00',
          dishes: paidRecord.dishes || matchedPkg.dishes,
          depositPercent: depositPct,
          depositAmount: paidRecord.depositAmount,
          remainingAmount: paidRecord.remainingAmount,
          voucherCode: paidRecord.voucherCode,
          customNote: paidRecord.customNote,
        },
      };

      onOrderPlaced(cateringOrder);
      return;
    }

    setDepositSuccessCode(paidRecord?.bookingCode || null);
    setViewMode('bookings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelBooking = (booking: BookingRecord) => {
    const daysUntil =
      (new Date(booking.eventDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    let refundPercent = 0;
    if (daysUntil >= 7) refundPercent = 100;
    else if (daysUntil >= 3) refundPercent = 50;

    const refundValue = Math.round((booking.depositAmount * refundPercent) / 100);
    const confirmed = window.confirm(
      `Chính sách hoàn cọc tiệc DineGo:\n` +
      `Thời gian còn lại: ${Math.max(0, Math.round(daysUntil))} ngày.\n` +
      `Chính sách áp dụng: Hoàn ${refundPercent}% tiền cọc (${refundValue.toLocaleString()} VND qua MoMo).\n\n` +
      `Bạn có chắc chắn muốn hủy đặt tiệc này không?`,
    );

    if (confirmed) {
      setBookings(
        bookings.map((b) => (b.id === booking.id ? { ...b, status: 'CANCELLED' } : b)),
      );
    }
  };

  const canNavigateToStep = (targetStep: CateringStep) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return selectedPartyType !== null || currentStep >= 2;
    if (targetStep === 3) return currentStep >= 3;
    if (targetStep === 4) return currentStep >= 4;
    if (targetStep === 5) return currentStep >= 5;
    return false;
  };

  const progressPercent = ((currentStep - 1) / (STEP_ITEMS.length - 1)) * 100;

  return (
    <div
      className="container"
      style={{ padding: '24px 16px 72px', maxWidth: 1140 }}
    >
      {/* Top Header & Mode Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(0, 177, 79, 0.1)',
              color: 'var(--primary)',
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 6,
            }}
          >
            <Sparkles size={13} /> Đặt Tiệc Lưu Động DineGo
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            {viewMode === 'bookings'
              ? 'Hợp Đồng & Tiến Trình Đặt Tiệc'
              : 'Đặt Mâm Cỗ & Tổ Chức Tiệc Tại Gia'}
          </h1>
        </div>

        <div
          style={{
            display: 'inline-flex',
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 999,
            padding: 4,
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('wizard')}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: '0.84rem',
              fontWeight: 700,
              background: viewMode === 'wizard' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'wizard' ? '#FFFFFF' : 'var(--text-secondary)',
            }}
          >
            Đặt tiệc mới
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bookings')}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: '0.84rem',
              fontWeight: 700,
              background: viewMode === 'bookings' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'bookings' ? '#FFFFFF' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Hợp đồng của tôi
            <span
              style={{
                padding: '1px 7px',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 800,
                background:
                  viewMode === 'bookings'
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(0, 177, 79, 0.12)',
                color: viewMode === 'bookings' ? '#FFFFFF' : 'var(--primary)',
              }}
            >
              {bookings.length}
            </span>
          </button>
        </div>
      </div>

      {/* Success Banner after MoMo Deposit */}
      {depositSuccessCode && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={22} color="#059669" />
            <div>
              <div style={{ fontWeight: 800, color: '#065F46', fontSize: '0.94rem' }}>
                Đặt cọc MoMo thành công cho hợp đồng {depositSuccessCode}!
              </div>
              <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                Nhà hàng đã nhận yêu cầu và sẽ liên hệ xác nhận lịch phục vụ trong ít phút.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDepositSuccessCode(null)}
            style={{
              background: 'transparent',
              color: '#065F46',
              padding: 4,
              borderRadius: 6,
            }}
            aria-label="Đóng thông báo"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* WIZARD VIEW (5-STEP GRABFOOD MULTI-STEP FLOW)                         */}
      {/* ===================================================================== */}
      {viewMode === 'wizard' && (
        <>
          {/* Progress Bar / Stepper */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '18px 22px',
              marginBottom: 24,
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                }}
              >
                Bước {currentStep} / {STEP_ITEMS.length}:{' '}
                <strong style={{ color: 'var(--primary)' }}>
                  {STEP_ITEMS[currentStep - 1].label}
                </strong>
              </span>
              {selectedPartyObj && currentStep > 1 && (
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: selectedPartyObj.accentColor,
                    background: selectedPartyObj.accentBg,
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  Loại tiệc: {selectedPartyObj.title}
                </span>
              )}
            </div>

            {/* Linear Progress Track */}
            <div
              style={{
                height: 6,
                background: '#E5E7EB',
                borderRadius: 999,
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(8, progressPercent)}%`,
                  background: 'var(--primary)',
                  borderRadius: 999,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Stepper Nodes */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              {STEP_ITEMS.map((item) => {
                const isDone = item.step < currentStep;
                const isActive = item.step === currentStep;
                const clickable = canNavigateToStep(item.step);
                return (
                  <button
                    key={item.step}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && goToStep(item.step)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 6px',
                      borderRadius: 12,
                      background: isActive ? 'rgba(0, 177, 79, 0.08)' : 'transparent',
                      cursor: clickable ? 'pointer' : 'default',
                      opacity: clickable || isActive ? 1 : 0.55,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        background: isDone
                          ? 'var(--primary)'
                          : isActive
                            ? 'var(--primary)'
                            : '#F3F4F6',
                        color: isDone || isActive ? '#FFFFFF' : '#6B7280',
                        border: isActive
                          ? '3px solid rgba(0, 177, 79, 0.25)'
                          : '1px solid transparent',
                      }}
                    >
                      {isDone ? <Check size={15} /> : item.step}
                    </div>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: isActive ? 800 : 600,
                        color: isActive
                          ? 'var(--primary)'
                          : isDone
                            ? 'var(--text-main)'
                            : 'var(--text-muted)',
                        textAlign: 'center',
                      }}
                    >
                      {item.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* STEP 1: CHỌN LOẠI HÌNH TIỆC (TƯ VẤN)                              */}
          {/* ----------------------------------------------------------------- */}
          {currentStep === 1 && (
            <div>
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 18,
                  padding: '24px',
                  marginBottom: 20,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ marginBottom: 20 }}>
                  <h2
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      margin: '0 0 6px 0',
                    }}
                  >
                    Bạn đang chuẩn bị tổ chức buổi tiệc nào?
                  </h2>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      margin: 0,
                    }}
                  >
                    Chọn mục đích bữa tiệc để DineGo gợi ý cửa hàng nấu cỗ & thực đơn mâm phù hợp nhất.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16,
                  }}
                >
                  {PARTY_TYPES.map((party) => {
                    const isSelected = selectedPartyType === party.id;
                    return (
                      <button
                        key={party.id}
                        type="button"
                        onClick={() => handleSelectPartyType(party.id)}
                        style={{
                          textAlign: 'left',
                          background: '#FFFFFF',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: 16,
                          padding: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          boxShadow: isSelected
                            ? '0 8px 22px rgba(0, 177, 79, 0.14)'
                            : 'var(--shadow-xs)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            width: '100%',
                          }}
                        >
                          <div
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 14,
                              background: party.accentBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {renderPartyIcon(party.id, party.accentColor)}
                          </div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: 999,
                              background: party.accentBg,
                              color: party.accentColor,
                            }}
                          >
                            {party.tag}
                          </span>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: '1.08rem',
                              fontWeight: 800,
                              color: 'var(--text-main)',
                              marginBottom: 4,
                            }}
                          >
                            {party.title}
                          </div>
                          <div
                            style={{
                              fontSize: '0.84rem',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.45,
                            }}
                          >
                            {party.subtitle}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 'auto',
                            paddingTop: 12,
                            borderTop: '1px dashed var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            fontSize: '0.82rem',
                          }}
                        >
                          <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                            {party.priceHint}
                          </span>
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {party.recommendedTables} <ArrowRight size={14} color="var(--primary)" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advisory Perks Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {[
                  {
                    icon: <Clock size={18} color="var(--primary)" />,
                    title: 'Đặt trước tối thiểu 72 giờ',
                    desc: 'Nguyên liệu tươi nhập sáng sớm, chế biến nóng trước giờ tiệc.',
                  },
                  {
                    icon: <Tag size={18} color="var(--primary)" />,
                    title: 'Chiết khấu theo quy mô mâm',
                    desc: 'Giảm 5% từ 5 mâm, giảm 10% từ 10 mâm + hỗ trợ mã Voucher.',
                  },
                  {
                    icon: <ShieldCheck size={18} color="var(--primary)" />,
                    title: 'Cọc trước 30% qua MoMo',
                    desc: 'Minh bạch hợp đồng, hỗ trợ hoàn cọc 100% khi báo hủy trước 7 ngày.',
                  },
                ].map((perk, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      padding: 16,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(0, 177, 79, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {perk.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        {perk.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {perk.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STEP 2: GỢI Ý CỬA HÀNG & MÂM CỖ (GRABFOOD VERTICAL LIST)          */}
          {/* ----------------------------------------------------------------- */}
          {currentStep === 2 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.84rem' }}
                  >
                    <ArrowLeft size={15} /> Đổi loại tiệc
                  </button>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      Gợi ý Cửa hàng & Mâm cỗ {selectedPartyObj ? `cho ${selectedPartyObj.title}` : ''}
                    </h2>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Tìm thấy {filteredPackages.length} gói mâm cỗ đối tác đã xác thực chất lượng
                    </div>
                  </div>
                </div>

                {/* Sort & Filter Bar */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(
                    [
                      { id: 'recommended', label: 'Phù hợp nhất' },
                      { id: 'price-asc', label: 'Giá tốt nhất' },
                      { id: 'rating-desc', label: 'Đánh giá cao' },
                    ] as { id: SortMode; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortMode(s.id)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 999,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: sortMode === s.id ? 'var(--primary)' : '#FFFFFF',
                        color: sortMode === s.id ? '#FFFFFF' : 'var(--text-secondary)',
                        border: `1px solid ${sortMode === s.id ? 'var(--primary)' : 'var(--border)'}`,
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAllPackages((prev) => !prev)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 999,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: showAllPackages ? '#EEF2FF' : '#FFFFFF',
                      color: showAllPackages ? '#4F46E5' : 'var(--text-secondary)',
                      border: `1px solid ${showAllPackages ? '#C7D2FE' : 'var(--border)'}`,
                    }}
                  >
                    {showAllPackages ? 'Đang hiện tất cả gói' : 'Xem thêm gói khác'}
                  </button>
                </div>
              </div>

              {/* GrabFood-style Vertical Store & Package List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredPackages.map((pkg) => {
                  const isCurrent = selectedPackage.id === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg)}
                      style={{
                        background: '#FFFFFF',
                        border: `1.5px solid ${isCurrent ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 18,
                        padding: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 18,
                        alignItems: 'stretch',
                        flexWrap: 'wrap',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: 210,
                          minHeight: 150,
                          borderRadius: 14,
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#F3F4F6',
                        }}
                      >
                        <img
                          src={pkg.imageUrl}
                          alt={pkg.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        {pkg.highlightTag && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 10,
                              left: 10,
                              background: 'var(--primary)',
                              color: '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: 8,
                              boxShadow: '0 2px 8px rgba(0, 177, 79, 0.35)',
                            }}
                          >
                            {pkg.highlightTag}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          flex: '1 1 320px',
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: 8,
                                  marginBottom: 4,
                                }}
                              >
                                <h3
                                  style={{
                                    fontSize: '1.16rem',
                                    fontWeight: 900,
                                    color: 'var(--text-main)',
                                    margin: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <UtensilsCrossed size={16} color="var(--primary)" />
                                  {pkg.merchantName}
                                </h3>
                                <span
                                  style={{
                                    background: 'rgba(0, 177, 79, 0.1)',
                                    color: 'var(--primary)',
                                    padding: '2px 9px',
                                    borderRadius: 999,
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                  }}
                                >
                                  {pkg.merchantBadge}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 700,
                                  color: 'var(--primary)',
                                }}
                              >
                                Gói mâm: {pkg.name}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div
                                style={{
                                  fontSize: '1.22rem',
                                  fontWeight: 900,
                                  color: 'var(--primary)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {pkg.pricePerTable.toLocaleString()} đ
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                / mâm {pkg.guestCountPerTable} khách
                              </div>
                            </div>
                          </div>

                          {/* Rating & Metadata Strip */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 12,
                              margin: '8px 0',
                              fontSize: '0.82rem',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontWeight: 800,
                                color: '#111827',
                              }}
                            >
                              <Star size={14} fill="#F59E0B" color="#F59E0B" />
                              {pkg.rating.toFixed(1)}
                              <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                                ({pkg.reviewCount} đánh giá)
                              </span>
                            </span>
                            <span>•</span>
                            <span>{pkg.dishes.length} món đặc sắc</span>
                            <span>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={13} color="var(--primary)" /> {pkg.serviceArea}
                            </span>
                          </div>

                          <p
                            style={{
                              fontSize: '0.85rem',
                              color: 'var(--text-secondary)',
                              margin: '0 0 10px 0',
                            }}
                          >
                            {pkg.description}
                          </p>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10,
                            paddingTop: 10,
                            borderTop: '1px dashed var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {pkg.dishes.slice(0, 3).map((dish, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.74rem',
                                  padding: '3px 9px',
                                  borderRadius: 6,
                                  background: 'var(--bg-main)',
                                  color: 'var(--text-secondary)',
                                  fontWeight: 600,
                                }}
                              >
                                {dish}
                              </span>
                            ))}
                            {pkg.dishes.length > 3 && (
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  color: 'var(--primary)',
                                  fontWeight: 700,
                                  padding: '3px 4px',
                                }}
                              >
                                +{pkg.dishes.length - 3} món
                              </span>
                            )}
                          </div>

                          <span
                            className="btn btn-primary"
                            style={{ padding: '9px 16px', borderRadius: 10, fontSize: '0.84rem' }}
                          >
                            Chọn mâm này <ArrowRight size={15} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STEP 3: CHI TIẾT MÂM & TÙY CHỈNH (GHI CHÚ CHO NHÀ HÀNG)           */}
          {/* ----------------------------------------------------------------- */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.84rem' }}
                >
                  <ArrowLeft size={15} /> Quay lại chọn mâm khác
                </button>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Bước 3: Xem thực đơn món & tùy chỉnh yêu cầu riêng
                </span>
              </div>

              {/* Selected Store & Package Hero Card */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 18,
                  padding: 20,
                  display: 'flex',
                  gap: 20,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <img
                  src={selectedPackage.imageUrl}
                  alt={selectedPackage.name}
                  style={{
                    width: 140,
                    height: 115,
                    borderRadius: 14,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: '1 1 280px' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                    {selectedPackage.merchantName}
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#D97706', marginLeft: 10 }}>
                      ★ {selectedPackage.rating.toFixed(1)} ({selectedPackage.reviewCount} đánh giá)
                    </span>
                  </h2>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>
                    {selectedPackage.name}
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {selectedPackage.description} • Tiêu chuẩn <strong>{selectedPackage.guestCountPerTable} khách/mâm</strong>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {selectedPackage.pricePerTable.toLocaleString()} đ
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Đơn giá niêm yết / 1 mâm
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 20,
                  alignItems: 'start',
                }}
              >
                {/* Dish List */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    padding: 22,
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      margin: '0 0 14px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <UtensilsCrossed size={18} color="var(--primary)" /> Thực đơn chi tiết ({selectedPackage.dishes.length} món)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedPackage.dishes.map((dish, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'var(--bg-main)',
                        }}
                      >
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            background: 'rgba(0, 177, 79, 0.12)',
                            color: 'var(--primary)',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {dish}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quantity & Special Request Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Table Quantity Box */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border)',
                      borderRadius: 18,
                      padding: 22,
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                          Số lượng mâm cần đặt
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Dự kiến phục vụ ~{tableCount * selectedPackage.guestCountPerTable} khách
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setTableCount((c) => Math.max(2, c - 1))}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label="Giảm số mâm"
                        >
                          <Minus size={16} />
                        </button>
                        <span
                          style={{
                            minWidth: 64,
                            textAlign: 'center',
                            fontWeight: 900,
                            fontSize: '1.1rem',
                            color: 'var(--primary)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {tableCount} mâm
                        </span>
                        <button
                          type="button"
                          onClick={() => setTableCount((c) => Math.min(30, c + 1))}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: 'var(--primary)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label="Tăng số mâm"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={2}
                      max={30}
                      value={tableCount}
                      onChange={(e) => setTableCount(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer', marginBottom: 10 }}
                    />

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[2, 5, 10, 15, 20].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTableCount(preset)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: tableCount === preset ? 'rgba(0, 177, 79, 0.12)' : 'var(--bg-main)',
                            color: tableCount === preset ? 'var(--primary)' : 'var(--text-secondary)',
                            border: `1px solid ${tableCount === preset ? 'var(--primary)' : 'var(--border)'}`,
                          }}
                        >
                          {preset} mâm {preset >= 10 ? '(-10%)' : preset >= 5 ? '(-5%)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Special Request Textarea */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border)',
                      borderRadius: 18,
                      padding: 22,
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <label
                      htmlFor="catering-custom-note"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        marginBottom: 6,
                      }}
                    >
                      <MessageSquare size={18} color="var(--primary)" /> Ghi chú / Yêu cầu đặc biệt cho nhà hàng
                    </label>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                      Bạn muốn đổi món trong mâm, thêm món yêu thích, hay dặn dò khẩu vị cho bếp trưởng? Hãy ghi rõ bên dưới:
                    </p>

                    <textarea
                      id="catering-custom-note"
                      rows={4}
                      maxLength={400}
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="Ví dụ: Đổi món gà hấp sang gà nướng mật ong, ít cay cho trẻ em, thêm 1 đĩa xôi gấc, không dùng bột ngọt..."
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        resize: 'vertical',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                        marginBottom: 10,
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>Gợi ý nhanh (bấm để thêm):</span>
                      <span>{customNote.length}/400 ký tự</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {CATERING_NOTE_SUGGESTIONS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleAppendNoteSuggestion(chip)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 999,
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom CTA Bar */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '16px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 14,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {selectedPackage.name} • <strong>{tableCount} mâm</strong>
                    {pricing.volumeDiscountRate > 0 && (
                      <span style={{ color: 'var(--primary)', fontWeight: 800, marginLeft: 8 }}>
                        (Đã giảm {pricing.volumeDiscountRate}% mâm lớn)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                    Tạm tính: {pricing.afterVolumeTotal.toLocaleString()} đ
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="btn btn-primary"
                  style={{ padding: '12px 26px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 800 }}
                >
                  Tiếp tục tới Thanh toán <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STEP 4: THANH TOÁN (CHECKOUT - GIỐNG GRABFOOD)                    */}
          {/* ----------------------------------------------------------------- */}
          {currentStep === 4 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.84rem' }}
                >
                  <ArrowLeft size={15} /> Quay lại tùy chỉnh mâm
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: 24,
                  alignItems: 'start',
                }}
              >
                {/* Left Column: Delivery Info & Order Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Delivery Address & Event Time Card */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border)',
                      borderRadius: 18,
                      padding: 22,
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1.08rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        margin: '0 0 16px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <MapPin size={18} color="var(--primary)" /> Thông tin giao hàng & Tổ chức tiệc
                    </h3>

                    {/* Quick Saved Addresses if logged in */}
                    {currentUser?.savedAddresses && currentUser.savedAddresses.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                          Chọn nhanh từ sổ địa chỉ đã ghim bản đồ:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {currentUser.savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                setEventAddress(addr.fullAddress);
                                setEventLat(addr.latitude);
                                setEventLng(addr.longitude);
                                setMapReferenceName(addr.mapReferenceName || addr.fullAddress);
                                setIsAddressMapSynced(
                                  Boolean(
                                    typeof addr.latitude === 'number' &&
                                      typeof addr.longitude === 'number',
                                  ),
                                );
                                setMapPickerKey((k) => k + 1);
                                if (addr.recipientName) setContactName(addr.recipientName);
                                if (addr.phone) setContactPhone(addr.phone);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 999,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background:
                                  eventAddress === addr.fullAddress
                                    ? 'rgba(0, 177, 79, 0.1)'
                                    : 'var(--bg-main)',
                                color:
                                  eventAddress === addr.fullAddress
                                    ? 'var(--primary)'
                                    : 'var(--text-secondary)',
                                border: `1px solid ${eventAddress === addr.fullAddress
                                    ? 'var(--primary)'
                                    : 'var(--border)'
                                  }`,
                              }}
                            >
                              {addr.label}: {addr.fullAddress}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Kitchen Location & Distance Info */}
                    <div
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: '10px 14px',
                        marginBottom: 14,
                        fontSize: '0.8rem',
                        color: '#334155',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div>
                        <strong>Bếp xuất phát:</strong> {selectedPackage.merchantName} ({selectedPackage.merchantAddress})
                      </div>
                      {typeof eventLat === 'number' && typeof eventLng === 'number' && (
                        <span style={{ color: '#00B14F', fontWeight: 800 }}>
                          Cách địa điểm tiệc ~
                          {calculateHaversineKm(
                            { lat: selectedPackage.merchantLat, lng: selectedPackage.merchantLng },
                            { lat: eventLat, lng: eventLng },
                          )}{' '}
                          km
                        </span>
                      )}
                    </div>

                    {/* Interactive Map Picker (Synced with project's OpenStreetMap + Leaflet validator) */}
                    <div style={{ marginBottom: 14 }}>
                      <AddressMapPicker
                        key={mapPickerKey}
                        initialAddress={eventAddress}
                        initialLat={eventLat}
                        initialLng={eventLng}
                        initialMapReferenceName={mapReferenceName}
                        height={240}
                        onChange={(val: AddressPickerValue) => {
                          setEventAddress(val.fullAddress);
                          setEventLat(val.latitude);
                          setEventLng(val.longitude);
                          setMapReferenceName(val.mapReferenceName);
                          setIsAddressMapSynced(val.isSynced);
                          if (val.isSynced && checkoutError) {
                            setCheckoutError('');
                          }
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
                          <UserIcon size={14} color="var(--primary)" /> Người liên hệ
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Họ và tên"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            fontSize: '0.88rem',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
                          <Phone size={14} color="var(--primary)" /> Số điện thoại *
                        </label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="090xxxxxxx"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            fontSize: '0.88rem',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
                          <Calendar size={14} color="var(--primary)" /> Ngày diễn ra tiệc *
                        </label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'var(--bg-main)',
                            border: `1px solid ${isValidAdvanceTime ? 'var(--border)' : '#EF4444'}`,
                            fontSize: '0.9rem',
                            fontWeight: 600,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 700, marginBottom: 6 }}>
                          <Clock size={14} color="var(--primary)" /> Giờ khai tiệc *
                        </label>
                        <input
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Time Slots */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {EVENT_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setEventTime(slot)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: eventTime === slot ? 'rgba(0, 177, 79, 0.12)' : 'var(--bg-main)',
                            color: eventTime === slot ? 'var(--primary)' : 'var(--text-secondary)',
                            border: `1px solid ${eventTime === slot ? 'var(--primary)' : 'var(--border)'}`,
                          }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>

                    {!isValidAdvanceTime && (
                      <div
                        style={{
                          color: '#EF4444',
                          fontSize: '0.8rem',
                          marginTop: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                        }}
                      >
                        <AlertCircle size={15} /> Cần đặt trước ít nhất 72 giờ để bếp trưởng chuẩn bị nguyên liệu tươi ngon!
                      </div>
                    )}
                  </div>

                  {/* Feast Order Details Review */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border)',
                      borderRadius: 18,
                      padding: 22,
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        Chi tiết đơn tiệc
                      </h3>
                      <button
                        type="button"
                        onClick={() => goToStep(3)}
                        style={{
                          background: 'transparent',
                          color: 'var(--primary)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                        }}
                      >
                        Chỉnh sửa mâm / ghi chú
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                      <img
                        src={selectedPackage.imageUrl}
                        alt={selectedPackage.name}
                        style={{ width: 68, height: 68, borderRadius: 12, objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {selectedPackage.merchantName}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {selectedPackage.name}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Tổng số mâm: <strong>{tableCount} mâm</strong> ({tableCount * selectedPackage.guestCountPerTable} khách)
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-main)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Các món đã chọn trong mâm ({selectedPackage.dishes.length} món):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedPackage.dishes.map((d, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 9px',
                              borderRadius: 6,
                              background: '#FFFFFF',
                              border: '1px solid var(--border)',
                              color: 'var(--text-main)',
                              fontWeight: 600,
                            }}
                          >
                            {i + 1}. {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        background: customNote ? '#ECFDF5' : 'var(--bg-main)',
                        border: `1px solid ${customNote ? '#A7F3D0' : 'var(--border)'}`,
                        borderRadius: 12,
                        padding: 12,
                        fontSize: '0.84rem',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Ghi chú đi kèm: </span>
                      <span style={{ color: customNote ? '#065F46' : 'var(--text-muted)' }}>
                        {customNote || 'Không có ghi chú đặc biệt'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Voucher & Subtotal Summary */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    padding: 22,
                    boxShadow: 'var(--shadow-md)',
                    position: 'sticky',
                    top: 90,
                  }}
                >
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-main)' }}>
                    Ưu đãi & Tạm tính
                  </h3>

                  {/* Voucher Button */}
                  <div style={{ marginBottom: 16 }}>
                    <button
                      type="button"
                      onClick={() => setIsVoucherModalOpen(true)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: appliedVoucher ? '#ECFDF5' : 'var(--bg-main)',
                        border: `1.5px dashed ${appliedVoucher ? 'var(--primary)' : '#CBD5E1'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        <Tag size={17} color="var(--primary)" />
                        {appliedVoucher
                          ? `Đã chọn: ${appliedVoucher.code}`
                          : 'Chọn mã giảm giá / Voucher'}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {appliedVoucher ? 'Đổi mã' : 'Chọn ngay →'}
                      </span>
                    </button>

                    {appliedVoucher && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 8,
                          fontSize: '0.78rem',
                          color: '#059669',
                          fontWeight: 700,
                        }}
                      >
                        <span>{appliedVoucher.title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedVoucher(null);
                            setVoucherFeedback(null);
                          }}
                          style={{ background: 'transparent', color: '#DC2626', fontWeight: 700, fontSize: '0.78rem' }}
                        >
                          Gỡ mã
                        </button>
                      </div>
                    )}

                    {voucherFeedback && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: voucherFeedback.isError ? '#DC2626' : '#059669',
                        }}
                      >
                        {voucherFeedback.text}
                      </div>
                    )}
                  </div>

                  {/* Subtotal Breakdown */}
                  <div
                    style={{
                      background: 'var(--bg-main)',
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 16,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      <span>Đơn giá ({tableCount} mâm × {selectedPackage.pricePerTable.toLocaleString()}đ):</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {pricing.grossTotal.toLocaleString()} đ
                      </span>
                    </div>
                    {pricing.volumeDiscountRate > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 8 }}>
                        <span>Ưu đãi mâm lớn ({pricing.volumeDiscountRate}%):</span>
                        <span>-{pricing.volumeDiscountAmount.toLocaleString()} đ</span>
                      </div>
                    )}
                    {pricing.voucherDiscountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#059669', fontWeight: 700, marginBottom: 8 }}>
                        <span>Voucher ({appliedVoucher?.code}):</span>
                        <span>-{pricing.voucherDiscountAmount.toLocaleString()} đ</span>
                      </div>
                    )}
                    <div
                      style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        color: 'var(--text-main)',
                      }}
                    >
                      <span>Tổng tiền tạm tính:</span>
                      <span style={{ color: 'var(--primary)', fontSize: '1.22rem' }}>
                        {pricing.netTotal.toLocaleString()} đ
                      </span>
                    </div>
                  </div>

                  {checkoutError && (
                    <div
                      style={{
                        background: '#FEE2E2',
                        color: '#B91C1C',
                        padding: '10px 12px',
                        borderRadius: 10,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleProceedFromCheckout}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: '0.96rem', fontWeight: 800 }}
                  >
                    Xác nhận đơn tiệc <ArrowRight size={17} />
                  </button>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
                    Bước tiếp theo: Chọn tỷ lệ đặt cọc 30% hoặc 50% qua MoMo
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STEP 5: XÁC NHẬN ĐẶT CỌC (MOMO)                                   */}
          {/* ----------------------------------------------------------------- */}
          {currentStep === 5 && (
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', borderRadius: 10, fontSize: '0.84rem' }}
                >
                  <ArrowLeft size={15} /> Quay lại chỉnh sửa thông tin
                </button>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: 28,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    margin: '0 0 6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <DollarSign size={22} color="var(--primary)" /> Báo Giá & Đặt Cọc Hợp Đồng
                </h2>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>
                  Kiểm tra lại thông tin hợp đồng và chọn tỷ lệ đặt cọc đợt 1 qua ví MoMo để khóa lịch bếp.
                </p>

                {/* Contract Summary Card */}
                <div
                  style={{
                    background: 'var(--bg-main)',
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 20,
                    fontSize: '0.86rem',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div>
                    <strong>Loại tiệc:</strong> {selectedPartyObj?.title || 'Đặt tiệc lưu động'} •{' '}
                    <strong>{tableCount} mâm</strong> ({tableCount * selectedPackage.guestCountPerTable} khách)
                  </div>
                  <div>
                    <strong>Gói thực đơn:</strong> {selectedPackage.name} ({selectedPackage.merchantName})
                  </div>
                  <div>
                    <strong>Thời gian:</strong> {eventTime} ngày {eventDate}
                  </div>
                  <div>
                    <strong>Địa điểm:</strong> {eventAddress}
                  </div>
                  <div>
                    <strong>Liên hệ:</strong> {contactName || 'Khách hàng'} ({contactPhone})
                  </div>
                  {customNote && (
                    <div>
                      <strong>Ghi chú cho bếp:</strong> {customNote}
                    </div>
                  )}
                </div>

                {/* Deposit Ratio Selector (30% vs 50%) */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>
                    Chọn tỷ lệ đặt cọc đợt 1 (MoMo):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {([30, 50] as const).map((pct) => {
                      const active = depositPercent === pct;
                      const amt = Math.round((pricing.netTotal * pct) / 100);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDepositPercent(pct)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 12,
                            textAlign: 'left',
                            background: active ? 'rgba(0, 177, 79, 0.1)' : 'var(--bg-main)',
                            border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                            color: active ? 'var(--primary)' : 'var(--text-main)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                            Cọc {pct}% {pct === 30 && '(Khuyên dùng)'}
                          </div>
                          <div style={{ fontWeight: 900, fontSize: '1.08rem', marginTop: 4 }}>
                            {amt.toLocaleString()} đ
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Final Financial Breakdown */}
                <div
                  style={{
                    background: 'var(--bg-main)',
                    padding: 18,
                    borderRadius: 14,
                    marginBottom: 18,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                    <span>Tổng giá trị hợp đồng (sau ưu đãi):</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                      {pricing.netTotal.toLocaleString()} đ
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', marginBottom: 6 }}>
                    <span>Tiền cọc đợt 1 ({depositPercent}% thanh toán ngay):</span>
                    <span>{pricing.depositAmount.toLocaleString()} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    <span>Còn lại thanh toán khi tiệc hoàn tất:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {pricing.remainingAmount.toLocaleString()} đ
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: '#FEF3C7',
                    color: '#92400E',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: 18,
                  }}
                >
                  Chính sách bảo vệ tiền cọc: Hoàn 100% cọc nếu hủy trước 7 ngày, hoàn 50% nếu hủy trước 3–6 ngày.
                </div>

                <button
                  type="button"
                  onClick={handleCreateBooking}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: 12,
                    background: '#00B14F',
                  }}
                >
                  Xác nhận Đặt Tiệc & Đặt Cọc MoMo
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* BOOKINGS HISTORY SECTION (Shown on Contracts Tab or below Step 1)     */}
      {/* ===================================================================== */}
      {(viewMode === 'bookings' || (viewMode === 'wizard' && currentStep === 1 && bookings.length > 0)) && (
        <div style={{ marginTop: viewMode === 'bookings' ? 8 : 42 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 16 }}>
            Hợp Đồng & Tiến Trình Đặt Tiệc Của Bạn ({bookings.length})
          </h3>

          {bookings.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <p style={{ margin: '0 0 14px 0', fontSize: '0.95rem' }}>
                Bạn chưa có hợp đồng đặt tiệc lưu động nào.
              </p>
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="btn btn-primary"
                style={{ padding: '10px 20px', borderRadius: 10 }}
              >
                Bắt đầu đặt tiệc ngay
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {bookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                      {b.bookingCode}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontWeight: 700,
                        background:
                          b.status === 'COMPLETED'
                            ? '#D1FAE5'
                            : b.status === 'DEPOSIT_PAID'
                              ? '#E0F2FE'
                              : b.status === 'CANCELLED'
                                ? '#FEE2E2'
                                : '#FEF3C7',
                        color:
                          b.status === 'COMPLETED'
                            ? '#059669'
                            : b.status === 'DEPOSIT_PAID'
                              ? '#0284C7'
                              : b.status === 'CANCELLED'
                                ? '#DC2626'
                                : '#D97706',
                      }}
                    >
                      {b.status === 'PENDING_DEPOSIT' && 'Chờ đặt cọc MoMo'}
                      {b.status === 'DEPOSIT_PAID' && 'Đã đặt cọc hợp đồng'}
                      {b.status === 'COMPLETED' && 'Tiệc hoàn tất (Đã quyết toán)'}
                      {b.status === 'CANCELLED' && 'Đã hủy tiệc'}
                    </span>
                  </div>

                  {b.partyTypeTitle && (
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>
                      {b.partyTypeTitle}
                    </div>
                  )}
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                    {b.packageName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Thời gian: <strong>{b.eventTime || '18:00'} • {b.eventDate}</strong> • Quy mô: <strong>{b.tableCount} mâm</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: b.customNote ? 6 : 12 }}>
                    Địa điểm: {b.eventAddress}
                  </div>
                  {b.customNote && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#065F46',
                        background: '#ECFDF5',
                        padding: '6px 10px',
                        borderRadius: 8,
                        marginBottom: 12,
                      }}
                    >
                      <strong>Ghi chú:</strong> {b.customNote}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Tiền cọc đợt 1:</div>
                      <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{b.depositAmount.toLocaleString()} đ</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Tất toán sau tiệc:</div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{b.remainingAmount.toLocaleString()} đ</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    {b.status === 'PENDING_DEPOSIT' && (
                      <button
                        type="button"
                        onClick={() => setActiveMomoModal(b)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                      >
                        Thanh toán cọc MoMo
                      </button>
                    )}
                    {b.status === 'DEPOSIT_PAID' && (
                      <span
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textAlign: 'center',
                        }}
                      >
                        Chờ cửa hàng phục vụ &amp; xuất Bill
                      </span>
                    )}
                    {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(b)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Hủy & Hoàn cọc
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VOUCHER PICKER MODAL (STEP 4)                                         */}
      {/* ===================================================================== */}
      {isVoucherModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: '#FFFFFF',
              borderRadius: 18,
              padding: 24,
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={18} color="var(--primary)" /> Chọn mã giảm giá / Voucher
              </h3>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                style={{ background: 'var(--bg-main)', borderRadius: 8, padding: 6 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                placeholder="Nhập mã (VD: TIECVIP15)"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
              />
              <button
                type="button"
                onClick={() => handleApplyVoucherCode(voucherCodeInput)}
                className="btn btn-primary"
                style={{ padding: '10px 16px', borderRadius: 10, fontSize: '0.86rem' }}
              >
                Áp dụng
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {availableVouchers.map((v) => {
                const eligible = pricing.afterVolumeTotal >= Number(v.minOrder || 0);
                const estDiscount = calculateVoucherDiscount(v, pricing.afterVolumeTotal);
                const isSelected = appliedVoucher?.code === v.code;
                return (
                  <div
                    key={v.id}
                    style={{
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 12,
                      padding: 14,
                      background: isSelected ? '#ECFDF5' : '#FFFFFF',
                      opacity: eligible ? 1 : 0.65,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.9rem' }}>
                          {v.code}
                        </span>
                        {v.eventTag && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#92400E' }}>
                            {v.eventTag}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {v.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Đơn tối thiểu {Number(v.minOrder || 0).toLocaleString()}đ • HSD: {v.endDate}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!eligible}
                      onClick={() => handleApplyVoucherCode(v.code)}
                      className={eligible ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', flexShrink: 0 }}
                    >
                      {eligible ? (isSelected ? 'Đang dùng' : `Giảm ${estDiscount.toLocaleString()}đ`) : 'Chưa đủ ĐK'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MOMO DEPOSIT QR MODAL                                                 */}
      {/* ===================================================================== */}
      {activeMomoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#FFFFFF',
              borderRadius: 18,
              padding: 28,
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--momo)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                }}
              >
                M
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--momo)', margin: 0 }}>
                MoMo Payment Gateway
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Quét mã QR để đặt cọc đợt 1 cho hợp đồng: <strong>{activeMomoModal.bookingCode}</strong>
            </p>

            <div
              style={{
                background: '#F8FAFC',
                padding: 16,
                borderRadius: 14,
                border: '1px solid #E2E8F0',
                display: 'inline-block',
                margin: '0 auto 16px',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|0901000002|DineGo%20Deposit|${activeMomoModal.depositAmount}|0|0`}
                alt="MoMo QR"
                style={{ width: 180, height: 180, display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#D82D8B', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
              {activeMomoModal.depositAmount.toLocaleString()} VND
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Nội dung chuyển: <code>{activeMomoModal.bookingCode}</code>
            </div>

            <button
              type="button"
              onClick={() => handleConfirmMomoDeposit(activeMomoModal.id)}
              className="btn-momo"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                fontSize: '0.95rem',
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              Tôi đã chuyển tiền cọc MoMo thành công
            </button>
            <button
              type="button"
              onClick={() => setActiveMomoModal(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Đóng tạm (Thanh toán sau)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
