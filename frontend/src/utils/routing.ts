// ==============================================================================
// DineGo Frontend — Zero-Cost OpenStreetMap + OSRM Road Routing & Live Sync
// Uses public OSRM API (no API key, no billing) with offline Haversine fallback
// and BroadcastChannel + localStorage synchronization between Driver & Customer
// ==============================================================================

import L from 'leaflet';
import { API_BASE_URL } from '../api/client';
import type { SavedAddress, User } from '../types';

const RESILIENT_TILE_SOURCES = [
  {
    url: 'https://mt{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
    subdomains: '0123',
    maxZoom: 20,
    attribution: '&copy; Google Maps',
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 19,
    attribution: '&copy; Esri &mdash; OpenStreetMap contributors',
  },
  {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors, Tiles style by HOT',
  },
];

/**
 * Attaches a street tile layer to a Leaflet map with automatic multi-provider
 * fallback when a tile server is blocked or unreachable.
 */
export function addResilientStreetTileLayer(map: L.Map): L.TileLayer {
  let providerIdx = 0;
  let errorCount = 0;
  const primary = RESILIENT_TILE_SOURCES[0];

  const layer = L.tileLayer(primary.url, {
    subdomains: primary.subdomains,
    maxZoom: primary.maxZoom,
    attribution: primary.attribution,
  }).addTo(map);

  layer.on('tileerror', () => {
    errorCount += 1;
    if (errorCount >= 3 && providerIdx < RESILIENT_TILE_SOURCES.length - 1) {
      providerIdx += 1;
      errorCount = 0;
      const next = RESILIENT_TILE_SOURCES[providerIdx];
      layer.options.subdomains = next.subdomains ? next.subdomains.split('') : [];
      layer.options.maxZoom = next.maxZoom;
      layer.setUrl(next.url);
    }
  });

  return layer;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface RoadRouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet
  distanceKm: number;
  durationMin: number;
  source: 'osrm' | 'fallback';
}

export type LiveTrackingStatus =
  | 'ASSIGNED'
  | 'ARRIVED_AT_STORE'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'ARRIVED_AT_DESTINATION'
  | 'DELIVERED';

export interface LiveOrderTrackingPayload {
  orderId?: string;
  orderNumber: string;
  status: LiveTrackingStatus;
  currentLat: number;
  currentLng: number;
  heading: number;
  distanceKm: number;
  etaMinutes: number;
  storeLat: number;
  storeLng: number;
  storeName: string;
  storeAddress: string;
  customerLat: number;
  customerLng: number;
  customerAddress: string;
  driverId?: string;
  driverName: string;
  driverPhone: string;
  licensePlate: string;
  driverRating: number;
  updatedAt: string;
}

const routeCache = new Map<string, RoadRouteResult>();
const TRACKING_CHANNEL_NAME = 'dinego_live_tracking_v1';
const TRACKING_STORAGE_PREFIX = 'dinego_live_tracking_';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Computes great-circle distance in kilometers between two GPS points.
 */
export function calculateHaversineKm(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c * 1000) / 1000;
}

/**
 * Computes compass bearing in degrees [0..360) from point `from` to `to`.
 */
export function calculateBearingDeg(from: LatLngPoint, to: LatLngPoint): number {
  if (Math.abs(from.lat - to.lat) < 1e-7 && Math.abs(from.lng - to.lng) < 1e-7) {
    return 0;
  }
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Interpolates straight-line waypoints when OSRM is unreachable offline.
 */
export function interpolateStraightRoute(
  waypoints: LatLngPoint[],
  stepsPerSegment = 20,
): [number, number][] {
  if (waypoints.length === 0) return [];
  if (waypoints.length === 1) return [[waypoints[0].lat, waypoints[0].lng]];

  const result: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    for (let step = 0; step < stepsPerSegment; step++) {
      const t = step / stepsPerSegment;
      result.push([
        +(start.lat + (end.lat - start.lat) * t).toFixed(6),
        +(start.lng + (end.lng - start.lng) * t).toFixed(6),
      ]);
    }
  }
  const last = waypoints[waypoints.length - 1];
  result.push([+last.lat.toFixed(6), +last.lng.toFixed(6)]);
  return result;
}

/**
 * Fetches real street-following driving route from the free public OSRM server.
 * Always falls back cleanly to interpolated Haversine points if OSRM is unavailable.
 */
