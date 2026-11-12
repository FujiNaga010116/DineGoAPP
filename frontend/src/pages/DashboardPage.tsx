// ==============================================================================
// DineGo Frontend — Standalone Merchant Seller Center & Enterprise Admin Backoffice
// Completely separated layouts from the Customer Storefront (No shared Header/Footer)
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Star,
  Clock,
  ChefHat,
  PackageCheck,
  UtensilsCrossed,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  Ticket,
  Download,
  Lock,
  Unlock,
  Bike,
  LogOut,
  ExternalLink,
  Printer,
  ArrowUpRight,
  Users as UsersIcon,
  Sliders,
  DollarSign,
  AlertTriangle,
  Camera,
  Phone,
} from 'lucide-react';
import type { Role, User, Order, OrderStatus, MenuItem, Merchant, DriverProfile, DeliveryDisputeReport } from '../types';
import type { NavTab } from '../components/common/Header';
import { adminApi } from '../api/client';
import {
  EVENT_THEME_OPTIONS,
  fetchRemoteAdminVouchers,
  getEventThemeStyle,
  loadAdminVouchers,
  saveAdminVouchers,
  type ManagedVoucher,
  type VoucherEventTheme,
} from '../utils/vouchers';
import {
  CateringFinalBillModal,
  type CateringBillData,
} from '../components/common/CateringFinalBillModal';

