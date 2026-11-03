// ==============================================================================
// DineGo Frontend — Interactive E2E Multi-Role Switcher Bar
// Switch between Customer (Khách hàng), Merchant (Chủ quán), Driver (Shipper), Admin
// Plus One-Click Auto-Simulation of the Entire Food Ordering & Delivery Lifecycle
// ==============================================================================

import React, { useState } from 'react';
import {
  User as UserIcon,
  Store,
  Bike,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { DEMO_ACCOUNTS } from './AuthModal';
import type { Order, OrderStatus, User } from '../../types';

interface RoleSwitcherBarProps {
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onNavigateTab: (tab: any) => void;
  latestOrder: Order | null;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onOpenReviewModal: (order: Order) => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  currentUser,
  onSelectUser,
  onNavigateTab,
  latestOrder,
  onUpdateOrderStatus,
  onOpenReviewModal,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStepText, setSimStepText] = useState<string | null>(null);

  const customerDemo = DEMO_ACCOUNTS[0].user; // User 1
  const merchantDemo = DEMO_ACCOUNTS[3].user; // Chủ quán
  const driverDemo = DEMO_ACCOUNTS[4].user; // Tài xế
  const adminDemo = DEMO_ACCOUNTS[5].user; // Admin

  const currentRole = currentUser?.roles?.[0] || 'GUEST';

  // Chuyển sang Khách hàng
  const handleSwitchCustomer = () => {
    onSelectUser(customerDemo);
    onNavigateTab('orders');
  };

  // Chuyển sang Chủ Quán
  const handleSwitchMerchant = () => {
    onSelectUser(merchantDemo);
    onNavigateTab('dashboard');
  };

  // Chuyển sang Tài Xế
  const handleSwitchDriver = () => {
    onSelectUser(driverDemo);
    onNavigateTab('tracking');
  };

  // Chuyển sang Quản Trị Viên
  const handleSwitchAdmin = () => {
    onSelectUser(adminDemo);
    onNavigateTab('dashboard');
  };

  // Tự động chạy toàn bộ quy trình E2E từ A-Z
  const handleAutoSimulateE2E = () => {
    if (!latestOrder) {
      alert('Vui lòng tạo hoặc chọn một đơn hàng trước khi chạy mô phỏng!');
      return;
    }

    setIsSimulating(true);
    const orderId = latestOrder.id;

    // Bước 1: Quán nhận đơn & bắt tay làm món (sau 1.5s)
    setSimStepText('👨‍🍳 1/4: Chủ quán Cơm Tấm nhận đơn và bắt tay vào nấu...');
    onSelectUser(merchantDemo);
    onNavigateTab('dashboard');

    setTimeout(() => {
      onUpdateOrderStatus(orderId, 'PREPARING');
      setSimStepText('📦 2/4: Quán nấu xong, đóng gói và phát tín hiệu tìm Shipper...');

      // Bước 2: Quán nấu xong, gọi Shipper (sau 2.5s)
      setTimeout(() => {
        onUpdateOrderStatus(orderId, 'READY_FOR_PICKUP');
        setSimStepText('🛵 3/4: Tài xế Nguyễn Quốc Tuấn nhận cuốc, đến quán lấy món...');
        onSelectUser(driverDemo);
        onNavigateTab('tracking');

        // Bước 3: Shipper lấy món & đang giao (sau 2.5s)
        setTimeout(() => {
          onUpdateOrderStatus(orderId, 'DELIVERING');
          setSimStepText('🚀 4/4: Shipper đang di chuyển đến nhà khách & hoàn tất...');

          // Bước 4: Shipper giao tới nơi & quyết toán (sau 2.5s)
          setTimeout(() => {
            onUpdateOrderStatus(orderId, 'COMPLETED');
            setSimStepText('🎉 Hoàn tất! Quán nhận 85% tiền món, Shipper nhận 100% tiền ship!');
            onSelectUser(customerDemo);
            onNavigateTab('orders');

            setTimeout(() => {
              setIsSimulating(false);
              setSimStepText(null);
              // Mở modal đánh giá món ăn
              onOpenReviewModal(latestOrder);
            }, 2000);
          }, 2500);
        }, 2500);
      }, 2500);
    }, 2000);
  };

  if (isCollapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
        }}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          style={{
            background: 'linear-gradient(135deg, #111827, #1F2937)',
            color: '#FFFFFF',
            border: '2px solid rgba(0, 177, 79, 0.4)',
            borderRadius: 30,
            padding: '10px 18px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 800,
          }}
        >
          <Sparkles size={16} color="#00B14F" />
          <span>Trải Nghiệm Đa Vai Trò (E2E)</span>
          <ChevronUp size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 32px)',
        maxWidth: 980,
      }}
    >
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 20,
          padding: '12px 18px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Left: Role Switcher Label & Collapse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: '#00B14F',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={17} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF' }}>
              Trải Nghiệm Luồng Thực Tế (E2E)
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
              Đang đóng vai:{' '}
              <strong style={{ color: '#00B14F' }}>
                {currentUser ? `${currentUser.fullName} (${currentRole})` : 'Khách vãng lai (Chưa đăng nhập)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Center: 4 Role Switch Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Customer */}
          <button
            onClick={handleSwitchCustomer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 10,
              border: currentRole === 'CUSTOMER' ? '2px solid #00B14F' : '1px solid rgba(255, 255, 255, 0.1)',
              background: currentRole === 'CUSTOMER' ? 'rgba(0, 177, 79, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: currentRole === 'CUSTOMER' ? '#10B981' : '#E5E7EB',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <UserIcon size={14} /> Khách Hàng
          </button>

          {/* Merchant */}
          <button
            onClick={handleSwitchMerchant}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 10,
              border: currentRole === 'MERCHANT' ? '2px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)',
              background: currentRole === 'MERCHANT' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: currentRole === 'MERCHANT' ? '#FBBF24' : '#E5E7EB',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Store size={14} /> Chủ Quán
          </button>

          {/* Driver */}
          <button
            onClick={handleSwitchDriver}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 10,
              border: currentRole === 'DRIVER' ? '2px solid #06B6D4' : '1px solid rgba(255, 255, 255, 0.1)',
              background: currentRole === 'DRIVER' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: currentRole === 'DRIVER' ? '#22D3EE' : '#E5E7EB',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Bike size={14} /> Tài Xế (Shipper)
          </button>

          {/* Admin */}
          <button
            onClick={handleSwitchAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 10,
              border: currentRole === 'ADMIN' ? '2px solid #8B5CF6' : '1px solid rgba(255, 255, 255, 0.1)',
              background: currentRole === 'ADMIN' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: currentRole === 'ADMIN' ? '#A78BFA' : '#E5E7EB',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ShieldCheck size={14} /> Admin Sàn
          </button>
        </div>

        {/* Right: Auto-Run Simulation Button & Collapse Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleAutoSimulateE2E}
            disabled={isSimulating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #00B14F, #059669)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(0, 177, 79, 0.4)',
            }}
          >
            <Play size={14} fill="#FFFFFF" />
            <span>{isSimulating ? 'Đang mô phỏng...' : '⚡ Tự Động Chạy E2E'}</span>
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            title="Thu nhỏ thanh điều hướng"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {/* Floating Simulation Progress Ticker */}
      {simStepText && (
        <div
          style={{
            marginTop: 8,
            padding: '10px 16px',
            background: 'rgba(0, 177, 79, 0.95)',
            color: '#FFFFFF',
            borderRadius: 12,
            fontSize: '0.88rem',
            fontWeight: 800,
            textAlign: 'center',
            boxShadow: '0 6px 18px rgba(0, 177, 79, 0.4)',
            animation: 'pulse 1.5s infinite',
          }}
        >
          {simStepText}
        </div>
      )}
    </div>
  );
};
