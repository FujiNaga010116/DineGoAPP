// ==============================================================================
// DineGo Frontend — Customer Account & Address Management Page
// Allows Customers to view, add, and update personal profile, delivery addresses,
// payment bank accounts, and account password
// ==============================================================================

import React, { useState } from 'react';
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
} from 'lucide-react';
import type { SavedAddress, User } from '../types';
import {
  AddressMapPicker,
  type AddressPickerValue,
} from '../components/common/AddressMapPicker';

interface CustomerProfilePageProps {
  currentUser: User | null;
  onUpdateUser: (updatedUser: User) => void;
}

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({
  currentUser,
  onUpdateUser,
}) => {
  const [activeSection, setActiveSection] = useState<'info' | 'addresses' | 'payment' | 'security'>('info');
  const [savedNotice, setSavedNotice] = useState('');

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
        </div>
      </div>
    </div>
  );
};

