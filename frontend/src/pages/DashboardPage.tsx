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
  Compass,
  User as UserIcon,
  Upload,
  FileText,
  CreditCard,
} from 'lucide-react';
import type { Role, User, Order, OrderStatus, MenuItem, Merchant, DriverProfile, DeliveryDisputeReport } from '../types';
import { OrderChatModal } from '../components/common/OrderChatModal';
import type { NavTab } from '../components/common/Header';
import { NotificationBell } from '../components/common/NotificationBell';
import { pushActorNotification, pushMultiActorNotifications } from '../utils/notifications';
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
    | 'admin-vouchers'
    | 'admin-knowledge'
    | 'admin-settings' =
    activeTab === 'admin-merchants' ||
    activeTab === 'admin-drivers' ||
    activeTab === 'admin-users' ||
    activeTab === 'admin-complaints' ||
    activeTab === 'admin-reconciliation' ||
    activeTab === 'admin-vouchers' ||
    activeTab === 'admin-knowledge' ||
    activeTab === 'admin-settings'
      ? activeTab
      : 'admin-overview';

  // Admin Focused Sub-Tabs & Filter States (Decluttered UI)
  const [adminOverviewSubTab, setAdminOverviewSubTab] = useState<'ANALYTICS' | 'ORDERS'>('ANALYTICS');
  const [adminOrderStatusFilter, setAdminOrderStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [adminMerchantFilter, setAdminMerchantFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SUSPENDED'>('ALL');
  const [adminMerchantSearch, setAdminMerchantSearch] = useState('');
  const [inspectingMerchantKyc, setInspectingMerchantKyc] = useState<Merchant | null>(null);
  const [adminDriverFilter, setAdminDriverFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [adminDriverSearch, setAdminDriverSearch] = useState('');
  const [adminComplaintSubTab, setAdminComplaintSubTab] = useState<'CUSTOMER_REFUND' | 'DRIVER_DISPUTE'>('CUSTOMER_REFUND');
  const [adminComplaintStatusFilter, setAdminComplaintStatusFilter] = useState<'ALL' | 'OPEN' | 'REFUNDED' | 'REJECTED'>('ALL');
  const [adminComplaintSearch, setAdminComplaintSearch] = useState('');
  const [adminReconciliationSubTab, setAdminReconciliationSubTab] = useState<
    'MONTHLY_LEDGER' | 'MERCHANT_WITHDRAWALS' | 'DRIVER_WITHDRAWALS'
  >('MONTHLY_LEDGER');
  const [adminReconciliationStatusFilter, setAdminReconciliationStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [adminReconciliationSearch, setAdminReconciliationSearch] = useState('');
  const [adminWithdrawalFilter, setAdminWithdrawalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [showAdminVoucherForm, setShowAdminVoucherForm] = useState(false);
  const [adminSettingsSubTab, setAdminSettingsSubTab] = useState<'SYSTEM_CONFIG' | 'AUDIT_LOGS'>('SYSTEM_CONFIG');
  const [adminAuditSearch, setAdminAuditSearch] = useState('');
  const [adminUserStatusFilter, setAdminUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
  const [adminActionToast, setAdminActionToast] = useState<string>('');

  const triggerAdminToast = (msg: string) => {
    setAdminActionToast(msg);
    setTimeout(() => {
      setAdminActionToast((prev) => (prev === msg ? '' : prev));
    }, 3500);
  };

  // Merchant Operational States
  const [storeOpen, setStoreOpen] = useState<boolean>(currentMerchant?.isOpen ?? true);
  const [kitchenStatusFilter, setKitchenStatusFilter] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [orderSearch, setOrderSearch] = useState('');
  const [merchantChatOrder, setMerchantChatOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [merchantWithdrawSuccess, setMerchantWithdrawSuccess] = useState(false);
  const [merchantWithdrawAmountInput, setMerchantWithdrawAmountInput] = useState('');
  const [merchantWithdrawError, setMerchantWithdrawError] = useState('');

  // Merchant KYC & Store Settings Editable States
  const loadStoredOwnerKycMeta = (merchantId?: string) => {
    if (!merchantId) return null;
    try {
      const raw = localStorage.getItem(`dinego_merchant_kyc_meta_${merchantId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const initialKycMeta = loadStoredOwnerKycMeta(currentMerchant?.id);

  const [isEditingMerchantKyc, setIsEditingMerchantKyc] = useState(true);
  const [kycSectionFilter, setKycSectionFilter] = useState<'OWNER_LEGAL' | 'STORE_OPS' | 'BANK_PAYOUT'>('OWNER_LEGAL');
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
  const [kycOwnerAvatar, setKycOwnerAvatar] = useState(
    initialKycMeta?.ownerAvatarUrl ||
      currentMerchant?.ownerAvatarUrl ||
      currentUser?.avatarUrl ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  );
  const [kycOwnerNationalId, setKycOwnerNationalId] = useState(
    initialKycMeta?.ownerNationalId || currentMerchant?.ownerNationalId || '079095008821',
  );
  const [kycOwnerIdIssuedDate, setKycOwnerIdIssuedDate] = useState(
    initialKycMeta?.ownerIdIssuedDate || currentMerchant?.ownerIdIssuedDate || '2022-05-18',
  );
  const [kycOwnerIdIssuedPlace, setKycOwnerIdIssuedPlace] = useState(
    initialKycMeta?.ownerIdIssuedPlace ||
      currentMerchant?.ownerIdIssuedPlace ||
      'Cục Cảnh sát QLHC về TTXH',
  );
  const [kycBusinessType, setKycBusinessType] = useState(
    initialKycMeta?.businessType || currentMerchant?.businessType || 'Hộ Kinh Doanh Cá Thể',
  );
  const [kycFoodSafetyIssuedBy, setKycFoodSafetyIssuedBy] = useState(
    initialKycMeta?.foodSafetyIssuedBy ||
      currentMerchant?.foodSafetyIssuedBy ||
      'Sở An Toàn Thực Phẩm TP. Hồ Chí Minh',
  );
  const [kycFoodSafetyExpiryDate, setKycFoodSafetyExpiryDate] = useState(
    initialKycMeta?.foodSafetyExpiryDate || currentMerchant?.foodSafetyExpiryDate || '2028-12-31',
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

  const handleUploadOwnerAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setKycOwnerAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadStoreFrontFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setKycStoreFrontImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (!currentMerchant) return;
    const meta = loadStoredOwnerKycMeta(currentMerchant.id);
    setStoreOpen(currentMerchant.isOpen ?? true);
    setKycStoreName(currentMerchant.name || '');
    setKycCategory(currentMerchant.categories?.[0] || 'Cơm & Món Việt');
    setKycOwnerName(currentMerchant.ownerName || currentUser?.fullName || '');
    setKycOwnerEmail(currentMerchant.ownerEmail || currentUser?.email || '');
    setKycOwnerAvatar(
      meta?.ownerAvatarUrl ||
        currentMerchant.ownerAvatarUrl ||
        currentUser?.avatarUrl ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    );
    setKycOwnerNationalId(
      meta?.ownerNationalId || currentMerchant.ownerNationalId || '079095008821',
    );
    setKycOwnerIdIssuedDate(
      meta?.ownerIdIssuedDate || currentMerchant.ownerIdIssuedDate || '2022-05-18',
    );
    setKycOwnerIdIssuedPlace(
      meta?.ownerIdIssuedPlace ||
        currentMerchant.ownerIdIssuedPlace ||
        'Cục Cảnh sát QLHC về TTXH',
    );
    setKycBusinessType(
      meta?.businessType || currentMerchant.businessType || 'Hộ Kinh Doanh Cá Thể',
    );
    setKycFoodSafetyIssuedBy(
      meta?.foodSafetyIssuedBy ||
        currentMerchant.foodSafetyIssuedBy ||
        'Sở An Toàn Thực Phẩm TP. Hồ Chí Minh',
    );
    setKycFoodSafetyExpiryDate(
      meta?.foodSafetyExpiryDate || currentMerchant.foodSafetyExpiryDate || '2028-12-31',
    );
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

    const resolvedOwnerAvatar =
      kycOwnerAvatar.trim() ||
      currentMerchant.ownerAvatarUrl ||
      currentUser?.avatarUrl ||
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80';

    const updatedMerchant: Merchant = {
      ...currentMerchant,
      name: kycStoreName.trim() || currentMerchant.name,
      categories: [kycCategory],
      ownerName: kycOwnerName.trim() || currentMerchant.ownerName,
      ownerEmail: kycOwnerEmail.trim() || currentMerchant.ownerEmail,
      ownerAvatarUrl: resolvedOwnerAvatar,
      ownerNationalId: kycOwnerNationalId.trim() || '079095008821',
      ownerIdIssuedDate: kycOwnerIdIssuedDate || '2022-05-18',
      ownerIdIssuedPlace: kycOwnerIdIssuedPlace.trim() || 'Cục Cảnh sát QLHC về TTXH',
      businessType: kycBusinessType,
      foodSafetyIssuedBy: kycFoodSafetyIssuedBy.trim() || 'Sở An Toàn Thực Phẩm TP. Hồ Chí Minh',
      foodSafetyExpiryDate: kycFoodSafetyExpiryDate || '2028-12-31',
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

    try {
      localStorage.setItem(
        `dinego_merchant_kyc_meta_${currentMerchant.id}`,
        JSON.stringify({
          ownerAvatarUrl: resolvedOwnerAvatar,
          ownerNationalId: updatedMerchant.ownerNationalId,
          ownerIdIssuedDate: updatedMerchant.ownerIdIssuedDate,
          ownerIdIssuedPlace: updatedMerchant.ownerIdIssuedPlace,
          businessType: updatedMerchant.businessType,
          foodSafetyIssuedBy: updatedMerchant.foodSafetyIssuedBy,
          foodSafetyExpiryDate: updatedMerchant.foodSafetyExpiryDate,
        }),
      );
    } catch {}

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
          avatarUrl: resolvedOwnerAvatar,
        }
      : undefined;

    onUpdateMerchantProfile?.(updatedMerchant, updatedUser);
    pushMultiActorNotifications([
      {
        targetRole: 'MERCHANT',
        targetMerchantId: updatedMerchant.id,
        category: 'KYC',
        title: `🛡️ Đã cập nhật Hồ sơ pháp lý & Avatar Chủ sở hữu`,
        message: `Chủ quán ${updatedMerchant.ownerName} (CCCD: ${updatedMerchant.ownerNationalId}) • GPKD: ${updatedMerchant.businessLicenseNumber} đã được lưu thành công.`,
        priority: 'normal',
        actionTab: 'merchant-kyc',
        senderLabel: updatedMerchant.name,
      },
      {
        targetRole: 'ADMIN',
        category: 'KYC',
        title: `📋 Quán "${updatedMerchant.name}" vừa cập nhật Hồ sơ Pháp lý & Avatar Chủ quán`,
        message: `Đại diện pháp lý: ${updatedMerchant.ownerName} • CCCD: ${updatedMerchant.ownerNationalId} • GPKD: ${updatedMerchant.businessLicenseNumber}.`,
        priority: 'normal',
        actionTab: 'admin-merchants',
        senderLabel: updatedMerchant.name,
      },
    ]);
    setMerchantKycSavedBanner(
      `Đã lưu cập nhật Hồ sơ pháp lý, Avatar nhận diện chủ sở hữu & Cài đặt gian hàng "${updatedMerchant.name}" thành công lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}!`,
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

  // Merchant Catering Bookings & Calendar State (Loaded directly from SQL Server database — No hardcoded demo contracts)
  const [feastBookings, setFeastBookings] = useState<any[]>([]);
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

    void adminApi.updateDatabaseFeastBookingStatus(fb.id, { status: 'COMPLETED', depositPaid: true });
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

  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  const toggleBlockedDate = (dateStr: string) => {
    setBlockedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr],
    );
  };

  // Admin Complaints State — Loaded directly from SQL Server database (No hardcoded demo complaints)
  const [complaints, setComplaints] = useState<any[]>([]);
  const lastComplaintsJsonRef = React.useRef<string>('[]');

  useEffect(() => {
    try {
      const serialized = JSON.stringify(complaints);
      if (serialized === lastComplaintsJsonRef.current) return;
      lastComplaintsJsonRef.current = serialized;
      localStorage.setItem('dinego_admin_complaints', serialized);
      window.dispatchEvent(new CustomEvent('dinego_complaints_updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('dinego_complaints_sync');
        ch.postMessage(serialized);
        ch.close();
      }
    } catch {}
  }, [complaints]);

  useEffect(() => {
    const refreshComplaints = () => {
      try {
        const saved = localStorage.getItem('dinego_admin_complaints');
        if (!saved || saved === lastComplaintsJsonRef.current) return;
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          lastComplaintsJsonRef.current = saved;
          setComplaints(parsed);
        }
      } catch {}
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dinego_admin_complaints') refreshComplaints();
    };
    window.addEventListener('storage', onStorage);
    const ch =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_complaints_sync') : null;
    if (ch) {
      ch.onmessage = (ev) => {
        if (typeof ev.data === 'string' && ev.data !== lastComplaintsJsonRef.current) {
          try {
            const parsed = JSON.parse(ev.data);
            if (Array.isArray(parsed)) {
              lastComplaintsJsonRef.current = ev.data;
              localStorage.setItem('dinego_admin_complaints', ev.data);
              setComplaints(parsed);
            }
          } catch {}
        } else {
          refreshComplaints();
        }
      };
    }
    return () => {
      window.removeEventListener('storage', onStorage);
      ch?.close();
    };
  }, []);

  const [complaintNoteInputs, setComplaintNoteInputs] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('dinego_complaint_note_drafts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('dinego_complaint_note_drafts', JSON.stringify(complaintNoteInputs));
    } catch {}
  }, [complaintNoteInputs]);

  const handleResolveComplaint = (
    id: string,
    action: 'REFUND_MERCHANT' | 'REFUND_DRIVER' | 'REFUND_PLATFORM' | 'REJECT',
  ) => {
    const target = complaints.find((c) => c.id === id);
    const faultParty: 'MERCHANT' | 'DRIVER' | 'PLATFORM' | undefined =
      action === 'REFUND_MERCHANT'
        ? 'MERCHANT'
        : action === 'REFUND_DRIVER'
        ? 'DRIVER'
        : action === 'REFUND_PLATFORM'
        ? 'PLATFORM'
        : undefined;

    const defaultNote =
      action === 'REFUND_MERCHANT'
        ? 'Lỗi chế biến/thiếu món từ Quán. Duyệt hoàn tiền khách & cấn trừ vào đối soát nhà hàng.'
        : action === 'REFUND_DRIVER'
        ? 'Lỗi vận chuyển/làm đổ vỡ từ Tài xế. Duyệt hoàn tiền khách & khấu trừ trực tiếp vào ví Shipper.'
        : action === 'REFUND_PLATFORM'
        ? 'Sự cố bất khả kháng, sàn bảo trợ hoàn tiền cho khách.'
        : 'Bằng chứng chưa đủ cơ sở bồi hoàn theo quy định sàn.';

    const note = complaintNoteInputs[id]?.trim() || defaultNote;
    const finalCompensationAmount = action !== 'REJECT' ? target?.compensationAmount : 0;

    void adminApi.resolveComplaint(id, {
      decision: action === 'REJECT' ? 'REJECTED' : 'RESOLVED_REFUND',
      resolutionNotes: note,
      compensationAmount: finalCompensationAmount,
      faultParty,
    });
    void adminApi.resolveDatabaseComplaint(id, {
      status: action === 'REJECT' ? 'REJECTED' : 'REFUNDED',
      resolutionNotes: note,
      compensationAmount: finalCompensationAmount,
      faultParty,
    });

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: action === 'REJECT' ? 'REJECTED' : 'REFUNDED',
              faultParty,
              resolutionNotes: note,
            }
          : c,
      ),
    );
    setComplaintNoteInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (target) {
      const logTitle =
        action === 'REFUND_MERCHANT'
          ? 'DUYỆT HOÀN TIỀN - PHẠT TRỪ QUÁN'
          : action === 'REFUND_DRIVER'
          ? 'DUYỆT HOÀN TIỀN - PHẠT TRỪ VÍ TÀI XẾ'
          : action === 'REFUND_PLATFORM'
          ? 'DUYỆT HOÀN TIỀN - SÀN BẢO TRỢ'
          : 'TỪ CHỐI KHIẾU NẠI';

      appendAuditLog(
        logTitle,
        `${target.code} (#${target.orderNumber})`,
        `${note} (Số tiền: ${(target.compensationAmount || 0).toLocaleString('vi-VN')}đ)`,
      );
      triggerAdminToast(
        action === 'REJECT'
          ? `Đã từ chối hồ sơ khiếu nại ${target.code}.`
          : `Đã duyệt hoàn ${(target.compensationAmount || 0).toLocaleString('vi-VN')}đ cho khách ${target.customerName} (${
              faultParty === 'DRIVER'
                ? 'Khấu trừ ví Tài xế'
                : faultParty === 'PLATFORM'
                ? 'Quỹ sàn bảo trợ'
                : 'Khấu trừ đối soát Quán'
            }).`,
      );
    }
  };

  // Real Revenue & System Calculations from actual orders, merchants, complaints & feastBookings
  // Separate food delivery orders from catering orders so catering contracts are never double-counted
  const validOrders = orders.filter((o) => o.status !== 'CANCELLED' && o.orderType !== 'CATERING');
  const completedOrdersList = orders.filter((o) => o.status === 'COMPLETED' && o.orderType !== 'CATERING');
  const commissionRateDecimal = platformCommissionRate / 100;

  // Helper to match a complaint to a specific merchant accurately
  const isComplaintForMerchant = (c: any, m: Merchant) => {
    if (c.merchantId && c.merchantId === m.id) return true;
    const cName = (c.merchantName || '').trim().toLowerCase();
    const mName = (m.name || '').trim().toLowerCase();
    return Boolean(cName && mName && (cName.includes(mName) || mName.includes(cName)));
  };

  // Helper to match a catering feast booking to a specific catering merchant accurately
  const isFeastForMerchant = (fb: any, m: Merchant) => {
    if (!m.isCateringOnly && fb.merchantId === 'merchant-com-tam') return false;
    if (fb.merchantId && fb.merchantId === m.id) return true;
    const fbName = (fb.merchantName || '').trim().toLowerCase();
    const mName = (m.name || '').trim().toLowerCase();
    return Boolean(fbName && mName && (fbName.includes(mName) || mName.includes(fbName)));
  };

  // Approved/Completed Catering Contracts across platform
  const approvedFeasts = feastBookings.filter((fb) =>
    ['APPROVED', 'COMPLETED'].includes(fb.status),
  );

  // Merchant Revenue calculated from real orders + approved catering contracts (scoped to currentMerchant when in Merchant mode)
  const merchantScopedOrders = currentMerchant
    ? validOrders.filter((o) => o.merchant?.id === currentMerchant.id)
    : validOrders;
  const merchantScopedFeasts = currentMerchant
    ? approvedFeasts.filter((fb) => isFeastForMerchant(fb, currentMerchant))
    : approvedFeasts;
  const merchantFoodRevenue = merchantScopedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const merchantCateringRevenue = merchantScopedFeasts.reduce((sum, fb) => sum + (Number(fb.totalAmount) || 0), 0);
  const merchantGrossRevenue = merchantFoodRevenue + merchantCateringRevenue;
  const merchantPlatformCommission = Math.round(merchantGrossRevenue * commissionRateDecimal);
  const merchantComplaintRefunds = complaints
    .filter(
      (c) =>
        c.status === 'REFUNDED' &&
        c.faultParty !== 'DRIVER' &&
        c.faultParty !== 'PLATFORM' &&
        (!currentMerchant || isComplaintForMerchant(c, currentMerchant)),
    )
    .reduce((s, c) => s + (Number(c.compensationAmount) || 0), 0);
  const merchantNetPayout = Math.max(0, merchantGrossRevenue - merchantPlatformCommission - merchantComplaintRefunds);

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

  // Merchant Withdrawals state (cross-actor sync between Merchant Seller Center and Admin)
  const [merchantWithdrawals, setMerchantWithdrawals] = useState<
    Array<{
      id: string;
      merchantId: string;
      merchantName: string;
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
      const saved = localStorage.getItem('dinego_merchant_withdrawals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dinego_merchant_withdrawals', JSON.stringify(merchantWithdrawals));
    } catch {}
  }, [merchantWithdrawals]);

  // Compute exact financial metrics for any merchant (used by both Merchant Seller Center & Admin Reconciliation)
  const computeMerchantFinancials = (m: Merchant, periodFilter: string = 'ALL') => {
    const mOrders = validOrders.filter((o) => {
      const matchMerchant = o.merchant?.id === m.id;
      const matchPeriod =
        periodFilter === 'ALL' || formatOrderPeriod(o.createdAt) === periodFilter;
      return matchMerchant && matchPeriod;
    });
    const mFeasts = approvedFeasts.filter((fb) => {
      const matchMerchant = isFeastForMerchant(fb, m);
      const matchPeriod =
        periodFilter === 'ALL' || formatOrderPeriod(fb.eventDate) === periodFilter;
      return matchMerchant && matchPeriod;
    });
    const foodRevenue = mOrders.reduce((s, o) => s + o.subtotal, 0);
    const feastRevenue = mFeasts.reduce((s, fb) => s + (Number(fb.totalAmount) || 0), 0);
    const grossRevenue = foodRevenue + feastRevenue;
    const commission15 = Math.round(grossRevenue * commissionRateDecimal);
    const shippingFee = mOrders.reduce((s, o) => s + o.deliveryFee, 0);
    const refundDeducted = complaints
      .filter(
        (c) =>
          c.status === 'REFUNDED' &&
          c.faultParty !== 'DRIVER' &&
          c.faultParty !== 'PLATFORM' &&
          isComplaintForMerchant(c, m),
      )
      .reduce((s, c) => s + (Number(c.compensationAmount) || 0), 0);
    const netPayout85 = Math.max(0, grossRevenue - commission15 - refundDeducted);
    const withdrawnApproved = merchantWithdrawals
      .filter((w) => w.merchantId === m.id && w.status === 'APPROVED')
      .reduce((s, w) => s + w.amount, 0);
    const pendingWithdrawal = merchantWithdrawals
      .filter((w) => w.merchantId === m.id && w.status === 'PENDING')
      .reduce((s, w) => s + w.amount, 0);
    const remainingPayout = Math.max(0, netPayout85 - withdrawnApproved);

    return {
      mOrders,
      mFeasts,
      foodRevenue,
      feastRevenue,
      grossRevenue,
      commission15,
      shippingFee,
      refundDeducted,
      netPayout85,
      withdrawnApproved,
      pendingWithdrawal,
      remainingPayout,
    };
  };

  const handleProcessMerchantWithdrawal = (id: string, nextStatus: 'APPROVED' | 'REJECTED') => {
    const target = merchantWithdrawals.find((w) => w.id === id);
    if (!target) return;

    if (nextStatus === 'APPROVED') {
      const merchantObj = allMerchants.find((m) => m.id === target.merchantId);
      if (merchantObj) {
        const fin = computeMerchantFinancials(merchantObj, 'ALL');
        if (target.amount > fin.remainingPayout) {
          triggerAdminToast(
            `Không thể duyệt: Số tiền yêu cầu (${target.amount.toLocaleString('vi-VN')}đ) vượt quá số dư khả dụng của quán (${fin.remainingPayout.toLocaleString('vi-VN')}đ).`,
          );
          return;
        }
      }
    }

    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const note =
      nextStatus === 'APPROVED'
        ? 'Admin đã giải ngân doanh thu ròng về tài khoản ngân hàng nhà hàng'
        : 'Từ chối yêu cầu rút tiền do chưa khớp biên bản đối soát';

    void adminApi.processDatabaseWithdrawal(id, nextStatus, note);
    setMerchantWithdrawals((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, status: nextStatus, processedAt: nowStr, note } : w,
      ),
    );
    appendAuditLog(
      nextStatus === 'APPROVED' ? 'DUYỆT RÚT TIỀN NHÀ HÀNG' : 'TỪ CHỐI RÚT TIỀN NHÀ HÀNG',
      `${target.merchantName} (${target.amount.toLocaleString('vi-VN')}đ)`,
      `${note} • ${target.bankName} (${target.bankAccountNumber})`,
    );
    triggerAdminToast(
      nextStatus === 'APPROVED'
        ? `Đã phê duyệt giải ngân ${target.amount.toLocaleString('vi-VN')}đ cho ${target.merchantName}.`
        : `Đã từ chối yêu cầu rút tiền của ${target.merchantName}.`,
    );
  };

  const currentMerchantId = currentMerchant?.id || 'merchant-com-tam';
  const approvedMerchantWithdrawnTotal = merchantWithdrawals
    .filter((w) => w.merchantId === currentMerchantId && w.status === 'APPROVED')
    .reduce((s, w) => s + w.amount, 0);
  const merchantAvailableBalance = Math.max(0, merchantNetPayout - approvedMerchantWithdrawnTotal);

  const merchantRevenue = {
    merchantName: currentMerchant?.name || 'Cơm Tấm Sài Gòn 1985',
    totalRevenue: merchantGrossRevenue,
    platformCommission: merchantPlatformCommission,
    netPayout: merchantNetPayout,
    availableBalance: merchantAvailableBalance,
    totalWithdrawn: approvedMerchantWithdrawnTotal,
    completedOrders: merchantScopedOrders.filter((o) => o.status === 'COMPLETED').length + merchantScopedFeasts.length,
    cancelledOrders: orders.filter(
      (o) => o.status === 'CANCELLED' && (!currentMerchant || o.merchant?.id === currentMerchant.id),
    ).length,
    averageOrderValue:
      merchantScopedOrders.length + merchantScopedFeasts.length > 0
        ? Math.round(merchantGrossRevenue / (merchantScopedOrders.length + merchantScopedFeasts.length))
        : 0,
    topDishes: Array.from(dishSalesMap.values()).sort((a, b) => b.totalSales - a.totalSales),
  };

  // Admin System Real Overview Calculated from actual orders & feastBookings
  const foodDeliveryGmv = validOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const foodSubtotalSum = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalDeliveryFeeSum = validOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  const cateringFeastGmv = approvedFeasts.reduce((sum, fb) => sum + (Number(fb.totalAmount) || 0), 0);
  const totalGmvReal = foodDeliveryGmv + cateringFeastGmv;
  const merchantCommissionTotalReal = Math.round((foodSubtotalSum + cateringFeastGmv) * commissionRateDecimal);
  const driverShippingCommissionReal = Math.round(totalDeliveryFeeSum * 0.15);
  const platformGrossFeeReal = merchantCommissionTotalReal + driverShippingCommissionReal;
  const platformCoveredRefundsReal = complaints
    .filter((c) => c.status === 'REFUNDED' && c.faultParty === 'PLATFORM')
    .reduce((s, c) => s + (Number(c.compensationAmount) || 0), 0);
  const platformDriverDisputeCompensationsReal = deliveryDisputes
    .filter((d) => d.status === 'COMPENSATED_DRIVER')
    .reduce((s, d) => s + (Number(d.compensationAmount) || 15000), 0);
  const platformRevenueReal = Math.max(
    0,
    platformGrossFeeReal - platformCoveredRefundsReal - platformDriverDisputeCompensationsReal,
  );

  const adminSystem = {
    totalGmv: totalGmvReal,
    platformRevenue: platformRevenueReal,
    platformGrossFee: platformGrossFeeReal,
    merchantCommissionTotal: merchantCommissionTotalReal,
    driverShippingCommission: driverShippingCommissionReal,
    platformOutflow: platformCoveredRefundsReal + platformDriverDisputeCompensationsReal,
    totalOrders: orders.length,
    completedOrders: completedOrdersList.length,
    totalMerchants: allMerchants.length,
    activeDrivers: allDriversList.length,
    totalUsers: allUsersList.length,
  };

  // Real Top Merchants Ranking calculated from actual orders + catering feasts
  const topMerchantsReal = allMerchants
    .map((m) => {
      const mOrders = validOrders.filter((o) => o.merchant?.id === m.id);
      const mFeasts = approvedFeasts.filter((fb) => isFeastForMerchant(fb, m));
      const gmv =
        mOrders.reduce((s, o) => s + o.finalTotal, 0) +
        mFeasts.reduce((s, fb) => s + (Number(fb.totalAmount) || 0), 0);
      const subtotal =
        mOrders.reduce((s, o) => s + o.subtotal, 0) +
        mFeasts.reduce((s, fb) => s + (Number(fb.totalAmount) || 0), 0);
      const platformFee = Math.round(subtotal * commissionRateDecimal);
      return {
        id: m.id,
        name: m.name,
        ordersCount: mOrders.length + mFeasts.length,
        gmv,
        platformFee,
        rating: m.rating || 5.0,
      };
    })
    .sort((a, b) => b.gmv - a.gmv);

  // Real 7-Day GMV Chart calculated from actual order createdAt dates & approved catering eventDates
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
      const dayOrderGmv = validOrders
        .filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === dateKey)
        .reduce((s, o) => s + o.finalTotal, 0);
      const dayFeastGmv = approvedFeasts
        .filter((fb) => String(fb.eventDate || '').slice(0, 10) === dateKey)
        .reduce((s, fb) => s + (Number(fb.totalAmount) || 0), 0);
      buckets.push({ label, dateKey, gmv: dayOrderGmv + dayFeastGmv });
    }
    const maxGmv = Math.max(...buckets.map((b) => b.gmv), 1);
    return buckets.map((b) => ({
      ...b,
      pct: b.gmv > 0 ? Math.max(Math.round((b.gmv / maxGmv) * 100), 12) : 6,
    }));
  })();

  // Admin Audit Logs State — Persisted in localStorage & synced with Backend
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

  const driversList = allDriversList.map((drv, idx) => {
    const completedTripsList = completedOrdersList.filter(
      (o) => o.assignedDriverId === drv.id || o.assignedDriverName === drv.fullName,
    );
    const tripShippingSum = completedTripsList.reduce((s, o) => s + (o.deliveryFee || 15000), 0);
    const compensatedDisputesTotal = deliveryDisputes
      .filter((d) => d.driverId === drv.id && d.status === 'COMPENSATED_DRIVER')
      .reduce((s, d) => s + (Number(d.compensationAmount) || 15000), 0);
    const baseSeedGrossShipping = Math.max(0, (drv.walletBalance || 0) - compensatedDisputesTotal);
    const grossShippingEarned = tripShippingSum + baseSeedGrossShipping;
    const netShippingIncome85 = Math.round(grossShippingEarned * 0.85) + compensatedDisputesTotal;
    const penaltiesTotal = complaints
      .filter(
        (c) =>
          c.status === 'REFUNDED' &&
          c.faultParty === 'DRIVER' &&
          ((c.driverId && c.driverId === drv.id) ||
            (c.driverName &&
              c.driverName.trim().toLowerCase() === drv.fullName.trim().toLowerCase()) ||
            completedTripsList.some((o) => o.orderNumber === c.orderNumber)),
      )
      .reduce((s, c) => s + (Number(c.compensationAmount) || 0), 0);
    const withdrawnApproved = driverWithdrawals
      .filter((w) => w.driverId === drv.id && w.status === 'APPROVED')
      .reduce((s, w) => s + w.amount, 0);
    const pendingWithdrawal = driverWithdrawals
      .filter((w) => w.driverId === drv.id && w.status === 'PENDING')
      .reduce((s, w) => s + w.amount, 0);
    const availableWalletBalance = Math.max(
      0,
      netShippingIncome85 - penaltiesTotal - withdrawnApproved,
    );

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
      bankName: drv.bankName || 'Vietcombank',
      bankAccountNumber: drv.bankAccountNumber || '—',
      completedTrips: (drv.completedTrips || 0) + completedTripsList.length,
      rating: drv.rating || 5.0,
      status: effectiveStatus,
      grossShippingEarned,
      netShippingIncome85,
      compensatedDisputesTotal,
      penaltiesTotal,
      withdrawnApproved,
      pendingWithdrawal,
      availableWalletBalance,
    };
  });

  const handleProcessDriverWithdrawal = (id: string, nextStatus: 'APPROVED' | 'REJECTED') => {
    const target = driverWithdrawals.find((w) => w.id === id);
    if (!target) return;

    if (nextStatus === 'APPROVED') {
      const matchedDrv = driversList.find((d) => d.id === target.driverId);
      if (matchedDrv && target.amount > matchedDrv.availableWalletBalance) {
        triggerAdminToast(
          `Không thể duyệt: Số tiền yêu cầu (${target.amount.toLocaleString('vi-VN')}đ) vượt quá số dư ví khả dụng của tài xế (${matchedDrv.availableWalletBalance.toLocaleString('vi-VN')}đ).`,
        );
        return;
      }
    }

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

    void adminApi.processDatabaseWithdrawal(id, nextStatus, note);
    setDriverWithdrawals((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, status: nextStatus, processedAt: nowStr, note } : w,
      ),
    );
    appendAuditLog(
      nextStatus === 'APPROVED' ? 'DUYỆT RÚT TIỀN TÀI XẾ' : 'TỪ CHỐI RÚT TIỀN TÀI XẾ',
      `${target.driverName} (${target.amount.toLocaleString('vi-VN')}đ)`,
      `${note} • ${target.bankName} (${target.bankAccountNumber})`,
    );
    triggerAdminToast(
      nextStatus === 'APPROVED'
        ? `Đã giải ngân ${target.amount.toLocaleString('vi-VN')}đ về ngân hàng cho tài xế ${target.driverName}.`
        : `Đã từ chối yêu cầu rút tiền của tài xế ${target.driverName}.`,
    );
  };

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
    triggerAdminToast(
      nextStatus === 'SUSPENDED'
        ? `Đã đình chỉ nhận chuyến đối với tài xế ${target.fullName}.`
        : `Đã mở khóa quyền nhận chuyến cho tài xế ${target.fullName}.`,
    );
  };

  // Merchant Moderation State for Admin (PENDING / APPROVED / REJECTED / SUSPENDED)
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
  const [savedMerchantNotes, setSavedMerchantNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('dinego_admin_merchant_notes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('dinego_admin_kyc_statuses', JSON.stringify(merchantKycStatuses));
    } catch {}
  }, [merchantKycStatuses]);

  useEffect(() => {
    try {
      localStorage.setItem('dinego_admin_merchant_notes', JSON.stringify(savedMerchantNotes));
    } catch {}
  }, [savedMerchantNotes]);

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
    const customInput = merchantModerationReasons[m.id]?.trim();
    const reason =
      customInput ||
      (nextStatus === 'APPROVED'
        ? 'Đạt thẩm định pháp lý & VSATTP'
        : nextStatus === 'REJECTED'
        ? 'Hồ sơ GPKD/VSATTP chưa hợp lệ'
        : 'Tạm khóa do vi phạm vận hành');
    setMerchantKycStatuses((prev) => ({ ...prev, [m.id]: nextStatus }));
    setSavedMerchantNotes((prev) => ({ ...prev, [m.id]: reason }));
    if (customInput) {
      setMerchantModerationReasons((prev) => ({ ...prev, [m.id]: '' }));
    }
    onAdminUpdateMerchantStatus?.(m.id, nextStatus, reason);
    appendAuditLog(`CẬP NHẬT TRẠNG THÁI QUÁN → ${nextStatus}`, m.name, reason);
    triggerAdminToast(
      nextStatus === 'APPROVED'
        ? `Đã phê duyệt & kích hoạt gian hàng "${m.name}".`
        : nextStatus === 'REJECTED'
        ? `Đã từ chối hồ sơ pháp lý của "${m.name}".`
        : `Đã tạm khóa vận hành gian hàng "${m.name}".`,
    );
  };

  // Admin Monthly Reconciliation Calculated Dynamically from Real Orders, Catering Contracts & Withdrawals
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
      ...approvedFeasts.map((fb) => formatOrderPeriod(fb.eventDate)),
      formatOrderPeriod(new Date().toISOString()),
    ]),
  );

  const reconciliationList = allMerchants.map((m, idx) => {
    const fin = computeMerchantFinancials(m, reconciliationPeriodFilter);
    const periodLabel =
      reconciliationPeriodFilter === 'ALL'
        ? fin.mOrders.length > 0
          ? formatOrderPeriod(fin.mOrders[0].createdAt)
          : fin.mFeasts.length > 0
          ? formatOrderPeriod(fin.mFeasts[0].eventDate)
          : availablePeriods[0] || '11/2026'
        : reconciliationPeriodFilter;
    const recId = `rec-${m.id}-${periodLabel}`;
    const isFullyPaid =
      fin.netPayout85 > 0 && (Boolean(paidReconciliationMap[recId]) || fin.remainingPayout === 0);
    const effectiveRemaining = isFullyPaid ? 0 : fin.remainingPayout;
    const effectiveWithdrawn = isFullyPaid ? fin.netPayout85 : fin.withdrawnApproved;

    const cleanBankName = (m.bankName || 'Vietcombank').replace(/\s*-\s*CN.*$/i, '').trim();
    const cleanBankAcc = m.bankAccountNumber || `007100${String(idx + 1).padStart(7, '0')}`;

    return {
      id: recId,
      merchantId: m.id,
      period: periodLabel,
      merchantName: m.name,
      totalOrders: fin.mOrders.length + fin.mFeasts.length,
      foodOrdersCount: fin.mOrders.length,
      feastContractsCount: fin.mFeasts.length,
      grossRevenue: fin.grossRevenue,
      commission15: fin.commission15,
      shippingFee: fin.shippingFee,
      refundDeducted: fin.refundDeducted,
      netPayout85: fin.netPayout85,
      withdrawnApproved: effectiveWithdrawn,
      pendingWithdrawal: fin.pendingWithdrawal,
      remainingPayout: effectiveRemaining,
      bankName: cleanBankName,
      bankAccountNumber: cleanBankAcc,
      bankAccountHolder: m.bankAccountHolder || (m.ownerName || 'CHU HO KINH DOANH').toUpperCase(),
      bankAccount: `${cleanBankName} • ${cleanBankAcc}`,
      status: (fin.netPayout85 === 0
        ? 'NO_BALANCE'
        : isFullyPaid
        ? 'PAID'
        : 'PENDING') as 'PAID' | 'PENDING' | 'NO_BALANCE',
    };
  });

  const filteredReconciliations = reconciliationList;

  const handleConfirmPayout = (recId: string) => {
    const target = reconciliationList.find((r) => r.id === recId);
    if (!target || target.remainingPayout <= 0) return;

    void adminApi.confirmReconciliationPayout(recId);
    setPaidReconciliationMap((prev) => ({ ...prev, [recId]: true }));

    // Synchronize with merchantWithdrawals so Merchant Seller Center balance becomes 0đ (Zero Double-Payout)
    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    setMerchantWithdrawals((prev) => {
      const pendingForMerchant = prev
        .filter((w) => w.merchantId === target.merchantId && w.status === 'PENDING')
        .reduce((s, w) => s + w.amount, 0);
      const updatedExisting = prev.map((w) =>
        w.merchantId === target.merchantId && w.status === 'PENDING'
          ? {
              ...w,
              status: 'APPROVED' as const,
              processedAt: nowStr,
              note: `Tất toán trong kỳ đối soát ${target.period}`,
            }
          : w,
      );
      const extraRemainder = Math.max(0, target.remainingPayout - pendingForMerchant);
      if (extraRemainder > 0) {
        return [
          {
            id: `mwd-settle-${Date.now()}`,
            merchantId: target.merchantId,
            merchantName: target.merchantName,
            bankName: target.bankName,
            bankAccountNumber: target.bankAccountNumber,
            bankAccountHolder: target.bankAccountHolder,
            amount: extraRemainder,
            status: 'APPROVED' as const,
            note: `Quyết toán công nợ cuối kỳ ${target.period} từ Admin`,
            createdAt: nowStr,
            processedAt: nowStr,
          },
          ...updatedExisting,
        ];
      }
      return updatedExisting;
    });

    appendAuditLog(
      'XÁC NHẬN GIẢI NGÂN ĐỐI SOÁT',
      `${target.merchantName} (Kỳ ${target.period})`,
      `Đã tất toán ${target.remainingPayout.toLocaleString('vi-VN')}đ (Tổng ròng: ${target.netPayout85.toLocaleString('vi-VN')}đ) về ${target.bankAccount}`,
    );
    triggerAdminToast(
      `Đã tất toán ${target.remainingPayout.toLocaleString('vi-VN')}đ cho "${target.merchantName}" và đồng bộ số dư ví nhà hàng.`,
    );
  };

  const handleExportCsv = () => {
    const headers = [
      'Ky Doi Soat,Nha Hang,So Don,Doanh Thu Gop,Phi Nen Tang,Phi Ship Thu Ho,Khau Tru Hoan Tien,Tong Thuc Nhan Rong,Da Giai Ngan,Con Phai Chi Tra,Trang Thai',
    ];
    const rows = filteredReconciliations.map(
      (r) =>
        `${r.period},"${r.merchantName}",${r.totalOrders},${r.grossRevenue},${r.commission15},${r.shippingFee},${r.refundDeducted},${r.netPayout85},${r.withdrawnApproved},${r.remainingPayout},${r.status}`,
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DineGo_DoiSoat_Ky_${reconciliationPeriodFilter.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAdminToast('Đã xuất tệp báo cáo đối soát công nợ (.CSV) thành công.');
  };

  const handleExportPdf = () => {
    const printWin = window.open('', '_blank', 'width=1024,height=760');
    if (!printWin) {
      triggerAdminToast('Trình duyệt đang chặn cửa sổ bật lên (Pop-up). Vui lòng cho phép Pop-up để xuất PDF.');
      return;
    }
    const rowsHtml = filteredReconciliations
      .map(
        (r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><strong>${r.merchantName}</strong><div style="font-size:11px;color:#64748b;">${r.bankAccount || '—'}</div></td>
            <td style="text-align:center;">${r.period}</td>
            <td style="text-align:right;">${r.totalOrders}</td>
            <td style="text-align:right;">${r.grossRevenue.toLocaleString('vi-VN')}đ</td>
            <td style="text-align:right;color:#dc2626;">-${r.commission15.toLocaleString('vi-VN')}đ</td>
            <td style="text-align:right;color:#dc2626;">-${r.refundDeducted.toLocaleString('vi-VN')}đ</td>
            <td style="text-align:right;font-weight:700;">${r.netPayout85.toLocaleString('vi-VN')}đ</td>
            <td style="text-align:right;font-weight:700;color:#059669;">${r.remainingPayout.toLocaleString('vi-VN')}đ</td>
            <td style="text-align:center;">${r.status === 'PAID' ? 'Đã giải ngân' : r.status === 'PENDING' ? 'Chờ chi trả' : 'Hết dư'}</td>
          </tr>
        `,
      )
      .join('');
    const totalGross = filteredReconciliations.reduce((s, r) => s + r.grossRevenue, 0);
    const totalComm = filteredReconciliations.reduce((s, r) => s + r.commission15, 0);
    const totalRemain = filteredReconciliations.reduce((s, r) => s + r.remainingPayout, 0);

    printWin.document.write(`
      <!doctype html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Báo Cáo Đối Soát Công Nợ DineGo - Kỳ ${reconciliationPeriodFilter}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; color: #0f172a; }
          h1 { font-size: 20px; margin: 0 0 4px 0; color: #0f172a; }
          .sub { font-size: 13px; color: #475569; margin-bottom: 18px; }
          .kpi-row { display: flex; gap: 16px; margin-bottom: 18px; }
          .kpi { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; background: #f8fafc; }
          .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-val { font-size: 16px; font-weight: 800; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          th { background: #0f172a; color: #ffffff; text-align: left; font-size: 11px; text-transform: uppercase; }
          .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 12px; color: #475569; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <h1>BÁO CÁO ĐỐI SOÁT CÔNG NỢ &amp; GIẢI NGÂN ĐỐI TÁC DINEGO</h1>
        <div class="sub">Kỳ đối soát: <strong>${reconciliationPeriodFilter}</strong> • Ngày xuất: ${new Date().toLocaleString('vi-VN')} • Áp dụng hoa hồng chuẩn BR-42 (${platformCommissionRate}% đơn thường / 8% mâm cỗ)</div>
        <div class="kpi-row">
          <div class="kpi"><div class="kpi-label">Tổng Doanh Thu Gộp</div><div class="kpi-val">${totalGross.toLocaleString('vi-VN')}đ</div></div>
          <div class="kpi"><div class="kpi-label">Tổng Phí Hoa Hồng Sàn</div><div class="kpi-val" style="color:#4f46e5;">${totalComm.toLocaleString('vi-VN')}đ</div></div>
          <div class="kpi"><div class="kpi-label">Tổng Còn Phải Chi Trả</div><div class="kpi-val" style="color:#059669;">${totalRemain.toLocaleString('vi-VN')}đ</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>STT</th><th>Nhà hàng &amp; STK</th><th>Kỳ</th><th>Số đơn</th><th>Doanh thu gộp</th><th>Phí sàn</th><th>Hoàn tiền</th><th>Thực nhận ròng</th><th>Còn phải trả</th><th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="footer">
          <div>Người lập biểu<br/><em>(Ký &amp; ghi rõ họ tên)</em></div>
          <div>Kế toán trưởng / Admin Sàn DineGo<br/><em>(Xác nhận đối soát)</em></div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 300);
    triggerAdminToast('Đã mở bản in Báo cáo Đối soát (.PDF) chuẩn UTF-8.');
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
      triggerAdminToast(`Đã lưu cập nhật mã khuyến mãi "${code}" thành công.`);
      setEditingAdminVoucherId(null);
      setShowAdminVoucherForm(false);
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
    pushActorNotification({
      targetRole: 'CUSTOMER',
      category: 'VOUCHER',
      title: `🎟️ Voucher mới: ${code} — ${merchantName}`,
      message: `${title}. Săn mã ngay tại mục Săn Voucher!`,
      priority: 'high',
      actionTab: 'vouchers',
      senderLabel: 'Ban Quản Trị DineGo',
    });
    triggerAdminToast(`Đã phát hành mã voucher "${code}" (${merchantName}) thành công.`);
    setNewVoucherCode('');
    setShowAdminVoucherForm(false);
  };

  const handleStartEditAdminVoucher = (v: ManagedVoucher) => {
    setEditingAdminVoucherId(v.id);
    setShowAdminVoucherForm(true);
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
    pushMultiActorNotifications([
      {
        targetRole: 'CUSTOMER',
        category: 'VOUCHER',
        title: `🎟️ Quán "${merchantName}" vừa tung mã ưu đãi: ${code}`,
        message: `${title}. Vào gian hàng lưu mã và đặt món ngay!`,
        priority: 'high',
        actionTab: 'vouchers',
        senderLabel: merchantName,
      },
      {
        targetRole: 'ADMIN',
        category: 'VOUCHER',
        title: `🏷️ Quán "${merchantName}" vừa phát hành Voucher: ${code}`,
        message: `${title} • Tối đa ${created.maxUsage} lượt sử dụng.`,
        priority: 'normal',
        actionTab: 'admin-reconciliation',
        senderLabel: merchantName,
      },
    ]);
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
    const target = vouchers.find((v) => v.id === vId);
    setVouchers((prev) => prev.map((v) => (v.id === vId ? { ...v, isActive: !v.isActive } : v)));
    if (target) {
      triggerAdminToast(
        target.isActive
          ? `Đã tạm dừng mã khuyến mãi "${target.code}".`
          : `Đã kích hoạt lại mã khuyến mãi "${target.code}".`,
      );
    }
  };

  const toggleVoucherFlashHunt = (vId: string) => {
    const target = vouchers.find((v) => v.id === vId);
    setVouchers((prev) =>
      prev.map((v) => (v.id === vId ? { ...v, isFlashHunt: v.isFlashHunt === false } : v)),
    );
    if (target) {
      triggerAdminToast(
        target.isFlashHunt !== false
          ? `Đã ẩn mã "${target.code}" khỏi trang Săn Voucher.`
          : `Đã hiển thị mã "${target.code}" lên trang Săn Voucher.`,
      );
    }
  };

  const [voucherToDelete, setVoucherToDelete] = useState<{ id: string; code: string } | null>(null);

  const handleDeleteVoucher = (vId: string, code: string) => {
    setVoucherToDelete({ id: vId, code });
  };

  const confirmDeleteVoucher = () => {
    if (!voucherToDelete) return;
    const { id, code } = voucherToDelete;
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    appendAuditLog('XÓA VOUCHER SỰ KIỆN', code, 'Đã gỡ bỏ mã khỏi danh sách khuyến mãi');
    triggerAdminToast(`Đã xóa mã khuyến mãi "${code}" khỏi hệ thống.`);
    setVoucherToDelete(null);
  };

  const deleteVoucherModalJsx = voucherToDelete ? (
    <div
      onClick={() => setVoucherToDelete(null)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: 420,
          padding: 24,
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.22)',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0F172A' }}>
              Xác nhận xóa mã khuyến mãi
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              Thao tác này sẽ đồng bộ xóa cả trên SQL Server
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.5, margin: '0 0 18px 0' }}>
          Bạn có chắc chắn muốn xóa mã{' '}
          <strong style={{ color: '#DC2626', background: '#FEF2F2', padding: '2px 8px', borderRadius: 6, border: '1px solid #FECACA' }}>
            {voucherToDelete.code}
          </strong>{' '}
          khỏi hệ thống? Khách hàng sẽ không thể săn hoặc áp dụng mã này ở bước Thanh toán nữa.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={() => setVoucherToDelete(null)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '0.83rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={confirmDeleteVoucher}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '0.83rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Merchant Reviews & Replies State (Loaded directly from SQL Server database — No hardcoded demo reviews)
  const loadStoredReviews = () => {
    try {
      const saved = localStorage.getItem('dinego_merchant_reviews');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  };

  const [reviews, setReviews] = useState<any[]>([]);

  // AI Knowledge Base (RAG) State — Loaded from SQL Server knowledge_base_vectors
  const [knowledgeChunks, setKnowledgeChunks] = useState<
    Array<{ id: string; source: string; content: string; authorName: string; createdAt: string }>
  >([]);
  const [kbSourceInput, setKbSourceInput] = useState('');
  const [kbContentInput, setKbContentInput] = useState('');
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [kbSaving, setKbSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void adminApi.getKnowledgeChunks().then((rows) => {
      if (active && Array.isArray(rows)) setKnowledgeChunks(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleAddKnowledgeChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbContentInput.trim() || kbSaving) return;
    setKbSaving(true);
    const created = await adminApi.createKnowledgeChunk({
      source: kbSourceInput.trim() || 'Cẩm nang ẩm thực DineGo',
      content: kbContentInput.trim(),
    });
    setKbSaving(false);
    if (created) {
      setKnowledgeChunks((prev) => [created, ...prev]);
      setKbSourceInput('');
      setKbContentInput('');
      appendAuditLog('THÊM TRI THỨC AI (RAG)', created.source, created.content.slice(0, 80));
      triggerAdminToast('Đã thêm đoạn tri thức mới vào cơ sở dữ liệu AI (SQL Server).');
    }
  };

  const handleDeleteKnowledgeChunk = async (chunkId: string) => {
    await adminApi.deleteKnowledgeChunk(chunkId);
    setKnowledgeChunks((prev) => prev.filter((k) => k.id !== chunkId));
    appendAuditLog('XÓA TRI THỨC AI (RAG)', chunkId, 'Gỡ bỏ đoạn tri thức khỏi knowledge_base_vectors');
    triggerAdminToast('Đã xóa đoạn tri thức khỏi cơ sở dữ liệu AI.');
  };

  // Load real feastBookings, complaints, and reviews directly from SQL Server database on mount
  useEffect(() => {
    let active = true;
    const loadFromSqlServer = async () => {
      const ledger = await adminApi.getDatabaseLedger();
      if (!active || !ledger) return;
      if (Array.isArray(ledger.feastBookings)) {
        setFeastBookings(ledger.feastBookings);
        localStorage.setItem('dinego_feast_bookings', JSON.stringify(ledger.feastBookings));
      }
      if (Array.isArray(ledger.complaints)) {
        setComplaints(ledger.complaints);
        localStorage.setItem('dinego_admin_complaints', JSON.stringify(ledger.complaints));
        window.dispatchEvent(new CustomEvent('dinego_complaints_updated'));
      }
      if (Array.isArray(ledger.reviews)) {
        setReviews(ledger.reviews);
        localStorage.setItem('dinego_merchant_reviews', JSON.stringify(ledger.reviews));
        window.dispatchEvent(new CustomEvent('dinego_reviews_updated'));
      }
      if (Array.isArray(ledger.merchantWithdrawals) && ledger.merchantWithdrawals.length > 0) {
        setMerchantWithdrawals(ledger.merchantWithdrawals);
      }
      if (Array.isArray(ledger.driverWithdrawals) && ledger.driverWithdrawals.length > 0) {
        setDriverWithdrawals(ledger.driverWithdrawals);
      }
    };
    void loadFromSqlServer();
    return () => {
      active = false;
    };
  }, []);

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
    const targetReview = baseList.find((r: any) => r.id === reviewId);
    setReviews(nextReviews);
    setReplyInput({ ...replyInput, [reviewId]: '' });
    pushActorNotification({
      targetRole: 'CUSTOMER',
      targetUserId: targetReview?.customerId || undefined,
      category: 'REVIEW',
      title: `💬 Quán "${currentMerchant?.name || 'Nhà hàng'}" vừa phản hồi đánh giá của bạn`,
      message: `Đơn #${targetReview?.orderRef || ''}: "${text.trim()}"`,
      priority: 'high',
      actionTab: 'orders',
      orderRef: targetReview?.orderRef,
      senderLabel: currentMerchant?.name || 'Chủ quán',
    });
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
      <div style={{ display: 'flex', height: '100vh', width: '100%', maxWidth: '100vw', overflow: 'hidden', background: '#F8FAFC' }}>
        {/* Left Enterprise Fixed Sidebar */}
        <aside
          style={{
            width: 264,
            background: '#0B1120',
            color: '#E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            height: '100vh',
            overflowY: 'auto',
            zIndex: 40,
          }}
        >
          {/* Sidebar Brand Header — Cohesive DineGo Brand & Modern Logo */}
          <div
            style={{
              padding: '20px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'linear-gradient(180deg, #0F172A 0%, #0B1120 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.98rem',
                  letterSpacing: -0.5,
                  boxShadow: '0 4px 14px rgba(0, 177, 79, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  flexShrink: 0,
                }}
              >
                DG
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 1.15 }}>
                  Dine<span style={{ color: '#00B14F' }}>Go</span>{' '}
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: 'rgba(0, 177, 79, 0.15)',
                      color: '#34D399',
                      border: '1px solid rgba(0, 177, 79, 0.3)',
                      padding: '2px 7px',
                      borderRadius: 6,
                      verticalAlign: 'middle',
                      marginLeft: 4,
                      letterSpacing: 0.2,
                    }}
                  >
                    Admin
                  </span>
                </div>
                <div style={{ fontSize: '0.66rem', color: '#94A3B8', fontWeight: 700, letterSpacing: 0.8, marginTop: 4, textTransform: 'uppercase' }}>
                  Hệ thống Quản trị Sàn
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Menu — Grouped into 3 Clear Operational Domains */}
          <div style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                sectionTitle: 'Giám Sát & Đối Tác',
                items: [
                  { id: 'admin-overview' as NavTab, label: 'Tổng quan & Đơn hàng', icon: <BarChart3 size={17} /> },
                  {
                    id: 'admin-merchants' as NavTab,
                    label: 'Đối tác Quán & KYC',
                    icon: <Store size={17} />,
                    badge: allMerchants.filter((m) => getEffectiveMerchantKycStatus(m) === 'PENDING').length || undefined,
                  },
                  { id: 'admin-drivers' as NavTab, label: 'Đội ngũ Tài xế', icon: <Bike size={17} /> },
                  { id: 'admin-users' as NavTab, label: 'Tài khoản & Phân quyền', icon: <UsersIcon size={17} /> },
                ],
              },
              {
                sectionTitle: 'Tài Chính & Thương Mại',
                items: [
                  {
                    id: 'admin-reconciliation' as NavTab,
                    label: 'Đối soát & Giải ngân',
                    icon: <FileSpreadsheet size={17} />,
                    badge:
                      merchantWithdrawals.filter((w) => w.status === 'PENDING').length +
                        driverWithdrawals.filter((w) => w.status === 'PENDING').length || undefined,
                  },
                  {
                    id: 'admin-vouchers' as NavTab,
                    label: 'Khuyến mãi & Voucher',
                    icon: <Ticket size={17} />,
                    badge: vouchers.filter((v) => v.isActive).length || undefined,
                    badgeMuted: true,
                  },
                  {
                    id: 'admin-complaints' as NavTab,
                    label: 'Khiếu nại & Tranh chấp',
                    icon: <MessageSquare size={17} />,
                    badge:
                      complaints.filter((c) => c.status === 'OPEN').length +
                        deliveryDisputes.filter((d) => d.status === 'PENDING_REVIEW').length || undefined,
                  },
                ],
              },
              {
                sectionTitle: 'Hệ Thống & Hạ Tầng',
                items: [
                  { id: 'admin-settings' as NavTab, label: 'Cấu hình & Nhật ký sàn', icon: <Sliders size={17} /> },
                  {
                    id: 'admin-knowledge' as NavTab,
                    label: 'Tri thức AI (RAG)',
                    icon: <UtensilsCrossed size={17} />,
                    badge: 'Bảo trì',
                    badgeMuted: true,
                  },
                ],
              },
            ].map((group) => (
              <div key={group.sectionTitle} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div
                  style={{
                    padding: '0 10px 4px',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: 0.9,
                  }}
                >
                  {group.sectionTitle}
                </div>
                {group.items.map((item) => {
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
                        padding: '9px 12px',
                        borderRadius: 8,
                        background: isActive
                          ? 'linear-gradient(90deg, rgba(0, 177, 79, 0.16) 0%, rgba(0, 177, 79, 0.04) 100%)'
                          : 'transparent',
                        color: isActive ? '#FFFFFF' : '#94A3B8',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.84rem',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        border: 'none',
                        borderLeft: isActive ? '3px solid #00B14F' : '3px solid transparent',
                        cursor: 'pointer',
                        boxShadow: isActive ? 'inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
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
                        <span style={{ color: isActive ? '#00B14F' : 'inherit', display: 'flex' }}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      {item.badge ? (
                        <span
                          style={{
                            background: isActive
                              ? '#00B14F'
                              : 'badgeMuted' in item && item.badgeMuted
                              ? '#1E293B'
                              : '#EF4444',
                            color: isActive
                              ? '#FFFFFF'
                              : 'badgeMuted' in item && item.badgeMuted
                              ? '#94A3B8'
                              : '#FFFFFF',
                            padding: '1px 7px',
                            borderRadius: 10,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            border: 'badgeMuted' in item && item.badgeMuted ? '1px solid #334155' : 'none',
                          }}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sticky Sidebar Footer — Always Visible Session & Logout */}
          <div
            style={{
              padding: 14,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#0B1120',
              position: 'sticky',
              bottom: 0,
              marginTop: 'auto',
              zIndex: 10,
            }}
          >
            <div style={{ marginBottom: 10, padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Phiên quản trị viên</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  color: '#34D399',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 6px #10B981',
                  }}
                />
                ONLINE
              </span>
            </div>
            <button
              onClick={() => onNavigate?.('home')}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                background: 'rgba(0, 177, 79, 0.12)',
                border: '1px solid rgba(0, 177, 79, 0.3)',
                color: '#34D399',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                marginBottom: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#00B14F';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 177, 79, 0.12)';
                e.currentTarget.style.color = '#34D399';
              }}
            >
              <Compass size={15} /> Xem Website Khách hàng
            </button>
            <button
              onClick={() => onLogout?.()}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.22)',
                color: '#FCA5A5',
                fontSize: '0.82rem',
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
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.color = '#FCA5A5';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.22)';
              }}
            >
              <LogOut size={15} /> Đăng xuất Quản trị sàn
            </button>
          </div>
        </aside>

        {/* Floating Slide-In Toast Notification from Right (Never Reflows Page Layout) */}
        {adminActionToast && (
          <div
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              zIndex: 99999,
              maxWidth: 440,
              minWidth: 320,
              padding: '13px 18px',
              borderRadius: 12,
              background: '#0B1120',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderLeft: '4px solid #10B981',
              color: '#F8FAFC',
              fontSize: '0.84rem',
              fontWeight: 600,
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45), 0 0 16px rgba(16, 185, 129, 0.15)',
              animation: 'adminToastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <style>
              {`
                @keyframes adminToastSlideIn {
                  0% { transform: translateX(120%); opacity: 0; }
                  100% { transform: translateX(0); opacity: 1; }
                }
              `}
            </style>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={16} color="#34D399" />
              </span>
              <span style={{ wordBreak: 'break-word' }}>{adminActionToast}</span>
            </span>
            <button
              type="button"
              onClick={() => setAdminActionToast('')}
              title="Đóng thông báo"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.color = '#94A3B8';
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Right Main Workspace */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Top Operational Header (Always Sticky with Direct Logout) */}
          <header
            style={{
              height: 64,
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
              gap: 16,
              position: 'sticky',
              top: 0,
              zIndex: 30,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            {/* Left: Admin Badge + Title + System Status on 1 single row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flexShrink: 1 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                }}
              >
                <ShieldCheck size={18} />
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
                {currentAdminTab === 'admin-overview' && 'Tổng quan vận hành & Giám sát giao dịch toàn sàn'}
                {currentAdminTab === 'admin-merchants' && 'Quản lý Đối tác Nhà hàng & Hồ sơ Pháp lý'}
                {currentAdminTab === 'admin-drivers' && 'Quản lý Đội ngũ Tài xế Giao hàng (DineGo Express)'}
                {currentAdminTab === 'admin-users' && 'Quản lý Danh sách Người dùng & Can thiệp Phân quyền'}
                {currentAdminTab === 'admin-complaints' && 'Trung tâm Phân xử Khiếu nại, Tranh chấp & Hoàn tiền'}
                {currentAdminTab === 'admin-reconciliation' && 'Đối soát Công nợ Định kỳ & Phê duyệt Giải ngân Đối tác'}
                {currentAdminTab === 'admin-vouchers' && 'Quản lý Chiến dịch Khuyến mãi & Kho Voucher Toàn sàn'}
                {currentAdminTab === 'admin-knowledge' && 'Quản trị Cơ sở Tri thức Ẩm thực Địa phương'}
                {currentAdminTab === 'admin-settings' && 'Cấu Hình Tham Số Sàn & Nhật Ký Kiểm Toán Quản Trị'}
              </h1>
              <div
                style={{
                  background: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 6px #10B981',
                  }}
                />
                <span>Hệ thống: Đang kết nối</span>
              </div>
            </div>

            {/* Right: Notification Center & Admin Profile Chip & Top-Right Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
              <NotificationBell
                actorRole="ADMIN"
                userId={currentUser?.id}
                actorDisplayName={currentUser?.fullName || 'Ban Quản Trị Hệ Thống'}
                onNavigate={onNavigate}
                variant="light"
              />

              {/* Admin Profile Card Chip */}
              <div
                onClick={() => onNavigate?.('admin-settings')}
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
                title="Tài khoản quản trị — Bấm để mở Cài đặt Sàn"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    flexShrink: 0,
                  }}
                >
                  AD
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser?.fullName || 'Ban Quản Trị'}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: '#4F46E5', fontWeight: 600 }}>
                    DineGo Administrator
                  </div>
                </div>
              </div>

              {/* Subtle Divider */}
              <div style={{ height: 20, width: 1, background: '#E2E8F0', flexShrink: 0 }} />

              {/* Nút Đăng xuất ở góc phải trên cùng */}
              {onLogout && (
                <button
                  onClick={() => onLogout()}
                  title="Đăng xuất khỏi hệ thống quản trị"
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

          {/* Content Body (Clean Flow Without Vertical Shifting) */}
          <div style={{ padding: '22px 24px', flex: 1, minWidth: 0 }}>

            {/* ADMIN TAB 1: OVERVIEW */}
            {currentAdminTab === 'admin-overview' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 16,
                    marginBottom: 20,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                      TỔNG GIÁ TRỊ GIAO DỊCH (GMV)
                    </div>
                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A' }}>
                      {adminSystem.totalGmv.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 6 }}>
                      Từ {validOrders.length} đơn đồ ăn &amp; {approvedFeasts.length} hợp đồng tiệc
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                      LỢI NHUẬN RÒNG PHÍ SÀN ({platformCommissionRate}%)
                    </div>
                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#15803D' }}>
                      {adminSystem.platformRevenue.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 6 }}>
                      Thu gộp {adminSystem.platformGrossFee.toLocaleString('vi-VN')}đ • Bảo trợ sàn {adminSystem.platformOutflow.toLocaleString('vi-VN')}đ
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                      TỔNG ĐƠN &amp; HỢP ĐỒNG TIỆC
                    </div>
                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A' }}>
                      {adminSystem.totalOrders} đơn • {feastBookings.length} tiệc
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: 6, fontWeight: 600 }}>
                      Hoàn tất: {adminSystem.completedOrders} đơn giao • {approvedFeasts.length} tiệc đã duyệt
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                      HỆ SINH THÁI ĐỐI TÁC
                    </div>
                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A' }}>
                      {allMerchants.length} quán • {driversList.length} tài xế
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 6 }}>
                      {driversList.filter((d) => d.status === 'ACTIVE').length} tài xế hoạt động • {allUsersList.filter((u) => !u.roles.includes('ADMIN')).length} tài khoản
                    </div>
                  </div>
                </div>

                {/* Unified Control Bar for Overview */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '14px 20px',
                    marginBottom: 18,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Phân tích Vận hành &amp; Sổ cái Giao dịch
                    </h3>
                    <p style={{ fontSize: '0.77rem', color: '#64748B', margin: '2px 0 0 0' }}>
                      Theo dõi tỷ trọng dòng tiền giữa Đặt đồ ăn giao ngay và Hợp đồng đặt tiệc sự kiện
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#F1F5F9',
                      padding: 3,
                      borderRadius: 8,
                      gap: 2,
                    }}
                  >
                    {[
                      { id: 'ANALYTICS' as const, label: 'Biểu đồ GMV & Top Đối tác' },
                      { id: 'ORDERS' as const, label: `Sổ cái đơn hàng (${orders.length})` },
                    ].map((tab) => {
                      const active = adminOverviewSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAdminOverviewSubTab(tab.id)}
                          style={{
                            padding: '5px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: active ? '#FFFFFF' : 'transparent',
                            color: active ? '#0F172A' : '#64748B',
                            fontWeight: active ? 600 : 500,
                            fontSize: '0.78rem',
                            boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* U044: Biểu đồ tỷ trọng đơn theo luồng & Top Nhà hàng Doanh thu cao nhất */}
                {adminOverviewSubTab === 'ANALYTICS' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                      gap: 18,
                    }}
                  >
                    {/* Phân bổ GMV & Đơn hàng theo Luồng Nghiệp vụ */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minWidth: 0 }}>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                        Phân bổ GMV &amp; Số lượng đơn theo Luồng Nghiệp vụ
                      </h3>
                      <p style={{ fontSize: '0.77rem', color: '#64748B', margin: '0 0 18px 0' }}>
                        Dữ liệu thực tế từ cơ sở dữ liệu SQL Server: Luồng 1 (Đặt đồ ăn) và Luồng 2 (Đặt mâm cỗ sự kiện)
                      </p>

                      {(() => {
                        const totalBoth = Math.max(foodDeliveryGmv + cateringFeastGmv, 1);
                        const foodPct = totalGmvReal > 0 ? Math.round((foodDeliveryGmv / totalBoth) * 1000) / 10 : 0;
                        const feastPct = totalGmvReal > 0 ? Math.round((cateringFeastGmv / totalBoth) * 1000) / 10 : 0;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: '0.81rem', fontWeight: 700, marginBottom: 6 }}>
                                <span style={{ color: '#0F172A' }}>Luồng 1: Đặt đồ ăn giao ngay &amp; Group Order</span>
                                <span style={{ color: '#4F46E5' }}>
                                  {foodDeliveryGmv.toLocaleString('vi-VN')} đ ({foodPct}% • {validOrders.length} đơn)
                                </span>
                              </div>
                              <div style={{ height: 10, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: `${foodPct}%`, height: '100%', background: '#4F46E5', borderRadius: 999 }} />
                              </div>
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: '0.81rem', fontWeight: 700, marginBottom: 6 }}>
                                <span style={{ color: '#0F172A' }}>Luồng 2: Đặt mâm cỗ sự kiện &amp; Cọc 2 đợt</span>
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
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 10 }}>
                                BIỂU ĐỒ GMV THỰC TẾ 7 NGÀY GẦN NHẤT (VNĐ)
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 86, minWidth: 0 }}>
                                {sevenDayGmvChart.map((b) => (
                                  <div key={b.dateKey} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4F46E5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                      {b.gmv >= 1000000
                                        ? `${(b.gmv / 1000000).toFixed(1)}M`
                                        : b.gmv > 0
                                        ? `${Math.round(b.gmv / 1000)}k`
                                        : '0đ'}
                                    </span>
                                    <div
                                      style={{
                                        width: '100%',
                                        height: `${Math.round(b.pct * 0.52)}px`,
                                        background: b.gmv > 0 ? 'linear-gradient(180deg, #4F46E5 0%, #818CF8 100%)' : '#E2E8F0',
                                        borderRadius: '4px 4px 0 0',
                                      }}
                                    />
                                    <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>{b.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bảng Xếp hạng Top Nhà hàng Doanh thu cao nhất (Tính thực từ orders) */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, minWidth: 0 }}>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                        Top Đối tác Nhà hàng Doanh thu cao nhất (Top 6)
                      </h3>
                      <p style={{ fontSize: '0.77rem', color: '#64748B', margin: '0 0 14px 0' }}>
                        Tổng hợp trực tiếp từ các đơn hàng &amp; hợp đồng tiệc trong cơ sở dữ liệu
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {topMerchantsReal.slice(0, 6).map((tm, idx) => (
                          <div
                            key={tm.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              padding: '9px 12px',
                              borderRadius: 8,
                              background: idx === 0 ? '#EEF2FF' : '#F8FAFC',
                              border: idx === 0 ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                              minWidth: 0,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
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
                                  fontSize: '0.73rem',
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {idx + 1}
                              </span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                  title={tm.name}
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '0.84rem',
                                    color: '#0F172A',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {tm.name}
                                </div>
                                <div style={{ fontSize: '0.73rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                                  {tm.ordersCount} giao dịch • ★ {tm.rating}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#00B14F', whiteSpace: 'nowrap' }}>
                                {tm.gmv.toLocaleString('vi-VN')} đ
                              </div>
                              <div style={{ fontSize: '0.69rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                                Phí sàn ({platformCommissionRate}%): {tm.platformFee.toLocaleString('vi-VN')} đ
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Platform Orders Ledger */}
                {adminOverviewSubTab === 'ORDERS' && (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Sổ cái giao dịch đơn hàng toàn sàn
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                          Giám sát dòng tiền từng đơn giữa Khách hàng, Nhà hàng, Tài xế và can thiệp trạng thái khi cần
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 3, borderRadius: 8, gap: 2 }}>
                          {[
                            { id: 'ALL' as const, label: `Tất cả (${orders.length})` },
                            {
                              id: 'ACTIVE' as const,
                              label: `Đang xử lý (${orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length})`,
                            },
                            {
                              id: 'COMPLETED' as const,
                              label: `Hoàn tất (${orders.filter((o) => o.status === 'COMPLETED').length})`,
                            },
                            {
                              id: 'CANCELLED' as const,
                              label: `Đã hủy (${orders.filter((o) => o.status === 'CANCELLED').length})`,
                            },
                          ].map((f) => {
                            const active = adminOrderStatusFilter === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setAdminOrderStatusFilter(f.id)}
                                style={{
                                  padding: '5px 11px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: active ? '#FFFFFF' : 'transparent',
                                  color: active ? '#0F172A' : '#64748B',
                                  fontSize: '0.76rem',
                                  fontWeight: active ? 600 : 500,
                                  boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {f.label}
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          placeholder="Tìm mã đơn, tên khách, quán..."
                          value={adminOrderSearch}
                          onChange={(e) => setAdminOrderSearch(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            fontSize: '0.79rem',
                            color: '#0F172A',
                            width: 220,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>
                        <thead>
                          <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.71rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <th style={{ padding: '11px 16px' }}>Mã đơn</th>
                            <th style={{ padding: '11px 14px' }}>Nhà hàng</th>
                            <th style={{ padding: '11px 14px' }}>Khách nhận &amp; Tài xế</th>
                            <th style={{ padding: '11px 14px' }}>Tiền món &amp; Phí ship</th>
                            <th style={{ padding: '11px 14px' }}>Tổng thu &amp; Phân bổ</th>
                            <th style={{ padding: '11px 14px' }}>Trạng thái</th>
                            <th style={{ padding: '11px 16px', textAlign: 'right' }}>Can thiệp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders
                            .filter((o) => {
                              if (adminOrderStatusFilter === 'COMPLETED' && o.status !== 'COMPLETED') return false;
                              if (adminOrderStatusFilter === 'CANCELLED' && o.status !== 'CANCELLED') return false;
                              if (
                                adminOrderStatusFilter === 'ACTIVE' &&
                                (o.status === 'COMPLETED' || o.status === 'CANCELLED')
                              ) {
                                return false;
                              }
                              const q = adminOrderSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                o.orderNumber.toLowerCase().includes(q) ||
                                (o.merchant?.name || '').toLowerCase().includes(q) ||
                                (o.recipientName || '').toLowerCase().includes(q) ||
                                (o.recipientPhone || '').toLowerCase().includes(q) ||
                                (o.assignedDriverName || '').toLowerCase().includes(q)
                              );
                            })
                            .map((o) => {
                              const platformCut = Math.round(o.subtotal * commissionRateDecimal);
                              const merchantCut = Math.max(0, o.subtotal - platformCut);
                              const statusMeta: Record<OrderStatus, { label: string; bg: string; color: string; dot: string }> = {
                                PENDING: { label: 'Chờ quán nhận', bg: '#FFFBEB', color: '#B45309', dot: '#D97706' },
                                CONFIRMED: { label: 'Đã tiếp nhận', bg: '#EFF6FF', color: '#1D4ED8', dot: '#2563EB' },
                                PREPARING: { label: 'Đang chế biến', bg: '#F5F3FF', color: '#6D28D9', dot: '#7C3AED' },
                                READY_FOR_PICKUP: { label: 'Chờ lấy món', bg: '#FFFBEB', color: '#B45309', dot: '#D97706' },
                                DELIVERING: { label: 'Đang giao hàng', bg: '#EFF6FF', color: '#0369A1', dot: '#0284C7' },
                                COMPLETED: { label: 'Đã hoàn tất', bg: '#F0FDF4', color: '#15803D', dot: '#16A34A' },
                                CANCELLED: { label: 'Đã hủy đơn', bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
                              };
                              const st = statusMeta[o.status] || statusMeta.PENDING;
                              const isActiveOrder = o.status !== 'COMPLETED' && o.status !== 'CANCELLED';

                              return (
                                <tr key={o.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                    <div>#{o.orderNumber}</div>
                                    <div style={{ fontSize: '0.71rem', color: '#64748B', fontWeight: 500 }}>
                                      {o.payment?.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'Ví MoMo QR'}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1E293B' }}>
                                    <div
                                      title={o.merchant?.name}
                                      style={{
                                        maxWidth: 185,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {o.merchant?.name}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                                    <div
                                      style={{
                                        fontWeight: 500,
                                        color: '#0F172A',
                                        maxWidth: 195,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {o.recipientName} ({o.recipientPhone})
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                                      Shipper: {o.assignedDriverName || 'Chưa ghép tài xế'}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                    <div style={{ fontWeight: 600, color: '#334155' }}>
                                      Món: {o.subtotal.toLocaleString('vi-VN')}đ
                                    </div>
                                    <div style={{ fontSize: '0.71rem', color: '#0284C7', fontWeight: 500 }}>
                                      Ship: {o.deliveryFee.toLocaleString('vi-VN')}đ (TX: {Math.round(o.deliveryFee * 0.85).toLocaleString('vi-VN')}đ)
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                    <div style={{ fontWeight: 700, color: '#0F172A' }}>
                                      Thu: {o.finalTotal.toLocaleString('vi-VN')}đ
                                    </div>
                                    <div style={{ fontSize: '0.71rem', color: '#15803D', fontWeight: 600 }}>
                                      Quán: {merchantCut.toLocaleString('vi-VN')}đ • Sàn: {platformCut.toLocaleString('vi-VN')}đ
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '3px 9px',
                                        borderRadius: 999,
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        background: st.bg,
                                        color: st.color,
                                      }}
                                    >
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
                                      {st.label}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => setMerchantChatOrder(o)}
                                        title="Nhắn tin trực tiếp với khách hàng / tài xế của đơn này"
                                        style={{
                                          padding: '4px 9px',
                                          borderRadius: 6,
                                          border: '1px solid #BAE6FD',
                                          background: '#F0FDF4',
                                          color: '#059669',
                                          fontSize: '0.73rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                        }}
                                      >
                                        <MessageSquare size={12} />
                                        <span>Nhắn tin</span>
                                      </button>
                                    {isActiveOrder ? (
                                      <div style={{ display: 'inline-flex', gap: 6 }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onUpdateOrderStatus?.(o.id, 'COMPLETED');
                                            appendAuditLog(
                                              'CAN THIỆP HOÀN TẤT ĐƠN HÀNG',
                                              `#${o.orderNumber} (${o.merchant?.name})`,
                                              'Admin xác nhận hoàn tất đơn hàng trên sổ cái vận hành',
                                            );
                                            triggerAdminToast(`Đã chuyển trạng thái đơn #${o.orderNumber} sang Đã hoàn tất.`);
                                          }}
                                          style={{
                                            padding: '4px 9px',
                                            borderRadius: 6,
                                            border: '1px solid #0F172A',
                                            background: '#0F172A',
                                            color: '#FFFFFF',
                                            fontSize: '0.73rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Hoàn tất
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onUpdateOrderStatus?.(o.id, 'CANCELLED');
                                            appendAuditLog(
                                              'CAN THIỆP HỦY ĐƠN HÀNG',
                                              `#${o.orderNumber} (${o.merchant?.name})`,
                                              'Admin hủy đơn hàng theo yêu cầu vận hành',
                                            );
                                            triggerAdminToast(`Đã hủy đơn hàng #${o.orderNumber}.`);
                                          }}
                                          style={{
                                            padding: '4px 9px',
                                            borderRadius: 6,
                                            border: '1px solid #E2E8F0',
                                            background: '#FFFFFF',
                                            color: '#DC2626',
                                            fontSize: '0.73rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Hủy
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Đã chốt sổ</span>
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
                )}
              </div>
            )}

            {/* ADMIN TAB 2: MERCHANTS & KYC MODERATION */}
            {currentAdminTab === 'admin-merchants' &&
              (() => {
                const pendingCount = allMerchants.filter((m) => getEffectiveMerchantKycStatus(m) === 'PENDING').length;
                const approvedCount = allMerchants.filter((m) => getEffectiveMerchantKycStatus(m) === 'APPROVED').length;
                const suspendedCount = allMerchants.filter((m) =>
                  ['SUSPENDED', 'REJECTED'].includes(getEffectiveMerchantKycStatus(m)),
                ).length;

                const filteredMerchants = allMerchants.filter((m) => {
                  const kycStatus = getEffectiveMerchantKycStatus(m);
                  if (adminMerchantFilter === 'PENDING' && kycStatus !== 'PENDING') return false;
                  if (adminMerchantFilter === 'APPROVED' && kycStatus !== 'APPROVED') return false;
                  if (adminMerchantFilter === 'SUSPENDED' && kycStatus !== 'SUSPENDED' && kycStatus !== 'REJECTED') {
                    return false;
                  }

                  const q = adminMerchantSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    m.name.toLowerCase().includes(q) ||
                    (m.ownerName || '').toLowerCase().includes(q) ||
                    (m.phoneNumber || '').toLowerCase().includes(q) ||
                    (m.businessLicenseNumber || '').toLowerCase().includes(q) ||
                    (m.address || '').toLowerCase().includes(q)
                  );
                });

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Minimalist Control Bar */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: '16px 22px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 14,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                          <h3
                            style={{
                              fontSize: '0.98rem',
                              fontWeight: 700,
                              color: '#0F172A',
                              margin: 0,
                              letterSpacing: '-0.01em',
                            }}
                          >
                            Danh mục Đối tác Nhà hàng &amp; Phê duyệt Hồ sơ Pháp lý
                          </h3>
                          <span
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              color: '#64748B',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {allMerchants.length} gian hàng
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                          Thẩm định giấy phép kinh doanh, hồ sơ VSATTP và kiểm soát trạng thái vận hành trên sàn
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {/* Segmented Status Filter */}
                        <div
                          style={{
                            display: 'inline-flex',
                            background: '#F1F5F9',
                            padding: 3,
                            borderRadius: 8,
                            gap: 2,
                          }}
                        >
                          {[
                            { id: 'ALL' as const, label: `Tất cả (${allMerchants.length})` },
                            { id: 'PENDING' as const, label: `Chờ duyệt (${pendingCount})` },
                            { id: 'APPROVED' as const, label: `Hoạt động (${approvedCount})` },
                            { id: 'SUSPENDED' as const, label: `Tạm khóa (${suspendedCount})` },
                          ].map((tab) => {
                            const active = adminMerchantFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setAdminMerchantFilter(tab.id)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: active ? '#FFFFFF' : 'transparent',
                                  color: active ? '#0F172A' : '#64748B',
                                  fontSize: '0.76rem',
                                  fontWeight: active ? 600 : 500,
                                  boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Clean Search Input */}
                        <input
                          type="text"
                          placeholder="Tìm tên quán, đại diện, GPKD..."
                          value={adminMerchantSearch}
                          onChange={(e) => setAdminMerchantSearch(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            fontSize: '0.79rem',
                            color: '#0F172A',
                            width: 225,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Minimalist Merchant Directory Table */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ overflowX: 'auto' }}>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.84rem',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                background: '#FAFAFA',
                                borderBottom: '1px solid #E2E8F0',
                                textAlign: 'left',
                                color: '#64748B',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              <th style={{ padding: '11px 14px' }}>Gian hàng</th>
                              <th style={{ padding: '11px 12px' }}>Đại diện &amp; Giấy phép</th>
                              <th style={{ padding: '11px 12px' }}>Địa chỉ kinh doanh</th>
                              <th style={{ padding: '11px 12px' }}>Trạng thái</th>
                              <th style={{ padding: '11px 14px', textAlign: 'right' }}>Ghi chú &amp; Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMerchants.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  style={{
                                    padding: '42px 20px',
                                    textAlign: 'center',
                                    color: '#94A3B8',
                                    fontSize: '0.82rem',
                                  }}
                                >
                                  Không tìm thấy đối tác nhà hàng phù hợp với bộ lọc hiện tại.
                                </td>
                              </tr>
                            ) : (
                              filteredMerchants.map((m, idx) => {
                                const kycStatus = getEffectiveMerchantKycStatus(m);
                                const isSuspended = kycStatus === 'SUSPENDED' || kycStatus === 'REJECTED';
                                const isPending = kycStatus === 'PENDING';

                                return (
                                  <tr
                                    key={m.id}
                                    style={{
                                      borderBottom:
                                        idx === filteredMerchants.length - 1 ? 'none' : '1px solid #F1F5F9',
                                      background: isPending
                                        ? '#FFFDF5'
                                        : isSuspended
                                        ? '#FAFAFA'
                                        : '#FFFFFF',
                                      transition: 'background 0.12s ease',
                                    }}
                                  >
                                    {/* Column 1: Store Identity (Single-line protected) */}
                                    <td style={{ padding: '12px 14px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 195 }}>
                                        <img
                                          src={
                                            m.storeFrontImage ||
                                            m.coverUrl ||
                                            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80'
                                          }
                                          alt={m.name}
                                          style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 8,
                                            objectFit: 'cover',
                                            flexShrink: 0,
                                            border: '1px solid #E2E8F0',
                                            opacity: isSuspended ? 0.6 : 1,
                                          }}
                                        />
                                        <div style={{ minWidth: 0, maxWidth: 150 }}>
                                          <div
                                            title={m.name}
                                            style={{
                                              fontWeight: 600,
                                              color: isSuspended ? '#64748B' : '#0F172A',
                                              fontSize: '0.84rem',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                            }}
                                          >
                                            {m.name}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: '0.73rem',
                                              color: '#64748B',
                                              marginTop: 2,
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                            }}
                                          >
                                            {m.phoneNumber}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Column 2: Representative, Owner Identity Avatar & Business License */}
                                    <td style={{ padding: '12px 12px' }}>
                                      {(() => {
                                        const savedMeta = loadStoredOwnerKycMeta(m.id);
                                        const ownerAv =
                                          savedMeta?.ownerAvatarUrl ||
                                          m.ownerAvatarUrl ||
                                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80';
                                        const ownerCccd =
                                          savedMeta?.ownerNationalId || m.ownerNationalId || '079095008821';
                                        return (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <img
                                              src={ownerAv}
                                              alt={m.ownerName || 'Chủ quán'}
                                              title="Avatar nhận diện chủ sở hữu cửa hàng"
                                              style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: '2px solid #D97706',
                                                flexShrink: 0,
                                              }}
                                            />
                                            <div style={{ minWidth: 0 }}>
                                              <div
                                                title={m.ownerName || 'Chủ Hộ Kinh Doanh'}
                                                style={{
                                                  fontWeight: 600,
                                                  color: '#1E293B',
                                                  fontSize: '0.82rem',
                                                  maxWidth: 135,
                                                  whiteSpace: 'nowrap',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                }}
                                              >
                                                {m.ownerName || 'Chủ Hộ Kinh Doanh'}
                                              </div>
                                              <div
                                                title={`CCCD: ${ownerCccd} • GPKD: ${m.businessLicenseNumber || 'VSATTP-2026-HCM'}`}
                                                style={{
                                                  fontSize: '0.71rem',
                                                  color: '#64748B',
                                                  marginTop: 2,
                                                  maxWidth: 145,
                                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                                  whiteSpace: 'nowrap',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                }}
                                              >
                                                CCCD: {ownerCccd} • {m.businessLicenseNumber || 'VSATTP-2026-HCM'}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </td>

                                    {/* Column 3: Business Address (Single-line truncated with tooltip) */}
                                    <td style={{ padding: '12px 12px' }}>
                                      <div
                                        title={m.address}
                                        style={{
                                          color: '#475569',
                                          fontSize: '0.8rem',
                                          maxWidth: 175,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {m.address}
                                      </div>
                                    </td>

                                    {/* Column 4: Minimalist Dot + Status Text & Saved Note */}
                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '3px 9px',
                                          borderRadius: 999,
                                          fontSize: '0.74rem',
                                          fontWeight: 600,
                                          background:
                                            kycStatus === 'APPROVED'
                                              ? '#F0FDF4'
                                              : kycStatus === 'PENDING'
                                              ? '#FFFBEB'
                                              : '#FEF2F2',
                                          color:
                                            kycStatus === 'APPROVED'
                                              ? '#15803D'
                                              : kycStatus === 'PENDING'
                                              ? '#B45309'
                                              : '#DC2626',
                                          border:
                                            kycStatus === 'APPROVED'
                                              ? '1px solid #DCFCE7'
                                              : kycStatus === 'PENDING'
                                              ? '1px solid #FDE68A'
                                              : '1px solid #FECACA',
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background:
                                              kycStatus === 'APPROVED'
                                                ? '#16A34A'
                                                : kycStatus === 'PENDING'
                                                ? '#D97706'
                                                : '#EF4444',
                                          }}
                                        />
                                        {kycStatus === 'APPROVED' && 'Đang hoạt động'}
                                        {kycStatus === 'PENDING' && 'Chờ duyệt hồ sơ'}
                                        {kycStatus === 'REJECTED' && 'Đã từ chối'}
                                        {kycStatus === 'SUSPENDED' && 'Đang tạm khóa'}
                                      </span>
                                      {savedMerchantNotes[m.id] && (
                                        <div
                                          title={savedMerchantNotes[m.id]}
                                          style={{
                                            fontSize: '0.7rem',
                                            color: '#64748B',
                                            marginTop: 3,
                                            maxWidth: 165,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }}
                                        >
                                          Ghi chú: {savedMerchantNotes[m.id]}
                                        </div>
                                      )}
                                    </td>

                                    {/* Column 5: Unified Note & Restrained Action Controls */}
                                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          justifyContent: 'flex-end',
                                        }}
                                      >
                                        <input
                                          type="text"
                                          placeholder="Ghi chú..."
                                          value={merchantModerationReasons[m.id] || ''}
                                          onChange={(e) =>
                                            setMerchantModerationReasons((prev) => ({
                                              ...prev,
                                              [m.id]: e.target.value,
                                            }))
                                          }
                                          style={{
                                            padding: '5px 8px',
                                            borderRadius: 6,
                                            border: '1px solid #E2E8F0',
                                            background: '#F8FAFC',
                                            color: '#0F172A',
                                            fontSize: '0.76rem',
                                            width: 100,
                                            outline: 'none',
                                          }}
                                        />

                                        <button
                                          type="button"
                                          onClick={() => setInspectingMerchantKyc(m)}
                                          style={{
                                            padding: '5px 10px',
                                            borderRadius: 6,
                                            border: '1px solid #E2E8F0',
                                            background: '#F8FAFC',
                                            color: '#334155',
                                            fontSize: '0.74rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Hồ sơ
                                        </button>

                                        {kycStatus === 'PENDING' && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateMerchantKyc(m, 'APPROVED')}
                                              style={{
                                                padding: '5px 12px',
                                                borderRadius: 6,
                                                border: '1px solid #0F172A',
                                                background: '#0F172A',
                                                color: '#FFFFFF',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                              }}
                                            >
                                              Duyệt quán
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateMerchantKyc(m, 'REJECTED')}
                                              style={{
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                border: '1px solid #FECACA',
                                                background: '#FFFFFF',
                                                color: '#DC2626',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                              }}
                                            >
                                              Từ chối
                                            </button>
                                          </>
                                        )}

                                        {kycStatus === 'APPROVED' && (
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateMerchantKyc(m, 'SUSPENDED')}
                                            style={{
                                              padding: '5px 11px',
                                              borderRadius: 6,
                                              border: '1px solid #E2E8F0',
                                              background: '#FFFFFF',
                                              color: '#475569',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              transition: 'all 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.borderColor = '#FECACA';
                                              e.currentTarget.style.background = '#FEF2F2';
                                              e.currentTarget.style.color = '#DC2626';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.borderColor = '#E2E8F0';
                                              e.currentTarget.style.background = '#FFFFFF';
                                              e.currentTarget.style.color = '#475569';
                                            }}
                                          >
                                            Tạm khóa
                                          </button>
                                        )}

                                        {(kycStatus === 'SUSPENDED' || kycStatus === 'REJECTED') && (
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateMerchantKyc(m, 'APPROVED')}
                                            style={{
                                              padding: '5px 11px',
                                              borderRadius: 6,
                                              border: '1px solid #0F172A',
                                              background: '#0F172A',
                                              color: '#FFFFFF',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Mở khóa
                                          </button>
                                        )}
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
                );
              })()}

            {/* ADMIN TAB 3: DRIVER FLEET MANAGEMENT */}
            {currentAdminTab === 'admin-drivers' &&
              (() => {
                const activeDrvCount = driversList.filter((d) => d.status === 'ACTIVE').length;
                const inactiveDrvCount = driversList.filter((d) => d.status !== 'ACTIVE').length;
                const filteredDrivers = driversList.filter((drv) => {
                  if (adminDriverFilter === 'ACTIVE' && drv.status !== 'ACTIVE') return false;
                  if (adminDriverFilter === 'INACTIVE' && drv.status === 'ACTIVE') return false;
                  const q = adminDriverSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    drv.fullName.toLowerCase().includes(q) ||
                    (drv.phone || '').toLowerCase().includes(q) ||
                    (drv.licensePlate || '').toLowerCase().includes(q) ||
                    (drv.area || '').toLowerCase().includes(q) ||
                    drv.code.toLowerCase().includes(q)
                  );
                });

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: '16px 22px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 14,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                            Đội ngũ Tài xế Giao hàng &amp; Ví Đối soát Cước
                          </h3>
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                            {driversList.length} tài xế
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                          Quản lý hồ sơ phương tiện, khu vực hoạt động, số dư ví cước thực nhận (85%) và quyền nhận chuyến
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 3, borderRadius: 8, gap: 2 }}>
                          {[
                            { id: 'ALL' as const, label: `Tất cả (${driversList.length})` },
                            { id: 'ACTIVE' as const, label: `Hoạt động (${activeDrvCount})` },
                            { id: 'INACTIVE' as const, label: `Đình chỉ (${inactiveDrvCount})` },
                          ].map((tab) => {
                            const active = adminDriverFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setAdminDriverFilter(tab.id)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: active ? '#FFFFFF' : 'transparent',
                                  color: active ? '#0F172A' : '#64748B',
                                  fontSize: '0.76rem',
                                  fontWeight: active ? 600 : 500,
                                  boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          placeholder="Tìm tên tài xế, biển số, SĐT..."
                          value={adminDriverSearch}
                          onChange={(e) => setAdminDriverSearch(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            fontSize: '0.79rem',
                            color: '#0F172A',
                            width: 215,
                            outline: 'none',
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setAdminReconciliationSubTab('DRIVER_WITHDRAWALS');
                            onNavigate?.('admin-reconciliation');
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Rút tiền Tài xế ({driverWithdrawals.filter((w) => w.status === 'PENDING').length} chờ duyệt) →
                        </button>
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                          <thead>
                            <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              <th style={{ padding: '11px 20px' }}>Tài xế &amp; Liên hệ</th>
                              <th style={{ padding: '11px 16px' }}>Phương tiện &amp; Biển số</th>
                              <th style={{ padding: '11px 16px' }}>Khu vực &amp; Hiệu suất</th>
                              <th style={{ padding: '11px 16px' }}>Ví &amp; Đối soát cước (85%)</th>
                              <th style={{ padding: '11px 16px' }}>Trạng thái</th>
                              <th style={{ padding: '11px 20px', textAlign: 'right' }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDrivers.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                                  Không tìm thấy tài xế phù hợp với bộ lọc.
                                </td>
                              </tr>
                            ) : (
                              filteredDrivers.map((drv, idx) => {
                                const isActive = drv.status === 'ACTIVE';
                                return (
                                  <tr
                                    key={drv.id}
                                    style={{
                                      borderBottom: idx === filteredDrivers.length - 1 ? 'none' : '1px solid #F1F5F9',
                                      background: isActive ? '#FFFFFF' : '#FAFAFA',
                                    }}
                                  >
                                    <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                                      <div style={{ fontWeight: 600, color: isActive ? '#0F172A' : '#64748B' }}>
                                        {drv.fullName}{' '}
                                        <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 500 }}>({drv.code})</span>
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                                        {drv.phone} · {drv.bankName} ({drv.bankAccountNumber})
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                      <span
                                        style={{
                                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                          fontSize: '0.77rem',
                                          fontWeight: 600,
                                          background: '#F1F5F9',
                                          color: '#0F172A',
                                          padding: '2px 7px',
                                          borderRadius: 5,
                                        }}
                                      >
                                        {drv.licensePlate}
                                      </span>
                                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 3 }}>{drv.vehicle}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                      <div style={{ color: '#334155', fontWeight: 500 }}>{drv.area}</div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                                        {drv.completedTrips} chuyến hoàn tất · {drv.rating} ★
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                      <div style={{ fontWeight: 700, color: '#0284C7', fontSize: '0.85rem' }}>
                                        Khả dụng: {drv.availableWalletBalance.toLocaleString('vi-VN')}đ
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                                        Thu ròng: {drv.netShippingIncome85.toLocaleString('vi-VN')}đ · Đã rút: {drv.withdrawnApproved.toLocaleString('vi-VN')}đ
                                        {drv.penaltiesTotal > 0 ? ` · Phạt: ${drv.penaltiesTotal.toLocaleString('vi-VN')}đ` : ''}
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '3px 9px',
                                          borderRadius: 999,
                                          fontSize: '0.73rem',
                                          fontWeight: 600,
                                          background: isActive ? '#F0FDF4' : '#FEF2F2',
                                          color: isActive ? '#15803D' : '#DC2626',
                                          border: isActive ? '1px solid #DCFCE7' : '1px solid #FECACA',
                                        }}
                                      >
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#16A34A' : '#EF4444' }} />
                                        {isActive ? 'Đang hoạt động' : 'Đang đình chỉ'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                      <button
                                        type="button"
                                        onClick={() => toggleDriverStatus(drv.id)}
                                        style={{
                                          padding: '5px 12px',
                                          borderRadius: 6,
                                          border: isActive ? '1px solid #E2E8F0' : '1px solid #0F172A',
                                          background: isActive ? '#FFFFFF' : '#0F172A',
                                          color: isActive ? '#475569' : '#FFFFFF',
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          transition: 'all 0.12s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (isActive) {
                                            e.currentTarget.style.borderColor = '#FECACA';
                                            e.currentTarget.style.background = '#FEF2F2';
                                            e.currentTarget.style.color = '#DC2626';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (isActive) {
                                            e.currentTarget.style.borderColor = '#E2E8F0';
                                            e.currentTarget.style.background = '#FFFFFF';
                                            e.currentTarget.style.color = '#475569';
                                          }
                                        }}
                                      >
                                        {isActive ? 'Đình chỉ' : 'Mở khóa'}
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
                  </div>
                );
              })()}

            {/* ADMIN TAB 4: COMPLAINTS & DISPUTES */}
            {currentAdminTab === 'admin-complaints' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Unified Minimalist Control Bar for Complaints & Disputes */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '15px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Trung tâm Phân xử Khiếu nại &amp; Tranh chấp Giao nhận
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Phân định trách nhiệm bồi hoàn giữa Nhà hàng, Tài xế và Quỹ bảo trợ sàn DineGo
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#F1F5F9',
                      padding: 3,
                      borderRadius: 8,
                      gap: 2,
                    }}
                  >
                    {[
                      {
                        id: 'CUSTOMER_REFUND' as const,
                        label: `Khiếu nại Hoàn tiền Khách hàng (${complaints.length})`,
                        pendingCount: complaints.filter((c) => c.status === 'OPEN').length,
                      },
                      {
                        id: 'DRIVER_DISPUTE' as const,
                        label: `Tài xế Báo cáo Bom hàng (${deliveryDisputes.length})`,
                        pendingCount: deliveryDisputes.filter((d) => d.status === 'PENDING_REVIEW').length,
                      },
                    ].map((tab) => {
                      const active = adminComplaintSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAdminComplaintSubTab(tab.id)}
                          style={{
                            padding: '5px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: active ? '#FFFFFF' : 'transparent',
                            color: active ? '#0F172A' : '#64748B',
                            fontWeight: active ? 600 : 500,
                            fontSize: '0.78rem',
                            boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span>{tab.label}</span>
                          {tab.pendingCount > 0 && (
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: 999,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: '#FFFBEB',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                              }}
                            >
                              {tab.pendingCount} chờ
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {adminComplaintSubTab === 'CUSTOMER_REFUND' && (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Danh sách Hồ sơ Khiếu nại, Ảnh bằng chứng &amp; Phân xử Hoàn tiền
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                          Bấm vào ảnh bằng chứng để phóng to, xác định bên chịu trách nhiệm (Quán / Tài xế / Sàn) và duyệt bồi hoàn
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 3, borderRadius: 8, gap: 2 }}>
                          {[
                            { id: 'ALL' as const, label: `Tất cả (${complaints.length})` },
                            { id: 'OPEN' as const, label: `Chờ phân xử (${complaints.filter((c) => c.status === 'OPEN').length})` },
                            { id: 'REFUNDED' as const, label: `Đã hoàn tiền (${complaints.filter((c) => c.status === 'REFUNDED').length})` },
                            { id: 'REJECTED' as const, label: `Đã từ chối (${complaints.filter((c) => c.status === 'REJECTED').length})` },
                          ].map((f) => {
                            const active = adminComplaintStatusFilter === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setAdminComplaintStatusFilter(f.id)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: active ? '#FFFFFF' : 'transparent',
                                  color: active ? '#0F172A' : '#64748B',
                                  fontSize: '0.76rem',
                                  fontWeight: active ? 600 : 500,
                                  boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {f.label}
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          placeholder="Tìm mã đơn, tên khách, quán..."
                          value={adminComplaintSearch}
                          onChange={(e) => setAdminComplaintSearch(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            fontSize: '0.79rem',
                            color: '#0F172A',
                            width: 215,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                        <thead>
                          <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <th style={{ padding: '11px 18px' }}>Mã hồ sơ / Đơn</th>
                            <th style={{ padding: '11px 16px' }}>Khách hàng &amp; Đối tác</th>
                            <th style={{ padding: '11px 16px' }}>Nội dung &amp; Bằng chứng</th>
                            <th style={{ padding: '11px 16px' }}>Mức bồi hoàn</th>
                            <th style={{ padding: '11px 16px' }}>Ghi chú phân xử</th>
                            <th style={{ padding: '11px 16px' }}>Trạng thái</th>
                            <th style={{ padding: '11px 18px', textAlign: 'right' }}>Quyết định xử lý</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complaints
                            .filter((cmp) => {
                              if (adminComplaintStatusFilter !== 'ALL' && cmp.status !== adminComplaintStatusFilter) {
                                return false;
                              }
                              const q = adminComplaintSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                (cmp.code || '').toLowerCase().includes(q) ||
                                (cmp.orderNumber || '').toLowerCase().includes(q) ||
                                (cmp.customerName || '').toLowerCase().includes(q) ||
                                (cmp.merchantName || '').toLowerCase().includes(q) ||
                                (cmp.driverName || '').toLowerCase().includes(q) ||
                                (cmp.issueType || '').toLowerCase().includes(q)
                              );
                            })
                            .map((cmp) => (
                              <tr key={cmp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{cmp.code}</div>
                                  <div style={{ fontSize: '0.74rem', color: '#4F46E5', fontWeight: 600 }}>#{cmp.orderNumber}</div>
                                </td>
                                <td style={{ padding: '14px 16px', minWidth: 165 }}>
                                  <div style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{cmp.customerName}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                                    Quán: <strong>{cmp.merchantName}</strong>
                                  </div>
                                  {cmp.driverName && (
                                    <div style={{ fontSize: '0.72rem', color: '#0284C7', marginTop: 2, whiteSpace: 'nowrap' }}>
                                      Shipper: {cmp.driverName}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '14px 16px', color: '#334155', minWidth: 220, maxWidth: 280 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {cmp.evidenceImage && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDisputeImg(cmp.evidenceImage)}
                                        title="Bấm để phóng to ảnh bằng chứng"
                                        style={{
                                          padding: 0,
                                          border: '1px solid #CBD5E1',
                                          borderRadius: 6,
                                          overflow: 'hidden',
                                          width: 46,
                                          height: 46,
                                          flexShrink: 0,
                                          cursor: 'zoom-in',
                                          background: '#FFFFFF',
                                        }}
                                      >
                                        <img
                                          src={cmp.evidenceImage}
                                          alt="Bằng chứng"
                                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                      </button>
                                    )}
                                    <div>
                                      <span style={{ fontSize: '0.81rem', display: 'block', lineHeight: 1.4 }}>{cmp.issueType}</span>
                                      {cmp.faultParty && cmp.status === 'REFUNDED' && (
                                        <span
                                          style={{
                                            display: 'inline-block',
                                            marginTop: 5,
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            padding: '2px 7px',
                                            borderRadius: 4,
                                            whiteSpace: 'nowrap',
                                            background:
                                              cmp.faultParty === 'DRIVER'
                                                ? '#EFF6FF'
                                                : cmp.faultParty === 'PLATFORM'
                                                ? '#F0FDF4'
                                                : '#FFF7ED',
                                            color:
                                              cmp.faultParty === 'DRIVER'
                                                ? '#1D4ED8'
                                                : cmp.faultParty === 'PLATFORM'
                                                ? '#15803D'
                                                : '#C2410C',
                                          }}
                                        >
                                          {cmp.faultParty === 'DRIVER'
                                            ? 'Khấu trừ: Ví Tài xế'
                                            : cmp.faultParty === 'PLATFORM'
                                            ? 'Khấu trừ: Quỹ Sàn hỗ trợ'
                                            : 'Khấu trừ: Đối soát Nhà hàng'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', minWidth: 105 }}>
                                  {(Number(cmp.compensationAmount) || 0).toLocaleString('vi-VN')}đ
                                </td>
                                <td style={{ padding: '14px 16px', minWidth: 210 }}>
                                  {cmp.status === 'OPEN' ? (
                                    <input
                                      type="text"
                                      placeholder="Nhập ghi chú trước khi chọn xử lý..."
                                      value={complaintNoteInputs[cmp.id] || ''}
                                      onChange={(e) =>
                                        setComplaintNoteInputs((prev) => ({
                                          ...prev,
                                          [cmp.id]: e.target.value,
                                        }))
                                      }
                                      style={{
                                        padding: '7px 10px',
                                        borderRadius: 6,
                                        border: '1px solid #CBD5E1',
                                        background: '#FFFFFF',
                                        color: '#0F172A',
                                        fontSize: '0.78rem',
                                        width: '100%',
                                        minWidth: 195,
                                        outline: 'none',
                                      }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '0.77rem', color: '#334155', lineHeight: 1.45, display: 'block' }}>
                                      {cmp.resolutionNotes || 'Đã hoàn tất xử lý'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '3px 9px',
                                      borderRadius: 999,
                                      fontSize: '0.73rem',
                                      fontWeight: 600,
                                      background:
                                        cmp.status === 'OPEN'
                                          ? '#FFFBEB'
                                          : cmp.status === 'REFUNDED'
                                          ? '#F0FDF4'
                                          : '#FEF2F2',
                                      color:
                                        cmp.status === 'OPEN'
                                          ? '#B45309'
                                          : cmp.status === 'REFUNDED'
                                          ? '#15803D'
                                          : '#DC2626',
                                      border:
                                        cmp.status === 'OPEN'
                                          ? '1px solid #FDE68A'
                                          : cmp.status === 'REFUNDED'
                                          ? '1px solid #DCFCE7'
                                          : '1px solid #FECACA',
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background:
                                          cmp.status === 'OPEN'
                                            ? '#D97706'
                                            : cmp.status === 'REFUNDED'
                                            ? '#16A34A'
                                            : '#EF4444',
                                      }}
                                    />
                                    {cmp.status === 'OPEN'
                                      ? 'Chờ phân xử'
                                      : cmp.status === 'REFUNDED'
                                      ? 'Đã hoàn tiền'
                                      : 'Đã từ chối'}
                                  </span>
                                </td>
                                <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  {cmp.status === 'OPEN' ? (
                                    <div style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                      {String(cmp.issueType).includes('DRIVER_ATTITUDE') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            alert('Đã gửi Mã Voucher Thiện Chí 50.000đ tới khách hàng và lập biên bản kỷ luật thái độ tài xế.');
                                            handleResolveComplaint(cmp.id, 'REFUND_PLATFORM');
                                          }}
                                          title="CSKH xin lỗi, tặng voucher thiện chí 50k & phạt chế tài thái độ tài xế"
                                          style={{
                                            padding: '5px 9px',
                                            borderRadius: 6,
                                            background: '#FEF3C7',
                                            border: '1px solid #F59E0B',
                                            color: '#B45309',
                                            fontSize: '0.73rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          🎁 Voucher 50k
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleResolveComplaint(cmp.id, 'REFUND_MERCHANT')}
                                        title="Lỗi chế biến/thiếu món: Hoàn tiền ví Khách & Khấu trừ vào đối soát Quán"
                                        style={{
                                          padding: '5px 10px',
                                          borderRadius: 6,
                                          background: '#0F172A',
                                          color: '#FFFFFF',
                                          fontSize: '0.73rem',
                                          fontWeight: 600,
                                          border: '1px solid #0F172A',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Lỗi Quán
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleResolveComplaint(cmp.id, 'REFUND_DRIVER')}
                                        title="Lỗi vận chuyển/đổ vỡ: Hoàn tiền ví Khách & Khấu trừ trực tiếp Ví Tài xế"
                                        style={{
                                          padding: '5px 10px',
                                          borderRadius: 6,
                                          background: '#0284C7',
                                          color: '#FFFFFF',
                                          fontSize: '0.73rem',
                                          fontWeight: 600,
                                          border: '1px solid #0284C7',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Lỗi Tài xế
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleResolveComplaint(cmp.id, 'REFUND_PLATFORM')}
                                        title="Sự cố bất khả kháng: Quỹ Sàn hỗ trợ hoàn tiền cho Khách"
                                        style={{
                                          padding: '5px 9px',
                                          borderRadius: 6,
                                          background: '#F8FAFC',
                                          border: '1px solid #CBD5E1',
                                          color: '#334155',
                                          fontSize: '0.73rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Sàn hỗ trợ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleResolveComplaint(cmp.id, 'REJECT')}
                                        title="Từ chối khiếu nại do bằng chứng không hợp lệ"
                                        style={{
                                          padding: '5px 9px',
                                          borderRadius: 6,
                                          background: '#FFFFFF',
                                          border: '1px solid #FECACA',
                                          color: '#DC2626',
                                          fontSize: '0.73rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Từ chối
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{cmp.createdAt}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* DRIVER DELIVERY DISPUTES (BOM HÀNG) & EVIDENCE VERIFICATION */}
                {adminComplaintSubTab === 'DRIVER_DISPUTE' && (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Hồ sơ Tài xế Báo cáo Khách Bom hàng &amp; Bằng chứng Hiện trường ({deliveryDisputes.length})
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                          Đối chiếu nhật ký cuộc gọi, ảnh chụp hiện trường, tọa độ GPS tại điểm giao và duyệt bồi hoàn cước cho Shipper
                        </p>
                      </div>
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '4px 12px', borderRadius: 999 }}>
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
                                  {disp.callLogTimestamps && disp.callLogTimestamps.length > 0 && (
                                    <div style={{ marginTop: 4, fontSize: '0.74rem', color: '#64748B' }}>
                                      Lịch sử gọi: <strong>{disp.callLogTimestamps.join(', ')}</strong>
                                    </div>
                                  )}
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

                              {/* Operational Flow & Sanction Policy Notice (Images 1, 2, 3) */}
                              <div
                                style={{
                                  background: disp.paymentMethod === 'COD' ? '#FEF2F2' : '#F0FDF4',
                                  border: `1px solid ${disp.paymentMethod === 'COD' ? '#FECACA' : '#BBF7D0'}`,
                                  borderRadius: 8,
                                  padding: '10px 12px',
                                  fontSize: '0.78rem',
                                  color: disp.paymentMethod === 'COD' ? '#991B1B' : '#166534',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                }}
                              >
                                <div>
                                  <strong>Hướng giải quyết dòng tiền ({disp.paymentMethod}): </strong>
                                  {disp.paymentMethod === 'COD'
                                    ? 'Đơn COD: Quỹ bồi hoàn rủi ro sàn (Risk Fund) chi trả tiền món cho Quán và chi trả cước giao cho Shipper.'
                                    : 'Đơn trả trước (MoMo/Thẻ): Không hoàn tiền cho khách. Quán giữ 100% tiền món, Shipper nhận 100% cước ship & được quyền xử lý phần ăn.'}
                                </div>
                                <div style={{ fontWeight: 600 }}>
                                  🛡️ <strong>Chế tài khách hàng khi duyệt:</strong> Khóa vĩnh viễn tính năng COD, chỉ cho phép đặt trả trước MoMo. {disp.orderId.includes('catering') || disp.reason === 'REFUSED_ORDER' ? 'Ghi nhận số điện thoại vào Blacklist toàn sàn do bom đơn tiệc/từ chối nhận không lý do.' : ''}
                                </div>
                              </div>

                              {/* Order Totals & Admin Action Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                  <span>Giá trị đơn: <strong style={{ color: '#0F172A' }}>{disp.orderTotal.toLocaleString('vi-VN')}đ</strong> ({disp.paymentMethod})</span>
                                  <span>Mức bồi hoàn tài xế: <strong style={{ color: '#059669' }}>{(disp.compensationAmount || 15000).toLocaleString('vi-VN')}đ</strong></span>
                                </div>

                                {isPending ? (
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onResolveDeliveryDispute?.(
                                          disp.id,
                                          'COMPENSATED_DRIVER',
                                          'Admin đã xác minh ảnh hiện trường & tọa độ GPS tài xế — duyệt bồi hoàn cước.',
                                        );
                                        appendAuditLog(
                                          'DUYỆT BỒI HOÀN BOM HÀNG TÀI XẾ',
                                          `${disp.reportCode} (#${disp.orderNumber} • ${disp.driverName})`,
                                          `Đã cộng ${(disp.compensationAmount || 15000).toLocaleString('vi-VN')}đ vào ví tài xế`,
                                        );
                                        triggerAdminToast(
                                          `Đã duyệt bồi hoàn ${(disp.compensationAmount || 15000).toLocaleString('vi-VN')}đ vào ví tài xế ${disp.driverName}.`,
                                        );
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '7px 14px',
                                        borderRadius: 6,
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <CheckCircle2 size={14} /> Duyệt &amp; Bồi hoàn {(disp.compensationAmount || 15000).toLocaleString('vi-VN')}đ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onResolveDeliveryDispute?.(
                                          disp.id,
                                          'REJECTED',
                                          'Bằng chứng hiện trường chưa đủ căn cứ xác nhận khách bom hàng.',
                                        );
                                        appendAuditLog(
                                          'TỪ CHỐI HỒ SƠ BOM HÀNG TÀI XẾ',
                                          `${disp.reportCode} (#${disp.orderNumber} • ${disp.driverName})`,
                                          'Bằng chứng hiện trường chưa đủ căn cứ xác nhận khách bom hàng',
                                        );
                                        triggerAdminToast(`Đã từ chối hồ sơ báo cáo bom hàng ${disp.reportCode}.`);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '7px 14px',
                                        borderRadius: 6,
                                        background: '#FFFFFF',
                                        color: '#DC2626',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        border: '1px solid #FECACA',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <XCircle size={14} /> Từ chối
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
                )}
              </div>
            )}

            {/* ADMIN TAB 5: FINANCIAL RECONCILIATION & PAYOUTS — 4-ACTOR CASH FLOW LEDGER */}
            {currentAdminTab === 'admin-reconciliation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Top 4 Financial Summary KPI Cards (All Positive Values — Zero Negative Signs) */}
                {(() => {
                  const totalGross = filteredReconciliations.reduce((s, r) => s + r.grossRevenue, 0);
                  const totalCommission = filteredReconciliations.reduce((s, r) => s + r.commission15, 0);
                  const totalRefundDeducted = filteredReconciliations.reduce((s, r) => s + r.refundDeducted, 0);
                  const totalNetPayout = filteredReconciliations.reduce((s, r) => s + r.netPayout85, 0);
                  const totalMerchantWithdrawn = filteredReconciliations.reduce((s, r) => s + r.withdrawnApproved, 0);
                  const totalMerchantRemaining = filteredReconciliations.reduce((s, r) => s + r.remainingPayout, 0);
                  const totalDriverNet85 = driversList.reduce((s, d) => s + d.netShippingIncome85, 0);
                  const totalDriverPenalties = driversList.reduce((s, d) => s + d.penaltiesTotal, 0);
                  const totalDriverWithdrawn = driversList.reduce((s, d) => s + d.withdrawnApproved, 0);
                  const totalDriverAvailable = driversList.reduce((s, d) => s + d.availableWalletBalance, 0);

                  return (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: 14,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            TỔNG DOANH THU MÓN &amp; TIỆC (GỘP)
                          </div>
                          <div style={{ fontSize: '1.42rem', fontWeight: 800, color: '#0F172A', marginTop: 6 }}>
                            {totalGross.toLocaleString('vi-VN')} đ
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 4 }}>
                            Tổng hợp từ {filteredReconciliations.length} đối tác nhà hàng &amp; bếp tiệc
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            QUỸ ĐỐI TÁC NHÀ HÀNG (RÒNG 85%)
                          </div>
                          <div style={{ fontSize: '1.42rem', fontWeight: 800, color: '#15803D', marginTop: 6 }}>
                            {totalNetPayout.toLocaleString('vi-VN')} đ
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 4 }}>
                            Đã giải ngân: {totalMerchantWithdrawn.toLocaleString('vi-VN')}đ • Còn phải trả: <strong style={{ color: '#0F172A' }}>{totalMerchantRemaining.toLocaleString('vi-VN')}đ</strong>
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            QUỸ ĐỐI TÁC TÀI XẾ (85% CƯỚC + BỒI HOÀN)
                          </div>
                          <div style={{ fontSize: '1.42rem', fontWeight: 800, color: '#0284C7', marginTop: 6 }}>
                            {totalDriverAvailable.toLocaleString('vi-VN')} đ
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 4 }}>
                            Thu ròng: {totalDriverNet85.toLocaleString('vi-VN')}đ • Phạt: {totalDriverPenalties.toLocaleString('vi-VN')}đ • Đã rút: {totalDriverWithdrawn.toLocaleString('vi-VN')}đ
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            DOANH THU RÒNG QUỸ SÀN DINEGO
                          </div>
                          <div style={{ fontSize: '1.42rem', fontWeight: 800, color: '#4F46E5', marginTop: 6 }}>
                            {adminSystem.platformRevenue.toLocaleString('vi-VN')} đ
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 4 }}>
                            Phí quán {totalCommission.toLocaleString('vi-VN')}đ • Phí ship {adminSystem.driverShippingCommission.toLocaleString('vi-VN')}đ • Khấu trừ lỗi quán {totalRefundDeducted.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Unified Minimalist Control Bar for Financial Reconciliation & Withdrawals */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '14px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Sổ cái Đối soát Công nợ &amp; Phê duyệt Giải ngân
                    </h3>
                    <p style={{ fontSize: '0.77rem', color: '#64748B', margin: '2px 0 0 0' }}>
                      Kiểm soát dòng tiền thực nhận của Nhà hàng, Tài xế và Quỹ sàn DineGo
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#F1F5F9',
                      padding: 3,
                      borderRadius: 8,
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    {[
                      {
                        id: 'MONTHLY_LEDGER' as const,
                        label: `Đối soát công nợ nhà hàng (${filteredReconciliations.length})`,
                        pending: filteredReconciliations.filter((r) => r.status === 'PENDING').length,
                      },
                      {
                        id: 'MERCHANT_WITHDRAWALS' as const,
                        label: `Lệnh rút tiền Nhà hàng (${merchantWithdrawals.length})`,
                        pending: merchantWithdrawals.filter((w) => w.status === 'PENDING').length,
                      },
                      {
                        id: 'DRIVER_WITHDRAWALS' as const,
                        label: `Lệnh rút tiền Tài xế (${driverWithdrawals.length})`,
                        pending: driverWithdrawals.filter((w) => w.status === 'PENDING').length,
                      },
                    ].map((tab) => {
                      const active = adminReconciliationSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAdminReconciliationSubTab(tab.id)}
                          style={{
                            padding: '5px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: active ? '#FFFFFF' : 'transparent',
                            color: active ? '#0F172A' : '#64748B',
                            fontWeight: active ? 600 : 500,
                            fontSize: '0.78rem',
                            boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                          }}
                        >
                          <span>{tab.label}</span>
                          {tab.pending > 0 && (
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: 999,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: '#FFFBEB',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                              }}
                            >
                              {tab.pending} chờ
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SUB-TAB 1: MONTHLY PARTNER DEBT RECONCILIATION & PAYOUT TABLE */}
                {adminReconciliationSubTab === 'MONTHLY_LEDGER' && (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Bảng đối soát công nợ &amp; giải ngân đối tác cuối tháng
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                          Đồng bộ trực tiếp với các lệnh rút tiền trực tuyến của quán — ngăn chặn tuyệt đối việc chi trả trùng lặp
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 3, borderRadius: 8, gap: 2 }}>
                          {[
                            { id: 'ALL' as const, label: 'Tất cả' },
                            { id: 'PENDING' as const, label: 'Còn công nợ' },
                            { id: 'PAID' as const, label: 'Đã tất toán' },
                          ].map((st) => {
                            const active = adminReconciliationStatusFilter === st.id;
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => setAdminReconciliationStatusFilter(st.id)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: active ? '#FFFFFF' : 'transparent',
                                  color: active ? '#0F172A' : '#64748B',
                                  fontSize: '0.76rem',
                                  fontWeight: active ? 600 : 500,
                                  boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {st.label}
                              </button>
                            );
                          })}
                        </div>

                        <select
                          value={reconciliationPeriodFilter}
                          onChange={(e) => setReconciliationPeriodFilter(e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            fontSize: '0.79rem',
                            fontWeight: 600,
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

                        <input
                          type="text"
                          placeholder="Tìm tên nhà hàng, STK..."
                          value={adminReconciliationSearch}
                          onChange={(e) => setAdminReconciliationSearch(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            fontSize: '0.79rem',
                            color: '#0F172A',
                            width: 190,
                            outline: 'none',
                          }}
                        />

                        <button
                          type="button"
                          onClick={handleExportCsv}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 8,
                            background: '#0F172A',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Download size={14} /> Xuất CSV
                        </button>
                        <button
                          type="button"
                          onClick={handleExportPdf}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 8,
                            background: '#DC2626',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Printer size={14} /> Xuất PDF
                        </button>
                      </div>
                    </div>

                    {/* Clear Financial Formula Callout */}
                    <div
                      style={{
                        padding: '10px 22px',
                        background: '#FAFAFA',
                        borderBottom: '1px solid #E2E8F0',
                        fontSize: '0.77rem',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <span>
                        <strong>Công thức hạch toán chuẩn:</strong> Còn phải giải ngân = Doanh thu gộp (Món + Tiệc) trừ Chiết khấu sàn ({platformCommissionRate}%) trừ Khấu trừ lỗi quán trừ Số tiền quán đã rút trước.
                      </span>
                      <span style={{ color: '#0284C7', fontWeight: 600 }}>
                        * Phí giao hàng (Thu hộ) được tách riêng vào Ví Tài xế (85%) &amp; Phí điều phối sàn (15%).
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto', width: '100%' }}>
                      <table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse', fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '12%' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.71rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <th style={{ padding: '11px 16px' }}>Đối tác Nhà hàng &amp; Kỳ</th>
                            <th style={{ padding: '11px 12px' }}>Sản lượng</th>
                            <th style={{ padding: '11px 12px' }}>Doanh thu gộp</th>
                            <th style={{ padding: '11px 12px' }}>Chiết khấu sàn ({platformCommissionRate}%)</th>
                            <th style={{ padding: '11px 12px' }}>Bồi hoàn &amp; Phí ship</th>
                            <th style={{ padding: '11px 12px' }}>Thực nhận ròng &amp; Đã rút</th>
                            <th style={{ padding: '11px 16px', textAlign: 'right' }}>Còn phải trả &amp; Quyết toán</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReconciliations
                            .filter((r) => {
                              if (adminReconciliationStatusFilter === 'PENDING' && r.status !== 'PENDING') return false;
                              if (adminReconciliationStatusFilter === 'PAID' && r.status !== 'PAID') return false;
                              const q = adminReconciliationSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                r.merchantName.toLowerCase().includes(q) ||
                                r.bankAccount.toLowerCase().includes(q)
                              );
                            })
                            .map((r) => (
                              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 16px', overflow: 'hidden' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', overflow: 'hidden' }}>
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        color: '#475569',
                                        background: '#F1F5F9',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {r.period}
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: '#0F172A',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        minWidth: 0,
                                        flex: 1,
                                      }}
                                      title={r.merchantName}
                                    >
                                      {r.merchantName}
                                    </span>
                                  </div>
                                  <div
                                    title={r.bankAccount}
                                    style={{
                                      fontSize: '0.72rem',
                                      color: '#64748B',
                                      marginTop: 3,
                                      width: '100%',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {r.bankAccount}
                                  </div>
                                </td>
                                <td style={{ padding: '12px 12px', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {r.foodOrdersCount > 0 && r.feastContractsCount > 0
                                    ? `${r.foodOrdersCount} đơn • ${r.feastContractsCount} tiệc`
                                    : r.feastContractsCount > 0
                                    ? `${r.feastContractsCount} hợp đồng tiệc`
                                    : `${r.foodOrdersCount} đơn món`}
                                </td>
                                <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                  {r.grossRevenue.toLocaleString('vi-VN')}đ
                                </td>
                                <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: 600, color: '#4F46E5' }}>
                                    {r.commission15.toLocaleString('vi-VN')}đ
                                  </div>
                                  <div style={{ fontSize: '0.69rem', color: '#94A3B8' }}>Thu về quỹ sàn</div>
                                </td>
                                <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: 600, color: r.refundDeducted > 0 ? '#D97706' : '#64748B' }}>
                                    Bồi hoàn: {r.refundDeducted.toLocaleString('vi-VN')}đ
                                  </div>
                                  <div style={{ fontSize: '0.69rem', color: '#0284C7', fontWeight: 500 }}>
                                    Ship thu hộ: {r.shippingFee.toLocaleString('vi-VN')}đ
                                  </div>
                                </td>
                                <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: 600, color: '#0F172A' }}>
                                    Ròng: {r.netPayout85.toLocaleString('vi-VN')}đ
                                  </div>
                                  <div style={{ fontSize: '0.69rem', color: '#64748B' }}>
                                    Đã rút: {r.withdrawnApproved.toLocaleString('vi-VN')}đ
                                  </div>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ color: r.remainingPayout > 0 ? '#15803D' : '#64748B', fontWeight: 700, fontSize: '0.86rem', marginBottom: 4 }}>
                                    {r.remainingPayout.toLocaleString('vi-VN')}đ
                                  </div>
                                  {r.status === 'NO_BALANCE' ? (
                                    <span style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 500 }}>
                                      Chưa phát sinh
                                    </span>
                                  ) : r.status === 'PAID' ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        background: '#F0FDF4',
                                        color: '#15803D',
                                        border: '1px solid #DCFCE7',
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        fontSize: '0.71rem',
                                        fontWeight: 600,
                                      }}
                                    >
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
                                      Đã tất toán đủ
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmPayout(r.id)}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        fontSize: '0.73rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Tất toán ngay
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: MERCHANT ON-DEMAND WITHDRAWAL REQUESTS */}
                {adminReconciliationSubTab === 'MERCHANT_WITHDRAWALS' && (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Yêu cầu Rút Doanh thu Trực tuyến của Nhà hàng
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                          Hệ thống tự động kiểm tra số dư khả dụng thực tế của quán trước khi cho phép duyệt giải ngân
                        </p>
                      </div>
                      <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 3, borderRadius: 8, gap: 2 }}>
                        {[
                          { id: 'ALL' as const, label: `Tất cả (${merchantWithdrawals.length})` },
                          { id: 'PENDING' as const, label: `Chờ duyệt (${merchantWithdrawals.filter((w) => w.status === 'PENDING').length})` },
                          { id: 'APPROVED' as const, label: `Đã giải ngân (${merchantWithdrawals.filter((w) => w.status === 'APPROVED').length})` },
                          { id: 'REJECTED' as const, label: `Đã từ chối (${merchantWithdrawals.filter((w) => w.status === 'REJECTED').length})` },
                        ].map((tab) => {
                          const active = adminWithdrawalFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setAdminWithdrawalFilter(tab.id)}
                              style={{
                                padding: '5px 11px',
                                borderRadius: 6,
                                border: 'none',
                                background: active ? '#FFFFFF' : 'transparent',
                                color: active ? '#0F172A' : '#64748B',
                                fontSize: '0.75rem',
                                fontWeight: active ? 600 : 500,
                                boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                        <thead>
                          <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
                            <th style={{ padding: '11px 20px' }}>Nhà hàng</th>
                            <th style={{ padding: '11px 16px' }}>Tài khoản nhận</th>
                            <th style={{ padding: '11px 16px' }}>Số tiền yêu cầu rút</th>
                            <th style={{ padding: '11px 16px' }}>Số dư khả dụng của quán</th>
                            <th style={{ padding: '11px 16px' }}>Thời gian &amp; Ghi chú</th>
                            <th style={{ padding: '11px 16px' }}>Trạng thái</th>
                            <th style={{ padding: '11px 20px', textAlign: 'right' }}>Phê duyệt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {merchantWithdrawals.filter((w) => adminWithdrawalFilter === 'ALL' || w.status === adminWithdrawalFilter).length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: '36px 24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                                Chưa có yêu cầu rút doanh thu nào từ các đối tác nhà hàng theo bộ lọc này.
                              </td>
                            </tr>
                          ) : (
                            merchantWithdrawals
                              .filter((w) => adminWithdrawalFilter === 'ALL' || w.status === adminWithdrawalFilter)
                              .map((w) => {
                                const merchantObj = allMerchants.find((m) => m.id === w.merchantId);
                                const fin = merchantObj ? computeMerchantFinancials(merchantObj, 'ALL') : null;
                                return (
                                  <tr key={w.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '13px 20px', fontWeight: 600, color: '#0F172A' }}>
                                      {w.merchantName}
                                    </td>
                                    <td style={{ padding: '13px 16px', color: '#334155' }}>
                                      <div><strong>{w.bankName}</strong> • {w.bankAccountNumber}</div>
                                      <div style={{ fontSize: '0.73rem', color: '#64748B' }}>{w.bankAccountHolder}</div>
                                    </td>
                                    <td style={{ padding: '13px 16px', fontWeight: 700, color: '#15803D' }}>
                                      {w.amount.toLocaleString('vi-VN')}đ
                                    </td>
                                    <td style={{ padding: '13px 16px', color: '#475569' }}>
                                      {fin ? (
                                        <div>
                                          <strong style={{ color: '#0F172A' }}>{fin.remainingPayout.toLocaleString('vi-VN')}đ</strong>
                                          <div style={{ fontSize: '0.71rem', color: '#64748B' }}>
                                            Tổng ròng: {fin.netPayout85.toLocaleString('vi-VN')}đ
                                          </div>
                                        </div>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td style={{ padding: '13px 16px', color: '#64748B', fontSize: '0.77rem' }}>
                                      <div>{w.createdAt}</div>
                                      {w.note && <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{w.note}</div>}
                                    </td>
                                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '3px 9px',
                                          borderRadius: 999,
                                          fontSize: '0.73rem',
                                          fontWeight: 600,
                                          background:
                                            w.status === 'APPROVED'
                                              ? '#F0FDF4'
                                              : w.status === 'REJECTED'
                                              ? '#FEF2F2'
                                              : '#FFFBEB',
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
                                    <td style={{ padding: '13px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                      {w.status === 'PENDING' ? (
                                        <div style={{ display: 'inline-flex', gap: 6 }}>
                                          <button
                                            type="button"
                                            onClick={() => handleProcessMerchantWithdrawal(w.id, 'APPROVED')}
                                            style={{
                                              padding: '5px 12px',
                                              borderRadius: 6,
                                              background: '#0F172A',
                                              color: '#FFFFFF',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              border: 'none',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Duyệt giải ngân
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleProcessMerchantWithdrawal(w.id, 'REJECTED')}
                                            style={{
                                              padding: '5px 10px',
                                              borderRadius: 6,
                                              background: '#FFFFFF',
                                              color: '#DC2626',
                                              border: '1px solid #FECACA',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Từ chối
                                          </button>
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                          {w.processedAt || 'Đã xử lý'}
                                        </span>
                                      )}
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

                {/* SUB-TAB 3: DRIVER WITHDRAWAL REQUESTS */}
                {adminReconciliationSubTab === 'DRIVER_WITHDRAWALS' && (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Yêu cầu Rút tiền về Ngân hàng của Tài xế
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                          Đối chiếu số dư ví cước thực nhận (85% cước + bồi hoàn bom hàng trừ phạt sự cố) trước khi giải ngân
                        </p>
                      </div>
                      <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 3, borderRadius: 8, gap: 2 }}>
                        {[
                          { id: 'ALL' as const, label: `Tất cả (${driverWithdrawals.length})` },
                          { id: 'PENDING' as const, label: `Chờ duyệt (${driverWithdrawals.filter((w) => w.status === 'PENDING').length})` },
                          { id: 'APPROVED' as const, label: `Đã giải ngân (${driverWithdrawals.filter((w) => w.status === 'APPROVED').length})` },
                          { id: 'REJECTED' as const, label: `Đã từ chối (${driverWithdrawals.filter((w) => w.status === 'REJECTED').length})` },
                        ].map((tab) => {
                          const active = adminWithdrawalFilter === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setAdminWithdrawalFilter(tab.id)}
                              style={{
                                padding: '5px 11px',
                                borderRadius: 6,
                                border: 'none',
                                background: active ? '#FFFFFF' : 'transparent',
                                color: active ? '#0F172A' : '#64748B',
                                fontSize: '0.75rem',
                                fontWeight: active ? 600 : 500,
                                boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                        <thead>
                          <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
                            <th style={{ padding: '11px 20px' }}>Tài xế</th>
                            <th style={{ padding: '11px 16px' }}>Tài khoản nhận</th>
                            <th style={{ padding: '11px 16px' }}>Số tiền yêu cầu rút</th>
                            <th style={{ padding: '11px 16px' }}>Số dư ví hiện tại</th>
                            <th style={{ padding: '11px 16px' }}>Thời gian gửi</th>
                            <th style={{ padding: '11px 16px' }}>Trạng thái</th>
                            <th style={{ padding: '11px 20px', textAlign: 'right' }}>Phê duyệt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverWithdrawals.filter((w) => adminWithdrawalFilter === 'ALL' || w.status === adminWithdrawalFilter).length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: '36px 24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                                Chưa có yêu cầu rút tiền nào từ đội ngũ tài xế theo bộ lọc này.
                              </td>
                            </tr>
                          ) : (
                            driverWithdrawals
                              .filter((w) => adminWithdrawalFilter === 'ALL' || w.status === adminWithdrawalFilter)
                              .map((w) => {
                                const drvObj = driversList.find((d) => d.id === w.driverId);
                                return (
                                  <tr key={w.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '13px 20px' }}>
                                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{w.driverName}</div>
                                      <div style={{ fontSize: '0.73rem', color: '#64748B' }}>{w.driverPhone} • {w.licensePlate}</div>
                                    </td>
                                    <td style={{ padding: '13px 16px', color: '#334155' }}>
                                      <div><strong>{w.bankName}</strong> • {w.bankAccountNumber}</div>
                                      <div style={{ fontSize: '0.73rem', color: '#64748B' }}>{w.bankAccountHolder}</div>
                                    </td>
                                    <td style={{ padding: '13px 16px', fontWeight: 700, color: '#0284C7' }}>
                                      {w.amount.toLocaleString('vi-VN')}đ
                                    </td>
                                    <td style={{ padding: '13px 16px', color: '#475569' }}>
                                      {drvObj ? (
                                        <div>
                                          <strong style={{ color: '#0F172A' }}>{drvObj.availableWalletBalance.toLocaleString('vi-VN')}đ</strong>
                                          <div style={{ fontSize: '0.71rem', color: '#64748B' }}>
                                            Thu ròng: {drvObj.netShippingIncome85.toLocaleString('vi-VN')}đ
                                          </div>
                                        </div>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td style={{ padding: '13px 16px', color: '#64748B', fontSize: '0.77rem' }}>{w.createdAt}</td>
                                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '3px 9px',
                                          borderRadius: 999,
                                          fontSize: '0.73rem',
                                          fontWeight: 600,
                                          background:
                                            w.status === 'APPROVED'
                                              ? '#F0FDF4'
                                              : w.status === 'REJECTED'
                                              ? '#FEF2F2'
                                              : '#FFFBEB',
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
                                    <td style={{ padding: '13px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                      {w.status === 'PENDING' ? (
                                        <div style={{ display: 'inline-flex', gap: 6 }}>
                                          <button
                                            type="button"
                                            onClick={() => handleProcessDriverWithdrawal(w.id, 'APPROVED')}
                                            style={{
                                              padding: '5px 12px',
                                              borderRadius: 6,
                                              background: '#0F172A',
                                              color: '#FFFFFF',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              border: 'none',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Duyệt giải ngân
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleProcessDriverWithdrawal(w.id, 'REJECTED')}
                                            style={{
                                              padding: '5px 10px',
                                              borderRadius: 6,
                                              background: '#FFFFFF',
                                              color: '#DC2626',
                                              border: '1px solid #FECACA',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Từ chối
                                          </button>
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                          {w.processedAt || 'Đã xử lý'}
                                        </span>
                                      )}
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
              </div>
            )}

            {/* ADMIN TAB 5B: DEDICATED VOUCHERS & PROMOTIONS CENTER */}
            {currentAdminTab === 'admin-vouchers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Top Summary KPI Cards for Vouchers (Unified Minimalist Style) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 14,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      VOUCHER TOÀN SÀN DINEGO
                    </div>
                    <div style={{ fontSize: '1.42rem', fontWeight: 800, color: '#0F172A', marginTop: 6 }}>
                      {vouchers.filter((v) => !v.merchantId || v.merchantId === 'ALL').length} mã
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 4 }}>
                      Áp dụng cho mọi cửa hàng trên hệ thống
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      VOUCHER ĐỘC QUYỀN CÁC QUÁN
                    </div>
                    <div style={{ fontSize: '1.42rem', fontWeight: 800, color: '#0F172A', marginTop: 6 }}>
                      {vouchers.filter((v) => v.merchantId && v.merchantId !== 'ALL').length} mã
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 4 }}>
                      Phát hành riêng theo từng đối tác nhà hàng
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      ĐANG HIỂN THỊ TRÊN SĂN VOUCHER
                    </div>
                    <div style={{ fontSize: '1.42rem', fontWeight: 800, color: '#15803D', marginTop: 6 }}>
                      {vouchers.filter((v) => v.isActive && v.isFlashHunt !== false).length} mã
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 4 }}>
                      Khách hàng có thể săn trực tiếp tại trang chủ
                    </div>
                  </div>
                </div>

                {/* Unified Minimalist Control Bar for Vouchers */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '16px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        Danh mục Kho Khuyến Mãi &amp; Phát Hành Voucher Sự Kiện
                      </h3>
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                        {vouchers.length} mã
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Quản lý tập trung toàn bộ mã giảm giá toàn sàn và mã khuyến mãi của từng cửa hàng
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 3, borderRadius: 8, gap: 2 }}>
                      {[
                        { id: 'ALL' as const, label: `Tất cả (${vouchers.length})` },
                        {
                          id: 'PLATFORM' as const,
                          label: `Toàn sàn (${vouchers.filter((v) => !v.merchantId || v.merchantId === 'ALL').length})`,
                        },
                        {
                          id: 'MERCHANT' as const,
                          label: `Của quán (${vouchers.filter((v) => v.merchantId && v.merchantId !== 'ALL').length})`,
                        },
                      ].map((tab) => {
                        const active = adminVoucherScopeFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setAdminVoucherScopeFilter(tab.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 6,
                              border: 'none',
                              background: active ? '#FFFFFF' : 'transparent',
                              color: active ? '#0F172A' : '#64748B',
                              fontSize: '0.76rem',
                              fontWeight: active ? 600 : 500,
                              boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <select
                      value={adminVoucherMerchantFilter}
                      onChange={(e) => setAdminVoucherMerchantFilter(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: '#F8FAFC',
                        color: '#0F172A',
                      }}
                    >
                      <option value="ALL">Tất cả nhà hàng</option>
                      {allMerchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Tìm mã voucher, tên quán..."
                      value={adminVoucherSearch}
                      onChange={(e) => setAdminVoucherSearch(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                        background: '#F8FAFC',
                        fontSize: '0.79rem',
                        color: '#0F172A',
                        width: 195,
                        outline: 'none',
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setEditingAdminVoucherId(null);
                        setNewVoucherCode('');
                        setShowAdminVoucherForm(true);
                      }}
                      style={{
                        padding: '7px 15px',
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(0, 177, 79, 0.28)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Ticket size={15} />
                      + Phát hành Voucher
                    </button>
                  </div>
                </div>

                {/* Pop-up Modal: Tạo mới / Cập nhật Voucher (Dạng Pop-up nổi, không đè vào bảng) */}
                {(showAdminVoucherForm || editingAdminVoucherId) && (
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(11, 17, 32, 0.72)',
                      backdropFilter: 'blur(5px)',
                      zIndex: 99999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                    }}
                    onClick={() => {
                      setEditingAdminVoucherId(null);
                      setNewVoucherCode('');
                      setShowAdminVoucherForm(false);
                    }}
                  >
                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: 760,
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        animation: 'adminVoucherModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <style>
                        {`
                          @keyframes adminVoucherModalPop {
                            0% { transform: scale(0.93) translateY(14px); opacity: 0; }
                            100% { transform: scale(1) translateY(0); opacity: 1; }
                          }
                        `}
                      </style>

                      {/* Modal Header */}
                      <div
                        style={{
                          padding: '18px 24px',
                          borderBottom: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#F8FAFC',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 3px 10px rgba(0, 177, 79, 0.3)',
                            }}
                          >
                            <Ticket size={20} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0F172A' }}>
                              {editingAdminVoucherId ? 'Cập Nhật Chiến Dịch Voucher' : 'Phát Hành Voucher / Mã Khuyến Mãi Mới'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                              Cấu hình ưu đãi, áp dụng toàn sàn hoặc cho quán ăn đối tác chỉ định
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingAdminVoucherId(null);
                            setNewVoucherCode('');
                            setShowAdminVoucherForm(false);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: 6,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F1F5F9';
                            e.currentTarget.style.color = '#0F172A';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#94A3B8';
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Modal Form Body */}
                      <form onSubmit={handleAddVoucher} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        <div
                          style={{
                            padding: '24px 26px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: 16,
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
                              <option value="ALL">Toàn sàn DineGo (Mọi quán)</option>
                              {allMerchants.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
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
                              min="0"
                              step={newVoucherType === 'PERCENTAGE' ? 5 : 5000}
                              value={newVoucherDiscount}
                              onChange={(e) => setNewVoucherDiscount(Math.max(0, Number(e.target.value)))}
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
                                min="0"
                                step="5000"
                                value={newVoucherMaxDiscount}
                                onChange={(e) => setNewVoucherMaxDiscount(Math.max(0, Number(e.target.value)))}
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
                              min="0"
                              step="10000"
                              value={newVoucherMinOrder}
                              onChange={(e) => setNewVoucherMinOrder(Math.max(0, Number(e.target.value)))}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.84rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                              Tổng lượt săn / dùng
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="50"
                              value={newVoucherMaxUsage}
                              onChange={(e) => setNewVoucherMaxUsage(Math.max(1, Number(e.target.value)))}
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
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={newVoucherFlashHunt}
                                onChange={(e) => setNewVoucherFlashHunt(e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: '#00B14F' }}
                              />
                              Đưa lên mục Săn Voucher
                            </label>
                          </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div
                          style={{
                            padding: '16px 26px',
                            borderTop: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 12,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAdminVoucherId(null);
                              setNewVoucherCode('');
                              setShowAdminVoucherForm(false);
                            }}
                            style={{
                              padding: '9px 18px',
                              borderRadius: 8,
                              background: '#FFFFFF',
                              color: '#475569',
                              fontWeight: 600,
                              fontSize: '0.84rem',
                              border: '1px solid #CBD5E1',
                              cursor: 'pointer',
                            }}
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            style={{
                              padding: '9px 22px',
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(0, 177, 79, 0.3)',
                            }}
                          >
                            {editingAdminVoucherId ? 'Lưu cập nhật' : 'Phát hành ngay'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Main Voucher Directory Card */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '11px 18px' }}>Mã Voucher</th>
                          <th style={{ padding: '11px 14px' }}>Sự kiện / Lễ</th>
                          <th style={{ padding: '11px 14px' }}>Phạm vi áp dụng</th>
                          <th style={{ padding: '11px 14px' }}>Mức giảm &amp; Điều kiện</th>
                          <th style={{ padding: '11px 14px' }}>Đã săn / Dùng / Tổng</th>
                          <th style={{ padding: '11px 14px' }}>Hạn dùng</th>
                          <th style={{ padding: '11px 14px' }}>Trạng thái</th>
                          <th style={{ padding: '11px 18px', textAlign: 'right' }}>Thao tác</th>
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
                                <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0F172A', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'nowrap' }}>
                                  {v.code}
                                </td>
                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                  <span
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: 6,
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      background: '#F1F5F9',
                                      color: '#334155',
                                    }}
                                  >
                                    {v.eventTag || evStyle.label}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px', maxWidth: 200, overflow: 'hidden' }}>
                                  <div
                                    title={isShop ? v.merchantName : 'Toàn sàn DineGo'}
                                    style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      color: isShop ? '#0F172A' : '#4F46E5',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {isShop ? v.merchantName : 'Toàn sàn DineGo'}
                                  </div>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155', maxWidth: 260, overflow: 'hidden' }}>
                                  <div style={{ fontWeight: 700, color: '#15803D', whiteSpace: 'nowrap' }}>
                                    {v.discountType === 'PERCENTAGE'
                                      ? `Giảm ${v.discountValue}%${v.maxDiscountAmount ? ` (Tối đa ${(v.maxDiscountAmount / 1000).toFixed(0)}k)` : ''}`
                                      : `Giảm ${v.discountValue.toLocaleString('vi-VN')}đ`}
                                  </div>
                                  <div
                                    title={v.title}
                                    style={{
                                      fontSize: '0.73rem',
                                      color: '#64748B',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    Đơn tối thiểu {v.minOrder.toLocaleString('vi-VN')}đ
                                  </div>
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                  <div style={{ color: '#0F172A' }}>Săn: {v.claimedCount ?? 0} / {v.maxUsage}</div>
                                  <div style={{ fontSize: '0.73rem', color: '#64748B' }}>Đã dùng: {v.usageCount}</div>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{v.endDate}</td>
                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '3px 9px',
                                      borderRadius: 999,
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      background: v.isActive ? '#F0FDF4' : '#F1F5F9',
                                      color: v.isActive ? '#15803D' : '#64748B',
                                      border: v.isActive ? '1px solid #DCFCE7' : '1px solid #E2E8F0',
                                    }}
                                  >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.isActive ? '#16A34A' : '#94A3B8' }} />
                                    {v.isActive ? 'Đang kích hoạt' : 'Tạm dừng'}
                                  </span>
                                  <div style={{ fontSize: '0.69rem', color: v.isFlashHunt !== false ? '#64748B' : '#94A3B8', marginTop: 3 }}>
                                    {v.isFlashHunt !== false ? 'Hiển thị Săn Voucher' : 'Ẩn khỏi Săn Voucher'}
                                  </div>
                                </td>
                                <td style={{ padding: '12px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'inline-flex', gap: 5, justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditAdminVoucher(v)}
                                      style={{
                                        padding: '5px 10px',
                                        borderRadius: 6,
                                        border: '1px solid #E2E8F0',
                                        background: '#F8FAFC',
                                        color: '#0F172A',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
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
                                        border: '1px solid #E2E8F0',
                                        background: '#FFFFFF',
                                        color: '#475569',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
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
                                        border: '1px solid #E2E8F0',
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
                                      type="button"
                                      onClick={() => handleDeleteVoucher(v.id, v.code)}
                                      style={{
                                        padding: '5px 8px',
                                        borderRadius: 6,
                                        border: '1px solid #E2E8F0',
                                        background: '#FFFFFF',
                                        color: '#64748B',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#FECACA';
                                        e.currentTarget.style.background = '#FEF2F2';
                                        e.currentTarget.style.color = '#DC2626';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#E2E8F0';
                                        e.currentTarget.style.background = '#FFFFFF';
                                        e.currentTarget.style.color = '#64748B';
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

            {/* ADMIN TAB: AI LOCAL CULINARY KNOWLEDGE BASE (RAG CRUD - SQL SERVER) */}
            {currentAdminTab === 'admin-knowledge' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Quản trị Cơ sở Tri thức AI (RAG Knowledge Base)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
                        Quản lý trực tiếp các đoạn tri thức ẩm thực trong bảng <code>knowledge_base_vectors</code> (SQL Server) phục vụ trợ lý DineGo Guide
                      </p>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '5px 12px', borderRadius: 999 }}>
                      {knowledgeChunks.length} đoạn tri thức đang hoạt động
                    </span>
                  </div>

                  <form onSubmit={handleAddKnowledgeChunk} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Nguồn / Chủ đề tri thức (VD: Cẩm nang ẩm thực Quận 1 TP.HCM)"
                        value={kbSourceInput}
                        onChange={(e) => setKbSourceInput(e.target.value)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          fontSize: '0.84rem',
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={kbSaving || !kbContentInput.trim()}
                        style={{
                          padding: '9px 18px',
                          borderRadius: 8,
                          background: kbSaving || !kbContentInput.trim() ? '#CBD5E1' : '#0F172A',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.83rem',
                          border: 'none',
                          cursor: kbSaving || !kbContentInput.trim() ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {kbSaving ? 'Đang lưu...' : '+ Thêm đoạn tri thức'}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Nhập nội dung tri thức chi tiết về món ăn, quán đặc sản, quy định đặt mâm cỗ..."
                      value={kbContentInput}
                      onChange={(e) => setKbContentInput(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '0.84rem',
                        color: '#0F172A',
                        resize: 'vertical',
                        outline: 'none',
                      }}
                    />
                  </form>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '18px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Danh sách Tri thức trong SQL Server
                    </h4>
                    <input
                      type="text"
                      placeholder="Tìm theo nguồn hoặc nội dung..."
                      value={kbSearchQuery}
                      onChange={(e) => setKbSearchQuery(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                        background: '#F8FAFC',
                        fontSize: '0.8rem',
                        width: 240,
                        outline: 'none',
                      }}
                    />
                  </div>

                  {knowledgeChunks.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: '0.86rem' }}>
                      Chưa có đoạn tri thức nào trong cơ sở dữ liệu. Hãy thêm đoạn tri thức mới ở khung phía trên!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {knowledgeChunks
                        .filter((k) => {
                          const q = kbSearchQuery.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            k.source.toLowerCase().includes(q) ||
                            k.content.toLowerCase().includes(q)
                          );
                        })
                        .map((k) => (
                          <div
                            key={k.id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 10,
                              border: '1px solid #E2E8F0',
                              background: '#F8FAFC',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 14,
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4F46E5', background: '#EEF2FF', padding: '2px 8px', borderRadius: 6 }}>
                                  {k.source}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                  {k.authorName} • {k.createdAt || 'Mới tạo'}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#1E293B', lineHeight: 1.5 }}>
                                {k.content}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteKnowledgeChunk(k.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid #FECACA',
                                background: '#FFFFFF',
                                color: '#DC2626',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ADMIN TAB 6: USERS & ROLE MANAGEMENT — ARCHITECTURAL 3-COLUMN DIRECTORY */}
            {currentAdminTab === 'admin-users' &&
              (() => {
                // Exclude ADMIN accounts; filter by search & active/locked status
                const nonAdminUsers = allUsersList.filter((u) => !u.roles.includes('ADMIN'));
                const matchesUserFilter = (u: (typeof allUsersList)[number]) => {
                  const isLocked = u.isActive === false;
                  if (adminUserStatusFilter === 'ACTIVE' && isLocked) return false;
                  if (adminUserStatusFilter === 'LOCKED' && !isLocked) return false;

                  const q = userSearchTerm.trim().toLowerCase();
                  if (!q) return true;
                  const linkedStore = u.merchantId ? allMerchants.find((m) => m.id === u.merchantId) : null;
                  const linkedDrv = u.driverId ? allDriversList.find((d) => d.id === u.driverId) : null;
                  return (
                    u.fullName.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    Boolean(u.phoneNumber && u.phoneNumber.includes(q)) ||
                    Boolean(linkedStore && linkedStore.name.toLowerCase().includes(q)) ||
                    Boolean(linkedDrv && linkedDrv.licensePlate.toLowerCase().includes(q))
                  );
                };

                const filteredNonAdmin = nonAdminUsers.filter(matchesUserFilter);
                const customerAccounts = filteredNonAdmin.filter((u) => u.roles.includes('CUSTOMER'));
                const merchantAccounts = filteredNonAdmin.filter((u) => u.roles.includes('MERCHANT'));
                const driverAccounts = filteredNonAdmin.filter((u) => u.roles.includes('DRIVER'));

                const roleColumns = [
                  {
                    index: '01',
                    key: 'CUSTOMER' as const,
                    title: 'Khách hàng',
                    subtitle: 'Tài khoản cá nhân',
                    users: customerAccounts,
                  },
                  {
                    index: '02',
                    key: 'MERCHANT' as const,
                    title: 'Nhà hàng',
                    subtitle: 'Đối tác gian hàng & bếp tiệc',
                    users: merchantAccounts,
                  },
                  {
                    index: '03',
                    key: 'DRIVER' as const,
                    title: 'Tài xế',
                    subtitle: 'Đội ngũ giao nhận',
                    users: driverAccounts,
                  },
                ];

                return (
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Minimalist Editorial Header Bar */}
                    <div
                      style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid #E2E8F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                        <h3
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#0F172A',
                            margin: 0,
                            letterSpacing: -0.2,
                          }}
                        >
                          Danh bạ Tài khoản Hệ thống
                        </h3>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: '#64748B',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {nonAdminUsers.length} tài khoản ({nonAdminUsers.filter((u) => u.isActive !== false).length} hoạt động
                          {nonAdminUsers.some((u) => u.isActive === false)
                            ? ` · ${nonAdminUsers.filter((u) => u.isActive === false).length} đã khóa`
                            : ''}
                          )
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {/* Clean Segmented Status Filter */}
                        <div
                          style={{
                            display: 'inline-flex',
                            background: '#F1F5F9',
                            padding: 3,
                            borderRadius: 7,
                            gap: 2,
                          }}
                        >
                          {[
                            { id: 'ALL' as const, label: 'Tất cả' },
                            { id: 'ACTIVE' as const, label: 'Hoạt động' },
                            { id: 'LOCKED' as const, label: 'Đã khóa' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setAdminUserStatusFilter(st.id)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 5,
                                border: 'none',
                                background: adminUserStatusFilter === st.id ? '#FFFFFF' : 'transparent',
                                color: adminUserStatusFilter === st.id ? '#0F172A' : '#64748B',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                boxShadow:
                                  adminUserStatusFilter === st.id ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>

                        {/* Minimal Search Field */}
                        <div style={{ position: 'relative', width: 250 }}>
                          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 11, top: 9 }} />
                          <input
                            type="text"
                            placeholder="Tìm tên, email, SĐT, quán..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 12px 6px 32px',
                              borderRadius: 7,
                              border: '1px solid #E2E8F0',
                              fontSize: '0.8rem',
                              color: '#0F172A',
                              background: '#FAFAFA',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Architectural 3-Column Grid Divided by 1px Hairlines */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        alignItems: 'stretch',
                      }}
                    >
                      {roleColumns.map((col, colIdx) => {
                        const lockedInCol = col.users.filter((u) => u.isActive === false).length;

                        return (
                          <div
                            key={col.key}
                            style={{
                              borderRight: colIdx < 2 ? '1px solid #E2E8F0' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              minWidth: 0,
                              background: '#FFFFFF',
                            }}
                          >
                            {/* Column Typographic Header */}
                            <div
                              style={{
                                padding: '14px 20px',
                                background: '#FAFAFA',
                                borderBottom: '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#94A3B8',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  {col.index}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.88rem',
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {col.title}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#94A3B8',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  · {col.subtitle}
                                </span>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  flexShrink: 0,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {lockedInCol > 0 && (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      color: '#DC2626',
                                      background: '#FEF2F2',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {lockedInCol} khóa
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    color: '#475569',
                                    background: '#E2E8F0',
                                    padding: '1px 8px',
                                    borderRadius: 999,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {col.users.length}
                                </span>
                              </div>
                            </div>

                            {/* Flush Divided Account Rows */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: 'calc(100vh - 235px)',
                                overflowY: 'auto',
                              }}
                            >
                              {col.users.length === 0 ? (
                                <div
                                  style={{
                                    padding: '48px 20px',
                                    textAlign: 'center',
                                    color: '#94A3B8',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  Không có tài khoản phù hợp
                                </div>
                              ) : (
                                col.users.map((u) => {
                                  const linkedStore = u.merchantId
                                    ? allMerchants.find((m) => m.id === u.merchantId)
                                    : null;
                                  const linkedDrv = u.driverId
                                    ? allDriversList.find((d) => d.id === u.driverId)
                                    : null;
                                  const isLocked = u.isActive === false;

                                  const entitySubline =
                                    col.key === 'MERCHANT'
                                      ? linkedStore?.name || 'Đối tác gian hàng'
                                      : col.key === 'DRIVER'
                                      ? linkedDrv
                                        ? `${linkedDrv.licensePlate} · ${linkedDrv.operatingZone || linkedDrv.vehicleType}`
                                        : 'Đối tác tài xế'
                                      : null;

                                  const contactLine = `${u.email}${u.phoneNumber ? ` · ${u.phoneNumber}` : ''}`;

                                  return (
                                    <div
                                      key={`${col.key}-${u.id}`}
                                      style={{
                                        padding: '13px 20px',
                                        borderBottom: '1px solid #F1F5F9',
                                        background: isLocked ? '#FFFBFB' : '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        transition: 'background 0.12s ease',
                                        minWidth: 0,
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isLocked) e.currentTarget.style.background = '#F8FAFC';
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isLocked) e.currentTarget.style.background = '#FFFFFF';
                                      }}
                                    >
                                      {/* Left: Avatar with Subtle Corner Status Dot */}
                                      <div
                                        style={{
                                          position: 'relative',
                                          width: 34,
                                          height: 34,
                                          flexShrink: 0,
                                        }}
                                      >
                                        <img
                                          src={
                                            u.avatarUrl ||
                                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
                                          }
                                          alt={u.fullName}
                                          style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            display: 'block',
                                            filter: isLocked ? 'grayscale(0.7)' : 'none',
                                            opacity: isLocked ? 0.75 : 1,
                                          }}
                                        />
                                        <span
                                          title={isLocked ? 'Đang bị khóa' : 'Đang hoạt động'}
                                          style={{
                                            position: 'absolute',
                                            right: -1,
                                            bottom: -1,
                                            width: 9,
                                            height: 9,
                                            borderRadius: '50%',
                                            background: isLocked ? '#EF4444' : '#10B981',
                                            border: '2px solid #FFFFFF',
                                          }}
                                        />
                                      </div>

                                      {/* Center: Clean Typographic Hierarchy (Strictly Single-Line Truncated) */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            minWidth: 0,
                                          }}
                                        >
                                          <span
                                            title={u.fullName}
                                            style={{
                                              fontSize: '0.84rem',
                                              fontWeight: 600,
                                              color: isLocked ? '#64748B' : '#0F172A',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                            }}
                                          >
                                            {u.fullName}
                                          </span>
                                          {isLocked && (
                                            <span
                                              style={{
                                                fontSize: '0.66rem',
                                                fontWeight: 600,
                                                color: '#DC2626',
                                                background: '#FEE2E2',
                                                padding: '1px 5px',
                                                borderRadius: 4,
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                              }}
                                            >
                                              Đã khóa
                                            </span>
                                          )}
                                        </div>

                                        {entitySubline && (
                                          <div
                                            title={entitySubline}
                                            style={{
                                              fontSize: '0.76rem',
                                              fontWeight: 500,
                                              color: '#334155',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              marginTop: 1,
                                            }}
                                          >
                                            {entitySubline}
                                          </div>
                                        )}

                                        <div
                                          title={contactLine}
                                          style={{
                                            fontSize: '0.73rem',
                                            color: '#94A3B8',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            marginTop: 1,
                                            fontVariantNumeric: 'tabular-nums',
                                          }}
                                        >
                                          {contactLine}
                                        </div>
                                      </div>

                                      {/* Right: Restrained Action Button */}
                                      {onToggleUserStatus && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onToggleUserStatus(u.id);
                                            const nextActive = isLocked;
                                            if (u.merchantId) {
                                              setMerchantKycStatuses((prev) => ({
                                                ...prev,
                                                [u.merchantId!]: nextActive ? 'APPROVED' : 'SUSPENDED',
                                              }));
                                            }
                                            if (u.driverId) {
                                              setDriverStatusOverrides((prev) => ({
                                                ...prev,
                                                [u.driverId!]: nextActive ? 'ACTIVE' : 'SUSPENDED',
                                              }));
                                            }
                                            appendAuditLog(
                                              isLocked
                                                ? 'MỞ KHÓA TÀI KHOẢN NGƯỜI DÙNG'
                                                : 'KHÓA TÀI KHOẢN NGƯỜI DÙNG',
                                              `${u.fullName} (${u.email})`,
                                              isLocked
                                                ? 'Khôi phục quyền đăng nhập vào hệ thống'
                                                : 'Khóa tài khoản và thu hồi phiên đăng nhập theo quyết định quản trị',
                                            );
                                            triggerAdminToast(
                                              isLocked
                                                ? `Đã mở khóa tài khoản "${u.fullName}" (${u.email}).`
                                                : `Đã khóa tài khoản "${u.fullName}" (${u.email}).`,
                                            );
                                          }}
                                          style={{
                                            padding: '5px 10px',
                                            borderRadius: 6,
                                            border: isLocked ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                                            background: isLocked ? '#F0FDF4' : '#FFFFFF',
                                            color: isLocked ? '#15803D' : '#475569',
                                            fontSize: '0.73rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                            transition: 'all 0.12s ease',
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isLocked) {
                                              e.currentTarget.style.borderColor = '#FECACA';
                                              e.currentTarget.style.background = '#FEF2F2';
                                              e.currentTarget.style.color = '#DC2626';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isLocked) {
                                              e.currentTarget.style.borderColor = '#E2E8F0';
                                              e.currentTarget.style.background = '#FFFFFF';
                                              e.currentTarget.style.color = '#475569';
                                            }
                                          }}
                                        >
                                          {isLocked ? 'Mở khóa' : 'Khóa'}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            {/* ADMIN TAB 7: PLATFORM SETTINGS & AUDIT LOGS */}
            {currentAdminTab === 'admin-settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Unified Minimalist Control Bar for Settings & Audit Logs */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '15px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Cấu hình Hạ tầng Hệ thống &amp; Nhật ký Kiểm toán
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Thiết lập tỷ lệ chiết khấu sàn, bán kính điều phối GPS và tra cứu vết thao tác quản trị
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#F1F5F9',
                      padding: 3,
                      borderRadius: 8,
                      gap: 2,
                    }}
                  >
                    {[
                      { id: 'SYSTEM_CONFIG' as const, label: 'Thiết lập Tham số & Chiết khấu Sàn' },
                      { id: 'AUDIT_LOGS' as const, label: `Nhật ký Kiểm toán (${adminAuditLogs.length})` },
                    ].map((tab) => {
                      const active = adminSettingsSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setAdminSettingsSubTab(tab.id)}
                          style={{
                            padding: '5px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: active ? '#FFFFFF' : 'transparent',
                            color: active ? '#0F172A' : '#64748B',
                            fontWeight: active ? 600 : 500,
                            fontSize: '0.78rem',
                            boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {adminSettingsSubTab === 'SYSTEM_CONFIG' && (
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
                              min="0"
                              value={platformCommissionRate}
                              onChange={(e) => setPlatformCommissionRate(Math.max(0, Number(e.target.value)))}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                              Phụ phí thời tiết xấu / Giờ cao điểm (VNĐ)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={peakHourSurgeFee}
                              onChange={(e) => setPeakHourSurgeFee(Math.max(0, Number(e.target.value)))}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#FFFFFF' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                              Giá trị đơn tối thiểu được trợ giá Miễn phí ship (VNĐ)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="10000"
                              value={minOrderForFreeShipping}
                              onChange={(e) => setMinOrderForFreeShipping(Math.max(0, Number(e.target.value)))}
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
                            type="button"
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
                              triggerAdminToast('Đã lưu cấu hình tham số & chiết khấu toàn hệ thống sàn.');
                              setTimeout(() => setConfigSavedBanner(''), 3000);
                            }}
                            style={{
                              marginTop: 'auto',
                              padding: '11px',
                              borderRadius: 8,
                              background: '#0F172A',
                              color: '#FFFFFF',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Lưu thiết lập can thiệp hệ thống
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {adminSettingsSubTab === 'AUDIT_LOGS' && (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Nhật ký Kiểm toán Quản trị
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                          Tự động lưu vết mọi thao tác duyệt quán, khóa tài khoản, phân xử khiếu nại và giải ngân
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="text"
                          placeholder="Tìm hành động, đối tượng..."
                          value={adminAuditSearch}
                          onChange={(e) => setAdminAuditSearch(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            fontSize: '0.79rem',
                            color: '#0F172A',
                            width: 215,
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', background: '#F1F5F9', padding: '5px 10px', borderRadius: 6 }}>
                          {adminAuditLogs.length} bản ghi
                        </span>
                      </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
                            <th style={{ padding: '10px 20px' }}>Thời gian</th>
                            <th style={{ padding: '10px 20px' }}>Hành động</th>
                            <th style={{ padding: '10px 20px' }}>Đối tượng tác động</th>
                            <th style={{ padding: '10px 20px' }}>Ghi chú</th>
                            <th style={{ padding: '10px 20px' }}>Quản trị viên</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminAuditLogs
                            .filter((log) => {
                              const q = adminAuditSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                log.action.toLowerCase().includes(q) ||
                                log.targetName.toLowerCase().includes(q) ||
                                log.reason.toLowerCase().includes(q)
                              );
                            })
                            .map((log) => (
                              <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '11px 20px', color: '#64748B', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                                <td style={{ padding: '11px 20px', fontWeight: 700, color: '#0F172A' }}>{log.action}</td>
                                <td style={{ padding: '11px 20px', fontWeight: 600, color: '#1E293B' }}>{log.targetName}</td>
                                <td style={{ padding: '11px 20px', color: '#475569' }}>{log.reason}</td>
                                <td style={{ padding: '11px 20px', color: '#64748B' }}>{log.performedBy}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Chi Tiết Hồ Sơ Pháp Lý & Ngân Hàng Đối Soát Của Nhà Hàng */}
        {inspectingMerchantKyc && (() => {
          const m = inspectingMerchantKyc;
          const kycStatus = getEffectiveMerchantKycStatus(m);
          const fin = computeMerchantFinancials(m, 'ALL');
          return (
            <div
              onClick={() => setInspectingMerchantKyc(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.72)',
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
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  width: '100%',
                  maxWidth: 620,
                  overflow: 'hidden',
                  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)',
                }}
              >
                <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={m.storeFrontImage || m.coverUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80'}
                      alt={m.name}
                      style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0' }}
                    />
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{m.name}</h3>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                        {m.categories?.join(' • ') || 'Đối tác Nhà hàng DineGo'} • ★ {m.rating || 5.0}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingMerchantKyc(null)}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#475569',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.83rem' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                      Hồ sơ pháp lý &amp; VSATTP
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#334155' }}>
                      <div>Người đại diện: <strong style={{ color: '#0F172A' }}>{m.ownerName || 'Chủ Hộ Kinh Doanh'}</strong></div>
                      <div>Số GPKD: <strong style={{ fontFamily: 'monospace' }}>{m.businessLicenseNumber || 'GPKD-41A8029144'}</strong></div>
                      <div>Chứng nhận VSATTP: <strong style={{ fontFamily: 'monospace' }}>{m.foodSafetyCertNumber || 'ATTP-HCM-2026-0891'}</strong></div>
                      <div>Mã số thuế: <strong style={{ fontFamily: 'monospace' }}>{m.taxCode || '0318992819'}</strong></div>
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                      Tài khoản ngân hàng &amp; Đối soát
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                      <div>Ngân hàng: <strong style={{ color: '#0F172A' }}>{m.bankName || 'Vietcombank'}</strong></div>
                      <div>Số tài khoản: <strong style={{ fontFamily: 'monospace' }}>{m.bankAccountNumber || '0071000889900'}</strong></div>
                      <div>Doanh thu ròng (85%): <strong style={{ color: '#15803D' }}>{fin.netPayout85.toLocaleString('vi-VN')}đ</strong></div>
                      <div>Còn phải giải ngân: <strong style={{ color: '#0F172A' }}>{fin.remainingPayout.toLocaleString('vi-VN')}đ</strong></div>
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
                      Địa chỉ &amp; Thông tin vận hành
                    </div>
                    <div style={{ color: '#0F172A', fontWeight: 500 }}>{m.address}</div>
                    <div style={{ color: '#64748B', fontSize: '0.78rem', marginTop: 4 }}>
                      Hotline: {m.phoneNumber} • Giờ mở cửa: {m.openingHours || '07:00 - 22:00'} • Thời gian giao: {m.deliveryTimeMin || 20}–{m.deliveryTimeMax || 30} phút
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 24px', background: '#FAFAFA', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: kycStatus === 'APPROVED' ? '#15803D' : '#DC2626' }}>
                    Trạng thái hiện tại: {kycStatus === 'APPROVED' ? '● Đang hoạt động' : kycStatus === 'PENDING' ? '● Chờ duyệt hồ sơ' : '● Đang tạm khóa / Từ chối'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {kycStatus !== 'APPROVED' ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateMerchantKyc(m, 'APPROVED');
                          setInspectingMerchantKyc(null);
                        }}
                        style={{
                          padding: '7px 16px',
                          borderRadius: 6,
                          background: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Phê duyệt &amp; Kích hoạt quán
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateMerchantKyc(m, 'SUSPENDED');
                          setInspectingMerchantKyc(null);
                        }}
                        style={{
                          padding: '7px 16px',
                          borderRadius: 6,
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Tạm khóa gian hàng
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setInspectingMerchantKyc(null)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 6,
                        background: '#FFFFFF',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
        {deleteVoucherModalJsx}
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
    <div style={{ display: 'flex', height: '100vh', width: '100%', maxWidth: '100vw', overflow: 'hidden', background: '#F8FAFC' }}>
      {/* Left Seller Fixed Sidebar */}
      <aside
        style={{
          width: 264,
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
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

          {/* Store Info Banner (1-to-1 Merchant Account with Owner Identity Avatar) */}
          <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              Gian hàng độc lập
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A', lineHeight: 1.3, marginBottom: 8 }}>
              {currentMerchant?.name || 'Gian hàng của bạn'}
            </div>
            <div
              onClick={() => onNavigate?.('merchant-kyc')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                paddingTop: 8,
                borderTop: '1px dashed #E2E8F0',
                cursor: 'pointer',
              }}
              title="Bấm để xem Hồ sơ Pháp lý & Avatar nhận diện Chủ sở hữu"
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={kycOwnerAvatar}
                  alt={kycOwnerName || 'Chủ quán'}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #D97706',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    background: '#00B14F',
                    border: '2px solid #FFFFFF',
                  }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.77rem', color: '#0F172A', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {kycOwnerName || currentMerchant?.ownerName || currentUser?.fullName || 'Chủ sở hữu'}
                </div>
                <div style={{ fontSize: '0.69rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Chủ sở hữu • CCCD: {kycOwnerNationalId}
                </div>
              </div>
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
            onClick={() => onNavigate?.('home')}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#00B14F',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              marginBottom: 4,
            }}
          >
            <Compass size={15} /> Xem Gian hàng trên Sàn
          </button>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Seller Top Operational Bar */}
        <header
          style={{
            height: 64,
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            gap: 16,
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}
        >
          {/* Left: Merchant Title & Store Status Badge on 1 single row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flexShrink: 1 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
              }}
            >
              <Store size={18} />
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
              {currentMerchantTab === 'merchant-orders' && 'Điều phối đơn hàng & Bếp trực tiếp'}
              {currentMerchantTab === 'merchant-menu' && 'Quản lý danh mục Thực đơn & Trạng thái món'}
              {currentMerchantTab === 'merchant-vouchers' && 'Quản lý Mã Ưu Đãi & Voucher Độc Quyền Của Quán'}
              {currentMerchantTab === 'merchant-catering' && 'Quản lý Hợp đồng Đặt tiệc & Lịch phục vụ'}
              {currentMerchantTab === 'merchant-analytics' && 'Báo cáo Doanh thu, Đối soát & Đánh giá'}
              {currentMerchantTab === 'merchant-kyc' && 'Hồ sơ Pháp lý Gian hàng & Cài đặt Vận hành'}
            </h1>
            <button
              onClick={() => setStoreOpen(!storeOpen)}
              title={storeOpen ? 'Bấm để chuyển sang tạm đóng cửa' : 'Bấm để mở cửa nhận đơn'}
              style={{
                background: storeOpen ? '#ECFDF5' : '#FEF2F2',
                color: storeOpen ? '#047857' : '#DC2626',
                border: `1px solid ${storeOpen ? '#A7F3D0' : '#FECACA'}`,
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
                  background: storeOpen ? '#10B981' : '#EF4444',
                  boxShadow: storeOpen ? '0 0 6px #10B981' : 'none',
                }}
              />
              <span>{storeOpen ? 'Đang mở cửa nhận đơn' : 'Tạm đóng cửa'}</span>
            </button>
          </div>

          {/* Right: Operational Controls & Store Profile Chip & Top-Right Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
            {/* Notification Center */}
            <NotificationBell
              actorRole="MERCHANT"
              userId={currentUser?.id}
              merchantId={currentMerchant?.id}
              actorDisplayName={currentMerchant?.name || 'Cửa hàng'}
              onNavigate={onNavigate}
              variant="light"
            />

            {/* Merchant Store & Owner Profile Card Chip */}
            <div
              onClick={() => onNavigate?.('merchant-kyc')}
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
              title="Chủ sở hữu gian hàng — Bấm để mở Hồ sơ Pháp lý & Cài đặt"
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
                src={kycOwnerAvatar}
                alt={kycOwnerName || 'Chủ quán'}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #D97706',
                  flexShrink: 0,
                }}
              />
              <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentMerchant?.name || 'Cơm Tấm Sài Gòn 1985'}
                </div>
                <div style={{ fontSize: '0.67rem', color: '#64748B', fontWeight: 600 }}>
                  Chủ quán: {kycOwnerName || currentMerchant?.ownerName || currentUser?.fullName || 'Võ Thị Bích Thùy'}
                </div>
              </div>
            </div>

            {/* Subtle Divider */}
            <div style={{ height: 20, width: 1, background: '#E2E8F0', flexShrink: 0 }} />

            {/* Nút Đăng xuất ở góc phải trên cùng */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Đăng xuất khỏi Kênh Người Bán"
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

        {/* Seller Content Area */}
        <div style={{ padding: 28, flex: 1, minWidth: 0 }}>
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

                          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setMerchantChatOrder(order)}
                              title="Nhắn tin với khách hàng / tài xế của đơn này"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid #BAE6FD',
                                background: '#F0FDF4',
                                color: '#059669',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <MessageSquare size={14} /> Nhắn tin với Khách
                            </button>
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
                                    void adminApi.updateDatabaseFeastBookingStatus(fb.id, { status: 'APPROVED' });
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
                                    void adminApi.updateDatabaseFeastBookingStatus(fb.id, { status: 'REJECTED' });
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
                  <div style={{ fontSize: '0.76rem', color: '#15803D', fontWeight: 700 }}>DOANH THU KHẢ DỤNG RÚT (85%)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00B14F', marginTop: 6 }}>
                    {merchantRevenue.availableBalance.toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                    Tổng ròng: {merchantRevenue.netPayout.toLocaleString('vi-VN')}đ • Đã giải ngân: {merchantRevenue.totalWithdrawn.toLocaleString('vi-VN')}đ
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>LỆNH RÚT DOANH THU</div>
                  {(() => {
                    const myWithdrawals = merchantWithdrawals.filter((w) => w.merchantId === currentMerchantId);
                    const pendingReq = myWithdrawals.find((w) => w.status === 'PENDING');
                    const canWithdraw = merchantRevenue.availableBalance > 0 && !pendingReq;

                    return (
                      <div style={{ marginTop: 8 }}>
                        {!pendingReq && merchantRevenue.availableBalance > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            <input
                              type="number"
                              min={100000}
                              max={merchantRevenue.availableBalance}
                              step={50000}
                              value={merchantWithdrawAmountInput}
                              onChange={(e) => {
                                setMerchantWithdrawAmountInput(e.target.value);
                                if (merchantWithdrawError) setMerchantWithdrawError('');
                              }}
                              placeholder={`Số tiền rút (tối đa ${merchantRevenue.availableBalance.toLocaleString('vi-VN')}đ)`}
                              style={{
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: 6,
                                border: merchantWithdrawError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                                fontSize: '0.78rem',
                                background: '#FFFFFF',
                              }}
                            />
                            {merchantWithdrawError && (
                              <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: 2, fontWeight: 600 }}>
                                {merchantWithdrawError}
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          disabled={!canWithdraw}
                          onClick={() => {
                            if (!canWithdraw) return;
                            const parsedAmount = Number(merchantWithdrawAmountInput);
                            if (!merchantWithdrawAmountInput.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
                              setMerchantWithdrawError('Vui lòng nhập số tiền muốn rút.');
                              return;
                            }
                            if (parsedAmount < 100000) {
                              setMerchantWithdrawError('Hạn mức rút tối thiểu của quán là 100.000đ.');
                              return;
                            }
                            if (parsedAmount > merchantRevenue.availableBalance) {
                              setMerchantWithdrawError(
                                `Số tiền rút không được vượt quá số dư khả dụng (${merchantRevenue.availableBalance.toLocaleString('vi-VN')}đ).`,
                              );
                              return;
                            }

                            const newReq = {
                              id: `mwd-${Date.now()}`,
                              merchantId: currentMerchantId,
                              merchantName: currentMerchant?.name || 'Nhà hàng DineGo',
                              bankName: currentMerchant?.bankName || 'Ngân hàng liên kết',
                              bankAccountNumber: currentMerchant?.bankAccountNumber || '—',
                              bankAccountHolder: currentMerchant?.bankAccountHolder || currentMerchant?.ownerName || 'Chủ quán',
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
                              actorType: 'MERCHANT',
                              actorId: currentMerchantId,
                              actorName: newReq.merchantName,
                            });
                            setMerchantWithdrawals((prev) => [newReq, ...prev]);
                            setMerchantWithdrawAmountInput('');
                            setMerchantWithdrawError('');
                            setMerchantWithdrawSuccess(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '9px 14px',
                            borderRadius: 6,
                            background: canWithdraw ? '#0F172A' : '#E2E8F0',
                            color: canWithdraw ? '#FFFFFF' : '#94A3B8',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: canWithdraw ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            border: 'none',
                          }}
                        >
                          <ArrowUpRight size={15} />{' '}
                          {pendingReq
                            ? 'Đang chờ Admin duyệt rút tiền'
                            : `Rút về ${currentMerchant?.bankName || 'Ngân hàng'}`}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {merchantWithdrawSuccess && (
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: 8,
                    background: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    marginBottom: 20,
                    border: '1px solid #FDE68A',
                  }}
                >
                  Đã gửi yêu cầu rút tiền về tài khoản ngân hàng của quán. Trạng thái: <strong>Chờ Admin duyệt & giải ngân</strong>.
                </div>
              )}

              {merchantWithdrawals.filter((w) => w.merchantId === currentMerchantId).length > 0 && (
                <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 18, marginBottom: 20 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
                    Lịch sử Yêu cầu Rút Doanh thu Quán (Đồng bộ Admin)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {merchantWithdrawals
                      .filter((w) => w.merchantId === currentMerchantId)
                      .map((w) => (
                        <div
                          key={w.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '9px 12px',
                            borderRadius: 6,
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#0F172A' }}>{w.amount.toLocaleString('vi-VN')}đ</strong> → {w.bankName} ({w.bankAccountNumber})
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                              Gửi lúc: {w.createdAt}
                              {w.processedAt ? ` • Xử lý: ${w.processedAt}` : ''}
                              {w.note ? ` • Ghi chú: ${w.note}` : ''}
                            </div>
                          </div>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: '0.72rem',
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
                        <div
                          key={rev.id}
                          style={{
                            padding: 14,
                            borderRadius: 10,
                            border: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
                              {rev.customerName || 'Thực khách'} •{' '}
                              <span style={{ color: '#D97706' }}>{'★'.repeat(Number(rev.rating) || 5)}</span>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>{rev.createdAt}</span>
                          </div>
                          {rev.dishOrdered && (
                            <div style={{ fontSize: '0.76rem', color: '#4F46E5', fontWeight: 600, marginBottom: 4 }}>
                              Món: {rev.dishOrdered}
                            </div>
                          )}
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.84rem', color: '#334155', lineHeight: 1.45 }}>
                            {rev.comment}
                          </p>
                          {rev.reply ? (
                            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '8px 10px', fontSize: '0.8rem', color: '#065F46' }}>
                              <strong>Phản hồi của quán:</strong> {rev.reply}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                type="text"
                                placeholder="Nhập phản hồi gửi thực khách..."
                                value={replyInput[rev.id] || ''}
                                onChange={(e) => setReplyInput({ ...replyInput, [rev.id]: e.target.value })}
                                style={{
                                  flex: 1,
                                  padding: '7px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  fontSize: '0.8rem',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSendReply(rev.id)}
                                style={{
                                  padding: '7px 14px',
                                  borderRadius: 6,
                                  background: '#0F172A',
                                  color: '#FFFFFF',
                                  fontSize: '0.78rem',
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
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MERCHANT TAB 5: STOREFRONT KYC PROFILE & SETTINGS (OPTIMIZED + OWNER AVATAR) */}
          {currentMerchantTab === 'merchant-kyc' && (() => {
            const kycChecklist = [
              { label: 'Avatar nhận diện chủ sở hữu', done: Boolean(kycOwnerAvatar.trim()) },
              { label: 'Họ tên & CCCD chủ quán', done: Boolean(kycOwnerName.trim() && kycOwnerNationalId.trim()) },
              { label: 'Giấy phép ĐKKD & Mã số thuế', done: Boolean(kycBusinessLicense.trim() && kycTaxCode.trim()) },
              { label: 'Chứng nhận VSATTP', done: Boolean(kycFoodSafetyCert.trim()) },
              { label: 'Địa chỉ & Ảnh mặt tiền quán', done: Boolean(kycAddress.trim() && kycStoreFrontImage.trim()) },
              { label: 'Tài khoản ngân hàng đối soát', done: Boolean(kycBankName.trim() && kycBankAccountNumber.trim() && kycBankAccountHolder.trim()) },
            ];
            const completedCount = kycChecklist.filter((c) => c.done).length;
            const completionPct = Math.round((completedCount / kycChecklist.length) * 100);

            return (
            <form
              onSubmit={handleSaveMerchantKycAndSettings}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {/* Header Banner, Owner Quick Identity Card & Edit/Save Action Bar */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={kycOwnerAvatar}
                        alt={kycOwnerName || 'Chủ sở hữu'}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #D97706',
                          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#00B14F',
                          color: '#FFFFFF',
                          border: '2px solid #FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Đã định danh chủ sở hữu"
                      >
                        <CheckCircle2 size={11} />
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                        <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          Hồ sơ Pháp lý, Định danh Chủ sở hữu &amp; Cài đặt Gian hàng
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
                            fontSize: '0.75rem',
                            fontWeight: 800,
                          }}
                        >
                          {currentMerchant?.kycStatus === 'REJECTED'
                            ? 'Hồ sơ bị từ chối'
                            : currentMerchant?.kycStatus === 'PENDING_APPROVAL'
                            ? 'Đang chờ thẩm định'
                            : `Đã xác thực KYC${currentMerchant?.verifiedAt ? ` • ${currentMerchant.verifiedAt}` : ''}`}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.81rem', color: '#64748B', margin: 0 }}>
                        Chủ sở hữu đại diện: <strong style={{ color: '#0F172A' }}>{kycOwnerName}</strong> • CCCD: <strong style={{ color: '#0F172A' }}>{kycOwnerNationalId}</strong> • GPKD: <strong style={{ color: '#0F172A' }}>{kycBusinessLicense}</strong>
                      </p>
                    </div>
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
                      <span>Lưu cập nhật hồ sơ</span>
                    </button>
                  </div>
                </div>

                {/* KYC Completeness Progress Bar & Quick Section Filter */}
                <div
                  style={{
                    paddingTop: 14,
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0F172A' }}>
                        Mức độ hoàn thiện hồ sơ pháp lý:
                      </span>
                      <span
                        style={{
                          padding: '2px 9px',
                          borderRadius: 999,
                          background: completionPct === 100 ? '#DCFCE7' : '#FEF3C7',
                          color: completionPct === 100 ? '#15803D' : '#B45309',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}
                      >
                        {completionPct}% ({completedCount}/{kycChecklist.length} hạng mục)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {kycChecklist.map((item, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: item.done ? '#F0FDF4' : '#FEF2F2',
                            border: `1px solid ${item.done ? '#BBF7D0' : '#FECACA'}`,
                            color: item.done ? '#15803D' : '#DC2626',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          {item.done ? '✓' : '•'} {item.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Filter Tabs for Fast Navigation */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { id: 'OWNER_LEGAL' as const, label: 'Định danh Chủ quán & GPKD' },
                      { id: 'STORE_OPS' as const, label: 'Thương hiệu & Mặt tiền' },
                      { id: 'BANK_PAYOUT' as const, label: 'Ngân hàng Đối soát' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setKycSectionFilter(tab.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border:
                            kycSectionFilter === tab.id ? '1.5px solid #D97706' : '1px solid #CBD5E1',
                          background: kycSectionFilter === tab.id ? '#FFFBEB' : '#F8FAFC',
                          color: kycSectionFilter === tab.id ? '#B45309' : '#475569',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
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

              {/* DEDICATED ROW 1: OWNER IDENTIFICATION AVATAR & LEGAL KYC CERTIFICATES */}
              {kycSectionFilter === 'OWNER_LEGAL' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20, alignItems: 'start' }}>
                  {/* Card A: Định danh Chủ sở hữu Cửa hàng & Avatar Nhận diện */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #FDE68A',
                      borderRadius: 12,
                      padding: 22,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      boxShadow: '0 4px 14px rgba(217, 119, 6, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #FEF3C7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserIcon size={18} color="#D97706" />
                        <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          1. Định danh Chủ sở hữu &amp; Avatar Nhận diện (Owner KYC)
                        </h4>
                      </div>
                      <span
                        style={{
                          padding: '2px 9px',
                          borderRadius: 999,
                          background: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          color: '#B45309',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}
                      >
                        Bắt buộc đối chiếu CCCD
                      </span>
                    </div>

                    {/* Owner Portrait Avatar Preview + Upload Box */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: 16,
                        padding: 14,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                        border: '1px solid #FDE68A',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ position: 'relative', width: 92, height: 92 }}>
                        <img
                          src={kycOwnerAvatar}
                          alt={kycOwnerName || 'Chủ sở hữu cửa hàng'}
                          style={{
                            width: 92,
                            height: 92,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid #D97706',
                            background: '#FFFFFF',
                            boxShadow: '0 6px 16px rgba(217, 119, 6, 0.25)',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            padding: '2px 6px',
                            borderRadius: 999,
                            background: '#00B14F',
                            color: '#FFFFFF',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            border: '1.5px solid #FFFFFF',
                          }}
                        >
                          KYC
                        </span>
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A', marginBottom: 3 }}>
                          Ảnh chân dung nhận diện Chủ sở hữu: {kycOwnerName || 'Chủ quán'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#78350F', lineHeight: 1.4, marginBottom: 10 }}>
                          Ảnh nhận diện chính chủ được hiển thị trên Hồ sơ pháp lý, Sidebar quản trị quán và gửi tới Admin khi thẩm định KYC.
                        </div>

                        {isEditingMerchantKyc && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 11px',
                                borderRadius: 7,
                                background: '#D97706',
                                color: '#FFFFFF',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              <Upload size={13} />
                              <span>Tải ảnh từ máy tính</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleUploadOwnerAvatarFile}
                                style={{ display: 'none' }}
                              />
                            </label>

                            {[
                              {
                                label: 'Mẫu Nam 1',
                                url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
                              },
                              {
                                label: 'Mẫu Nữ 1',
                                url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
                              },
                              {
                                label: 'Bếp trưởng',
                                url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&auto=format&fit=crop&q=80',
                              },
                              {
                                label: 'Mẫu Nữ 2',
                                url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
                              },
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setKycOwnerAvatar(preset.url)}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: 6,
                                  border:
                                    kycOwnerAvatar === preset.url
                                      ? '1.5px solid #D97706'
                                      : '1px solid #CBD5E1',
                                  background: kycOwnerAvatar === preset.url ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                                  color: kycOwnerAvatar === preset.url ? '#B45309' : '#475569',
                                  fontSize: '0.71rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        ĐƯỜNG DẪN ẢNH AVATAR NHẬN DIỆN CHỦ SỞ HỮU (URL / BASE64)
                      </label>
                      <input
                        type="text"
                        readOnly={!isEditingMerchantKyc}
                        value={kycOwnerAvatar}
                        onChange={(e) => setKycOwnerAvatar(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                          fontSize: '0.81rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          HỌ VÀ TÊN CHỦ SỞ HỮU / ĐẠI DIỆN PHÁP LUẬT *
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
                            fontWeight: 700,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          SỐ CCCD / CMND ĐỊNH DANH CÁ NHÂN *
                        </label>
                        <input
                          type="text"
                          required
                          readOnly={!isEditingMerchantKyc}
                          value={kycOwnerNationalId}
                          onChange={(e) => setKycOwnerNationalId(e.target.value)}
                          placeholder="079095008821"
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

                    <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.3fr 1.1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          NGÀY CẤP CCCD
                        </label>
                        <input
                          type="date"
                          readOnly={!isEditingMerchantKyc}
                          value={kycOwnerIdIssuedDate}
                          onChange={(e) => setKycOwnerIdIssuedDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                            fontSize: '0.82rem',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          NƠI CẤP CCCD
                        </label>
                        <input
                          type="text"
                          readOnly={!isEditingMerchantKyc}
                          value={kycOwnerIdIssuedPlace}
                          onChange={(e) => setKycOwnerIdIssuedPlace(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                            fontSize: '0.82rem',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          EMAIL CHỦ SỞ HỮU *
                        </label>
                        <input
                          type="email"
                          required
                          readOnly={!isEditingMerchantKyc}
                          value={kycOwnerEmail}
                          onChange={(e) => setKycOwnerEmail(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                            fontSize: '0.82rem',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card B: Hồ sơ Pháp lý, Giấy phép ĐKKD & Chứng nhận VSATTP */}
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
                        2. Hồ sơ Pháp lý, Giấy phép ĐKKD &amp; Chứng nhận VSATTP
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          LOẠI HÌNH PHÁP NHÂN KINH DOANH
                        </label>
                        <select
                          disabled={!isEditingMerchantKyc}
                          value={kycBusinessType}
                          onChange={(e) => setKycBusinessType(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                            fontSize: '0.84rem',
                            fontWeight: 600,
                          }}
                        >
                          <option value="Hộ Kinh Doanh Cá Thể">Hộ Kinh Doanh Cá Thể</option>
                          <option value="Công ty TNHH Một Thành Viên">Công ty TNHH Một Thành Viên</option>
                          <option value="Công ty TNHH Hai Thành Viên trở lên">Công ty TNHH Hai Thành Viên trở lên</option>
                          <option value="Công ty Cổ phần Ẩm thực (F&B)">Công ty Cổ phần Ẩm thực (F&amp;B)</option>
                          <option value="Chuỗi Nhượng quyền Thương hiệu">Chuỗi Nhượng quyền Thương hiệu</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          MÃ SỐ THUẾ ĐƠN VỊ KINH DOANH *
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
                            fontWeight: 700,
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          SỐ GIẤY PHÉP ĐĂNG KÝ KINH DOANH *
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
                            fontWeight: 700,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          SỐ CHỨNG NHẬN VSATTP *
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
                            fontWeight: 700,
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.8fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          CƠ QUAN CẤP CHỨNG NHẬN VSATTP
                        </label>
                        <input
                          type="text"
                          readOnly={!isEditingMerchantKyc}
                          value={kycFoodSafetyIssuedBy}
                          onChange={(e) => setKycFoodSafetyIssuedBy(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                            fontSize: '0.84rem',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 5 }}>
                          HIỆU LỰC ĐẾN NGÀY
                        </label>
                        <input
                          type="date"
                          readOnly={!isEditingMerchantKyc}
                          value={kycFoodSafetyExpiryDate}
                          onChange={(e) => setKycFoodSafetyExpiryDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: 8,
                            border: '1px solid #CBD5E1',
                            background: isEditingMerchantKyc ? '#FFFFFF' : '#F8FAFC',
                            fontSize: '0.84rem',
                          }}
                        />
                      </div>
                    </div>

                    {/* Summary Verification Box */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        fontSize: '0.78rem',
                        color: '#166534',
                        lineHeight: 1.45,
                      }}
                    >
                      <strong>✓ Đồng bộ Hồ sơ Thẩm định Admin:</strong> Thông tin định danh chủ quán ({kycOwnerName} • CCCD {kycOwnerNationalId}), Avatar chân dung và giấy phép ({kycBusinessLicense}) được đồng bộ trực tiếp sang cổng kiểm duyệt KYC của Quản trị viên sàn.
                    </div>
                  </div>
                </div>
              )}

              {/* Grid Row 2: Store Identity & Operational Settings + Storefront Image */}
              {kycSectionFilter === 'STORE_OPS' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 20, alignItems: 'start' }}>
                {/* Section 3: Thông tin Thương hiệu & Cài đặt Vận hành */}
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
                      3. Thông tin Nhà hàng &amp; Cài đặt Vận hành
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

                {/* Section 4: Hình ảnh Mặt tiền & Bảng hiệu Gian hàng */}
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
                      4. Hình ảnh Mặt tiền &amp; Ảnh đại diện Quán
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
              )}

              {/* Grid Row 3: Payout Bank Account */}
              {kycSectionFilter === 'BANK_PAYOUT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, alignItems: 'start' }}>
                {/* Section 5: Tài khoản Ngân hàng Nhận Đối Soát Doanh Thu */}
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
                      5. Tài khoản Ngân hàng Nhận Đối Soát &amp; Doanh Thu
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
              )}

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
                  Mọi thay đổi về Avatar chủ sở hữu, hồ sơ pháp lý, tên quán, địa chỉ, khung giờ mở cửa và tài khoản ngân hàng sẽ được áp dụng ngay trên toàn hệ thống DineGo.
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
            );
          })()}
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

      <OrderChatModal
        isOpen={Boolean(merchantChatOrder)}
        onClose={() => setMerchantChatOrder(null)}
        order={merchantChatOrder}
        currentUserRole="MERCHANT"
        currentUserId={currentMerchant?.id || 'merchant-store'}
        currentUserName={currentMerchant?.name || 'Nhà hàng'}
        defaultChannel="CUSTOMER_MERCHANT"
        assignedDriverName={merchantChatOrder?.assignedDriverName || undefined}
      />
      {deleteVoucherModalJsx}
    </div>
  );
};
