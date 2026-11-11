// ==============================================================================
// DineGo Frontend — Orders Management & Tracking Page (GrabFood Style)
// Status FSM Progress Stepper, Active vs Completed Tabs, Review & MoMo Actions
// ==============================================================================

import React, { useState } from 'react';
import {
  MapPin,
  Smartphone,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Star,
  RotateCcw,
  Bike,
  Store,
} from 'lucide-react';
import type { Order, OrderStatus } from '../types';

interface OrdersPageProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onConfirmCustomerReceipt?: (orderId: string) => void;
  onPayMoMo: (order: Order) => void;
  onExplore: () => void;
  onOpenReviewModal?: (order: Order) => void;
}

const STATUS_LABELS: Record<OrderStatus, { text: string; step: number; color: string; bg: string }> = {
  PENDING: { text: 'Chờ thanh toán', step: 1, color: '#D97706', bg: '#FEF3C7' },
  CONFIRMED: { text: 'Quán đã nhận', step: 2, color: '#0284C7', bg: '#E0F2FE' },
  PREPARING: { text: 'Quán đang làm món', step: 3, color: '#7C3AED', bg: '#EDE9FE' },
  READY_FOR_PICKUP: { text: 'Chờ Shipper lấy món', step: 4, color: '#D97706', bg: '#FEF3C7' },
  DELIVERING: { text: 'Tài xế đang giao', step: 5, color: '#059669', bg: '#D1FAE5' },
  COMPLETED: { text: 'Giao thành công', step: 6, color: '#00B14F', bg: 'rgba(0, 177, 79, 0.12)' },
  CANCELLED: { text: 'Đã hủy đơn', step: 0, color: '#DC2626', bg: '#FEE2E2' },
};

