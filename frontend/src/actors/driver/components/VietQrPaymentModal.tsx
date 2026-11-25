// ==============================================================================
// DineGo Frontend — Dynamic VietQR On-Delivery Payment Modal
// Handles instant payment verification at point of delivery (Đồng kiểm món ăn):
// - Renders official VietQR standard dynamic QR code
// - Instant Webhook simulation & Zero-latency cross-tab event sync
// - Protects Merchant, Driver & Customer from Fake Bills & Cash Handling
// ==============================================================================

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Building,
  CreditCard,
  Hash,
  AlertCircle,
} from 'lucide-react';
import type { Order } from '../../../types';

interface VietQrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onPaymentSuccess?: (order: Order) => void;
  viewerRole?: 'DRIVER' | 'CUSTOMER';
}

export const VietQrPaymentModal: React.FC<VietQrPaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
  viewerRole = 'DRIVER',
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !order) return null;

  const bankName = 'Vietcombank (VCB)';
  const bankAccountNumber = '0071000889900';
  const accountHolder = 'CÔNG TY TNHH SÀN THƯƠNG MẠI DINEGO';
  const transferContent = `DINEGO ${order.orderNumber}`;
  const amount = order.finalTotal || 0;

  // Standard VietQR Dynamic QR URL with account, amount, and order content
  const vietQrUrl = `https://img.vietqr.io/image/vietcombank-${bankAccountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferContent,
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSimulateWebhook = () => {
    setIsSimulating(true);

    setTimeout(() => {
      setIsSimulating(false);
      setIsSuccess(true);

      const updatedOrder: Order = {
        ...order,
        paymentStatus: 'PAID',
        payment: {
          id: order.payment?.id || `pay-${Date.now()}`,
          paymentMethod: (order.paymentMethod as any) || 'VIETQR_ON_DELIVERY',
          paymentStatus: 'SUCCESS',
          amount,
          currency: 'VND',
          transactionRef: `VCB-TRANS-${Date.now().toString().slice(-6)}`,
          paidAt: new Date().toISOString(),
        },
      };

      // 1. Update localStorage
      try {
        const savedAll = localStorage.getItem('dinego_all_orders');
        if (savedAll) {
          const list: Order[] = JSON.parse(savedAll);
          const next = list.map((o) => (o.id === order.id ? updatedOrder : o));
          localStorage.setItem('dinego_all_orders', JSON.stringify(next));
        }

        const savedCust = localStorage.getItem('dinego_customer_orders');
        if (savedCust) {
          const list: Order[] = JSON.parse(savedCust);
          const next = list.map((o) => (o.id === order.id ? updatedOrder : o));
          localStorage.setItem('dinego_customer_orders', JSON.stringify(next));
        }
      } catch (e) {
        console.error('Failed to sync payment in localStorage:', e);
      }

      // 2. Broadcast event to all tabs
      window.dispatchEvent(
        new CustomEvent('dinego_order_payment_updated', {
          detail: { orderId: order.id, updatedOrder },
        }),
      );

      // 3. Callback parent
      onPaymentSuccess?.(updatedOrder);

      // Auto close after 2.5s
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    }, 1200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
            color: '#FFFFFF',
            padding: '16px 20px',
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
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {viewerRole === 'DRIVER'
                  ? 'Thu Tiền Chuyển Khoản VietQR'
                  : 'Thanh Toán VietQR Khi Nhận Món'}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#BAE6FD', marginTop: 1 }}>
                Đồng kiểm ngoại quan • Tự động khớp lệnh 2 giây
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSimulating}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 22px', maxHeight: '82vh', overflowY: 'auto' }}>
          {isSuccess ? (
            <div
              style={{
                textAlign: 'center',
                padding: '30px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)',
                }}
              >
                <CheckCircle2 size={44} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#15803D' }}>
                ✓ ĐÃ NHẬN TIỀN THÀNH CÔNG!
              </h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', maxWidth: 320 }}>
                Hệ thống ngân hàng đã xác nhận thanh toán{' '}
                <strong style={{ color: '#0F172A' }}>{amount.toLocaleString('vi-VN')}đ</strong> cho
                đơn #{order.orderNumber}.
              </p>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  fontSize: '0.8rem',
                  color: '#166534',
                  fontWeight: 700,
                }}
              >
                {viewerRole === 'DRIVER'
                  ? 'Tài xế đã có thể bàn giao phần ăn và bấm "Hoàn tất giao hàng".'
                  : 'Cảm ơn quý khách! Chúc quý khách dùng bữa ngon miệng.'}
              </div>
            </div>
          ) : (
            <>
              {/* Alert: Inspection Policy */}
              <div
                style={{
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: 12,
                  padding: '10px 12px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: '0.78rem',
                  color: '#0369A1',
                }}
              >
                <ShieldCheck size={16} color="#0284C7" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Quy tắc Đồng kiểm:</strong> Khách kiểm tra tem dán, túi còn nguyên vẹn rồi
                  quét mã. Tiền chuyển về <strong>Tài khoản trung gian Sàn DineGo</strong> để bảo vệ
                  an toàn cho cả Quán, Shipper và Khách.
                </div>
              </div>

              {/* Dynamic QR Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: '#F8FAFC',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: 16,
                  padding: '16px 12px 14px',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#64748B',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Mở app ngân hàng / MoMo quét mã này
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    padding: 10,
                    borderRadius: 12,
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <img
                    src={vietQrUrl}
                    alt="VietQR Payment Code"
                    style={{
                      width: 200,
                      height: 200,
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>

                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Số tiền cần chuyển:</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284C7' }}>
                    {amount.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* Bank Details Table */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: '0.82rem',
                }}
              >
                {/* Bank */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building size={14} color="#0284C7" /> Ngân hàng:
                  </span>
                  <strong style={{ color: '#0F172A' }}>{bankName}</strong>
                </div>

                {/* Account Number */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CreditCard size={14} color="#0284C7" /> Số tài khoản Sàn:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ color: '#0F172A', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {bankAccountNumber}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankAccountNumber, 'stk')}
                      title="Sao chép số tài khoản"
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid #CBD5E1',
                        background: '#F1F5F9',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        fontSize: '0.72rem',
                      }}
                    >
                      {copiedField === 'stk' ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                      <span>{copiedField === 'stk' ? 'Đã chép' : 'Chép'}</span>
                    </button>
                  </div>
                </div>

                {/* Account Holder */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>Chủ tài khoản:</span>
                  <strong style={{ color: '#0F172A', fontSize: '0.76rem' }}>{accountHolder}</strong>
                </div>

                {/* Content */}
                <div
                  style={{
                    borderTop: '1px dashed #E2E8F0',
                    paddingTop: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Hash size={14} color="#0284C7" /> Nội dung chuyển:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ color: '#B45309', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                      {transferContent}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(transferContent, 'content')}
                      title="Sao chép nội dung chuyển khoản"
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid #CBD5E1',
                        background: '#F1F5F9',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        fontSize: '0.72rem',
                      }}
                    >
                      {copiedField === 'content' ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                      <span>{copiedField === 'content' ? 'Đã chép' : 'Chép'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Instant Webhook Simulation Button (For Testing/Demo) */}
              <button
                type="button"
                onClick={handleSimulateWebhook}
                disabled={isSimulating}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 8px 20px -4px rgba(5, 150, 105, 0.4)',
                }}
              >
                <Zap size={16} />
                <span>
                  {isSimulating
                    ? 'Đang lắng nghe Webhook ngân hàng...'
                    : '⚡ Giả lập Khách chuyển khoản thành công (Webhook Ngân hàng)'}
                </span>
              </button>

              <div
                style={{
                  marginTop: 12,
                  textAlign: 'center',
                  fontSize: '0.74rem',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <AlertCircle size={13} color="#94A3B8" />
                <span>
                  Hệ thống tự động kích hoạt chuông và cập nhật trạng thái ngay khi có tiền về.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