interface DashboardPageProps {
  currentUser: User | null;
  activeTab?: NavTab;
  onNavigate?: (tab: NavTab) => void;
  onOpenAuthModal?: (mode?: 'login' | 'register', targetRole?: Role) => void;
  onLogout?: () => void;
  orders?: Order[];
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  merchantDishes?: MenuItem[];
  onToggleDishAvailability?: (dishId: string) => void;
  onAddDish?: (dish: MenuItem) => void;
  onUpdateDish?: (dish: MenuItem) => void;
  onDeleteDish?: (dishId: string) => void;
  currentMerchant?: Merchant | null;
  onUpdateMerchantProfile?: (updatedMerchant: Merchant, updatedUser?: User) => void;
  allMerchants?: Merchant[];
  allDriversList?: DriverProfile[];
  allUsersList?: User[];
  onToggleUserStatus?: (userId: string) => void;
  onAdminUpdateMerchantStatus?: (
    merchantId: string,
    nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
    reason?: string,
  ) => void;
  onAdminUpdateDriverStatus?: (
    driverId: string,
    nextStatus: 'ACTIVE' | 'SUSPENDED',
    reason?: string,
  ) => void;
  onSelectMerchantForManage?: (merchant: Merchant) => void;
  onOpenMerchantRegisterModal?: () => void;
  deliveryDisputes?: DeliveryDisputeReport[];
  onResolveDeliveryDispute?: (
    reportId: string,
    decision: 'COMPENSATED_DRIVER' | 'REJECTED',
    adminNote?: string,
  ) => void;
  onConfirmMerchantPickup?: (orderId: string) => void;
  onSyncCateringOrderFromMerchant?: (
    bookingId: string,
    bookingCode: string,
    action: 'CONFIRM_DEPOSIT' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
    meta?: { finalBillCode?: string; completedAt?: string; confirmedAt?: string },
  ) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  activeTab = 'merchant-orders',
  onNavigate,
  onOpenAuthModal,
  onLogout,
  orders = [],
  onUpdateOrderStatus,
  merchantDishes = [],
  onToggleDishAvailability,
  onAddDish,
  onUpdateDish,
  onDeleteDish,
  currentMerchant,
  onUpdateMerchantProfile,
  allMerchants = [],
  allDriversList = [],
  allUsersList = [],
  onToggleUserStatus,
  onAdminUpdateMerchantStatus,
  onAdminUpdateDriverStatus,
  onSelectMerchantForManage,
  onOpenMerchantRegisterModal,
  deliveryDisputes = [],
  onResolveDeliveryDispute,
  onConfirmMerchantPickup,
  onSyncCateringOrderFromMerchant,
}) => {
  const isAdminRole = Boolean(currentUser?.roles?.includes('ADMIN'));

  // Admin Deep System Controls (persisted to localStorage & synced with Backend API)
  const initialAdminSettings = (() => {
    try {
      const saved = localStorage.getItem('dinego_admin_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  })();

  const [platformCommissionRate, setPlatformCommissionRate] = useState<number>(
    initialAdminSettings?.platformCommissionRate ?? 15,
  );
  const [peakHourSurgeFee, setPeakHourSurgeFee] = useState<number>(
    initialAdminSettings?.peakHourSurgeFee ?? 5000,
  );
  const [minOrderForFreeShipping, setMinOrderForFreeShipping] = useState<number>(
    initialAdminSettings?.minOrderForFreeShipping ?? 100000,
  );
  const [autoDispatchRangeKm, setAutoDispatchRangeKm] = useState<number>(
    initialAdminSettings?.autoDispatchRangeKm ?? 3.5,
  );
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(
    initialAdminSettings?.maintenanceMode ?? false,
  );
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN'>('ALL');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [configSavedBanner, setConfigSavedBanner] = useState('');
  const [previewDisputeImg, setPreviewDisputeImg] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        'dinego_admin_settings',
        JSON.stringify({
          platformCommissionRate,
          peakHourSurgeFee,
          minOrderForFreeShipping,
          autoDispatchRangeKm,
          maintenanceMode,
        }),
      );
    } catch {}
  }, [
    platformCommissionRate,
    peakHourSurgeFee,
    minOrderForFreeShipping,
    autoDispatchRangeKm,
    maintenanceMode,
  ]);

  // Merchant Active Section
  const currentMerchantTab:
    | 'merchant-orders'
    | 'merchant-menu'
    | 'merchant-vouchers'
    | 'merchant-catering'
    | 'merchant-analytics'
    | 'merchant-kyc' =
    activeTab === 'merchant-menu' ||
    activeTab === 'merchant-vouchers' ||
    activeTab === 'merchant-catering' ||
    activeTab === 'merchant-analytics' ||
    activeTab === 'merchant-kyc'
      ? activeTab
      : 'merchant-orders';

  // Admin Active Section
  const currentAdminTab:
    | 'admin-overview'
    | 'admin-merchants'
    | 'admin-drivers'
    | 'admin-users'
    | 'admin-complaints'
    | 'admin-reconciliation'
    | 'admin-knowledge'
    | 'admin-settings' =
    activeTab === 'admin-merchants' ||
    activeTab === 'admin-drivers' ||
    activeTab === 'admin-users' ||
    activeTab === 'admin-complaints' ||
    activeTab === 'admin-reconciliation' ||
    activeTab === 'admin-knowledge' ||
    activeTab === 'admin-settings'
      ? activeTab
      : 'admin-overview';

  // Merchant Operational States
  const [storeOpen, setStoreOpen] = useState<boolean>(currentMerchant?.isOpen ?? true);
  const [kitchenStatusFilter, setKitchenStatusFilter] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [orderSearch, setOrderSearch] = useState('');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [merchantWithdrawSuccess, setMerchantWithdrawSuccess] = useState(false);

  // Merchant KYC & Store Settings Editable States
  const [isEditingMerchantKyc, setIsEditingMerchantKyc] = useState(true);
  const [merchantKycSavedBanner, setMerchantKycSavedBanner] = useState('');
  const [kycStoreName, setKycStoreName] = useState(currentMerchant?.name || '');
  const [kycCategory, setKycCategory] = useState(
    currentMerchant?.categories?.[0] || 'Cơm & Món Việt',
  );
  const [kycOwnerName, setKycOwnerName] = useState(
    currentMerchant?.ownerName || currentUser?.fullName || '',
  );
  const [kycOwnerEmail, setKycOwnerEmail] = useState(
    currentMerchant?.ownerEmail || currentUser?.email || '',
  );
  const [kycPhone, setKycPhone] = useState(
    currentMerchant?.phoneNumber || currentUser?.phoneNumber || '',
  );
  const [kycOpeningHours, setKycOpeningHours] = useState(
    currentMerchant?.openingHours || '07:00 - 22:00',
  );
  const [kycDeliveryMin, setKycDeliveryMin] = useState<number>(
    currentMerchant?.deliveryTimeMin || 20,
  );
  const [kycDeliveryMax, setKycDeliveryMax] = useState<number>(
    currentMerchant?.deliveryTimeMax || 30,
  );
  const [kycAddress, setKycAddress] = useState(currentMerchant?.address || '');
  const [kycBusinessLicense, setKycBusinessLicense] = useState(
    currentMerchant?.businessLicenseNumber || 'GPKD-41A8029144',
  );
  const [kycFoodSafetyCert, setKycFoodSafetyCert] = useState(
    currentMerchant?.foodSafetyCertNumber || 'ATTP-HCM-2026-0891',
  );
  const [kycTaxCode, setKycTaxCode] = useState(
    currentMerchant?.taxCode || '0318992819',
  );
  const [kycBankName, setKycBankName] = useState(
    currentMerchant?.bankName || currentUser?.bankName || 'Vietcombank',
  );
  const [kycBankAccountNumber, setKycBankAccountNumber] = useState(
    currentMerchant?.bankAccountNumber || currentUser?.bankAccountNumber || '0071000889900',
  );
  const [kycBankAccountHolder, setKycBankAccountHolder] = useState(
    currentMerchant?.bankAccountHolder ||
      currentUser?.bankAccountHolder ||
      (currentMerchant?.ownerName || currentUser?.fullName || '').toUpperCase(),
  );
  const [kycStoreFrontImage, setKycStoreFrontImage] = useState(
    currentMerchant?.storeFrontImage ||
      currentMerchant?.coverUrl ||
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
  );

  useEffect(() => {
    if (!currentMerchant) return;
    setStoreOpen(currentMerchant.isOpen ?? true);
    setKycStoreName(currentMerchant.name || '');
    setKycCategory(currentMerchant.categories?.[0] || 'Cơm & Món Việt');
    setKycOwnerName(currentMerchant.ownerName || currentUser?.fullName || '');
    setKycOwnerEmail(currentMerchant.ownerEmail || currentUser?.email || '');
    setKycPhone(currentMerchant.phoneNumber || currentUser?.phoneNumber || '');
    setKycOpeningHours(currentMerchant.openingHours || '07:00 - 22:00');
    setKycDeliveryMin(currentMerchant.deliveryTimeMin || 20);
    setKycDeliveryMax(currentMerchant.deliveryTimeMax || 30);
    setKycAddress(currentMerchant.address || '');
    setKycBusinessLicense(currentMerchant.businessLicenseNumber || 'GPKD-41A8029144');
    setKycFoodSafetyCert(currentMerchant.foodSafetyCertNumber || 'ATTP-HCM-2026-0891');
    setKycTaxCode(currentMerchant.taxCode || '0318992819');
    setKycBankName(currentMerchant.bankName || currentUser?.bankName || 'Vietcombank');
    setKycBankAccountNumber(
      currentMerchant.bankAccountNumber || currentUser?.bankAccountNumber || '0071000889900',
    );
    setKycBankAccountHolder(
      currentMerchant.bankAccountHolder ||
        currentUser?.bankAccountHolder ||
        (currentMerchant.ownerName || currentUser?.fullName || '').toUpperCase(),
    );
    setKycStoreFrontImage(
      currentMerchant.storeFrontImage ||
        currentMerchant.coverUrl ||
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    );
  }, [currentMerchant?.id]);

  const handleSaveMerchantKycAndSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMerchant) return;

    const updatedMerchant: Merchant = {
      ...currentMerchant,
      name: kycStoreName.trim() || currentMerchant.name,
      categories: [kycCategory],
      ownerName: kycOwnerName.trim() || currentMerchant.ownerName,
      ownerEmail: kycOwnerEmail.trim() || currentMerchant.ownerEmail,
      phoneNumber: kycPhone.trim() || currentMerchant.phoneNumber,
      openingHours: kycOpeningHours.trim() || '07:00 - 22:00',
      deliveryTimeMin: Number(kycDeliveryMin) > 0 ? Number(kycDeliveryMin) : 20,
      deliveryTimeMax: Number(kycDeliveryMax) > 0 ? Number(kycDeliveryMax) : 30,
      address: kycAddress.trim() || currentMerchant.address,
      businessLicenseNumber: kycBusinessLicense.trim() || currentMerchant.businessLicenseNumber,
      foodSafetyCertNumber: kycFoodSafetyCert.trim() || currentMerchant.foodSafetyCertNumber,
      taxCode: kycTaxCode.trim() || currentMerchant.taxCode,
      bankName: kycBankName.trim() || 'Vietcombank',
      bankAccountNumber: kycBankAccountNumber.trim() || '0071000889900',
      bankAccountHolder:
        kycBankAccountHolder.trim().toUpperCase() ||
        (kycOwnerName.trim() || currentUser?.fullName || '').toUpperCase(),
      storeFrontImage: kycStoreFrontImage.trim() || currentMerchant.storeFrontImage,
      coverUrl: kycStoreFrontImage.trim() || currentMerchant.coverUrl,
      logoUrl: kycStoreFrontImage.trim() || currentMerchant.logoUrl,
      isOpen: storeOpen,
    };

    const updatedUser: User | undefined = currentUser
      ? {
          ...currentUser,
          fullName: kycOwnerName.trim() || currentUser.fullName,
          email: kycOwnerEmail.trim() || currentUser.email,
          phoneNumber: kycPhone.trim() || currentUser.phoneNumber,
          address: kycAddress.trim() || currentUser.address,
          bankName: updatedMerchant.bankName,
          bankAccountNumber: updatedMerchant.bankAccountNumber,
          bankAccountHolder: updatedMerchant.bankAccountHolder,
          avatarUrl: updatedMerchant.storeFrontImage || currentUser.avatarUrl,
        }
      : undefined;

    onUpdateMerchantProfile?.(updatedMerchant, updatedUser);
    setMerchantKycSavedBanner(
      `Đã lưu cập nhật Hồ sơ pháp lý & Cài đặt gian hàng "${updatedMerchant.name}" thành công lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}!`,
    );
    setTimeout(() => setMerchantKycSavedBanner(''), 5000);
  };

  // Menu Search & Filter States
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Dish Modal States (Add / Edit)
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [formDishName, setFormDishName] = useState('');
  const [formDishPrice, setFormDishPrice] = useState(55000);
  const [formDishCategory, setFormDishCategory] = useState('Món Chính');
  const [formDishDescription, setFormDishDescription] = useState('');
  const [formDishImageUrl, setFormDishImageUrl] = useState('');
  const [formDishIsAvailable, setFormDishIsAvailable] = useState(true);

  const handleOpenAddDishModal = () => {
    setEditingDishId(null);
    setFormDishName('');
    setFormDishPrice(55000);
    setFormDishCategory('Món Chính');
    setFormDishDescription('');
    setFormDishImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80');
    setFormDishIsAvailable(true);
    setIsDishModalOpen(true);
  };

  const handleOpenEditDishModal = (dish: MenuItem) => {
    setEditingDishId(dish.id);
    setFormDishName(dish.name);
    setFormDishPrice(dish.basePrice);
    setFormDishCategory(dish.categoryName || dish.category || 'Món Chính');
    setFormDishDescription(dish.description || '');
    setFormDishImageUrl(
      dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    );
    setFormDishIsAvailable(dish.isAvailable);
    setIsDishModalOpen(true);
  };

  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDishName.trim()) return;

    if (editingDishId) {
      onUpdateDish?.({
        id: editingDishId,
        merchantId: currentMerchant?.id || 'merchant-com-tam',
        name: formDishName.trim(),
        basePrice: Number(formDishPrice) || 50000,
        categoryName: formDishCategory,
        description: formDishDescription.trim(),
        imageUrl: formDishImageUrl,
        isActive: true,
        isAvailable: formDishIsAvailable,
      });
    } else {
      onAddDish?.({
        id: `dish-custom-${Date.now()}`,
        merchantId: currentMerchant?.id || 'merchant-com-tam',
        name: formDishName.trim(),
        basePrice: Number(formDishPrice) || 50000,
        categoryName: formDishCategory,
        description: formDishDescription.trim(),
        imageUrl: formDishImageUrl,
        isActive: true,
        isAvailable: formDishIsAvailable,
      });
    }

    setIsDishModalOpen(false);
  };

  const isSeedDemoMerchant = currentMerchant?.id === 'merchant-com-tam';

  const isCateringSeedMerchant =
    isSeedDemoMerchant || Boolean(currentMerchant?.isCateringOnly);

  // Merchant Catering Bookings & Calendar State (Persisted in localStorage & synced with Customer CateringPage)
  const [feastBookings, setFeastBookings] = useState<any[]>(() => {
    const seedCateringContracts = [
      {
        id: 'fb-hg-01',
        bookingCode: 'DG-FEAST-710201',
        merchantId: 'merchant-catering-hoang-gia',
        merchantName: 'Bếp Cỗ Hoàng Gia — Quận 1',
        partyTypeTitle: 'Đám cưới & Đính hôn',
        customerName: 'Lê Minh Tuấn',
        customerPhone: '0908334455',
        packageName: 'Mâm Tiệc Cưới Hỏi Song Hỷ (10 người/bàn)',
        tableCount: 10,
        guestCountPerTable: 10,
        eventDate: '2026-11-22',
        eventTime: '18:00',
        address: 'Trung tâm Tiệc cưới Sân vườn, 180 Pasteur, Quận 3, TP. HCM',
        note: 'Chuẩn bị bàn gia tiên riêng, ưu tiên lên món nóng đúng 18:15',
        totalAmount: 34200000,
        depositAmount: 10260000,
        depositPercent: 30,
        status: 'PENDING_APPROVAL',
        depositPaid: true,
      },
      {
        id: 'fb-ht-01',
        bookingCode: 'DG-FEAST-710202',
        merchantId: 'merchant-catering-ha-thanh',
        merchantName: 'Bếp Cỗ Gia Truyền — Quận 3',
        partyTypeTitle: 'Đám giỗ & Cúng gia tiên',
        customerName: 'Nguyễn Thị Hương',
        customerPhone: '0919556677',
        packageName: 'Mâm Cỗ Gia Tiên Truyền Thống (6 người/bàn)',
        tableCount: 5,
        guestCountPerTable: 6,
        eventDate: '2026-11-18',
        eventTime: '10:30',
        address: '42 Nguyễn Đình Chiểu, Quận 1, TP. HCM',
        note: 'Giao trước 10:15 để kịp giờ làm lễ, ít cay',
        totalAmount: 9262500,
        depositAmount: 2778750,
        depositPercent: 30,
        status: 'PENDING_APPROVAL',
        depositPaid: true,
      },
      {
        id: 'fb-sg-01',
        bookingCode: 'DG-FEAST-710203',
        merchantId: 'merchant-catering-saigon-pro',
        merchantName: 'Saigon Event Catering — Bình Thạnh',
        partyTypeTitle: 'Liên hoan công ty & Gala',
        customerName: 'Công ty Cổ phần TechNova',
        customerPhone: '0903889900',
        packageName: 'Mâm Tiệc Liên Hoan Doanh Nghiệp VIP (10 người/bàn)',
        tableCount: 8,
        guestCountPerTable: 10,
        eventDate: '2026-11-25',
        eventTime: '18:30',
        address: 'Tầng 14, Bitexco Financial Tower, Quận 1, TP. HCM',
        note: 'Xuất hóa đơn VAT công ty và chuẩn bị thêm nước suối',
        totalAmount: 21280000,
        depositAmount: 10640000,
        depositPercent: 50,
        status: 'PENDING_APPROVAL',
        depositPaid: true,
      },
    ];

    try {
      const saved = localStorage.getItem('dinego_feast_bookings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!localStorage.getItem('dinego_catering_merchant_seeds_v1')) {
            localStorage.setItem('dinego_catering_merchant_seeds_v1', '1');
            const existingIds = new Set(parsed.map((p: any) => p.id));
            const extra = seedCateringContracts.filter((s) => !existingIds.has(s.id));
            return [...parsed, ...extra];
          }
          return parsed;
        }
      }
    } catch {}
    return isCateringSeedMerchant
      ? [
          {
            id: 'fb-01',
            bookingCode: 'DG-FEAST-8821',
            merchantId: 'merchant-com-tam',
            merchantName: 'Cơm Tấm Sài Gòn 1985',
            customerName: 'Nguyễn Minh Quân (Công ty TNHH VinaTech)',
            customerPhone: '0908112233',
            packageName: 'Mâm Tiệc Tân Niên Đoàn Viên (10 người/bàn)',
            tableCount: 5,
            eventDate: '2026-11-15',
            eventTime: '18:30',
            address: 'Tầng 8, Tòa nhà Saigon Centre, 65 Lê Lợi, Quận 1, TP. HCM',
            totalAmount: 17500000,
            depositAmount: 5250000,
            status: 'PENDING_APPROVAL',
            depositPaid: true,
          },
          {
            id: 'fb-02',
            bookingCode: 'DG-FEAST-8819',
            merchantId: 'merchant-com-tam',
            merchantName: 'Cơm Tấm Sài Gòn 1985',
            customerName: 'Trần Ngọc Lan',
            customerPhone: '0912334455',
            packageName: 'Buffet Finger Food & BBQ Sân Vườn (30 khách)',
            tableCount: 3,
            eventDate: '2026-11-20',
            eventTime: '11:30',
            address: 'Biệt thự B12 Thảo Điền, TP. Thủ Đức, TP. HCM',
            totalAmount: 13500000,
            depositAmount: 4050000,
            status: 'APPROVED',
            depositPaid: true,
          },
          ...seedCateringContracts,
        ]
      : [];
  });
  const [showAllPlatformFeasts, setShowAllPlatformFeasts] = useState<boolean>(false);
  const [activeFeastBillModal, setActiveFeastBillModal] = useState<CateringBillData | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('dinego_feast_bookings', JSON.stringify(feastBookings));
    } catch {}
  }, [feastBookings]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dinego_feast_bookings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setFeastBookings(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    const feastCh = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_feasts_sync') : null;
    if (feastCh) {
      feastCh.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          try {
            const parsed = JSON.parse(ev.data);
            if (Array.isArray(parsed)) setFeastBookings(parsed);
          } catch {}
        }
      };
    }
    return () => {
      window.removeEventListener('storage', onStorage);
      feastCh?.close();
    };
  }, []);

  const buildFeastBillData = (
    fb: any,
    finalBillCode: string,
    completedAt: string,
  ): CateringBillData => {
    const depositPct: 30 | 50 =
      fb.depositPercent ||
      (fb.totalAmount > 0 && Math.round((fb.depositAmount / fb.totalAmount) * 100) >= 45
        ? 50
        : 30);
    const subtotal = Number(fb.subtotal ?? fb.totalAmount);
    const discountAmount = Number(fb.discountAmount ?? Math.max(0, subtotal - fb.totalAmount));
    return {
      billCode: finalBillCode,
      bookingCode: fb.bookingCode,
      merchantName: fb.merchantName || currentMerchant?.name || 'Nhà hàng DineGo Catering',
      customerName: fb.customerName || 'Khách hàng DineGo',
      customerPhone: fb.customerPhone || '',
      eventAddress: fb.address || '',
      partyTypeTitle: fb.partyTypeTitle || 'Đặt tiệc lưu động',
      packageName: fb.packageName,
      tableCount: Number(fb.tableCount || 1),
      guestCountPerTable: Number(fb.guestCountPerTable || 6),
      eventDate: fb.eventDate,
      eventTime: fb.eventTime || '18:00',
      dishes: Array.isArray(fb.dishes) ? fb.dishes : [],
      customNote: fb.note,
      subtotal,
      discountAmount,
      totalAmount: Number(fb.totalAmount || 0),
      depositPercent: depositPct,
      depositAmount: Number(fb.depositAmount || 0),
      remainingAmount: Math.max(0, Number(fb.totalAmount || 0) - Number(fb.depositAmount || 0)),
      completedAt,
      issuedFor: 'MERCHANT',
    };
  };

  const handleCompleteFeastBooking = (fb: any) => {
    const finalBillCode = fb.finalBillCode || `BILL-${String(fb.bookingCode || Date.now()).slice(-6)}`;
    const completedAt = fb.completedAt || new Date().toISOString();

    setFeastBookings((prev) =>
      prev.map((item) =>
        item.id === fb.id
          ? { ...item, status: 'COMPLETED', finalBillCode, completedAt, depositPaid: true }
          : item,
      ),
    );
    onSyncCateringOrderFromMerchant?.(fb.id, fb.bookingCode, 'COMPLETED', {
      finalBillCode,
      completedAt,
    });
    setActiveFeastBillModal(buildFeastBillData(fb, finalBillCode, completedAt));
  };

  const [blockedDates, setBlockedDates] = useState<string[]>(() =>
    isSeedDemoMerchant ? ['2026-11-22', '2026-11-29'] : [],
  );

  const toggleBlockedDate = (dateStr: string) => {
    setBlockedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr],
    );
  };

  // Real Revenue & System Calculations from actual orders, merchants, complaints & feastBookings
  const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const completedOrdersList = orders.filter((o) => o.status === 'COMPLETED');
  const commissionRateDecimal = platformCommissionRate / 100;

  // Merchant Revenue calculated from real orders (scoped to currentMerchant when in Merchant mode)
  const merchantScopedOrders = currentMerchant
    ? validOrders.filter((o) => o.merchant?.id === currentMerchant.id)
    : validOrders;
  const merchantGrossRevenue = merchantScopedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const merchantPlatformCommission = Math.round(merchantGrossRevenue * commissionRateDecimal);
  const merchantNetPayout = merchantGrossRevenue - merchantPlatformCommission;

  const dishSalesMap = new Map<
    string,
    { sku: string; name: string; quantity: number; unitPrice: number; totalSales: number }
  >();
  merchantDishes.forEach((d, idx) => {
    dishSalesMap.set(d.name, {
      sku: `MN-${String(idx + 1).padStart(3, '0')}`,
      name: d.name,
      quantity: 0,
      unitPrice: d.basePrice,
      totalSales: 0,
    });
  });
  merchantScopedOrders.forEach((o) => {
    o.items.forEach((item) => {
      const existing = dishSalesMap.get(item.itemName);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalSales += item.subtotal;
      } else {
        dishSalesMap.set(item.itemName, {
          sku: `MN-${String(dishSalesMap.size + 1).padStart(3, '0')}`,
          name: item.itemName,
          quantity: item.quantity,
          unitPrice: item.basePrice,
          totalSales: item.subtotal,
        });
      }
    });
  });

  const merchantRevenue = {
    merchantName: currentMerchant?.name || 'Cơm Tấm Sài Gòn 1985',
    totalRevenue: merchantGrossRevenue,
    platformCommission: merchantPlatformCommission,
    netPayout: merchantNetPayout,
    completedOrders: merchantScopedOrders.filter((o) => o.status === 'COMPLETED').length,
    cancelledOrders: orders.filter(
      (o) => o.status === 'CANCELLED' && (!currentMerchant || o.merchant?.id === currentMerchant.id),
    ).length,
    averageOrderValue:
      merchantScopedOrders.length > 0 ? Math.round(merchantGrossRevenue / merchantScopedOrders.length) : 0,
    topDishes: Array.from(dishSalesMap.values()).sort((a, b) => b.totalSales - a.totalSales),
  };

  // Admin System Real Overview Calculated from actual orders & feastBookings
  const foodDeliveryGmv = validOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const foodSubtotalSum = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const approvedFeasts = feastBookings.filter((fb) =>
    ['APPROVED', 'COMPLETED'].includes(fb.status),
  );
  const cateringFeastGmv = approvedFeasts.reduce((sum, fb) => sum + fb.totalAmount, 0);
  const totalGmvReal = foodDeliveryGmv + cateringFeastGmv;
  const platformRevenueReal = Math.round((foodSubtotalSum + cateringFeastGmv) * commissionRateDecimal);

  const adminSystem = {
    totalGmv: totalGmvReal,
    platformRevenue: platformRevenueReal,
    totalOrders: orders.length,
    completedOrders: completedOrdersList.length,
    totalMerchants: allMerchants.length,
    activeDrivers: allDriversList.length,
    totalUsers: allUsersList.length,
  };

  // Real Top Merchants Ranking calculated from actual orders
  const topMerchantsReal = allMerchants
    .map((m) => {
      const mOrders = validOrders.filter((o) => o.merchant?.id === m.id);
      const gmv = mOrders.reduce((s, o) => s + o.finalTotal, 0);
      const subtotal = mOrders.reduce((s, o) => s + o.subtotal, 0);
      const platformFee = Math.round(subtotal * commissionRateDecimal);
      return {
        id: m.id,
        name: m.name,
        ordersCount: mOrders.length,
        gmv,
        platformFee,
        rating: m.rating || 5.0,
      };
    })
    .sort((a, b) => b.gmv - a.gmv);

  // Real 7-Day GMV Chart calculated from actual order createdAt dates
  const sevenDayGmvChart = (() => {
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const buckets: { label: string; dateKey: string; gmv: number }[] = [];
    const refDate =
      validOrders.length > 0
        ? new Date(Math.max(...validOrders.map((o) => new Date(o.createdAt).getTime())))
        : new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = `${dayLabels[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;
      const dayGmv = validOrders
        .filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === dateKey)
        .reduce((s, o) => s + o.finalTotal, 0);
      buckets.push({ label, dateKey, gmv: dayGmv });
    }
    const maxGmv = Math.max(...buckets.map((b) => b.gmv), 1);
    return buckets.map((b) => ({
      ...b,
      pct: b.gmv > 0 ? Math.max(Math.round((b.gmv / maxGmv) * 100), 12) : 6,
    }));
  })();

  // Admin Audit Logs State (U045) — Persisted in localStorage & synced with Backend
  const [adminAuditLogs, setAdminAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('dinego_admin_audit_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'aud-01',
        action: 'DUYỆT HỒ SƠ KYC QUÁN',
        targetName: 'Cơm Tấm Sài Gòn 1985',
        reason: 'Giấy phép VSATTP & GPKD hợp lệ',
        performedBy: 'admin@dinego.vn',
        timestamp: '03/11/2026 09:15',
      },
      {
        id: 'aud-02',
        action: 'GIẢI NGÂN ĐỐI SOÁT KỲ 10/2026',
        targetName: 'Phở Thìn Lò Đúc 1979',
        reason: 'Ủy nhiệm chi 85% doanh thu ròng qua Techcombank',
        performedBy: 'admin@dinego.vn',
        timestamp: '01/11/2026 16:40',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dinego_admin_audit_logs', JSON.stringify(adminAuditLogs));
    } catch {}
  }, [adminAuditLogs]);

  const appendAuditLog = (action: string, targetName: string, reason: string) => {
    setAdminAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        action,
        targetName,
        reason,
        performedBy: currentUser?.email || 'admin@dinego.vn',
        timestamp: new Date().toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      ...prev,
    ]);
  };

  // Admin Drivers Fleet derived from real allDriversList & real orders
  const [driverStatusOverrides, setDriverStatusOverrides] = useState<Record<string, 'ACTIVE' | 'SUSPENDED'>>(() => {
    try {
      const saved = localStorage.getItem('dinego_admin_driver_overrides');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('dinego_admin_driver_overrides', JSON.stringify(driverStatusOverrides));
    } catch {}
  }, [driverStatusOverrides]);

  // Driver Withdrawal Requests State (Synced with Driver Console in TrackingPage)
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

  const handleProcessDriverWithdrawal = (id: string, nextStatus: 'APPROVED' | 'REJECTED') => {
    const target = driverWithdrawals.find((w) => w.id === id);
    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const note =
      nextStatus === 'APPROVED'
        ? 'Admin đã đối soát và giải ngân về tài khoản ngân hàng tài xế'
        : 'Từ chối yêu cầu rút tiền do cần đối soát lại cước chuyến';

    setDriverWithdrawals((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, status: nextStatus, processedAt: nowStr, note } : w,
      ),
    );
    if (target) {
      appendAuditLog(
        nextStatus === 'APPROVED' ? 'DUYỆT RÚT TIỀN TÀI XẾ' : 'TỪ CHỐI RÚT TIỀN TÀI XẾ',
        `${target.driverName} (${target.amount.toLocaleString('vi-VN')}đ)`,
        `${note} • ${target.bankName} (${target.bankAccountNumber})`,
      );
    }
  };

  const driversList = allDriversList.map((drv, idx) => {
    const realDriverTrips = completedOrdersList.filter(
      (o) => o.assignedDriverId === drv.id || o.assignedDriverName === drv.fullName,
    ).length;
    const baseStatus: 'ACTIVE' | 'SUSPENDED' = drv.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
    const effectiveStatus = driverStatusOverrides[drv.id] || baseStatus;
    return {
      id: drv.id,
      code: `TX-SG-${String(idx + 1).padStart(4, '0')}`,
      fullName: drv.fullName,
      phone: drv.phoneNumber,
      licensePlate: drv.licensePlate,
      vehicle: drv.vehicleType,
      area: drv.operatingZone,
      completedTrips: (drv.completedTrips || 0) + realDriverTrips,
      rating: drv.rating || 5.0,
      status: effectiveStatus,
    };
  });

  const toggleDriverStatus = (drvId: string) => {
    const target = driversList.find((d) => d.id === drvId);
    if (!target) return;
    const nextStatus: 'ACTIVE' | 'SUSPENDED' = target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const reason =
      nextStatus === 'SUSPENDED'
        ? 'Tạm khóa nhận chuyến để rà soát vận hành'
        : 'Khôi phục quyền nhận chuyến giao hàng';
    setDriverStatusOverrides((prev) => ({ ...prev, [drvId]: nextStatus }));
    onAdminUpdateDriverStatus?.(drvId, nextStatus, reason);
    appendAuditLog(
      nextStatus === 'SUSPENDED' ? 'ĐÌNH CHỈ TÀI XẾ NHẬN CHUYẾN' : 'MỞ KHÓA TÀI XẾ',
      `${target.fullName} (${target.licensePlate})`,
      reason,
    );
  };

  // Admin Complaints State (U051) — Persisted in localStorage & synced with Backend
  const [complaints, setComplaints] = useState(() => {
    try {
      const saved = localStorage.getItem('dinego_admin_complaints');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'cmp-01',
        code: 'CMP-298101',
        orderNumber: 'DG20261103-TRK88',
        customerName: 'Nguyễn Văn An',
        merchantName: 'Cơm Tấm Sài Gòn 1985',
        issueType: 'Giao thiếu 01 phần canh chua cá lóc trong đơn hàng',
        evidenceImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=240&auto=format&fit=crop&q=80',
        compensationAmount: 35000,
        resolutionNotes: '',
        status: 'OPEN',
        createdAt: '03/11/2026 11:30',
      },
      {
        id: 'cmp-02',
        code: 'CMP-298099',
        orderNumber: 'DG20261102-4D25CA',
        customerName: 'Lê Hoàng Cường',
        merchantName: 'Phở Thìn Lò Đúc',
        issueType: 'Nước dùng bị đổ trong quá trình vận chuyển',
        evidenceImage: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=240&auto=format&fit=crop&q=80',
        compensationAmount: 75000,
        resolutionNotes: 'Đã xác minh ảnh chụp từ khách và hoàn ví MoMo 75.000đ.',
        status: 'REFUNDED',
        createdAt: '02/11/2026 19:15',
      },
      {
        id: 'cmp-03',
        code: 'CMP-298085',
        orderNumber: 'DG20261101-9B11EF',
        customerName: 'Trần Thị Bình',
        merchantName: 'Bún Chả Hương Liên',
        issueType: 'Giao nhầm phân loại món (Đặt phần đặc biệt giao phần thường)',
        evidenceImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=240&auto=format&fit=crop&q=80',
        compensationAmount: 25000,
        resolutionNotes: '',
        status: 'OPEN',
        createdAt: '01/11/2026 12:40',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dinego_admin_complaints', JSON.stringify(complaints));
    } catch {}
  }, [complaints]);

  const [complaintNoteInputs, setComplaintNoteInputs] = useState<Record<string, string>>({});

  const handleResolveComplaint = (id: string, action: 'REFUND' | 'REJECT') => {
    const target = complaints.find((c) => c.id === id);
    const note =
      complaintNoteInputs[id]?.trim() ||
      (action === 'REFUND'
        ? 'Xác nhận khiếu nại hợp lệ, duyệt hoàn tiền cho khách hàng.'
        : 'Bằng chứng chưa đủ cơ sở bồi hoàn theo quy định sàn.');
    void adminApi.resolveComplaint(id, {
      decision: action === 'REFUND' ? 'RESOLVED_REFUND' : 'REJECTED',
      resolutionNotes: note,
      compensationAmount: action === 'REFUND' ? target?.compensationAmount : 0,
    });
    setComplaints(
      complaints.map((c) =>
        c.id === id
          ? {
              ...c,
              status: action === 'REFUND' ? 'REFUNDED' : 'REJECTED',
              resolutionNotes: note,
            }
          : c,
      ),
    );
    if (target) {
      appendAuditLog(
        action === 'REFUND' ? 'DUYỆT HOÀN TIỀN KHIẾU NẠI' : 'TỪ CHỐI KHIẾU NẠI',
        `${target.code} (#${target.orderNumber})`,
        note,
      );
    }
  };

  // Merchant Moderation State for Admin (U045: PENDING / APPROVED / REJECTED / SUSPENDED)
  const [merchantKycStatuses, setMerchantKycStatuses] = useState<
    Record<string, 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'>
  >(() => {
    try {
      const saved = localStorage.getItem('dinego_admin_kyc_statuses');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [merchantModerationReasons, setMerchantModerationReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      localStorage.setItem('dinego_admin_kyc_statuses', JSON.stringify(merchantKycStatuses));
    } catch {}
  }, [merchantKycStatuses]);

  const getEffectiveMerchantKycStatus = (m: Merchant): 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' => {
    if (merchantKycStatuses[m.id]) return merchantKycStatuses[m.id];
    if (m.kycStatus === 'PENDING_APPROVAL') return 'PENDING';
    if (m.kycStatus === 'REJECTED') return 'REJECTED';
    if (m.isActive === false) return 'SUSPENDED';
    return 'APPROVED';
  };

  const handleUpdateMerchantKyc = (
    m: Merchant,
    nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
  ) => {
    const reason =
      merchantModerationReasons[m.id]?.trim() ||
      (nextStatus === 'APPROVED'
        ? 'Đạt thẩm định pháp lý & VSATTP'
        : nextStatus === 'REJECTED'
        ? 'Hồ sơ GPKD/VSATTP chưa hợp lệ'
        : 'Tạm khóa do vi phạm vận hành');
    setMerchantKycStatuses((prev) => ({ ...prev, [m.id]: nextStatus }));
    onAdminUpdateMerchantStatus?.(m.id, nextStatus, reason);
    appendAuditLog(`CẬP NHẬT TRẠNG THÁI QUÁN → ${nextStatus}`, m.name, reason);
  };

  // Admin Monthly Reconciliation Calculated Dynamically from Real Orders & Merchants (U046)
  const [reconciliationPeriodFilter, setReconciliationPeriodFilter] = useState('ALL');
  const [paidReconciliationMap, setPaidReconciliationMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('dinego_admin_paid_reconciliations');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('dinego_admin_paid_reconciliations', JSON.stringify(paidReconciliationMap));
    } catch {}
  }, [paidReconciliationMap]);

  const formatOrderPeriod = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (Number.isNaN(d.getTime())) return '11/2026';
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const availablePeriods = Array.from(
    new Set([
      ...validOrders.map((o) => formatOrderPeriod(o.createdAt)),
      formatOrderPeriod(new Date().toISOString()),
    ]),
  );

  const reconciliationList = allMerchants.map((m, idx) => {
    const mOrders = validOrders.filter((o) => {
      const matchMerchant = o.merchant?.id === m.id;
      const matchPeriod =
        reconciliationPeriodFilter === 'ALL' || formatOrderPeriod(o.createdAt) === reconciliationPeriodFilter;
      return matchMerchant && matchPeriod;
    });
    const periodLabel =
      reconciliationPeriodFilter === 'ALL'
        ? mOrders.length > 0
          ? formatOrderPeriod(mOrders[0].createdAt)
          : availablePeriods[0] || '11/2026'
        : reconciliationPeriodFilter;
    const grossRevenue = mOrders.reduce((s, o) => s + o.subtotal, 0);
    const commission15 = Math.round(grossRevenue * commissionRateDecimal);
    const shippingFee = mOrders.reduce((s, o) => s + o.deliveryFee, 0);
    const refundDeducted = complaints
      .filter(
        (c) =>
          c.status === 'REFUNDED' &&
          (c.merchantName.toLowerCase().includes(m.name.toLowerCase()) ||
            m.name.toLowerCase().includes(c.merchantName.toLowerCase())),
      )
      .reduce((s, c) => s + c.compensationAmount, 0);
    const netPayout85 = Math.max(0, grossRevenue - commission15 - refundDeducted);
    const recId = `rec-${m.id}-${periodLabel}`;
    return {
      id: recId,
      period: periodLabel,
      merchantName: m.name,
      totalOrders: mOrders.length,
      grossRevenue,
      commission15,
      shippingFee,
      refundDeducted,
      netPayout85,
      bankAccount:
        m.bankName && m.bankAccountNumber
          ? `${m.bankName} • ${m.bankAccountNumber}`
          : `Vietcombank • 007100${String(idx + 1).padStart(7, '0')}`,
      status: (paidReconciliationMap[recId] ? 'PAID' : 'PENDING') as 'PAID' | 'PENDING',
    };
  });

  const filteredReconciliations = reconciliationList;

  const handleConfirmPayout = (recId: string) => {
    const target = reconciliationList.find((r) => r.id === recId);
    void adminApi.confirmReconciliationPayout(recId);
    setPaidReconciliationMap((prev) => ({ ...prev, [recId]: true }));
    if (target) {
      appendAuditLog(
        'XÁC NHẬN GIẢI NGÂN ĐỐI SOÁT',
        `${target.merchantName} (Kỳ ${target.period})`,
        `Đã giải ngân ${target.netPayout85.toLocaleString('vi-VN')}đ về ${target.bankAccount}`,
      );
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Ky Doi Soat,Nha Hang,So Don,Doanh Thu Gop,Phi Nen Tang,Phi Ship Thu Ho,Khau Tru Hoan Tien,Thuc Nhan Rong,Trang Thai',
    ];
    const rows = filteredReconciliations.map(
      (r) =>
        `${r.period},"${r.merchantName}",${r.totalOrders},${r.grossRevenue},${r.commission15},${r.shippingFee},${r.refundDeducted},${r.netPayout85},${r.status}`,
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DineGo_DoiSoat_Ky_${reconciliationPeriodFilter.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Platform & Store Event/Holiday Vouchers State (U052) — Persisted in localStorage & Backend Live Sync
  const [vouchers, setVouchers] = useState<ManagedVoucher[]>(() => loadAdminVouchers());

  useEffect(() => {
    saveAdminVouchers(vouchers, true);
  }, [vouchers]);

  useEffect(() => {
    const syncRemoteClaims = async () => {
      const remote = await fetchRemoteAdminVouchers();
      if (remote !== null) {
        setVouchers(remote);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'dinego_admin_vouchers') {
        setVouchers(loadAdminVouchers());
      }
    };
    const ch =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_vouchers_sync') : null;
    if (ch) {
      ch.onmessage = () => setVouchers(loadAdminVouchers());
    }
    window.addEventListener('storage', handleStorage);
    void syncRemoteClaims();
    return () => {
      window.removeEventListener('storage', handleStorage);
      ch?.close();
    };
  }, []);

  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherType, setNewVoucherType] = useState<'FIXED_AMOUNT' | 'PERCENTAGE'>('FIXED_AMOUNT');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState(25000);
  const [newVoucherMaxDiscount, setNewVoucherMaxDiscount] = useState(50000);
  const [newVoucherMinOrder, setNewVoucherMinOrder] = useState(100000);
  const [newVoucherMaxUsage, setNewVoucherMaxUsage] = useState(200);
  const [newVoucherEndDate, setNewVoucherEndDate] = useState('2026-12-31');
  const [newVoucherEventTheme, setNewVoucherEventTheme] = useState<VoucherEventTheme>('FLASH_SALE');
  const [newVoucherEventTag, setNewVoucherEventTag] = useState('Sự Kiện Flash Sale Giờ Vàng');
  const [newVoucherMerchantId, setNewVoucherMerchantId] = useState<string>('ALL');
  const [newVoucherFlashHunt, setNewVoucherFlashHunt] = useState(true);
  const [editingAdminVoucherId, setEditingAdminVoucherId] = useState<string | null>(null);
  const [adminVoucherScopeFilter, setAdminVoucherScopeFilter] = useState<'ALL' | 'PLATFORM' | 'MERCHANT'>('ALL');
  const [adminVoucherMerchantFilter, setAdminVoucherMerchantFilter] = useState<string>('ALL');
  const [adminVoucherSearch, setAdminVoucherSearch] = useState('');

  // Merchant Shop Voucher Form States (Scoped to currentMerchant)
  const [shopVoucherCode, setShopVoucherCode] = useState('');
  const [shopVoucherType, setShopVoucherType] = useState<'FIXED_AMOUNT' | 'PERCENTAGE'>('FIXED_AMOUNT');
  const [shopVoucherDiscount, setShopVoucherDiscount] = useState(20000);
  const [shopVoucherMaxDiscount, setShopVoucherMaxDiscount] = useState(40000);
  const [shopVoucherMinOrder, setShopVoucherMinOrder] = useState(80000);
  const [shopVoucherMaxUsage, setShopVoucherMaxUsage] = useState(150);
  const [shopVoucherEndDate, setShopVoucherEndDate] = useState('2026-12-31');
  const [shopVoucherEventTheme, setShopVoucherEventTheme] = useState<VoucherEventTheme>('FLASH_SALE');
  const [shopVoucherEventTag, setShopVoucherEventTag] = useState('Ưu Đãi Độc Quyền Của Quán');
  const [shopVoucherFlashHunt, setShopVoucherFlashHunt] = useState(true);
  const [editingShopVoucherId, setEditingShopVoucherId] = useState<string | null>(null);
  const [shopVoucherBanner, setShopVoucherBanner] = useState('');

  const merchantShopVouchers = vouchers.filter(
    (v) => currentMerchant?.id && v.merchantId === currentMerchant.id,
  );

  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherCode.trim()) return;
    const code = newVoucherCode.trim().toUpperCase();
    const targetMerchant =
      newVoucherMerchantId === 'ALL'
        ? null
        : allMerchants.find((m) => m.id === newVoucherMerchantId) || null;
    const merchantName = targetMerchant ? targetMerchant.name : 'Toàn sàn DineGo';
    const themeLabel =
      newVoucherEventTag.trim() ||
      EVENT_THEME_OPTIONS.find((t) => t.value === newVoucherEventTheme)?.label ||
      'Ưu đãi sự kiện';
    const title =
      newVoucherType === 'PERCENTAGE'
        ? `Giảm ${newVoucherDiscount}%${newVoucherMaxDiscount ? ` (tối đa ${(Number(newVoucherMaxDiscount) / 1000).toFixed(0)}k)` : ''} • ${merchantName} (đơn từ ${Number(newVoucherMinOrder).toLocaleString('vi-VN')}đ)`
        : `Giảm ${Number(newVoucherDiscount).toLocaleString('vi-VN')}đ • ${merchantName} (đơn từ ${Number(newVoucherMinOrder).toLocaleString('vi-VN')}đ)`;

    if (editingAdminVoucherId) {
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === editingAdminVoucherId
            ? {
                ...v,
                code,
                discountType: newVoucherType,
                title,
                discountValue: Number(newVoucherDiscount),
                maxDiscountAmount:
                  newVoucherType === 'PERCENTAGE' && newVoucherMaxDiscount > 0
                    ? Number(newVoucherMaxDiscount)
                    : undefined,
                minOrder: Number(newVoucherMinOrder),
                maxUsage: Number(newVoucherMaxUsage) || 200,
                endDate: newVoucherEndDate || '2026-12-31',
                eventTheme: newVoucherEventTheme,
                eventTag: themeLabel,
                merchantId: targetMerchant ? targetMerchant.id : 'ALL',
                merchantName,
                isFlashHunt: newVoucherFlashHunt,
              }
            : v,
        ),
      );
      appendAuditLog('CẬP NHẬT VOUCHER', code, `${themeLabel} • ${merchantName} (${title})`);
      setEditingAdminVoucherId(null);
      setNewVoucherCode('');
      return;
    }

    const created: ManagedVoucher = {
      id: `v-${Date.now()}`,
      code,
      discountType: newVoucherType,
      title,
      discountValue: Number(newVoucherDiscount),
      maxDiscountAmount:
        newVoucherType === 'PERCENTAGE' && newVoucherMaxDiscount > 0
          ? Number(newVoucherMaxDiscount)
          : undefined,
      minOrder: Number(newVoucherMinOrder),
      usageCount: 0,
      claimedCount: 0,
      maxUsage: Number(newVoucherMaxUsage) || 200,
      endDate: newVoucherEndDate || '2026-12-31',
      isActive: true,
      eventTheme: newVoucherEventTheme,
      eventTag: themeLabel,
      merchantId: targetMerchant ? targetMerchant.id : 'ALL',
      merchantName,
      isFlashHunt: newVoucherFlashHunt,
    };

    setVouchers((prev) => [created, ...prev]);
    appendAuditLog(
      'PHÁT HÀNH VOUCHER SỰ KIỆN',
      code,
      `${themeLabel} • ${merchantName} (${title}, Tối đa ${newVoucherMaxUsage} lượt, HSD ${newVoucherEndDate})`,
    );
    setNewVoucherCode('');
  };

  const handleStartEditAdminVoucher = (v: ManagedVoucher) => {
    setEditingAdminVoucherId(v.id);
    setNewVoucherCode(v.code);
    setNewVoucherType(v.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT');
    setNewVoucherDiscount(v.discountValue);
    setNewVoucherMaxDiscount(v.maxDiscountAmount || 50000);
    setNewVoucherMinOrder(v.minOrder);
    setNewVoucherMaxUsage(v.maxUsage);
    setNewVoucherEndDate(v.endDate);
    setNewVoucherEventTheme(v.eventTheme || 'FLASH_SALE');
    setNewVoucherEventTag(v.eventTag || 'Ưu đãi sự kiện');
    setNewVoucherMerchantId(v.merchantId || 'ALL');
    setNewVoucherFlashHunt(v.isFlashHunt !== false);
  };

  const handleSaveShopVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMerchant || !shopVoucherCode.trim()) return;
    const code = shopVoucherCode.trim().toUpperCase();
    const merchantName = currentMerchant.name;
    const themeLabel = shopVoucherEventTag.trim() || 'Ưu Đãi Độc Quyền Của Quán';
    const title =
      shopVoucherType === 'PERCENTAGE'
        ? `Giảm ${shopVoucherDiscount}%${shopVoucherMaxDiscount ? ` (tối đa ${(Number(shopVoucherMaxDiscount) / 1000).toFixed(0)}k)` : ''} • ${merchantName} (đơn từ ${Number(shopVoucherMinOrder).toLocaleString('vi-VN')}đ)`
        : `Giảm ${Number(shopVoucherDiscount).toLocaleString('vi-VN')}đ • ${merchantName} (đơn từ ${Number(shopVoucherMinOrder).toLocaleString('vi-VN')}đ)`;

    if (editingShopVoucherId) {
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === editingShopVoucherId
            ? {
                ...v,
                code,
                discountType: shopVoucherType,
                title,
                discountValue: Number(shopVoucherDiscount),
                maxDiscountAmount:
                  shopVoucherType === 'PERCENTAGE' && shopVoucherMaxDiscount > 0
                    ? Number(shopVoucherMaxDiscount)
                    : undefined,
                minOrder: Number(shopVoucherMinOrder),
                maxUsage: Number(shopVoucherMaxUsage) || 150,
                endDate: shopVoucherEndDate || '2026-12-31',
                eventTheme: shopVoucherEventTheme,
                eventTag: themeLabel,
                merchantId: currentMerchant.id,
                merchantName,
                isFlashHunt: shopVoucherFlashHunt,
              }
            : v,
        ),
      );
      setEditingShopVoucherId(null);
      setShopVoucherCode('');
      setShopVoucherBanner(`Đã cập nhật thông tin mã voucher "${code}" của quán thành công!`);
      setTimeout(() => setShopVoucherBanner(''), 3500);
      return;
    }

    const created: ManagedVoucher = {
      id: `v-shop-${Date.now()}`,
      code,
      discountType: shopVoucherType,
      title,
      discountValue: Number(shopVoucherDiscount),
      maxDiscountAmount:
        shopVoucherType === 'PERCENTAGE' && shopVoucherMaxDiscount > 0
          ? Number(shopVoucherMaxDiscount)
          : undefined,
      minOrder: Number(shopVoucherMinOrder),
      usageCount: 0,
      claimedCount: 0,
      maxUsage: Number(shopVoucherMaxUsage) || 150,
      endDate: shopVoucherEndDate || '2026-12-31',
      isActive: true,
      eventTheme: shopVoucherEventTheme,
      eventTag: themeLabel,
      merchantId: currentMerchant.id,
      merchantName,
      isFlashHunt: shopVoucherFlashHunt,
    };

    setVouchers((prev) => [created, ...prev]);
    setShopVoucherCode('');
    setShopVoucherBanner(
      `🎉 Đã phát hành mã "${code}" cho quán ${merchantName}! Khách hàng có thể săn và áp mã ngay tại gian hàng.`,
    );
    setTimeout(() => setShopVoucherBanner(''), 4000);
  };

  const handleStartEditShopVoucher = (v: ManagedVoucher) => {
    setEditingShopVoucherId(v.id);
    setShopVoucherCode(v.code);
    setShopVoucherType(v.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT');
    setShopVoucherDiscount(v.discountValue);
    setShopVoucherMaxDiscount(v.maxDiscountAmount || 40000);
    setShopVoucherMinOrder(v.minOrder);
    setShopVoucherMaxUsage(v.maxUsage);
    setShopVoucherEndDate(v.endDate);
    setShopVoucherEventTheme(v.eventTheme || 'FLASH_SALE');
    setShopVoucherEventTag(v.eventTag || 'Ưu Đãi Độc Quyền Của Quán');
    setShopVoucherFlashHunt(v.isFlashHunt !== false);
  };

  const toggleVoucherStatus = (vId: string) => {
    setVouchers((prev) => prev.map((v) => (v.id === vId ? { ...v, isActive: !v.isActive } : v)));
  };

  const toggleVoucherFlashHunt = (vId: string) => {
    setVouchers((prev) =>
      prev.map((v) => (v.id === vId ? { ...v, isFlashHunt: v.isFlashHunt === false } : v)),
    );
  };

  const handleDeleteVoucher = (vId: string, code: string) => {
    if (!window.confirm(`Xóa mã khuyến mãi "${code}" khỏi hệ thống?`)) return;
    setVouchers((prev) => prev.filter((v) => v.id !== vId));
    appendAuditLog('XÓA VOUCHER SỰ KIỆN', code, 'Đã gỡ bỏ mã khỏi danh sách khuyến mãi');
  };

  // Merchant Reviews & Replies State (Persisted in localStorage & synced in real-time with Customer ReviewModal)
  const loadStoredReviews = () => {
    try {
      const saved = localStorage.getItem('dinego_merchant_reviews');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'rev-01',
        merchantId: 'merchant-com-tam',
        merchantName: 'Cơm Tấm Sài Gòn 1985',
        customerName: 'Trần Thị Bình',
        orderRef: 'DG20261102-8812',
        itemsSummary: '1x Cơm Tấm Sườn Bì Chả Đặc Biệt',
        rating: 5,
        comment: 'Cơm sườn ngon, miếng sườn dày ướp vừa miệng. Đóng gói hộp giấy sạch sẽ.',
        reply: 'Cơm Tấm Sài Gòn 1985 cảm ơn quý khách đã ủng hộ. Hẹn gặp lại bạn ở những đơn tiếp theo!',
        date: '03/11/2026',
      },
      {
        id: 'rev-02',
        merchantId: 'merchant-com-tam',
        merchantName: 'Cơm Tấm Sài Gòn 1985',
        customerName: 'Phạm Minh Tuấn',
        orderRef: 'DG20261101-4409',
        itemsSummary: '2x Cơm Sườn Nướng Mật Ong',
        rating: 4,
        comment: 'Đồ ăn nóng hổi nhưng lần sau quán nhớ cho thêm 1 gói nước mắm ớt riêng nhé.',
        reply: null as string | null,
        date: '02/11/2026',
      },
    ];
  };

  const [reviews, setReviews] = useState<any[]>(() => loadStoredReviews());

  useEffect(() => {
    const refreshReviews = () => {
      setReviews(loadStoredReviews());
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'dinego_merchant_reviews') {
        refreshReviews();
      }
    };
    const ch =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_reviews_sync') : null;
    if (ch) {
      ch.onmessage = () => refreshReviews();
    }
    window.addEventListener('storage', handleStorage);
    window.addEventListener('dinego_reviews_updated', refreshReviews);
    window.addEventListener('focus', refreshReviews);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dinego_reviews_updated', refreshReviews);
      window.removeEventListener('focus', refreshReviews);
      ch?.close();
    };
  }, []);

  // Filter reviews specifically belonging to the current Merchant
  const currentMerchantReviews = reviews.filter((r: any) => {
    if (r.merchantId && currentMerchant?.id) {
      return r.merchantId === currentMerchant.id;
    }
    if (r.merchantName && currentMerchant?.name) {
      return r.merchantName.trim().toLowerCase() === currentMerchant.name.trim().toLowerCase();
    }
    if (r.orderRef && orders.some((o) => o.orderNumber === r.orderRef)) {
      return true;
    }
    return isSeedDemoMerchant && !r.merchantId;
  });

  const [replyInput, setReplyInput] = useState<{ [key: string]: string }>({});

  const handleSendReply = (reviewId: string) => {
    const text = replyInput[reviewId];
    if (!text?.trim()) return;
    const latestAll = loadStoredReviews();
    const existsInStorage = latestAll.some((r: any) => r.id === reviewId);
    const baseList = existsInStorage ? latestAll : reviews;
    const nextReviews = baseList.map((r: any) =>
      r.id === reviewId
        ? {
            ...r,
            reply: text.trim(),
            repliedAt: new Date().toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          }
        : r,
    );
    setReviews(nextReviews);
    setReplyInput({ ...replyInput, [reviewId]: '' });
    try {
      const serialized = JSON.stringify(nextReviews);
      localStorage.setItem('dinego_merchant_reviews', serialized);
      window.dispatchEvent(new CustomEvent('dinego_reviews_updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('dinego_reviews_sync');
        ch.postMessage(serialized);
        ch.close();
      }
    } catch {}
  };

  // ============================================================================
  // SHELL 1: ENTERPRISE ADMIN BACKOFFICE (HỆ THỐNG QUẢN TRỊ SÀN)
  // ============================================================================
  if (isAdminRole) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
        {/* Left Enterprise Sticky Sidebar */}
        <aside
          style={{
            width: 260,
            background: '#0F172A',
            color: '#E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            borderRight: '1px solid #1E293B',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            zIndex: 40,
          }}
        >
          {/* Sidebar Brand */}
          <div style={{ padding: '20px 22px', borderBottom: '1px solid #1E293B', background: '#090D16' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
                }}
              >
                DG
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 1.1 }}>
                  DineGo Backoffice
                </div>
                <div style={{ fontSize: '0.68rem', color: '#818CF8', fontWeight: 700, letterSpacing: 0.5, marginTop: 2 }}>
                  ENTERPRISE CONTROL
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ padding: '0 10px 8px', fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Điều Hành Trọng Yếu
            </div>
            {[
              { id: 'admin-overview' as NavTab, label: 'Tổng quan vận hành', icon: <BarChart3 size={17} /> },
              {
                id: 'admin-merchants' as NavTab,
                label: 'Đối tác Quán & KYC',
                icon: <Store size={17} />,
                badge: allMerchants.filter((m) => getEffectiveMerchantKycStatus(m) === 'PENDING').length || undefined,
              },
              { id: 'admin-drivers' as NavTab, label: 'Đội ngũ Tài xế', icon: <Bike size={17} /> },
              { id: 'admin-users' as NavTab, label: 'Người dùng & Phân quyền', icon: <UsersIcon size={17} /> },
              {
                id: 'admin-complaints' as NavTab,
                label: 'Khiếu nại & Bom hàng',
                icon: <MessageSquare size={17} />,
                badge:
                  complaints.filter((c) => c.status === 'OPEN').length +
                  deliveryDisputes.filter((d) => d.status === 'PENDING_REVIEW').length,
              },
              { id: 'admin-reconciliation' as NavTab, label: 'Đối soát & Khuyến mãi', icon: <FileSpreadsheet size={17} /> },
              {
                id: 'admin-knowledge' as NavTab,
                label: 'Tri thức AI (RAG)',
                icon: <UtensilsCrossed size={17} />,
                badge: 'Bảo trì',
              },
              { id: 'admin-settings' as NavTab, label: 'Can thiệp & Cấu hình sàn', icon: <Sliders size={17} /> },
            ].map((item) => {
              const isActive = currentAdminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: isActive ? '#4F46E5' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.86rem',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#1E293B';
                      e.currentTarget.style.color = '#F1F5F9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#94A3B8';
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span
                      style={{
                        background: isActive ? '#FFFFFF' : '#EF4444',
                        color: isActive ? '#4F46E5' : '#FFFFFF',
                        padding: '1px 7px',
                        borderRadius: 10,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Sticky Sidebar Footer — Always Visible Logout */}
          <div
            style={{
              padding: 14,
              borderTop: '1px solid #1E293B',
              background: '#0F172A',
              position: 'sticky',
              bottom: 0,
              marginTop: 'auto',
              zIndex: 10,
            }}
          >
            <div style={{ marginBottom: 10, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Phiên quản trị viên</span>
              <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                ONLINE
              </span>
            </div>
            <button
              onClick={() => onLogout?.()}
              style={{
                width: '100%',
                padding: '10px 14px',
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
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#DC2626';
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.borderColor = '#DC2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1E293B';
                e.currentTarget.style.color = '#F87171';
                e.currentTarget.style.borderColor = '#334155';
              }}
            >
              <LogOut size={16} /> Đăng xuất Quản trị sàn
            </button>
          </div>
        </aside>

        {/* Right Main Workspace */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Top Operational Header (Always Sticky with Direct Logout) */}
          <header
            style={{
              height: 64,
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              padding: '0 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 30,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: -0.2 }}>
                {currentAdminTab === 'admin-overview' && 'Tổng quan vận hành & Giám sát giao dịch toàn sàn'}
                {currentAdminTab === 'admin-merchants' && 'Quản lý Đối tác Nhà hàng & Thẩm định Pháp lý (KYC)'}
                {currentAdminTab === 'admin-drivers' && 'Quản lý Đội ngũ Tài xế Giao hàng (DineGo Express)'}
                {currentAdminTab === 'admin-users' && 'Quản lý Danh sách Người dùng & Can thiệp Phân quyền'}
                {currentAdminTab === 'admin-complaints' && 'Trung tâm Phân xử Khiếu nại, Tranh chấp & Hoàn tiền'}
                {currentAdminTab === 'admin-reconciliation' && 'Đối soát Công nợ Kỳ, Giải ngân & Quản lý Khuyến mãi'}
                {currentAdminTab === 'admin-knowledge' && 'Quản trị Cơ sở Tri thức Ẩm thực Địa phương (AI RAG Vector DB — U036)'}
                {currentAdminTab === 'admin-settings' && 'Bảng Điều Khiển Can Thiệp Sâu & Cấu Hình Hạ Tầng Toàn Sàn'}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#475569', background: '#F1F5F9', padding: '6px 12px', borderRadius: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                <span style={{ fontWeight: 600 }}>Cơ sở dữ liệu máy chủ: Đang kết nối</span>
              </div>

              <div style={{ height: 20, width: 1, background: '#E2E8F0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                  }}
                >
                  AD
                </div>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                    {currentUser?.fullName || 'Ban Quản Trị Hệ Thống'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B' }}>ADMINISTRATOR</div>
                </div>
              </div>

              {/* Direct Header Logout Button — 100% Never Missed */}
              <button
                onClick={() => onLogout?.()}
                title="Đăng xuất khỏi hệ thống quản trị"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginLeft: 6,
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
                <LogOut size={14} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </header>

          {/* Content Body */}
          <div style={{ padding: 28, flex: 1, overflowY: 'auto' }}>
            {/* ADMIN TAB 1: OVERVIEW */}
            {currentAdminTab === 'admin-overview' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', borderTop: '4px solid #4F46E5', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      TỔNG GIÁ TRỊ GIAO DỊCH (GMV)
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A' }}>
                      {adminSystem.totalGmv.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 6 }}>
                      Tính trực tiếp từ {validOrders.length} đơn hợp lệ & {approvedFeasts.length} tiệc
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', borderTop: '4px solid #00B14F', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      DOANH THU RÒNG PHÍ SÀN ({platformCommissionRate}%)
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#00B14F' }}>
                      {adminSystem.platformRevenue.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 6 }}>
                      Khấu trừ {platformCommissionRate}% trên doanh thu thực tế phát sinh
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', borderTop: '4px solid #0284C7', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      TỔNG ĐƠN HÀNG THỰC TẾ
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A' }}>
                      {adminSystem.totalOrders} đơn
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#0284C7', marginTop: 6, fontWeight: 700 }}>
                      Đã hoàn tất: {adminSystem.completedOrders} đơn
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', borderTop: '4px solid #F59E0B', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      ĐỐI TÁC & NGƯỜI DÙNG HỆ THỐNG
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A' }}>
                      {allMerchants.length} quán • {allUsersList.length} user
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: 6, fontWeight: 700 }}>
                      ✓ {driversList.filter((d) => d.status === 'ACTIVE').length}/{driversList.length} tài xế hoạt động
                    </div>
                  </div>
                </div>

                {/* U044: Biểu đồ tỷ trọng đơn theo luồng & Top Nhà hàng Doanh thu cao nhất */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                    gap: 20,
                    marginBottom: 24,
                  }}
                >
                  {/* Phân bổ GMV & Đơn hàng theo Luồng Nghiệp vụ */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 22 }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                      Phân bổ GMV & Số lượng đơn theo Luồng Nghiệp vụ (U044)
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 18px 0' }}>
                      Dữ liệu thực tế từ đơn hàng Luồng 1 (Đặt đồ ăn) và Luồng 2 (Đặt mâm cỗ sự kiện)
                    </p>

                    {(() => {
                      const totalBoth = Math.max(foodDeliveryGmv + cateringFeastGmv, 1);
                      const foodPct = totalGmvReal > 0 ? Math.round((foodDeliveryGmv / totalBoth) * 1000) / 10 : 0;
                      const feastPct = totalGmvReal > 0 ? Math.round((cateringFeastGmv / totalBoth) * 1000) / 10 : 0;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                              <span style={{ color: '#0F172A' }}>Luồng 1: Đặt đồ ăn giao ngay & Group Order</span>
                              <span style={{ color: '#4F46E5' }}>
                                {foodDeliveryGmv.toLocaleString('vi-VN')} đ ({foodPct}% • {validOrders.length} đơn)
                              </span>
                            </div>
                            <div style={{ height: 10, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${foodPct}%`, height: '100%', background: '#4F46E5', borderRadius: 999 }} />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                              <span style={{ color: '#0F172A' }}>Luồng 2: Đặt mâm cỗ sự kiện & Cọc 2 đợt</span>
                              <span style={{ color: '#00B14F' }}>
                                {cateringFeastGmv.toLocaleString('vi-VN')} đ ({feastPct}% • {approvedFeasts.length} hợp đồng)
                              </span>
                            </div>
                            <div style={{ height: 10, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${feastPct}%`, height: '100%', background: '#00B14F', borderRadius: 999 }} />
                            </div>
                          </div>

                          {/* Mini Bar Chart Doanh thu 7 ngày gần nhất từ đơn thực tế */}
                          <div style={{ marginTop: 8, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                              BIỂU ĐỒ GMV THỰC TẾ 7 NGÀY GẦN NHẤT (VNĐ)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 86 }}>
                              {sevenDayGmvChart.map((b) => (
                                <div key={b.dateKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#4F46E5' }}>
                                    {b.gmv > 0 ? `${Math.round(b.gmv / 1000)}k` : '0đ'}
                                  </span>
                                  <div
                                    style={{
                                      width: '100%',
                                      height: `${Math.round(b.pct * 0.52)}px`,
                                      background: b.gmv > 0 ? 'linear-gradient(180deg, #4F46E5 0%, #818CF8 100%)' : '#E2E8F0',
                                      borderRadius: '4px 4px 0 0',
                                    }}
                                  />
                                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>{b.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bảng Xếp hạng Top Nhà hàng Doanh thu cao nhất (Tính thực từ orders) */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 22 }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                      Top Đối tác Nhà hàng Doanh thu cao nhất (Top Merchants)
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 14px 0' }}>
                      Tổng hợp trực tiếp từ các đơn hàng thực tế phát sinh của từng quán
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {topMerchantsReal.map((tm, idx) => (
                        <div
                          key={tm.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: idx === 0 ? '#EEF2FF' : '#F8FAFC',
                            border: idx === 0 ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: idx === 0 ? '#4F46E5' : '#CBD5E1',
                                color: idx === 0 ? '#FFFFFF' : '#1E293B',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>{tm.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                                {tm.ordersCount} đơn hàng • ★ {tm.rating}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#00B14F' }}>
                              {tm.gmv.toLocaleString('vi-VN')} đ
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              Phí sàn ({platformCommissionRate}%): {tm.platformFee.toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Platform Orders Ledger */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Sổ cái giao dịch đơn hàng toàn sàn (Real-time Ledger)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                        Giám sát tức thời các đơn hàng đang phát sinh giữa Khách hàng, Quán ăn và Tài xế
                      </p>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4F46E5', background: '#EEF2FF', padding: '4px 12px', borderRadius: 6 }}>
                      {orders.length} đơn hàng trong phiên
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <th style={{ padding: '12px 20px' }}>Mã đơn hàng</th>
                          <th style={{ padding: '12px 20px' }}>Nhà hàng</th>
                          <th style={{ padding: '12px 20px' }}>Khách nhận món</th>
                          <th style={{ padding: '12px 20px' }}>Tổng thanh toán</th>
                          <th style={{ padding: '12px 20px' }}>Phí sàn ({platformCommissionRate}%)</th>
                          <th style={{ padding: '12px 20px' }}>Phương thức</th>
                          <th style={{ padding: '12px 20px' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0F172A' }}>#{o.orderNumber}</td>
                            <td style={{ padding: '14px 20px', fontWeight: 600, color: '#334155' }}>{o.merchant.name}</td>
                            <td style={{ padding: '14px 20px', color: '#475569' }}>
                              {o.recipientName} ({o.recipientPhone})
                            </td>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0F172A' }}>
                              {o.finalTotal.toLocaleString('vi-VN')}đ
                            </td>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: '#4F46E5' }}>
                              +{Math.round(o.subtotal * commissionRateDecimal).toLocaleString('vi-VN')}đ
                            </td>
                            <td style={{ padding: '14px 20px', color: '#475569' }}>
                              {o.payment?.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'Ví MoMo QR'}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: o.status === 'COMPLETED' ? '#DCFCE7' : '#EEF2FF',
                                  color: o.status === 'COMPLETED' ? '#15803D' : '#4F46E5',
                                }}
                              >
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN TAB 2: MERCHANTS & KYC MODERATION + AUDIT LOGS (U045) */}
            {currentAdminTab === 'admin-merchants' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Danh mục Đối tác Nhà hàng & Phê duyệt Hồ sơ Pháp lý (KYC — U045)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                        Duyệt đăng ký quán mới (Approve / Reject), tạm khóa gian hàng vi phạm và ghi nhận Audit Log
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '5px 12px', borderRadius: 6 }}>
                        {allMerchants.filter((m) => getEffectiveMerchantKycStatus(m) === 'PENDING').length} chờ duyệt KYC
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '5px 12px', borderRadius: 6 }}>
                        {allMerchants.filter((m) => getEffectiveMerchantKycStatus(m) === 'APPROVED').length} đang hoạt động
                      </span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <th style={{ padding: '12px 20px' }}>Gian hàng</th>
                          <th style={{ padding: '12px 20px' }}>Đại diện & GPKD</th>
                          <th style={{ padding: '12px 20px' }}>Địa chỉ kinh doanh</th>
                          <th style={{ padding: '12px 20px' }}>Trạng thái KYC</th>
                          <th style={{ padding: '12px 20px' }}>Ghi chú</th>
                          <th style={{ padding: '12px 20px', textAlign: 'right' }}>Quyết định quản trị</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMerchants.map((m) => {
                          const kycStatus = getEffectiveMerchantKycStatus(m);
                          return (
                            <tr
                              key={m.id}
                              style={{
                                borderBottom: '1px solid #F1F5F9',
                                background:
                                  kycStatus === 'SUSPENDED' || kycStatus === 'REJECTED'
                                    ? '#FEF2F2'
                                    : kycStatus === 'PENDING'
                                    ? '#FFFBEB'
                                    : '#FFFFFF',
                              }}
                            >
                              <td style={{ padding: '14px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <img
                                    src={m.storeFrontImage || m.coverUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80'}
                                    alt={m.name}
                                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{m.name}</div>
                                    <div style={{ fontSize: '0.76rem', color: '#64748B' }}>SĐT: {m.phoneNumber}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '14px 20px', color: '#334155', fontWeight: 600 }}>
                                <div>{m.ownerName || 'Chủ Hộ Kinh Doanh'}</div>
                                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500 }}>
                                  GPKD: {m.businessLicenseNumber || 'VSATTP-2026-HCM'}
                                </div>
                              </td>
                              <td style={{ padding: '14px 20px', color: '#475569', maxWidth: 240 }}>{m.address}</td>
                              <td style={{ padding: '14px 20px' }}>
                                <span
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    background:
                                      kycStatus === 'APPROVED'
                                        ? '#DCFCE7'
                                        : kycStatus === 'PENDING'
                                        ? '#FEF3C7'
                                        : '#FEE2E2',
                                    color:
                                      kycStatus === 'APPROVED'
                                        ? '#15803D'
                                        : kycStatus === 'PENDING'
                                        ? '#D97706'
                                        : '#DC2626',
                                  }}
                                >
                                  {kycStatus === 'APPROVED' && 'Đã duyệt KYC'}
                                  {kycStatus === 'PENDING' && 'Chờ duyệt đăng ký'}
                                  {kycStatus === 'REJECTED' && 'Từ chối hồ sơ'}
                                  {kycStatus === 'SUSPENDED' && 'Đang tạm khóa'}
                                </span>
                              </td>
                              <td style={{ padding: '14px 20px' }}>
                                <input
                                  type="text"
                                  placeholder="Nhập ghi chú..."
                                  value={merchantModerationReasons[m.id] || ''}
                                  onChange={(e) =>
                                    setMerchantModerationReasons((prev) => ({
                                      ...prev,
                                      [m.id]: e.target.value,
                                    }))
                                  }
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #CBD5E1',
                                    fontSize: '0.78rem',
                                    width: 190,
                                  }}
                                />
                              </td>
                              <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  {kycStatus === 'PENDING' && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateMerchantKyc(m, 'APPROVED')}
                                        style={{
                                          padding: '6px 12px',
                                          borderRadius: 6,
                                          border: 'none',
                                          background: '#00B14F',
                                          color: '#FFFFFF',
                                          fontSize: '0.78rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Duyệt quán
                                      </button>
                                      <button
                                        onClick={() => handleUpdateMerchantKyc(m, 'REJECTED')}
                                        style={{
                                          padding: '6px 12px',
                                          borderRadius: 6,
                                          border: '1px solid #FCA5A5',
                                          background: '#FFFFFF',
                                          color: '#DC2626',
                                          fontSize: '0.78rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Từ chối
                                      </button>
                                    </>
                                  )}
                                  {kycStatus === 'APPROVED' && (
                                    <button
                                      onClick={() => handleUpdateMerchantKyc(m, 'SUSPENDED')}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #FCA5A5',
                                        background: '#FFFFFF',
                                        color: '#DC2626',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Tạm khóa quán
                                    </button>
                                  )}
                                  {(kycStatus === 'SUSPENDED' || kycStatus === 'REJECTED') && (
                                    <button
                                      onClick={() => handleUpdateMerchantKyc(m, 'APPROVED')}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: '#10B981',
                                        color: '#FFFFFF',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Khôi phục / Duyệt lại
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Nhật ký Kiểm toán Thao tác Admin (Audit Logs — U045) */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Nhật ký Kiểm toán Quản trị (Admin Audit Logs — U045)
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                        Tự động lưu vết mọi thao tác duyệt quán, khóa tài khoản, phân xử khiếu nại và giải ngân
                      </p>
                    </div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4F46E5', background: '#EEF2FF', padding: '4px 10px', borderRadius: 6 }}>
                      {adminAuditLogs.length} bản ghi
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.73rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 20px' }}>Thời gian</th>
                          <th style={{ padding: '10px 20px' }}>Hành động</th>
                          <th style={{ padding: '10px 20px' }}>Đối tượng tác động</th>
                          <th style={{ padding: '10px 20px' }}>Ghi chú</th>
                          <th style={{ padding: '10px 20px' }}>Quản trị viên</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminAuditLogs.map((log) => (
                          <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '11px 20px', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>{log.timestamp}</td>
                            <td style={{ padding: '11px 20px', fontWeight: 700, color: '#4F46E5' }}>{log.action}</td>
                            <td style={{ padding: '11px 20px', fontWeight: 700, color: '#0F172A' }}>{log.targetName}</td>
                            <td style={{ padding: '11px 20px', color: '#334155' }}>{log.reason}</td>
                            <td style={{ padding: '11px 20px', color: '#64748B' }}>{log.performedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN TAB 3: DRIVER FLEET MANAGEMENT */}
            {currentAdminTab === 'admin-drivers' && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Danh sách Đội ngũ Tài xế Đối tác (DineGo Express)
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Quản lý hồ sơ phương tiện, khu vực hoạt động, hiệu suất giao hàng và trạng thái nhận chuyến
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284C7', background: '#E0F2FE', padding: '5px 14px', borderRadius: 6 }}>
                    {driversList.length} tài xế trong đội xe
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <th style={{ padding: '12px 20px' }}>Mã tài xế</th>
                        <th style={{ padding: '12px 20px' }}>Họ và tên</th>
                        <th style={{ padding: '12px 20px' }}>Phương tiện & Biển số</th>
                        <th style={{ padding: '12px 20px' }}>Khu vực hoạt động</th>
                        <th style={{ padding: '12px 20px' }}>Số chuyến & Đánh giá</th>
                        <th style={{ padding: '12px 20px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driversList.map((drv) => (
                        <tr key={drv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0F172A' }}>{drv.code}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{drv.fullName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{drv.phone}</div>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#334155' }}>
                            <strong style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{drv.licensePlate}</strong> ({drv.vehicle})
                          </td>
                          <td style={{ padding: '14px 20px', color: '#475569' }}>{drv.area}</td>
                          <td style={{ padding: '14px 20px', fontWeight: 700 }}>{drv.completedTrips} chuyến ({drv.rating} ★)</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: drv.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                                color: drv.status === 'ACTIVE' ? '#15803D' : '#DC2626',
                              }}
                            >
                              {drv.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa tài khoản'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              onClick={() => toggleDriverStatus(drv.id)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 6,
                                border: drv.status === 'ACTIVE' ? '1px solid #FCA5A5' : 'none',
                                background: drv.status === 'ACTIVE' ? '#FFFFFF' : '#10B981',
                                color: drv.status === 'ACTIVE' ? '#DC2626' : '#FFFFFF',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {drv.status === 'ACTIVE' ? 'Đình chỉ nhận chuyến' : 'Mở khóa tài xế'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Driver Withdrawal Requests Section */}
                <div style={{ borderTop: '1px solid #E2E8F0', padding: '18px 24px', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Yêu cầu Rút tiền về Ngân hàng của Tài xế
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Admin kiểm tra số dư thực nhận và xác nhận giải ngân cho tài xế
                    </p>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '4px 12px', borderRadius: 6 }}>
                    {driverWithdrawals.filter((w) => w.status === 'PENDING').length} yêu cầu chờ duyệt
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 20px' }}>Tài xế</th>
                        <th style={{ padding: '10px 20px' }}>Tài khoản nhận</th>
                        <th style={{ padding: '10px 20px' }}>Số tiền rút</th>
                        <th style={{ padding: '10px 20px' }}>Thời gian gửi</th>
                        <th style={{ padding: '10px 20px' }}>Trạng thái</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right' }}>Phê duyệt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverWithdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>
                            Chưa có yêu cầu rút tiền nào từ tài xế.
                          </td>
                        </tr>
                      ) : (
                        driverWithdrawals.map((w) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 20px' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{w.driverName}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{w.driverPhone} • {w.licensePlate}</div>
                            </td>
                            <td style={{ padding: '12px 20px', color: '#334155' }}>
                              <div><strong>{w.bankName}</strong> • {w.bankAccountNumber}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{w.bankAccountHolder}</div>
                            </td>
                            <td style={{ padding: '12px 20px', fontWeight: 800, color: '#0284C7' }}>
                              {w.amount.toLocaleString('vi-VN')}đ
                            </td>
                            <td style={{ padding: '12px 20px', color: '#64748B', fontSize: '0.78rem' }}>{w.createdAt}</td>
                            <td style={{ padding: '12px 20px' }}>
                              <span
                                style={{
                                  padding: '3px 10px',
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
                                  ? 'Đã giải ngân'
                                  : w.status === 'REJECTED'
                                  ? 'Đã từ chối'
                                  : 'Chờ Admin duyệt'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                              {w.status === 'PENDING' ? (
                                <div style={{ display: 'inline-flex', gap: 8 }}>
                                  <button
                                    onClick={() => handleProcessDriverWithdrawal(w.id, 'APPROVED')}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 6,
                                      background: '#10B981',
                                      color: '#FFFFFF',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Duyệt giải ngân
                                  </button>
                                  <button
                                    onClick={() => handleProcessDriverWithdrawal(w.id, 'REJECTED')}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 6,
                                      background: '#FFFFFF',
                                      color: '#DC2626',
                                      border: '1px solid #FCA5A5',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                                  {w.processedAt || 'Đã xử lý'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ADMIN TAB 4: COMPLAINTS & DISPUTES (U051) */}
            {currentAdminTab === 'admin-complaints' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Danh sách Hồ sơ Khiếu nại, Ảnh bằng chứng & Phân xử Hoàn tiền (U051)
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Thẩm định hình ảnh phản ánh chất lượng món từ khách hàng, ghi chú lý do phán quyết và duyệt bồi hoàn
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '5px 14px', borderRadius: 6 }}>
                    {complaints.filter((c) => c.status === 'OPEN').length} hồ sơ chờ giải quyết
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <th style={{ padding: '12px 18px' }}>Mã hồ sơ / Đơn</th>
                        <th style={{ padding: '12px 18px' }}>Khách hàng & Gian hàng</th>
                        <th style={{ padding: '12px 18px' }}>Nội dung & Ảnh bằng chứng</th>
                        <th style={{ padding: '12px 18px' }}>Mức bồi hoàn</th>
                        <th style={{ padding: '12px 18px' }}>Ghi chú</th>
                        <th style={{ padding: '12px 18px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Quyết định xử lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((cmp) => (
                        <tr key={cmp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{cmp.code}</div>
                            <div style={{ fontSize: '0.75rem', color: '#4F46E5', fontWeight: 600 }}>#{cmp.orderNumber}</div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{cmp.customerName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Quán: {cmp.merchantName}</div>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#334155', maxWidth: 280 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {cmp.evidenceImage && (
                                <img
                                  src={cmp.evidenceImage}
                                  alt="Bằng chứng"
                                  style={{ width: 46, height: 46, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }}
                                />
                              )}
                              <span style={{ fontSize: '0.82rem' }}>{cmp.issueType}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: 700, color: '#DC2626' }}>
                            {cmp.compensationAmount.toLocaleString('vi-VN')}đ
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {cmp.status === 'OPEN' ? (
                              <input
                                type="text"
                                placeholder="Nhập ghi chú..."
                                value={complaintNoteInputs[cmp.id] || ''}
                                onChange={(e) =>
                                  setComplaintNoteInputs((prev) => ({
                                    ...prev,
                                    [cmp.id]: e.target.value,
                                  }))
                                }
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.78rem',
                                  width: 195,
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                                {cmp.resolutionNotes || 'Đã hoàn tất xử lý'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: cmp.status === 'OPEN' ? '#FEF3C7' : cmp.status === 'REFUNDED' ? '#DCFCE7' : '#FEE2E2',
                                color: cmp.status === 'OPEN' ? '#D97706' : cmp.status === 'REFUNDED' ? '#15803D' : '#DC2626',
                              }}
                            >
                              {cmp.status === 'OPEN' ? 'Chờ phân xử' : cmp.status === 'REFUNDED' ? 'Đã hoàn tiền' : 'Đã từ chối'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {cmp.status === 'OPEN' ? (
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  onClick={() => handleResolveComplaint(cmp.id, 'REFUND')}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    background: '#00B14F',
                                    color: '#FFFFFF',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Duyệt hoàn tiền
                                </button>
                                <button
                                  onClick={() => handleResolveComplaint(cmp.id, 'REJECT')}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    background: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    color: '#475569',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{cmp.createdAt}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

                {/* DRIVER DELIVERY DISPUTES (BOM HÀNG) & EVIDENCE VERIFICATION */}
                <div style={{ background: '#FFFFFF', border: '1px solid #FECACA', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(220,38,38,0.05)' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #FEE2E2', background: '#FEF2F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={20} color="#DC2626" />
                      <div>
                        <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#7F1D1D', margin: 0 }}>
                          Hồ sơ Tài xế Tố Cáo Khách Bom Hàng & Bằng Chứng Hiện Trường ({deliveryDisputes.length})
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#991B1B', margin: '3px 0 0 0' }}>
                          Đối chiếu nhật ký cuộc gọi, ảnh chụp hiện trường, tọa độ GPS tại điểm giao và duyệt bồi hoàn cước cho Shipper
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B91C1C', background: '#FFFFFF', border: '1px solid #FECACA', padding: '5px 14px', borderRadius: 6 }}>
                      {deliveryDisputes.filter((d) => d.status === 'PENDING_REVIEW').length} hồ sơ chờ duyệt
                    </span>
                  </div>

                  {deliveryDisputes.length === 0 ? (
                    <div style={{ padding: '32px 24px', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                      Chưa có hồ sơ tố cáo bom hàng nào từ tài xế.
                    </div>
                  ) : (
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {deliveryDisputes.map((disp) => {
                        const isPending = disp.status === 'PENDING_REVIEW';
                        const isCompensated = disp.status === 'COMPENSATED_DRIVER';
                        const statusBg = isPending ? '#FEF3C7' : isCompensated ? '#DCFCE7' : '#FEE2E2';
                        const statusColor = isPending ? '#B45309' : isCompensated ? '#15803D' : '#B91C1C';
                        const statusLabel = isPending
                          ? 'Chờ thẩm định'
                          : isCompensated
                            ? 'Đã duyệt & Bồi hoàn'
                            : 'Đã từ chối';

                        return (
                          <div
                            key={disp.id}
                            style={{
                              border: '1px solid #E2E8F0',
                              borderRadius: 10,
                              padding: 18,
                              background: '#F8FAFC',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 14,
                            }}
                          >
                            {/* Top Meta Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>{disp.reportCode}</span>
                                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, background: statusBg, color: statusColor }}>
                                  {statusLabel}
                                </span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                                  Đơn #{disp.orderNumber} • {disp.merchantName}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                                Gửi lúc: {new Date(disp.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>

                            {/* Driver, Customer & Field Proof Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, fontSize: '0.82rem' }}>
                              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Tài xế báo cáo</div>
                                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 3 }}>{disp.driverName}</div>
                                <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <Phone size={12} /> {disp.driverPhone}
                                </div>
                              </div>

                              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Khách hàng & Điểm giao</div>
                                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 3 }}>{disp.customerName} ({disp.customerPhone})</div>
                                <div style={{ color: '#475569', display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 2 }}>
                                  <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                                  <span>{disp.deliveryAddress}</span>
                                </div>
                              </div>

                              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Lý do & Đối chứng liên hệ</div>
                                <div style={{ fontWeight: 700, color: '#DC2626', marginTop: 3 }}>{disp.reasonLabel}</div>
                                <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                                  <span>Gọi: <strong>{disp.callAttemptsCount} lần</strong></span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <Clock size={12} /> Chờ: <strong>{disp.waitMinutes} phút</strong>
                                  </span>
                                </div>
                                {disp.gpsSnapshot && (
                                  <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#0F766E', fontWeight: 600 }}>
                                    GPS: {disp.gpsSnapshot.lat.toFixed(5)}, {disp.gpsSnapshot.lng.toFixed(5)} (cách điểm giao {(disp.gpsSnapshot.distanceToCustomerKm * 1000).toFixed(0)}m)
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: '0.83rem', color: '#334155', lineHeight: 1.5 }}>
                              <strong style={{ color: '#0F172A' }}>Tường trình hiện trường:</strong> {disp.description}
                            </div>

                            {/* Evidence Images Strip */}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                                <Camera size={14} /> Bằng chứng hình ảnh đính kèm ({disp.evidenceImages.length})
                              </div>
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {disp.evidenceImages.map((imgUrl, idx) => (
                                  <button
                                    key={`${disp.id}-img-${idx}`}
                                    type="button"
                                    onClick={() => setPreviewDisputeImg(imgUrl)}
                                    style={{
                                      padding: 0,
                                      border: '2px solid #CBD5E1',
                                      borderRadius: 8,
                                      overflow: 'hidden',
                                      width: 88,
                                      height: 88,
                                      cursor: 'pointer',
                                      background: '#FFFFFF',
                                    }}
                                    title="Bấm để phóng to bằng chứng"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`Bằng chứng ${idx + 1} - ${disp.reportCode}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Order Totals & Admin Action Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                              <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <span>Giá trị đơn: <strong style={{ color: '#0F172A' }}>{disp.orderTotal.toLocaleString('vi-VN')}đ</strong> ({disp.paymentMethod})</span>
                                <span>Đề xuất bồi hoàn tài xế: <strong style={{ color: '#059669' }}>+{(disp.compensationAmount || 15000).toLocaleString('vi-VN')}đ</strong></span>
                              </div>

                              {isPending ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onResolveDeliveryDispute?.(
                                        disp.id,
                                        'COMPENSATED_DRIVER',
                                        'Admin đã xác minh ảnh hiện trường & tọa độ GPS tài xế — duyệt bồi hoàn cước.',
                                      )
                                    }
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '7px 14px',
                                      borderRadius: 6,
                                      background: '#059669',
                                      color: '#FFFFFF',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <CheckCircle2 size={15} /> Duyệt & Bồi hoàn +{(disp.compensationAmount || 15000).toLocaleString('vi-VN')}đ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onResolveDeliveryDispute?.(
                                        disp.id,
                                        'REJECTED',
                                        'Bằng chứng hiện trường chưa đủ căn cứ xác nhận khách bom hàng.',
                                      )
                                    }
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '7px 14px',
                                      borderRadius: 6,
                                      background: '#FEE2E2',
                                      color: '#DC2626',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      border: '1px solid #FECACA',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <XCircle size={15} /> Từ chối
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                                  {disp.adminNote || 'Đã xử lý'}
                                </span>
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

            {/* ADMIN TAB 5: RECONCILIATION & VOUCHERS (U046 & U052) */}
            {currentAdminTab === 'admin-reconciliation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Bảng đối soát công nợ & giải ngân đối tác cuối tháng (U046 — BR-42)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                        Tổng hợp doanh thu gộp, phí ship thu hộ, khấu trừ 15% phí nền tảng và hoàn tiền khiếu nại
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <select
                        value={reconciliationPeriodFilter}
                        onChange={(e) => setReconciliationPeriodFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0F172A',
                          background: '#F8FAFC',
                        }}
                      >
                        <option value="ALL">Tất cả các kỳ</option>
                        {availablePeriods.map((p) => (
                          <option key={p} value={p}>
                            Kỳ tháng {p}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleExportCsv}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '9px 16px',
                          borderRadius: 8,
                          background: '#0F172A',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={15} /> Xuất báo cáo đối soát (.CSV)
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <th style={{ padding: '12px 18px' }}>Kỳ</th>
                          <th style={{ padding: '12px 18px' }}>Đối tác Nhà hàng</th>
                          <th style={{ padding: '12px 18px' }}>Số đơn</th>
                          <th style={{ padding: '12px 18px' }}>Doanh thu gộp</th>
                          <th style={{ padding: '12px 18px' }}>Phí sàn ({platformCommissionRate}%)</th>
                          <th style={{ padding: '12px 18px' }}>Phí ship / Hoàn tiền</th>
                          <th style={{ padding: '12px 18px' }}>Thực nhận ròng</th>
                          <th style={{ padding: '12px 18px' }}>Tài khoản thụ hưởng</th>
                          <th style={{ padding: '12px 18px', textAlign: 'right' }}>Quyết toán</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReconciliations.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>{r.period}</td>
                            <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>{r.merchantName}</td>
                            <td style={{ padding: '14px 18px' }}>{r.totalOrders}</td>
                            <td style={{ padding: '14px 18px', fontWeight: 600 }}>{r.grossRevenue.toLocaleString('vi-VN')}đ</td>
                            <td style={{ padding: '14px 18px', color: '#DC2626', fontWeight: 600 }}>
                              -{r.commission15.toLocaleString('vi-VN')}đ
                            </td>
                            <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: '#475569' }}>
                              <div>Ship: {r.shippingFee.toLocaleString('vi-VN')}đ</div>
                              <div style={{ color: r.refundDeducted > 0 ? '#DC2626' : '#64748B' }}>
                                Hoàn: -{r.refundDeducted.toLocaleString('vi-VN')}đ
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px', color: '#00B14F', fontWeight: 800 }}>
                              {r.netPayout85.toLocaleString('vi-VN')}đ
                            </td>
                            <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: '#64748B' }}>{r.bankAccount}</td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              {r.status === 'PAID' ? (
                                <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700 }}>
                                  Đã giải ngân
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleConfirmPayout(r.id)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    background: '#4F46E5',
                                    color: '#FFFFFF',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Xác nhận chi trả
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Platform & Store Event/Holiday Voucher Campaign Manager (U052) */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                        Quản lý Phiếu Giảm Giá Toàn Sàn &amp; Voucher Của Các Quán (U052)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                        Admin có thể phát hành, chỉnh sửa, tạm dừng hoặc gỡ bỏ mọi mã giảm giá Toàn sàn lẫn mã do từng Cửa hàng phát hành.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ padding: '5px 12px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', fontSize: '0.78rem', fontWeight: 800 }}>
                        🌐 Toàn sàn: {vouchers.filter((v) => !v.merchantId || v.merchantId === 'ALL').length} mã
                      </span>
                      <span style={{ padding: '5px 12px', borderRadius: 8, background: '#FEF3C7', color: '#B45309', fontSize: '0.78rem', fontWeight: 800 }}>
                        🏪 Voucher các Quán: {vouchers.filter((v) => v.merchantId && v.merchantId !== 'ALL').length} mã
                      </span>
                    </div>
                  </div>

                  <form
                    onSubmit={handleAddVoucher}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                      gap: 12,
                      padding: 18,
                      background: editingAdminVoucherId ? '#EEF2FF' : '#F8FAFC',
                      borderRadius: 10,
                      border: editingAdminVoucherId ? '1.5px solid #6366F1' : '1px solid #E2E8F0',
                      marginBottom: 20,
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Sự kiện / Ngày lễ
                      </label>
                      <select
                        value={newVoucherEventTheme}
                        onChange={(e) => {
                          const theme = e.target.value as VoucherEventTheme;
                          setNewVoucherEventTheme(theme);
                          const matched = EVENT_THEME_OPTIONS.find((t) => t.value === theme);
                          if (matched) setNewVoucherEventTag(matched.label);
                        }}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem', background: '#FFFFFF' }}
                      >
                        {EVENT_THEME_OPTIONS.map((ev) => (
                          <option key={ev.value} value={ev.value}>
                            {ev.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Nhãn sự kiện hiển thị
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Đại Tiệc Giáng Sinh"
                        value={newVoucherEventTag}
                        onChange={(e) => setNewVoucherEventTag(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Phạm vi / Cửa hàng áp dụng
                      </label>
                      <select
                        value={newVoucherMerchantId}
                        onChange={(e) => setNewVoucherMerchantId(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem', background: '#FFFFFF' }}
                      >
                        <option value="ALL">🌐 Toàn sàn DineGo (Mọi quán)</option>
                        {allMerchants.map((m) => (
                          <option key={m.id} value={m.id}>
                            🏪 {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Mã khuyến mãi
                      </label>
                      <input
                        type="text"
                        placeholder="VD: NOEL50K"
                        value={newVoucherCode}
                        onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Loại giảm giá
                      </label>
                      <select
                        value={newVoucherType}
                        onChange={(e) => {
                          const t = e.target.value as 'FIXED_AMOUNT' | 'PERCENTAGE';
                          setNewVoucherType(t);
                          setNewVoucherDiscount(t === 'PERCENTAGE' ? 20 : 30000);
                        }}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem', background: '#FFFFFF' }}
                      >
                        <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                        <option value="PERCENTAGE">Theo phần trăm (%)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        {newVoucherType === 'PERCENTAGE' ? 'Mức giảm (%)' : 'Mức giảm (VNĐ)'}
                      </label>
                      <input
                        type="number"
                        step={newVoucherType === 'PERCENTAGE' ? 5 : 5000}
                        value={newVoucherDiscount}
                        onChange={(e) => setNewVoucherDiscount(Number(e.target.value))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                      />
                    </div>
                    {newVoucherType === 'PERCENTAGE' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                          Giảm tối đa (VNĐ)
                        </label>
                        <input
                          type="number"
                          step="5000"
                          value={newVoucherMaxDiscount}
                          onChange={(e) => setNewVoucherMaxDiscount(Number(e.target.value))}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                        />
                      </div>
                    )}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Đơn tối thiểu (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="10000"
                        value={newVoucherMinOrder}
                        onChange={(e) => setNewVoucherMinOrder(Number(e.target.value))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Tổng lượt săn / dùng
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={newVoucherMaxUsage}
                        onChange={(e) => setNewVoucherMaxUsage(Number(e.target.value))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Thời hạn hiệu lực
                      </label>
                      <input
                        type="date"
                        value={newVoucherEndDate}
                        onChange={(e) => setNewVoucherEndDate(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer', paddingBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={newVoucherFlashHunt}
                        onChange={(e) => setNewVoucherFlashHunt(e.target.checked)}
                      />
                      Đưa lên mục Săn Voucher
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="submit"
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 6,
                          background: '#4F46E5',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {editingAdminVoucherId ? 'Lưu cập nhật' : '+ Phát hành Voucher'}
                      </button>
                      {editingAdminVoucherId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAdminVoucherId(null);
                            setNewVoucherCode('');
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 6,
                            background: '#FFFFFF',
                            color: '#475569',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            border: '1px solid #CBD5E1',
                            cursor: 'pointer',
                          }}
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Admin Filter Bar for Platform vs Shop Vouchers */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { id: 'ALL' as const, label: `Tất cả (${vouchers.length})` },
                        {
                          id: 'PLATFORM' as const,
                          label: `🌐 Toàn sàn (${vouchers.filter((v) => !v.merchantId || v.merchantId === 'ALL').length})`,
                        },
                        {
                          id: 'MERCHANT' as const,
                          label: `🏪 Voucher của Quán (${vouchers.filter((v) => v.merchantId && v.merchantId !== 'ALL').length})`,
                        },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAdminVoucherScopeFilter(tab.id)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border:
                              adminVoucherScopeFilter === tab.id
                                ? '1px solid #4F46E5'
                                : '1px solid #CBD5E1',
                            background: adminVoucherScopeFilter === tab.id ? '#4F46E5' : '#FFFFFF',
                            color: adminVoucherScopeFilter === tab.id ? '#FFFFFF' : '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        value={adminVoucherMerchantFilter}
                        onChange={(e) => setAdminVoucherMerchantFilter(e.target.value)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="ALL">Lọc theo nhà hàng: Tất cả</option>
                        {allMerchants.map((m) => (
                          <option key={m.id} value={m.id}>
                            🏪 {m.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Tìm mã voucher, tên quán..."
                        value={adminVoucherSearch}
                        onChange={(e) => setAdminVoucherSearch(e.target.value)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.8rem',
                          width: 210,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <th style={{ padding: '12px 14px' }}>Mã Voucher</th>
                          <th style={{ padding: '12px 14px' }}>Sự kiện / Lễ</th>
                          <th style={{ padding: '12px 14px' }}>Phạm vi / Cửa hàng</th>
                          <th style={{ padding: '12px 14px' }}>Mức giảm &amp; Điều kiện</th>
                          <th style={{ padding: '12px 14px' }}>Đã săn / Dùng / Tổng</th>
                          <th style={{ padding: '12px 14px' }}>Hạn dùng</th>
                          <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                          <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vouchers
                          .filter((v) => {
                            if (adminVoucherScopeFilter === 'PLATFORM' && v.merchantId && v.merchantId !== 'ALL') {
                              return false;
                            }
                            if (adminVoucherScopeFilter === 'MERCHANT' && (!v.merchantId || v.merchantId === 'ALL')) {
                              return false;
                            }
                            if (adminVoucherMerchantFilter !== 'ALL' && v.merchantId !== adminVoucherMerchantFilter) {
                              return false;
                            }
                            const q = adminVoucherSearch.trim().toLowerCase();
                            if (
                              q &&
                              !v.code.toLowerCase().includes(q) &&
                              !(v.merchantName || '').toLowerCase().includes(q) &&
                              !(v.title || '').toLowerCase().includes(q)
                            ) {
                              return false;
                            }
                            return true;
                          })
                          .map((v) => {
                            const evStyle = getEventThemeStyle(v.eventTheme);
                            const isShop = Boolean(v.merchantId && v.merchantId !== 'ALL');
                            return (
                              <tr key={v.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '13px 14px', fontWeight: 800, color: '#4F46E5' }}>{v.code}</td>
                                <td style={{ padding: '13px 14px' }}>
                                  <span
                                    style={{
                                      padding: '3px 9px',
                                      borderRadius: 999,
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      background: evStyle.badgeBg,
                                      color: evStyle.badgeColor,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {v.eventTag || evStyle.label}
                                  </span>
                                </td>
                                <td style={{ padding: '13px 14px', fontWeight: 700, color: '#0F172A' }}>
                                  <span
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      background: isShop ? '#FEF3C7' : '#EEF2FF',
                                      color: isShop ? '#B45309' : '#4F46E5',
                                    }}
                                  >
                                    {isShop ? `🏪 ${v.merchantName}` : '🌐 Toàn sàn DineGo'}
                                  </span>
                                </td>
                                <td style={{ padding: '13px 14px', color: '#334155' }}>
                                  <div style={{ fontWeight: 800, color: '#00B14F' }}>
                                    {v.discountType === 'PERCENTAGE'
                                      ? `Giảm ${v.discountValue}%${v.maxDiscountAmount ? ` (Tối đa ${(v.maxDiscountAmount / 1000).toFixed(0)}k)` : ''}`
                                      : `Giảm ${v.discountValue.toLocaleString('vi-VN')}đ`}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{v.title}</div>
                                </td>
                                <td style={{ padding: '13px 14px', fontWeight: 600 }}>
                                  <div>Săn: {v.claimedCount ?? 0} / {v.maxUsage}</div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Đã dùng: {v.usageCount}</div>
                                </td>
                                <td style={{ padding: '13px 14px', color: '#64748B', fontSize: '0.8rem' }}>{v.endDate}</td>
                                <td style={{ padding: '13px 14px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                    <span
                                      style={{
                                        padding: '3px 9px',
                                        borderRadius: 6,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        background: v.isActive ? '#DCFCE7' : '#F1F5F9',
                                        color: v.isActive ? '#15803D' : '#64748B',
                                      }}
                                    >
                                      {v.isActive ? 'Đang kích hoạt' : 'Tạm dừng'}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: v.isFlashHunt !== false ? '#C2410C' : '#94A3B8', fontWeight: 700 }}>
                                      {v.isFlashHunt !== false ? '🔥 Hiện trên Săn Voucher' : 'Ẩn khỏi Săn Voucher'}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditAdminVoucher(v)}
                                      style={{
                                        padding: '5px 10px',
                                        borderRadius: 6,
                                        border: '1px solid #C7D2FE',
                                        background: '#EEF2FF',
                                        color: '#4F46E5',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      onClick={() => toggleVoucherFlashHunt(v.id)}
                                      style={{
                                        padding: '5px 10px',
                                        borderRadius: 6,
                                        border: '1px solid #FED7AA',
                                        background: '#FFF7ED',
                                        color: '#C2410C',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {v.isFlashHunt !== false ? 'Ẩn Săn' : 'Mở Săn'}
                                    </button>
                                    <button
                                      onClick={() => toggleVoucherStatus(v.id)}
                                      style={{
                                        padding: '5px 10px',
                                        borderRadius: 6,
                                        border: '1px solid #CBD5E1',
                                        background: '#FFFFFF',
                                        color: '#334155',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {v.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVoucher(v.id, v.code)}
                                      style={{
                                        padding: '5px 8px',
                                        borderRadius: 6,
                                        border: '1px solid #FECACA',
                                        background: '#FEF2F2',
                                        color: '#DC2626',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title="Xóa mã"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN TAB: AI LOCAL CULINARY KNOWLEDGE BASE (ĐANG BẢO TRÌ) */}
            {currentAdminTab === 'admin-knowledge' && (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '64px 24px',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    color: '#D97706',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <AlertTriangle size={28} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                  Phân hệ Tri thức AI (RAG) đang bảo trì
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: 460, margin: '0 auto' }}>
                  Chức năng quản trị cơ sở tri thức AI hiện đang để trống và tạm ngưng để bảo trì nâng cấp hệ thống.
                </p>
              </div>
            )}

            {/* ADMIN TAB 6: USERS & ROLE MANAGEMENT */}
            {currentAdminTab === 'admin-users' && (
              <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Quản Lý Toàn Bộ Tài Khoản Hệ Thống ({allUsersList.length})
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Can thiệp sâu: Phân quyền vai trò, kiểm tra liên kết phân hệ, khóa hoặc mở khóa tài khoản toàn sàn
                    </p>
                  </div>

                  <div style={{ position: 'relative', width: 280 }}>
                    <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 11, top: 11 }} />
                    <input
                      type="text"
                      placeholder="Tìm theo tên, email, SĐT..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                  {[
                    { key: 'ALL' as const, label: `Tất cả (${allUsersList.length})` },
                    { key: 'CUSTOMER' as const, label: `Khách hàng (${allUsersList.filter((u) => u.roles.includes('CUSTOMER')).length})` },
                    { key: 'MERCHANT' as const, label: `Chủ nhà hàng (${allUsersList.filter((u) => u.roles.includes('MERCHANT')).length})` },
                    { key: 'DRIVER' as const, label: `Tài xế (${allUsersList.filter((u) => u.roles.includes('DRIVER')).length})` },
                    { key: 'ADMIN' as const, label: `Quản trị viên (${allUsersList.filter((u) => u.roles.includes('ADMIN')).length})` },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setUserRoleFilter(f.key)}
                      style={{
                        padding: '7px 16px',
                        borderRadius: 20,
                        background: userRoleFilter === f.key ? '#0F172A' : '#F1F5F9',
                        color: userRoleFilter === f.key ? '#FFFFFF' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <th style={{ padding: '12px 18px' }}>Họ và tên</th>
                        <th style={{ padding: '12px 18px' }}>Email / Tài khoản</th>
                        <th style={{ padding: '12px 18px' }}>Số điện thoại</th>
                        <th style={{ padding: '12px 18px' }}>Vai trò</th>
                        <th style={{ padding: '12px 18px' }}>Liên kết phân hệ</th>
                        <th style={{ padding: '12px 18px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Quyền can thiệp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsersList
                        .filter((u) => {
                          const matchRole = userRoleFilter === 'ALL' || u.roles.includes(userRoleFilter);
                          const matchSearch =
                            !userSearchTerm.trim() ||
                            u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            (u.phoneNumber && u.phoneNumber.includes(userSearchTerm));
                          return matchRole && matchSearch;
                        })
                        .map((u) => {
                          const linkedStore = u.merchantId ? allMerchants.find((m) => m.id === u.merchantId) : null;
                          const linkedDrv = u.driverId ? allDriversList.find((d) => d.id === u.driverId) : null;
                          const isLocked = u.isActive === false;

                          return (
                            <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <img
                                    src={
                                      u.avatarUrl ||
                                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
                                    }
                                    alt={u.fullName}
                                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                  <span>{u.fullName}</span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px', color: '#475569' }}>{u.email}</td>
                              <td style={{ padding: '14px 18px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                                {u.phoneNumber || '—'}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: u.roles.includes('ADMIN')
                                      ? '#EDE9FE'
                                      : u.roles.includes('MERCHANT')
                                      ? '#FEF3C7'
                                      : u.roles.includes('DRIVER')
                                      ? '#E0F2FE'
                                      : '#DCFCE7',
                                    color: u.roles.includes('ADMIN')
                                      ? '#6D28D9'
                                      : u.roles.includes('MERCHANT')
                                      ? '#B45309'
                                      : u.roles.includes('DRIVER')
                                      ? '#0369A1'
                                      : '#15803D',
                                  }}
                                >
                                  {u.roles.join(', ')}
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: '#64748B' }}>
                                {linkedStore && (
                                  <span style={{ color: '#D97706', fontWeight: 600 }}>Quán: {linkedStore.name}</span>
                                )}
                                {linkedDrv && (
                                  <span style={{ color: '#0284C7', fontWeight: 600 }}>Xe: {linkedDrv.licensePlate}</span>
                                )}
                                {!linkedStore && !linkedDrv && 'Khách hàng cá nhân'}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: isLocked ? '#FEE2E2' : '#DCFCE7',
                                    color: isLocked ? '#DC2626' : '#15803D',
                                  }}
                                >
                                  {isLocked ? 'Đang bị khóa' : 'Hoạt động'}
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                {!u.roles.includes('ADMIN') && onToggleUserStatus && (
                                  <button
                                    onClick={() => {
                                      onToggleUserStatus(u.id);
                                      appendAuditLog(
                                        isLocked ? 'MỞ KHÓA TÀI KHOẢN NGƯỜI DÙNG' : 'KHÓA TÀI KHOẢN NGƯỜI DÙNG',
                                        `${u.fullName} (${u.email})`,
                                        isLocked
                                          ? 'Khôi phục quyền đăng nhập vào hệ thống'
                                          : 'Khóa tài khoản và thu hồi phiên đăng nhập theo quyết định quản trị',
                                      );
                                    }}
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: 6,
                                      border: isLocked ? '1px solid #86EFAC' : '1px solid #FECACA',
                                      background: isLocked ? '#F0FDF4' : '#FEF2F2',
                                      color: isLocked ? '#15803D' : '#DC2626',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ADMIN TAB 7: PLATFORM SETTINGS & DEEP INTERVENTION */}
            {currentAdminTab === 'admin-settings' && (
              <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 26, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Bảng Điều Khiển Can Thiệp Sâu Vào Hạ Tầng Hệ Thống Toàn Sàn
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Thiết lập tỷ lệ chiết khấu, phụ phí thời tiết xấu, bán kính thuật toán ghép cuốc GPS và chế độ bảo trì khẩn cấp
                    </p>
                  </div>
                </div>

                {configSavedBanner && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: '12px 18px',
                      borderRadius: 8,
                      background: '#DCFCE7',
                      color: '#166534',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>{configSavedBanner}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 20, background: '#F8FAFC' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A', marginBottom: 14 }}>
                      1. Chính Sách Chiết Khấu & Trợ Giá Sàn
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                          Phí nền tảng thu từ Nhà hàng (%)
                        </label>
                        <input
                          type="number"
                          value={platformCommissionRate}
                          onChange={(e) => setPlatformCommissionRate(Number(e.target.value))}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#FFFFFF' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                          Phụ phí thời tiết xấu / Giờ cao điểm (VNĐ)
                        </label>
                        <input
                          type="number"
                          step="1000"
                          value={peakHourSurgeFee}
                          onChange={(e) => setPeakHourSurgeFee(Number(e.target.value))}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#FFFFFF' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                          Giá trị đơn tối thiểu được trợ giá Miễn phí ship (VNĐ)
                        </label>
                        <input
                          type="number"
                          step="10000"
                          value={minOrderForFreeShipping}
                          onChange={(e) => setMinOrderForFreeShipping(Number(e.target.value))}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#FFFFFF' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 20, background: '#F8FAFC' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A', marginBottom: 14 }}>
                      2. Thuật Toán Điều Phối & An Toàn Toàn Sàn
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          Bán kính tự động ghép tài xế gần nhất (km): <strong style={{ color: '#4F46E5', fontSize: '0.95rem' }}>{autoDispatchRangeKm} km</strong>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={autoDispatchRangeKm}
                          onChange={(e) => setAutoDispatchRangeKm(Number(e.target.value))}
                          style={{ width: '100%', accentColor: '#4F46E5', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>
                          <span>1 km (Nội phường)</span>
                          <span>5 km (Tiêu chuẩn)</span>
                          <span>10 km (Mở rộng)</span>
                        </div>
                      </div>

                      <div style={{ padding: 14, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#991B1B' }}>
                              Chế độ Bảo trì khẩn cấp toàn sàn
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#B91C1C', marginTop: 2 }}>
                              Tạm khóa khách đặt đơn mới khi nâng cấp hệ thống
                            </div>
                          </div>
                          <button
                            onClick={() => setMaintenanceMode(!maintenanceMode)}
                            style={{
                              padding: '7px 16px',
                              borderRadius: 6,
                              background: maintenanceMode ? '#DC2626' : '#94A3B8',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {maintenanceMode ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          void adminApi.updateSystemSettings({
                            platformCommissionRate,
                            peakHourSurgeFee,
                            minOrderForFreeShipping,
                            autoDispatchRangeKm,
                            maintenanceMode,
                            reason: 'Lưu cấu hình can thiệp hệ thống từ bảng điều khiển Admin',
                          });
                          appendAuditLog(
                            'LƯU CẤU HÌNH HỆ THỐNG SÀN',
                            `Hoa hồng ${platformCommissionRate}% • Bán kính ${autoDispatchRangeKm}km`,
                            `Phụ phí ${peakHourSurgeFee.toLocaleString('vi-VN')}đ • Freeship từ ${minOrderForFreeShipping.toLocaleString('vi-VN')}đ • Bảo trì: ${maintenanceMode ? 'BẬT' : 'TẮT'}`,
                          );
                          setConfigSavedBanner('Đã lưu cấu hình can thiệp sâu toàn hệ thống sàn.');
                          setTimeout(() => setConfigSavedBanner(''), 3000);
                        }}
                        style={{
                          marginTop: 'auto',
                          padding: '12px',
                          borderRadius: 8,
                          background: '#4F46E5',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                        }}
                      >
                        Lưu thiết lập can thiệp hệ thống
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lightbox Preview for Driver Evidence Photos */}
        {previewDisputeImg && (
          <div
            onClick={() => setPreviewDisputeImg(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.82)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '88vh',
                background: '#FFFFFF',
                borderRadius: 14,
                padding: 12,
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewDisputeImg(null)}
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
              <img
                src={previewDisputeImg}
                alt="Bằng chứng hiện trường tài xế"
                style={{
                  maxWidth: '84vw',
                  maxHeight: '80vh',
                  borderRadius: 10,
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // SHELL 2: STANDALONE MERCHANT SELLER CENTER (KÊNH NGƯỜI BÁN)
  // ============================================================================
  const activeOrdersCount = orders.filter((o) =>
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status),
  ).length;

  const filteredKitchenOrders = orders.filter((o) => {
    const matchStatus =
      kitchenStatusFilter === 'ALL'
        ? true
        : kitchenStatusFilter === 'COMPLETED'
        ? ['COMPLETED', 'CANCELLED'].includes(o.status)
        : ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERING'].includes(o.status);

    const matchSearch =
      !orderSearch.trim() ||
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.recipientName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.recipientPhone.includes(orderSearch);

    return matchStatus && matchSearch;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Left Seller Sidebar */}
      <aside
        style={{
          width: 264,
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: 40,
        }}
      >
        {/* Seller Brand & Store Switcher */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#D97706',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.9rem',
              }}
            >
              DG
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', letterSpacing: -0.3 }}>
                DineGo Seller
              </div>
              <div style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700 }}>
                TRUNG TÂM ĐỐI TÁC NHÀ HÀNG
              </div>
            </div>
          </div>

          {/* Store Info Banner (1-to-1 Merchant Account) */}
          <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
              Gian hàng độc lập
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A', lineHeight: 1.3 }}>
              {currentMerchant?.name || 'Gian hàng của bạn'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 4 }}>
              Chủ quán: <strong>{currentMerchant?.ownerName || currentUser?.fullName || 'Chưa cập nhật'}</strong>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>
              TK: {currentMerchant?.ownerEmail || currentUser?.email || 'Chưa cập nhật'}
            </div>
          </div>
        </div>

        {/* Seller Navigation Links */}
        <div style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ padding: '0 10px 8px', fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Vận hành gian hàng
          </div>
          {[
            {
              id: 'merchant-orders' as NavTab,
              label: 'Đơn hàng & Bếp trực tiếp',
              icon: <ChefHat size={17} />,
              badge: activeOrdersCount,
            },
            {
              id: 'merchant-menu' as NavTab,
              label: 'Thực đơn & Món ăn',
              icon: <UtensilsCrossed size={17} />,
              badge: merchantDishes.length,
            },
            {
              id: 'merchant-vouchers' as NavTab,
              label: 'Mã Ưu Đãi & Voucher Quán',
              icon: <Ticket size={17} />,
              badge: merchantShopVouchers.filter((v) => v.isActive).length,
            },
            {
              id: 'merchant-catering' as NavTab,
              label: 'Hợp đồng Tiệc & Lịch',
              icon: <Calendar size={17} />,
              badge: feastBookings.filter((b) => b.status === 'PENDING_APPROVAL').length,
            },
            {
              id: 'merchant-analytics' as NavTab,
              label: 'Doanh thu & Đánh giá',
              icon: <BarChart3 size={17} />,
              badge: currentMerchantReviews.length,
            },
            {
              id: 'merchant-kyc' as NavTab,
              label: 'Hồ sơ Pháp lý & Cài đặt',
              icon: <ShieldCheck size={17} />,
            },
          ].map((item) => {
            const isActive = currentMerchantTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: isActive ? '#FFFBEB' : 'transparent',
                  color: isActive ? '#B45309' : '#475569',
                  borderLeft: isActive ? '3px solid #D97706' : '3px solid transparent',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.86rem',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge ? (
                  <span
                    style={{
                      background: isActive ? '#D97706' : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : '#475569',
                      padding: '1px 7px',
                      borderRadius: 10,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Sidebar Bottom Actions */}
        <div
          style={{
            padding: 14,
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: 'auto',
            position: 'sticky',
            bottom: 0,
            background: '#FFFFFF',
            zIndex: 10,
          }}
        >
          {onOpenMerchantRegisterModal && (
            <button
              onClick={onOpenMerchantRegisterModal}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              + Đăng ký mở chi nhánh mới
            </button>
          )}
          <button
            onClick={() => onLogout?.()}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LogOut size={15} /> Đăng xuất Kênh Người Bán
          </button>
        </div>
      </aside>

      {/* Right Main Seller Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Seller Top Operational Bar */}
        <header
          style={{
            height: 64,
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {currentMerchantTab === 'merchant-orders' && 'Điều phối đơn hàng & Bếp trực tiếp'}
              {currentMerchantTab === 'merchant-menu' && 'Quản lý danh mục Thực đơn & Trạng thái món'}
              {currentMerchantTab === 'merchant-vouchers' && 'Quản lý Mã Ưu Đãi & Voucher Độc Quyền Của Quán'}
              {currentMerchantTab === 'merchant-catering' && 'Quản lý Hợp đồng Đặt tiệc & Lịch phục vụ'}
              {currentMerchantTab === 'merchant-analytics' && 'Báo cáo Doanh thu, Đối soát & Đánh giá'}
              {currentMerchantTab === 'merchant-kyc' && 'Hồ sơ Pháp lý Gian hàng & Cài đặt Vận hành'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setStoreOpen(!storeOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 6,
                border: storeOpen ? '1px solid #86EFAC' : '1px solid #FCA5A5',
                background: storeOpen ? '#F0FDF4' : '#FEF2F2',
                color: storeOpen ? '#15803D' : '#DC2626',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: storeOpen ? '#16A34A' : '#DC2626',
                }}
              />
              <span>{storeOpen ? 'Trạng thái: Đang mở cửa nhận đơn' : 'Trạng thái: Tạm đóng cửa'}</span>
            </button>

            <div style={{ height: 18, width: 1, background: '#E2E8F0' }} />

            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
              {currentMerchant?.name || 'Cơm Tấm Sài Gòn 1985'}
            </div>

            <button
              onClick={() => onLogout?.()}
              title="Đăng xuất khỏi Kênh Người Bán"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Seller Content Area */}
        <div style={{ padding: 28, flex: 1, overflowY: 'auto' }}>
          {/* MERCHANT TAB 1: LIVE KITCHEN & ORDERS */}
          {currentMerchantTab === 'merchant-orders' && (
            <div>
              {/* Filter & Search Bar */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { key: 'ACTIVE' as const, label: `Đang xử lý (${activeOrdersCount})` },
                    { key: 'COMPLETED' as const, label: `Đã hoàn tất (${orders.filter((o) => o.status === 'COMPLETED').length})` },
                    { key: 'ALL' as const, label: `Tất cả đơn (${orders.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setKitchenStatusFilter(tab.key)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 6,
                        background: kitchenStatusFilter === tab.key ? '#0F172A' : '#F1F5F9',
                        color: kitchenStatusFilter === tab.key ? '#FFFFFF' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', minWidth: 260 }}>
                  <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 10 }} />
                  <input
                    type="text"
                    placeholder="Tìm theo mã đơn hoặc SĐT khách..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 12px 7px 34px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              {filteredKitchenOrders.length === 0 ? (
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '48px 20px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.96rem', marginBottom: 4 }}>
                    Không có đơn hàng nào trong danh mục này
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.84rem', marginBottom: 14 }}>
                    Chuyển sang bộ lọc "Tất cả đơn" để tra cứu toàn bộ lịch sử đơn hàng của quán.
                  </p>
                  <button
                    onClick={() => setKitchenStatusFilter('ALL')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    Xem tất cả đơn hàng
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {filteredKitchenOrders.map((order) => {
                    const foodNetPayout = Math.round(order.subtotal * 0.85);
                    const commissionFee = Math.round(order.subtotal * 0.15);

                    return (
                      <div
                        key={order.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 10,
                          padding: 20,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: 12,
                            marginBottom: 14,
                            borderBottom: '1px solid #F1F5F9',
                            flexWrap: 'wrap',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                              Mã đơn: #{order.orderNumber}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '3px 10px',
                                borderRadius: 4,
                                fontWeight: 700,
                                background:
                                  order.status === 'PREPARING'
                                    ? '#FEF3C7'
                                    : order.status === 'READY_FOR_PICKUP'
                                    ? order.merchantConfirmedPickup
                                      ? '#DCFCE7'
                                      : '#FEF3C7'
                                    : order.status === 'CANCELLED'
                                    ? '#FEE2E2'
                                    : order.status === 'COMPLETED'
                                    ? '#F1F5F9'
                                    : '#DBEAFE',
                                color:
                                  order.status === 'PREPARING'
                                    ? '#B45309'
                                    : order.status === 'READY_FOR_PICKUP'
                                    ? order.merchantConfirmedPickup
                                      ? '#15803D'
                                      : '#B45309'
                                    : order.status === 'CANCELLED'
                                    ? '#DC2626'
                                    : order.status === 'COMPLETED'
                                    ? '#475569'
                                    : '#1D4ED8',
                              }}
                            >
                              {order.status === 'PENDING' || order.status === 'CONFIRMED'
                                ? 'Chờ bếp xác nhận'
                                : order.status === 'PREPARING'
                                ? 'Bếp đang chế biến'
                                : order.status === 'READY_FOR_PICKUP'
                                ? order.merchantConfirmedPickup
                                  ? 'Đã bàn giao • Chờ Tài xế bấm lấy món'
                                  : 'Món đã xong • Chờ bấm bàn giao Tài xế'
                                : order.status === 'DELIVERING'
                                ? 'Tài xế đang giao'
                                : order.status === 'CANCELLED'
                                ? 'Đã hủy'
                                : 'Đã hoàn tất'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                              Đặt lúc: {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <button
                            onClick={() => setPrintingOrder(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <Printer size={14} /> Xem phiếu bếp
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.3fr 1fr',
                            gap: 20,
                            marginBottom: 16,
                          }}
                        >
                          {/* Left: Items */}
                          <div>
                            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', marginBottom: 8, textTransform: 'uppercase' }}>
                              Chi tiết món cần chuẩn bị
                            </div>
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '6px 0',
                                  borderBottom: '1px dashed #E2E8F0',
                                  fontSize: '0.88rem',
                                }}
                              >
                                <div>
                                  <strong style={{ color: '#0F172A', marginRight: 8 }}>{item.quantity}x</strong>
                                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{item.itemName}</span>
                                  {item.toppings && item.toppings.length > 0 && (
                                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginLeft: 24 }}>
                                      Kèm: {item.toppings.map((t) => t.toppingName).join(', ')}
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                                  {item.subtotal.toLocaleString('vi-VN')}đ
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Right: Customer & Financial Breakdown */}
                          <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.84rem' }}>
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ color: '#64748B' }}>Khách nhận: </span>
                              <strong style={{ color: '#0F172A' }}>{order.recipientName} ({order.recipientPhone})</strong>
                            </div>
                            <div style={{ marginBottom: 10, color: '#475569', fontSize: '0.8rem' }}>
                              Địa chỉ giao: {order.deliveryAddress}
                            </div>
                            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748B' }}>Tổng tiền món:</span>
                              <strong>{order.subtotal.toLocaleString('vi-VN')}đ</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626', marginTop: 2 }}>
                              <span>Chiết khấu sàn (15%):</span>
                              <span>-{commissionFee.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00B14F', fontWeight: 800, marginTop: 4 }}>
                              <span>Doanh thu quán thực nhận:</span>
                              <span>+{foodNetPayout.toLocaleString('vi-VN')}đ</span>
                            </div>
                          </div>
                        </div>

                        {/* Customer Review Linked to This Order (Live Sync) */}
                        {(() => {
                          const orderRev = reviews.find(
                            (r: any) =>
                              (r.orderId && r.orderId === order.id) ||
                              (r.orderRef && r.orderRef === order.orderNumber),
                          );
                          if (!orderRev) return null;
                          return (
                            <div
                              style={{
                                marginBottom: 14,
                                padding: '12px 16px',
                                borderRadius: 10,
                                background: '#FFFBEB',
                                border: '1px solid #FDE68A',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#92400E' }}>
                                    ⭐ Đánh giá từ khách hàng {orderRev.customerName}
                                  </span>
                                  <span style={{ fontSize: '0.76rem', color: '#B45309' }}>• {orderRev.date}</span>
                                </div>
                                <span
                                  style={{
                                    padding: '2px 10px',
                                    borderRadius: 999,
                                    background: '#FEF3C7',
                                    color: '#D97706',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {'★'.repeat(Math.max(1, Math.min(5, Number(orderRev.rating) || 5)))} ({orderRev.rating}.0/5)
                                </span>
                              </div>
                              <div style={{ fontSize: '0.86rem', color: '#1E293B', fontWeight: 600, marginBottom: 8 }}>
                                &ldquo;{orderRev.comment}&rdquo;
                              </div>
                              {orderRev.reply ? (
                                <div
                                  style={{
                                    background: '#FFFFFF',
                                    borderLeft: '3px solid #D97706',
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    fontSize: '0.8rem',
                                    color: '#334155',
                                  }}
                                >
                                  <strong style={{ color: '#B45309' }}>Phản hồi của quán:</strong> {orderRev.reply}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <input
                                    type="text"
                                    placeholder="Nhập phản hồi cảm ơn hoặc giải đáp cho khách hàng..."
                                    value={replyInput[orderRev.id] || ''}
                                    onChange={(e) =>
                                      setReplyInput({ ...replyInput, [orderRev.id]: e.target.value })
                                    }
                                    style={{
                                      flex: 1,
                                      padding: '7px 12px',
                                      borderRadius: 6,
                                      border: '1px solid #FCD34D',
                                      background: '#FFFFFF',
                                      fontSize: '0.82rem',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSendReply(orderRev.id)}
                                    style={{
                                      padding: '7px 14px',
                                      borderRadius: 6,
                                      background: '#D97706',
                                      color: '#FFFFFF',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Gửi phản hồi
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Driver Arrival / Pickup Handover Status Strip */}
                        {order.status !== 'COMPLETED' &&
                          order.status !== 'CANCELLED' &&
                          order.status !== 'DELIVERING' &&
                          (order.assignedDriverName || order.status === 'READY_FOR_PICKUP') && (
                            <div
                              style={{
                                marginBottom: 12,
                                padding: '9px 14px',
                                borderRadius: 8,
                                background: order.driverArrivedAtStore
                                  ? '#ECFDF5'
                                  : order.assignedDriverName
                                  ? '#F0F9FF'
                                  : '#FFFBEB',
                                border: `1px solid ${
                                  order.driverArrivedAtStore
                                    ? '#86EFAC'
                                    : order.assignedDriverName
                                    ? '#BAE6FD'
                                    : '#FDE68A'
                                }`,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: order.driverArrivedAtStore
                                  ? '#065F46'
                                  : order.assignedDriverName
                                  ? '#0369A1'
                                  : '#92400E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 8,
                              }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <Bike size={15} />
                                {order.driverArrivedAtStore
                                  ? `Tài xế ${order.assignedDriverName || 'Shipper'} ĐÃ ĐẾN QUÁN chờ nhận món`
                                  : order.assignedDriverName
                                  ? `Tài xế ${order.assignedDriverName} đã nhận chuyến và đang trên đường tới quán`
                                  : 'Đang chờ tài xế nhận đơn quanh khu vực'}
                              </span>
                              {order.status === 'READY_FOR_PICKUP' && !order.merchantConfirmedPickup && (
                                <span style={{ fontSize: '0.75rem', color: '#B45309' }}>
                                  Bấm &ldquo;Xác nhận bàn giao món&rdquo; để mở khóa nút lấy hàng cho Tài xế
                                </span>
                              )}
                            </div>
                          )}

                        {/* Action Bar */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                          {order.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => onUpdateOrderStatus?.(order.id, 'CANCELLED')}
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: 6,
                                  border: '1px solid #FCA5A5',
                                  background: '#FFFFFF',
                                  color: '#DC2626',
                                  fontSize: '0.84rem',
                                  fontWeight: 600,
                                }}
                              >
                                Từ chối đơn
                              </button>
                              <button
                                onClick={() => onUpdateOrderStatus?.(order.id, 'CONFIRMED')}
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: 6,
                                  border: '1px solid #0284C7',
                                  background: '#E0F2FE',
                                  color: '#0369A1',
                                  fontSize: '0.84rem',
                                  fontWeight: 700,
                                }}
                              >
                                Xác nhận nhận đơn
                              </button>
                              <button
                                onClick={() => onUpdateOrderStatus?.(order.id, 'PREPARING')}
                                style={{
                                  padding: '8px 18px',
                                  borderRadius: 6,
                                  background: '#00B14F',
                                  color: '#FFFFFF',
                                  fontSize: '0.84rem',
                                  fontWeight: 700,
                                }}
                              >
                                Nhận &amp; Chuyển vào bếp
                              </button>
                            </>
                          )}

                          {order.status === 'CONFIRMED' && (
                            <button
                              onClick={() => onUpdateOrderStatus?.(order.id, 'PREPARING')}
                              style={{
                                padding: '8px 18px',
                                borderRadius: 6,
                                background: '#00B14F',
                                color: '#FFFFFF',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                              }}
                            >
                              Bắt đầu làm món (Chuyển vào bếp)
                            </button>
                          )}

                          {order.status === 'PREPARING' && (
                            <button
                              onClick={() => onUpdateOrderStatus?.(order.id, 'READY_FOR_PICKUP')}
                              style={{
                                padding: '8px 18px',
                                borderRadius: 6,
                                background: '#D97706',
                                color: '#FFFFFF',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                              }}
                            >
                              Xác nhận xong món • Chờ bàn giao Tài xế
                            </button>
                          )}

                          {order.status === 'READY_FOR_PICKUP' && !order.merchantConfirmedPickup && (
                            <button
                              type="button"
                              onClick={() => onConfirmMerchantPickup?.(order.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                                padding: '9px 20px',
                                borderRadius: 8,
                                background: '#00B14F',
                                color: '#FFFFFF',
                                fontSize: '0.86rem',
                                fontWeight: 800,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0, 177, 79, 0.25)',
                              }}
                            >
                              <CheckCircle2 size={16} />
                              <span>Xác nhận bàn giao món cho Tài xế</span>
                            </button>
                          )}

                          {order.status === 'READY_FOR_PICKUP' && order.merchantConfirmedPickup && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                                padding: '8px 14px',
                                borderRadius: 8,
                                background: '#DCFCE7',
                                border: '1px solid #86EFAC',
                                color: '#15803D',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 size={15} />
                              <span>
                                Đã xác nhận bàn giao món
                                {order.merchantConfirmedPickupAt
                                  ? ` lúc ${new Date(order.merchantConfirmedPickupAt).toLocaleTimeString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  : ''}{' '}
                                — Đã mở khóa nút lấy món cho Tài xế
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MERCHANT TAB 2: MENU CATALOG MANAGER */}
          {currentMerchantTab === 'merchant-menu' && (
            <div>
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '16px 20px',
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                  <div style={{ position: 'relative', width: 280 }}>
                    <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 10 }} />
                    <input
                      type="text"
                      placeholder="Tìm tên món ăn trong thực đơn..."
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 12px 7px 34px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {['ALL', 'Cơm', 'Phở', 'Canh', 'Đồ Uống'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: selectedCategory === cat ? '#0F172A' : '#F1F5F9',
                          color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        {cat === 'ALL' ? `Tất cả (${merchantDishes.length})` : cat}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleOpenAddDishModal}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 6,
                    background: '#00B14F',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={16} /> Thêm món mới
                </button>
              </div>

              {/* Clean Menu Table */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '12px 18px' }}>Món ăn</th>
                      <th style={{ padding: '12px 18px' }}>Danh mục</th>
                      <th style={{ padding: '12px 18px' }}>Đơn giá niêm yết</th>
                      <th style={{ padding: '12px 18px' }}>Trạng thái phục vụ hôm nay</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merchantDishes
                      .filter((d) => {
                        const matchSearch = d.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
                        const matchCat = selectedCategory === 'ALL' || (d.categoryName || '').includes(selectedCategory);
                        return matchSearch && matchCat;
                      })
                      .map((dish) => (
                        <tr key={dish.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <img
                                src={dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80'}
                                alt={dish.name}
                                style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, color: '#0F172A' }}>{dish.name}</div>
                                <div style={{ fontSize: '0.76rem', color: '#64748B', maxWidth: 320 }}>
                                  {dish.description || 'Chế biến trong ngày theo tiêu chuẩn của quán'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>
                            {dish.categoryName || 'Món Chính'}
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>
                            {dish.basePrice.toLocaleString('vi-VN')}đ
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <button
                              onClick={() => onToggleDishAvailability?.(dish.id)}
                              style={{
                                padding: '4px 12px',
                                borderRadius: 6,
                                border: dish.isAvailable ? '1px solid #86EFAC' : '1px solid #FCA5A5',
                                background: dish.isAvailable ? '#DCFCE7' : '#FEE2E2',
                                color: dish.isAvailable ? '#15803D' : '#DC2626',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                              }}
                            >
                              {dish.isAvailable ? 'Đang mở bán' : 'Tạm ngưng hôm nay'}
                            </button>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                onClick={() => handleOpenEditDishModal(dish)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  color: '#334155',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                }}
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Xác nhận xóa món "${dish.name}" khỏi thực đơn?`)) {
                                    onDeleteDish?.(dish.id);
                                  }
                                }}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #FCA5A5',
                                  background: '#FFFFFF',
                                  color: '#DC2626',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MERCHANT TAB 2.5: SHOP VOUCHERS & PROMOTIONS MANAGEMENT */}
          {currentMerchantTab === 'merchant-vouchers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* KPI Summary Cards for Merchant Vouchers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Tổng Voucher Của Quán
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
                    {merchantShopVouchers.length} mã
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600, marginTop: 4 }}>
                    Áp dụng riêng tại {currentMerchant?.name}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Đang Kích Hoạt
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#15803D', marginTop: 6 }}>
                    {merchantShopVouchers.filter((v) => v.isActive).length} mã
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: 4 }}>
                    Hiển thị trực tiếp trên Gian hàng &amp; Thanh toán
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Lượt Khách Đã Lưu Ví
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#4F46E5', marginTop: 6 }}>
                    {merchantShopVouchers.reduce((sum, v) => sum + Number(v.claimedCount || 0), 0)} lượt
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6366F1', fontWeight: 600, marginTop: 4 }}>
                    Khách săn từ Gian hàng &amp; Săn Voucher
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Lượt Đã Áp Mã Đặt Đơn
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#D97706', marginTop: 6 }}>
                    {merchantShopVouchers.reduce((sum, v) => sum + Number(v.usageCount || 0), 0)} đơn
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: 4 }}>
                    Tăng tỷ lệ chốt đơn tại quán
                  </div>
                </div>
              </div>

              {shopVoucherBanner && (
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: 10,
                    background: '#DCFCE7',
                    border: '1px solid #86EFAC',
                    color: '#166534',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>{shopVoucherBanner}</span>
                </div>
              )}

              {/* Create / Edit Shop Voucher Form Card */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.04rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {editingShopVoucherId
                        ? 'Chỉnh sửa Mã Ưu Đãi Của Quán'
                        : `Phát hành Mã Ưu Đãi Mới Cho Quán "${currentMerchant?.name || 'Của Bạn'}"`}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Mã ưu đãi do quán tạo chỉ áp dụng cho đơn hàng đặt tại <strong>{currentMerchant?.name}</strong> và tự động hiển thị trên trang thực đơn của quán.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const randomSuffix = Math.floor(10 + Math.random() * 89);
                      setShopVoucherCode(`QUAN${randomSuffix}K`);
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: '1px solid #F59E0B',
                      background: '#FFFBEB',
                      color: '#B45309',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✨ Gợi ý mã nhanh
                  </button>
                </div>

                <form
                  onSubmit={handleSaveShopVoucher}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
                    gap: 14,
                    padding: 18,
                    background: editingShopVoucherId ? '#FFFBEB' : '#F8FAFC',
                    borderRadius: 10,
                    border: editingShopVoucherId ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Mã Voucher của Quán *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: COMTAM25K"
                      value={shopVoucherCode}
                      onChange={(e) => setShopVoucherCode(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        color: '#B45309',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Tên chương trình ưu đãi
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Ưu đãi khách quen của quán"
                      value={shopVoucherEventTag}
                      onChange={(e) => setShopVoucherEventTag(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Chủ đề khuyến mãi
                    </label>
                    <select
                      value={shopVoucherEventTheme}
                      onChange={(e) => setShopVoucherEventTheme(e.target.value as VoucherEventTheme)}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    >
                      {EVENT_THEME_OPTIONS.map((ev) => (
                        <option key={ev.value} value={ev.value}>
                          {ev.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Hình thức giảm giá
                    </label>
                    <select
                      value={shopVoucherType}
                      onChange={(e) => {
                        const t = e.target.value as 'FIXED_AMOUNT' | 'PERCENTAGE';
                        setShopVoucherType(t);
                        setShopVoucherDiscount(t === 'PERCENTAGE' ? 15 : 20000);
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="FIXED_AMOUNT">Giảm tiền mặt cố định (VNĐ)</option>
                      <option value="PERCENTAGE">Giảm theo phần trăm (%)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      {shopVoucherType === 'PERCENTAGE' ? 'Mức giảm (%)' : 'Số tiền giảm (VNĐ)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={shopVoucherType === 'PERCENTAGE' ? 5 : 5000}
                      value={shopVoucherDiscount}
                      onChange={(e) => setShopVoucherDiscount(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  {shopVoucherType === 'PERCENTAGE' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Giảm tối đa (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="5000"
                        value={shopVoucherMaxDiscount}
                        onChange={(e) => setShopVoucherMaxDiscount(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.84rem',
                          background: '#FFFFFF',
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Đơn tối thiểu tại quán (VNĐ)
                    </label>
                    <input
                      type="number"
                      step="10000"
                      value={shopVoucherMinOrder}
                      onChange={(e) => setShopVoucherMinOrder(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Số lượng mã phát hành
                    </label>
                    <input
                      type="number"
                      step="20"
                      value={shopVoucherMaxUsage}
                      onChange={(e) => setShopVoucherMaxUsage(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Hạn sử dụng
                    </label>
                    <input
                      type="date"
                      value={shopVoucherEndDate}
                      onChange={(e) => setShopVoucherEndDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer', paddingBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={shopVoucherFlashHunt}
                      onChange={(e) => setShopVoucherFlashHunt(e.target.checked)}
                    />
                    Đưa lên trang Săn Voucher
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        background: '#D97706',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {editingShopVoucherId ? 'Lưu thay đổi' : '+ Tạo Voucher Quán'}
                    </button>
                    {editingShopVoucherId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingShopVoucherId(null);
                          setShopVoucherCode('');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: '#FFFFFF',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: '1px solid #CBD5E1',
                          cursor: 'pointer',
                        }}
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Merchant Vouchers Table */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Danh sách Mã Ưu Đãi Của Quán ({merchantShopVouchers.length})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                      Quản lý trạng thái hoạt động, số lượt sử dụng và chỉnh sửa mức ưu đãi của quán theo thời gian thực
                    </p>
                  </div>
                </div>

                {merchantShopVouchers.length === 0 ? (
                  <div style={{ padding: '44px 24px', textAlign: 'center', color: '#64748B' }}>
                    <Ticket size={36} color="#D97706" style={{ marginBottom: 10, opacity: 0.75 }} />
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A', marginBottom: 4 }}>
                      Quán chưa có mã ưu đãi riêng nào
                    </div>
                    <div style={{ fontSize: '0.84rem' }}>
                      Hãy tạo mã ưu đãi đầu tiên ở biểu mẫu phía trên để thu hút khách hàng đặt món tại quán!
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px 16px' }}>Mã Voucher</th>
                          <th style={{ padding: '12px 16px' }}>Chương trình</th>
                          <th style={{ padding: '12px 16px' }}>Mức giảm &amp; Điều kiện</th>
                          <th style={{ padding: '12px 16px' }}>Lượt lưu / Đã dùng</th>
                          <th style={{ padding: '12px 16px' }}>Hạn dùng</th>
                          <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {merchantShopVouchers.map((v) => {
                          const evStyle = getEventThemeStyle(v.eventTheme);
                          return (
                            <tr key={v.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '14px 16px', fontWeight: 900, color: '#B45309', fontSize: '0.92rem' }}>
                                {v.code}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: 999,
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: evStyle.badgeBg,
                                    color: evStyle.badgeColor,
                                  }}
                                >
                                  {v.eventTag || evStyle.label}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontWeight: 800, color: '#059669' }}>
                                  {v.discountType === 'PERCENTAGE'
                                    ? `Giảm ${v.discountValue}%${v.maxDiscountAmount ? ` (Tối đa ${(v.maxDiscountAmount / 1000).toFixed(0)}k)` : ''}`
                                    : `Giảm ${v.discountValue.toLocaleString('vi-VN')}đ`}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
                                  Đơn tối thiểu {v.minOrder.toLocaleString('vi-VN')}đ
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                                <div>Đã lưu ví: {v.claimedCount ?? 0} / {v.maxUsage}</div>
                                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                                  Đã áp đơn: {v.usageCount} lượt
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', color: '#475569' }}>{v.endDate}</td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                  <span
                                    style={{
                                      padding: '3px 9px',
                                      borderRadius: 6,
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: v.isActive ? '#DCFCE7' : '#F1F5F9',
                                      color: v.isActive ? '#15803D' : '#64748B',
                                    }}
                                  >
                                    {v.isActive ? 'Đang chạy' : 'Tạm ngưng'}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: v.isFlashHunt !== false ? '#D97706' : '#94A3B8', fontWeight: 700 }}>
                                    {v.isFlashHunt !== false ? '🔥 Hiện trên Săn Voucher' : 'Chỉ hiện tại Gian hàng'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditShopVoucher(v)}
                                    style={{
                                      padding: '5px 10px',
                                      borderRadius: 6,
                                      border: '1px solid #FDE68A',
                                      background: '#FFFBEB',
                                      color: '#B45309',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleVoucherFlashHunt(v.id)}
                                    style={{
                                      padding: '5px 10px',
                                      borderRadius: 6,
                                      border: '1px solid #FED7AA',
                                      background: '#FFF7ED',
                                      color: '#C2410C',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {v.isFlashHunt !== false ? 'Ẩn Săn' : 'Mở Săn'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleVoucherStatus(v.id)}
                                    style={{
                                      padding: '5px 10px',
                                      borderRadius: 6,
                                      border: '1px solid #CBD5E1',
                                      background: '#FFFFFF',
                                      color: '#334155',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {v.isActive ? 'Tạm ngưng' : 'Kích hoạt'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVoucher(v.id, v.code)}
                                    style={{
                                      padding: '5px 8px',
                                      borderRadius: 6,
                                      border: '1px solid #FECACA',
                                      background: '#FEF2F2',
                                      color: '#DC2626',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Xóa
                                  </button>
                                </div>
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

          {/* MERCHANT TAB 3: CATERING & FEAST BOOKINGS */}
          {currentMerchantTab === 'merchant-catering' && (() => {
            const visibleFeastBookings =
              isAdminRole || showAllPlatformFeasts
                ? feastBookings
                : feastBookings.filter(
                    (fb) => !fb.merchantId || fb.merchantId === currentMerchant?.id,
                  );
            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Danh sách Hợp đồng Đặt tiệc lưu động ({visibleFeastBookings.length})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                      Kiểm tra biên lai đặt cọc MoMo, nhận hợp đồng và xác nhận hoàn thành bữa tiệc để xuất Bill tổng
                    </p>
                  </div>
                  {!isAdminRole && (
                    <button
                      type="button"
                      onClick={() => setShowAllPlatformFeasts((prev) => !prev)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: showAllPlatformFeasts ? '#EFF6FF' : '#F8FAFC',
                        color: showAllPlatformFeasts ? '#1D4ED8' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      {showAllPlatformFeasts ? 'Chỉ xem đơn của quán này' : 'Xem tất cả đơn tiệc trên sàn'}
                    </button>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '12px 18px' }}>Mã hợp đồng</th>
                        <th style={{ padding: '12px 18px' }}>Gói thực đơn & Số bàn</th>
                        <th style={{ padding: '12px 18px' }}>Khách đặt & Địa điểm</th>
                        <th style={{ padding: '12px 18px' }}>Thời gian</th>
                        <th style={{ padding: '12px 18px' }}>Giá trị & Tiền cọc (30%)</th>
                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Xác nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFeastBookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px 18px', textAlign: 'center', color: '#64748B' }}>
                            Chưa có hợp đồng đặt tiệc nào cho gian hàng này.
                          </td>
                        </tr>
                      ) : (
                      visibleFeastBookings.map((fb) => (
                        <tr key={fb.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>#{fb.bookingCode}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{fb.packageName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Quy mô: {fb.tableCount} bàn</div>
                            {fb.note && (
                              <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: 3 }}>
                                Ghi chú: {fb.note}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{fb.customerName} ({fb.customerPhone})</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{fb.address}</div>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#334155' }}>
                            {fb.eventTime} • {fb.eventDate}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>Tổng: {fb.totalAmount.toLocaleString('vi-VN')}đ</div>
                            <div
                              style={{
                                fontSize: '0.76rem',
                                color: fb.depositPaid ? '#059669' : '#D97706',
                                fontWeight: 700,
                                marginTop: 2,
                              }}
                            >
                              {fb.depositPaid
                                ? `✓ Đã nhận cọc (${fb.depositPercent || 30}%): ${fb.depositAmount.toLocaleString('vi-VN')}đ`
                                : `⏳ Chờ xác nhận cọc (${fb.depositPercent || 30}%): ${fb.depositAmount.toLocaleString('vi-VN')}đ`}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {fb.status === 'PENDING_APPROVAL' && !fb.depositPaid ? (
                              <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const confirmedAt = new Date().toISOString();
                                    setFeastBookings((prev) =>
                                      prev.map((item) =>
                                        item.id === fb.id
                                          ? { ...item, depositPaid: true, depositConfirmedAt: confirmedAt }
                                          : item,
                                      ),
                                    );
                                    onSyncCateringOrderFromMerchant?.(
                                      fb.id,
                                      fb.bookingCode,
                                      'CONFIRM_DEPOSIT',
                                      { confirmedAt },
                                    );
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    background: '#D97706',
                                    color: '#FFFFFF',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  Xác nhận đã nhận tiền cọc
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFeastBookings((prev) =>
                                      prev.map((item) => (item.id === fb.id ? { ...item, status: 'REJECTED' } : item)),
                                    );
                                    onSyncCateringOrderFromMerchant?.(fb.id, fb.bookingCode, 'REJECTED');
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #FCA5A5',
                                    background: '#FFFFFF',
                                    color: '#DC2626',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : fb.status === 'PENDING_APPROVAL' ? (
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  onClick={() => {
                                    setFeastBookings((prev) =>
                                      prev.map((item) => (item.id === fb.id ? { ...item, status: 'APPROVED' } : item)),
                                    );
                                    onSyncCateringOrderFromMerchant?.(fb.id, fb.bookingCode, 'APPROVED');
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    background: '#00B14F',
                                    color: '#FFFFFF',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  Nhận hợp đồng
                                </button>
                                <button
                                  onClick={() => {
                                    setFeastBookings((prev) =>
                                      prev.map((item) => (item.id === fb.id ? { ...item, status: 'REJECTED' } : item)),
                                    );
                                    onSyncCateringOrderFromMerchant?.(fb.id, fb.bookingCode, 'REJECTED');
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid #FCA5A5',
                                    background: '#FFFFFF',
                                    color: '#DC2626',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : fb.status === 'APPROVED' ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                <span
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: '#DCFCE7',
                                    color: '#15803D',
                                  }}
                                >
                                  Đã xác nhận lịch
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCompleteFeastBooking(fb)}
                                  style={{
                                    padding: '7px 12px',
                                    borderRadius: 6,
                                    background: '#00B14F',
                                    color: '#FFFFFF',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <Printer size={13} />
                                  <span>Xác nhận hoàn thành tiệc &amp; Xuất Bill</span>
                                </button>
                              </div>
                            ) : fb.status === 'COMPLETED' ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                <span
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: '#D1FAE5',
                                    color: '#065F46',
                                  }}
                                >
                                  ✓ Đã hoàn thành tiệc
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveFeastBillModal(
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
                                  <Printer size={13} />
                                  <span>Xem / In Bill tổng</span>
                                </button>
                              </div>
                            ) : (
                              <span
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  background: '#FEE2E2',
                                  color: '#DC2626',
                                }}
                              >
                                Đã từ chối
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calendar Date Lock */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 22 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Lịch công suất bếp sự kiện tháng 11/2026
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 16px 0' }}>
                  Nhấn vào ngày bất kỳ để khóa hoặc mở nhận đơn đặt tiệc mới
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                  {['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-28', '2026-11-29'].map((d) => {
                    const isBlocked = blockedDates.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleBlockedDate(d)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: 8,
                          border: `1px solid ${isBlocked ? '#FCA5A5' : '#86EFAC'}`,
                          background: isBlocked ? '#FEF2F2' : '#F0FDF4',
                          color: isBlocked ? '#DC2626' : '#15803D',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>Ngày {d}</div>
                        <div style={{ fontSize: '0.74rem', marginTop: 4, fontWeight: 600 }}>
                          {isBlocked ? 'Đã kín lịch phục vụ' : 'Đang mở nhận tiệc'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            );
          })()}

          {/* MERCHANT TAB 4: REVENUE ANALYTICS & REVIEWS */}
          {currentMerchantTab === 'merchant-analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>DOANH THU GỘP THÁNG 11/2026</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: 6 }}>
                    {merchantRevenue.totalRevenue.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>PHÍ DỊCH VỤ NỀN TẢNG (15%)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', marginTop: 6 }}>
                    -{merchantRevenue.platformCommission.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #86EFAC', borderRadius: 10, padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#15803D', fontWeight: 700 }}>DOANH THU RÒNG THỰC NHẬN (85%)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00B14F', marginTop: 6 }}>
                    {merchantRevenue.netPayout.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>LỆNH RÚT DOANH THU</div>
                  <button
                    disabled={merchantRevenue.netPayout <= 0}
                    onClick={() => setMerchantWithdrawSuccess(true)}
                    style={{
                      marginTop: 8,
                      padding: '9px 14px',
                      borderRadius: 6,
                      background: merchantRevenue.netPayout > 0 ? '#0F172A' : '#E2E8F0',
                      color: merchantRevenue.netPayout > 0 ? '#FFFFFF' : '#94A3B8',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: merchantRevenue.netPayout > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <ArrowUpRight size={15} />{' '}
                    {merchantWithdrawSuccess
                      ? 'Đã gửi yêu cầu rút tiền'
                      : `Rút về ${currentMerchant?.bankName || 'Ngân hàng'}`}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* Top Selling Dishes Table */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Thống kê sản lượng theo món ăn
                    </h3>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: '10px 16px' }}>Mã món</th>
                        <th style={{ padding: '10px 16px' }}>Tên món</th>
                        <th style={{ padding: '10px 16px' }}>Số lượng bán</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right' }}>Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merchantRevenue.topDishes.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '28px 16px', textAlign: 'center', color: '#64748B' }}>
                            Chưa có món ăn nào phát sinh doanh thu hoàn tất.
                          </td>
                        </tr>
                      ) : (
                      merchantRevenue.topDishes.map((dish, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>{dish.sku}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>{dish.name}</td>
                          <td style={{ padding: '12px 16px' }}>{dish.quantity} phần</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#00B14F' }}>
                            {dish.totalSales.toLocaleString('vi-VN')}đ
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Customer Reviews Panel */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Phản hồi đánh giá từ thực khách ({currentMerchantReviews.length})
                    </h3>
                    {currentMerchantReviews.length > 0 && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '3px 10px', borderRadius: 999 }}>
                        TB:{' '}
                        {(
                          currentMerchantReviews.reduce((s, r) => s + (Number(r.rating) || 5), 0) /
                          currentMerchantReviews.length
                        ).toFixed(1)}{' '}
                        ★
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {currentMerchantReviews.length === 0 ? (
                      <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748B', fontSize: '0.86rem' }}>
                        Chưa có đánh giá nào từ thực khách cho quán <strong>{currentMerchant?.name}</strong>.
                      </div>
                    ) : (
                      currentMerchantReviews.map((rev: any) => (
                        <div key={rev.id} style={{ padding: 14, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                            <div>
                              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                                {rev.customerName}{' '}
                                <span style={{ color: '#64748B', fontWeight: 600 }}>(#{rev.orderRef})</span>
                              </span>
                              {rev.date && (
                                <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginLeft: 8 }}>
                                  • {rev.date}
                                </span>
                              )}
                              {rev.itemsSummary && (
                                <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                                  Món đã đặt: {rev.itemsSummary}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                              {'★'.repeat(Math.max(1, Math.min(5, Number(rev.rating) || 5)))} ({rev.rating}.0)
                            </span>
                          </div>
                          <p style={{ fontSize: '0.86rem', color: '#1E293B', margin: '6px 0 10px 0', fontWeight: 500 }}>
                            &ldquo;{rev.comment}&rdquo;
                          </p>
                          {rev.reply ? (
                            <div style={{ background: '#FFFFFF', borderLeft: '3px solid #D97706', padding: '8px 12px', borderRadius: 4, fontSize: '0.8rem', color: '#475569' }}>
                              <strong style={{ color: '#B45309' }}>Phản hồi của quán:</strong> {rev.reply}
                              {rev.repliedAt && (
                                <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginLeft: 6 }}>
                                  ({rev.repliedAt})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <input
                                type="text"
                                placeholder="Nhập nội dung phản hồi thực khách..."
                                value={replyInput[rev.id] || ''}
                                onChange={(e) => setReplyInput({ ...replyInput, [rev.id]: e.target.value })}
                                style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.82rem', background: '#FFFFFF' }}
                              />
                              <button
                                onClick={() => handleSendReply(rev.id)}
                                style={{ padding: '7px 14px', borderRadius: 6, background: '#0F172A', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none' }}
                              >
                                Gửi phản hồi
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MERCHANT TAB 5: STOREFRONT KYC PROFILE & SETTINGS */}
          {currentMerchantTab === 'merchant-kyc' && (
            <form
              onSubmit={handleSaveMerchantKycAndSettings}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {/* Header Banner & Edit/Save Action Bar */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Hồ sơ Pháp lý, Tài khoản Đối soát &amp; Cài đặt Gian hàng
                    </h3>
                    <span
                      style={{
                        background:
                          currentMerchant?.kycStatus === 'REJECTED'
                            ? '#FEE2E2'
                            : currentMerchant?.kycStatus === 'PENDING_APPROVAL'
                            ? '#FEF3C7'
                            : '#DCFCE7',
                        color:
                          currentMerchant?.kycStatus === 'REJECTED'
                            ? '#DC2626'
                            : currentMerchant?.kycStatus === 'PENDING_APPROVAL'
                            ? '#B45309'
                            : '#15803D',
                        padding: '4px 12px',
                        borderRadius: 6,
                        fontSize: '0.76rem',
                        fontWeight: 700,
                      }}
                    >
                      {currentMerchant?.kycStatus === 'REJECTED'
                        ? 'Hồ sơ bị từ chối'
                        : currentMerchant?.kycStatus === 'PENDING_APPROVAL'
                        ? 'Đang chờ thẩm định'
                        : `Đã xác thực KYC${currentMerchant?.verifiedAt ? ` • ${currentMerchant.verifiedAt}` : ''}`}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                    Quản lý và chỉnh sửa toàn bộ thông tin nhà hàng, địa điểm kinh doanh, giấy tờ pháp lý, tài khoản ngân hàng nhận doanh thu và cài đặt vận hành quán.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingMerchantKyc((prev) => !prev)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 16px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      background: isEditingMerchantKyc ? '#F8FAFC' : '#FFFFFF',
                      color: '#334155',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={15} />
                    <span>{isEditingMerchantKyc ? 'Khóa chỉnh sửa (Chỉ xem)' : 'Bật chế độ chỉnh sửa'}</span>
                  </button>

                  <button
                    type="submit"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '9px 20px',
                      borderRadius: 8,
                      background: '#00B14F',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0, 177, 79, 0.25)',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Lưu cập nhật thông tin</span>
                  </button>
                </div>
              </div>

              {merchantKycSavedBanner && (
                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #6EE7B7',
                    color: '#065F46',
                    padding: '12px 18px',
                    borderRadius: 10,
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <CheckCircle2 size={18} color="#059669" />
                  <span>{merchantKycSavedBanner}</span>
                </div>
              )}

              {/* Grid Row 1: Store Identity & Operational Settings + Storefront Image */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 20, alignItems: 'start' }}>
                {/* Section 1: Thông tin Thương hiệu & Cài đặt Vận hành */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
                    <Store size={18} color="#D97706" />
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      1. Thông tin Nhà hàng &amp; Cài đặt Vận hành
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        TÊN NHÀ HÀNG / THƯƠNG HIỆU TRÊN SÀN *
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={!isEditingMerchantKyc}
                        value={kycStoreName}
                        onChange={(e) => setKycStoreName(e.target.value)}
                        placeholder="Nhập tên nhà hàng..."
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontWeight: 700,
                          color: '#0F172A',
                          fontSize: '0.88rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        NGÀNH HÀNG ẨM THỰC CHÍNH
                      </label>
                      <select
                        disabled={!isEditingMerchantKyc}
                        value={kycCategory}
                        onChange={(e) => setKycCategory(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontWeight: 600,
                          color: '#0F172A',
                          fontSize: '0.86rem',
                        }}
                      >
                        <option value="Cơm & Món Việt">Cơm văn phòng / Cơm tấm &amp; Món Việt</option>
                        <option value="Cơm">Cơm tấm &amp; Cơm truyền thống</option>
                        <option value="Phở / Bún">Phở / Bún / Mì truyền thống</option>
                        <option value="Trà sữa">Trà sữa, Cà phê &amp; Đồ uống</option>
                        <option value="Món Nướng">Lẩu &amp; Nướng BBQ</option>
                        <option value="Pizza">Pizza, Mỳ Ý &amp; Đồ ăn nhanh</option>
                        <option value="Mâm Cỗ">Đặt Tiệc &amp; Mâm Cỗ Sự Kiện</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        SỐ ĐIỆN THOẠI HOTLINE QUÁN *
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={!isEditingMerchantKyc}
                        value={kycPhone}
                        onChange={(e) => setKycPhone(e.target.value)}
                        placeholder="0909123456"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.88rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        KHUNG GIỜ MỞ CỬA HOẠT ĐỘNG
                      </label>
                      <input
                        type="text"
                        readOnly={!isEditingMerchantKyc}
                        value={kycOpeningHours}
                        onChange={(e) => setKycOpeningHours(e.target.value)}
                        placeholder="07:00 - 22:00"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.88rem',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                      ĐỊA CHỈ MẶT BẰNG KINH DOANH THỰC TẾ *
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={!isEditingMerchantKyc}
                      value={kycAddress}
                      onChange={(e) => setKycAddress(e.target.value)}
                      placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/TP"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        TG CHUẨN BỊ TỐI THIỂU (PHÚT)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={90}
                        readOnly={!isEditingMerchantKyc}
                        value={kycDeliveryMin}
                        onChange={(e) => setKycDeliveryMin(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.86rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        TG GIAO TỐI ĐA (PHÚT)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={120}
                        readOnly={!isEditingMerchantKyc}
                        value={kycDeliveryMax}
                        onChange={(e) => setKycDeliveryMax(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.86rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        CÀI ĐẶT TRẠNG THÁI MỞ BÁN
                      </label>
                      <button
                        type="button"
                        disabled={!isEditingMerchantKyc}
                        onClick={() => setStoreOpen((prev) => !prev)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: storeOpen ? '1px solid #86EFAC' : '1px solid #FCA5A5',
                          background: storeOpen ? '#F0FDF4' : '#FEF2F2',
                          color: storeOpen ? '#15803D' : '#DC2626',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: isEditingMerchantKyc ? 'pointer' : 'default',
                        }}
                      >
                        {storeOpen ? '● Đang mở cửa nhận đơn' : '○ Đang tạm đóng cửa'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: Hình ảnh Mặt tiền & Bảng hiệu Gian hàng */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
                    <Camera size={18} color="#0284C7" />
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      2. Hình ảnh Mặt tiền &amp; Ảnh đại diện Quán
                    </h4>
                  </div>

                  {kycStoreFrontImage ? (
                    <img
                      src={kycStoreFrontImage}
                      alt="Mặt tiền quán"
                      style={{
                        width: '100%',
                        height: 190,
                        objectFit: 'cover',
                        borderRadius: 10,
                        border: '1px solid #E2E8F0',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: 190,
                        borderRadius: 10,
                        border: '1px dashed #CBD5E1',
                        background: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                      }}
                    >
                      Chưa cập nhật ảnh mặt tiền quán
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                      ĐƯỜNG DẪN ẢNH MẶT TIỀN / ẢNH BÌA GIAN HÀNG (URL)
                    </label>
                    <input
                      type="url"
                      readOnly={!isEditingMerchantKyc}
                      value={kycStoreFrontImage}
                      onChange={(e) => setKycStoreFrontImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>

                  {isEditingMerchantKyc && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                        CHỌN NHANH ẢNH MẪU GIAN HÀNG:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {[
                          {
                            label: 'Quán Cơm & Món Việt',
                            url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
                          },
                          {
                            label: 'Phở & Bún Truyền Thống',
                            url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
                          },
                          {
                            label: 'Tiệm Trà Sữa & Cà Phê',
                            url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&auto=format&fit=crop&q=80',
                          },
                          {
                            label: 'Nhà hàng Âu & Pizza',
                            url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
                          },
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setKycStoreFrontImage(preset.url)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border:
                                kycStoreFrontImage === preset.url
                                  ? '1.5px solid #D97706'
                                  : '1px solid #CBD5E1',
                              background: kycStoreFrontImage === preset.url ? '#FFFBEB' : '#F8FAFC',
                              color: kycStoreFrontImage === preset.url ? '#B45309' : '#475569',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid Row 2: Legal Documents (KYC) + Payout Bank Account */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
                {/* Section 3: Hồ sơ Pháp lý & Định danh Chủ quán */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
                    <ShieldCheck size={18} color="#00B14F" />
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      3. Hồ sơ Pháp lý &amp; Giấy phép Kinh doanh (KYC)
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        NGƯỜI ĐẠI DIỆN PHÁP LÝ / CHỦ QUÁN *
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={!isEditingMerchantKyc}
                        value={kycOwnerName}
                        onChange={(e) => setKycOwnerName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.86rem',
                          fontWeight: 600,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        EMAIL ĐĂNG NHẬP QUẢN TRỊ QUÁN *
                      </label>
                      <input
                        type="email"
                        required
                        readOnly={!isEditingMerchantKyc}
                        value={kycOwnerEmail}
                        onChange={(e) => setKycOwnerEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.86rem',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        SỐ GIẤY PHÉP ĐĂNG KÝ KINH DOANH
                      </label>
                      <input
                        type="text"
                        readOnly={!isEditingMerchantKyc}
                        value={kycBusinessLicense}
                        onChange={(e) => setKycBusinessLicense(e.target.value)}
                        placeholder="VD: GPKD-41A8029144"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.86rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        MÃ SỐ THUẾ HỘ KINH DOANH / DOANH NGHIỆP
                      </label>
                      <input
                        type="text"
                        readOnly={!isEditingMerchantKyc}
                        value={kycTaxCode}
                        onChange={(e) => setKycTaxCode(e.target.value)}
                        placeholder="VD: 0318992819"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.86rem',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                      SỐ CHỨNG NHẬN VỆ SINH AN TOÀN THỰC PHẨM (VSATTP)
                    </label>
                    <input
                      type="text"
                      readOnly={!isEditingMerchantKyc}
                      value={kycFoodSafetyCert}
                      onChange={(e) => setKycFoodSafetyCert(e.target.value)}
                      placeholder="VD: ATTP-HCM-2026-0891"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                        fontSize: '0.86rem',
                      }}
                    />
                  </div>
                </div>

                {/* Section 4: Tài khoản Ngân hàng Nhận Đối Soát Doanh Thu */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
                    <DollarSign size={18} color="#4F46E5" />
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      4. Tài khoản Ngân hàng Nhận Đối Soát &amp; Doanh Thu
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        NGÂN HÀNG THỤ HƯỞNG *
                      </label>
                      <select
                        disabled={!isEditingMerchantKyc}
                        value={kycBankName}
                        onChange={(e) => setKycBankName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.86rem',
                          fontWeight: 600,
                        }}
                      >
                        <option value="Vietcombank">Vietcombank</option>
                        <option value="Techcombank">Techcombank</option>
                        <option value="MB Bank">MB Bank</option>
                        <option value="ACB">ACB</option>
                        <option value="BIDV">BIDV</option>
                        <option value="VietinBank">VietinBank</option>
                        <option value="VPBank">VPBank</option>
                        <option value="TPBank">TPBank</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                        SỐ TÀI KHOẢN NHẬN ĐỐI SOÁT *
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={!isEditingMerchantKyc}
                        value={kycBankAccountNumber}
                        onChange={(e) => setKycBankAccountNumber(e.target.value)}
                        placeholder="0071000889900"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                      TÊN CHỦ TÀI KHOẢN THỤ HƯỞNG (IN HOA KHÔNG DẤU) *
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={!isEditingMerchantKyc}
                      value={kycBankAccountHolder}
                      onChange={(e) => setKycBankAccountHolder(e.target.value.toUpperCase())}
                      placeholder="NGUYEN VAN A"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem',
                      color: '#475569',
                    }}
                  >
                    <span>Biểu phí chiết khấu sàn theo hợp đồng đối tác:</span>
                    <strong style={{ color: '#0F172A', fontSize: '0.9rem' }}>
                      {currentMerchant?.commissionRate ?? platformCommissionRate}% / đơn hoàn tất (Quán nhận {100 - (currentMerchant?.commissionRate ?? platformCommissionRate)}%)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Save Bar */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '16px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                  Mọi thay đổi về tên quán, địa chỉ, khung giờ mở cửa và tài khoản ngân hàng sẽ được áp dụng ngay trên toàn hệ thống DineGo.
                </div>
                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 24px',
                    borderRadius: 8,
                    background: '#00B14F',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 177, 79, 0.28)',
                  }}
                >
                  <CheckCircle2 size={17} />
                  <span>Lưu toàn bộ Hồ sơ &amp; Cài đặt Quán</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal In Phiếu Bếp */}
      {printingOrder && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-box" style={{ maxWidth: 400, padding: 24, borderRadius: 12 }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #CBD5E1', paddingBottom: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
                {currentMerchant?.name || 'GIAN HÀNG DINEGO'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>PHIẾU CHẾ BIẾN BẾP & GIAO HÀNG</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: 6 }}>Mã đơn: #{printingOrder.orderNumber}</div>
            </div>

            <div style={{ fontSize: '0.84rem', marginBottom: 12 }}>
              <div>Khách hàng: <strong>{printingOrder.recipientName}</strong></div>
              <div>SĐT: {printingOrder.recipientPhone}</div>
              <div>Địa chỉ: {printingOrder.deliveryAddress}</div>
            </div>

            <div style={{ borderTop: '1px dashed #CBD5E1', borderBottom: '1px dashed #CBD5E1', padding: '10px 0', marginBottom: 12 }}>
              {printingOrder.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                  <span>{it.quantity}x {it.itemName}</span>
                  <strong>{it.subtotal.toLocaleString('vi-VN')}đ</strong>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem', marginBottom: 18 }}>
              <span>TỔNG CỘNG:</span>
              <span>{printingOrder.finalTotal.toLocaleString('vi-VN')}đ</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, padding: '9px', borderRadius: 6, background: '#0F172A', color: '#FFFFFF', fontWeight: 700, fontSize: '0.84rem' }}
              >
                In phiếu
              </button>
              <button
                onClick={() => setPrintingOrder(null)}
                style={{ flex: 1, padding: '9px', borderRadius: 6, background: '#F1F5F9', color: '#334155', fontWeight: 600, fontSize: '0.84rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dish Modal: Add / Edit Dish */}
      {isDishModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-box" style={{ maxWidth: 500, padding: 24, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                {editingDishId ? 'Cập nhật thông tin món ăn' : 'Thêm món mới vào thực đơn'}
              </h3>
              <button onClick={() => setIsDishModalOpen(false)} style={{ background: 'transparent', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDish} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Tên món ăn *</label>
                <input
                  type="text"
                  required
                  value={formDishName}
                  onChange={(e) => setFormDishName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Giá bán (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    step="1000"
                    value={formDishPrice}
                    onChange={(e) => setFormDishPrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Danh mục</label>
                  <input
                    type="text"
                    value={formDishCategory}
                    onChange={(e) => setFormDishCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Mô tả nguyên liệu</label>
                <textarea
                  rows={2}
                  value={formDishDescription}
                  onChange={(e) => setFormDishDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Đường dẫn ảnh (URL)</label>
                <input
                  type="url"
                  value={formDishImageUrl}
                  onChange={(e) => setFormDishImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsDishModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 6, background: '#F1F5F9', color: '#334155', fontWeight: 600 }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: 6, background: '#00B14F', color: '#FFFFFF', fontWeight: 700 }}
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CateringFinalBillModal
        bill={activeFeastBillModal}
        onClose={() => setActiveFeastBillModal(null)}
      />
    </div>
  );
};
