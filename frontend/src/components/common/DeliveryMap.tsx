// ==============================================================================
// DineGo Frontend — Real Interactive Delivery Map (Leaflet + OpenStreetMap + OSRM)
// Supports smooth animated shipper marker rotation, OSRM road polylines,
// 100m Geofence visualization circles, auto fitBounds, and interactive click-to-GPS
// ==============================================================================

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Navigation, Route } from 'lucide-react';
import { addResilientStreetTileLayer, type LatLngPoint } from '../../utils/routing';

export interface DeliveryMapProps {
  store: LatLngPoint & { name: string; address: string };
  customer: LatLngPoint & { label?: string; address: string };
  shipper: LatLngPoint & { name?: string; plate?: string; heading?: number };
  routePoints: [number, number][];
  driverToStorePoints?: [number, number][];
  status: string;
  distanceKm: number;
  etaMinutes: number;
  routeSource?: 'osrm' | 'fallback';
  height?: number;
  showGeofenceCircles?: boolean;
  onMapClickPoint?: (point: LatLngPoint) => void;
  accentColor?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createStoreDivIcon(storeName: string): L.DivIcon {
  return L.divIcon({
    className: 'dinego-map-marker-store',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
    html: `
      <div title="${escapeHtml(storeName)}" style="
        width: 38px; height: 38px; border-radius: 12px;
        background: #F59E0B; border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
        display: flex; align-items: center; justify-content: center;
        color: #FFFFFF;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
          <path d="M2 7h20"/>
        </svg>
      </div>
    `,
  });
}

function createCustomerDivIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: 'dinego-map-marker-customer',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
    html: `
      <div title="${escapeHtml(label)}" style="
        width: 38px; height: 38px; border-radius: 50%;
        background: #10B981; border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.45);
        display: flex; align-items: center; justify-content: center;
        color: #FFFFFF;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
      </div>
    `,
  });
}

