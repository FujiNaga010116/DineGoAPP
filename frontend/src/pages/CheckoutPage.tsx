// ==============================================================================
// DineGo Frontend — Checkout & MoMo Payment Page (GrabFood Market Style)
// Address Card, Delivery Estimation, Food Summary, Vouchers, MoMo / COD Gateway
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Trash2,
  Tag,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Sparkles,
  Clock,
  ShieldCheck,
  CreditCard,
  Banknote,
  ChevronRight,
  Plus,
  Minus,
  Lock,
  LogIn,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import {
  getDefaultVerifiedAddress,
  hasVerifiedCustomerAddress,
} from '../utils/routing';
import {
  loadAdminVouchers,
  loadUserClaimedCodes,
  saveAdminVouchers,
} from '../utils/vouchers';
import type { Merchant, Order, PaymentMethod, SavedAddress, User } from '../types';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderPlaced: (order: Order) => void;
  currentUser: User | null;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  merchants?: Merchant[];
  onOpenAddressSetup?: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBack,
  onOrderPlaced,
  currentUser,
  onOpenAuthModal,
  merchants,
  onOpenAddressSetup,
}) => {
  const { cart, updateQuantity, removeItem, applyVoucher, removeVoucher, clearCart } =
    useCart();

  const verifiedDefault = getDefaultVerifiedAddress(currentUser);
  const hasVerifiedAddress = hasVerifiedCustomerAddress(currentUser);

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    verifiedDefault?.id || '',
  );
  const [address, setAddress] = useState(verifiedDefault?.fullAddress || '');
  const [deliveryLat, setDeliveryLat] = useState<number | undefined>(
    verifiedDefault?.latitude,
  );
  const [deliveryLng, setDeliveryLng] = useState<number | undefined>(
    verifiedDefault?.longitude,
  );
  const [recipientName, setRecipientName] = useState(
    verifiedDefault?.recipientName || currentUser?.fullName || '',
  );
  const [recipientPhone, setRecipientPhone] = useState(
    verifiedDefault?.phone || currentUser?.phoneNumber || '',
  );
  const [customerNote, setCustomerNote] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOMO_QR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMomoModal, setShowMomoModal] = useState<Order | null>(null);

  useEffect(() => {
    const savedList = currentUser?.savedAddresses || [];
    const currentVerifiedChoice = savedList.find(
      (a) =>
        a.id === selectedAddressId &&
        a.mapVerified !== false &&
        typeof a.latitude === 'number' &&
        typeof a.longitude === 'number',
    );
    const chosen = currentVerifiedChoice || getDefaultVerifiedAddress(currentUser);

    if (chosen) {
      setSelectedAddressId(chosen.id);
      setAddress(chosen.fullAddress);
      setDeliveryLat(chosen.latitude);
      setDeliveryLng(chosen.longitude);
      if (chosen.recipientName) setRecipientName(chosen.recipientName);
      if (chosen.phone) setRecipientPhone(chosen.phone);
    } else {
      setSelectedAddressId('');
      setAddress('');
      setDeliveryLat(undefined);
      setDeliveryLng(undefined);
      setRecipientName(currentUser?.fullName || '');
      setRecipientPhone(currentUser?.phoneNumber || '');
    }
  }, [currentUser, selectedAddressId]);

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    const isVerified = Boolean(
      addr.mapVerified !== false &&
        typeof addr.latitude === 'number' &&
        typeof addr.longitude === 'number',
    );
    if (!isVerified) {
      onOpenAddressSetup?.();
      return;
    }
    setSelectedAddressId(addr.id);
    setAddress(addr.fullAddress);
    setDeliveryLat(addr.latitude);
    setDeliveryLng(addr.longitude);
    if (addr.recipientName) setRecipientName(addr.recipientName);
    if (addr.phone) setRecipientPhone(addr.phone);
  };

  const claimedVoucherCodes = loadUserClaimedCodes(currentUser?.id);

  const availableAdminVouchers = loadAdminVouchers().filter(
    (v) =>
      v.isActive !== false &&
      Number(v.usageCount || 0) < Number(v.maxUsage || 999999) &&
      (!v.merchantId || v.merchantId === 'ALL' || !cart.merchantId || v.merchantId === cart.merchantId),
  );

  const handleApplyVoucher = (codeToApply?: string) => {
    const code = (codeToApply || voucherInput).trim();
    if (!code) return;
    const res = applyVoucher(code);
    setVoucherMsg({ text: res.message, isError: !res.success });
    if (res.success) {
      setVoucherInput('');
    }
  };

  const handlePlaceOrder = () => {
    if (cart.items.length === 0) return;

    try {
      const rawSettings = localStorage.getItem('dinego_admin_settings');
      if (rawSettings) {
        const parsedSettings = JSON.parse(rawSettings);
        if (parsedSettings?.maintenanceMode === true) {
          alert('Hệ thống sàn DineGo hiện đang bật Chế độ Bảo trì khẩn cấp bởi Quản trị viên. Vui lòng thử lại sau!');
          return;
        }
      }
    } catch {}

    if (!currentUser) {
      onOpenAuthModal('login');
      return;
    }

    const matchedMerchant =
      merchants?.find((m) => m.id === cart.merchantId) ||
      merchants?.find((m) => m.name === cart.merchantName);
    if (matchedMerchant && (matchedMerchant.isActive === false || matchedMerchant.kycStatus === 'REJECTED')) {
      alert(`Nhà hàng "${matchedMerchant.name}" hiện đang tạm ngưng hoạt động bởi Quản trị viên sàn.`);
      return;
    }

    if (
      !hasVerifiedCustomerAddress(currentUser) ||
      typeof deliveryLat !== 'number' ||
      typeof deliveryLng !== 'number'
    ) {
      if (onOpenAddressSetup) {
        onOpenAddressSetup();
      } else {
        alert('Vui lòng thiết lập địa chỉ giao hàng chuẩn trên bản đồ trước khi đặt đơn.');
      }
      return;
    }
    if (!recipientName.trim() || !recipientPhone.trim() || !address.trim()) {
      alert('Vui lòng nhập đầy đủ Họ tên người nhận, Số điện thoại và Địa chỉ giao hàng.');
      return;
    }
    setIsSubmitting(true);

    if (cart.voucherCode) {
      const updatedVouchers = loadAdminVouchers().map((v) =>
        String(v.code).toUpperCase() === String(cart.voucherCode).toUpperCase()
          ? { ...v, usageCount: Number(v.usageCount || 0) + 1 }
          : v,
      );
      saveAdminVouchers(updatedVouchers);
    }
    const orderNumber = `DG20261103-${Math.random().toString(16).substring(2, 8).toUpperCase()}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: currentUser.id,
      customerEmail: currentUser.email,
      status: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING',
      subtotal: cart.subtotal,
      discountAmount: cart.discountAmount,
      deliveryFee: cart.deliveryFee,
      finalTotal: cart.finalTotal,
      deliveryAddress: address,
      deliveryLatitude: deliveryLat,
      deliveryLongitude: deliveryLng,
      recipientName,
      recipientPhone,
      customerNote: customerNote || null,
      createdAt: new Date().toISOString(),
      merchant: {
        id: cart.merchantId || matchedMerchant?.id || '',
        name: matchedMerchant?.name || cart.merchantName || 'Nhà hàng DineGo',
        address: matchedMerchant?.address || 'Địa chỉ quán',
        phoneNumber: matchedMerchant?.phoneNumber || '0901234567',
        logoUrl: matchedMerchant?.logoUrl || null,
        latitude: matchedMerchant?.latitude,
        longitude: matchedMerchant?.longitude,
      },
      items: cart.items.map((ci) => ({
        id: ci.id,
        itemName: ci.name,
        itemImage: ci.imageUrl,
        basePrice: ci.basePrice,
        quantity: ci.quantity,
        subtotal: ci.subtotal,
        note: ci.note,
        toppings: ci.toppings.map((t) => ({
          id: t.id,
          toppingName: t.name,
          toppingPrice: t.price,
        })),
      })),
      payment: {
        id: `pay-${Date.now()}`,
        paymentMethod,
        paymentStatus: paymentMethod === 'COD' ? 'SUCCESS' : 'PENDING',
        amount: cart.finalTotal,
        currency: 'VND',
        transactionRef: paymentMethod === 'COD' ? 'COD-CASH' : null,
        paidAt: paymentMethod === 'COD' ? new Date().toISOString() : null,
      },
    };

    setTimeout(() => {
      setIsSubmitting(false);
      clearCart();

      if (paymentMethod === 'MOMO_QR' || paymentMethod === 'MOMO') {
        setShowMomoModal(newOrder);
      } else {
        onOrderPlaced(newOrder);
      }
    }, 600);
  };

  const handleSimulateMomoIpnSuccess = () => {
    if (!showMomoModal) return;

    const paidOrder: Order = {
      ...showMomoModal,
      status: 'CONFIRMED',
      payment: {
        ...showMomoModal.payment!,
        paymentStatus: 'SUCCESS',
        transactionRef: `MOMO-${Math.floor(100000000 + Math.random() * 900000000)}`,
        paidAt: new Date().toISOString(),
      },
    };

    setShowMomoModal(null);
    onOrderPlaced(paidOrder);
  };

  if (cart.items.length === 0 && !showMomoModal) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 999,
            background: 'rgba(0, 177, 79, 0.1)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <Sparkles size={36} />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 12 }}>
          Giỏ hàng của bạn đang trống
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28, maxWidth: 460, margin: '0 auto 28px auto' }}>
          Hãy chọn các món ăn thơm ngon hấp dẫn từ các nhà hàng đối tác để trải nghiệm đặt món siêu tốc cùng DineGo.
        </p>
        <button
          className="btn btn-primary"
          onClick={onBack}
          style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 700 }}
        >
          Khám phá món ngon ngay
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          padding: '8px 16px',
          borderRadius: 12,
          color: 'var(--text-main)',
          fontSize: '0.9rem',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: 24,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <ArrowLeft size={16} />
        <span>Quay lại thực đơn món ăn</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Xác nhận đơn hàng & Thanh toán
        </h1>
        <span
          style={{
            background: 'rgba(0, 177, 79, 0.1)',
            color: 'var(--primary)',
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          DineGo Fast Delivery
        </span>
      </div>

      {/* Guest Mode Warning Banner */}
      {!currentUser && (
        <div
          style={{
            background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF1F2 100%)',
            border: '1.5px solid #FCA5A5',
            borderRadius: 18,
            padding: '18px 22px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#EF4444',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Lock size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B' }}>
                Yêu cầu đăng nhập để hoàn tất đặt món
              </div>
              <div style={{ fontSize: '0.85rem', color: '#B91C1C' }}>
                Vui lòng đăng nhập hoặc đăng ký tài khoản, sau đó thiết lập địa chỉ giao hàng chuẩn trên bản đồ để Quán và Shipper phục vụ bạn.
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenAuthModal('login')}
            className="btn"
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              fontWeight: 700,
              padding: '10px 18px',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <LogIn size={16} /> Đăng nhập / Đăng ký ngay
          </button>
        </div>
      )}

      {currentUser && !hasVerifiedAddress && (
        <div
          style={{
            marginBottom: 20,
            padding: '16px 20px',
            borderRadius: 16,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#F59E0B',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#92400E' }}>
                Tài khoản chưa thiết lập địa chỉ giao hàng trên bản đồ
              </div>
              <div style={{ fontSize: '0.85rem', color: '#B45309' }}>
                Bạn cần chọn và xác thực địa chỉ khớp với vị trí trên bản đồ trước khi đặt món ăn.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenAddressSetup?.()}
            className="btn"
            style={{
              background: '#D97706',
              color: '#FFFFFF',
              fontWeight: 700,
              padding: '10px 18px',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <MapPin size={16} /> Thiết lập địa chỉ trên bản đồ ngay
          </button>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 28,
        }}
      >
        {/* Left Column: Delivery & Food Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Delivery Details Card */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Địa chỉ nhận món
                </h3>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: 'rgba(0, 177, 79, 0.08)',
                  padding: '4px 10px',
                  borderRadius: 8,
                }}
              >
                <Clock size={14} />
                <span>Giao dự kiến: 20 - 30 phút</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Địa chỉ giao hàng đã xác thực trên bản đồ *
                  </label>
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => onOpenAddressSetup?.()}
                      style={{
                        background: '#ECFDF5',
                        color: '#047857',
                        border: '1px solid #A7F3D0',
                        borderRadius: 8,
                        padding: '5px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} />
                      {hasVerifiedAddress ? 'Thêm / Chọn vị trí khác trên bản đồ' : 'Ghim địa chỉ trên bản đồ'}
                    </button>
                  )}
                </div>

                {!currentUser ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      color: '#64748B',
                      fontSize: '0.85rem',
                    }}
                  >
                    Đăng nhập xong bạn sẽ chọn hoặc thiết lập địa chỉ giao hàng trực tiếp trên bản đồ.
                  </div>
                ) : hasVerifiedAddress ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(currentUser.savedAddresses && currentUser.savedAddresses.length > 0
                      ? currentUser.savedAddresses
                      : verifiedDefault
                      ? [verifiedDefault]
                      : []
                    ).map((saved) => {
                      const isSavedVerified = Boolean(
                        saved.mapVerified !== false &&
                          typeof saved.latitude === 'number' &&
                          typeof saved.longitude === 'number',
                      );
                      const isSelected = isSavedVerified && selectedAddressId === saved.id;
                      return (
                        <button
                          key={saved.id}
                          type="button"
                          onClick={() => handleSelectSavedAddress(saved)}
                          style={{
                            textAlign: 'left',
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: isSelected ? '2px solid #00B14F' : '1px solid #CBD5E1',
                            background: isSelected ? '#F0FDF4' : '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: '#0F172A', color: '#FFFFFF' }}>
                                {saved.label}
                              </span>
                              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                                {saved.recipientName || currentUser.fullName} • {saved.phone || currentUser.phoneNumber}
                              </span>
                              {isSavedVerified ? (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', background: '#DCFCE7', padding: '2px 7px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle2 size={12} /> Khớp bản đồ
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '2px 7px', borderRadius: 6 }}>
                                  Cần ghim lại bản đồ
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                              {saved.fullAddress}
                            </div>
                            {isSavedVerified && typeof saved.latitude === 'number' && typeof saved.longitude === 'number' && (
                              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                                Tọa độ giao hàng: {saved.latitude.toFixed(5)}, {saved.longitude.toFixed(5)}
                              </div>
                            )}
                          </div>
                          {isSelected && <CheckCircle2 size={18} color="#00B14F" style={{ flexShrink: 0, marginTop: 2 }} />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenAddressSetup?.()}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '1.5px dashed #F59E0B',
                      background: '#FFFBEB',
                      color: '#B45309',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <MapPin size={16} />
                    <span>Nhấn để thiết lập và ghim địa chỉ giao hàng chuẩn trên bản đồ</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Họ và tên người nhận
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 12,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-main)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 12,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-main)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Ghi chú cho tài xế giao hàng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gọi điện trước khi đến, gửi tại lễ tân tòa nhà..."
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Cart Items Summary Card */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Món đã chọn
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Từ quán: <strong>{cart.merchantName}</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                {cart.items.reduce((s, i) => s + i.quantity, 0)} phần
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 16,
                    borderBottom: '1px solid var(--border)',
                    gap: 16,
                  }}
                >
                  {/* Item Image */}
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}

                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.98rem' }}>
                      {item.name}
                    </div>
                    {item.toppings.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
                        + {item.toppings.map((t) => t.name).join(', ')}
                      </div>
                    )}
                    {item.note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontStyle: 'italic', marginTop: 3 }}>
                        Ghi chú: {item.note}
                      </div>
                    )}
                    <div style={{ fontWeight: 800, color: 'var(--primary)', marginTop: 4, fontSize: '0.95rem' }}>
                      {item.subtotal.toLocaleString('vi-VN')}đ
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg-main)',
                        padding: '4px 10px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontWeight: 800, minWidth: 18, textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 6,
                      }}
                      title="Xóa món"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Vouchers, Payments & Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Voucher Box */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Tag size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Mã ưu đãi (Voucher)
              </h3>
            </div>

            {cart.voucherCode ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 177, 79, 0.08)',
                  border: '1.5px solid var(--primary)',
                  padding: '12px 16px',
                  borderRadius: 14,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.98rem' }}>
                    🎉 {cart.voucherCode}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Đã giảm trừ thành công -{cart.discountAmount.toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <button
                  onClick={removeVoucher}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Gỡ bỏ
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder="Nhập mã ưu đãi..."
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    style={{
                      flexGrow: 1,
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handleApplyVoucher()}
                    className="btn btn-primary"
                    style={{
                      padding: '10px 18px',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: '0.88rem',
                    }}
                  >
                    Áp dụng
                  </button>
                </div>

                {/* Quick Apply Voucher Tags (Synced with Admin Event/Store Vouchers & Claimed Wallet) */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {availableAdminVouchers.map((v) => {
                    const isClaimedByMe = claimedVoucherCodes.includes(v.code.toUpperCase());
                    return (
                      <button
                        key={v.code}
                        onClick={() => handleApplyVoucher(v.code)}
                        style={{
                          background: isClaimedByMe ? 'rgba(0, 177, 79, 0.1)' : 'rgba(79, 70, 229, 0.08)',
                          border: `1px dashed ${isClaimedByMe ? '#00B14F' : '#4F46E5'}`,
                          borderRadius: 8,
                          padding: '5px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: isClaimedByMe ? '#047857' : '#4F46E5',
                          cursor: 'pointer',
                        }}
                      >
                        {isClaimedByMe ? '✅ Đã săn • ' : '🎟️ '}
                        {v.code} (
                        {v.discountType === 'PERCENTAGE'
                          ? `Giảm ${v.discountValue}%`
                          : `Giảm ${(Number(v.discountValue) / 1000).toFixed(0)}k`}
                        )
                        {v.merchantId && v.merchantId !== 'ALL' ? ` • ${v.merchantName}` : ''}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handleApplyVoucher('DINEGO50')}
                    style={{
                      background: 'rgba(0, 177, 79, 0.08)',
                      border: '1px dashed var(--primary)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                  >
                    🏷️ DINEGO50 (Giảm 50k)
                  </button>
                  <button
                    onClick={() => handleApplyVoucher('FREESHIP')}
                    style={{
                      background: 'rgba(255, 87, 34, 0.08)',
                      border: '1px dashed var(--secondary)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    🚀 FREESHIP (Miễn ship 25k)
                  </button>
                </div>

                {voucherMsg && (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: voucherMsg.isError ? '#EF4444' : 'var(--primary)',
                      fontWeight: 600,
                    }}
                  >
                    {voucherMsg.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                    <span>{voucherMsg.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 14 }}>
              Phương thức thanh toán
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* MoMo Gateway */}
              <div
                onClick={() => setPaymentMethod('MOMO_QR')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: paymentMethod === 'MOMO_QR' ? 'rgba(216, 45, 139, 0.06)' : 'var(--bg-main)',
                  border: `2px solid ${paymentMethod === 'MOMO_QR' ? 'var(--momo)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'var(--momo)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.15rem',
                      boxShadow: '0 4px 12px rgba(216, 45, 139, 0.3)',
                    }}
                  >
                    M
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      Ví MoMo All-in-One Gateway v2
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Quét mã QR, App MoMo & Thẻ ATM nội địa
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    background: 'var(--momo)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: 8,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  Khuyên dùng
                </span>
              </div>

              {/* COD */}
              <div
                onClick={() => setPaymentMethod('COD')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: paymentMethod === 'COD' ? 'rgba(0, 177, 79, 0.06)' : 'var(--bg-main)',
                  border: `2px solid ${paymentMethod === 'COD' ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: '#10B981',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Banknote size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      Tiền mặt khi nhận hàng (COD)
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Thanh toán trực tiếp cho tài xế giao hàng
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Totals Box */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                <span>Tạm tính món ăn</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{cart.subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                <span>Phí giao hàng (DineGo Express)</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{cart.deliveryFee.toLocaleString('vi-VN')}đ</span>
              </div>
              {cart.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 800, fontSize: '0.92rem' }}>
                  <span>Giảm giá voucher ({cart.voucherCode})</span>
                  <span>-{cart.discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 14,
                  marginTop: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Tổng thanh toán
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã bao gồm thuế & phí</div>
                </div>
                <span
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    color: paymentMethod === 'MOMO_QR' ? 'var(--momo)' : 'var(--primary)',
                  }}
                >
                  {cart.finalTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className={
                paymentMethod === 'MOMO_QR' && currentUser && hasVerifiedAddress
                  ? 'btn-momo'
                  : 'btn btn-primary'
              }
              style={{
                width: '100%',
                padding: '15px 20px',
                borderRadius: 14,
                fontSize: '1.05rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: !currentUser
                  ? '#EF4444'
                  : !hasVerifiedAddress
                  ? '#D97706'
                  : undefined,
                color: '#FFFFFF',
              }}
            >
              {!currentUser ? (
                <>
                  <Lock size={18} />
                  <span>Đăng nhập để đặt món • {cart.finalTotal.toLocaleString('vi-VN')}đ</span>
                </>
              ) : !hasVerifiedAddress ? (
                <>
                  <MapPin size={18} />
                  <span>Thiết lập địa chỉ trên bản đồ để đặt món</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>
                    {isSubmitting
                      ? 'Đang xử lý đơn hàng...'
                      : paymentMethod === 'MOMO_QR'
                      ? `Thanh toán MoMo • ${cart.finalTotal.toLocaleString('vi-VN')}đ`
                      : `Xác nhận đặt đơn • ${cart.finalTotal.toLocaleString('vi-VN')}đ`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MoMo Payment Modal Simulator */}
      {showMomoModal && (
        <div
          className="modal-overlay"
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
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 440,
              padding: 28,
              textAlign: 'center',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: 'var(--momo)',
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 8px 24px rgba(216, 45, 139, 0.4)',
              }}
            >
              M
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
              Cổng thanh toán MoMo Sandbox
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20 }}>
              Đơn hàng #{showMomoModal.orderNumber} tại DineGo
            </p>

            {/* QR Mockup */}
            <div
              style={{
                background: '#F8FAFC',
                padding: 20,
                borderRadius: 16,
                border: '1px solid #E2E8F0',
                display: 'inline-block',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 180,
                  height: 180,
                  background: '#FFFFFF',
                  border: '2px dashed #D82D8B',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D82D8B',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  gap: 8,
                }}
              >
                <QrCode size={64} color="#D82D8B" />
                <span>MoMo All-in-One QR</span>
              </div>
            </div>

            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#D82D8B', marginBottom: 6 }}>
              {showMomoModal.finalTotal.toLocaleString('vi-VN')} VND
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 24 }}>
              Xác thực chữ ký số HMAC-SHA256 chuẩn MoMo OpenAPI v2
            </p>

            <button
              onClick={handleSimulateMomoIpnSuccess}
              className="btn-momo"
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 14,
                marginBottom: 12,
                fontSize: '0.95rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={18} />
              <span>Tôi đã thanh toán qua ứng dụng MoMo</span>
            </button>

            <button
              onClick={() => {
                setShowMomoModal(null);
                onOrderPlaced(showMomoModal);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng và thanh toán sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
