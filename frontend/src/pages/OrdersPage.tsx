// ==============================================================================
// DineGo Frontend — Orders Management & Real-Time Multi-Actor Progress Page
// Multi-Actor FSM: Customer -> Merchant -> Kitchen -> Driver -> Customer
// Supports Real-Time Auto-Dispatch Simulation & Strict Actor Handshake Logic
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
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
  ChefHat,
  Navigation,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Check,
  Calendar,
  UtensilsCrossed,
  MessageSquare,
  Printer,
} from 'lucide-react';
import type { DriverProfile, Order, OrderStatus } from '../types';
import { MOCK_DRIVERS } from '../api/client';
import {
  CateringFinalBillModal,
  type CateringBillData,
} from '../components/common/CateringFinalBillModal';
import { DeliveryMap } from '../components/common/DeliveryMap';
import {
  calculateHaversineKm,
  fetchRoadRoute,
  resolveCustomerCoords,
  resolveMerchantCoords,
  type RoadRouteResult,
} from '../utils/routing';

export interface OrdersPageProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onConfirmCustomerReceipt?: (orderId: string) => void;
  onAcceptDriverOrder?: (orderId: string, driver: DriverProfile) => void;
  onMarkDriverArrivedAtStore?: (orderId: string) => void;
  onConfirmMerchantPickup?: (orderId: string) => void;
  onTrackOrder?: (orderId: string) => void;
  drivers?: DriverProfile[];
  onPayMoMo: (order: Order) => void;
  onExplore: () => void;
  onOpenReviewModal?: (order: Order) => void;
}

export const STATUS_LABELS: Record<OrderStatus, { text: string; step: number; color: string; bg: string }> = {
  PENDING: { text: 'Chờ Quán nhận đơn', step: 1, color: '#D97706', bg: '#FEF3C7' },
  CONFIRMED: { text: 'Quán đã tiếp nhận', step: 2, color: '#0284C7', bg: '#E0F2FE' },
  PREPARING: { text: 'Bếp đang làm món', step: 3, color: '#7C3AED', bg: '#EDE9FE' },
  READY_FOR_PICKUP: { text: 'Chờ Shipper lấy món', step: 4, color: '#D97706', bg: '#FEF3C7' },
  DELIVERING: { text: 'Tài xế đang giao', step: 5, color: '#059669', bg: '#D1FAE5' },
  COMPLETED: { text: 'Giao thành công', step: 6, color: '#00B14F', bg: 'rgba(0, 177, 79, 0.12)' },
  CANCELLED: { text: 'Đã hủy đơn', step: 0, color: '#DC2626', bg: '#FEE2E2' },
};

interface MilestoneStep {
  status: OrderStatus;
  stepNum: number;
  label: string;
  sublabel: string;
  actor: 'CUSTOMER' | 'MERCHANT' | 'DRIVER' | 'COMPLETED';
  actorName: string;
  actorColor: string;
}

const TIMELINE_MILESTONES: MilestoneStep[] = [
  {
    status: 'PENDING',
    stepNum: 1,
    label: 'Đặt đơn',
    sublabel: 'Khách tạo đơn',
    actor: 'CUSTOMER',
    actorName: 'Khách hàng',
    actorColor: '#00B14F',
  },
  {
    status: 'CONFIRMED',
    stepNum: 2,
    label: 'Quán nhận',
    sublabel: 'Xác nhận đơn',
    actor: 'MERCHANT',
    actorName: 'Nhà hàng',
    actorColor: '#0284C7',
  },
  {
    status: 'PREPARING',
    stepNum: 3,
    label: 'Làm món',
    sublabel: 'Bếp đang nấu',
    actor: 'MERCHANT',
    actorName: 'Bếp quán',
    actorColor: '#7C3AED',
  },
  {
    status: 'READY_FOR_PICKUP',
    stepNum: 4,
    label: 'Lấy món',
    sublabel: 'Bàn giao Shipper',
    actor: 'DRIVER',
    actorName: 'Quán & Shipper',
    actorColor: '#D97706',
  },
  {
    status: 'DELIVERING',
    stepNum: 5,
    label: 'Đang giao',
    sublabel: 'Shipper di chuyển',
    actor: 'DRIVER',
    actorName: 'Tài xế',
    actorColor: '#059669',
  },
  {
    status: 'COMPLETED',
    stepNum: 6,
    label: 'Đã giao',
    sublabel: 'Giao thành công',
    actor: 'COMPLETED',
    actorName: 'Hoàn tất',
    actorColor: '#00B14F',
  },
];

