// ==============================================================================
// DineGo Frontend — Catering Deposit Payment Receipt Modal (Bill thanh toán cọc)
// Used by both Customer (OrdersPage) & Merchant (MerchantCateringManager)
// ==============================================================================

import React from 'react';
import { CheckCircle2, Printer, ShieldCheck, UtensilsCrossed, X } from 'lucide-react';
import { CateringDepositReceiptData } from '../../../types';

interface CateringDepositReceiptModalProps {
  receipt: CateringDepositReceiptData | null;
  onClose: () => void;
}

export const CateringDepositReceiptModal: React.FC<CateringDepositReceiptModalProps> = ({
  receipt,
  onClose,
}) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #E2E8F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #1E40AF 0%, #047857 100%)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UtensilsCrossed size={22} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.04em', opacity: 0.9 }}>
                HỆ THỐNG ĐẶT TIỆC LƯU ĐỘNG DINEGO CATERING
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                Phiếu Thu Tiền Đặt Cọc
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              borderRadius: 8,
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div style={{ padding: '22px 26px', overflowY: 'auto' }}>
          {/* Top Status & Seal */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 18,
              padding: '12px 16px',
              backgroundColor: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: 14,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 800, fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="#059669" />
                <span>XÁC NHẬN ĐÃ THU TIỀN ĐẶT CỌC</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#15803D', marginTop: 3 }}>
                Mã phiếu: <strong>#{receipt.receiptCode}</strong> • Ngày lập: {new Date(receipt.paidAt).toLocaleString('vi-VN')}
              </div>
            </div>

            {/* Simulated Accounting Seal */}
            <div
              style={{
                border: '2px dashed #059669',
                borderRadius: 8,
                padding: '4px 10px',
                textAlign: 'center',
                color: '#059669',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.05em',
                transform: 'rotate(-2deg)',
                background: '#FFFFFF',
              }}
            >
              ★ DINEGO CATERING ★<br />
              ĐÃ THANH TOÁN CỌC
            </div>
          </div>

          {/* Party and Merchant Info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              marginBottom: 18,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: 16,
              fontSize: '0.84rem',
            }}
          >
            <div>
              <div style={{ color: '#64748B', fontSize: '0.74rem', fontWeight: 700 }}>ĐƠN VỊ CUNG CẤP DỊCH VỤ</div>
              <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2, fontSize: '0.95rem' }}>
                {receipt.merchantName}
              </div>
              <div style={{ color: '#475569', marginTop: 4 }}>
                Mã đơn tiệc: <strong>#{receipt.bookingCode}</strong>
              </div>
              <div style={{ color: '#475569', marginTop: 2 }}>
                Loại tiệc: <strong>{receipt.partyTypeTitle}</strong>
              </div>
            </div>

            <div>
              <div style={{ color: '#64748B', fontSize: '0.74rem', fontWeight: 700 }}>KHÁCH HÀNG &amp; SỰ KIỆN</div>
              <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2, fontSize: '0.95rem' }}>
                {receipt.customerName} {receipt.customerPhone ? `• ${receipt.customerPhone}` : ''}
              </div>
              <div style={{ color: '#475569', marginTop: 4 }}>
                Địa điểm: <strong>{receipt.eventAddress}</strong>
              </div>
              <div style={{ color: '#475569', marginTop: 2 }}>
                Thời gian tiệc: <strong>{receipt.eventTime} • {receipt.eventDate}</strong>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: 16,
              marginBottom: 18,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', marginBottom: 12 }}>
              Chi tiết gói cỗ &amp; Hạch toán tiền cọc:
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #E2E8F0', fontSize: '0.85rem' }}>
              <span style={{ color: '#475569' }}>Gói thực đơn đã chọn:</span>
              <strong style={{ color: '#0F172A' }}>{receipt.packageName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #E2E8F0', fontSize: '0.85rem' }}>
              <span style={{ color: '#475569' }}>Quy mô phục vụ:</span>
              <strong style={{ color: '#0F172A' }}>
                {receipt.tableCount} mâm {receipt.guestCountPerTable ? `(${receipt.tableCount * receipt.guestCountPerTable} khách)` : ''}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #E2E8F0', fontSize: '0.85rem' }}>
              <span style={{ color: '#475569' }}>Tổng giá trị hợp đồng dự kiến:</span>
              <strong style={{ color: '#0F172A' }}>
                {receipt.totalEstimatedAmount.toLocaleString('vi-VN')} đ
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #E2E8F0', fontSize: '0.85rem' }}>
              <span style={{ color: '#475569' }}>Tỷ lệ đặt cọc đợt 1:</span>
              <strong style={{ color: '#0F172A' }}>{receipt.depositRate}%</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 14px',
                marginTop: 8,
                borderRadius: 10,
                backgroundColor: '#ECFDF5',
                border: '1.5px solid #A7F3D0',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065F46' }}>
                  SỐ TIỀN CỌC ĐÃ THANH TOÁN
                </div>
                <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: 2 }}>
                  Phương thức: {receipt.paymentMethod} {receipt.transactionRef ? `• Mã GD: ${receipt.transactionRef}` : ''}
                </div>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#059669' }}>
                {receipt.depositAmount.toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                marginTop: 8,
                borderRadius: 10,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                alignItems: 'center',
                fontSize: '0.85rem',
              }}
            >
              <span style={{ color: '#475569', fontWeight: 600 }}>Số tiền còn lại thanh toán khi kết tiệc:</span>
              <strong style={{ color: '#1E293B', fontSize: '1.05rem' }}>
                {receipt.remainingAmount.toLocaleString('vi-VN')} đ
              </strong>
            </div>
          </div>

          {/* Kitchen Dispatch Status Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              backgroundColor: receipt.dispatchedToKitchen ? '#F0FDF4' : '#EFF6FF',
              border: `1px solid ${receipt.dispatchedToKitchen ? '#86EFAC' : '#BFDBFE'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.82rem',
              color: receipt.dispatchedToKitchen ? '#166534' : '#1E40AF',
              lineHeight: 1.45,
            }}
          >
            <ShieldCheck size={18} color={receipt.dispatchedToKitchen ? '#059669' : '#2563EB'} style={{ flexShrink: 0 }} />
            <div>
              {receipt.dispatchedToKitchen ? (
                <>
                  <strong>Lệnh chế biến đã được bàn giao cho Bếp trực tiếp:</strong> Bếp trưởng đã tiếp nhận thực đơn và bắt đầu chuẩn bị nguyên liệu sơ chế theo đúng quy trình.
                </>
              ) : (
                <>
                  <strong>Đã hoàn tất cọc thành công:</strong> Hợp đồng tiệc &amp; Lịch đang tiến hành bàn giao Lệnh chế biến chính thức cho Bếp trực tiếp.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Printer size={16} />
            In phiếu thu cọc
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
