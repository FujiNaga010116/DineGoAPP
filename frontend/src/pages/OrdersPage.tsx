// ==============================================================================
// DineGo Frontend — Orders Management & Live Tracking Page (Phase 5.3 + Phase 6)
// ==============================================================================

import React, { useState } from 'react';
import {
  MapPin,
  Smartphone,
  Package,
  XCircle,
} from 'lucide-react';
import type { Order, OrderStatus } from '../types';

interface OrdersPageProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onPayMoMo: (order: Order) => void;
  onExplore: () => void;
  onOpenReviewModal?: (order: Order) => void;
}

const STATUS_LABELS: Record<OrderStatus, { text: string; step: number }> = {
  PENDING: { text: 'Chờ xác nhận / Chờ thanh toán', step: 1 },
  CONFIRMED: { text: 'Đã xác nhận thanh toán', step: 2 },
  PREPARING: { text: 'Quán đang chuẩn bị món', step: 3 },
  READY_FOR_PICKUP: { text: 'Tài xế đang giao đến bạn', step: 4 },
  COMPLETED: { text: 'Giao hàng thành công', step: 5 },
  CANCELLED: { text: 'Đã hủy đơn', step: 0 },
};

export const OrdersPage: React.FC<OrdersPageProps> = ({
  orders,
  onUpdateOrderStatus,
  onPayMoMo,
  onExplore,
  onOpenReviewModal,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orders.length > 0 ? orders[0].id : null,
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  if (orders.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Package size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 10 }}>
          Bạn chưa có đơn hàng nào
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Hãy chọn món ăn yêu thích và đặt đơn ngay hôm nay.
        </p>
        <button className="cart-btn" onClick={onExplore} style={{ margin: '0 auto' }}>
          Khám phá nhà hàng
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
            Đơn hàng của tôi
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Quản lý và theo dõi tiến trình {orders.length} đơn hàng thực tế
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 32,
        }}
      >
        {/* Left: Orders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map((order) => {
            const isSelected = order.id === selectedOrderId;
            const statusInfo = STATUS_LABELS[order.status] || { text: order.status, step: 1 };
            const isMoMoSuccess = order.payment?.paymentStatus === 'SUCCESS';

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                style={{
                  background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 4px 18px var(--primary-glow)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, color: '#fff' }}>#{order.orderNumber}</span>
                  <span className={`status-pill status-${order.status}`}>
                    {statusInfo.text}
                  </span>
                </div>

                <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {order.merchant?.name || 'DineGo Store'} • {(order.items || []).length} món
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>
                    {(order.finalTotal || 0).toLocaleString('vi-VN')}đ
                  </span>

                  {order.payment?.paymentMethod?.includes('MOMO') && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: isMoMoSuccess ? '#10B981' : '#D82D8B',
                      }}
                    >
                      <Smartphone size={13} />
                      {isMoMoSuccess ? 'Đã thanh toán MoMo' : 'Chờ quét MoMo'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Order Detail */}
        {selectedOrder && (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 28,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 20,
                borderBottom: '1px solid var(--border)',
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chi tiết đơn hàng</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                  #{selectedOrder.orderNumber}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Đặt lúc: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>

              <span className={`status-pill status-${selectedOrder.status}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                {STATUS_LABELS[selectedOrder.status]?.text || selectedOrder.status}
              </span>
            </div>

            {/* FSM Progress Timeline */}
            {selectedOrder.status !== 'CANCELLED' && (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 24,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Tiến trình đơn hàng (FSM):
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  {(['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'] as OrderStatus[]).map((st, idx) => {
                    const currentStep = STATUS_LABELS[selectedOrder.status]?.step || 1;
                    const stepNum = idx + 1;
                    const isDone = currentStep >= stepNum;

                    return (
                      <div key={st} style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: isDone ? 'var(--primary)' : 'var(--bg-card)',
                            border: `2px solid ${isDone ? 'var(--primary)' : 'var(--border-strong)'}`,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 6px auto',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                          }}
                        >
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: isDone ? '#fff' : 'var(--text-muted)', fontWeight: 600 }}>
                          {st === 'PENDING' && 'Đặt đơn'}
                          {st === 'CONFIRMED' && 'Đã xác nhận'}
                          {st === 'PREPARING' && 'Chuẩn bị'}
                          {st === 'READY_FOR_PICKUP' && 'Đang giao'}
                          {st === 'COMPLETED' && 'Hoàn tất'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
              <MapPin size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Địa chỉ nhận hàng</div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{selectedOrder.deliveryAddress}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedOrder.recipientName} • {selectedOrder.recipientPhone}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>Danh sách món ăn</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(selectedOrder.items || []).map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{item.quantity}x {item.itemName}</span>
                      {(item.toppings || []).length > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          + {(item.toppings || []).map((t) => t.toppingName).join(', ')}
                        </div>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {(item.subtotal || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 6 }}>
                <span>Tạm tính</span>
                <span>{selectedOrder.subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 6 }}>
                <span>Phí giao hàng</span>
                <span>{selectedOrder.deliveryFee.toLocaleString('vi-VN')}đ</span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontSize: '0.9rem', marginBottom: 6 }}>
                  <span>Giảm giá</span>
                  <span>-{selectedOrder.discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>
                <span>Tổng tiền</span>
                <span style={{ color: 'var(--primary)' }}>{selectedOrder.finalTotal.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Payment Section & Actions */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cổng thanh toán</div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>
                    {selectedOrder.payment?.paymentMethod || 'MOMO_QR'}
                  </div>
                  {selectedOrder.payment?.transactionRef && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Mã GD: {selectedOrder.payment.transactionRef}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trạng thái thanh toán</div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: selectedOrder.payment?.paymentStatus === 'SUCCESS' ? '#10B981' : '#F59E0B',
                    }}
                  >
                    {selectedOrder.payment?.paymentStatus === 'SUCCESS' ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedOrder.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => onPayMoMo(selectedOrder)}
                    className="btn-momo"
                    style={{ padding: '12px 20px' }}
                  >
                    <Smartphone size={18} />
                    <span>Thanh toán ngay bằng MoMo (Quét QR)</span>
                  </button>

                  <button
                    onClick={() => onUpdateOrderStatus(selectedOrder.id, 'CANCELLED')}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--danger)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    <XCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                    Hủy đơn hàng này
                  </button>
                </>
              )}

              {/* Completed order actions: Review & Complaints (Sprint 5) */}
              {selectedOrder.status === 'COMPLETED' && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 10 }}>
                  <button
                    onClick={() => onOpenReviewModal && onOpenReviewModal(selectedOrder)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 10,
                      background: 'rgba(255, 87, 34, 0.15)',
                      border: '1px solid var(--primary)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    ⭐ Đánh giá món ăn & Báo sự cố đơn hàng (Sprint 5)
                  </button>
                </div>
              )}
              {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 6 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Công cụ giả lập FSM trạng thái (Dành cho demo):
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedOrder.status === 'CONFIRMED' && (
                      <button
                        onClick={() => onUpdateOrderStatus(selectedOrder.id, 'PREPARING')}
                        style={{ padding: '8px 14px', borderRadius: 6, background: '#3B82F6', color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}
                      >
                        Bắt đầu chuẩn bị món →
                      </button>
                    )}
                    {selectedOrder.status === 'PREPARING' && (
                      <button
                        onClick={() => onUpdateOrderStatus(selectedOrder.id, 'READY_FOR_PICKUP')}
                        style={{ padding: '8px 14px', borderRadius: 6, background: '#8B5CF6', color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}
                      >
                        Giao cho tài xế →
                      </button>
                    )}
                    {selectedOrder.status === 'READY_FOR_PICKUP' && (
                      <button
                        onClick={() => onUpdateOrderStatus(selectedOrder.id, 'COMPLETED')}
                        style={{ padding: '8px 14px', borderRadius: 6, background: '#10B981', color: '#fff', fontWeight: 600, fontSize: '0.82rem' }}
                      >
                        Hoàn thành đơn hàng ✓
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
