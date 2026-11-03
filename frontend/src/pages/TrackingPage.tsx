// ==============================================================================
// DineGo Frontend — Real-Time GPS Shipper Tracking Page (Sprint 4 — U039 to U042)
// GrabFood Live Shipper Tracking, Route Simulation, Driver Profile & Geofence
// ==============================================================================

import React, { useState } from 'react';
import {
  Bike,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Compass,
  ArrowRight,
  Store,
  Home,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

type TrackingStatus =
  | 'ASSIGNED'
  | 'ARRIVED_AT_STORE'
  | 'DELIVERING'
  | 'ARRIVED_AT_DESTINATION'
  | 'DELIVERED';

interface TrackingState {
  orderNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  customerAddress: string;
  driverName: string;
  driverPhone: string;
  licensePlate: string;
  driverRating: number;
  status: TrackingStatus;
  currentLat: number;
  currentLng: number;
  distanceKm: number;
  etaMinutes: number;
}

export const TrackingPage: React.FC = () => {
  const [tracking, setTracking] = useState<TrackingState>({
    orderNumber: 'DG20261103-TRK88',
    restaurantName: 'Cơm Tấm Sài Gòn 1985',
    restaurantAddress: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
    customerAddress: '45 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM',
    driverName: 'Nguyễn Quốc Tuấn',
    driverPhone: '0909 888 999',
    licensePlate: '59-B1 888.26',
    driverRating: 4.9,
    status: 'DELIVERING',
    currentLat: 10.778,
    currentLng: 106.702,
    distanceKm: 1.2,
    etaMinutes: 7,
  });

  const handleNextStatus = () => {
    if (tracking.status === 'ASSIGNED') {
      setTracking((prev) => ({
        ...prev,
        status: 'ARRIVED_AT_STORE',
        distanceKm: 2.1,
        etaMinutes: 12,
      }));
    } else if (tracking.status === 'ARRIVED_AT_STORE') {
      setTracking((prev) => ({
        ...prev,
        status: 'DELIVERING',
        distanceKm: 1.4,
        etaMinutes: 8,
      }));
    } else if (tracking.status === 'DELIVERING') {
      setTracking((prev) => ({
        ...prev,
        status: 'ARRIVED_AT_DESTINATION',
        distanceKm: 0.1,
        etaMinutes: 1,
      }));
    } else if (tracking.status === 'ARRIVED_AT_DESTINATION') {
      setTracking((prev) => ({
        ...prev,
        status: 'DELIVERED',
        distanceKm: 0,
        etaMinutes: 0,
      }));
    }
  };

  const handleResetSimulation = () => {
    setTracking({
      orderNumber: 'DG20261103-TRK88',
      restaurantName: 'Cơm Tấm Sài Gòn 1985',
      restaurantAddress: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
      customerAddress: '45 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM',
      driverName: 'Nguyễn Quốc Tuấn',
      driverPhone: '0909 888 999',
      licensePlate: '59-B1 888.26',
      driverRating: 4.9,
      status: 'ASSIGNED',
      currentLat: 10.776,
      currentLng: 106.7,
      distanceKm: 2.8,
      etaMinutes: 15,
    });
  };

  const steps: { key: TrackingStatus; label: string; desc: string }[] = [
    { key: 'ASSIGNED', label: 'Tài xế nhận đơn', desc: 'Đang di chuyển đến quán' },
    { key: 'ARRIVED_AT_STORE', label: 'Đã đến quán', desc: 'Chờ lấy thức ăn' },
    { key: 'DELIVERING', label: 'Đang giao hàng', desc: 'Đang trên đường đến bạn' },
    { key: 'ARRIVED_AT_DESTINATION', label: 'Đã đến nơi', desc: 'Tài xế đang gọi nhận đồ' },
    { key: 'DELIVERED', label: 'Giao thành công', desc: 'Hoàn tất đơn hàng' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === tracking.status);

  return (
    <div className="container" style={{ padding: '28px 16px', maxWidth: 960, paddingBottom: 60 }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 14px',
            borderRadius: 20,
            background: 'rgba(0, 177, 79, 0.1)',
            color: 'var(--primary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          <Navigation size={15} /> Định Vị GPS Shipper & Geofencing 100m (Sprint 4)
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
          Theo Dõi Lộ Trình Giao Hàng Trực Tuyến
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
          Đơn hàng: <strong>#{tracking.orderNumber}</strong> • Tọa độ GPS tài xế cập nhật liên tục thời gian thực
        </p>
      </div>

      {/* Main Tracking Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        {/* Interactive Simulated Map Canvas */}
        <div
          style={{
            height: 280,
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {/* Map Grid Effect */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Route Line */}
          <div
            style={{
              position: 'absolute',
              width: '60%',
              height: 4,
              background: 'linear-gradient(90deg, #10B981, #00B14F, #FF5722)',
              borderRadius: 2,
            }}
          />

          {/* Restaurant Node */}
          <div
            style={{
              position: 'absolute',
              left: '18%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.25)',
                border: '2px solid #10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
              }}
            >
              <Store size={22} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF', textAlign: 'center', maxWidth: 120 }}>
              {tracking.restaurantName}
            </div>
          </div>

          {/* Shipper Bike (Moving Node) */}
          <div
            style={{
              position: 'absolute',
              left: `${20 + currentStepIndex * 15}%`,
              transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00B14F, #06B6D4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 0 24px rgba(0, 177, 79, 0.8)',
                border: '2.5px solid #FFFFFF',
              }}
            >
              <Bike size={28} />
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                background: 'var(--primary)',
                color: '#FFFFFF',
                padding: '3px 10px',
                borderRadius: 12,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {tracking.status === 'DELIVERED' ? 'Đã giao' : `Cách bạn ${tracking.distanceKm} km`}
            </div>
          </div>

          {/* Destination Node */}
          <div
            style={{
              position: 'absolute',
              right: '18%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255, 87, 34, 0.25)',
                border: '2px solid #FF5722',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF5722',
              }}
            >
              <Home size={22} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF', textAlign: 'center', maxWidth: 120 }}>
              Địa chỉ của bạn
            </div>
          </div>
        </div>

        {/* Tracking Details & Driver Profile */}
        <div style={{ padding: 24 }}>
          {/* Status Steps Progress */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            {steps.map((s, idx) => {
              const isPast = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={s.key} style={{ padding: '8px 4px' }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      margin: '0 auto 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      background: isCurrent
                        ? 'var(--primary)'
                        : isPast
                        ? '#10B981'
                        : 'var(--bg-main)',
                      color: isPast || isCurrent ? '#FFFFFF' : 'var(--text-muted)',
                      border: `2px solid ${isPast || isCurrent ? 'var(--primary)' : 'var(--border)'}`,
                      boxShadow: isCurrent ? '0 0 12px rgba(0, 177, 79, 0.4)' : 'none',
                    }}
                  >
                    {isPast && !isCurrent ? '✓' : idx + 1}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: isCurrent ? 800 : 600,
                      color: isCurrent ? 'var(--primary)' : isPast ? 'var(--text-main)' : 'var(--text-muted)',
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Driver & ETA Card */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 22px',
              background: 'var(--bg-main)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              gap: 16,
            }}
          >
            {/* Driver Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #00B14F, #009643)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(0, 177, 79, 0.3)',
                }}
              >
                Tuấn
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                    {tracking.driverName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#B45309',
                      background: '#FEF3C7',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontWeight: 800,
                    }}
                  >
                    ⭐ {tracking.driverRating}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Biển số xe: <strong style={{ color: 'var(--text-main)' }}>{tracking.licensePlate}</strong> • Honda Wave Alpha
                </div>
              </div>
            </div>

            {/* ETA Countdown & Call Driver */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Thời gian dự kiến (ETA)</div>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: tracking.status === 'DELIVERED' ? 'var(--primary)' : 'var(--secondary)',
                  }}
                >
                  {tracking.status === 'DELIVERED' ? 'ĐÃ GIAO HÀNG' : `~ ${tracking.etaMinutes} phút`}
                </div>
              </div>

              <a
                href={`tel:${tracking.driverPhone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 12,
                  background: 'rgba(0, 177, 79, 0.1)',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  border: '1.5px solid var(--primary)',
                }}
              >
                <Phone size={16} /> Gọi tài xế
              </a>
            </div>
          </div>

          {/* Simulation Controls for E2E testing */}
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: '#FFFFFF',
              border: '1px dashed var(--border)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              🛠️ <strong>Mô phỏng E2E tài xế giao hàng:</strong> Bấm để đẩy tiến trình GPS và Geofencing thời gian thực
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tracking.status !== 'DELIVERED' ? (
                <button
                  onClick={handleNextStatus}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderRadius: 10 }}
                >
                  Tiến tới bước tiếp theo →
                </button>
              ) : (
                <button
                  onClick={handleResetSimulation}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderRadius: 10 }}
                >
                  <RotateCcw size={14} style={{ marginRight: 6 }} /> Chạy lại mô phỏng
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