export const OrdersPage: React.FC<OrdersPageProps> = ({
  orders,
  onUpdateOrderStatus,
  onConfirmCustomerReceipt,
  onPayMoMo,
  onExplore,
  onOpenReviewModal,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orders.length > 0 ? orders[0].id : null,
  );
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');

  const filteredOrders = orders.filter((order) => {
    if (filterTab === 'active') {
      return ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERING'].includes(order.status);
    }
    if (filterTab === 'completed') {
      return ['COMPLETED', 'CANCELLED'].includes(order.status);
    }
    return true;
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || orders[0];

  if (orders.length === 0) {
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
            margin: '0 auto 16px auto',
          }}
        >
          <Package size={40} />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>
          Bạn chưa có đơn hàng nào
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Hãy chọn món ăn yêu thích và đặt đơn ngay hôm nay để trải nghiệm dịch vụ của DineGo.
        </p>
        <button className="btn btn-primary" onClick={onExplore} style={{ margin: '0 auto', padding: '12px 28px' }}>
          Khám phá nhà hàng ngay
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      {/* Page Title & Filter Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Đơn hàng của tôi
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Theo dõi tiến trình và lịch sử {orders.length} đơn hàng thực tế
          </p>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            background: '#FFFFFF',
            padding: 4,
            borderRadius: 14,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <button
            onClick={() => setFilterTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 700,
              background: filterTab === 'all' ? 'var(--primary)' : 'transparent',
              color: filterTab === 'all' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Tất cả ({orders.length})
          </button>
          <button
            onClick={() => setFilterTab('active')}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 700,
              background: filterTab === 'active' ? 'var(--primary)' : 'transparent',
              color: filterTab === 'active' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Đang thực hiện ({orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)).length})
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 700,
              background: filterTab === 'completed' ? 'var(--primary)' : 'transparent',
              color: filterTab === 'completed' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Lịch sử ({orders.filter((o) => ['COMPLETED', 'CANCELLED'].includes(o.status)).length})
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 28,
        }}
      >
        {/* Left: Orders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredOrders.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              Không có đơn hàng nào trong mục này.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isSelected = order.id === (selectedOrder?.id ?? selectedOrderId);
              const statusInfo = STATUS_LABELS[order.status] || {
                text: order.status,
                step: 1,
                color: '#64748B',
                bg: '#F1F5F9',
              };
              const isMoMoSuccess = order.payment?.paymentStatus === 'SUCCESS';

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  style={{
                    background: '#FFFFFF',
                    border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 16,
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 6px 20px rgba(0, 177, 79, 0.15)' : 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.98rem' }}>
                      #{order.orderNumber}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: statusInfo.color,
                        background: statusInfo.bg,
                      }}
                    >
                      {statusInfo.text}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Store size={14} color="var(--primary)" />
                    <strong>{order.merchant?.name || 'Nhà hàng DineGo'}</strong>
                    <span>•</span>
                    <span>{(order.items || []).length} món</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>
                      {(order.finalTotal || 0).toLocaleString('vi-VN')}đ
                    </span>

                    {order.payment?.paymentMethod?.includes('MOMO') && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: isMoMoSuccess ? '#059669' : '#D82D8B',
                          background: isMoMoSuccess ? '#D1FAE5' : 'rgba(216, 45, 139, 0.1)',
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        <Smartphone size={13} />
                        {isMoMoSuccess ? 'Đã trả qua MoMo' : 'Chờ quét MoMo'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Order Detail */}
        {selectedOrder && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 28,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: 20,
                borderBottom: '1px solid var(--border)',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chi tiết đơn hàng</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>
                  #{selectedOrder.orderNumber}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Đặt lúc: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>

              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: STATUS_LABELS[selectedOrder.status]?.color || '#64748B',
                  background: STATUS_LABELS[selectedOrder.status]?.bg || '#F1F5F9',
                }}
              >
                {STATUS_LABELS[selectedOrder.status]?.text || selectedOrder.status}
              </span>
            </div>

            {/* FSM Progress Timeline */}
            {selectedOrder.status !== 'CANCELLED' && (
              <div
                style={{
                  background: 'var(--bg-main)',
                  padding: '18px 20px',
                  borderRadius: 16,
                  marginBottom: 24,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 14 }}>
                  Tiến trình đơn hàng trực tiếp:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  {(['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'] as OrderStatus[]).map((st, idx) => {
                    const currentStep = STATUS_LABELS[selectedOrder.status]?.step || 1;
                    const stepNum = idx + 1;
                    const isDone = currentStep >= stepNum;
                    const isCurrent = currentStep === stepNum;

                    return (
                      <div key={st} style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: isDone ? 'var(--primary)' : '#FFFFFF',
                            border: `2.5px solid ${isDone ? 'var(--primary)' : '#CBD5E1'}`,
                            color: isDone ? '#FFFFFF' : '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 6px auto',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            boxShadow: isCurrent ? '0 0 0 4px rgba(0, 177, 79, 0.2)' : 'none',
                          }}
                        >
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: isDone ? 'var(--text-main)' : 'var(--text-muted)',
                            fontWeight: isCurrent ? 800 : 600,
                          }}
                        >
                          {st === 'PENDING' && 'Đặt đơn'}
                          {st === 'CONFIRMED' && 'Đã nhận'}
                          {st === 'PREPARING' && 'Làm món'}
                          {st === 'READY_FOR_PICKUP' && 'Giao hàng'}
                          {st === 'COMPLETED' && 'Đã giao'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(0, 177, 79, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={18} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Địa chỉ nhận hàng</div>
                <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem' }}>{selectedOrder.deliveryAddress}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedOrder.recipientName} • {selectedOrder.recipientPhone}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 }}>
                Danh sách món ăn
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(selectedOrder.items || []).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-main)',
                      padding: '10px 14px',
                      borderRadius: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                        {item.quantity}x {item.itemName}
                      </span>
                      {(item.toppings || []).length > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          + {(item.toppings || []).map((t) => t.toppingName).join(', ')}
                        </div>
                      )}
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                      {(item.subtotal || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 6 }}>
                <span>Tạm tính</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedOrder.subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 6 }}>
                <span>Phí giao hàng</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedOrder.deliveryFee.toLocaleString('vi-VN')}đ</span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '0.88rem', fontWeight: 700, marginBottom: 6 }}>
                  <span>Giảm giá</span>
                  <span>-{selectedOrder.discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 8 }}>
                <span>Tổng tiền</span>
                <span style={{ color: 'var(--primary)' }}>{selectedOrder.finalTotal.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Payment Info Box */}
            <div
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '14px 18px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Phương thức thanh toán</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    {selectedOrder.payment?.paymentMethod === 'MOMO_QR'
                      ? '🌸 Ví MoMo All-in-One Gateway'
                      : '💵 Tiền mặt khi nhận hàng (COD)'}
                  </div>
                  {selectedOrder.payment?.transactionRef && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Mã GD: {selectedOrder.payment.transactionRef}
                    </div>
                  )}
                </div>

                {selectedOrder.payment?.paymentStatus === 'SUCCESS' ? (
                  <span
                    style={{
                      background: '#D1FAE5',
                      color: '#059669',
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Đã thanh toán
                  </span>
                ) : (
                  <span
                    style={{
                      background: '#FEF3C7',
                      color: '#D97706',
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <AlertCircle size={13} />
                    Chờ thanh toán
                  </span>
                )}
              </div>
            </div>

            {/* Customer Delivery Receipt Confirmation Box */}
            {selectedOrder.status === 'DELIVERING' && (
              <div
                style={{
                  background: selectedOrder.customerConfirmedReceipt ? '#ECFDF5' : '#F0FDF4',
                  border: `1.5px solid ${selectedOrder.customerConfirmedReceipt ? '#10B981' : '#86EFAC'}`,
                  borderRadius: 14,
                  padding: '16px 18px',
                  marginBottom: 18,
                }}
              >
                {selectedOrder.customerConfirmedReceipt ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#065F46' }}>
                    <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        Bạn đã xác nhận nhận được hàng thành công
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 2 }}>
                        Lúc{' '}
                        {selectedOrder.customerConfirmedAt
                          ? new Date(selectedOrder.customerConfirmedAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'vừa xong'}{' '}
                        • Tài xế hiện đã được mở khóa nút Hoàn tất giao hàng.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#14532D' }}>
                        Xác nhận nhận hàng từ Shipper
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: 3, lineHeight: 1.45 }}>
                        Khi shipper giao đủ món tới tay bạn, vui lòng bấm xác nhận để tài xế hoàn tất đơn hàng.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onConfirmCustomerReceipt?.(selectedOrder.id)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 10,
                        background: '#00B14F',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Xác nhận đã nhận được hàng</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {selectedOrder.status === 'CANCELLED' && selectedOrder.cancelReason && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 18,
                  color: '#991B1B',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                Lý do hủy đơn: {selectedOrder.cancelReason}
              </div>
            )}

            {/* Actions for Order */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {selectedOrder.status === 'PENDING' && selectedOrder.payment?.paymentMethod?.includes('MOMO') && (
                <button
                  onClick={() => onPayMoMo(selectedOrder)}
                  className="btn-momo"
                  style={{ flex: 1, padding: '12px 18px', borderRadius: 12, fontWeight: 700 }}
                >
                  <Smartphone size={16} />
                  <span>Mở mã quét MoMo</span>
                </button>
              )}

              {selectedOrder.status === 'COMPLETED' && onOpenReviewModal && (
                <button
                  onClick={() => onOpenReviewModal(selectedOrder)}
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <span>Đánh giá món & Góp ý</span>
                </button>
              )}

              {/* Simulation FSM next step button up to READY_FOR_PICKUP (never bypasses merchant handover / driver pickup / customer receipt) */}
              {['PENDING', 'CONFIRMED', 'PREPARING'].includes(selectedOrder.status) && (
                <button
                  onClick={() => {
                    const statusFlow: Record<OrderStatus, OrderStatus> = {
                      PENDING: 'CONFIRMED',
                      CONFIRMED: 'PREPARING',
                      PREPARING: 'READY_FOR_PICKUP',
                      READY_FOR_PICKUP: 'READY_FOR_PICKUP',
                      DELIVERING: 'DELIVERING',
                      COMPLETED: 'COMPLETED',
                      CANCELLED: 'CANCELLED',
                    };
                    onUpdateOrderStatus(selectedOrder.id, statusFlow[selectedOrder.status]);
                  }}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={16} />
                  <span>Chuyển bước kế tiếp (Demo)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
