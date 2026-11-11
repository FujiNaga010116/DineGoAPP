// ==============================================================================
// DineGo Frontend — Interactive OpenStreetMap Address Picker & Map Validator
// Zero-cost Leaflet + OpenStreetMap Nominatim Geocoding (Forward & Reverse)
// Ensures the saved text address always matches the pinned coordinate on the map.
// ==============================================================================

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react';
import {
  isAddressConsistentWithMap,
  reverseGeocodeNominatim,
  searchAddressNominatim,
  VN_REGION_ANCHORS,
  type GeocodedAddressResult,
} from '../../utils/routing';

export interface AddressPickerValue {
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  mapReferenceName?: string;
  isSynced: boolean;
}

interface AddressMapPickerProps {
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
  initialMapReferenceName?: string;
  height?: number;
  onChange: (value: AddressPickerValue) => void;
}

const DEFAULT_HCM_CENTER: [number, number] = [10.7769, 106.7009];

function createPinDivIcon(): L.DivIcon {
  return L.divIcon({
    className: 'dinego-address-picker-pin',
    iconSize: [38, 44],
    iconAnchor: [19, 42],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="
          width: 34px; height: 34px; border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: #00B14F; border: 3px solid #FFFFFF;
          box-shadow: 0 6px 16px rgba(0, 177, 79, 0.45);
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="
            width: 10px; height: 10px; border-radius: 50%;
            background: #FFFFFF; transform: rotate(45deg);
          "></div>
        </div>
      </div>
    `,
  });
}

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
  initialAddress = '',
  initialLat,
  initialLng,
  initialMapReferenceName,
  height = 250,
  onChange,
}) => {
  const hasInitialCoords =
    typeof initialLat === 'number' && typeof initialLng === 'number';

  const [addressText, setAddressText] = useState(initialAddress);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    hasInitialCoords ? { lat: initialLat, lng: initialLng } : null,
  );
  const [mapMeta, setMapMeta] = useState<{
    referenceName: string;
    road?: string;
    district?: string;
    city?: string;
  } | null>(
    hasInitialCoords && (initialMapReferenceName || initialAddress)
      ? { referenceName: initialMapReferenceName || initialAddress }
      : null,
  );
  const [searchResults, setSearchResults] = useState<GeocodedAddressResult[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const isSynced = Boolean(
    coords &&
      mapMeta &&
      isAddressConsistentWithMap(
        addressText,
        mapMeta.referenceName,
        mapMeta.road,
        mapMeta.district,
        mapMeta.city,
      ),
  );

  // Notify parent whenever text, coordinates, or sync state changes
  useEffect(() => {
    onChangeRef.current({
      fullAddress: addressText.trim(),
      latitude: coords?.lat,
      longitude: coords?.lng,
      mapReferenceName: mapMeta?.referenceName,
      isSynced,
    });
  }, [addressText, coords, mapMeta, isSynced]);

  const placeOrMoveMarker = (lat: number, lng: number, zoomTo = true, zoomLevel = 16) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], {
        icon: createPinDivIcon(),
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        void handlePinMoved(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
      });

      markerRef.current = marker;
    }

    if (zoomTo) {
      map.flyTo([lat, lng], zoomLevel, { animate: true, duration: 0.6 });
    }
  };

  const handlePinMoved = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    setSearchResults([]);
    setIsReversing(true);
    setStatusNote('');

    const rev = await reverseGeocodeNominatim(lat, lng);
    setIsReversing(false);

    if (rev) {
      setAddressText(rev.shortAddress);
      setMapMeta({
        referenceName: rev.shortAddress || rev.displayName,
        road: rev.road,
        district: rev.district,
        city: rev.city,
      });
      setStatusNote('');
    } else {
      setMapMeta(null);
      setStatusNote(
        'Không thể tra cứu tên khu vực tại vị trí vừa ghim. Hãy thử tìm khu vực bằng ô tìm kiếm hoặc chọn tỉnh phía trên.',
      );
    }
  };

  // Initialize Leaflet Map once (React 19 StrictMode-safe)
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || mapRef.current) return;

    const startCenter: [number, number] = hasInitialCoords
      ? [initialLat!, initialLng!]
      : DEFAULT_HCM_CENTER;

    const map = L.map(el, {
      center: startCenter,
      zoom: hasInitialCoords ? 16 : 13,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    if (hasInitialCoords) {
      const marker = L.marker(startCenter, {
        icon: createPinDivIcon(),
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        void handlePinMoved(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
      });
      markerRef.current = marker;
    }

    map.on('click', (evt: L.LeafletMouseEvent) => {
      const lat = +evt.latlng.lat.toFixed(6);
      const lng = +evt.latlng.lng.toFixed(6);
      placeOrMoveMarker(lat, lng, false);
      void handlePinMoved(lat, lng);
    });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize();
          })
        : null;
    resizeObserver?.observe(el);

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Intentionally initialize once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickRegionSelect = (regionLabel: string) => {
    const region = VN_REGION_ANCHORS.find((r) => r.label === regionLabel);
    if (!region) return;
    setSearchResults([]);
    const zoom = region.isSpecificUnit ? 14 : 13;
    mapRef.current?.flyTo([region.lat, region.lng], zoom, {
      animate: true,
      duration: 0.6,
    });
    if (region.isSpecificUnit) {
      placeOrMoveMarker(region.lat, region.lng, false);
      setCoords({ lat: region.lat, lng: region.lng });
      setAddressText(region.label);
      setMapMeta({
        referenceName: region.label,
        district: region.district,
        city: region.city,
      });
      setStatusNote('');
    } else {
      setStatusNote(
        `Đã chuyển bản đồ đến ${region.label}. Hãy nhấp trực tiếp lên bản đồ hoặc tìm địa chỉ chi tiết.`,
      );
    }
  };

  const handleSelectSuggestion = (item: GeocodedAddressResult) => {
    setCoords({ lat: item.lat, lng: item.lng });
    setAddressText(item.shortAddress);
    setMapMeta({
      referenceName: item.shortAddress || item.displayName,
      road: item.road,
      district: item.district,
      city: item.city,
    });
    setSearchResults([]);
    setStatusNote('');
    placeOrMoveMarker(item.lat, item.lng, true, item.isApproximateArea ? 14 : 16);
  };

  const handleSearchOnMap = async () => {
    const q = addressText.trim();
    if (q.length < 2) {
      setStatusNote('Vui lòng nhập ít nhất 2 ký tự để tìm địa chỉ trên bản đồ.');
      return;
    }
    setIsSearching(true);
    setStatusNote('');
    const results = await searchAddressNominatim(q);
    setIsSearching(false);

    if (results.length === 1) {
      handleSelectSuggestion(results[0]);
      return;
    }

    setSearchResults(results);
    if (results.length > 0) {
      const top = results[0];
      mapRef.current?.flyTo(
        [top.lat, top.lng],
        top.isApproximateArea ? 13 : 15,
        { animate: true, duration: 0.6 },
      );
    } else {
      setStatusNote(
        'Không tìm thấy địa danh khớp. Hãy chọn Tỉnh/Thành ở mục phía trên rồi nhấp trực tiếp vị trí nhận hàng trên bản đồ.',
      );
    }
  };

  const handleUseCurrentGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatusNote('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    setIsReversing(true);
    setStatusNote('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        placeOrMoveMarker(lat, lng, true);
        void handlePinMoved(lat, lng);
      },
      (err) => {
        setIsReversing(false);
        setStatusNote(`Không thể lấy GPS thiết bị: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Quick Region Jump + Address Input + Map Search Trigger */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <label
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#334155',
            }}
          >
            Địa chỉ chi tiết (Khớp với ghim trên bản đồ toàn Việt Nam) *
          </label>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleQuickRegionSelect(e.target.value);
              }
            }}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#0F172A',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="">-- Bay nhanh đến Tỉnh / Thành --</option>
            {VN_REGION_ANCHORS.map((r) => (
              <option key={r.label} value={r.label}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="VD: 100 Lý Thường Kiệt, P. Nam Đông Hà, Quảng Trị hoặc 33 Lê Duẩn, Q.1"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSearchOnMap();
                }
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: `1.5px solid ${
                  isSynced ? '#16A34A' : addressText.trim() ? '#F59E0B' : '#CBD5E1'
                }`,
                fontSize: '0.85rem',
                background: '#FFFFFF',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSearchOnMap()}
            disabled={isSearching}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 8,
              background: '#0F172A',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isSearching ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isSearching ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Search size={14} />
            )}
            Tìm trên bản đồ
          </button>
          <button
            type="button"
            onClick={handleUseCurrentGps}
            disabled={isReversing}
            title="Lấy vị trí GPS hiện tại"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '9px 12px',
              borderRadius: 8,
              background: '#ECFEFF',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Crosshair size={14} />
            GPS
          </button>
        </div>

        {/* Nominatim Autocomplete Suggestions */}
        {searchResults.length > 0 && (
          <div
            style={{
              marginTop: 6,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 10,
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
              overflow: 'hidden',
              maxHeight: 190,
              overflowY: 'auto',
            }}
          >
            {searchResults.map((item, idx) => (
              <button
                key={`${item.lat}-${item.lng}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 12px',
                  borderBottom:
                    idx < searchResults.length - 1
                      ? '1px solid #F1F5F9'
                      : 'none',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <MapPin
                  size={15}
                  color="#00B14F"
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0F172A',
                    }}
                  >
                    {item.shortAddress}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748B',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.displayName}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Leaflet Map Canvas */}
      <div
        style={{
          position: 'relative',
          height,
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #CBD5E1',
          background: '#E2E8F0',
        }}
      >
        <div
          ref={mapContainerRef}
          style={{ height: '100%', width: '100%', zIndex: 1, cursor: 'crosshair' }}
        />

        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 450,
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#FFFFFF',
            padding: '5px 10px',
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {isReversing
            ? 'Đang tra cứu địa chỉ tại điểm ghim...'
            : 'Nhấp lên bản đồ hoặc kéo ghim xanh tới vị trí nhận món'}
        </div>
      </div>

      {/* Consistency Validation Banner */}
      {isSynced && coords ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#15803D',
            fontSize: '0.78rem',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span>
            Địa chỉ đã khớp chuẩn với bản đồ ({coords.lat.toFixed(5)},{' '}
            {coords.lng.toFixed(5)})
          </span>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#B45309',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {statusNote ||
              (coords && mapMeta
                ? 'Nội dung địa chỉ bạn sửa chưa khớp đường/quận của ghim bản đồ — hãy bấm "Tìm trên bản đồ" hoặc nhấp lại vị trí đúng trên bản đồ.'
                : 'Chưa xác thực vị trí trên bản đồ. Hãy nhập địa chỉ rồi bấm "Tìm trên bản đồ" hoặc nhấp chọn điểm trực tiếp trên bản đồ.')}
          </span>
        </div>
      )}
    </div>
  );
};

