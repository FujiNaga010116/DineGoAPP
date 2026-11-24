import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  X,
  CreditCard,
  Calendar,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { MockCateringQrCode } from './MockCateringQrCode';

export interface CustomerDepositNoticeData {
  id?: string;
  bookingId: string;
  bookingCode: string;
  orderId?: string;
  customerId?: string;
  customerPhone?: string;
  merchantName: string;
  merchantPhone?: string;
  packageName: string;
  tableCount: number;
  totalAmount?: number;
  depositAmount: number;
  depositRate?: number;
  eventDate: string;
  eventTime: string;
  timestamp?: string;
  isDismissed?: boolean;
}

interface CustomerDepositQrModalProps {
  isOpen: boolean;
  notice: CustomerDepositNoticeData | null;
  onClose: () => void;
  onConfirmPaid?: (notice: CustomerDepositNoticeData) => void;
  onViewOrders?: () => void;
}

export const CustomerDepositQrModal: React.FC<CustomerDepositQrModalProps> = ({
  isOpen,
  notice,
  onClose,
  onConfirmPaid,
  onViewOrders,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasReportedPaid, setHasReportedPaid] = useState(false);

  if (!isOpen || !notice) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReportPaid = () => {
    setHasReportedPaid(true);
    onConfirmPaid?.(notice);
  };

  const depositRate = notice.depositRate || 30;
  const bankAccountNo = '0901000002';
  const bankAccountName = 'NHÀ HÀNG DINEGO CATERING';
  const transferSyntax = `COC ${notice.bookingCode}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          maxWidth: 580,
          width: '100%',
          padding: '24px 26px',
          boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)',
          border: '2px solid #10B981',
          position: 'relative',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: '#F1F5F9',
            color: '#64748B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          title="Đóng"
        >
          <X size={18} />
        </button>

        {/* Header Notification Banner */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <Sparkles size={28} />
          </div>
          <div style={{ flex: 1, paddingRight: 20 }}>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#059669',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <CheckCircle2 size={13} />
              Thông báo xác nhận đơn đặt tiệc
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '3px 0 0' }}>
              Nhà hàng đã xác nhận đơn tiệc của bạn! 🎉
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#475569', margin: '4px 0 0', lineHeight: 1.45 }}>
              Yêu cầu của bạn đã được thẩm định công suất &amp; nguyên liệu. Vui lòng chuyển tiền cọc để xuất Hợp đồng tiệc và giao Bếp chế biến.
            </p>
          </div>
        </div>

        {/* Order Details Card */}
        <div
          style={{
            background: '#F8FAFC',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: '0.84rem',
            color: '#334155',
            lineHeight: 1.6,
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px 16px' }}>
            <div>• <strong>Mã đơn:</strong> <span style={{ color: '#0284C7', fontWeight: 800 }}>#{notice.bookingCode}</span></div>
            <div>• <strong>Nhà hàng:</strong> <span style={{ fontWeight: 700 }}>{notice.merchantName}</span></div>
            <div>• <strong>Gói thực đơn:</strong> {notice.packageName} ({notice.tableCount} mâm)</div>
            <div>• <strong>Ngày giờ tiệc:</strong> {notice.eventTime} ngày {notice.eventDate}</div>
          </div>
        </div>

        {/* Payment Amount Highlight */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1.5px solid #10B981',
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065F46' }}>
              Số tiền đặt cọc cần thanh toán ({depositRate}%):
            </div>
            <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
              {notice.depositAmount.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(String(notice.depositAmount), 'amount')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1.5px solid #059669',
              color: '#059669',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {copiedField === 'amount' ? <Check size={14} /> : <Copy size={14} />}
            {copiedField === 'amount' ? 'Đã sao chép' : 'Sao chép tiền'}
          </button>
        </div>

        {/* QR Code + Bank Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            alignItems: 'center',
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 16,
            padding: '16px',
            marginBottom: 18,
          }}
        >
          {/* Mock QR Code Component */}
          <div style={{ textAlign: 'center' }}>
            <MockCateringQrCode
              amount={notice.depositAmount}
              bookingCode={notice.bookingCode}
              accountNo={bankAccountNo}
              accountName={bankAccountName}
              size={190}
            />
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 8, fontWeight: 600 }}>
              Mở App Ngân hàng hoặc MoMo quét mã
            </div>
          </div>

          {/* Bank Transfer Details Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
            <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Ngân hàng thụ hưởng:</div>
              <div style={{ fontWeight: 800, color: '#0F172A' }}>MB Bank (Ngân hàng TMCP Quân Đội)</div>
            </div>

            <div
              style={{
                background: '#F8FAFC',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Số tài khoản:</div>
                <div style={{ fontWeight: 900, color: '#0F172A', fontSize: '0.98rem', letterSpacing: 0.5 }}>
                  {bankAccountNo}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(bankAccountNo, 'account')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copiedField === 'account' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                {copiedField === 'account' ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Chủ tài khoản:</div>
              <div style={{ fontWeight: 800, color: '#0F172A' }}>{bankAccountName}</div>
            </div>

            <div
              style={{
                background: '#FEF3C7',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #FDE68A',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: '#92400E', fontSize: '0.72rem', fontWeight: 700 }}>
                  Nội dung chuyển khoản (Bắt buộc):
                </div>
                <div style={{ fontWeight: 900, color: '#B45309', fontSize: '0.92rem' }}>
                  {transferSyntax}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(transferSyntax, 'syntax')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #F59E0B',
                  background: '#FFFFFF',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#B45309',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copiedField === 'syntax' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                {copiedField === 'syntax' ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>
          </div>
        </div>

        {/* Status notice after user clicks "Tôi đã chuyển cọc" */}
        {hasReportedPaid && (
          <div
            style={{
              background: '#ECFDF5',
              border: '1.5px solid #10B981',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.84rem',
              color: '#065F46',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={18} color="#059669" />
            <span>Đã ghi nhận quý khách chuyển khoản cọc! Nhà hàng đang đối soát và sẽ xuất Bill cọc ngay.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReportPaid}
            style={{
              flex: 1,
              minWidth: 180,
              padding: '12px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
              color: '#FFFFFF',
              fontSize: '0.86rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(0, 177, 79, 0.3)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>Tôi đã chuyển khoản cọc</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onViewOrders?.();
            }}
            style={{
              padding: '12px 18px',
              borderRadius: 10,
              background: '#0F172A',
              color: '#FFFFFF',
              fontSize: '0.86rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Xem đơn hàng</span>
            <ArrowRight size={15} />
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: '#F1F5F9',
              color: '#64748B',
              fontSize: '0.86rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
};
