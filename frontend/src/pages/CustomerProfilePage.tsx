// ==============================================================================
// DineGo Frontend — Customer Account & Address Management Page
// Allows Customers to view, add, and update personal profile, delivery addresses,
// payment bank accounts, and account password
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
  User as UserIcon,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  CreditCard,
  Lock,
  Save,
  AlertTriangle,
  Receipt,
  Printer,
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  X,
} from 'lucide-react';
import type { Order, SavedAddress, User } from '../types';
import {
  AddressMapPicker,
  type AddressPickerValue,
} from '../components/common/AddressMapPicker';
import {
  CateringFinalBillModal,
  type CateringBillData,
} from '../components/common/CateringFinalBillModal';

type ProfileSection = 'info' | 'addresses' | 'payment' | 'security' | 'invoices';
type InvoiceFilter = 'ALL' | 'CATERING' | 'FOOD' | 'PENDING_DEPOSIT' | 'COMPLETED';

interface CustomerProfilePageProps {
  currentUser: User | null;
  onUpdateUser: (updatedUser: User) => void;
  orders?: Order[];
  initialSection?: ProfileSection;
}

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({
  currentUser,
  onUpdateUser,
  orders = [],
  initialSection = 'info',
}) => {
  const [activeSection, setActiveSection] = useState<ProfileSection>(initialSection);
  const [savedNotice, setSavedNotice] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('ALL');
  const [selectedCateringBill, setSelectedCateringBill] = useState<CateringBillData | null>(null);
  const [selectedFoodInvoice, setSelectedFoodInvoice] = useState<Order | null>(null);

  const invoiceStats = useMemo(() => {
    let totalPaidAmount = 0;
    let pendingDepositAmount = 0;
    let pendingDepositCount = 0;

    orders.forEach((order) => {
      if (order.status === 'CANCELLED') return;
      const isCatering = order.orderType === 'CATERING' || Boolean(order.cateringDetails);
      if (isCatering && order.cateringDetails) {
        if (order.status === 'COMPLETED') {
          totalPaidAmount += order.finalTotal || 0;
        } else if (order.payment?.paymentStatus === 'SUCCESS') {
          totalPaidAmount += order.cateringDetails.depositAmount || 0;
        } else {
          pendingDepositAmount += order.cateringDetails.depositAmount || 0;
          pendingDepositCount += 1;
        }
      } else if (order.payment?.paymentStatus === 'SUCCESS' || order.status === 'COMPLETED') {
        totalPaidAmount += order.finalTotal || 0;
      }
    });

    return {
      totalPaidAmount,
      pendingDepositAmount,
      pendingDepositCount,
      totalTransactions: orders.length,
    };
  }, [orders]);

  const filteredInvoices = useMemo(() => {
    return orders.filter((order) => {
      const isCatering = order.orderType === 'CATERING' || Boolean(order.cateringDetails);
      if (invoiceFilter === 'CATERING') return isCatering;
      if (invoiceFilter === 'FOOD') return !isCatering;
      if (invoiceFilter === 'PENDING_DEPOSIT') {
        return isCatering && order.status !== 'CANCELLED' && order.payment?.paymentStatus !== 'SUCCESS';
      }
      if (invoiceFilter === 'COMPLETED') return order.status === 'COMPLETED';
      return true;
    });
  }, [orders, invoiceFilter]);

  const buildBillDataFromOrder = (order: Order): CateringBillData | null => {
    if (!order.cateringDetails) return null;
    const c = order.cateringDetails;
    return {
      billCode: c.finalBillCode || `BILL-${order.orderNumber}`,
      bookingCode: order.orderNumber,
      merchantName: order.merchant?.name || 'DineGo Catering Kitchen',
      customerName: currentUser?.fullName || 'Quý khách',
      customerPhone: order.recipientPhone || currentUser?.phoneNumber || '—',
      eventAddress: order.deliveryAddress || 'Tại điểm tổ chức tiệc',
      partyTypeTitle: c.partyTypeTitle,
      packageName: c.packageName,
      tableCount: c.tableCount,
      guestCountPerTable: c.guestCountPerTable,
      eventDate: c.eventDate,
      eventTime: c.eventTime,
      dishes: c.dishes,
      customNote: c.customNote,
      subtotal: order.subtotal || order.finalTotal + (order.discountAmount || 0),
      discountAmount: order.discountAmount || 0,
      totalAmount: order.finalTotal,
      depositPercent: c.depositPercent,
      depositAmount: c.depositAmount,
      remainingAmount: c.remainingAmount,
      completedAt: c.completedAt || order.createdAt,
      issuedFor: 'CUSTOMER',
    };
  };

  // Personal Info Form
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser?.dateOfBirth || '');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác'>(currentUser?.gender || 'Nam');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');

  // Payment Bank Info Form
  const [bankName, setBankName] = useState(currentUser?.bankName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(currentUser?.bankAccountNumber || '');
  const [bankAccountHolder, setBankAccountHolder] = useState(
    currentUser?.bankAccountHolder || (currentUser?.fullName ? currentUser.fullName.toUpperCase() : ''),
  );

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Address Book Management
  const getInitialAddresses = (user: User | null): SavedAddress[] => {
    if (!user) return [];
    if (user.savedAddresses && user.savedAddresses.length > 0) {
      return user.savedAddresses;
    }
    if (user.address) {
      const hasCoords =
        typeof user.addressLat === 'number' && typeof user.addressLng === 'number';
      return [
        {
          id: `addr-${user.id}`,
          label: 'Nhà riêng',
          recipientName: user.fullName || '',
          phone: user.phoneNumber || '',
          fullAddress: user.address,
          latitude: user.addressLat,
          longitude: user.addressLng,
          mapVerified: hasCoords,
          isDefault: true,
        },
      ];
    }
    return [];
  };

  const [addresses, setAddresses] = useState<SavedAddress[]>(() => getInitialAddresses(currentUser));

  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Nhà riêng');
  const [addrRecipient, setAddrRecipient] = useState(currentUser?.fullName || '');
  const [addrPhone, setAddrPhone] = useState(currentUser?.phoneNumber || '');
  const [addrPickerValue, setAddrPickerValue] = useState<AddressPickerValue>({
    fullAddress: '',
    isSynced: false,
  });
  const [pickerKey, setPickerKey] = useState(0);
  const [addrDefault, setAddrDefault] = useState(false);

  if (!currentUser) {
    return (
      <div className="container" style={{ padding: '48px 20px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
          Vui lòng đăng nhập để quản lý thông tin tài khoản
        </h3>
      </div>
    );
  }

  const triggerSavedBanner = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(''), 3000);
  };

  const handleSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    const defaultObj = addresses.find((a) => a.isDefault) || addresses[0];
    const defaultAddr = defaultObj?.fullAddress || currentUser.address;
    const updated: User = {
      ...currentUser,
      fullName: fullName.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      dateOfBirth,
      gender,
      avatarUrl: avatarUrl.trim(),
      address: defaultAddr,
      addressLat: defaultObj?.latitude ?? currentUser.addressLat,
      addressLng: defaultObj?.longitude ?? currentUser.addressLng,
      savedAddresses: addresses,
    };
    onUpdateUser(updated);
    triggerSavedBanner('Đã cập nhật thông tin hồ sơ cá nhân thành công.');
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddrLabel('Nhà riêng');
    setAddrRecipient(currentUser.fullName);
    setAddrPhone(currentUser.phoneNumber || '');
    setAddrPickerValue({ fullAddress: '', isSynced: false });
    setPickerKey((k) => k + 1);
    setAddrDefault(addresses.length === 0);
    setIsAddressFormOpen(true);
  };

  const handleOpenEditAddress = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setAddrLabel(addr.label);
    setAddrRecipient(addr.recipientName);
    setAddrPhone(addr.phone);
    setAddrPickerValue({
      fullAddress: addr.fullAddress,
      latitude: addr.latitude,
      longitude: addr.longitude,
      mapReferenceName: addr.mapReferenceName,
      isSynced: Boolean(
        addr.mapVerified &&
          typeof addr.latitude === 'number' &&
          typeof addr.longitude === 'number',
      ),
    });
    setPickerKey((k) => k + 1);
    setAddrDefault(addr.isDefault);
    setIsAddressFormOpen(true);
  };

  const canSaveAddress = Boolean(
    addrRecipient.trim() &&
      addrPhone.trim() &&
      addrPickerValue.fullAddress.trim() &&
      addrPickerValue.isSynced &&
      typeof addrPickerValue.latitude === 'number' &&
      typeof addrPickerValue.longitude === 'number',
  );

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveAddress) return;

    const cleanAddress = addrPickerValue.fullAddress.trim();
    const lat = addrPickerValue.latitude!;
    const lng = addrPickerValue.longitude!;
    const mapRefName = addrPickerValue.mapReferenceName;

    let nextAddresses: SavedAddress[];
    if (editingAddress) {
      nextAddresses = addresses.map((a) =>
        a.id === editingAddress.id
          ? {
              ...a,
              label: addrLabel,
              recipientName: addrRecipient.trim(),
              phone: addrPhone.trim(),
              fullAddress: cleanAddress,
              latitude: lat,
              longitude: lng,
              mapReferenceName: mapRefName,
              mapVerified: true,
              isDefault: addrDefault,
            }
          : addrDefault
          ? { ...a, isDefault: false }
          : a,
      );
    } else {
      const newAddr: SavedAddress = {
        id: `addr-${Date.now()}`,
        label: addrLabel,
        recipientName: addrRecipient.trim(),
        phone: addrPhone.trim(),
        fullAddress: cleanAddress,
        latitude: lat,
        longitude: lng,
        mapReferenceName: mapRefName,
        mapVerified: true,
        isDefault: addrDefault || addresses.length === 0,
      };
      nextAddresses = newAddr.isDefault
        ? [...addresses.map((a) => ({ ...a, isDefault: false })), newAddr]
        : [...addresses, newAddr];
    }

    setAddresses(nextAddresses);
    setIsAddressFormOpen(false);
    const defaultObj = nextAddresses.find((a) => a.isDefault) || nextAddresses[0];
    onUpdateUser({
      ...currentUser,
      address: defaultObj?.fullAddress || '',
      addressLat: defaultObj?.latitude,
      addressLng: defaultObj?.longitude,
      savedAddresses: nextAddresses,
    });
    triggerSavedBanner(
      editingAddress
        ? 'Đã cập nhật địa chỉ giao hàng chuẩn theo bản đồ.'
        : 'Đã thêm địa chỉ giao hàng mới chuẩn theo bản đồ.',
    );
  };

  const handleSetDefaultAddress = (id: string) => {
    const nextAddresses = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    setAddresses(nextAddresses);
    const defaultObj = nextAddresses.find((a) => a.isDefault) || nextAddresses[0];
    onUpdateUser({
      ...currentUser,
      address: defaultObj?.fullAddress || '',
      addressLat: defaultObj?.latitude,
      addressLng: defaultObj?.longitude,
      savedAddresses: nextAddresses,
    });
    triggerSavedBanner('Đã đặt làm địa chỉ nhận hàng mặc định.');
  };

  const handleDeleteAddress = (id: string) => {
    const nextAddresses = addresses.filter((a) => a.id !== id);
    if (nextAddresses.length > 0 && !nextAddresses.some((a) => a.isDefault)) {
      nextAddresses[0].isDefault = true;
    }
    setAddresses(nextAddresses);
    const defaultObj = nextAddresses.find((a) => a.isDefault) || nextAddresses[0];
    onUpdateUser({
      ...currentUser,
      address: defaultObj?.fullAddress || '',
      addressLat: defaultObj?.latitude,
      addressLng: defaultObj?.longitude,
      savedAddresses: nextAddresses,
    });
    triggerSavedBanner('Đã xóa địa chỉ khỏi sổ địa chỉ.');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...currentUser,
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountHolder: bankAccountHolder.trim().toUpperCase(),
    });
    triggerSavedBanner('Đã lưu thông tin tài khoản ngân hàng & hoàn tiền.');
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword !== confirmNewPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    onUpdateUser({
      ...currentUser,
      password: newPassword,
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    triggerSavedBanner('Đã đổi mật khẩu tài khoản thành công.');
  };

  return (
    <div className="container" style={{ padding: '28px 20px 60px', maxWidth: 1120 }}>
      {savedNotice && (
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
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{savedNotice}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Profile Navigation Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #F1F5F9', marginBottom: 14 }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={currentUser.fullName}
                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #00B14F' }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#00B14F',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: '2px solid #A7F3D0',
                  flexShrink: 0,
                }}
              >
                {(currentUser.fullName || 'KH')
                  .trim()
                  .split(/\s+/)
                  .slice(-2)
                  .map((w) => w[0]?.toUpperCase() || '')
                  .join('') || 'KH'}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A' }}>{currentUser.fullName}</div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', wordBreak: 'break-all' }}>{currentUser.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { id: 'info' as const, label: 'Thông tin cá nhân', icon: <UserIcon size={16} /> },
              { id: 'addresses' as const, label: `Sổ địa chỉ nhận hàng (${addresses.length})`, icon: <MapPin size={16} /> },
              { id: 'invoices' as const, label: `Hóa đơn & Giao dịch (${orders.length})`, icon: <Receipt size={16} /> },
              { id: 'payment' as const, label: 'Tài khoản ngân hàng & Ví', icon: <CreditCard size={16} /> },
              { id: 'security' as const, label: 'Đổi mật khẩu & Bảo mật', icon: <Lock size={16} /> },
            ].map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: active ? '#F0FDF4' : 'transparent',
                    color: active ? '#00B14F' : '#334155',
                    fontWeight: active ? 700 : 600,
                    fontSize: '0.86rem',
                    textAlign: 'left',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: 28,
          }}
        >
          {/* SECTION 1: PERSONAL INFO */}
          {activeSection === 'info' && (
            <form onSubmit={handleSavePersonalInfo}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                Quản Lý Hồ Sơ Cá Nhân
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: 22 }}>
                Cập nhật thông tin định danh và số điện thoại liên lạc khi tài xế giao món
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Họ và tên khách hàng *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Số điện thoại nhận hàng *
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Địa chỉ Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Giới tính
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#fff' }}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    URL Ảnh đại diện
                  </label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '11px 24px', borderRadius: 8, fontSize: '0.88rem' }}
              >
                <Save size={16} /> Lưu thay đổi thông tin
              </button>
            </form>
          )}

          {/* SECTION 2: SAVED DELIVERY ADDRESSES */}
          {activeSection === 'addresses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                    Sổ Địa Chỉ Nhận Hàng
                  </h2>
                  <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0 }}>
                    Thêm mới hoặc chỉnh sửa các địa chỉ giao đồ ăn thường xuyên (Nhà riêng, Văn phòng)
                  </p>
                </div>
                <button
                  onClick={handleOpenAddAddress}
                  className="btn btn-primary"
                  style={{ padding: '9px 16px', borderRadius: 8, fontSize: '0.84rem' }}
                >
                  <Plus size={15} /> Thêm địa chỉ mới
                </button>
              </div>

              {isAddressFormOpen && (
                <form
                  onSubmit={handleSaveAddress}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20,
                  }}
                >
                  <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>
                    {editingAddress ? 'Chỉnh sửa địa chỉ nhận hàng' : 'Thêm địa chỉ nhận hàng mới'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Loại địa chỉ
                      </label>
                      <select
                        value={addrLabel}
                        onChange={(e) => setAddrLabel(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#fff' }}
                      >
                        <option value="Nhà riêng">Nhà riêng</option>
                        <option value="Văn phòng">Văn phòng</option>
                        <option value="Trường học / Khác">Trường học / Khác</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Tên người nhận *
                      </label>
                      <input
                        type="text"
                        value={addrRecipient}
                        onChange={(e) => setAddrRecipient(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Số điện thoại người nhận *
                      </label>
                      <input
                        type="text"
                        value={addrPhone}
                        onChange={(e) => setAddrPhone(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Địa chỉ & ghim xác thực trên bản đồ *
                    </label>
                    <AddressMapPicker
                      key={`${editingAddress?.id || 'new'}-${pickerKey}`}
                      initialAddress={editingAddress?.fullAddress || ''}
                      initialLat={editingAddress?.latitude}
                      initialLng={editingAddress?.longitude}
                      initialMapReferenceName={editingAddress?.mapReferenceName}
                      height={250}
                      onChange={setAddrPickerValue}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: '#334155', marginBottom: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={addrDefault}
                      onChange={(e) => setAddrDefault(e.target.checked)}
                    />
                    <span>Đặt làm địa chỉ nhận hàng mặc định</span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <button
                      type="submit"
                      disabled={!canSaveAddress}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 18px',
                        borderRadius: 8,
                        fontSize: '0.84rem',
                        opacity: canSaveAddress ? 1 : 0.55,
                        cursor: canSaveAddress ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Lưu địa chỉ
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddressFormOpen(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 18px', borderRadius: 8, fontSize: '0.84rem' }}
                    >
                      Hủy
                    </button>
                    {!canSaveAddress && (
                      <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 600 }}>
                        Vui lòng nhập đầy đủ người nhận, SĐT và chọn địa chỉ khớp vị trí bản đồ.
                      </span>
                    )}
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {addresses.map((addr) => {
                  const isMapVerified = Boolean(
                    addr.mapVerified &&
                      typeof addr.latitude === 'number' &&
                      typeof addr.longitude === 'number',
                  );
                  return (
                    <div
                      key={addr.id}
                      style={{
                        padding: 18,
                        borderRadius: 12,
                        border: `1.5px solid ${addr.isDefault ? '#00B14F' : '#E2E8F0'}`,
                        background: addr.isDefault ? '#F0FDF4' : '#FFFFFF',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: '#0F172A',
                              color: '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {addr.label}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>
                            {addr.recipientName} • {addr.phone}
                          </span>
                          {addr.isDefault && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#DCFCE7',
                                color: '#15803D',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              Mặc định
                            </span>
                          )}
                          {isMapVerified ? (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#047857',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <CheckCircle2 size={12} />
                              Khớp bản đồ
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#FEF3C7',
                                border: '1px solid #FDE68A',
                                color: '#B45309',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <AlertTriangle size={12} />
                              Chưa xác thực bản đồ
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>{addr.fullAddress}</div>
                        {isMapVerified && typeof addr.latitude === 'number' && typeof addr.longitude === 'number' && (
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 3 }}>
                            Tọa độ ghim: {addr.latitude.toFixed(5)}, {addr.longitude.toFixed(5)}
                          </div>
                        )}
                      </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            color: '#334155',
                          }}
                        >
                          Đặt mặc định
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditAddress(addr)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Edit3 size={13} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #FECACA',
                          background: '#FEF2F2',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: PAYMENT & REFUND BANK ACCOUNT */}
          {activeSection === 'payment' && (
            <form onSubmit={handleSavePayment}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                Tài Khoản Ngân Hàng & Nhận Hoàn Tiền
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: 22 }}>
                Cập nhật tài khoản ngân hàng hoặc ví MoMo để nhận tiền hoàn tự động khi hủy đơn hoặc hủy cọc tiệc
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Tên ngân hàng liên kết
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Số tài khoản thụ hưởng
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Tên chủ tài khoản (In hoa không dấu)
                  </label>
                  <input
                    type="text"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '11px 24px', borderRadius: 8, fontSize: '0.88rem' }}>
                <Save size={16} /> Lưu thông tin ngân hàng
              </button>
            </form>
          )}

          {/* SECTION 4: PASSWORD & SECURITY */}
          {activeSection === 'security' && (
            <form onSubmit={handleSavePassword}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                Đổi Mật Khẩu & Bảo Mật Tài Khoản
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: 22 }}>
                Thay đổi mật khẩu đăng nhập định kỳ để bảo vệ tài khoản đặt món của bạn
              </p>

              <div style={{ maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Xác nhận mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '11px 24px', borderRadius: 8, fontSize: '0.88rem' }}>
                <Save size={16} /> Cập nhật mật khẩu mới
              </button>
            </form>
          )}

          {/* SECTION 5: INVOICES & TRANSACTION HISTORY */}
          {activeSection === 'invoices' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                    Hóa Đơn &amp; Lịch Sử Giao Dịch
                  </h2>
                  <p style={{ fontSize: '0.84rem', color: '#64748B' }}>
                    Theo dõi tiền cọc tiệc MoMo, trạng thái chủ cửa hàng xác nhận và hóa đơn hoàn tất đơn hàng
                  </p>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>Đã thanh toán / Đã nhận cọc</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#00B14F', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    {invoiceStats.totalPaidAmount.toLocaleString('vi-VN')}đ
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#15803D', marginTop: 2 }}>
                    Các khoản đã được đối soát thành công
                  </div>
                </div>

                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400E' }}>Cọc MoMo chờ cửa hàng xác nhận</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#D97706', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    {invoiceStats.pendingDepositAmount.toLocaleString('vi-VN')}đ
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#B45309', marginTop: 2 }}>
                    {invoiceStats.pendingDepositCount} đơn đặt tiệc đang chờ chủ quán duyệt cọc
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Tổng số giao dịch &amp; hóa đơn</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
                    {invoiceStats.totalTransactions} giao dịch
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                    Bao gồm đặt món giao nhanh &amp; đặt tiệc lưu động
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {[
                  { id: 'ALL' as const, label: `Tất cả (${orders.length})` },
                  { id: 'CATERING' as const, label: 'Đặt tiệc & Cọc MoMo' },
                  { id: 'FOOD' as const, label: 'Đặt món giao hàng' },
                  { id: 'PENDING_DEPOSIT' as const, label: `Chờ quán xác nhận cọc (${invoiceStats.pendingDepositCount})` },
                  { id: 'COMPLETED' as const, label: 'Đã có hóa đơn hoàn tất' },
                ].map((tab) => {
                  const active = invoiceFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setInvoiceFilter(tab.id)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 999,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: active ? '1px solid #00B14F' : '1px solid #CBD5E1',
                        background: active ? '#ECFDF5' : '#FFFFFF',
                        color: active ? '#00B14F' : '#475569',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Transactions List */}
              {filteredInvoices.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '44px 20px',
                    background: '#F8FAFC',
                    borderRadius: 12,
                    border: '1px dashed #CBD5E1',
                    color: '#64748B',
                  }}
                >
                  <Receipt size={36} style={{ margin: '0 auto 10px', opacity: 0.45 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#334155' }}>
                    Chưa có giao dịch hoặc hóa đơn nào phù hợp
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                    Khi bạn đặt món hoặc chuyển tiền cọc tiệc MoMo, lịch sử giao dịch sẽ hiển thị đầy đủ tại đây.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredInvoices.map((order) => {
                    const isCatering = order.orderType === 'CATERING' || Boolean(order.cateringDetails);
                    const c = order.cateringDetails;
                    const depositConfirmed = order.payment?.paymentStatus === 'SUCCESS';
                    const isCancelled = order.status === 'CANCELLED';
                    const isCompleted = order.status === 'COMPLETED';
                    const billData = isCatering ? buildBillDataFromOrder(order) : null;

                    return (
                      <div
                        key={order.id}
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: 12,
                          padding: '16px 18px',
                          background: '#FFFFFF',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 14,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 260, flex: 1 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: isCatering ? '#ECFDF5' : '#EFF6FF',
                              color: isCatering ? '#00B14F' : '#2563EB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {isCatering ? <UtensilsCrossed size={18} /> : <ShoppingBag size={18} />}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>
                                {order.merchant?.name || 'Cửa hàng DineGo'}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: isCatering ? '#D1FAE5' : '#DBEAFE',
                                  color: isCatering ? '#065F46' : '#1E40AF',
                                }}
                              >
                                {isCatering ? 'Đặt tiệc lưu động' : 'Giao đồ ăn'}
                              </span>
                              {isCancelled ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FEE2E2', color: '#DC2626' }}>
                                  Đã hủy
                                </span>
                              ) : isCatering && !depositConfirmed ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#B45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={11} /> Chờ cửa hàng xác nhận cọc
                                </span>
                              ) : isCompleted ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#DCFCE7', color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle2 size={11} /> {isCatering ? 'Đã tất toán • Có Bill tổng' : 'Đã hoàn tất thanh toán'}
                                </span>
                              ) : depositConfirmed ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#D1FAE5', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle2 size={11} /> {isCatering ? 'Chủ quán đã xác nhận cọc' : 'Đã thanh toán'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#D97706' }}>
                                  Thanh toán khi nhận (COD)
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>
                              Mã đơn: <strong>#{order.orderNumber}</strong>
                              {order.payment?.transactionRef ? ` • Mã GD: ${order.payment.transactionRef}` : ''}
                              {` • ${new Date(order.createdAt).toLocaleString('vi-VN')}`}
                            </div>

                            {isCatering && c ? (
                              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 3 }}>
                                {c.packageName} ({c.tableCount} mâm) • Tổng đơn: <strong>{order.finalTotal.toLocaleString('vi-VN')}đ</strong> • Cọc {c.depositPercent}%: <strong style={{ color: depositConfirmed ? '#00B14F' : '#D97706' }}>{c.depositAmount.toLocaleString('vi-VN')}đ</strong>
                                {!isCompleted && ` • Còn lại sau tiệc: ${c.remainingAmount.toLocaleString('vi-VN')}đ`}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 3 }}>
                                {order.items.length} món • Phương thức: {order.payment?.paymentMethod === 'MOMO_QR' ? 'Ví MoMo QR' : 'Tiền mặt (COD)'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                              {isCatering
                                ? isCompleted
                                  ? 'Tổng giá trị bill'
                                  : depositConfirmed
                                  ? 'Tiền cọc đã xác nhận'
                                  : 'Tiền cọc chờ duyệt'
                                : 'Tổng thanh toán'}
                            </div>
                            <div
                              style={{
                                fontSize: '1.08rem',
                                fontWeight: 900,
                                color: isCatering && !depositConfirmed && !isCompleted ? '#D97706' : '#00B14F',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {(isCatering && !isCompleted && c ? c.depositAmount : order.finalTotal).toLocaleString('vi-VN')}đ
                            </div>
                          </div>

                          {isCatering && isCompleted && billData ? (
                            <button
                              type="button"
                              onClick={() => setSelectedCateringBill(billData)}
                              style={{
                                padding: '7px 12px',
                                borderRadius: 8,
                                background: '#0F172A',
                                color: '#FFFFFF',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Printer size={14} /> Xem &amp; In Bill tổng
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedFoodInvoice(order)}
                              style={{
                                padding: '7px 12px',
                                borderRadius: 8,
                                background: '#F8FAFC',
                                color: '#0F172A',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Receipt size={14} /> Chi tiết biên lai
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
        </div>
      </div>

      {/* Catering Final Settlement Bill Modal */}
      <CateringFinalBillModal
        bill={selectedCateringBill}
        onClose={() => setSelectedCateringBill(null)}
      />

      {/* General Order / Deposit Receipt Modal */}
      {selectedFoodInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.58)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedFoodInvoice(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              padding: 24,
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #CBD5E1', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#00B14F', textTransform: 'uppercase' }}>
                  Biên lai giao dịch DineGo
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                  #{selectedFoodInvoice.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFoodInvoice(null)}
                style={{ width: 32, height: 32, borderRadius: 8, background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div><strong>Cửa hàng:</strong> {selectedFoodInvoice.merchant?.name}</div>
              <div><strong>Thời gian đặt:</strong> {new Date(selectedFoodInvoice.createdAt).toLocaleString('vi-VN')}</div>
              <div><strong>Địa chỉ:</strong> {selectedFoodInvoice.deliveryAddress}</div>
              <div>
                <strong>Phương thức:</strong>{' '}
                {selectedFoodInvoice.payment?.paymentMethod === 'MOMO_QR' ? 'Ví MoMo QR' : 'Tiền mặt (COD)'}
                {selectedFoodInvoice.payment?.transactionRef ? ` (${selectedFoodInvoice.payment.transactionRef})` : ''}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '12px 0', marginBottom: 14 }}>
              {selectedFoodInvoice.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', padding: '4px 0', color: '#0F172A' }}>
                  <span>{item.quantity}x {item.itemName}</span>
                  <span style={{ fontWeight: 700 }}>{(item.subtotal || item.basePrice * item.quantity).toLocaleString('vi-VN')}đ</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84rem', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Phí giao hàng / phục vụ</span>
                <span>{(selectedFoodInvoice.deliveryFee || 0).toLocaleString('vi-VN')}đ</span>
              </div>
              {(selectedFoodInvoice.discountAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00B14F' }}>
                  <span>Giảm giá / Ưu đãi</span>
                  <span>-{selectedFoodInvoice.discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', paddingTop: 6, borderTop: '1px dashed #CBD5E1' }}>
                <span>Tổng giá trị đơn</span>
                <span style={{ color: '#00B14F' }}>{selectedFoodInvoice.finalTotal.toLocaleString('vi-VN')}đ</span>
              </div>
              {selectedFoodInvoice.cateringDetails && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 800, color: selectedFoodInvoice.payment?.paymentStatus === 'SUCCESS' ? '#059669' : '#D97706' }}>
                  <span>
                    {selectedFoodInvoice.payment?.paymentStatus === 'SUCCESS'
                      ? `Đã xác nhận tiền cọc (${selectedFoodInvoice.cateringDetails.depositPercent}%)`
                      : `Tiền cọc chờ chủ quán xác nhận (${selectedFoodInvoice.cateringDetails.depositPercent}%)`}
                  </span>
                  <span>{selectedFoodInvoice.cateringDetails.depositAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ padding: '9px 16px', borderRadius: 8, fontSize: '0.84rem' }}
              >
                <Printer size={15} /> In biên lai
              </button>
              <button
                type="button"
                onClick={() => setSelectedFoodInvoice(null)}
                style={{ padding: '9px 16px', borderRadius: 8, background: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: '0.84rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