export async function fetchRoadRoute(
  waypoints: LatLngPoint[],
): Promise<RoadRouteResult> {
  if (waypoints.length < 2) {
    const p = waypoints[0] ?? { lat: 10.7736, lng: 106.7037 };
    return {
      coordinates: [[p.lat, p.lng]],
      distanceKm: 0,
      durationMin: 0,
      source: 'fallback',
    };
  }

  const cacheKey = waypoints
    .map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`)
    .join(';');

  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  const fallbackDistance = waypoints.reduce((acc, point, idx) => {
    if (idx === 0) return 0;
    return acc + calculateHaversineKm(waypoints[idx - 1], point);
  }, 0);

  const fallbackResult: RoadRouteResult = {
    coordinates: interpolateStraightRoute(waypoints, 18),
    distanceKm: Math.max(0.1, Math.round(fallbackDistance * 100) / 100),
    durationMin: Math.max(2, Math.round(fallbackDistance * 3.8)),
    source: 'fallback',
  };

  try {
    const coordStr = waypoints.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return fallbackResult;

    const json = (await response.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };

    const primaryRoute = json?.routes?.[0];
    const rawCoords = primaryRoute?.geometry?.coordinates;
    if (!primaryRoute || !Array.isArray(rawCoords) || rawCoords.length < 2) {
      return fallbackResult;
    }

    const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]) => [
      lat,
      lng,
    ]);

    const result: RoadRouteResult = {
      coordinates: leafletCoords,
      distanceKm: Math.max(
        0.05,
        Math.round((primaryRoute.distance / 1000) * 100) / 100,
      ),
      durationMin: Math.max(2, Math.round(primaryRoute.duration / 60)),
      source: 'osrm',
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch {
    return fallbackResult;
  }
}

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const KNOWN_MERCHANT_COORDS: Record<string, LatLngPoint> = {
  'merchant-com-tam': { lat: 10.7736, lng: 106.7037 }, // 123 Nguyễn Huệ, Q1
  'merchant-pho-thin': { lat: 10.7715, lng: 106.6974 }, // Phạm Hồng Thái / Q1
  'merchant-gongcha': { lat: 10.7704, lng: 106.6889 }, // 175 Nguyễn Thị Minh Khai, Q1
  'merchant-pizza': { lat: 10.7745, lng: 106.7033 }, // 88 Nguyễn Huệ, Q1
  'merchant-catering-hoang-gia': { lat: 10.7854, lng: 106.6962 }, // 210 Hai Bà Trưng, Q1
  'merchant-catering-phuong-nam': { lat: 10.7327, lng: 106.7196 }, // 45 Nguyễn Văn Linh, Q7
  'merchant-catering-ha-thanh': { lat: 10.7785, lng: 106.6869 }, // 112 Cách Mạng Tháng 8, Q3
  'merchant-catering-bistro': { lat: 10.8495, lng: 106.7574 }, // 88 Võ Văn Ngân, TP. Thủ Đức
  'merchant-catering-saigon-pro': { lat: 10.8012, lng: 106.7114 }, // 99 Điện Biên Phủ, Bình Thạnh
  'merchant-catering-an-vien': { lat: 10.7723, lng: 106.6691 }, // 320 Sư Vạn Hạnh, Q10
};

const KNOWN_AREA_ANCHORS: Array<{ keywords: string[]; coords: LatLngPoint }> = [
  { keywords: ['lê duẩn', 'bến nghé'], coords: { lat: 10.7811, lng: 106.6996 } },
  { keywords: ['hai bà trưng'], coords: { lat: 10.7854, lng: 106.6962 } },
  { keywords: ['nguyễn thị minh khai'], coords: { lat: 10.7752, lng: 106.6908 } },
  { keywords: ['cách mạng tháng 8', 'quận 3'], coords: { lat: 10.7785, lng: 106.6869 } },
  { keywords: ['pasteur', 'nam kỳ khởi nghĩa'], coords: { lat: 10.7798, lng: 106.6951 } },
  { keywords: ['bình thạnh', 'hàng xanh', 'điện biên phủ'], coords: { lat: 10.8012, lng: 106.7114 } },
  { keywords: ['phú nhuận', 'phan xích long'], coords: { lat: 10.7991, lng: 106.6884 } },
  { keywords: ['quận 10', 'sư vạn hạnh'], coords: { lat: 10.7723, lng: 106.6691 } },
  { keywords: ['quận 7', 'phú mỹ hưng', 'nguyễn văn linh'], coords: { lat: 10.7327, lng: 106.7196 } },
  { keywords: ['tân bình', 'cộng hòa'], coords: { lat: 10.8017, lng: 106.6528 } },
  { keywords: ['thủ đức', 'võ văn ngân'], coords: { lat: 10.8495, lng: 106.7574 } },
];

export function resolveMerchantCoords(
  merchantId?: string,
  merchantAddress?: string,
): LatLngPoint {
  if (merchantId && KNOWN_MERCHANT_COORDS[merchantId]) {
    return KNOWN_MERCHANT_COORDS[merchantId];
  }
  const lower = (merchantAddress || '').toLowerCase();
  for (const anchor of KNOWN_AREA_ANCHORS) {
    if (anchor.keywords.some((kw) => lower.includes(kw))) {
      return anchor.coords;
    }
  }
  const h = stableHash(merchantId || merchantAddress || 'dinego-store');
  return {
    lat: +(10.771 + ((h % 14) - 7) * 0.0011).toFixed(6),
    lng: +(106.698 + (((h >> 4) % 14) - 7) * 0.0012).toFixed(6),
  };
}

export function resolveCustomerCoords(
  deliveryAddress: string,
  storeCoords: LatLngPoint,
): LatLngPoint {
  const lower = (deliveryAddress || '').toLowerCase();
  for (const anchor of KNOWN_AREA_ANCHORS) {
    if (anchor.keywords.some((kw) => lower.includes(kw))) {
      const dist = calculateHaversineKm(storeCoords, anchor.coords);
      if (dist >= 0.25) {
        return anchor.coords;
      }
    }
  }
  // Safe urban HCMC offset (NW / W toward District 1-3, avoids Saigon River)
  const h = stableHash(deliveryAddress || 'dinego-customer');
  const dLat = 0.0085 + (h % 9) * 0.0012;
  const dLng = -(0.0075 + ((h >> 3) % 9) * 0.0014);
  return {
    lat: +(storeCoords.lat + dLat).toFixed(6),
    lng: +(storeCoords.lng + dLng).toFixed(6),
  };
}

export function resolveDriverStartCoords(
  storeCoords: LatLngPoint,
  driverId?: string,
): LatLngPoint {
  const h = stableHash(driverId || 'drv-001');
  const dLat = -(0.0048 + (h % 5) * 0.0007);
  const dLng = -(0.0038 + ((h >> 2) % 5) * 0.0007);
  return {
    lat: +(storeCoords.lat + dLat).toFixed(6),
    lng: +(storeCoords.lng + dLng).toFixed(6),
  };
}

export function publishLiveTracking(payload: LiveOrderTrackingPayload): void {
  const key = `${TRACKING_STORAGE_PREFIX}${payload.orderNumber}`;
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(TRACKING_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    } catch {
      // Ignore BroadcastChannel errors in restricted contexts
    }
  }
}

export function readLiveTracking(
  orderNumber: string,
): LiveOrderTrackingPayload | null {
  try {
    const raw = localStorage.getItem(`${TRACKING_STORAGE_PREFIX}${orderNumber}`);
    if (!raw) return null;
    return JSON.parse(raw) as LiveOrderTrackingPayload;
  } catch {
    return null;
  }
}

export function subscribeLiveTracking(
  orderNumber: string,
  onUpdate: (payload: LiveOrderTrackingPayload) => void,
): () => void {
  const storageKey = `${TRACKING_STORAGE_PREFIX}${orderNumber}`;

  const handleStorage = (e: StorageEvent) => {
    if (e.key === storageKey && e.newValue) {
      try {
        onUpdate(JSON.parse(e.newValue) as LiveOrderTrackingPayload);
      } catch {
        // Ignore invalid payload
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(TRACKING_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<LiveOrderTrackingPayload>) => {
        if (event.data?.orderNumber === orderNumber) {
          onUpdate(event.data);
        }
      };
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    channel?.close();
  };
}

function isUuid(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Syncs live GPS coordinates to NestJS backend when operating on a persisted SQL Order UUID.
 */
export async function syncGpsToBackend(
  orderId: string | undefined,
  latitude: number,
  longitude: number,
  heading?: number,
): Promise<void> {
  if (!isUuid(orderId)) return;
  const token = localStorage.getItem('dinego_access_token');
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/tracking/orders/${orderId}/gps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ latitude, longitude, heading }),
    });
  } catch {
    // Non-blocking: frontend live tracking remains smooth even offline
  }
}

// ==============================================================================
// All-Vietnam Zero-Cost Geocoding (Backend Proxy -> ArcGIS/Photon -> VN Fallbacks)
// Works reliably across all provinces/wards of VN including 2025 merged units.
// ==============================================================================

export interface GeocodedAddressResult {
  displayName: string;
  shortAddress: string;
  lat: number;
  lng: number;
  road?: string;
  suburb?: string;
  district?: string;
  city?: string;
  source?: string;
  isApproximateArea?: boolean;
}

export interface VnProvinceQuickPick {
  label: string;
  city: string;
  lat: number;
  lng: number;
  aliases: string[];
  isSpecificUnit?: boolean;
  district?: string;
}

export const VN_REGION_ANCHORS: VnProvinceQuickPick[] = [
  { label: 'TP. Hồ Chí Minh', city: 'Thành phố Hồ Chí Minh', lat: 10.7769, lng: 106.7009, aliases: ['ho chi minh', 'tphcm', 'tp hcm', 'sai gon', 'hcm'] },
  { label: 'Hà Nội', city: 'Hà Nội', lat: 21.0278, lng: 105.8342, aliases: ['ha noi', 'hanoi'] },
  { label: 'Đà Nẵng', city: 'Đà Nẵng', lat: 16.0544, lng: 108.2022, aliases: ['da nang', 'danang'] },
  { label: 'Quảng Trị (Đông Hà)', city: 'Quảng Trị', district: 'Đông Hà', lat: 16.8162, lng: 107.1003, aliases: ['quang tri', 'tinh quang tri', 'dong ha'] },
  { label: 'P. Nam Đông Hà, Quảng Trị', city: 'Quảng Trị', district: 'Đông Hà', lat: 16.802, lng: 107.1113, aliases: ['nam dong ha', 'phuong nam dong ha', 'phuong nam dong ha quang tri'], isSpecificUnit: true },
  { label: 'Quảng Bình (Đồng Hới)', city: 'Quảng Bình', district: 'Đồng Hới', lat: 17.4689, lng: 106.6223, aliases: ['quang binh', 'dong hoi'] },
  { label: 'Thành phố Huế', city: 'Huế', lat: 16.4637, lng: 107.5909, aliases: ['hue', 'thua thien hue'] },
  { label: 'Hải Phòng', city: 'Hải Phòng', lat: 20.8449, lng: 106.6881, aliases: ['hai phong', 'haiphong'] },
  { label: 'Cần Thơ', city: 'Cần Thơ', lat: 10.0452, lng: 105.7469, aliases: ['can tho', 'cantho'] },
  { label: 'Nghệ An (Vinh)', city: 'Nghệ An', lat: 18.6796, lng: 105.6813, aliases: ['nghe an', 'tp vinh', 'vinh'] },
  { label: 'Hà Tĩnh', city: 'Hà Tĩnh', lat: 18.3428, lng: 105.9057, aliases: ['ha tinh'] },
  { label: 'Thanh Hóa', city: 'Thanh Hóa', lat: 19.8067, lng: 105.7852, aliases: ['thanh hoa'] },
  { label: 'Quảng Ninh (Hạ Long)', city: 'Quảng Ninh', lat: 20.9712, lng: 107.0448, aliases: ['quang ninh', 'ha long'] },
  { label: 'Bắc Ninh', city: 'Bắc Ninh', lat: 21.1861, lng: 106.0763, aliases: ['bac ninh', 'bac giang'] },
  { label: 'Thái Nguyên', city: 'Thái Nguyên', lat: 21.5672, lng: 105.8252, aliases: ['thai nguyen'] },
  { label: 'Ninh Bình', city: 'Ninh Bình', lat: 20.2506, lng: 105.9745, aliases: ['ninh binh', 'nam dinh'] },
  { label: 'Lào Cai (Sa Pa)', city: 'Lào Cai', lat: 22.4809, lng: 103.9755, aliases: ['lao cai', 'sa pa', 'sapa'] },
  { label: 'Quảng Ngãi', city: 'Quảng Ngãi', lat: 15.1214, lng: 108.8044, aliases: ['quang ngai'] },
  { label: 'Gia Lai (Quy Nhơn / Pleiku)', city: 'Gia Lai', lat: 13.7829, lng: 109.2197, aliases: ['gia lai', 'binh dinh', 'quy nhon', 'pleiku'] },
  { label: 'Khánh Hòa (Nha Trang)', city: 'Khánh Hòa', lat: 12.2388, lng: 109.1967, aliases: ['khanh hoa', 'nha trang'] },
  { label: 'Đắk Lắk (Buôn Ma Thuột)', city: 'Đắk Lắk', lat: 12.6662, lng: 108.0378, aliases: ['dak lak', 'buon ma thuot'] },
  { label: 'Lâm Đồng (Đà Lạt)', city: 'Lâm Đồng', lat: 11.9404, lng: 108.4583, aliases: ['lam dong', 'da lat', 'dalat', 'phan thiet', 'binh thuan'] },
  { label: 'Đồng Nai (Biên Hòa)', city: 'Đồng Nai', lat: 10.9574, lng: 106.8427, aliases: ['dong nai', 'bien hoa', 'binh duong', 'vung tau'] },
  { label: 'Tây Ninh (Long An)', city: 'Tây Ninh', lat: 11.3352, lng: 106.1099, aliases: ['tay ninh', 'long an'] },
  { label: 'Đồng Tháp (Cao Lãnh / Mỹ Tho)', city: 'Đồng Tháp', lat: 10.4592, lng: 105.6329, aliases: ['dong thap', 'cao lanh', 'tien giang', 'my tho'] },
  { label: 'Vĩnh Long', city: 'Vĩnh Long', lat: 10.2537, lng: 105.9722, aliases: ['vinh long', 'ben tre', 'tra vinh'] },
  { label: 'An Giang (Long Xuyên / Phú Quốc)', city: 'An Giang', lat: 10.3864, lng: 105.4352, aliases: ['an giang', 'long xuyen', 'kien giang', 'rach gia', 'phu quoc'] },
  { label: 'Cà Mau', city: 'Cà Mau', lat: 9.1768, lng: 105.1524, aliases: ['ca mau', 'bac lieu'] },
];

interface PhotonGeoJsonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    suburb?: string;
    district?: string;
    county?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface ArcGisGeoCandidate {
  address?: string;
  location?: { x?: number; y?: number };
  attributes?: {
    Match_addr?: string;
    StName?: string;
    Nbrhd?: string;
    District?: string;
    City?: string;
    Subregion?: string;
    Region?: string;
  };
}

function normalizeViText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9,\s/.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildClientSearchVariants(rawQuery: string): string[] {
  const clean = rawQuery.trim();
  if (!clean) return [];

  const withCommas = clean
    .replace(
      /\s+(?=(phường|phuong|xã|xa|thị trấn|thi tran|đặc khu|dac khu|quận|quan|huyện|huyen|thị xã|thi xa|thành phố|thanh pho|tp\.?|tỉnh|tinh)\b)/gi,
      ', ',
    )
    .replace(/\s*,\s*/g, ', ')
    .replace(/^,\s*/, '');

  const withoutAdminPrefixes = withCommas
    .replace(
      /\b(phường|phuong|xã|xa|thị trấn|thi tran|đặc khu|dac khu|tỉnh|tinh|thành phố|thanh pho|tp\.?)\s+/gi,
      '',
    )
    .replace(/\s*,\s*/g, ', ')
    .trim();

  const wardDirectionalCleaned = withCommas
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      const wardPrefixMatch = trimmed.match(
        /^(?:phường|phuong|xã|xa|thị trấn|thi tran|đặc khu|dac khu)\s+(.+)$/i,
      );
      if (!wardPrefixMatch) {
        return trimmed
          .replace(/\b(tỉnh|tinh|thành phố|thanh pho|tp\.?)\s+/gi, '')
          .trim();
      }
      const rawWardName = wardPrefixMatch[1].trim();
      const words = rawWardName.split(/\s+/);
      if (
        words.length >= 3 &&
        /^(nam|bắc|bac|đông|dong|tây|tay|trung)$/i.test(words[0])
      ) {
        if (
          words[0].toLowerCase() === 'trung' &&
          words[1]?.toLowerCase() === 'tâm' &&
          words.length >= 4
        ) {
          return words.slice(2).join(' ');
        }
        return words.slice(1).join(' ');
      }
      return rawWardName;
    })
    .filter(Boolean)
    .join(', ');

  const segments = withoutAdminPrefixes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const parentTail = segments.length >= 2 ? segments.slice(1).join(', ') : '';

  return [
    clean,
    withCommas,
    withoutAdminPrefixes,
    wardDirectionalCleaned,
    parentTail,
  ].filter((v, idx, arr) => v.length >= 2 && arr.indexOf(v) === idx);
}

function findLocalRegionMatches(rawQuery: string): GeocodedAddressResult[] {
  const norm = normalizeViText(rawQuery);
  if (!norm) return [];

  const matches: GeocodedAddressResult[] = [];
  for (const anchor of VN_REGION_ANCHORS) {
    const isHit = anchor.aliases.some((alias) => {
      if (norm === alias) return true;
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|\\s|,)${escaped}(?:\\s|,|$)`).test(norm)) {
        return true;
      }
      return norm.length >= 5 && alias.includes(norm);
    });
    if (isHit) {
      matches.push({
        displayName: `${anchor.label}, Việt Nam`,
        shortAddress: anchor.label,
        lat: anchor.lat,
        lng: anchor.lng,
        district: anchor.district,
        city: anchor.city,
        source: 'vn-registry',
        isApproximateArea: !anchor.isSpecificUnit,
      });
    }
  }
  return matches;
}

