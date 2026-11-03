// ==============================================================================
// DineGo Frontend — Real-Time GPS Shipper Tracking Page (Sprint 4 — U039 to U042)
// ==============================================================================

import React, { useState, useEffect } from 'react';
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

  const [simulating, setSimulating] = useState(false);

  // Mô phỏng tiến trình giao hàng theo thời gian thực (Geofence U041)
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
    { key: 'ARRIVED_AT_STORE', label: 'Đã đến quán (Geofence)', desc: 'Chờ lấy thức ăn' },
    { key: 'DELIVERING', label: 'Đang giao hàng', desc: 'Đang trên đường đến bạn' },
    { key: 'ARRIVED_AT_DESTINATION', label: 'Đã đến nơi', desc: 'Tài xế đang gọi nhận đồ' },
    { key: 'DELIVERED', label: 'Giao thành công', desc: 'Hoàn tất đơn hàng' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === tracking.status);

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: 960 }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 20,
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#06B6D4',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          <Navigation size={16} /> GPS Shipper & Geofencing 100m (Sprint 4 — U039 to U042)
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>
          Theo Dõi Lộ Trình Giao Hàng Trực Tiếp
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Đơn hàng: <strong>{tracking.orderNumber}</strong> • Tọa độ GPS shipper cập nhật mỗi 5 giây
        </p>
      </div>

      {/* Main Tracking Card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        {/* Interactive Simulated Map Canvas */}
        <div
          style={{
            height: 280,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {/* Map Grid effect */}
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
              background: 'linear-gradient(90deg, #10B981, #06B6D4, #FF5722)',
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
                background: 'rgba(16, 185, 129, 0.2)',
                border: '2px solid #10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
              }}
            >
              <Store size={22} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', textAlign: 'center', maxWidth: 120 }}>
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
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #06B6D4, #0284C7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.8)',
                border: '2px solid #fff',
              }}
            >
              <Bike size={26} />
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: '#06B6D4',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 12,
                whiteSpace: 'nowrap',
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
                background: 'rgba(255, 87, 34, 0.2)',
                border: '2px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Home size={22} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', textAlign: 'center', maxWidth: 120 }}>
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
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      margin: '0 auto 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: isCurrent
                        ? '#06B6D4'
                        : isPast
                        ? '#10B981'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: isPast || isCurrent ? '#fff' : 'var(--text-muted)',
                      boxShadow: isCurrent ? '0 0 12px rgba(6, 182, 212, 0.6)' : 'none',
                    }}
                  >
                    {isPast && !isCurrent ? '✓' : idx + 1}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#06B6D4' : isPast ? '#fff' : 'var(--text-muted)',
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
              padding: 18,
              background: 'var(--bg-card)',
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
                  background: 'linear-gradient(135deg, #FF5722, #FF7043)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                }}
              >
                Tuấn
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{tracking.driverName}</span>
                  <span style={{ fontSize: '0.75rem', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                    ⭐ {tracking.driverRating}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Xe: <strong>{tracking.licensePlate}</strong> • Honda Wave Alpha
                </div>
              </div>
            </div>

            {/* ETA Countdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Thời gian dự kiến (ETA)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: tracking.status === 'DELIVERED' ? '#10B981' : 'var(--primary)' }}>
                  {tracking.status === 'DELIVERED' ? 'ĐÃ GIAO HÀNG' : `~ ${tracking.etaMinutes} phút`}
                </div>
              </div>

              <a
                href={`tel:${tracking.driverPhone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  fontWeight: 700,
                  fontSize: '0.85rem',
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
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed var(--border)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              🛠️ <strong>Mô phỏng E2E tài xế giao hàng:</strong> Bấm để đẩy trạng thái GPS và Geofencing thời gian thực
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tracking.status !== 'DELIVERED' ? (
                <button
                  onClick={handleNextStatus}
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  Tiến tới bước tiếp theo →
                </button>
              ) : (
                <button
                  onClick={handleResetSimulation}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  Chạy lại mô phỏng
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

