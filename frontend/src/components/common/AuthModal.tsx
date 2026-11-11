// ==============================================================================
// DineGo Frontend — Multi-Actor Authentication Portal (1-to-1 Account Binding)
// - Each Restaurant has its own separate Merchant Account (1-to-1 merchantId)
// - Multiple Drivers can register & log into their own separate Driver Accounts (1-to-1 driverId)
// - Customers & System Admins have their own accounts
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Store,
  Bike,
  MapPin,
  CreditCard,
  FileText,
} from 'lucide-react';
import type { DriverProfile, Merchant, Role, User } from '../../types';
import { MOCK_USERS, MOCK_MERCHANTS, MOCK_DRIVERS } from '../../api/client';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onRegisterMerchantAccount?: (newMerchant: Merchant, newUser: User) => void;
  onRegisterDriverAccount?: (newDriver: DriverProfile, newUser: User) => void;
  onRegisterCustomerAccount?: (newUser: User) => void;
  allUsers?: User[];
  allMerchants?: Merchant[];
  allDrivers?: DriverProfile[];
  initialMode?: 'login' | 'register';
  initialRole?: Role;
}

const ROLE_CONFIG: Record<
  Role,
  {
    title: string;
    shortLabel: string;
    subtitle: string;
    color: string;
    bgLight: string;
    icon: React.ReactNode;
    placeholderEmail: string;
  }