async function fetchJsonSafe<T>(url: string, timeoutMs = 5500): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Forward geocoding for ALL of Vietnam (0đ):
 * 1) DineGo Backend Geocoding Proxy (Nominatim + Photon + ArcGIS + 2025 VN fallback)
 * 2) Direct browser CORS fallback via ArcGIS Public GeocodeServer & Komoot Photon
 * 3) Local Vietnam province/2025-merger registry fallback
 */
export async function searchAddressNominatim(
  query: string,
): Promise<GeocodedAddressResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  // 1. Prefer backend proxy (handles OSM User-Agent policy cleanly & caches results)
  const backendRes = await fetchJsonSafe<
    GeocodedAddressResult[] | { data?: GeocodedAddressResult[] }
  >(`${API_BASE_URL}/tracking/geocode/search?q=${encodeURIComponent(clean)}`, 6000);
  const backendList = Array.isArray(backendRes)
    ? backendRes
    : Array.isArray(backendRes?.data)
    ? backendRes.data
    : null;
  if (backendList && backendList.length > 0) {
    return backendList;
  }

  // 2. Direct CORS-enabled browser fallback (ArcGIS VNM + Photon Vietnam bbox)
  const variants = buildClientSearchVariants(clean);
  const localMatches = findLocalRegionMatches(clean);
  const normQuery = normalizeViText(clean);
  const hasStreetDetail = /\b(\d+|duong|pho|hem|kiet|ngo|ql|quoc lo)\b/.test(
    normQuery,
  );
  const results: GeocodedAddressResult[] = [];

  if (!hasStreetDetail) {
    for (const m of localMatches) {
      if (!m.isApproximateArea) results.push(m);
    }
  }

  for (const variant of variants) {
    const [arcRes, photonRes] = await Promise.all([
      fetchJsonSafe<{ candidates?: ArcGisGeoCandidate[] }>(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?singleLine=${encodeURIComponent(
          variant,
        )}&countryCode=VNM&langCode=vi&maxLocations=5&f=json&outFields=Match_addr,StName,Nbrhd,District,City,Subregion,Region`,
      ),
      fetchJsonSafe<{ features?: PhotonGeoJsonFeature[] }>(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          variant,
        )}&bbox=102.1,8.1,109.5,23.4&limit=5`,
        2200,
      ),
    ]);

    if (arcRes?.candidates) {
      for (const c of arcRes.candidates) {
        const lat = Number(c.location?.y);
        const lng = Number(c.location?.x);
        const matchAddr = (c.attributes?.Match_addr || c.address || '').trim();
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !matchAddr) continue;
        const shortAddress = matchAddr
          .replace(/,\s*(VNM|Vietnam|Việt Nam)\s*$/i, '')
          .trim();
        results.push({
          displayName: matchAddr,
          shortAddress: shortAddress || matchAddr,
          lat: +lat.toFixed(6),
          lng: +lng.toFixed(6),
          road: c.attributes?.StName?.trim() || undefined,
          suburb: c.attributes?.Nbrhd?.trim() || undefined,
          district:
            (c.attributes?.District || c.attributes?.Subregion || '').trim() ||
            undefined,
          city:
            (c.attributes?.City || c.attributes?.Region || '').trim() ||
            undefined,
          source: 'arcgis',
        });
      }
    }

    if (photonRes?.features) {
      for (const f of photonRes.features) {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < 8.0 ||
          lat > 23.5 ||
          lng < 102.0 ||
          lng > 110.0
        ) {
          continue;
        }
        const p = f.properties || {};
        const primary =
          [p.housenumber, p.street].filter(Boolean).join(' ').trim() ||
          (p.name || '').trim();
        const parts = [
          primary,
          (p.suburb || '').trim(),
          (p.district || p.county || '').trim(),
          (p.city || p.state || '').trim(),
        ].filter((part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx);
        if (parts.length === 0) continue;
        results.push({
          displayName: [...parts, p.country || 'Việt Nam'].join(', '),
          shortAddress: parts.join(', '),
          lat: +lat.toFixed(6),
          lng: +lng.toFixed(6),
          road: p.street?.trim() || undefined,
          suburb: p.suburb?.trim() || undefined,
          district: (p.district || p.county || '').trim() || undefined,
          city: (p.city || p.state || '').trim() || undefined,
          source: 'photon',
        });
      }
    }

    if (results.length > 0) break;
  }

  for (const m of localMatches) {
    results.push(m);
  }

  const deduped: GeocodedAddressResult[] = [];
  for (const item of results) {
    const dup = deduped.some(
      (prev) =>
        Math.abs(prev.lat - item.lat) < 0.0008 &&
        Math.abs(prev.lng - item.lng) < 0.0008 &&
        normalizeViText(prev.shortAddress) === normalizeViText(item.shortAddress),
    );
    if (!dup) deduped.push(item);
  }
  return deduped.slice(0, 7);
}

