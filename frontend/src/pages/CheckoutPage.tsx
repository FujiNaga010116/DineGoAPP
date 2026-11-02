// ==============================================================================
// DineGo Frontend — Checkout & MoMo Payment Page (Phase 5.3 + Phase 6)
// ==============================================================================

import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Trash2,
  Tag,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { CURRENT_USER } from '../api/client';
import { useCart } from '../context/CartContext';
import type { Order, PaymentMethod } from '../types';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderPlaced: (order: Order) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack, onOrderPlaced }) => {
  const { cart, updateQuantity, removeItem, applyVoucher, removeVoucher, clearCart } =
    useCart();

  const [address, setAddress] = useState('123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM');
  const [recipientName, setRecipientName] = useState(CURRENT_USER.fullName);
  const [recipientPhone, setRecipientPhone] = useState(CURRENT_USER.phoneNumber || '0987654321');
  const [customerNote, setCustomerNote] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOMO_QR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMomoModal, setShowMomoModal] = useState<Order | null>(null);

  const handleApplyVoucher = () => {
    if (!voucherInput.trim()) return;
    const res = applyVoucher(voucherInput);
    setVoucherMsg({ text: res.message, isError: !res.success });
    if (res.success) {
      setVoucherInput('');
    }
  };

  const handlePlaceOrder = () => {
    if (cart.items.length === 0) return;
    setIsSubmitting(true);

    // Simulate backend Order creation (matching OrderService.createOrder)
    const orderNumber = `DG20261028-${Math.random().toString(16).substring(2, 8).toUpperCase()}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      status: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING',
      subtotal: cart.subtotal,
      discountAmount: cart.discountAmount,
      deliveryFee: cart.deliveryFee,
      finalTotal: cart.finalTotal,
      deliveryAddress: address,
      recipientName,
      recipientPhone,
      customerNote: customerNote || null,
      createdAt: new Date().toISOString(),
      merchant: {
        id: cart.merchantId || '',
        name: cart.merchantName || 'Nhà hàng DineGo',
        address: 'Địa chỉ quán',
        phoneNumber: '0901234567',
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

    // Simulate MoMo IPN callback hitting Backend (matching processMomoIpn)
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
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>
          Giỏ hàng của bạn đang trống
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
          Hãy chọn các món ăn thơm ngon từ nhà hàng để tiếp tục đặt hàng.
        </p>
        <button
          className="cart-btn"
          onClick={onBack}
          style={{ margin: '0 auto', padding: '12px 28px' }}
        >
          Khám phá món ăn ngay
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
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          fontWeight: 600,
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={18} />
        <span>Quay lại thực đơn</span>
      </button>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 24 }}>
        Xác nhận đơn hàng & Thanh toán
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 32,
        }}
      >
        {/* Left Column: Delivery & Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Delivery Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <MapPin size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Thông tin giao hàng
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Địa chỉ nhận món
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Người nhận
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Ghi chú cho tài xế giao hàng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gọi trước khi đến, gửi bảo vệ..."
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Cart Items Summary */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Món đã chọn ({cart.merchantName})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: 16,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ flexGrow: 1, paddingRight: 16 }}>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{item.name}</div>
                    {item.toppings.length > 0 && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        + {item.toppings.map((t) => t.name).join(', ')}
                      </div>
                    )}
                    {item.note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontStyle: 'italic', marginTop: 2 }}>
                        Ghi chú: {item.note}
                      </div>
                    )}
                    <div style={{ fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                      {item.subtotal.toLocaleString('vi-VN')}đ
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg-surface)',
                        padding: '4px 8px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        style={{ background: 'transparent', color: '#fff' }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 700 }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ background: 'transparent', color: '#fff' }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      style={{ background: 'transparent', color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Payment & Voucher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Voucher Box */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Tag size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                Mã ưu đãi (Voucher)
              </h3>
            </div>

            {cart.voucherCode ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: '#10B981' }}>
                    {cart.voucherCode}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Đã giảm -{cart.discountAmount.toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <button
                  onClick={removeVoucher}
                  style={{
                    background: 'transparent',
                    color: 'var(--danger)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  Gỡ bỏ
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Nhập DINEGO50 hoặc FREESHIP"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    style={{
                      flexGrow: 1,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    onClick={handleApplyVoucher}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    Áp dụng
                  </button>
                </div>

                {voucherMsg && (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: voucherMsg.isError ? 'var(--danger)' : 'var(--success)',
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
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>
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
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: paymentMethod === 'MOMO_QR' ? 'var(--momo-light)' : 'var(--bg-surface)',
                  border: `2px solid ${paymentMethod === 'MOMO_QR' ? 'var(--momo)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: 'var(--momo)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                    }}
                  >
                    M
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff' }}>
                      Ví MoMo All-in-One Gateway v2
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Quét mã QR, App MoMo & Thẻ ATM nội địa
                    </div>
                  </div>
                </div>

                <span className="momo-badge">Khuyên dùng</span>
              </div>

              {/* COD */}
              <div
                onClick={() => setPaymentMethod('COD')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: paymentMethod === 'COD' ? 'rgba(255, 87, 34, 0.12)' : 'var(--bg-surface)',
                  border: `2px solid ${paymentMethod === 'COD' ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>Tiền mặt khi nhận hàng (COD)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Thanh toán trực tiếp cho tài xế giao hàng
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Totals Box */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Tạm tính</span>
                <span>{cart.subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Phí giao hàng (DineGo Express)</span>
                <span>{cart.deliveryFee.toLocaleString('vi-VN')}đ</span>
              </div>
              {cart.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontWeight: 700 }}>
                  <span>Giảm giá voucher</span>
                  <span>-{cart.discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#fff',
                }}
              >
                <span>Tổng thanh toán</span>
                <span style={{ color: paymentMethod === 'MOMO_QR' ? '#FF4081' : 'var(--primary)' }}>
                  {cart.finalTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className={paymentMethod === 'MOMO_QR' ? 'btn-momo' : 'cart-btn'}
              style={{ width: '100%', padding: '14px 20px', borderRadius: 'var(--radius-sm)', justifyContent: 'center' }}
            >
              <Sparkles size={18} />
              <span>
                {isSubmitting
                  ? 'Đang kết nối cổng thanh toán...'
                  : paymentMethod === 'MOMO_QR'
                  ? `Thanh toán MoMo • ${cart.finalTotal.toLocaleString('vi-VN')}đ`
                  : `Xác nhận đặt đơn • ${cart.finalTotal.toLocaleString('vi-VN')}đ`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MoMo Payment Modal Simulator */}
      {showMomoModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center', maxWidth: 440 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
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

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              Cổng thanh toán MoMo
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>
              Đơn hàng #{showMomoModal.orderNumber} tai DineGo
            </p>

            {/* QR Mockup */}
            <div
              style={{
                background: '#fff',
                padding: 20,
                borderRadius: 16,
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 180,
                  height: 180,
                  background: '#f8fafc',
                  border: '2px dashed #d82d8b',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d82d8b',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  gap: 8,
                }}
              >
                <QrCode size={64} color="#d82d8b" />
                <span>MoMo All-in-One QR</span>
              </div>
            </div>

            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FF4081', marginBottom: 6 }}>
              {showMomoModal.finalTotal.toLocaleString('vi-VN')} VND
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 24 }}>
              Xác thực chữ ký số: HMAC-SHA256 (MOMO_SECRET_KEY)
            </p>

            <button
              onClick={handleSimulateMomoIpnSuccess}
              className="btn-momo"
              style={{ marginBottom: 12 }}
            >
              <CheckCircle2 size={18} />
              <span>Giả lập MoMo IPN (Thanh toán thành công)</span>
            </button>

            <button
              onClick={() => {
                setShowMomoModal(null);
                onOrderPlaced(showMomoModal);
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.88rem',
              }}
            >
              Đóng và giữ đơn ở trạng thái PENDING
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
