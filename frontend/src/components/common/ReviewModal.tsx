// ==============================================================================
// DineGo Frontend — Review & Complaint Modal (Sprint 5 — U047, U051)
// Clean Market Modal, Star Ratings, Complaint Moderation & Feedback
// ==============================================================================

import React, { useState } from 'react';
import { X, Star, AlertTriangle, CheckCircle2, MessageSquare, ThumbsUp } from 'lucide-react';
import type { Order } from '../../types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmitted: (reviewData: any) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  order,
  onSubmitted,
}) => {
  const [tab, setTab] = useState<'review' | 'complaint'>('review');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [issueType, setIssueType] = useState('MISSING_ITEMS');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmitReview = () => {
    if (!comment.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      onSubmitted({
        type: 'REVIEW',
        orderId: order.id,
        rating,
        comment,
      });
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  const handleSubmitComplaint = () => {
    if (!complaintDesc.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      onSubmitted({
        type: 'COMPLAINT',
        orderId: order.id,
        issueType,
        description: complaintDesc,
      });
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
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
                background: tab === 'review' ? 'rgba(0, 177, 79, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: tab === 'review' ? 'var(--primary)' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tab === 'review' ? <Star size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {tab === 'review' ? 'Đánh giá món ăn' : 'Khiếu nại đơn hàng'}
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Đơn hàng #{order.orderNumber} • {order.merchant?.name}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 20px 0 20px', gap: 8 }}>
          <button
            onClick={() => setTab('review')}
            style={{
              padding: '9px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 700,
              background: tab === 'review' ? 'var(--primary)' : 'var(--bg-main)',
              color: tab === 'review' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ⭐ Đánh giá trải nghiệm
          </button>
          <button
            onClick={() => setTab('complaint')}
            style={{
              padding: '9px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 700,
              background: tab === 'complaint' ? '#EF4444' : 'var(--bg-main)',
              color: tab === 'complaint' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ⚠️ Báo sự cố / Khiếu nại
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: 20 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <CheckCircle2 size={48} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                Gửi thông tin thành công!
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                DineGo xin chân thành cảm ơn phản hồi quý báu từ bạn.
              </p>
            </div>
          ) : tab === 'review' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Star Rating */}
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <Star
                        size={32}
                        color="#F59E0B"
                        fill={(hoverRating || rating) >= s ? '#F59E0B' : 'transparent'}
                      />
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {rating === 5 && 'Tuyệt vời, món ăn rất ngon!'}
                  {rating === 4 && 'Hài lòng, đóng gói cẩn thận'}
                  {rating === 3 && 'Bình thường, tạm được'}
                  {rating === 2 && 'Cần cải thiện chất lượng'}
                  {rating === 1 && 'Rất không hài lòng'}
                </div>
              </div>

              {/* Comment text */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Nhận xét chi tiết:
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Hương vị món ăn như thế nào? Đồ ăn có nóng và đóng gói kỹ không?..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    resize: 'none',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={!comment.trim()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700, borderRadius: 12 }}
              >
                Gửi đánh giá món ăn
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Loại vấn đề gặp phải:
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  <option value="MISSING_ITEMS">Giao thiếu món / thiếu đồ ăn kèm</option>
                  <option value="FOOD_QUALITY">Món ăn không đúng mô tả / đồ nguội</option>
                  <option value="HYGIENE">Vấn đề vệ sinh an toàn thực phẩm</option>
                  <option value="DRIVER_ISSUE">Thái độ phục vụ của tài xế shipper</option>
                  <option value="PAYMENT_ERROR">Lỗi trừ tiền ví MoMo sai lệch</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  Mô tả cụ thể sự việc:
                </label>
                <textarea
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  placeholder="Mô tả cụ thể món bị thiếu hoặc chi tiết vấn đề để Admin xử lý bồi thường..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    resize: 'none',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEE2E2', color: '#DC2626', fontSize: '0.78rem', fontWeight: 600 }}>
                Hội đồng phân xử DineGo cam kết phản hồi trong 24h và hoàn tiền trực tiếp qua MoMo nếu lỗi thuộc về quán hoặc shipper.
              </div>

              <button
                onClick={handleSubmitComplaint}
                disabled={!complaintDesc.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  borderRadius: 12,
                  border: 'none',
                  cursor: !complaintDesc.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Gửi khiếu nại cho Admin sàn
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