/**
 * Reverse geocoding from coordinates (lat, lng) across all of Vietnam.
 */
export async function reverseGeocodeNominatim(
  lat: number,
  lng: number,
): Promise<GeocodedAddressResult | null> {
  // 1. Prefer backend proxy (Nominatim w/ User-Agent + ArcGIS + Photon + fallback)
  const backendRev = await fetchJsonSafe<
    GeocodedAddressResult | { data?: GeocodedAddressResult }
  >(`${API_BASE_URL}/tracking/geocode/reverse?lat=${lat}&lng=${lng}`, 6000);
  if (backendRev) {
    const payload =
      'shortAddress' in backendRev ? backendRev : backendRev.data;
    if (payload && payload.shortAddress) return payload;
  }

  // 2. Direct ArcGIS CORS fallback
  const arcRev = await fetchJsonSafe<{
    address?: {
      Match_addr?: string;
      LongLabel?: string;
      Address?: string;
      Neighborhood?: string;
      District?: string;
      City?: string;
      Subregion?: string;
      Region?: string;
    };
  }>(
    `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&langCode=vi&f=json`,
  );
  if (arcRev?.address) {
    const a = arcRev.address;
    const road = (a.Address || '').trim() || undefined;
    const suburb = (a.Neighborhood || '').trim() || undefined;
    const district = (a.District || a.Subregion || '').trim() || undefined;
    const city = (a.City || a.Region || '').trim() || undefined;
    const shortAddress =
      (a.Match_addr || a.LongLabel || '')
        .replace(/,\s*(VNM|Vietnam|Việt Nam)\s*$/i, '')
        .trim() || [road, suburb, district, city].filter(Boolean).join(', ');
    if (shortAddress) {
      return {
        displayName: a.LongLabel || shortAddress,
        shortAddress,
        lat: +lat.toFixed(6),
        lng: +lng.toFixed(6),
        road,
        suburb,
        district,
        city,
        source: 'arcgis',
      };
    }
  }

  // 3. Direct Photon CORS fallback
  const photonRev = await fetchJsonSafe<{ features?: PhotonGeoJsonFeature[] }>(
    `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
  );
  const f = photonRev?.features?.[0];
  if (f?.properties) {
    const p = f.properties;
    const primary =
      [p.housenumber, p.street].filter(Boolean).join(' ').trim() ||
      (p.name || '').trim();
    const parts = [
      primary,
      (p.suburb || '').trim(),
      (p.district || p.county || '').trim(),
      (p.city || p.state || '').trim(),
    ].filter((part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx);
    if (parts.length > 0) {
      return {
        displayName: parts.join(', '),
        shortAddress: parts.join(', '),
        lat: +lat.toFixed(6),
        lng: +lng.toFixed(6),
        road: p.street?.trim() || undefined,
        suburb: p.suburb?.trim() || undefined,
        district: (p.district || p.county || '').trim() || undefined,
        city: (p.city || p.state || '').trim() || undefined,
        source: 'photon',
      };
    }
  }

  // 4. Nearest Vietnam regional center when offline
  let nearest: VnProvinceQuickPick | null = null;
  let bestDistSq = Infinity;
  for (const anchor of VN_REGION_ANCHORS) {
    const dLat = anchor.lat - lat;
    const dLng = anchor.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      nearest = anchor;
    }
  }
  if (nearest && bestDistSq <= 1.2) {
    return {
      displayName: `${nearest.label}, Việt Nam`,
      shortAddress: nearest.label,
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      district: nearest.district,
      city: nearest.city,
      source: 'vn-registry',
      isApproximateArea: true,
    };
  }

  return null;
}

function stripStreetPrefix(segment: string): string {
  return normalizeViText(segment)
    .replace(
      /\b(duong|pho|hem|ngo|kiet|so nha|so|phuong|p|xa|thi tran|quan|q|huyen|thi xa|thanh pho|tp|tinh|viet nam|vnm)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function findMentionedProvinceKey(cleanText: string): string | null {
  for (const anchor of VN_REGION_ANCHORS) {
    if (anchor.isSpecificUnit) continue;
    for (const alias of anchor.aliases) {
      if (alias.length < 4) continue;
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|\\s|,)${escaped}(?:\\s|,|$)`).test(cleanText)) {
        return normalizeViText(anchor.city);
      }
    }
  }
  return null;
}

