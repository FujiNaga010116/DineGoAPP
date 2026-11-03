// ==============================================================================
// DineGo Frontend — Admin & Merchant Dashboard Page (Sprint 5 — U043 to U051)
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
} from 'lucide-react';
import type { Role, User } from '../types';

interface DashboardPageProps {
  currentUser: User;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser }) => {
  // Role view toggle (Default to Admin if role is ADMIN, else MERCHANT)
  const isDefaultAdmin = currentUser.roles.includes('ADMIN');
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
    <div className="container" style={{ padding: '32px 16px', maxWidth: 1100 }}>
      {/* Title & View Switcher */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, gap: 16 }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 20,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            <BarChart3 size={16} /> Bảng Điều Khiển Quản Lý & Báo Cáo (Sprint 5 — U043 đến U051)
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Trung Tâm Quản Trị & Thống Kê Doanh Thu</h1>
        </div>

        {/* View Switcher buttons */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--bg-surface)', padding: 6, borderRadius: 14, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('merchant')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              background: viewMode === 'merchant' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'merchant' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <Store size={16} /> Dành Cho Nhà Hàng (Merchant)
          </button>
          <button
            onClick={() => setViewMode('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              background: viewMode === 'admin' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'admin' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <ShieldCheck size={16} /> Quản Trị Viên (Admin Sàn)
          </button>
        </div>
      </div>

      {/* VIEW: MERCHANT DASHBOARD (U043, U048) */}
      {viewMode === 'merchant' && (
        <div>
          {/* Revenue KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Doanh thu gộp (Tháng 11)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                {merchantRevenue.totalRevenue.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>↑ 18.5% so với tháng trước</div>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Phí hoa hồng sàn DineGo (15%)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>
                -{merchantRevenue.platformCommission.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>Khấu trừ tự động theo BR-42</div>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: '#10B981', marginBottom: 4, fontWeight: 700 }}>Thực nhận về tài khoản (Net Payout)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>
                {merchantRevenue.netPayout.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>Đã quyết toán chuyển khoản MoMo</div>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Đơn hoàn tất / Tỷ lệ hủy</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                {merchantRevenue.completedOrders} đơn
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>Chỉ có {merchantRevenue.cancelledOrders} đơn hủy (3%)</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Top Selling Dishes */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        #{i + 1} {dish.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Đã bán: <strong>{dish.quantity} phần</strong>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {dish.totalSales.toLocaleString()} đ
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Merchant Reply to Customer Reviews (U048) */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} color="var(--primary)" /> Phản Hồi Đánh Giá Khách Hàng (U048)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.customerName}</span>
                      <span style={{ color: '#F59E0B', fontSize: '0.8rem' }}>{'⭐'.repeat(r.rating)}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: 8 }}>"{r.comment}"</div>

                    {r.reply ? (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: '0.8rem' }}>
                        <strong>Phản hồi của quán:</strong> {r.reply}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <input
                          type="text"
                          placeholder="Nhập câu trả lời cho khách..."
                          value={replyInput[r.id] || ''}
                          onChange={(e) => setReplyInput({ ...replyInput, [r.id]: e.target.value })}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: '#fff',
                            fontSize: '0.8rem',
                          }}
                        />
                        <button
                          onClick={() => handleSendReply(r.id)}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Trả lời
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

      {/* VIEW: ADMIN DASHBOARD (U044, U045, U046, U051) */}
      {viewMode === 'admin' && (
        <div>
          {/* Admin System KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Tổng GMV Toàn Sàn (Tháng 11)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
                {adminSystem.totalGmv.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>Từ đồ ăn hằng ngày & mâm cỗ sự kiện</div>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: '#A78BFA', marginBottom: 4, fontWeight: 700 }}>Doanh thu hoa hồng sàn (15%)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#A78BFA' }}>
                {adminSystem.platformRevenue.toLocaleString()} đ
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>Lợi nhuận ròng nền tảng DineGo</div>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Tổng số đơn hàng</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                {adminSystem.totalOrders} đơn
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: 4 }}>100% thanh toán qua MoMo & COD</div>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Đối tác Quán & Tài xế</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                {adminSystem.totalMerchants} quán • {adminSystem.activeDrivers} xế
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{adminSystem.totalUsers} khách hàng hoạt động</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Monthly Reconciliation Table (U046) */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={18} color="var(--primary)" /> Đối Soát Doanh Thu Quán Tháng 11 (BR-42)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 6px' }}>Nhà hàng</th>
                    <th style={{ padding: '8px 6px' }}>Doanh số gộp</th>
                    <th style={{ padding: '8px 6px' }}>Hoa hồng (15%)</th>
                    <th style={{ padding: '8px 6px' }}>Chi trả Net</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 600 }}>Cơm Tấm Sài Gòn 1985</td>
                    <td style={{ padding: '10px 6px' }}>28.500.000 đ</td>
                    <td style={{ padding: '10px 6px', color: 'var(--danger)' }}>-4.275.000 đ</td>
                    <td style={{ padding: '10px 6px', color: '#10B981', fontWeight: 700 }}>24.225.000 đ</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 600 }}>Phở Thìn Lò Đúc 1979</td>
                    <td style={{ padding: '10px 6px' }}>34.200.000 đ</td>
                    <td style={{ padding: '10px 6px', color: 'var(--danger)' }}>-5.130.000 đ</td>
                    <td style={{ padding: '10px 6px', color: '#10B981', fontWeight: 700 }}>29.070.000 đ</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 6px', fontWeight: 600 }}>Trà Sữa Gong Cha</td>
                    <td style={{ padding: '10px 6px' }}>19.800.000 đ</td>
                    <td style={{ padding: '10px 6px', color: 'var(--danger)' }}>-2.970.000 đ</td>
                    <td style={{ padding: '10px 6px', color: '#10B981', fontWeight: 700 }}>16.830.000 đ</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Complaints Resolution (U051) */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="var(--danger)" /> Xử Lý Khiếu Nại & Hoàn Tiền MoMo (U051)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {complaints.map((c) => (
                  <div key={c.id} style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{c.code}</span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.customerName} • {c.merchantName}</div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontWeight: 700,
                          background: c.status === 'REFUNDED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: c.status === 'REFUNDED' ? '#10B981' : '#EF4444',
                        }}
                      >
                        {c.status === 'REFUNDED' ? 'Đã hoàn tiền' : 'Đang chờ xử lý'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', margin: '6px 0', color: 'var(--text-main)' }}>
                      Lý do: <strong>{c.issueType}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Đề xuất bồi thường: <strong style={{ color: '#10B981' }}>{c.compensationAmount.toLocaleString()} đ</strong>
                      </span>
                      {c.status === 'OPEN' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleResolveComplaint(c.id, 'REFUND')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: '#10B981',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            Duyệt hoàn MoMo
                          </button>
                          <button
                            onClick={() => handleResolveComplaint(c.id, 'REJECT')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#EF4444',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

