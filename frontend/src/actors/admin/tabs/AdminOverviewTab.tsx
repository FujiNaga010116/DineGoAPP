import React from 'react';
import type { Order, Merchant, User } from '../../../types';

export interface AdminOverviewTabProps {
  adminSystem: {
    totalGmv: number;
    platformRevenue: number;
    platformGrossFee: number;
    platformOutflow: number;
    totalOrders: number;
    completedOrders: number;
  };
  platformCommissionRate: number;
  validOrders: Order[];
  orders: Order[];
  approvedFeasts: any[];
  feastBookings: any[];
  allMerchants: Merchant[];
  driversList: Array<{ id: string; status?: string }>;
  allUsersList: User[];
  foodDeliveryGmv: number;
  cateringFeastGmv: number;
  totalGmvReal: number;
  sevenDayGmvChart: Array<{ dateKey: string; label: string; gmv: number; pct: number }>;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  adminSystem,
  platformCommissionRate,
  validOrders,
  orders,
  approvedFeasts,
  feastBookings,
  allMerchants,
  driversList,
  allUsersList,
  foodDeliveryGmv,
  cateringFeastGmv,
  totalGmvReal,
  sevenDayGmvChart,
}) => {
  const totalBoth = Math.max(foodDeliveryGmv + cateringFeastGmv, 1);
  const foodPct = totalGmvReal > 0 ? Math.round((foodDeliveryGmv / totalBoth) * 1000) / 10 : 0;
  const feastPct = totalGmvReal > 0 ? Math.round((cateringFeastGmv / totalBoth) * 1000) / 10 : 0;

  const activeDriversCount = driversList.filter((d) => d.status === 'ACTIVE').length;
  const nonAdminUsersCount = allUsersList.filter((u) => !u.roles.includes('ADMIN')).length;

  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const inProgressCount = Math.max(0, orders.length - completedCount - cancelledCount);
  const orderTotalSafe = Math.max(orders.length, 1);

  const completedPct = orders.length > 0 ? Math.round((completedCount / orderTotalSafe) * 100) : 0;
  const inProgressPct = orders.length > 0 ? Math.round((inProgressCount / orderTotalSafe) * 100) : 0;
  const cancelledPct = orders.length > 0 ? Math.round((cancelledCount / orderTotalSafe) * 100) : 0;

  const totalUnitCount = validOrders.length + approvedFeasts.length;
  const avgOrderValue = totalUnitCount > 0 ? Math.round(adminSystem.totalGmv / totalUnitCount) : 0;
  const maxDayGmv = Math.max(...sevenDayGmvChart.map((b) => b.gmv), 1);

  const border = '1px solid #E5E7EB';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontVariantNumeric: 'tabular-nums' }}>
      {/* 1. Bright Crisp 4-Column KPI Strip with Subtle Teal Focal Accent */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          background: '#FFFFFF',
          border,
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ padding: '20px 22px', borderRight: border, borderTop: '3px solid #0D9488' }}>
          <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
            Tổng giao dịch (GMV)
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>
            {adminSystem.totalGmv.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 8 }}>
            {validOrders.length} đơn món · {approvedFeasts.length} hợp đồng tiệc
          </div>
        </div>

        <div style={{ padding: '20px 22px', borderRight: border, borderTop: '3px solid transparent' }}>
          <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
            Doanh thu ròng sàn ({platformCommissionRate}%)
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0D9488', letterSpacing: '-0.025em' }}>
            {adminSystem.platformRevenue.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 8 }}>
            Thu gộp {adminSystem.platformGrossFee.toLocaleString('vi-VN')}đ · Trợ giá{' '}
            {adminSystem.platformOutflow.toLocaleString('vi-VN')}đ
          </div>
        </div>

        <div style={{ padding: '20px 22px', borderRight: border, borderTop: '3px solid transparent' }}>
          <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
            Khối lượng đơn hàng
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>
            {adminSystem.totalOrders}
            <span style={{ fontSize: '0.86rem', fontWeight: 500, color: '#64748B', marginLeft: 6 }}>
              đơn · {feastBookings.length} tiệc
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: 8 }}>
            Hoàn tất {adminSystem.completedOrders} đơn ({completedPct}%) · {approvedFeasts.length} tiệc duyệt
          </div>
        </div>

        <div style={{ padding: '20px 22px', borderTop: '3px solid transparent' }}>
          <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
            Đối tác &amp; Tài khoản
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>
            {allMerchants.length} quán
            <span style={{ fontSize: '0.86rem', fontWeight: 500, color: '#64748B', marginLeft: 6 }}>
              · {driversList.length} tài xế
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 8 }}>
            {activeDriversCount} tài xế hoạt động · {nonAdminUsersCount} người dùng
          </div>
        </div>
      </div>

      {/* 2. Analytical Split: 7-Day GMV Columns (Left) + Order Efficiency Table (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 18,
          alignItems: 'stretch',
        }}
      >
        {/* Left: Bright Crisp 7-Day GMV Chart */}
        <div
          style={{
            background: '#FFFFFF',
            border,
            borderRadius: 10,
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 20,
            minWidth: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Doanh thu GMV 7 ngày gần nhất
                </h3>
                <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '3px 0 0 0' }}>
                  Tính trên đơn đồ ăn hợp lệ và hợp đồng đặt tiệc đã duyệt
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.71rem',
                  fontWeight: 700,
                  color: '#0F766E',
                  background: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  padding: '3px 9px',
                  borderRadius: 6,
                }}
              >
                VNĐ
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 12,
                height: 170,
                paddingTop: 22,
                paddingBottom: 10,
                borderBottom: border,
                backgroundImage: 'linear-gradient(to top, rgba(226, 232, 240, 0.55) 1px, transparent 1px)',
                backgroundSize: '100% 42px',
              }}
            >
              {sevenDayGmvChart.map((b) => {
                const isPeak = b.gmv > 0 && b.gmv === maxDayGmv;
                const barHeight = b.gmv > 0 ? Math.max(12, Math.round((b.gmv / maxDayGmv) * 124)) : 3;
                return (
                  <div
                    key={b.dateKey}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: isPeak ? '#0F766E' : b.gmv > 0 ? '#0F172A' : '#94A3B8',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {b.gmv >= 1000000
                        ? `${(b.gmv / 1000000).toFixed(1)}M`
                        : b.gmv > 0
                        ? `${Math.round(b.gmv / 1000)}k`
                        : '0'}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 34,
                        height: `${barHeight}px`,
                        background: b.gmv > 0 ? (isPeak ? '#0D9488' : '#5EEAD4') : '#E2E8F0',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              {sevenDayGmvChart.map((b) => (
                <div
                  key={`${b.dateKey}-lbl`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.71rem',
                    color: b.gmv > 0 ? '#334155' : '#94A3B8',
                    fontWeight: b.gmv > 0 ? 600 : 400,
                  }}
                >
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Clean 2-Column Numeric Channel Split */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              borderTop: border,
              paddingTop: 14,
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: '0.73rem', color: '#64748B', marginBottom: 3 }}>
                Đặt món giao ngay ({foodPct}%)
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                {foodDeliveryGmv.toLocaleString('vi-VN')}đ
              </div>
            </div>
            <div style={{ borderLeft: border, paddingLeft: 16 }}>
              <div style={{ fontSize: '0.73rem', color: '#64748B', marginBottom: 3 }}>
                Đặt mâm cỗ sự kiện ({feastPct}%)
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0D9488' }}>
                {cateringFeastGmv.toLocaleString('vi-VN')}đ
              </div>
            </div>
          </div>
        </div>

        {/* Right: Clean Structured Operational Breakdown */}
        <div
          style={{
            background: '#FFFFFF',
            border,
            borderRadius: 10,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div>
            <div style={{ padding: '20px 24px 16px', borderBottom: border }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Hiệu suất xử lý đơn hàng
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '3px 0 0 0' }}>
                Chỉ số chất lượng giao nhận toàn sàn
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: border }}>
              <div style={{ padding: '16px 24px', borderRight: border }}>
                <div style={{ fontSize: '0.73rem', color: '#64748B', marginBottom: 4 }}>Giá trị đơn TB (AOV)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>
                  {avgOrderValue.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div style={{ padding: '16px 24px', background: '#F0FDFA' }}>
                <div style={{ fontSize: '0.73rem', color: '#0F766E', fontWeight: 600, marginBottom: 4 }}>
                  Tỷ lệ hoàn tất
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0D9488' }}>{completedPct}%</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: border, background: '#F8FAFC', color: '#64748B', fontSize: '0.72rem', textAlign: 'left' }}>
                  <th style={{ padding: '10px 24px', fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Số đơn</th>
                  <th style={{ padding: '10px 24px', fontWeight: 600, textAlign: 'right' }}>Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Đã hoàn tất', count: completedCount, pct: completedPct, accent: '#0D9488' },
                  { label: 'Đang xử lý / Giao hàng', count: inProgressCount, pct: inProgressPct, accent: '#D97706' },
                  { label: 'Đã hủy', count: cancelledCount, pct: cancelledPct, accent: '#DC2626' },
                ].map((row, idx) => (
                  <tr key={row.label} style={{ borderBottom: idx < 2 ? '1px solid #F1F5F9' : 'none' }}>
                    <td style={{ padding: '13px 24px', color: '#0F172A', fontWeight: 500 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 3,
                          height: 12,
                          background: row.accent,
                          marginRight: 10,
                          verticalAlign: 'middle',
                        }}
                      />
                      {row.label}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>
                      {row.count}
                    </td>
                    <td style={{ padding: '13px 24px', textAlign: 'right', fontWeight: 700, color: row.accent }}>
                      {row.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: '13px 24px',
              borderTop: border,
              background: '#F8FAFC',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.79rem',
            }}
          >
            <span style={{ color: '#475569', fontWeight: 500 }}>Hợp đồng đặt tiệc đã duyệt</span>
            <strong style={{ color: '#0F172A' }}>
              {approvedFeasts.length} / {feastBookings.length} hợp đồng
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