/**
 * Validates that a typed address contains only valid Vietnamese address characters
 * and is not gibberish, symbol-only, or digit-only input.
 */
export function validateAddressInputChars(raw: string): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = (raw || '').trim();
  if (trimmed.length < 4) {
    return {
      valid: false,
      reason: 'Địa chỉ quá ngắn (tối thiểu 4 ký tự). Vui lòng nhập địa chỉ hợp lệ.',
    };
  }
  const invalidMatch = trimmed.match(/[^0-9A-Za-zÀ-ỹ\s,./()-]/);
  if (invalidMatch) {
    return {
      valid: false,
      reason: `Địa chỉ chứa ký tự không hợp lệ ("${invalidMatch[0]}"). Chỉ dùng chữ cái, số và dấu , . / - ( ).`,
    };
  }
  if (!/[A-Za-zÀ-ỹ]{2,}/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Địa chỉ phải có tên đường hoặc khu vực hợp lệ, không thể chỉ nhập số hoặc ký hiệu.',
    };
  }
  if (/(.)\1{4,}/i.test(trimmed)) {
    return {
      valid: false,
      reason: 'Địa chỉ có chuỗi ký tự lặp bất thường. Vui lòng nhập đúng địa chỉ có trên bản đồ.',
    };
  }
  return { valid: true };
}

