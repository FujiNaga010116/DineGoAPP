// ==============================================================================
// DineGo Frontend — Market-Grade Authentication Modal (GrabFood / ShopeeFood Style)
// Full Sign-In / Sign-Up / SMS OTP / Demo Accounts (User 1, 2, 3, Merchant, Driver, Admin)
// ==============================================================================

import React, { useState } from 'react';
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
  Sparkles,
  ShieldCheck,
  Store,
  Bike,
  ArrowRight,
} from 'lucide-react';
import type { Role, User } from '../../types';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialMode?: 'login' | 'register' | 'otp';
}

export interface DemoAccount {
  label: string;
  roleName: string;
  user: User;
  password: string;
  badgeColor: string;
  badgeBg: string;
  icon: React.ReactNode;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'User 1 (Khách hàng 1)',
    roleName: 'Khách hàng VIP',
    user: {
      id: 'u-user1-001',
      email: 'user1@dinego.vn',
      fullName: 'Nguyễn Văn An (User 1)',
      phoneNumber: '0901000004',
      roles: ['CUSTOMER'],
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    password: 'DineGo@123',
    badgeColor: '#00B14F',
    badgeBg: 'rgba(0, 177, 79, 0.12)',
    icon: <UserIcon size={16} />,
  },
  {
    label: 'User 2 (Khách hàng 2)',
    roleName: 'Khách hàng thân thiết',
    user: {
      id: 'u-user2-002',
      email: 'user2@dinego.vn',
      fullName: 'Trần Thị Bình (User 2)',
      phoneNumber: '0901000005',
      roles: ['CUSTOMER'],
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    },
    password: 'DineGo@123',
    badgeColor: '#00B14F',
    badgeBg: 'rgba(0, 177, 79, 0.12)',
    icon: <UserIcon size={16} />,
  },
  {
    label: 'User 3 (Khách hàng 3)',
    roleName: 'Khách hàng mới',
    user: {
      id: 'u-user3-003',
      email: 'user3@dinego.vn',
      fullName: 'Lê Hoàng Cường (User 3)',
      phoneNumber: '0901000006',
      roles: ['CUSTOMER'],
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
    password: 'DineGo@123',
    badgeColor: '#00B14F',
    badgeBg: 'rgba(0, 177, 79, 0.12)',
    icon: <UserIcon size={16} />,
  },
  {
    label: 'Chủ Quán Đối Tác',
    roleName: 'Cơm Tấm Sài Gòn 1985',
    user: {
      id: 'u-merchant-001',
      email: 'merchant@dinego.vn',
      fullName: 'Chủ Quán Cơm Tấm Sài Gòn',
      phoneNumber: '0901000002',
      roles: ['MERCHANT'],
      avatarUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=100&auto=format&fit=crop&q=80',
    },
    password: 'Merchant@123',
    badgeColor: '#F59E0B',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    icon: <Store size={16} />,
  },
  {
    label: 'Tài Xế Công Nghệ',
    roleName: 'Shipper DineGo Express',
    user: {
      id: 'u-driver-001',
      email: 'driver@dinego.vn',
      fullName: 'Tài Xế Nguyễn Quốc Tuấn',
      phoneNumber: '0901000003',
      roles: ['DRIVER'],
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    },
    password: 'Driver@123',
    badgeColor: '#06B6D4',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    icon: <Bike size={16} />,
  },
  {
    label: 'Quản Trị Viên Sàn',
    roleName: 'Admin Hệ Thống DineGo',
    user: {
      id: 'u-admin-001',
      email: 'admin@dinego.vn',
      fullName: 'Quản Trị Viên Hệ Thống',
      phoneNumber: '0901000001',
      roles: ['ADMIN'],
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    },
    password: 'Admin@123',
    badgeColor: '#8B5CF6',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    icon: <ShieldCheck size={16} />,
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // OTP states
  const [otpPhone, setOtpPhone] = useState('0901000004');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Xử lý đăng nhập thông thường
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailOrPhone.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email/SĐT và Mật khẩu.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // Tìm xem có khớp demo account nào không, nếu không tạo tài khoản CUSTOMER
      const found = DEMO_ACCOUNTS.find(
        (acc) =>
          acc.user.email.toLowerCase() === emailOrPhone.trim().toLowerCase() ||
          acc.user.phoneNumber === emailOrPhone.trim(),
      );

      setLoading(false);

      if (found) {
        onLoginSuccess(found.user);
        onClose();
      } else {
        // Tài khoản khách tự nhập
        const newUser: User = {
          id: `usr-${Date.now()}`,
          email: emailOrPhone.includes('@') ? emailOrPhone.trim() : `${emailOrPhone.trim()}@dinego.vn`,
          fullName: emailOrPhone.split('@')[0],
          phoneNumber: emailOrPhone.includes('@') ? undefined : emailOrPhone.trim(),
          roles: ['CUSTOMER'],
        };
        onLoginSuccess(newUser);
        onClose();
      }
    }, 600);
  };

  // Xử lý đăng ký mới
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !emailOrPhone.trim() || !password.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const newUser: User = {
        id: `usr-reg-${Date.now()}`,
        email: emailOrPhone.includes('@') ? emailOrPhone.trim() : `${emailOrPhone.trim()}@dinego.vn`,
        fullName: fullName.trim(),
        phoneNumber: registerPhone || (emailOrPhone.includes('@') ? '0901234567' : emailOrPhone.trim()),
        roles: ['CUSTOMER'],
      };
      onLoginSuccess(newUser);
      onClose();
    }, 600);
  };

  // Chọn tài khoản mẫu (1-click fill and login)
  const handleSelectDemoAccount = (demo: DemoAccount) => {
    setEmailOrPhone(demo.user.email);
    setPassword(demo.password);
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(demo.user);
      onClose();
    }, 400);
  };

  // Gửi mã OTP
  const handleSendOtp = () => {
    if (!otpPhone.trim()) return;
    setOtpSent(true);
    setOtpCode('123456');
    setCountdown(60);
  };

  const handleVerifyOtp = () => {
    if (otpCode !== '123456') {
      setErrorMsg('Mã OTP không chính xác. Vui lòng nhập 123456.');
      return;
    }

    const matched = DEMO_ACCOUNTS.find((acc) => acc.user.phoneNumber === otpPhone.trim());
    const userToLog: User = matched
      ? matched.user
      : {
          id: `usr-otp-${Date.now()}`,
          email: `${otpPhone}@dinego.vn`,
          fullName: `Khách Hàng (${otpPhone})`,
          phoneNumber: otpPhone,
          roles: ['CUSTOMER'],
        };

    onLoginSuccess(userToLog);
    onClose();
  };

  // Đăng nhập Google
  const handleGoogleLogin = () => {
    onLoginSuccess(DEMO_ACCOUNTS[0].user); // Login as User 1
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
          border: '1px solid #E5E7EB',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #00B14F 0%, #00873C 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.2rem',
                boxShadow: '0 4px 10px rgba(0, 177, 79, 0.3)',
              }}
            >
              DG
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                {mode === 'login' && 'Chào mừng trở lại DineGo'}
                {mode === 'register' && 'Tạo tài khoản DineGo mới'}
                {mode === 'otp' && 'Đăng nhập qua SMS OTP'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                Nền tảng ẩm thực chuẩn vị hàng đầu Việt Nam
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F3F4F6',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4B5563',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switchers: Login / Register / OTP */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E5E7EB',
            background: '#F9FAFB',
            padding: '4px 16px 0',
          }}
        >
          <button
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            style={{
              flex: 1,
              padding: '12px 10px',
              borderBottom: mode === 'login' ? '3px solid #00B14F' : '3px solid transparent',
              color: mode === 'login' ? '#00B14F' : '#6B7280',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: 'transparent',
            }}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            style={{
              flex: 1,
              padding: '12px 10px',
              borderBottom: mode === 'register' ? '3px solid #00B14F' : '3px solid transparent',
              color: mode === 'register' ? '#00B14F' : '#6B7280',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: 'transparent',
            }}
          >
            Đăng ký
          </button>
          <button
            onClick={() => {
              setMode('otp');
              setErrorMsg('');
            }}
            style={{
              flex: 1,
              padding: '12px 10px',
              borderBottom: mode === 'otp' ? '3px solid #00B14F' : '3px solid transparent',
              color: mode === 'otp' ? '#00B14F' : '#6B7280',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: 'transparent',
            }}
          >
            Mã OTP
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 10,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
                fontSize: '0.85rem',
                marginBottom: 18,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN (EMAIL & PASSWORD) */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email hoặc Số điện thoại
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: 13 }} />
                  <input
                    type="text"
                    placeholder="user1@dinego.vn hoặc 0901000004"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: 12,
                      border: '1.5px solid #E5E7EB',
                      fontSize: '0.92rem',
                      color: '#111827',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Mật khẩu</label>
                  <a href="#forgot" style={{ fontSize: '0.82rem', color: '#00B14F', fontWeight: 600 }}>
                    Quên mật khẩu?
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: 13 }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      borderRadius: 12,
                      border: '1.5px solid #E5E7EB',
                      fontSize: '0.92rem',
                      color: '#111827',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: 13,
                      background: 'transparent',
                      color: '#9CA3AF',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#00B14F', width: 16, height: 16 }}
                />
                <label htmlFor="remember" style={{ fontSize: '0.85rem', color: '#4B5563', cursor: 'pointer' }}>
                  Ghi nhớ đăng nhập trên thiết bị này
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '1rem' }}
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>

              {/* Social Login Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '8px 0',
                  color: '#9CA3AF',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <span>Hoặc đăng nhập với</span>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontSize: '0.9rem',
                }}
              >
                <img
                  src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
                  alt="Google"
                  style={{ width: 18, height: 18 }}
                />
                <span>Tiếp tục với Google</span>
              </button>
            </form>
          )}

          {/* MODE 2: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Họ và tên
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1.5px solid #E5E7EB',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1.5px solid #E5E7EB',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Số điện thoại (+84)
                </label>
                <input
                  type="tel"
                  placeholder="0987654321"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1.5px solid #E5E7EB',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Mật khẩu
                </label>
                <input
                  type="password"
                  placeholder="Tối thiểu 8 ký tự..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1.5px solid #E5E7EB',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1.5px solid #E5E7EB',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ fontSize: '0.78rem', color: '#6B7280', margin: '4px 0' }}>
                Bằng cách tạo tài khoản, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của DineGo.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: '1rem' }}
              >
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
              </button>
            </form>
          )}

          {/* MODE 3: SMS OTP LOGIN */}
          {mode === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Số điện thoại nhận mã OTP
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Phone size={18} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: 13 }} />
                    <input
                      type="tel"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                      placeholder="0901000004"
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: 12,
                        border: '1.5px solid #E5E7EB',
                        fontSize: '0.92rem',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {otpSent ? 'Gửi lại mã' : 'Nhận mã OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div style={{ background: '#F0FDF4', padding: 16, borderRadius: 12, border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#166534', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} color="#166534" />
                    <span>Mã OTP giả lập đã gửi tới số điện thoại: <strong>123456</strong></span>
                  </div>

                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Nhập mã 6 chữ số
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 10,
                      border: '1.5px solid #00B14F',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      letterSpacing: 8,
                      fontWeight: 800,
                      background: '#fff',
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 12, padding: '12px' }}
                  >
                    Xác nhận OTP & Đăng nhập
                  </button>
                </div>
              )}
            </div>
          )}

          {/* QUICK DEMO ACCOUNTS SECTION (Theo yêu cầu: User 1, 2, 3, Quán, Shipper, Admin) */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px dashed #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Sparkles size={16} color="#00B14F" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                Tài khoản mẫu thử nghiệm ngay (1-Click Test):
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 12 }}>
              Chọn bất kỳ tài khoản nào để tự động đăng nhập và trải nghiệm toàn bộ tính năng:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectDemoAccount(acc)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00B14F';
                    e.currentTarget.style.background = '#F0FDF4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: acc.badgeBg,
                      color: acc.badgeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {acc.icon}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {acc.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      {acc.user.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
