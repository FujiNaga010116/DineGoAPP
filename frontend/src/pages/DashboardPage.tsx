// ==============================================================================
// DineGo Frontend — Standalone Merchant Seller Center & Enterprise Admin Backoffice
// Completely separated layouts from the Customer Storefront (No shared Header/Footer)
// ==============================================================================

import React, { useState } from 'react';
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
} from 'lucide-react';
import type { Role, User, Order, OrderStatus, MenuItem, Merchant, DriverProfile } from '../types';
import type { NavTab } from '../components/common/Header';

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
  allMerchants?: Merchant[];
  allDriversList?: DriverProfile[];
  allUsersList?: User[];
  onToggleUserStatus?: (userId: string) => void;
  onSelectMerchantForManage?: (merchant: Merchant) => void;
  onOpenMerchantRegisterModal?: () => void;
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
  allMerchants = [],
  allDriversList = [],
  allUsersList = [],
  onToggleUserStatus,
  onSelectMerchantForManage,
  onOpenMerchantRegisterModal,
}) => {
  const isAdminRole = currentUser?.roles?.includes('ADMIN') || activeTab.startsWith('admin-');

  // Admin Deep System Controls
  const [platformCommissionRate, setPlatformCommissionRate] = useState(15);
  const [peakHourSurgeFee, setPeakHourSurgeFee] = useState(5000);
  const [minOrderForFreeShipping, setMinOrderForFreeShipping] = useState(100000);
  const [autoDispatchRangeKm, setAutoDispatchRangeKm] = useState(3.5);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN'>('ALL');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [configSavedBanner, setConfigSavedBanner] = useState('');

  // Merchant Active Section
  const currentMerchantTab:
    | 'merchant-orders'
    | 'merchant-menu'
    | 'merchant-catering'
    | 'merchant-analytics'
    | 'merchant-kyc' =
    activeTab === 'merchant-menu' ||
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
    | 'admin-settings' =
    activeTab === 'admin-merchants' ||
    activeTab === 'admin-drivers' ||
    activeTab === 'admin-users' ||
    activeTab === 'admin-complaints' ||
    activeTab === 'admin-reconciliation' ||
    activeTab === 'admin-settings'
      ? activeTab
      : 'admin-overview';

  // Merchant Operational States
  const [storeOpen, setStoreOpen] = useState(true);
  const [kitchenStatusFilter, setKitchenStatusFilter] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [orderSearch, setOrderSearch] = useState('');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [merchantWithdrawSuccess, setMerchantWithdrawSuccess] = useState(false);

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

  // Merchant Catering Bookings & Calendar State
  const [feastBookings, setFeastBookings] = useState([
    {
      id: 'fb-01',
      bookingCode: 'DG-FEAST-8821',
      customerName: 'Nguyễn Minh Quân (Công ty TNHH VinaTech)',
      customerPhone: '0908112233',
      packageName: 'Mâm Tiệc Tân Niên Đoàn Viên (10 người/bàn)',
      tableCount: 5,
      eventDate: '2026-11-15',
      eventTime: '18:30',
      address: 'Tầng 8, Tòa nhà Saigon Centre, 65 Lê Lợi, Quận 1, TP. HCM',
      totalAmount: 17500000,
      depositAmount: 5250000,
      status: 'PENDING_APPROVAL' as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED',
      depositPaid: true,
    },
    {
      id: 'fb-02',
      bookingCode: 'DG-FEAST-8819',
      customerName: 'Trần Ngọc Lan',
      customerPhone: '0912334455',
      packageName: 'Buffet Finger Food & BBQ Sân Vườn (30 khách)',
      tableCount: 3,
      eventDate: '2026-11-20',
      eventTime: '11:30',
      address: 'Biệt thự B12 Thảo Điền, TP. Thủ Đức, TP. HCM',
      totalAmount: 13500000,
      depositAmount: 4050000,
      status: 'APPROVED' as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED',
      depositPaid: true,
    },
  ]);

  const [blockedDates, setBlockedDates] = useState<string[]>(['2026-11-22', '2026-11-29']);

  const toggleBlockedDate = (dateStr: string) => {
    setBlockedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr],
    );
  };

  // Merchant Revenue State
  const [merchantRevenue] = useState({
    merchantName: 'Cơm Tấm Sài Gòn 1985',
    totalRevenue: 28500000,
    platformCommission: 4275000,
    netPayout: 24225000,
    completedOrders: 184,
    cancelledOrders: 6,
    averageOrderValue: 154800,
    topDishes: [
      { sku: 'MN-001', name: 'Cơm Tấm Sườn Cọng Nướng Than', quantity: 94, unitPrice: 65000, totalSales: 6110000 },
      { sku: 'MN-002', name: 'Cơm Tấm Ba Rọi Nướng Mật Ong', quantity: 52, unitPrice: 60000, totalSales: 3120000 },
      { sku: 'MN-003', name: 'Chả Trứng Hấp Đặc Biệt', quantity: 48, unitPrice: 20000, totalSales: 960000 },
      { sku: 'MN-004', name: 'Trứng Ốp La Lòng Đào', quantity: 110, unitPrice: 10000, totalSales: 1100000 },
    ],
  });

  // Admin System State
  const [adminSystem] = useState({
    totalGmv: 185600000,
    platformRevenue: 27840000,
    totalOrders: 1420,
    totalMerchants: 24,
    activeDrivers: 48,
    totalUsers: 890,
  });

  // Admin Drivers Fleet State
  const [driversList, setDriversList] = useState([
    {
      id: 'drv-01',
      code: 'TX-SG-0019',
      fullName: 'Nguyễn Quốc Tuấn',
      phone: '0909888999',
      licensePlate: '59-B1 888.26',
      vehicle: 'Honda Wave Alpha',
      area: 'Quận 1, Quận 3, Bình Thạnh',
      completedTrips: 412,
      rating: 4.9,
      status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
    },
    {
      id: 'drv-02',
      code: 'TX-SG-0042',
      fullName: 'Lê Minh Hải',
      phone: '0903445566',
      licensePlate: '59-X3 412.09',
      vehicle: 'Honda AirBlade 125',
      area: 'Quận 1, Quận 4, Quận 7',
      completedTrips: 298,
      rating: 4.8,
      status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
    },
    {
      id: 'drv-03',
      code: 'TX-SG-0087',
      fullName: 'Phạm Hồng Sơn',
      phone: '0918776655',
      licensePlate: '59-T2 198.54',
      vehicle: 'Yamaha Sirius FI',
      area: 'Phú Nhuận, Tân Bình',
      completedTrips: 164,
      rating: 4.7,
      status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
    },
  ]);

  const toggleDriverStatus = (drvId: string) => {
    setDriversList((prev) =>
      prev.map((d) =>
        d.id === drvId ? { ...d, status: d.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : d,
      ),
    );
  };

  // Admin Complaints State
  const [complaints, setComplaints] = useState([
    {
      id: 'cmp-01',
      code: 'CMP-298101',
      orderNumber: 'DG20261103-TRK88',
      customerName: 'Nguyễn Văn An',
      merchantName: 'Cơm Tấm Sài Gòn 1985',
      issueType: 'Giao thiếu 01 phần canh chua cá lóc trong đơn hàng',
      compensationAmount: 35000,
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
      compensationAmount: 75000,
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
      compensationAmount: 25000,
      status: 'OPEN',
      createdAt: '01/11/2026 12:40',
    },
  ]);

  const handleResolveComplaint = (id: string, action: 'REFUND' | 'REJECT') => {
    setComplaints(
      complaints.map((c) =>
        c.id === id ? { ...c, status: action === 'REFUND' ? 'REFUNDED' : 'REJECTED' } : c,
      ),
    );
  };

  // Merchant Moderation State for Admin
  const [lockedMerchants, setLockedMerchants] = useState<Record<string, boolean>>({});
  const toggleLockMerchant = (mId: string) => {
    setLockedMerchants((prev) => ({ ...prev, [mId]: !prev[mId] }));
  };

  // Admin Monthly Reconciliation State
  const [reconciliationList, setReconciliationList] = useState([
    {
      id: 'rec-01',
      period: '11/2026',
      merchantName: 'Cơm Tấm Sài Gòn 1985',
      totalOrders: 184,
      grossRevenue: 28500000,
      commission15: 4275000,
      netPayout85: 24225000,
      bankAccount: 'Vietcombank • 0071001234567',
      status: 'PAID' as 'PAID' | 'PENDING',
    },
    {
      id: 'rec-02',
      period: '11/2026',
      merchantName: 'Phở Thìn Lò Đúc 1979',
      totalOrders: 142,
      grossRevenue: 21300000,
      commission15: 3195000,
      netPayout85: 18105000,
      bankAccount: 'Techcombank • 1903456789012',
      status: 'PENDING' as 'PAID' | 'PENDING',
    },
    {
      id: 'rec-03',
      period: '11/2026',
      merchantName: 'Bún Chả Hương Liên',
      totalOrders: 118,
      grossRevenue: 16520000,
      commission15: 2478000,
      netPayout85: 14042000,
      bankAccount: 'MBBank • 888999666888',
      status: 'PENDING' as 'PAID' | 'PENDING',
    },
  ]);

  const handleConfirmPayout = (recId: string) => {
    setReconciliationList((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, status: 'PAID' } : r)),
    );
  };

  const handleExportCsv = () => {
    const headers = ['Ky Doi Soat,Nha Hang,So Don,Doanh Thu Gop,Phi Nen Tang 15%,Thuc Nhan 85%,Trang Thai'];
    const rows = reconciliationList.map(
      (r) =>
        `${r.period},"${r.merchantName}",${r.totalOrders},${r.grossRevenue},${r.commission15},${r.netPayout85},${r.status}`,
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DineGo_DoiSoat_Ky_11_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Platform Vouchers State
  const [vouchers, setVouchers] = useState([
    {
      id: 'v-01',
      code: 'DINEGO30',
      title: 'Giảm 30.000đ cho đơn từ 120.000đ',
      discountValue: 30000,
      minOrder: 120000,
      usageCount: 342,
      maxUsage: 500,
      isActive: true,
    },
    {
      id: 'v-02',
      code: 'FREESHIP15K',
      title: 'Miễn phí vận chuyển 15.000đ cho đơn từ 50.000đ',
      discountValue: 15000,
      minOrder: 50000,
      usageCount: 615,
      maxUsage: 1000,
      isActive: true,
    },
    {
      id: 'v-03',
      code: 'TIECVIP500',
      title: 'Ưu đãi 500.000đ cho hợp đồng Đặt Tiệc từ 5.000.000đ',
      discountValue: 500000,
      minOrder: 5000000,
      usageCount: 18,
      maxUsage: 100,
      isActive: true,
    },
  ]);

  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherDiscount, setNewVoucherDiscount] = useState(25000);
  const [newVoucherMinOrder, setNewVoucherMinOrder] = useState(100000);

  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherCode.trim()) return;
    setVouchers((prev) => [
      {
        id: `v-${Date.now()}`,
        code: newVoucherCode.trim().toUpperCase(),
        title: `Giảm ${Number(newVoucherDiscount).toLocaleString('vi-VN')}đ cho đơn từ ${Number(newVoucherMinOrder).toLocaleString('vi-VN')}đ`,
        discountValue: Number(newVoucherDiscount),
        minOrder: Number(newVoucherMinOrder),
        usageCount: 0,
        maxUsage: 500,
        isActive: true,
      },
      ...prev,
    ]);
    setNewVoucherCode('');
  };

  const toggleVoucherStatus = (vId: string) => {
    setVouchers((prev) => prev.map((v) => (v.id === vId ? { ...v, isActive: !v.isActive } : v)));
  };

  // Merchant Reviews & Replies State
  const [reviews, setReviews] = useState([
    {
      id: 'rev-01',
      customerName: 'Trần Thị Bình',
      orderRef: 'DG20261102-8812',
      rating: 5,
      comment: 'Cơm sườn ngon, miếng sườn dày ướp vừa miệng. Đóng gói hộp giấy sạch sẽ.',
      reply: 'Cơm Tấm Sài Gòn 1985 cảm ơn quý khách đã ủng hộ. Hẹn gặp lại bạn ở những đơn tiếp theo!',
      date: '03/11/2026',
    },
    {
      id: 'rev-02',
      customerName: 'Phạm Minh Tuấn',
      orderRef: 'DG20261101-4409',
      rating: 4,
      comment: 'Đồ ăn nóng hổi nhưng lần sau quán nhớ cho thêm 1 gói nước mắm ớt riêng nhé.',
      reply: null as string | null,
      date: '02/11/2026',
    },
  ]);

  const [replyInput, setReplyInput] = useState<{ [key: string]: string }>({});

  const handleSendReply = (reviewId: string) => {
    const text = replyInput[reviewId];
    if (!text?.trim()) return;
    setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, reply: text.trim() } : r)));
    setReplyInput({ ...replyInput, [reviewId]: '' });
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
              { id: 'admin-merchants' as NavTab, label: 'Đối tác Quán & KYC', icon: <Store size={17} /> },
              { id: 'admin-drivers' as NavTab, label: 'Đội ngũ Tài xế', icon: <Bike size={17} /> },
              { id: 'admin-users' as NavTab, label: 'Người dùng & Phân quyền', icon: <UsersIcon size={17} /> },
              {
                id: 'admin-complaints' as NavTab,
                label: 'Khiếu nại & Hoàn tiền',
                icon: <MessageSquare size={17} />,
                badge: complaints.filter((c) => c.status === 'OPEN').length,
              },
              { id: 'admin-reconciliation' as NavTab, label: 'Đối soát & Khuyến mãi', icon: <FileSpreadsheet size={17} /> },
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
                    <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>▲ +22.4%</span>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>so với kỳ tháng 10/2026</span>
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', borderTop: '4px solid #00B14F', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      DOANH THU RÒNG PHÍ SÀN (15%)
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#00B14F' }}>
                      {adminSystem.platformRevenue.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 6 }}>
                      Khấu trừ cố định 15% trên thực thu món
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', borderTop: '4px solid #0284C7', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      TỔNG ĐƠN HÀNG HOÀN TẤT
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A' }}>
                      {adminSystem.totalOrders + orders.length} đơn
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#0284C7', marginTop: 6, fontWeight: 700 }}>
                      Tỷ lệ giao đúng giờ đạt: 97.4%
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', borderTop: '4px solid #F59E0B', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      ĐỐI TÁC ĐANG HOẠT ĐỘNG
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A' }}>
                      {allMerchants.length} quán • {driversList.length} tài xế
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: 6, fontWeight: 700 }}>
                      ✓ 100% tài khoản đã hoàn tất hồ sơ KYC
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
                          <th style={{ padding: '12px 20px' }}>Phí sàn (15%)</th>
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
                              +{Math.round(o.subtotal * 0.15).toLocaleString('vi-VN')}đ
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

            {/* ADMIN TAB 2: MERCHANTS & KYC MODERATION */}
            {currentAdminTab === 'admin-merchants' && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Danh mục Đối tác Nhà hàng & Kiểm soát Pháp lý (KYC)
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Xác minh giấy phép VSATTP, mặt bằng kinh doanh thực tế và quyền hoạt động độc lập trên sàn
                    </p>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '5px 14px', borderRadius: 6 }}>
                    {allMerchants.length} gian hàng đã kích hoạt
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <th style={{ padding: '12px 20px' }}>Gian hàng</th>
                        <th style={{ padding: '12px 20px' }}>Đại diện pháp lý</th>
                        <th style={{ padding: '12px 20px' }}>Địa chỉ kinh doanh</th>
                        <th style={{ padding: '12px 20px' }}>Trạng thái KYC</th>
                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Thao tác quản trị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMerchants.map((m) => {
                        const isLocked = !!lockedMerchants[m.id];
                        return (
                          <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9', background: isLocked ? '#FEF2F2' : '#FFFFFF' }}>
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
                              {m.ownerName || 'Chủ Hộ Kinh Doanh'}
                            </td>
                            <td style={{ padding: '14px 20px', color: '#475569', maxWidth: 280 }}>{m.address}</td>
                            <td style={{ padding: '14px 20px' }}>
                              <span
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  background: isLocked ? '#FEE2E2' : '#DCFCE7',
                                  color: isLocked ? '#DC2626' : '#15803D',
                                }}
                              >
                                {isLocked ? 'Đang tạm đình chỉ' : 'Đã duyệt KYC'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              <button
                                onClick={() => toggleLockMerchant(m.id)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 6,
                                  border: isLocked ? 'none' : '1px solid #FCA5A5',
                                  background: isLocked ? '#10B981' : '#FFFFFF',
                                  color: isLocked ? '#FFFFFF' : '#DC2626',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {isLocked ? 'Khôi phục hoạt động' : 'Tạm khóa gian hàng'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
              </div>
            )}

            {/* ADMIN TAB 4: COMPLAINTS & DISPUTES */}
            {currentAdminTab === 'admin-complaints' && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Danh sách Hồ sơ Khiếu nại & Yêu cầu Hoàn tiền
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                      Thẩm định phản ánh chất lượng món từ khách hàng và duyệt bồi hoàn trực tiếp
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
                        <th style={{ padding: '12px 20px' }}>Mã hồ sơ</th>
                        <th style={{ padding: '12px 20px' }}>Mã đơn hàng</th>
                        <th style={{ padding: '12px 20px' }}>Khách hàng & Gian hàng</th>
                        <th style={{ padding: '12px 20px' }}>Nội dung phản ánh</th>
                        <th style={{ padding: '12px 20px' }}>Mức bồi hoàn</th>
                        <th style={{ padding: '12px 20px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Quyết định xử lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((cmp) => (
                        <tr key={cmp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0F172A' }}>{cmp.code}</td>
                          <td style={{ padding: '14px 20px', color: '#475569' }}>#{cmp.orderNumber}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{cmp.customerName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Quán: {cmp.merchantName}</div>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#334155', maxWidth: 280 }}>{cmp.issueType}</td>
                          <td style={{ padding: '14px 20px', fontWeight: 700, color: '#DC2626' }}>
                            {cmp.compensationAmount.toLocaleString('vi-VN')}đ
                          </td>
                          <td style={{ padding: '14px 20px' }}>
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
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            {cmp.status === 'OPEN' ? (
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  onClick={() => handleResolveComplaint(cmp.id, 'REFUND')}
                                  style={{
                                    padding: '6px 14px',
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
                                    padding: '6px 14px',
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
            )}

            {/* ADMIN TAB 5: RECONCILIATION & VOUCHERS */}
            {currentAdminTab === 'admin-reconciliation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Bảng đối soát công nợ & giải ngân đối tác kỳ 11/2026
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                        Tổng hợp doanh thu gộp, khấu trừ 15% phí nền tảng và xác nhận ủy nhiệm chi 85% về tài khoản quán
                      </p>
                    </div>

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

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <th style={{ padding: '12px 20px' }}>Kỳ</th>
                          <th style={{ padding: '12px 20px' }}>Đối tác Nhà hàng</th>
                          <th style={{ padding: '12px 20px' }}>Số đơn</th>
                          <th style={{ padding: '12px 20px' }}>Doanh thu gộp</th>
                          <th style={{ padding: '12px 20px' }}>Phí sàn (15%)</th>
                          <th style={{ padding: '12px 20px' }}>Thực nhận (85%)</th>
                          <th style={{ padding: '12px 20px' }}>Tài khoản thụ hưởng</th>
                          <th style={{ padding: '12px 20px', textAlign: 'right' }}>Quyết toán</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconciliationList.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '14px 20px', color: '#475569' }}>{r.period}</td>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0F172A' }}>{r.merchantName}</td>
                            <td style={{ padding: '14px 20px' }}>{r.totalOrders}</td>
                            <td style={{ padding: '14px 20px', fontWeight: 600 }}>{r.grossRevenue.toLocaleString('vi-VN')}đ</td>
                            <td style={{ padding: '14px 20px', color: '#DC2626', fontWeight: 600 }}>
                              -{r.commission15.toLocaleString('vi-VN')}đ
                            </td>
                            <td style={{ padding: '14px 20px', color: '#00B14F', fontWeight: 700 }}>
                              {r.netPayout85.toLocaleString('vi-VN')}đ
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: '#64748B' }}>{r.bankAccount}</td>
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
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

                {/* Platform Voucher Campaign Manager */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0' }}>
                    Quản lý Chiến dịch Mã giảm giá toàn sàn
                  </h3>

                  <form
                    onSubmit={handleAddVoucher}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 14,
                      padding: 18,
                      background: '#F8FAFC',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      marginBottom: 20,
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Mã khuyến mãi
                      </label>
                      <input
                        type="text"
                        placeholder="VD: DINEGO50"
                        value={newVoucherCode}
                        onChange={(e) => setNewVoucherCode(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Mức giảm (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="5000"
                        value={newVoucherDiscount}
                        onChange={(e) => setNewVoucherDiscount(Number(e.target.value))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                        Giá trị đơn tối thiểu (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="10000"
                        value={newVoucherMinOrder}
                        onChange={(e) => setNewVoucherMinOrder(Number(e.target.value))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.86rem' }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 18px',
                        borderRadius: 6,
                        background: '#4F46E5',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      + Phát hành mã voucher
                    </button>
                  </form>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <th style={{ padding: '12px 18px' }}>Mã Voucher</th>
                        <th style={{ padding: '12px 18px' }}>Điều kiện áp dụng</th>
                        <th style={{ padding: '12px 18px' }}>Mức giảm</th>
                        <th style={{ padding: '12px 18px' }}>Lượt sử dụng</th>
                        <th style={{ padding: '12px 18px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((v) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 800, color: '#4F46E5' }}>{v.code}</td>
                          <td style={{ padding: '14px 18px', color: '#334155' }}>{v.title}</td>
                          <td style={{ padding: '14px 18px', fontWeight: 700 }}>{v.discountValue.toLocaleString('vi-VN')}đ</td>
                          <td style={{ padding: '14px 18px' }}>{v.usageCount} / {v.maxUsage}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: v.isActive ? '#DCFCE7' : '#F1F5F9',
                                color: v.isActive ? '#15803D' : '#64748B',
                              }}
                            >
                              {v.isActive ? 'Đang kích hoạt' : 'Tạm dừng'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <button
                              onClick={() => toggleVoucherStatus(v.id)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#334155',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {v.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                                    onClick={() => onToggleUserStatus(u.id)}
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
              {currentMerchant?.name || 'Cơm Tấm Sài Gòn 1985'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 4 }}>
              Chủ quán: <strong>{currentMerchant?.ownerName || currentUser?.fullName || 'Võ Thị Bích Thủy'}</strong>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>
              TK: {currentMerchant?.ownerEmail || currentUser?.email || 'comtam1985@dinego.vn'}
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
              id: 'merchant-catering' as NavTab,
              label: 'Hợp đồng Tiệc & Lịch',
              icon: <Calendar size={17} />,
              badge: feastBookings.filter((b) => b.status === 'PENDING_APPROVAL').length,
            },
            {
              id: 'merchant-analytics' as NavTab,
              label: 'Doanh thu & Đánh giá',
              icon: <BarChart3 size={17} />,
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
                                    ? '#DCFCE7'
                                    : order.status === 'COMPLETED'
                                    ? '#F1F5F9'
                                    : '#DBEAFE',
                                color:
                                  order.status === 'PREPARING'
                                    ? '#B45309'
                                    : order.status === 'READY_FOR_PICKUP'
                                    ? '#15803D'
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
                                ? 'Chờ tài xế nhận món'
                                : order.status === 'DELIVERING'
                                ? 'Tài xế đang giao'
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

                        {/* Action Bar */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
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
                                Nhận đơn & Chuyển vào bếp
                              </button>
                            </>
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
                              Xác nhận hoàn tất món • Bàn giao Tài xế
                            </button>
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

          {/* MERCHANT TAB 3: CATERING & FEAST BOOKINGS */}
          {currentMerchantTab === 'merchant-catering' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Danh sách Hợp đồng Đặt tiệc lưu động
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    Kiểm tra biên lai đặt cọc 30% và xác nhận lịch điều phối nhân sự phục vụ tiệc
                  </p>
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
                      {feastBookings.map((fb) => (
                        <tr key={fb.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>#{fb.bookingCode}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{fb.packageName}</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Quy mô: {fb.tableCount} bàn</div>
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
                            <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>
                              Đã cọc: {fb.depositAmount.toLocaleString('vi-VN')}đ
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            {fb.status === 'PENDING_APPROVAL' ? (
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  onClick={() =>
                                    setFeastBookings((prev) =>
                                      prev.map((item) => (item.id === fb.id ? { ...item, status: 'APPROVED' } : item)),
                                    )
                                  }
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
                                  onClick={() =>
                                    setFeastBookings((prev) =>
                                      prev.map((item) => (item.id === fb.id ? { ...item, status: 'REJECTED' } : item)),
                                    )
                                  }
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
                            ) : (
                              <span
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  background: fb.status === 'APPROVED' ? '#DCFCE7' : '#FEE2E2',
                                  color: fb.status === 'APPROVED' ? '#15803D' : '#DC2626',
                                }}
                              >
                                {fb.status === 'APPROVED' ? 'Đã xác nhận lịch' : 'Đã từ chối'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
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
          )}

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
                    onClick={() => setMerchantWithdrawSuccess(true)}
                    style={{
                      marginTop: 8,
                      padding: '9px 14px',
                      borderRadius: 6,
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <ArrowUpRight size={15} /> {merchantWithdrawSuccess ? 'Đã gửi yêu cầu rút tiền' : 'Rút về Vietcombank'}
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
                      {merchantRevenue.topDishes.map((dish, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>{dish.sku}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>{dish.name}</td>
                          <td style={{ padding: '12px 16px' }}>{dish.quantity} phần</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#00B14F' }}>
                            {dish.totalSales.toLocaleString('vi-VN')}đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Customer Reviews Panel */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 20 }}>
                  <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', margin: '0 0 14px 0' }}>
                    Phản hồi đánh giá từ thực khách
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {reviews.map((rev) => (
                      <div key={rev.id} style={{ padding: 14, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
                            {rev.customerName} <span style={{ color: '#64748B', fontWeight: 500 }}>(#{rev.orderRef})</span>
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D97706' }}>{rev.rating}.0 ★</span>
                        </div>
                        <p style={{ fontSize: '0.84rem', color: '#334155', margin: '4px 0 8px 0' }}>{rev.comment}</p>
                        {rev.reply ? (
                          <div style={{ background: '#FFFFFF', borderLeft: '3px solid #D97706', padding: '8px 12px', fontSize: '0.8rem', color: '#475569' }}>
                            <strong>Phản hồi của quán:</strong> {rev.reply}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <input
                              type="text"
                              placeholder="Nhập nội dung phản hồi..."
                              value={replyInput[rev.id] || ''}
                              onChange={(e) => setReplyInput({ ...replyInput, [rev.id]: e.target.value })}
                              style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                            />
                            <button
                              onClick={() => handleSendReply(rev.id)}
                              style={{ padding: '7px 14px', borderRadius: 6, background: '#0F172A', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                              Gửi
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MERCHANT TAB 5: STOREFRONT KYC PROFILE */}
          {currentMerchantTab === 'merchant-kyc' && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, marginBottom: 20, borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Hồ sơ pháp lý & Thông tin định danh gian hàng
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    Dữ liệu đăng ký kinh doanh và chứng nhận An toàn vệ sinh thực phẩm đã được xác thực
                  </p>
                </div>
                <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>
                  Đã xác thực KYC
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 28 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                      TÊN THƯƠNG HIỆU TRÊN SÀN
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentMerchant?.name || 'Cơm Tấm Sài Gòn 1985'}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                      NGƯỜI ĐẠI DIỆN PHÁP LÝ / CHỦ HỘ KINH DOANH
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentMerchant?.ownerName || 'Võ Thị Bích Thủy'}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                      ĐỊA CHỈ MẶT BẰNG KINH DOANH
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentMerchant?.address || '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM'}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
                      SỐ GIẤY PHÉP KINH DOANH & CHỨNG NHẬN ATTP
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentMerchant?.businessLicenseImage || 'GPKD số 0318992819 • ATTP số 288/ATTP-Q1'}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', marginBottom: 8 }}>
                    HÌNH ẢNH MẶT TIỀN ĐÃ NGHIỆM THU THỰC ĐỊA
                  </div>
                  <img
                    src={currentMerchant?.storeFrontImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80'}
                    alt="Mặt tiền quán"
                    style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal In Phiếu Bếp */}
      {printingOrder && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-box" style={{ maxWidth: 400, padding: 24, borderRadius: 12 }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #CBD5E1', paddingBottom: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
                {currentMerchant?.name || 'CƠM TẤM SÀI GÒN 1985'}
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
    </div>
  );
};
