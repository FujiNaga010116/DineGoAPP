// ==============================================================================
// DineGo Frontend — Printable Catering Final Settlement Bill Modal
// Shared between Merchant Dashboard (on completion) & Customer OrdersPage
// ==============================================================================

import React from 'react';
import { CheckCircle2, Printer, UtensilsCrossed, X } from 'lucide-react';

export interface CateringBillData {
  billCode: string;
  bookingCode: string;
  merchantName: string;
  customerName: string;
  customerPhone: string;
  eventAddress: string;
  partyTypeTitle: string;
  packageName: string;
  tableCount: number;
  guestCountPerTable: number;
  eventDate: string;
  eventTime: string;
  dishes?: string[];
  customNote?: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  depositPercent: 30 | 50;
  depositAmount: number;
  remainingAmount: number;
  completedAt: string;
  issuedFor?: 'MERCHANT' | 'CUSTOMER';
}

interface CateringFinalBillModalProps {
  bill: CateringBillData | null;
  onClose: () => void;
}

export const CateringFinalBillModal: React.FC<CateringFinalBillModalProps> = ({
  bill,
  onClose,
}) => {
  if (!bill) return null;

  const totalGuests = bill.tableCount * bill.guestCountPerTable;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UtensilsCrossed size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9, letterSpacing: '0.04em' }}>
                HÓA ĐƠN QUYẾT TOÁN ĐẶT TIỆC LƯU ĐỘNG
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Bill Tổng #{bill.billCode}
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
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Đóng hóa đơn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Invoice Body */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', fontVariantNumeric: 'tabular-nums' }}>
          {/* Status Banner */}
          <div
            style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 800, color: '#065F46' }}>
              <CheckCircle2 size={16} color="#00B14F" />
              {bill.issuedFor === 'MERCHANT'
                ? 'Cửa hàng đã xác nhận hoàn tất bữa tiệc & gửi Bill về khách hàng'
                : 'Bữa tiệc đã hoàn thành & Tất toán 100%'}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 700 }}>
              Xuất lúc: {new Date(bill.completedAt).toLocaleString('vi-VN')}
            </span>
          </div>

          {/* Contract & Party Metadata */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 12,
              marginBottom: 18,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 14,
              padding: 16,
              fontSize: '0.84rem',
            }}
          >
            <div>
              <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>ĐƠN VỊ PHỤC VỤ</div>
              <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{bill.merchantName}</div>
              <div style={{ color: '#475569', marginTop: 4 }}>
                Mã hợp đồng: <strong>#{bill.bookingCode}</strong>
              </div>
              <div style={{ color: '#475569', marginTop: 2 }}>
                Loại tiệc: <strong>{bill.partyTypeTitle}</strong>
              </div>
            </div>

            <div>
              <div style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700 }}>KHÁCH HÀNG &amp; ĐỊA ĐIỂM</div>
              <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                {bill.customerName} • {bill.customerPhone}
              </div>
              <div style={{ color: '#475569', marginTop: 4 }}>{bill.eventAddress}</div>
              <div style={{ color: '#475569', marginTop: 2 }}>
                Thời gian tiệc: <strong>{bill.eventTime} • {bill.eventDate}</strong>
              </div>
            </div>
          </div>

          {/* Package & Dishes */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A' }}>
                  {bill.packageName}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Quy mô phục vụ: <strong>{bill.tableCount} mâm</strong> (~{totalGuests} thực khách)
                </div>
              </div>
              <div style={{ fontWeight: 900, color: '#00B14F', fontSize: '1rem' }}>
                {bill.totalAmount.toLocaleString('vi-VN')}đ
              </div>
            </div>

            {bill.dishes && bill.dishes.length > 0 && (
              <div style={{ paddingTop: 10, borderTop: '1px dashed #E2E8F0' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                  Danh sách món trong mâm đã phục vụ ({bill.dishes.length} món):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {bill.dishes.map((dish, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.74rem',
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: '#F1F5F9',
                        color: '#334155',
                        fontWeight: 600,
                      }}
                    >
                      {idx + 1}. {dish}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {bill.customNote && (
              <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#065F46', background: '#ECFDF5', padding: '8px 10px', borderRadius: 8 }}>
                <strong>Ghi chú yêu cầu đã thực hiện:</strong> {bill.customNote}
              </div>
            )}
          </div>

          {/* Financial Settlement Summary */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#475569', marginBottom: 6 }}>
              <span>Giá trị niêm yết ({bill.tableCount} mâm):</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{bill.subtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            {bill.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#00B14F', fontWeight: 700, marginBottom: 6 }}>
                <span>Ưu đãi mâm lớn &amp; Voucher:</span>
                <span>-{bill.discountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', paddingTop: 8, borderTop: '1px solid #CBD5E1', marginBottom: 10 }}>
              <span>Tổng giá trị hợp đồng:</span>
              <span>{bill.totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#059669', fontWeight: 700, marginBottom: 6 }}>
              <span>Đã đặt cọc đợt 1 qua MoMo ({bill.depositPercent}%):</span>
              <span>{bill.depositAmount.toLocaleString('vi-VN')}đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#0284C7', fontWeight: 700, marginBottom: 10 }}>
              <span>Đã tất toán phần còn lại sau tiệc:</span>
              <span>{bill.remainingAmount.toLocaleString('vi-VN')}đ</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 10,
                borderTop: '2px dashed #CBD5E1',
                fontSize: '1.08rem',
                fontWeight: 900,
                color: '#00B14F',
              }}
            >
              <span>TỔNG ĐÃ THANH TOÁN (100%):</span>
              <span>{bill.totalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '10px 18px', borderRadius: 10, fontSize: '0.86rem' }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{ padding: '10px 20px', borderRadius: 10, fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Printer size={16} />
            <span>In Bill Tổng</span>
          </button>
        </div>
      </div>
    </div>
  );
};