export const OrdersPage: React.FC<OrdersPageProps> = ({
  orders,
  onUpdateOrderStatus,
  onConfirmCustomerReceipt,
  onAcceptDriverOrder,
  onMarkDriverArrivedAtStore,
  onConfirmMerchantPickup,
  onTrackOrder,
  drivers = MOCK_DRIVERS,
  onPayMoMo,
  onExplore,
  onOpenReviewModal,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orders.length > 0 ? orders[0].id : null,
  );
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [autoNotice, setAutoNotice] = useState<string>('');
  const [activeCateringBill, setActiveCateringBill] = useState<CateringBillData | null>(null);
  const [cateringRoute, setCateringRoute] = useState<RoadRouteResult | null>(null);

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
  const activeDriver = drivers.find((d) => d.id === selectedOrder?.assignedDriverId) || drivers[0] || MOCK_DRIVERS[0];

  // Fetch road route between catering store & pinned party venue on the Leaflet map
  useEffect(() => {
    if (!selectedOrder || selectedOrder.orderType !== 'CATERING') {
      setCateringRoute(null);
      return;
    }
    const storeCoords =
      typeof selectedOrder.merchant?.latitude === 'number' &&
      typeof selectedOrder.merchant?.longitude === 'number'
        ? {
            lat: selectedOrder.merchant.latitude,
            lng: selectedOrder.merchant.longitude,
          }
        : resolveMerchantCoords(
            selectedOrder.merchant?.id,
            selectedOrder.merchant?.address,
          );
    const partyCoords =
      typeof selectedOrder.deliveryLatitude === 'number' &&
      typeof selectedOrder.deliveryLongitude === 'number'
        ? {
            lat: selectedOrder.deliveryLatitude,
            lng: selectedOrder.deliveryLongitude,
          }
        : resolveCustomerCoords(selectedOrder.deliveryAddress, storeCoords);

    let cancelled = false;
    void fetchRoadRoute([storeCoords, partyCoords]).then((route) => {
      if (!cancelled) setCateringRoute(route);
    });
    return () => {
      cancelled = true;
    };
  }, [
    selectedOrder?.id,
    selectedOrder?.orderType,
    selectedOrder?.deliveryLatitude,
    selectedOrder?.deliveryLongitude,
    selectedOrder?.merchant?.id,
  ]);

  // Auto-Progression Engine (Tự động hóa chuỗi chấp thuận của các Actor)
  useEffect(() => {
    if (!isAutoPlay || !selectedOrder) return;
    if (selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED') {
      setIsAutoPlay(false);
      setAutoNotice('Đơn hàng đã hoàn tất tiến trình.');
      return;
    }

    const timer = setTimeout(() => {
      const order = selectedOrder;
      if (!order) return;

      if (order.status === 'PENDING') {
        setAutoNotice('🏪 [Nhà hàng]: Quán đã tiếp nhận đơn và xác nhận chuẩn bị món.');
        onUpdateOrderStatus(order.id, 'CONFIRMED');
      } else if (order.status === 'CONFIRMED') {
        setAutoNotice('🍳 [Bếp quán]: Nhà hàng đã chuyển phiếu và bắt đầu nấu món ăn.');
        onUpdateOrderStatus(order.id, 'PREPARING');
      } else if (order.status === 'PREPARING') {
        setAutoNotice('🍲 [Bếp quán]: Món ăn đã chế biến xong, đóng gói chờ Shipper nhận.');
        onUpdateOrderStatus(order.id, 'READY_FOR_PICKUP');
      } else if (order.status === 'READY_FOR_PICKUP') {
        if (!order.assignedDriverId) {
          setAutoNotice(`🛵 [Tài xế]: Shipper ${activeDriver.fullName} (${activeDriver.licensePlate}) đã nhận đơn hàng.`);
          if (onAcceptDriverOrder) {
            onAcceptDriverOrder(order.id, activeDriver);
          } else {
            onUpdateOrderStatus(order.id, 'READY_FOR_PICKUP');
          }
        } else if (!order.driverArrivedAtStore) {
          setAutoNotice(`📍 [Tài xế]: ${order.assignedDriverName || activeDriver.fullName} đã có mặt tại nhà hàng.`);
          onMarkDriverArrivedAtStore?.(order.id);
        } else if (!order.merchantConfirmedPickup) {
          setAutoNotice('🤝 [Nhà hàng]: Quán đã kiểm tra và bàn giao túi món ăn cho Tài xế.');
          onConfirmMerchantPickup?.(order.id);
        } else {
          setAutoNotice(`🚚 [Vận chuyển]: Tài xế ${order.assignedDriverName || activeDriver.fullName} đã nhận món và đang giao tới bạn.`);
          onUpdateOrderStatus(order.id, 'DELIVERING');
        }
      } else if (order.status === 'DELIVERING') {
        if (!order.customerConfirmedReceipt) {
          setAutoNotice('👤 [Khách hàng]: Khách đã nhận đủ món từ shipper và bấm xác nhận.');
          onConfirmCustomerReceipt?.(order.id);
        } else {
          setAutoNotice('🎉 [Hoàn tất]: Đơn hàng đã hoàn thành giao thành công!');
          onUpdateOrderStatus(order.id, 'COMPLETED');
          setIsAutoPlay(false);
        }
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [
    isAutoPlay,
    selectedOrder,
    activeDriver,
    onUpdateOrderStatus,
    onAcceptDriverOrder,
    onMarkDriverArrivedAtStore,
    onConfirmMerchantPickup,
    onConfirmCustomerReceipt,
  ]);

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
          Hãy chọn món ăn yêu thích và đặt đơn ngay hôm nay để trải nghiệm chuỗi tiến trình đa tác nhân của DineGo.
        </p>
        <button className="btn btn-primary" onClick={onExplore} style={{ margin: '0 auto', padding: '12px 28px' }}>
          Khám phá nhà hàng ngay
        </button>
      </div>
    );
  }

  const currentStepNum = selectedOrder ? STATUS_LABELS[selectedOrder.status]?.step || 1 : 1;
  const progressPercent = Math.max(
    0,
    Math.min(100, ((currentStepNum - 1) / (TIMELINE_MILESTONES.length - 1)) * 100),
  );

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
            Theo dõi tiến trình thời gian thực có sự phối hợp giữa Khách hàng, Quán ăn và Tài xế
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
          alignItems: 'start',
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
              const isCatering = order.orderType === 'CATERING' && !!order.cateringDetails;
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
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setIsAutoPlay(false);
                    setAutoNotice('');
                  }}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Store size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                        <span>{order.merchant?.name || 'Nhà hàng DineGo'}</span>
                      </div>
                      {isCatering && order.cateringDetails?.merchantRating && (
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#D97706', marginTop: 2 }}>
                          ★ {order.cateringDetails.merchantRating.toFixed(1)}
                          {order.cateringDetails.merchantReviewCount
                            ? ` (${order.cateringDetails.merchantReviewCount} đánh giá)`
                            : ''}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: statusInfo.color,
                        background: statusInfo.bg,
                        flexShrink: 0,
                      }}
                    >
                      {isCatering && order.status === 'CONFIRMED'
                        ? order.cateringDetails?.merchantApproved
                          ? 'Đã xác nhận lịch • Chờ tiệc'
                          : 'Đã cọc • Chờ phục vụ'
                        : isCatering && order.status === 'COMPLETED'
                        ? 'Hoàn thành • Có Bill tổng'
                        : statusInfo.text}
                    </span>
                  </div>

                  {isCatering && order.cateringDetails && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: 'rgba(0, 177, 79, 0.1)',
                        color: '#00B14F',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        marginBottom: 8,
                      }}
                    >
                      <UtensilsCrossed size={12} />
                      <span>ĐẶT TIỆC • {order.cateringDetails.partyTypeTitle}</span>
                    </div>
                  )}

                  <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {isCatering && order.cateringDetails
                        ? order.cateringDetails.packageName
                        : `${order.items?.length || 1} món`}
                    </strong>
                    <span>•</span>
                    <span>
                      {isCatering && order.cateringDetails
                        ? `${order.cateringDetails.tableCount} mâm • ${order.cateringDetails.eventTime} (${order.cateringDetails.eventDate})`
                        : `#${order.orderNumber}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {(order.finalTotal || 0).toLocaleString('vi-VN')}đ
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                      {isCatering && order.cateringDetails ? (
                        <span style={{ color: '#059669', background: '#D1FAE5', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>
                          ✓ Đã cọc MoMo: {order.cateringDetails.depositAmount.toLocaleString('vi-VN')}đ ({order.cateringDetails.depositPercent}%)
                        </span>
                      ) : isMoMoSuccess ? (
                        <span style={{ color: '#059669', background: '#D1FAE5', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                          ✓ Đã trả qua MoMo
                        </span>
                      ) : (
                        <span style={{ color: '#D97706', background: '#FEF3C7', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                          💵 Tiền mặt (COD)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Order Detail with Live Progress & Multi-Actor Controls */}
        {selectedOrder && (() => {
          const isCateringOrder =
            selectedOrder.orderType === 'CATERING' && !!selectedOrder.cateringDetails;
          const cateringInfo = selectedOrder.cateringDetails;
          return (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 26,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Order Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: 18,
                borderBottom: '1px solid var(--border)',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>
                  {isCateringOrder ? 'Đơn đặt tiệc lưu động' : 'Đơn hàng giao món'}
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', margin: '4px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{selectedOrder.merchant?.name || 'Nhà hàng DineGo'}</span>
                  {isCateringOrder && cateringInfo?.merchantRating && (
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#D97706' }}>
                      • ★ {cateringInfo.merchantRating.toFixed(1)}
                      {cateringInfo.merchantReviewCount
                        ? ` (${cateringInfo.merchantReviewCount} đánh giá)`
                        : ''}
                    </span>
                  )}
                </h2>
                {isCateringOrder && cateringInfo && (
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 3 }}>
                    {cateringInfo.packageName}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Mã đơn: #{selectedOrder.orderNumber} • Đặt lúc: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
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
                  {isCateringOrder && selectedOrder.status === 'CONFIRMED'
                    ? `Đã cọc ${cateringInfo?.depositPercent || 30}% • Chờ phục vụ`
                    : STATUS_LABELS[selectedOrder.status]?.text || selectedOrder.status}
                </span>

                {/* Auto Progression Play/Pause Toggle (Food delivery only) */}
                {!isCateringOrder && selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoPlay(!isAutoPlay);
                      if (!isAutoPlay) {
                        setAutoNotice('Đã kích hoạt tự động điều phối các Actor theo thời gian thực...');
                      } else {
                        setAutoNotice('Đã tạm dừng tự động.');
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: isAutoPlay ? '1.5px solid #00B14F' : '1.5px solid #CBD5E1',
                      background: isAutoPlay ? '#ECFDF5' : '#F8FAFC',
                      color: isAutoPlay ? '#065F46' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isAutoPlay ? <Pause size={13} color="#00B14F" /> : <Play size={13} color="#0284C7" />}
                    <span>{isAutoPlay ? 'Tự động chạy (Bật)' : 'Chạy tự động (Actor Auto)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Auto Progression Notice Toast */}
            {autoNotice && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: isAutoPlay ? '#EFF6FF' : '#F1F5F9',
                  border: isAutoPlay ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                  padding: '10px 14px',
                  borderRadius: 12,
                  marginBottom: 18,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: isAutoPlay ? '#1E40AF' : '#475569',
                }}
              >
                <Sparkles size={16} color={isAutoPlay ? '#2563EB' : '#64748B'} style={{ flexShrink: 0 }} />
                <span>{autoNotice}</span>
              </div>
            )}

            {/* Catering Summary & Deposit Card */}
            {isCateringOrder && cateringInfo && (
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1.5px solid #A7F3D0',
                  borderRadius: 16,
                  padding: '18px 20px',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#065F46', fontSize: '0.96rem' }}>
                    <UtensilsCrossed size={18} color="#00B14F" />
                    <span>Thông tin Đặt Tiệc &amp; Tiền Cọc MoMo</span>
                  </div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#047857', background: '#FFFFFF', padding: '4px 10px', borderRadius: 999, border: '1px solid #A7F3D0' }}>
                    {cateringInfo.partyTypeTitle}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '12px 14px', border: '1px solid #D1FAE5' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Gói thực đơn đã đặt</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                      {cateringInfo.packageName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                      {cateringInfo.tableCount} mâm • {cateringInfo.tableCount * cateringInfo.guestCountPerTable} khách
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '12px 14px', border: '1px solid #D1FAE5' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Đã đặt cọc qua MoMo ({cateringInfo.depositPercent}%)</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#00B14F', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {cateringInfo.depositAmount.toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                      ✓ Đã xác nhận giao dịch MoMo
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '12px 14px', border: '1px solid #D1FAE5' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Còn lại tất toán sau tiệc</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {cateringInfo.remainingAmount.toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> {cateringInfo.eventTime} • {cateringInfo.eventDate}
                    </div>
                  </div>
                </div>

                {cateringInfo.customNote && (
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: '0.82rem',
                      color: '#065F46',
                      border: '1px solid #D1FAE5',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <MessageSquare size={15} color="#00B14F" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <strong>Ghi chú cho nhà hàng:</strong> {cateringInfo.customNote}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Leaflet Map for Catering Venue & Kitchen Location */}
            {isCateringOrder && cateringInfo && (() => {
              const storeCoords =
                typeof selectedOrder.merchant?.latitude === 'number' &&
                typeof selectedOrder.merchant?.longitude === 'number'
                  ? {
                      lat: selectedOrder.merchant.latitude,
                      lng: selectedOrder.merchant.longitude,
                    }
                  : resolveMerchantCoords(
                      selectedOrder.merchant?.id,
                      selectedOrder.merchant?.address,
                    );
              const partyCoords =
                typeof selectedOrder.deliveryLatitude === 'number' &&
                typeof selectedOrder.deliveryLongitude === 'number'
                  ? {
                      lat: selectedOrder.deliveryLatitude,
                      lng: selectedOrder.deliveryLongitude,
                    }
                  : resolveCustomerCoords(selectedOrder.deliveryAddress, storeCoords);
              const distanceKm =
                cateringRoute?.distanceKm ??
                calculateHaversineKm(storeCoords, partyCoords);
              const etaMin =
                cateringRoute?.durationMin ??
                Math.max(10, Math.round(distanceKm * 4));
              return (
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <MapPin size={16} color="#00B14F" />
                      <span>Vị trí Bếp phục vụ &amp; Địa điểm Tổ chức tiệc trên bản đồ</span>
                    </div>
                    <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>
                      Khoảng cách ~{distanceKm} km
                    </span>
                  </div>
                  <DeliveryMap
                    store={{
                      ...storeCoords,
                      name: selectedOrder.merchant?.name || 'Bếp phục vụ tiệc',
                      address: selectedOrder.merchant?.address || '',
                    }}
                    customer={{
                      ...partyCoords,
                      label: 'Địa điểm tổ chức tiệc',
                      address: selectedOrder.deliveryAddress,
                    }}
                    shipper={{
                      ...storeCoords,
                      name: 'Đội ngũ phục vụ tiệc',
                      plate: cateringInfo.eventTime,
                      heading: 0,
                    }}
                    routePoints={
                      cateringRoute?.coordinates || [
                        [storeCoords.lat, storeCoords.lng],
                        [partyCoords.lat, partyCoords.lng],
                      ]
                    }
                    status={selectedOrder.status}
                    distanceKm={distanceKm}
                    etaMinutes={etaMin}
                    routeSource={cateringRoute?.source || 'fallback'}
                    height={240}
                  />
                </div>
              );
            })()}

            {/* 6-Stage Multi-Actor Progress Timeline (Food delivery only) */}
            {!isCateringOrder && selectedOrder.status !== 'CANCELLED' && (
              <div
                style={{
                  background: 'var(--bg-main)',
                  padding: '20px 22px',
                  borderRadius: 16,
                  marginBottom: 22,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} color="var(--primary)" />
                    <span>Tiến trình đơn hàng trực tiếp:</span>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Bước {Math.min(currentStepNum, 6)}/6: {STATUS_LABELS[selectedOrder.status]?.text}
                  </span>
                </div>

                {/* Progress Bar Container with Connecting Line */}
                <div style={{ position: 'relative', margin: '14px 10px 24px 10px' }}>
                  {/* Background Track Line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 15,
                      left: '4%',
                      right: '4%',
                      height: 4,
                      background: '#E2E8F0',
                      borderRadius: 2,
                      zIndex: 0,
                    }}
                  />
                  {/* Active Fill Line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 15,
                      left: '4%',
                      width: `calc(${progressPercent}% * 0.92)`,
                      height: 4,
                      background: 'linear-gradient(90deg, #00B14F 0%, #10B981 100%)',
                      borderRadius: 2,
                      zIndex: 0,
                      transition: 'width 0.4s ease',
                    }}
                  />

                  {/* Step Nodes */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                    {TIMELINE_MILESTONES.map((m) => {
                      const isPast = currentStepNum > m.stepNum;
                      const isCurrent = currentStepNum === m.stepNum;
                      const isFuture = currentStepNum < m.stepNum;

                      return (
                        <div key={m.status} style={{ textAlign: 'center', width: 72 }}>
                          {/* Node Circle */}
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: isPast
                                ? '#00B14F'
                                : isCurrent
                                ? '#FFFFFF'
                                : '#FFFFFF',
                              border: isPast
                                ? '2px solid #00B14F'
                                : isCurrent
                                ? '3px solid #00B14F'
                                : '2.5px solid #CBD5E1',
                              color: isPast
                                ? '#FFFFFF'
                                : isCurrent
                                ? '#00B14F'
                                : '#94A3B8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto 8px auto',
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              boxShadow: isCurrent
                                ? '0 0 0 5px rgba(0, 177, 79, 0.22), 0 4px 10px rgba(0, 177, 79, 0.25)'
                                : 'none',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            {isPast ? <Check size={16} strokeWidth={3} /> : m.stepNum}
                          </div>

                          {/* Step Label */}
                          <div
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: isCurrent ? 800 : isPast ? 700 : 600,
                              color: isCurrent
                                ? '#00B14F'
                                : isPast
                                ? 'var(--text-main)'
                                : 'var(--text-muted)',
                              lineHeight: 1.25,
                              marginBottom: 3,
                            }}
                          >
                            {m.label}
                          </div>

                          {/* Actor Badge */}
                          <div
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 600,
                              color: isCurrent || isPast ? m.actorColor : '#94A3B8',
                              background: isCurrent || isPast ? '#FFFFFF' : 'transparent',
                              padding: '2px 4px',
                              borderRadius: 4,
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.actorName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Multi-Actor Coordination Box (Food delivery only) */}
            {!isCateringOrder && (
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: 16,
                padding: '18px 20px',
                marginBottom: 22,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="#0284C7" />
                  <span>Điều phối liên tác nhân (Actor Coordination):</span>
                </div>
                {onTrackOrder && (
                  <button
                    type="button"
                    onClick={() => onTrackOrder(selectedOrder.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Navigation size={12} />
                    <span>Xem bản đồ GPS</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {/* 1. Merchant Actor Card */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Store size={15} color="#0284C7" />
                    <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>
                      {selectedOrder.merchant?.name || 'Nhà hàng'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                    <div>
                      • Đơn hàng:{' '}
                      {selectedOrder.status === 'PENDING' ? (
                        <span style={{ color: '#D97706', fontWeight: 700 }}>Chờ tiếp nhận...</span>
                      ) : (
                        <span style={{ color: '#059669', fontWeight: 700 }}>Đã tiếp nhận</span>
                      )}
                    </div>
                    <div>
                      • Khâu bếp:{' '}
                      {['PREPARING', 'READY_FOR_PICKUP', 'DELIVERING', 'COMPLETED'].includes(selectedOrder.status) ? (
                        selectedOrder.status === 'PREPARING' ? (
                          <span style={{ color: '#7C3AED', fontWeight: 700 }}>Đang nấu món 🍳</span>
                        ) : (
                          <span style={{ color: '#059669', fontWeight: 700 }}>Đã nấu xong 🍲</span>
                        )
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Chưa chuyển bếp</span>
                      )}
                    </div>
                    <div>
                      • Bàn giao món:{' '}
                      {selectedOrder.merchantConfirmedPickup ? (
                        <span style={{ color: '#059669', fontWeight: 700 }}>
                          ✓ Đã bàn giao
                          {selectedOrder.merchantConfirmedPickupAt
                            ? ` (${new Date(selectedOrder.merchantConfirmedPickupAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })})`
                            : ''}
                        </span>
                      ) : selectedOrder.status === 'READY_FOR_PICKUP' ? (
                        <span style={{ color: '#D97706', fontWeight: 700 }}>⏳ Đợi Shipper nhận</span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Chưa bàn giao</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Driver Actor Card */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Bike size={15} color="#059669" />
                    <strong style={{ fontSize: '0.84rem', color: '#0F172A' }}>
                      {selectedOrder.assignedDriverName || 'Tài xế giao hàng'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                    <div>
                      • Tiếp nhận:{' '}
                      {selectedOrder.assignedDriverId ? (
                        <span style={{ color: '#059669', fontWeight: 700 }}>
                          ✓ {selectedOrder.assignedDriverName} ({activeDriver.licensePlate})
                        </span>
                      ) : (
                        <span style={{ color: '#D97706', fontWeight: 700 }}>Đang tìm tài xế...</span>
                      )}
                    </div>
                    <div>
                      • Tại nhà hàng:{' '}
                      {selectedOrder.driverArrivedAtStore ? (
                        <span style={{ color: '#059669', fontWeight: 700 }}>
                          ✓ Đã có mặt tại quán
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Chưa đến quán</span>
                      )}
                    </div>
                    <div>
                      • Giao tới bạn:{' '}
                      {selectedOrder.status === 'COMPLETED' ? (
                        <span style={{ color: '#00B14F', fontWeight: 800 }}>✓ Giao thành công 🎉</span>
                      ) : selectedOrder.status === 'DELIVERING' ? (
                        <span style={{ color: '#059669', fontWeight: 700 }}>Đang di chuyển trên đường 🛵</span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Chưa xuất phát</span>
                      )}
                    </div>
                  </div>
                </div>
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

              {isCateringOrder && cateringInfo && cateringInfo.dishes.length > 0 && (
                <div style={{ marginTop: 12, background: 'var(--bg-main)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Thực đơn chi tiết trong mâm ({cateringInfo.dishes.length} món):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cateringInfo.dishes.map((dish, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.75rem',
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: '#FFFFFF',
                          border: '1px solid var(--border)',
                          color: 'var(--text-main)',
                          fontWeight: 600,
                        }}
                      >
                        {idx + 1}. {dish}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cost Breakdown */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 6 }}>
                <span>Tạm tính</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedOrder.subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              {!isCateringOrder && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 6 }}>
                  <span>Phí giao hàng</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedOrder.deliveryFee.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              {selectedOrder.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '0.88rem', fontWeight: 700, marginBottom: 6 }}>
                  <span>{isCateringOrder ? 'Ưu đãi mâm lớn & Voucher' : 'Giảm giá'}</span>
                  <span>-{selectedOrder.discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 8 }}>
                <span>{isCateringOrder ? 'Tổng giá trị đơn tiệc' : 'Tổng tiền'}</span>
                <span style={{ color: 'var(--primary)' }}>{selectedOrder.finalTotal.toLocaleString('vi-VN')}đ</span>
              </div>

              {isCateringOrder && cateringInfo && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 800, color: '#00B14F' }}>
                    <span>Đã đặt cọc qua MoMo ({cateringInfo.depositPercent}%)</span>
                    <span>-{cateringInfo.depositAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    <span>Còn lại thanh toán khi tiệc hoàn tất</span>
                    <span>
                      {selectedOrder.status === 'COMPLETED'
                        ? '0đ (Đã tất toán)'
                        : `${cateringInfo.remainingAmount.toLocaleString('vi-VN')}đ`}
                    </span>
                  </div>
                </div>
              )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
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
                    {isCateringOrder && cateringInfo
                      ? `Đã cọc ${cateringInfo.depositAmount.toLocaleString('vi-VN')}đ qua MoMo`
                      : 'Đã thanh toán'}
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
                        Khi shipper giao đủ món tới tay bạn, vui lòng bấm xác nhận để hoàn tất bàn giao.
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
                        border: 'none',
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

            {/* Multi-Actor Handshake Action Center (Tác vụ tương ứng của từng Actor) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Payment CTA for MoMo */}
              {selectedOrder.status === 'PENDING' && selectedOrder.payment?.paymentMethod?.includes('MOMO') && (
                <button
                  onClick={() => onPayMoMo(selectedOrder)}
                  className="btn-momo"
                  style={{ width: '100%', padding: '12px 18px', borderRadius: 12, fontWeight: 700 }}
                >
                  <Smartphone size={16} />
                  <span>Mở mã quét MoMo thanh toán</span>
                </button>
              )}

              {/* Review CTA when COMPLETED */}
              {selectedOrder.status === 'COMPLETED' && onOpenReviewModal && (
                <button
                  onClick={() => onOpenReviewModal(selectedOrder)}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
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
                  <span>Đánh giá món ăn &amp; Tài xế</span>
                </button>
              )}

              {/* Catering Status & Merchant Final Bill Section */}
              {isCateringOrder && cateringInfo && selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '12px 16px',
                    fontSize: '0.82rem',
                    color: '#475569',
                    lineHeight: 1.5,
                  }}
                >
                  {cateringInfo.merchantApproved
                    ? '✅ Cửa hàng đã tiếp nhận hợp đồng & lên lịch phục vụ. Sau khi bữa tiệc hoàn tất, cửa hàng sẽ xác nhận hoàn thành và xuất Bill tổng về đơn hàng này.'
                    : '⏳ Đã thanh toán cọc qua MoMo. Chờ cửa hàng xác nhận hợp đồng; sau khi phục vụ xong bữa tiệc, cửa hàng sẽ xác nhận hoàn thành & xuất Bill tổng về đơn hàng này.'}
                </div>
              )}

              {isCateringOrder && cateringInfo && selectedOrder.status === 'COMPLETED' && (
                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1.5px solid #A7F3D0',
                    borderRadius: 14,
                    padding: '16px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#065F46' }}>
                      🎉 Cửa hàng đã xác nhận hoàn thành bữa tiệc &amp; xuất Bill tổng
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: 2 }}>
                      Mã Bill: <strong>#{cateringInfo.finalBillCode || `BILL-${cateringInfo.bookingCode.slice(-6)}`}</strong>
                      {cateringInfo.completedAt
                        ? ` • Xuất lúc ${new Date(cateringInfo.completedAt).toLocaleString('vi-VN')}`
                        : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveCateringBill({
                        billCode:
                          cateringInfo.finalBillCode ||
                          `BILL-${cateringInfo.bookingCode.slice(-6)}`,
                        bookingCode: cateringInfo.bookingCode,
                        merchantName: selectedOrder.merchant?.name || 'Nhà hàng DineGo Catering',
                        customerName: selectedOrder.recipientName,
                        customerPhone: selectedOrder.recipientPhone,
                        eventAddress: selectedOrder.deliveryAddress,
                        partyTypeTitle: cateringInfo.partyTypeTitle,
                        packageName: cateringInfo.packageName,
                        tableCount: cateringInfo.tableCount,
                        guestCountPerTable: cateringInfo.guestCountPerTable,
                        eventDate: cateringInfo.eventDate,
                        eventTime: cateringInfo.eventTime,
                        dishes: cateringInfo.dishes,
                        customNote: cateringInfo.customNote,
                        subtotal: selectedOrder.subtotal,
                        discountAmount: selectedOrder.discountAmount,
                        totalAmount: selectedOrder.finalTotal,
                        depositPercent: cateringInfo.depositPercent,
                        depositAmount: cateringInfo.depositAmount,
                        remainingAmount: cateringInfo.remainingAmount,
                        completedAt: cateringInfo.completedAt || new Date().toISOString(),
                        issuedFor: 'CUSTOMER',
                      })
                    }
                    className="btn btn-primary"
                    style={{ padding: '10px 18px', borderRadius: 10, fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <Printer size={16} />
                    <span>Xem &amp; In Bill tổng đơn hàng</span>
                  </button>
                </div>
              )}

              {/* Strict Multi-Actor Acceptance Controls (Food delivery only) */}
              {!isCateringOrder && selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                <div
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    borderRadius: 14,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, marginBottom: 8 }}>
                    🎯 Bấm chấp thuận theo quyền của từng Actor để đẩy tiến trình:
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Stage 1: Merchant Accepts Order */}
                    {selectedOrder.status === 'PENDING' && (
                      <button
                        onClick={() => onUpdateOrderStatus(selectedOrder.id, 'CONFIRMED')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: 10,
                          background: '#0284C7',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Store size={15} />
                        <span>[Nhà hàng] Xác nhận nhận đơn</span>
                      </button>
                    )}

                    {/* Stage 2: Kitchen Starts Cooking */}
                    {selectedOrder.status === 'CONFIRMED' && (
                      <button
                        onClick={() => onUpdateOrderStatus(selectedOrder.id, 'PREPARING')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: 10,
                          background: '#7C3AED',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <ChefHat size={15} />
                        <span>[Nhà hàng] Bếp bắt đầu nấu món</span>
                      </button>
                    )}

                    {/* Stage 3: Kitchen Completes Cooking */}
                    {selectedOrder.status === 'PREPARING' && (
                      <button
                        onClick={() => onUpdateOrderStatus(selectedOrder.id, 'READY_FOR_PICKUP')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: 10,
                          background: '#D97706',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Package size={15} />
                        <span>[Bếp quán] Nấu xong • Đóng gói chờ Shipper</span>
                      </button>
                    )}

                    {/* Stage 4: Ready for Pickup -> Driver & Merchant Handshake */}
                    {selectedOrder.status === 'READY_FOR_PICKUP' && (
                      <>
                        {!selectedOrder.assignedDriverId ? (
                          <button
                            onClick={() => onAcceptDriverOrder?.(selectedOrder.id, activeDriver)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: 10,
                              background: '#0284C7',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                            }}
                          >
                            <Bike size={15} />
                            <span>[Tài xế] Nhận giao đơn này</span>
                          </button>
                        ) : !selectedOrder.driverArrivedAtStore ? (
                          <button
                            onClick={() => onMarkDriverArrivedAtStore?.(selectedOrder.id)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: 10,
                              background: '#0891B2',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                            }}
                          >
                            <MapPin size={15} />
                            <span>[Tài xế] Báo đã đến nhà hàng</span>
                          </button>
                        ) : !selectedOrder.merchantConfirmedPickup ? (
                          <button
                            onClick={() => onConfirmMerchantPickup?.(selectedOrder.id)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: 10,
                              background: '#00B14F',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              boxShadow: '0 4px 12px rgba(0, 177, 79, 0.25)',
                            }}
                          >
                            <CheckCircle2 size={15} />
                            <span>[Nhà hàng] Xác nhận bàn giao món cho Shipper</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateOrderStatus(selectedOrder.id, 'DELIVERING')}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: 10,
                              background: '#059669',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                            }}
                          >
                            <Navigation size={15} />
                            <span>[Tài xế] Đã nhận đủ món &amp; Xuất phát đi giao</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Stage 5: Delivering -> Complete */}
                    {selectedOrder.status === 'DELIVERING' && (
                      <button
                        onClick={() => onUpdateOrderStatus(selectedOrder.id, 'COMPLETED')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: 10,
                          background: '#00B14F',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>[Tài xế] Xác nhận đã giao món thành công</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </div>

      <CateringFinalBillModal
        bill={activeCateringBill}
        onClose={() => setActiveCateringBill(null)}
      />
    </div>
  );
};
