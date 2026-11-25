import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  DollarSign,
  ChefHat,
  MessageSquare,
} from 'lucide-react';
import type { CateringMenuProposal } from '../../../types';
import { cateringApi } from '../../../api/client';

interface CustomerProposalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingCode: string;
  merchantName: string;
  proposal: CateringMenuProposal;
  onProposalUpdated: (updatedBooking: any) => void;
}

export const CustomerProposalReviewModal: React.FC<CustomerProposalReviewModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  bookingCode,
  merchantName,
  proposal,
  onProposalUpdated,
}) => {
  const [feedback, setFeedback] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !proposal) return null;

  const version = proposal.version ?? proposal.versionNumber ?? 1;
  const proposalItems = (proposal.items || proposal.dishes || []) as any[];
  const priceDelta = proposal.priceDelta ?? ((proposal.priceDeltaPerTable || 0) * 10);
  const proposedTotal = proposal.proposedTotalPrice ?? proposal.newTotalAmount;
  const isExpired = new Date(proposal.expiresAt).getTime() < Date.now();

  const handleRespond = async (action: 'ACCEPT' | 'REJECT' | 'REVISE') => {
    if (action === 'REVISE' && !feedback.trim()) {
      setErrorMessage('Vui lòng nhập ghi chú mong muốn để nhà hàng nắm được ý bạn!');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await cateringApi.respondProposal(bookingId, {
        proposalId: proposal.id || 'prop-latest',
        action,
        customerFeedback: feedback.trim() || undefined,
      });
      if (res && !res.error) {
        onProposalUpdated(res);
        onClose();
      } else {
        setErrorMessage(res?.error?.message || 'Không thể phản hồi đề xuất, vui lòng thử lại.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
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
          background: '#FFFFFF',
          borderRadius: 20,
          maxWidth: 720,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#F8FAFC',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                }}
              >
                Phiên bản v{version}
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Đề xuất điều chỉnh thực đơn tiệc
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Mã hợp đồng: <strong>{bookingCode}</strong> • Nhà hàng: <strong>{merchantName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* SLA / Deadline Notice */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: isExpired ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${isExpired ? '#FCA5A5' : '#FDE68A'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Clock size={18} color={isExpired ? '#DC2626' : '#D97706'} />
            <div style={{ fontSize: '0.82rem', color: isExpired ? '#991B1B' : '#92400E' }}>
              {isExpired ? (
                <strong>Đề xuất này đã hết hạn hiệu lực (SLA: 12 giờ). Vui lòng yêu cầu nhà hàng lập đề xuất mới.</strong>
              ) : (
                <>
                  Hạn phản hồi đề xuất: <strong>{new Date(proposal.expiresAt).toLocaleString('vi-VN')}</strong> (Thời hạn quy định 12 giờ).
                </>
              )}
            </div>
          </div>

          {/* Reason Box */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
              Lý do điều chỉnh từ Nhà hàng
            </div>
            <div style={{ fontSize: '0.9rem', color: '#1E293B', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{proposal.reason || 'Nhà hàng rà soát nguyên liệu tươi và đề xuất thực đơn tối ưu hơn cho bữa tiệc của quý khách.'}"
            </div>
          </div>

          {/* Dish Changes Comparison */}
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>
              Chi tiết thay đổi danh sách món ăn
            </div>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', color: '#475569', fontWeight: 700, textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                    <th style={{ padding: '10px 14px' }}>Món ban đầu</th>
                    <th style={{ padding: '10px 14px' }}>Món đề xuất mới</th>
                    <th style={{ padding: '10px 14px' }}>Lưu ý &amp; Dị ứng</th>
                  </tr>
                </thead>
                <tbody>
                  {proposalItems.map((item: any, idx: number) => {
                    const isReplace = item.action === 'REPLACE';
                    const isAdd = item.action === 'ADD';
                    const isRemove = item.action === 'REMOVE';

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isReplace ? '#FFFBEB' : isAdd ? '#F0FDF4' : isRemove ? '#FEF2F2' : '#FFFFFF',
                        }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          {isReplace && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#FDE68A', color: '#B45309' }}>
                              Thay thế
                            </span>
                          )}
                          {isAdd && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#BBF7D0', color: '#15803D' }}>
                              + Thêm món
                            </span>
                          )}
                          {isRemove && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#FECDD3', color: '#BE123C' }}>
                              - Bỏ món
                            </span>
                          )}
                          {!isReplace && !isAdd && !isRemove && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: '#E2E8F0', color: '#475569' }}>
                              Giữ nguyên
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: isRemove ? '#BE123C' : isReplace ? '#64748B' : '#1E293B', textDecoration: isRemove || isReplace ? 'line-through' : 'none' }}>
                          {item.replacedDishName || (isAdd ? '—' : item.dishName)}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: isReplace || isAdd ? 700 : 500, color: isReplace ? '#B45309' : isAdd ? '#15803D' : isRemove ? '#94A3B8' : '#1E293B' }}>
                          {isRemove ? '—' : item.dishName}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: item.allergenAlert ? '#DC2626' : '#64748B' }}>
                          {item.allergenAlert && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                              <AlertTriangle size={13} />
                              {item.allergenAlert}
                            </div>
                          )}
                          {item.notes && <div>{item.notes}</div>}
                          {!item.allergenAlert && !item.notes && '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Impact Card */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: '1px solid #BFDBFE',
              background: '#EFF6FF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: '0.76rem', color: '#1D4ED8', fontWeight: 700 }}>ẢNH HƯỞNG CHI PHÍ THỰC ĐƠN</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                Chênh lệch:{' '}
                <span style={{ color: priceDelta > 0 ? '#DC2626' : priceDelta < 0 ? '#059669' : '#0F172A' }}>
                  {priceDelta > 0 ? `+${priceDelta.toLocaleString('vi-VN')} đ` : priceDelta < 0 ? `-${Math.abs(priceDelta).toLocaleString('vi-VN')} đ` : '0 đ (Không đổi)'}
                </span>
              </div>
            </div>
            {proposedTotal && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Tổng giá trị tiệc sau điều chỉnh</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00B14F' }}>
                  {proposedTotal.toLocaleString('vi-VN')} đ
                </div>
              </div>
            )}
          </div>

          {/* Revision Feedback Input */}
          {showRevisionInput && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                Ghi chú yêu cầu điều chỉnh lại gửi cho Nhà hàng:
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ví dụ: Tôi muốn đổi món hải sản sang bò nướng, và giữ lại món súp ban đầu..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {errorMessage && (
            <div style={{ color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={submitting || isExpired}
              onClick={() => handleRespond('REJECT')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #FECDD3',
                background: '#FFF1F2',
                color: '#BE123C',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: isExpired ? 'not-allowed' : 'pointer',
              }}
            >
              Từ chối &amp; Hủy đơn
            </button>
            <button
              type="button"
              disabled={submitting || isExpired}
              onClick={() => {
                if (!showRevisionInput) {
                  setShowRevisionInput(true);
                } else {
                  void handleRespond('REVISE');
                }
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: isExpired ? 'not-allowed' : 'pointer',
              }}
            >
              {showRevisionInput ? 'Gửi yêu cầu chỉnh sửa' : 'Yêu cầu điều chỉnh lại'}
            </button>
          </div>

          <button
            type="button"
            disabled={submitting || isExpired}
            onClick={() => handleRespond('ACCEPT')}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              background: '#00B14F',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: isExpired ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0, 177, 79, 0.3)',
            }}
          >
            ✓ Đồng ý đề xuất &amp; Chuyển sang Đặt cọc
          </button>
        </div>
      </div>
    </div>
  );
};
