import React from 'react';
import { adminApi } from '../../../api/client';

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  targetName: string;
  reason: string;
  performedBy: string;
}

export interface AdminSettingsTabProps {
  adminSettingsSubTab: 'SYSTEM_CONFIG' | 'AUDIT_LOGS';
  setAdminSettingsSubTab: (tab: 'SYSTEM_CONFIG' | 'AUDIT_LOGS') => void;
  platformCommissionRate: number;
  setPlatformCommissionRate: (val: number) => void;
  peakHourSurgeFee: number;
  setPeakHourSurgeFee: (val: number) => void;
  minOrderForFreeShipping: number;
  setMinOrderForFreeShipping: (val: number) => void;
  autoDispatchRangeKm: number;
  setAutoDispatchRangeKm: (val: number) => void;
  maintenanceMode: boolean;
  setMaintenanceMode: (val: boolean) => void;
  adminAuditLogs: AdminAuditLogEntry[];
  adminAuditSearch: string;
  setAdminAuditSearch: (val: string) => void;
  appendAuditLog: (action: string, targetName: string, reason: string) => void;
  setConfigSavedBanner: (msg: string) => void;
  triggerAdminToast: (msg: string) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  adminSettingsSubTab,
  setAdminSettingsSubTab,
  platformCommissionRate,
  setPlatformCommissionRate,
  peakHourSurgeFee,
  setPeakHourSurgeFee,
  minOrderForFreeShipping,
  setMinOrderForFreeShipping,
  autoDispatchRangeKm,
  setAutoDispatchRangeKm,
  maintenanceMode,
  setMaintenanceMode,
  adminAuditLogs,
  adminAuditSearch,
  setAdminAuditSearch,
  appendAuditLog,
  setConfigSavedBanner,
  triggerAdminToast,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Unified Minimalist Control Bar for Settings & Audit Logs */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '15px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Cấu hình Hạ tầng Hệ thống &amp; Nhật ký Kiểm toán
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0 0' }}>
            Thiết lập tỷ lệ chiết khấu sàn, bán kính điều phối GPS và tra cứu vết thao tác quản trị
          </p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            padding: 3,
            borderRadius: 8,
            gap: 2,
          }}
        >
          {[
            { id: 'SYSTEM_CONFIG' as const, label: 'Thiết lập Tham số & Chiết khấu Sàn' },
            { id: 'AUDIT_LOGS' as const, label: `Nhật ký Kiểm toán (${adminAuditLogs.length})` },
          ].map((tab) => {
            const active = adminSettingsSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdminSettingsSubTab(tab.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#0F172A' : '#64748B',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.78rem',
                  boxShadow: active ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {adminSettingsSubTab === 'SYSTEM_CONFIG' && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            padding: 26,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Bảng Điều Khiển Can Thiệp Sâu Vào Hạ Tầng Hệ Thống Toàn Sàn
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '3px 0 0 0' }}>
                Thiết lập tỷ lệ chiết khấu, phụ phí thời tiết xấu, bán kính thuật toán ghép cuốc GPS và chế độ bảo trì khẩn cấp
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 20, background: '#F8FAFC' }}>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A', marginBottom: 14 }}>
                1. Chính Sách Chiết Khấu &amp; Trợ Giá Sàn
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Phí nền tảng thu từ Nhà hàng (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={platformCommissionRate}
                    onChange={(e) => setPlatformCommissionRate(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      background: '#FFFFFF',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Phụ phí thời tiết xấu / Giờ cao điểm (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={peakHourSurgeFee}
                    onChange={(e) => setPeakHourSurgeFee(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      background: '#FFFFFF',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Giá trị đơn tối thiểu được trợ giá Miễn phí ship (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={minOrderForFreeShipping}
                    onChange={(e) => setMinOrderForFreeShipping(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      background: '#FFFFFF',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 20, background: '#F8FAFC' }}>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A', marginBottom: 14 }}>
                2. Thuật Toán Điều Phối &amp; An Toàn Toàn Sàn
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Bán kính tự động ghép tài xế gần nhất (km):{' '}
                    <strong style={{ color: '#4F46E5', fontSize: '0.95rem' }}>{autoDispatchRangeKm} km</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={autoDispatchRangeKm}
                    onChange={(e) => setAutoDispatchRangeKm(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#4F46E5', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>
                    <span>1 km (Nội phường)</span>
                    <span>5 km (Tiêu chuẩn)</span>
                    <span>10 km (Mở rộng)</span>
                  </div>
                </div>

                <div style={{ padding: 14, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#991B1B' }}>
                        Chế độ Bảo trì khẩn cấp toàn sàn
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#B91C1C', marginTop: 2 }}>
                        Tạm khóa khách đặt đơn mới khi nâng cấp hệ thống
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      style={{
                        padding: '7px 16px',
                        borderRadius: 6,
                        background: maintenanceMode ? '#DC2626' : '#94A3B8',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {maintenanceMode ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void adminApi.updateSystemSettings({
                      platformCommissionRate,
                      peakHourSurgeFee,
                      minOrderForFreeShipping,
                      autoDispatchRangeKm,
                      maintenanceMode,
                      reason: 'Lưu cấu hình can thiệp hệ thống từ bảng điều khiển Admin',
                    });
                    appendAuditLog(
                      'LƯU CẤU HÌNH HỆ THỐNG SÀN',
                      `Hoa hồng ${platformCommissionRate}% • Bán kính ${autoDispatchRangeKm}km`,
                      `Phụ phí ${peakHourSurgeFee.toLocaleString('vi-VN')}đ • Freeship từ ${minOrderForFreeShipping.toLocaleString('vi-VN')}đ • Bảo trì: ${maintenanceMode ? 'BẬT' : 'TẮT'}`,
                    );
                    setConfigSavedBanner('Đã lưu cấu hình can thiệp sâu toàn hệ thống sàn.');
                    triggerAdminToast('Đã lưu cấu hình tham số & chiết khấu toàn hệ thống sàn.');
                    setTimeout(() => setConfigSavedBanner(''), 3000);
                  }}
                  style={{
                    marginTop: 'auto',
                    padding: '11px',
                    borderRadius: 8,
                    background: '#0F172A',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Lưu thiết lập can thiệp hệ thống
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adminSettingsSubTab === 'AUDIT_LOGS' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 22px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Nhật ký Kiểm toán Quản trị
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                Tự động lưu vết mọi thao tác duyệt quán, khóa tài khoản, phân xử khiếu nại và giải ngân
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                placeholder="Tìm hành động, đối tượng..."
                value={adminAuditSearch}
                onChange={(e) => setAdminAuditSearch(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  fontSize: '0.79rem',
                  color: '#0F172A',
                  width: 215,
                  outline: 'none',
                }}
              />
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#F1F5F9',
                  padding: '5px 10px',
                  borderRadius: 6,
                }}
              >
                {adminAuditLogs.length} bản ghi
              </span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr
                  style={{
                    background: '#FAFAFA',
                    borderBottom: '1px solid #E2E8F0',
                    textAlign: 'left',
                    color: '#64748B',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '10px 20px' }}>Thời gian</th>
                  <th style={{ padding: '10px 20px' }}>Hành động</th>
                  <th style={{ padding: '10px 20px' }}>Đối tượng tác động</th>
                  <th style={{ padding: '10px 20px' }}>Ghi chú</th>
                  <th style={{ padding: '10px 20px' }}>Quản trị viên</th>
                </tr>
              </thead>
              <tbody>
                {adminAuditLogs
                  .filter((log) => {
                    const q = adminAuditSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      log.action.toLowerCase().includes(q) ||
                      log.targetName.toLowerCase().includes(q) ||
                      log.reason.toLowerCase().includes(q)
                    );
                  })
                  .map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '11px 20px', color: '#64748B', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {log.timestamp}
                      </td>
                      <td style={{ padding: '11px 20px', fontWeight: 700, color: '#0F172A' }}>{log.action}</td>
                      <td style={{ padding: '11px 20px', fontWeight: 600, color: '#1E293B' }}>{log.targetName}</td>
                      <td style={{ padding: '11px 20px', color: '#475569' }}>{log.reason}</td>
                      <td style={{ padding: '11px 20px', color: '#64748B' }}>{log.performedBy}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
