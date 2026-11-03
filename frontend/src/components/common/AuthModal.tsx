// ==============================================================================
// DineGo Frontend — Authentication & Role Switcher Modal (Sprint 1 — U007, U008, U011)
// ==============================================================================

import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, Store, Bike, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Role, User } from '../../types';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectUser: (user: User) => void;
}

const PRESET_USERS: Record<Role, User> = {
  CUSTOMER: {
    id: 'u-customer-001',
    email: 'customer@dinego.vn',
    fullName: 'Nguyễn Văn An (Khách hàng)',
    phoneNumber: '0901000004',
    roles: ['CUSTOMER'],
  },
  MERCHANT: {
    id: 'u-merchant-001',
    email: 'merchant@dinego.vn',
    fullName: 'Chủ Quán Cơm Tấm Sài Gòn 1985',
    phoneNumber: '0901000002',
    roles: ['MERCHANT'],
  },
  DRIVER: {
    id: 'u-driver-001',
    email: 'driver@dinego.vn',
    fullName: 'Tài Xế Giao Hàng DineGo',
    phoneNumber: '0901000003',
    roles: ['DRIVER'],
  },
  ADMIN: {
    id: 'u-admin-001',
    email: 'admin@dinego.vn',
    fullName: 'Quản Trị Viên Hệ Thống DineGo',
    phoneNumber: '0901000001',
    roles: ['ADMIN'],
  },
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'otp' | 'google'>('roles');
  const [phoneNumber, setPhoneNumber] = useState('0987654321');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = () => {
    if (!phoneNumber.trim()) return;
    setOtpSent(true);
    setOtpCode('123456'); // Mô phỏng mã OTP
  };

  const handleVerifyOtp = () => {
    if (otpCode === '123456') {
      setOtpSuccess(true);
      setTimeout(() => {
        onSelectUser({
          id: `cust-otp-${Date.now()}`,
          email: `${phoneNumber}@dinego.vn`,
          fullName: `Khách Hàng (${phoneNumber})`,
          phoneNumber,
          roles: ['CUSTOMER'],
        });
        onClose();
        setOtpSuccess(false);
        setOtpSent(false);
      }, 1000);
    }
  };

  const handleGoogleLogin = () => {
    onSelectUser({
      id: 'cust-google-001',
      email: 'huynhthelong.dev@gmail.com',
      fullName: 'Huỳnh Thế Long (Google)',
      roles: ['CUSTOMER'],
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #FF5722, #FF7043)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Tài khoản & Xác thực DineGo</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Chuyển đổi vai trò kiểm thử E2E hoặc đăng nhập OTP / Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            padding: '12px 24px 0',
            gap: 10,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setActiveTab('roles')}
            style={{
              padding: '10px 16px',
              borderBottom: activeTab === 'roles' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'roles' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              background: 'transparent',
            }}
          >
            Chuyển nhanh vai trò (E2E)
          </button>
          <button
            onClick={() => setActiveTab('otp')}
            style={{
              padding: '10px 16px',
              borderBottom: activeTab === 'otp' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'otp' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              background: 'transparent',
            }}
          >
            Đăng nhập OTP (SMS)
          </button>
          <button
            onClick={() => setActiveTab('google')}
            style={{
              padding: '10px 16px',
              borderBottom: activeTab === 'google' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'google' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              background: 'transparent',
            }}
          >
            Google OAuth
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {activeTab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                Chọn 1 vai trò đã seed sẵn trong Database để kiểm tra tính năng thực tế:
              </p>

              {/* Customer */}
              <div
                onClick={() => {
                  onSelectUser(PRESET_USERS.CUSTOMER);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: currentUser.roles.includes('CUSTOMER') ? 'var(--primary-light)' : 'var(--bg-card)',
                  border: `1px solid ${currentUser.roles.includes('CUSTOMER') ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 10 }}>
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Khách hàng (Customer)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>customer@dinego.vn • Đặt món, đặt tiệc, AI Guide, giỏ hàng nhóm</div>
                  </div>
                </div>
                {currentUser.roles.includes('CUSTOMER') && <CheckCircle2 size={18} color="var(--primary)" />}
              </div>

              {/* Merchant */}
              <div
                onClick={() => {
                  onSelectUser(PRESET_USERS.MERCHANT);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: currentUser.roles.includes('MERCHANT') ? 'var(--primary-light)' : 'var(--bg-card)',
                  border: `1px solid ${currentUser.roles.includes('MERCHANT') ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: 8, borderRadius: 10 }}>
                    <Store size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Chủ nhà hàng (Merchant)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>merchant@dinego.vn • Xem báo cáo doanh thu, duyệt tiệc, trả lời review</div>
                  </div>
                </div>
                {currentUser.roles.includes('MERCHANT') && <CheckCircle2 size={18} color="var(--primary)" />}
              </div>

              {/* Driver */}
              <div
                onClick={() => {
                  onSelectUser(PRESET_USERS.DRIVER);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: currentUser.roles.includes('DRIVER') ? 'var(--primary-light)' : 'var(--bg-card)',
                  border: `1px solid ${currentUser.roles.includes('DRIVER') ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#06B6D4', background: 'rgba(6, 182, 212, 0.1)', padding: 8, borderRadius: 10 }}>
                    <Bike size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tài xế giao hàng (Driver)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>driver@dinego.vn • Nhận đơn giao, cập nhật GPS thời gian thực</div>
                  </div>
                </div>
                {currentUser.roles.includes('DRIVER') && <CheckCircle2 size={18} color="var(--primary)" />}
              </div>

              {/* Admin */}
              <div
                onClick={() => {
                  onSelectUser(PRESET_USERS.ADMIN);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: currentUser.roles.includes('ADMIN') ? 'var(--primary-light)' : 'var(--bg-card)',
                  border: `1px solid ${currentUser.roles.includes('ADMIN') ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)', padding: 8, borderRadius: 10 }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Quản trị viên (Admin)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>admin@dinego.vn • Thống kê GMV toàn sàn, đối soát, duyệt quán, khiếu nại</div>
                  </div>
                </div>
                {currentUser.roles.includes('ADMIN') && <CheckCircle2 size={18} color="var(--primary)" />}
              </div>
            </div>
          )}

          {activeTab === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: 'var(--text-secondary)' }}>
                  Số điện thoại Việt Nam (+84)
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0987654321"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                    }}
                  />
                  <button
                    onClick={handleSendOtp}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {otpSent ? 'Gửi lại mã' : 'Nhận mã OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: '0.85rem', marginBottom: 10 }}>
                    Mã xác thực đã gửi: <strong>123456</strong> (Mock SMS Gateway)
                  </div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Nhập mã 6 chữ số
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    placeholder="123456"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      fontSize: '1.2rem',
                      letterSpacing: 6,
                      textAlign: 'center',
                    }}
                  />
                  <button
                    onClick={handleVerifyOtp}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 14 }}
                  >
                    {otpSuccess ? 'Đăng nhập thành công...' : 'Xác thực & Đăng nhập'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'google' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Sparkles size={28} color="#4285F4" />
              </div>
              <h4 style={{ marginBottom: 6 }}>Đăng nhập 1 chạm với Google</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Tự động liên kết tài khoản Customer với hồ sơ Google đã xác thực
              </p>
              <button
                onClick={handleGoogleLogin}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '12px',
                }}
              >
                <img
                  src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
                  alt="Google"
                  style={{ width: 20, height: 20 }}
                />
                Tiếp tục với Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