> = {
  CUSTOMER: {
    title: 'Đăng Nhập Khách Hàng DineGo',
    shortLabel: 'Khách hàng',
    subtitle: 'Đặt đồ ăn giao nhanh, đặt tiệc lưu động & quản lý sổ địa chỉ cá nhân',
    color: '#00B14F',
    bgLight: '#ECFDF5',
    icon: <UserIcon size={18} />,
    placeholderEmail: 'customer@dinego.vn hoặc 0901000004',
  },
  MERCHANT: {
    title: 'Cổng Đối Tác Nhà Hàng (Mỗi Quán 1 Tài Khoản Riêng)',
    shortLabel: 'Nhà hàng',
    subtitle: 'Đăng nhập tài khoản riêng của từng nhà hàng để quản lý bếp, thực đơn & doanh thu',
    color: '#D97706',
    bgLight: '#FFFBEB',
    icon: <Store size={18} />,
    placeholderEmail: 'comtam1985@dinego.vn / phothin1979@dinego.vn',
  },
  DRIVER: {
    title: 'Cổng Đối Tác Tài Xế (Mỗi Tài Xế 1 Tài Khoản Riêng)',
    shortLabel: 'Tài xế',
    subtitle: 'Đăng nhập hoặc tạo tài khoản tài xế gọn nhẹ, sau đó hoàn tất đăng ký xe & hồ sơ để vận chuyển',
    color: '#0284C7',
    bgLight: '#F0F9FF',
    icon: <Bike size={18} />,
    placeholderEmail: 'tuan.driver@dinego.vn / hung.driver@dinego.vn',
  },
  ADMIN: {
    title: 'Cổng Quản Trị Hệ Thống Toàn Sàn (System Admin)',
    shortLabel: 'Quản trị viên',
    subtitle: 'Can thiệp sâu toàn hệ thống: Điều phối đơn, Quản lý User, Nhà hàng, Tài xế & Cấu hình sàn',
    color: '#7C3AED',
    bgLight: '#F5F3FF',
    icon: <ShieldCheck size={18} />,
    placeholderEmail: 'admin@dinego.vn',
  },
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onRegisterMerchantAccount,
  onRegisterDriverAccount,
  onRegisterCustomerAccount,
  allUsers = MOCK_USERS,
  allMerchants = MOCK_MERCHANTS,
  allDrivers = MOCK_DRIVERS,
  initialMode = 'login',
  initialRole = 'CUSTOMER',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('DineGo@2026_SecurePass');

  // Common Registration fields
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Merchant Registration specific fields
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('Cơm');
  const [taxCode, setTaxCode] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [bankName, setBankName] = useState('Vietcombank');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const roleUsers = allUsers.filter((u) => u.roles.includes(selectedRole));

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      const role = initialRole || 'CUSTOMER';
      setSelectedRole(role);
      setErrorMsg('');
      setFullName('');
      setRegEmail('');
      setRegPhone('');
      setRegAddress('');
      setRegPassword('');
      setConfirmPassword('');
      const firstForRole = allUsers.find((u) => u.roles.includes(role));
      if (firstForRole) {
        setEmailOrPhone(firstForRole.email);
        setPassword(firstForRole.password || 'DineGo@2026_SecurePass');
      } else {
        setEmailOrPhone('');
        setPassword('');
      }
    }
  }, [isOpen, initialMode, initialRole]);

  const handleSelectRoleTab = (role: Role) => {
    setSelectedRole(role);
    setErrorMsg('');
    if (role === 'ADMIN' && mode === 'register') {
      setMode('login');
    }
    const firstForRole = allUsers.find((u) => u.roles.includes(role));
    if (firstForRole) {
      setEmailOrPhone(firstForRole.email);
      setPassword(firstForRole.password || 'DineGo@2026_SecurePass');
    } else {
      setEmailOrPhone('');
    }
  };

  if (!isOpen) return null;

  const currentRoleCfg = ROLE_CONFIG[selectedRole];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailOrPhone.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email/Số điện thoại và Mật khẩu.');
      return;
    }

    const foundUser = allUsers.find(
      (u) =>
        (u.email.toLowerCase() === emailOrPhone.trim().toLowerCase() ||
          u.phoneNumber === emailOrPhone.trim()) &&
        u.roles.includes(selectedRole),
    );

    if (!foundUser) {
      setErrorMsg(
        `Không tìm thấy tài khoản ${currentRoleCfg.shortLabel} khớp với "${emailOrPhone}". Vui lòng chọn một tài khoản bên dưới hoặc nhấn Đăng ký mới.`,
      );
      return;
    }

    if (foundUser.isActive === false) {
      setErrorMsg('Tài khoản này hiện đang bị khóa bởi Quản trị viên hệ thống.');
      return;
    }

    if (foundUser.password && foundUser.password !== password) {
      setErrorMsg('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      return;
    }

    onLoginSuccess(foundUser);
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Email, Số điện thoại và Mật khẩu.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    const existingEmail = allUsers.find(
      (u) => u.email.toLowerCase() === regEmail.trim().toLowerCase(),
    );
    if (existingEmail) {
      setErrorMsg('Email này đã được đăng ký trên hệ thống. Vui lòng sử dụng email khác.');
      return;
    }

    const nowDate = new Date().toISOString().split('T')[0];

    if (selectedRole === 'MERCHANT') {
      if (!storeName.trim() || !regAddress.trim()) {
        setErrorMsg('Vui lòng nhập Tên nhà hàng và Địa chỉ kinh doanh.');
        return;
      }
      const newMerchantId = `merchant-${Date.now()}`;
      const newUserId = `u-merchant-${Date.now()}`;

      const newMerchant: Merchant = {
        id: newMerchantId,
        ownerUserId: newUserId,
        ownerEmail: regEmail.trim(),
        name: storeName.trim(),
        slug: storeName.trim().toLowerCase().replace(/\s+/g, '-'),
        address: regAddress.trim(),
        phoneNumber: regPhone.trim(),
        ownerName: fullName.trim(),
        businessLicenseNumber: businessLicense.trim() || `GPKD-${Date.now().toString().slice(-6)}`,
        foodSafetyCertNumber: `ATTP-HCM-2026-${Date.now().toString().slice(-4)}`,
        taxCode: taxCode.trim() || `031${Date.now().toString().slice(-7)}`,
        bankName: bankName.trim() || 'Vietcombank',
        bankAccountNumber: bankAccountNumber.trim() || '0071000889900',
        bankAccountHolder: fullName.trim().toUpperCase(),
        commissionRate: 15,
        openingHours: '07:00 - 22:00',
        kycStatus: 'VERIFIED',
        verifiedAt: nowDate,
        coverUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
        logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&auto=format&fit=crop&q=80',
        rating: 5.0,
        reviewCount: 1,
        deliveryTimeMin: 20,
        deliveryTimeMax: 30,
        isActive: true,
        isOpen: true,
        categories: [storeCategory],
      };

      const newMerchantUser: User = {
        id: newUserId,
        email: regEmail.trim(),
        password: regPassword,
        fullName: fullName.trim(),
        phoneNumber: regPhone.trim(),
        address: regAddress.trim(),
        bankName: bankName.trim() || 'Vietcombank',
        bankAccountNumber: bankAccountNumber.trim() || '0071000889900',
        bankAccountHolder: fullName.trim().toUpperCase(),
        roles: ['MERCHANT'],
        merchantId: newMerchantId,
        isActive: true,
        createdAt: nowDate,
      };

      if (onRegisterMerchantAccount) {
        onRegisterMerchantAccount(newMerchant, newMerchantUser);
      } else {
        onLoginSuccess(newMerchantUser);
      }
      onClose();
      return;
    }

    if (selectedRole === 'DRIVER') {
      const newDriverId = `drv-${Date.now()}`;
      const newUserId = `u-driver-${Date.now()}`;

      // Keep account registration lightweight; vehicle & personal KYC are completed in the mandatory onboarding screen
      const newDriverProfile: DriverProfile = {
        id: newDriverId,
        userId: newUserId,
        fullName: fullName.trim(),
        email: regEmail.trim(),
        phoneNumber: regPhone.trim(),
        licensePlate: '',
        vehicleType: '',
        nationalId: '',
        driverLicenseNumber: '',
        operatingZone: '',
        bankName: '',
        bankAccountNumber: '',
        bankAccountHolder: '',
        rating: 5.0,
        completedTrips: 0,
        acceptanceRate: '100%',
        walletBalance: 0,
        status: 'OFFLINE',
        kycStatus: 'PENDING_APPROVAL',
        joinedAt: nowDate,
      };

      const newDriverUser: User = {
        id: newUserId,
        email: regEmail.trim(),
        password: regPassword,
        fullName: fullName.trim(),
        phoneNumber: regPhone.trim(),
        address: '',
        roles: ['DRIVER'],
        driverId: newDriverId,
        isActive: true,
        createdAt: nowDate,
      };

      if (onRegisterDriverAccount) {
        onRegisterDriverAccount(newDriverProfile, newDriverUser);
      } else {
        onLoginSuccess(newDriverUser);
      }
      onClose();
      return;
    }

    // CUSTOMER Registration (No address collected upfront — user sets up map-verified address before ordering)
    const newCustomerUser: User = {
      id: `u-cust-${Date.now()}`,
      email: regEmail.trim(),
      password: regPassword,
      fullName: fullName.trim(),
      phoneNumber: regPhone.trim(),
      address: '',
      savedAddresses: [],
      roles: ['CUSTOMER'],
      isActive: true,
      createdAt: nowDate,
    };

    if (onRegisterCustomerAccount) {
      onRegisterCustomerAccount(newCustomerUser);
    } else {
      onLoginSuccess(newCustomerUser);
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{
          maxWidth: 560,
          background: '#FFFFFF',
          borderRadius: 18,
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            background: currentRoleCfg.bgLight,
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: currentRoleCfg.color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {currentRoleCfg.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {currentRoleCfg.title}
              </h3>
              <p style={{ fontSize: '0.76rem', color: '#475569', margin: '2px 0 0 0' }}>
                {currentRoleCfg.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Actor Role Selector (4 Separate Portals) */}
        <div
          style={{
            padding: '10px 18px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#64748B',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            Chọn phân hệ đăng nhập (Mỗi vai trò có giao diện độc lập):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {(['CUSTOMER', 'MERCHANT', 'DRIVER', 'ADMIN'] as Role[]).map((r) => {
              const cfg = ROLE_CONFIG[r];
              const isSelected = selectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelectRoleTab(r)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px 6px',
                    borderRadius: 8,
                    border: isSelected ? `2px solid ${cfg.color}` : '1px solid #E2E8F0',
                    background: isSelected ? '#FFFFFF' : 'transparent',
                    color: isSelected ? cfg.color : '#64748B',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  {cfg.icon}
                  <span>{cfg.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode Tabs: Login vs Register */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
            padding: '0 18px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            style={{
              flex: 1,
              padding: '11px 10px',
              borderBottom: mode === 'login' ? `3px solid ${currentRoleCfg.color}` : '3px solid transparent',
              color: mode === 'login' ? currentRoleCfg.color : '#64748B',
              fontWeight: 700,
              fontSize: '0.86rem',
              background: 'transparent',
            }}
          >
            Đăng nhập tài khoản {currentRoleCfg.shortLabel}
          </button>
          {selectedRole !== 'ADMIN' && (
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              style={{
                flex: 1,
                padding: '11px 10px',
                borderBottom: mode === 'register' ? `3px solid ${currentRoleCfg.color}` : '3px solid transparent',
                color: mode === 'register' ? currentRoleCfg.color : '#64748B',
                fontWeight: 700,
                fontSize: '0.86rem',
                background: 'transparent',
              }}
            >
              + Đăng ký tài khoản {currentRoleCfg.shortLabel} mới
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Email hoặc Số điện thoại ({currentRoleCfg.shortLabel})
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="text"
                      placeholder={currentRoleCfg.placeholderEmail}
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        color: '#0F172A',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mật khẩu
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 38px 10px 38px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.88rem',
                        color: '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 11,
                        background: 'transparent',
                        color: '#94A3B8',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    background: currentRoleCfg.color,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    marginTop: 4,
                  }}
                >
                  Đăng nhập vào {currentRoleCfg.shortLabel}
                </button>
              </form>

              {/* Separate Individual Account List for the Selected Role */}
              <div
                style={{
                  borderTop: '1px solid #E2E8F0',
                  paddingTop: 14,
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  {selectedRole === 'MERCHANT' &&
                    `Danh sách tài khoản Nhà hàng độc lập (${roleUsers.length} nhà hàng — mỗi quán 1 tài khoản riêng):`}
                  {selectedRole === 'DRIVER' &&
                    `Danh sách tài khoản Tài xế độc lập (${roleUsers.length} tài xế — mỗi tài xế 1 hồ sơ riêng):`}
                  {selectedRole === 'CUSTOMER' &&
                    `Danh sách tài khoản Khách hàng (${roleUsers.length} tài khoản):`}
                  {selectedRole === 'ADMIN' &&
                    `Tài khoản Quản trị viên hệ thống (${roleUsers.length}):`}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {roleUsers.map((u) => {
                    const linkedMerchant =
                      selectedRole === 'MERCHANT'
                        ? allMerchants.find((m) => m.id === u.merchantId || m.ownerUserId === u.id)
                        : null;
                    const linkedDriver =
                      selectedRole === 'DRIVER'
                        ? allDrivers.find((d) => d.id === u.driverId || d.userId === u.id)
                        : null;
                    const isSelectedAcc = emailOrPhone.toLowerCase() === u.email.toLowerCase();

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setEmailOrPhone(u.email);
                          setPassword(u.password || 'DineGo@2026_SecurePass');
                          onLoginSuccess(u);
                          onClose();
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: `1.5px solid ${isSelectedAcc ? currentRoleCfg.color : '#E2E8F0'}`,
                          background: isSelectedAcc ? currentRoleCfg.bgLight : '#F8FAFC',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                            {selectedRole === 'MERCHANT' && linkedMerchant
                              ? `${linkedMerchant.name} — Chủ quán: ${u.fullName}`
                              : selectedRole === 'DRIVER' && linkedDriver
                              ? `${u.fullName}${linkedDriver.licensePlate ? ` — Biển số: ${linkedDriver.licensePlate}` : ' — Chưa đăng ký xe'}`
                              : u.fullName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                            TK: <strong>{u.email}</strong> • SĐT: {u.phoneNumber || '—'}
                            {linkedDriver &&
                              (linkedDriver.vehicleType
                                ? ` • Xe: ${linkedDriver.vehicleType}`
                                : ' • Chưa hoàn tất hồ sơ & xe')}
                            {linkedMerchant && ` • ${linkedMerchant.address}`}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            background: currentRoleCfg.color,
                            color: '#FFFFFF',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          Đăng nhập ngay
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* REGISTER FORM (Supports Independent Merchant Registration, Multiple Driver Registration, or Customer Registration) */
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedRole === 'MERCHANT' && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    fontSize: '0.8rem',
                    color: '#92400E',
                  }}
                >
                  Mỗi nhà hàng đăng ký mới sẽ được cấp <strong>1 tài khoản quản trị riêng biệt</strong> và gian hàng độc lập trên sàn DineGo.
                </div>
              )}

              {selectedRole === 'MERCHANT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Tên nhà hàng / Quán ăn *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Bún Bò Huế Đông Ba"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Ngành hàng chính *
                    </label>
                    <select
                      value={storeCategory}
                      onChange={(e) => setStoreCategory(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#fff' }}
                    >
                      <option value="Cơm">Cơm văn phòng / Cơm tấm</option>
                      <option value="Phở / Bún">Phở / Bún / Mì</option>
                      <option value="Trà sữa">Trà sữa & Đồ uống</option>
                      <option value="Món Nướng">Lẩu & Nướng</option>
                      <option value="Pizza">Pizza & Món Âu</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    {selectedRole === 'MERCHANT' ? 'Họ tên chủ nhà hàng *' : selectedRole === 'DRIVER' ? 'Họ và tên tài xế *' : 'Họ và tên *'}
                  </label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="text"
                    placeholder="0909123456"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Email đăng nhập tài khoản *
                </label>
                <input
                  type="email"
                  placeholder={
                    selectedRole === 'MERCHANT'
                      ? 'tenquan@dinego.vn'
                      : selectedRole === 'DRIVER'
                      ? 'tentaixe.driver@dinego.vn'
                      : 'khachhang@email.com'
                  }
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              {selectedRole === 'MERCHANT' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Địa chỉ kinh doanh của nhà hàng *
                  </label>
                  <input
                    type="text"
                    placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, TP"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {selectedRole === 'CUSTOMER' && (
                <div style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  color: '#0369A1',
                  fontSize: '0.78rem',
                  lineHeight: 1.45,
                }}>
                  Sau khi tạo tài khoản xong, khi đặt món ăn bạn sẽ thiết lập địa chỉ giao hàng và ghim xác thực vị trí trên bản đồ để shipper giao chuẩn xác.
                </div>
              )}

              {selectedRole === 'DRIVER' && (
                <div style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  color: '#0369A1',
                  fontSize: '0.78rem',
                  lineHeight: 1.45,
                }}>
                  Sau khi tạo tài khoản xong, bạn sẽ được chuyển thẳng vào màn hình bắt buộc để hoàn tất thủ tục đăng ký xe &amp; thông tin cá nhân (CCCD, GPLX, biển số xe, tài khoản ngân hàng) trước khi được phép vận chuyển hàng.
                </div>
              )}

              {selectedRole === 'MERCHANT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Ngân hàng nhận đối soát
                    </label>
                    <input
                      type="text"
                      placeholder="Vietcombank / Techcombank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Số tài khoản ngân hàng
                    </label>
                    <input
                      type="text"
                      placeholder="0071000889900"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Mật khẩu *
                  </label>
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Xác nhận mật khẩu *
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  background: currentRoleCfg.color,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  marginTop: 6,
                }}
              >
                Hoàn tất đăng ký tài khoản {currentRoleCfg.shortLabel}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
