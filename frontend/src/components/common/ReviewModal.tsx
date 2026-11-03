// ==============================================================================
// DineGo Frontend — Review & Complaint Modal (Sprint 5 — U047, U051)
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
        background: 'rgba(0,0,0,0.75)',
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
          maxWidth: 500,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
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
                width: 34,
                height: 34,
                borderRadius: 8,
                background: tab === 'review' ? 'rgba(255, 87, 34, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: tab === 'review' ? 'var(--primary)' : 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tab === 'review' ? <MessageSquare size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                {tab === 'review' ? 'Đánh giá món ăn' : 'Khiếu nại đơn hàng'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Đơn {order.orderNumber} • {order.merchant.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
          <button
            onClick={() => setTab('review')}
            style={{
              padding: '10px 16px',
              borderBottom: tab === 'review' ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === 'review' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              background: 'transparent',
            }}
          >
            Đánh giá quán & Món ăn
          </button>
          <button
            onClick={() => setTab('complaint')}
            style={{
              padding: '10px 16px',
              borderBottom: tab === 'complaint' ? '2px solid var(--danger)' : '2px solid transparent',
              color: tab === 'complaint' ? 'var(--danger)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              background: 'transparent',
            }}
          >
            Báo sự cố / Khiếu nại
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px' }} />
              <h4>{tab === 'review' ? 'Cảm ơn đánh giá của bạn!' : 'Đã tiếp nhận khiếu nại!'}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                {tab === 'review'
                  ? 'Đánh giá đã được ghi nhận và chia sẻ tới cộng đồng DineGo.'
                  : 'Mã khiếu nại đã gửi tới Admin. Chúng tôi sẽ phản hồi và hoàn tiền MoMo trong 24h.'}
              </p>
            </div>
          ) : tab === 'review' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Star Rating */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Bạn hài lòng với bữa ăn này như thế nào?
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      style={{ background: 'transparent', padding: 4 }}
                    >
                      <Star
                        size={32}
                        color={(hoverRating || rating) >= s ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
                        fill={(hoverRating || rating) >= s ? '#F59E0B' : 'none'}
                      />
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F59E0B', marginTop: 6 }}>
                  {rating === 5 && 'Tuyệt vời, món ăn rất ngon!'}
                  {rating === 4 && 'Hài lòng, giao nhanh đúng vị.'}
                  {rating === 3 && 'Bình thường, tạm ổn.'}
                  {rating === 2 && 'Chưa hài lòng, cần cải thiện.'}
                  {rating === 1 && 'Rất tệ, không đúng kỳ vọng.'}
                </div>
              </div>

              {/* Comment text */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Nhận xét chi tiết:
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Hương vị món ăn như thế nào? Đồ ăn có nóng và đóng gói kỹ không?..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    resize: 'none',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={!comment.trim()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                Gửi đánh giá
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Loại vấn đề gặp phải:
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: '#fff',
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
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Mô tả cụ thể sự việc:
                </label>
                <textarea
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  placeholder="Mô tả cụ thể món bị thiếu hoặc chi tiết vấn đề để Admin xử lý bồi thường..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    resize: 'none',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.78rem' }}>
                Admin DineGo cam kết xử lý khiếu nại trong vòng 24 giờ và hoàn tiền trực tiếp vào tài khoản MoMo nếu lỗi từ nhà hàng hoặc tài xế.
              </div>

              <button
                onClick={handleSubmitComplaint}
                disabled={!complaintDesc.trim()}
                className="btn btn-danger"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#EF4444',
                  color: '#fff',
                  fontWeight: 600,
                  borderRadius: 10,
                }}
              >
                Gửi khiếu nại cho Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