/**
 * Verifies that typed address text genuinely agrees with the pinned map reference across
 * ALL regions of Vietnam (including newly merged 2025 wards where OSM still indexes the parent city/province).
 */
export function isAddressConsistentWithMap(
  typedAddress: string,
  mapReferenceName?: string,
  roadName?: string,
  districtName?: string,
  cityName?: string,
): boolean {
  if (!validateAddressInputChars(typedAddress).valid) return false;
  const cleanTyped = normalizeViText(typedAddress);
  const cleanRef = normalizeViText(mapReferenceName || '');
  if (cleanTyped.length < 6 || !cleanRef) return false;
  if (cleanTyped === cleanRef) return true;

  // 1. Catch contradicting province/city (e.g., pin in Quảng Trị vs text in Hà Nội / TP.HCM)
  const typedProvince = findMentionedProvinceKey(cleanTyped);
  const refProvince = findMentionedProvinceKey(
    normalizeViText([cityName, mapReferenceName].filter(Boolean).join(', ')),
  );
  if (typedProvince && refProvince && typedProvince !== refProvince) {
    // Allow 2025 Quang Binh <-> Quang Tri and similar adjacent/merged province labels seamlessly
    const isMergedQuangTriPair =
      (typedProvince.includes('quang tri') && refProvince.includes('quang binh')) ||
      (typedProvince.includes('quang binh') && refProvince.includes('quang tri'));
    if (!isMergedQuangTriPair) {
      return false;
    }
  }

  // 2. Catch explicit district contradiction (e.g., map is in Quận 1 vs text says Quận 7)
  if (districtName) {
    const refDist = normalizeViText(districtName);
    const typedDistrictMatch = cleanTyped.match(/\bquan\s+([a-z0-9]+)\b/);
    const refDistrictMatch = refDist.match(/\bquan\s+([a-z0-9]+)\b/);
    if (
      typedDistrictMatch &&
      refDistrictMatch &&
      typedDistrictMatch[1] !== refDistrictMatch[1]
    ) {
      return false;
    }
  }

  // 3. When pinned on a named street, require all meaningful street words in text
  if (roadName) {
    const cleanRoad = stripStreetPrefix(roadName);
    const roadWords = cleanRoad.split(' ').filter((w) => w.length >= 2);
    if (
      roadWords.length > 0 &&
      !roadWords.every((word) => cleanTyped.includes(word))
    ) {
      return false;
    }
    return true;
  }

  // 4. For area/ward/rural pins (including 2025 merged wards), require overlapping district/city/ward segment
  const refSegments = normalizeViText([districtName, cityName, mapReferenceName].filter(Boolean).join(', '))
    .split(',')
    .map((s) => stripStreetPrefix(s))
    .filter((s) => s.length >= 3);

  const matchedSegments = refSegments.filter((seg) => {
    const segWords = seg.split(' ').filter((w) => w.length >= 2);
    return segWords.length > 0 && segWords.every((w) => cleanTyped.includes(w));
  });

  return matchedSegments.length > 0;
}

