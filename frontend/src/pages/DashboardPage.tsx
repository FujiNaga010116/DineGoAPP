// ==============================================================================
// DineGo Frontend — Admin & Merchant Dashboard Page (GrabFood Management Style)
// Merchant Revenue, Platform Analytics, Complaints Moderation & Customer Feedback
// ==============================================================================

import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Store,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  LogIn,
  ArrowRight,
  Star,
  Clock,
  Sparkles,
  ChefHat,
  Bike,
  PackageCheck,
  UtensilsCrossed,
  MapPin,
  Phone,
} from 'lucide-react';
import type { Role, User, Order, OrderStatus } from '../types';

interface DashboardPageProps {
  currentUser: User | null;
  onOpenAuthModal?: () => void;
  orders?: Order[];
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onSwitchToDriver?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  onOpenAuthModal,
  orders = [],
  onUpdateOrderStatus,
  onSwitchToDriver,
}) => {
  const isDefaultAdmin = currentUser?.roles?.includes('ADMIN') ?? false;
  const [viewMode, setViewMode] = useState<'merchant' | 'admin'>(isDefaultAdmin ? 'admin' : 'merchant');

  // Merchant Revenue State (U043)
  const [merchantRevenue] = useState({
    merchantName: 'Cơm Tấm Sài Gòn 1985',
    totalRevenue: 28500000,
    platformCommission: 4275000, // 15% hoa hồng sàn
    netPayout: 24225000, // 85% thực nhận
    completedOrders: 184,
    cancelledOrders: 6,
    averageOrderValue: 154800,
    topDishes: [
      { name: 'Cơm Tấm Sườn Cọng Nướng Than', quantity: 94, totalSales: 6110000 },
      { name: 'Cơm Tấm Ba Rọi Nướng Mật Ong', quantity: 52, totalSales: 3120000 },
      { name: 'Chả Trứng Hấp Đặc Biệt', quantity: 48, totalSales: 960000 },
      { name: 'Trứng Ốp La Lòng Đào', quantity: 110, totalSales: 1100000 },
    ],
  });

  // Admin System State (U044)
  const [adminSystem] = useState({
    totalGmv: 185600000,
    platformRevenue: 27840000, // 15% GMV
    totalOrders: 1420,
    totalMerchants: 24,
    activeDrivers: 48,
    totalUsers: 890,
  });

  // Complaints state (U051)
  const [complaints, setComplaints] = useState([
    {
      id: 'cmp-01',
      code: 'DG-CMP-298101',
      orderNumber: 'DG20261103-TRK88',
      customerName: 'Nguyễn Văn An',
      merchantName: 'Cơm Tấm Sài Gòn 1985',
      issueType: 'Giao thiếu 1 phần canh chua',
      compensationAmount: 35000,
      status: 'OPEN',
      createdAt: '11:30 Hôm nay',
    },
    {
      id: 'cmp-02',
      code: 'DG-CMP-298099',
      orderNumber: 'DG20261102-4D25CA',
      customerName: 'Lê Hoàng Cường',
      merchantName: 'Phở Thìn Lò Đúc',
      issueType: 'Nước dùng bị đổ do shipper phanh gấp',
      compensationAmount: 75000,
      status: 'REFUNDED',
      createdAt: 'Hôm qua',
    },
  ]);

  const handleResolveComplaint = (id: string, action: 'REFUND' | 'REJECT') => {
    setComplaints(
      complaints.map((c) =>
        c.id === id ? { ...c, status: action === 'REFUND' ? 'REFUNDED' : 'REJECTED' } : c,
      ),
    );
  };

  // Merchant Reviews & Replies state (U047 & U048)
  const [reviews, setReviews] = useState([
    {
      id: 'rev-01',
      customerName: 'Trần Thị Bình',
      rating: 5,
      comment: 'Cơm sườn ngon xuất sắc, miếng sườn to ướp rất vừa miệng. Giao hàng nóng hổi!',
      reply: 'Dạ Cơm Tấm 1985 chân thành cảm ơn quý khách! Quán rất vui được phục vụ bạn ạ.',
      date: 'Hôm nay',
    },
    {
      id: 'rev-02',
      customerName: 'Phạm Minh Tuấn',
      rating: 4,
      comment: 'Đồ ăn ngon nhưng nhớ kèm thêm nhiều ớt cay hơn trong đơn sau nhé quán.',
      reply: null as string | null,
      date: 'Hôm qua',
    },
  ]);

  const [replyInput, setReplyInput] = useState<{ [key: string]: string }>({});

  const handleSendReply = (reviewId: string) => {
    const text = replyInput[reviewId];
    if (!text?.trim()) return;

    setReviews(
      reviews.map((r) => (r.id === reviewId ? { ...r, reply: text.trim() } : r)),
    );
    setReplyInput({ ...replyInput, [reviewId]: '' });
  };

  return (
    <div className="container" style={{ padding: '28px 16px', maxWidth: 1160 }}>
      {/* If Not Logged In as Admin/Merchant Banner */}
      {!currentUser && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid var(--border)',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>
                Chế độ xem trước dành cho Khách (Guest)
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Bạn đang xem dữ liệu mô phỏng. Đăng nhập với tài khoản <strong>Admin Sàn</strong> hoặc <strong>Chủ Quán</strong> để thực hiện tác vụ chính thức.
              </div>
            </div>
          </div>
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="btn btn-primary"
              style={{
                padding: '9px 18px',
                borderRadius: 12,
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <LogIn size={16} />
              <span>Đăng nhập phân quyền</span>
            </button>
          )}
        </div>
      )}

      {/* Title & View Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(0, 177, 79, 0.1)',
              color: 'var(--primary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            <BarChart3 size={15} /> Trung tâm quản trị & Thống kê kinh doanh
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {viewMode === 'merchant' ? 'Báo Cáo Doanh Thu Gian Hàng' : 'Trung Tâm Điều Hành Toàn Sàn'}
          </h1>
        </div>

        {/* View Switcher pills */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            background: '#FFFFFF',
            padding: 4,
            borderRadius: 14,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <button
            onClick={() => setViewMode('merchant')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 10,
              background: viewMode === 'merchant' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'merchant' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Store size={16} /> Dành Cho Nhà Hàng
          </button>
          <button
            onClick={() => setViewMode('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 10,
              background: viewMode === 'admin' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'admin' ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck size={16} /> Quản Trị Viên Sàn
          </button>
        </div>
      </div>

      {/* VIEW: MERCHANT DASHBOARD */}
      {viewMode === 'merchant' && (
        <div>
          {/* Live Kitchen & Order Reception Console */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border)',
              borderRadius: 20,
              padding: '24px',
              marginBottom: 28,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 20,
                borderBottom: '1px solid var(--border)',
                paddingBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChefHat size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Khu Vực Bếp & Nhận Đơn Trực Tiếp (Kitchen Live Console)
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                    Đơn hàng mới nhận từ khách hàng cần nhà hàng chế biến và đóng gói
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: 'rgba(0, 177, 79, 0.1)',
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'inline-block',
                  }}
                />
                Đang trực tuyến • Sẵn sàng nhận đơn
              </div>
            </div>

            {orders.filter((o) => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status)).length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  background: 'var(--bg-main)',
                  borderRadius: 16,
                  border: '1px dashed var(--border)',
                }}
              >
                <UtensilsCrossed size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: 4 }}>
                  Chưa có đơn hàng nào đang chờ nấu trong bếp
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Khi khách hàng đặt món trên ứng dụng DineGo, chuông báo và thông tin đơn sẽ xuất hiện tại đây ngay lập tức.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {orders
                  .filter((o) => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status))
                  .map((order) => {
                    const foodNetPayout = Math.round(order.subtotal * 0.85);
                    const commissionFee = Math.round(order.subtotal * 0.15);

                    return (
                      <div
                        key={order.id}
                        style={{
                          border: '1.5px solid var(--border)',
                          borderRadius: 16,
                          padding: '18px 20px',
                          background: order.status === 'PREPARING' ? 'rgba(124, 58, 237, 0.03)' : '#FFFFFF',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        {/* Order Header */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10,
                            marginBottom: 14,
                            borderBottom: '1px solid var(--border)',
                            paddingBottom: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                              #{order.orderNumber}
                            </span>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                padding: '3px 10px',
                                borderRadius: 8,
                                fontWeight: 800,
                                background:
                                  order.status === 'PREPARING'
                                    ? '#EDE9FE'
                                    : order.status === 'READY_FOR_PICKUP'
                                    ? '#D1FAE5'
                                    : '#FEF3C7',
                                color:
                                  order.status === 'PREPARING'
                                    ? '#7C3AED'
                                    : order.status === 'READY_FOR_PICKUP'
                                    ? '#059669'
                                    : '#D97706',
                              }}
                            >
                              {order.status === 'PENDING' || order.status === 'CONFIRMED'
                                ? '🔔 Đơn Mới Đến • Chờ Làm'
                                : order.status === 'PREPARING'
                                ? '👨‍🍳 Bếp Đang Nấu'
                                : '📦 Chờ Shipper Lấy Món'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                            {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Customer & Address Details */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: 12,
                            marginBottom: 14,
                            background: 'var(--bg-main)',
                            padding: '12px 14px',
                            borderRadius: 12,
                          }}
                        >
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong style={{ color: 'var(--text-main)' }}>Khách nhận:</strong> {order.recipientName}{' '}
                            <span style={{ color: 'var(--text-muted)' }}>({order.recipientPhone})</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <MapPin size={14} style={{ display: 'inline', marginRight: 4, color: 'var(--primary)' }} />
                            {order.deliveryAddress}
                          </div>
                        </div>

                        {/* Items List */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                            DANH SÁCH MÓN CẦN NẤU:
                          </div>
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 0',
                                borderBottom: idx < order.items.length - 1 ? '1px dashed var(--border)' : 'none',
                                fontSize: '0.9rem',
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 800, color: 'var(--primary)', marginRight: 8 }}>
                                  {item.quantity}x
                                </span>
                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.itemName}</span>
                                {item.toppings && item.toppings.length > 0 && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 24 }}>
                                    + {item.toppings.map((t) => t.toppingName).join(', ')}
                                  </div>
                                )}
                              </div>
                              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                {item.subtotal.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Financial Settlement Breakdown for Merchant */}
                        <div
                          style={{
                            background: 'rgba(0, 177, 79, 0.05)',
                            border: '1px solid rgba(0, 177, 79, 0.2)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            marginBottom: 16,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12,
                          }}
                        >
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Giá món: <strong style={{ color: 'var(--text-main)' }}>{order.subtotal.toLocaleString('vi-VN')}đ</strong> • 
                            Phí sàn (15% BR-42): <strong style={{ color: '#EF4444' }}>-{commissionFee.toLocaleString('vi-VN')}đ</strong>
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                            Ví quán thực nhận (85%): +{foodNetPayout.toLocaleString('vi-VN')}đ
                          </div>
                        </div>

                        {/* Merchant Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                            <button
                              onClick={() => onUpdateOrderStatus?.(order.id, 'PREPARING')}
                              className="btn btn-primary"
                              style={{
                                padding: '10px 20px',
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                borderRadius: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <ChefHat size={18} />
                              <span>Nhận Đơn & Bắt Tay Vào Nấu (PREPARING)</span>
                            </button>
                          )}

                          {order.status === 'PREPARING' && (
                            <button
                              onClick={() => onUpdateOrderStatus?.(order.id, 'READY_FOR_PICKUP')}
                              style={{
                                background: '#7C3AED',
                                color: '#FFFFFF',
                                padding: '10px 20px',
                                fontSize: '0.9rem',
                                fontWeight: 800,
                                borderRadius: 12,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                              }}
                            >
                              <PackageCheck size={18} />
                              <span>Món Đã Xong • Bàn Giao Shipper (READY FOR PICKUP)</span>
                            </button>
                          )}

                          {order.status === 'READY_FOR_PICKUP' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: '0.85rem', color: '#0284C7', fontWeight: 700 }}>
                                🛵 Đang phát tín hiệu tìm Shipper gần nhất (bán kính 2km)...
                              </span>
                              {onSwitchToDriver && (
                                <button
                                  onClick={onSwitchToDriver}
                                  style={{
                                    background: '#0284C7',
                                    color: '#FFFFFF',
                                    padding: '8px 16px',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    borderRadius: 10,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <Bike size={16} /> Chuyển sang màn hình Tài Xế
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Revenue KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                Doanh thu gộp (Tháng 11)
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {merchantRevenue.totalRevenue.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, fontWeight: 700 }}>
                ↑ 18.5% so với tháng trước
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                Phí hoa hồng sàn DineGo (15%)
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#EF4444' }}>
                -{merchantRevenue.platformCommission.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Khấu trừ tự động quy chuẩn BR-42
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid var(--primary)',
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: '0 4px 16px rgba(0, 177, 79, 0.12)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 4 }}>
                Thực nhận về tài khoản (Net Payout)
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)' }}>
                {merchantRevenue.netPayout.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>
                ✓ Đã thanh quyết toán qua MoMo
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                Đơn hoàn tất / Tỷ lệ giao đạt
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {merchantRevenue.completedOrders} đơn
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Chỉ có {merchantRevenue.cancelledOrders} đơn hủy (3%)
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Top Selling Dishes */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 18,
                padding: 24,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="var(--primary)" /> Top Món Bán Chạy Nhất (Tháng 11)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {merchantRevenue.topDishes.map((dish, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        #{i + 1} {dish.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Đã bán: <strong>{dish.quantity} phần</strong>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {dish.totalSales.toLocaleString()} đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Reviews & Reply Section */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 18,
                padding: 24,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="#D97706" /> Đánh Giá & Phản Hồi Khách Hàng
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{rev.customerName}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#D97706', fontSize: '0.82rem', fontWeight: 700 }}>
                        <Star size={14} fill="#F59E0B" color="#F59E0B" /> {rev.rating}/5
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '4px 0 8px 0', lineHeight: 1.45 }}>
                      "{rev.comment}"
                    </p>

                    {rev.reply ? (
                      <div
                        style={{
                          background: '#FFFFFF',
                          borderLeft: '3px solid var(--primary)',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <strong style={{ color: 'var(--primary)' }}>Phản hồi của quán:</strong> {rev.reply}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Nhập lời cảm ơn hoặc giải đáp..."
                          value={replyInput[rev.id] || ''}
                          onChange={(e) => setReplyInput({ ...replyInput, [rev.id]: e.target.value })}
                          style={{
                            flex: 1,
                            padding: '7px 12px',
                            borderRadius: 10,
                            background: '#FFFFFF',
                            border: '1px solid var(--border)',
                            fontSize: '0.82rem',
                            color: 'var(--text-main)',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => handleSendReply(rev.id)}
                          className="btn btn-primary"
                          style={{ padding: '7px 14px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700 }}
                        >
                          Gửi
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ADMIN PLATFORM DASHBOARD */}
      {viewMode === 'admin' && (
        <div>
          {/* Admin KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Tổng Giá Trị Giao Dịch (GMV)</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {adminSystem.totalGmv.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, fontWeight: 700 }}>Toàn hệ thống 24 nhà hàng</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid var(--primary)', borderRadius: 16, padding: '20px 22px', boxShadow: '0 4px 16px rgba(0, 177, 79, 0.12)' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 4 }}>Doanh Thu Phí Sàn (Take Rate 15%)</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)' }}>
                {adminSystem.platformRevenue.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>Dòng tiền thuần của sàn DineGo</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Tổng Đơn Hàng Thành Công</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {adminSystem.totalOrders} đơn
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>48 tài xế đối tác trực tuyến</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Người Dùng Đăng Ký</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {adminSystem.totalUsers} tài khoản
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, fontWeight: 700 }}>Tăng trưởng +24% tháng này</div>
            </div>
          </div>

          {/* Complaints & Disputes Moderation Table */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Xử Lý Khiếu Nại & Tranh Chấp Đơn Hàng (U051)
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Hội đồng phân xử sàn DineGo: bảo vệ quyền lợi thực khách và đối tác nhà hàng
                </span>
              </div>
              <span
                style={{
                  background: '#FEF3C7',
                  color: '#D97706',
                  padding: '4px 12px',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                {complaints.filter((c) => c.status === 'OPEN').length} yêu cầu đang chờ duyệt
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {complaints.map((cmp) => (
                <div
                  key={cmp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: 14,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {cmp.code}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>#{cmp.orderNumber}</span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: cmp.status === 'OPEN' ? '#FEF3C7' : cmp.status === 'REFUNDED' ? '#D1FAE5' : '#FEE2E2',
                          color: cmp.status === 'OPEN' ? '#D97706' : cmp.status === 'REFUNDED' ? '#059669' : '#DC2626',
                        }}
                      >
                        {cmp.status === 'OPEN' ? 'Đang chờ xử lý' : cmp.status === 'REFUNDED' ? 'Đã hoàn tiền MoMo' : 'Đã bác bỏ'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: 2 }}>
                      Khách: <strong>{cmp.customerName}</strong> • Quán: <strong>{cmp.merchantName}</strong>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Lý do: <em>{cmp.issueType}</em> • Yêu cầu bồi thường:{' '}
                      <strong style={{ color: '#EF4444' }}>{cmp.compensationAmount.toLocaleString()} đ</strong>
                    </div>
                  </div>

                  {cmp.status === 'OPEN' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleResolveComplaint(cmp.id, 'REFUND')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 10,
                          background: 'var(--primary)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <CheckCircle2 size={15} /> Hoàn tiền MoMo
                      </button>
                      <button
                        onClick={() => handleResolveComplaint(cmp.id, 'REJECT')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 10,
                          background: '#FFFFFF',
                          border: '1px solid var(--border)',
                          color: '#DC2626',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <XCircle size={15} /> Bác bỏ
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Đã giải quyết xong
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