function createShipperDivIcon(
  heading: number,
  color: string,
  distanceKm: number,
): L.DivIcon {
  const safeHeading = Number.isFinite(heading) ? heading : 0;
  return L.divIcon({
    className: 'dinego-map-marker-shipper',
    iconSize: [52, 62],
    iconAnchor: [26, 24],
    popupAnchor: [0, -24],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
        <div style="
          width: 44px; height: 44px; border-radius: 50%;
          background: ${color}; border: 3px solid #FFFFFF;
          box-shadow: 0 0 0 6px rgba(2, 132, 199, 0.2), 0 6px 16px rgba(15, 23, 42, 0.4);
          display: flex; align-items: center; justify-content: center;
          color: #FFFFFF;
          transform: rotate(${Math.round(safeHeading)}deg);
          transition: transform 0.35s ease;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2"/>
          </svg>
        </div>
        <div style="
          margin-top: 3px; background: #0F172A; color: #FFFFFF;
          padding: 1px 7px; border-radius: 999px;
          font-size: 10px; font-weight: 800; white-space: nowrap;
          border: 1.5px solid #FFFFFF;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">${distanceKm.toFixed(2)} km</div>
      </div>
    `,
  });
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  store,
  customer,
  shipper,
  routePoints,
  driverToStorePoints,
  status,
  distanceKm,
  etaMinutes,
  routeSource = 'osrm',
  height = 380,
  showGeofenceCircles = true,
  onMapClickPoint,
  accentColor = '#0284C7',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const storeMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const shipperMarkerRef = useRef<L.Marker | null>(null);
  const routeCasingRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const approachLineRef = useRef<L.Polyline | null>(null);
  const storeCircleRef = useRef<L.Circle | null>(null);
  const customerCircleRef = useRef<L.Circle | null>(null);
  const hasFittedBoundsRef = useRef(false);
  const clickCallbackRef = useRef(onMapClickPoint);

  clickCallbackRef.current = onMapClickPoint;

  const fitAllBounds = () => {
    const map = mapRef.current;
    if (!map) return;
    const pts: L.LatLngExpression[] = [
      [store.lat, store.lng],
      [customer.lat, customer.lng],
      [shipper.lat, shipper.lng],
      ...routePoints,
    ];
    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts), {
        padding: [42, 42],
        maxZoom: 16,
        animate: true,
      });
    }
  };

  // Initialize Leaflet Map once cleanly (React 19 StrictMode-safe)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [
        (store.lat + customer.lat) / 2,
        (store.lng + customer.lng) / 2,
      ],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    addResilientStreetTileLayer(map);

    routeCasingRef.current = L.polyline([], {
      color: '#FFFFFF',
      weight: 8,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    routeLineRef.current = L.polyline([], {
      color: accentColor,
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    approachLineRef.current = L.polyline([], {
      color: '#F59E0B',
      weight: 4,
      opacity: 0.9,
      dashArray: '8, 8',
      lineCap: 'round',
    }).addTo(map);

    storeCircleRef.current = L.circle([store.lat, store.lng], {
      radius: 100,
      color: '#F59E0B',
      fillColor: '#F59E0B',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 4',
    }).addTo(map);

    customerCircleRef.current = L.circle([customer.lat, customer.lng], {
      radius: 100,
      color: '#10B981',
      fillColor: '#10B981',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 4',
    }).addTo(map);

    storeMarkerRef.current = L.marker([store.lat, store.lng], {
      icon: createStoreDivIcon(store.name),
    })
      .bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;">
          <strong>Nhà hàng: ${escapeHtml(store.name)}</strong><br/>
          <span style="color:#475569;">${escapeHtml(store.address)}</span>
        </div>`,
      )
      .addTo(map);

    customerMarkerRef.current = L.marker([customer.lat, customer.lng], {
      icon: createCustomerDivIcon(customer.label || 'Điểm giao khách hàng'),
    })
      .bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;">
          <strong>${escapeHtml(customer.label || 'Điểm nhận hàng')}</strong><br/>
          <span style="color:#475569;">${escapeHtml(customer.address)}</span>
        </div>`,
      )
      .addTo(map);

    shipperMarkerRef.current = L.marker([shipper.lat, shipper.lng], {
      icon: createShipperDivIcon(shipper.heading ?? 0, accentColor, distanceKm),
      zIndexOffset: 500,
    })
      .bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;">
          <strong>Tài xế: ${escapeHtml(shipper.name || 'Shipper DineGo')}</strong><br/>
          <span style="color:#475569;">Biển số: ${escapeHtml(shipper.plate || 'DineGo')}</span>
        </div>`,
      )
      .addTo(map);

    map.on('click', (evt: L.LeafletMouseEvent) => {
      if (clickCallbackRef.current) {
        clickCallbackRef.current({
          lat: +evt.latlng.lat.toFixed(6),
          lng: +evt.latlng.lng.toFixed(6),
        });
      }
    });

    mapRef.current = map;
    hasFittedBoundsRef.current = false;

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize();
          })
        : null;
    resizeObserver?.observe(el);

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      hasFittedBoundsRef.current = false;
    };
    // Intentionally initialize map once on mount; incremental prop updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Store, Customer, Geofence circles, and Route Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    storeMarkerRef.current
      ?.setLatLng([store.lat, store.lng])
      .setIcon(createStoreDivIcon(store.name))
      .setPopupContent(
        `<div style="font-family:sans-serif;font-size:12px;">
          <strong>Nhà hàng: ${escapeHtml(store.name)}</strong><br/>
          <span style="color:#475569;">${escapeHtml(store.address)}</span>
        </div>`,
      );

    customerMarkerRef.current
      ?.setLatLng([customer.lat, customer.lng])
      .setPopupContent(
        `<div style="font-family:sans-serif;font-size:12px;">
          <strong>${escapeHtml(customer.label || 'Điểm nhận hàng')}</strong><br/>
          <span style="color:#475569;">${escapeHtml(customer.address)}</span>
        </div>`,
      );

    if (storeCircleRef.current && customerCircleRef.current) {
      storeCircleRef.current.setLatLng([store.lat, store.lng]);
      customerCircleRef.current.setLatLng([customer.lat, customer.lng]);
      const opacity = showGeofenceCircles ? 0.08 : 0;
      const strokeOpacity = showGeofenceCircles ? 0.7 : 0;
      storeCircleRef.current.setStyle({ fillOpacity: opacity, opacity: strokeOpacity });
      customerCircleRef.current.setStyle({ fillOpacity: opacity, opacity: strokeOpacity });
    }

    const activeRoute =
      routePoints.length >= 2
        ? routePoints
        : [
            [store.lat, store.lng] as [number, number],
            [customer.lat, customer.lng] as [number, number],
          ];

    routeCasingRef.current?.setLatLngs(activeRoute);
    routeLineRef.current?.setLatLngs(activeRoute).setStyle({ color: accentColor });

    if (driverToStorePoints && driverToStorePoints.length >= 2) {
      approachLineRef.current?.setLatLngs(driverToStorePoints);
    } else {
      approachLineRef.current?.setLatLngs([]);
    }

    if (!hasFittedBoundsRef.current) {
      fitAllBounds();
      hasFittedBoundsRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, customer, routePoints, driverToStorePoints, showGeofenceCircles, accentColor]);

  // Smoothly update Shipper marker position and compass rotation
  useEffect(() => {
    if (!shipperMarkerRef.current) return;
    shipperMarkerRef.current.setLatLng([shipper.lat, shipper.lng]);
    shipperMarkerRef.current.setIcon(
      createShipperDivIcon(shipper.heading ?? 0, accentColor, distanceKm),
    );
  }, [shipper.lat, shipper.lng, shipper.heading, distanceKm, accentColor]);

  const statusBadgeText =
    status === 'ASSIGNED'
      ? 'Đang đến nhà hàng'
      : status === 'ARRIVED_AT_STORE'
      ? 'Đã tới nhà hàng'
      : status === 'ARRIVED_AT_DESTINATION'
      ? 'Shipper đang ở trước cửa'
      : status === 'DELIVERED'
      ? 'Đã giao thành công'
      : 'Đang giao hàng thực tế';

  return (
    <div
      style={{
        position: 'relative',
        height,
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        background: '#E2E8F0',
      }}
    >
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          zIndex: 1,
          cursor: onMapClickPoint ? 'crosshair' : 'grab',
        }}
      />

      {/* Top-Left Live Status & Routing Source Pill */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 450,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(15, 23, 42, 0.88)',
            color: '#FFFFFF',
            padding: '6px 11px',
            borderRadius: 999,
            fontSize: '0.75rem',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: status === 'DELIVERED' ? '#10B981' : '#38BDF8',
              display: 'inline-block',
            }}
          />
          {statusBadgeText}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(255, 255, 255, 0.94)',
            color: '#0F172A',
            padding: '6px 10px',
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 700,
            border: '1px solid #CBD5E1',
            boxShadow: '0 4px 10px rgba(15, 23, 42, 0.12)',
          }}
        >
          <Route size={13} color={accentColor} />
          {routeSource === 'osrm' ? 'Tuyến đường OSRM' : 'Tuyến đường dự phòng'}
        </div>
      </div>

      {/* Top-Right Recenter Button */}
      <button
        type="button"
        onClick={fitAllBounds}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 450,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#FFFFFF',
          color: '#0F172A',
          border: '1px solid #CBD5E1',
          padding: '7px 12px',
          borderRadius: 8,
          fontSize: '0.76rem',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.14)',
          cursor: 'pointer',
        }}
      >
        <LocateFixed size={14} color={accentColor} />
        Căn giữa lộ trình
      </button>

      {/* Bottom-Left Telemetry Strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 450,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          pointerEvents: 'none',
          maxWidth: 'calc(100% - 100px)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#0F172A',
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            fontSize: '0.76rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.14)',
          }}
        >
          <Navigation size={14} color={accentColor} />
          <span>
            Còn <strong>{distanceKm.toFixed(2)} km</strong> • ETA{' '}
            <strong style={{ color: accentColor }}>{etaMinutes} phút</strong>
          </span>
        </div>

        {onMapClickPoint && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#E2E8F0',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            Nhấp lên bản đồ để di chuyển vị trí GPS thử nghiệm ({shipper.lat.toFixed(4)},{' '}
            {shipper.lng.toFixed(4)})
          </div>
        )}
      </div>
    </div>
  );
};