/**
 * Extracts the user's primary verified SavedAddress (or profile address with coordinates).
 */
export function getDefaultVerifiedAddress(
  user: User | null | undefined,
): SavedAddress | null {
  if (!user) return null;
  if (Array.isArray(user.savedAddresses) && user.savedAddresses.length > 0) {
    const defaultAddr =
      user.savedAddresses.find(
        (a) =>
          a.isDefault &&
          Boolean(a.fullAddress?.trim()) &&
          a.latitude != null &&
          a.longitude != null,
      ) ||
      user.savedAddresses.find(
        (a) =>
          Boolean(a.fullAddress?.trim()) &&
          a.latitude != null &&
          a.longitude != null,
      );
    if (defaultAddr) return defaultAddr;
  }

  if (
    user.address?.trim() &&
    typeof user.addressLat === 'number' &&
    typeof user.addressLng === 'number'
  ) {
    return {
      id: `addr-primary-${user.id}`,
      label: 'Địa chỉ mặc định',
      recipientName: user.fullName,
      phone: user.phoneNumber || '',
      fullAddress: user.address.trim(),
      latitude: user.addressLat,
      longitude: user.addressLng,
      mapVerified: true,
      isDefault: true,
    };
  }

  return null;
}

export function hasVerifiedCustomerAddress(
  user: User | null | undefined,
): boolean {
  return getDefaultVerifiedAddress(user) !== null;
}

