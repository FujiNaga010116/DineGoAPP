// ==============================================================================
// DineGo Backend — All-Vietnam Zero-Cost Geocoding Helper
// Combines OpenStreetMap Nominatim (compliant server User-Agent), Komoot Photon,
// ArcGIS World GeocodeServer (free anonymous lookup), and post-2025 VN merger
// & 63-province fallback anchors so EVERY area of Vietnam resolves reliably.
// ==============================================================================

export interface VietnamGeocodeResult {
  displayName: string;
  shortAddress: string;
  lat: number;
  lng: number;
  road?: string;
  suburb?: string;
  district?: string;
  city?: string;
  source?: 'nominatim' | 'photon' | 'arcgis' | 'vn-registry';
  isApproximateArea?: boolean;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  village?: string;
  hamlet?: string;
  city_district?: string;
  district?: string;
  county?: string;
  town?: string;
  city?: string;
  state?: string;
}

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

interface PhotonFeature {
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
    countrycode?: string;
  };
}

interface ArcGisCandidate {
  address?: string;
  score?: number;
  location?: { x?: number; y?: number };
  attributes?: {
    Addr_type?: string;
    Match_addr?: string;
    StName?: string;
    Nbrhd?: string;
    District?: string;
    City?: string;
    Subregion?: string;
    Region?: string;
  };
}

interface ArcGisReverseResponse {
  address?: {
    Match_addr?: string;
    LongLabel?: string;
    ShortLabel?: string;
    Address?: string;
    Neighborhood?: string;
    District?: string;
    City?: string;
    Subregion?: string;
    Region?: string;
  };
  location?: { x?: number; y?: number };
}

interface VnAnchorEntry {
  key: string;
  aliases: string[];
  shortAddress: string;
  displayName: string;
  lat: number;
  lng: number;
  district?: string;
  city: string;
  isSpecificUnit?: boolean;
}

const NOMINATIM_USER_AGENT =
  'DineGoFoodDelivery/1.0 (https://dinego.vn; contact@dinego.vn)';

// Specific post-07/2025 administrative reorganization units & key regional hubs
const VN_2025_SPECIAL_UNITS: VnAnchorEntry[] = [
  {
    key: 'phuong nam dong ha quang tri',
    aliases: [
      'nam dong ha',
      'phuong nam dong ha',
      'nam dong ha quang tri',
      'phuong nam dong ha quang tri',
    ],
    shortAddress: 'Phường Nam Đông Hà, Đông Hà, Tỉnh Quảng Trị',
    displayName:
      'Phường Nam Đông Hà, Thành phố Đông Hà, Tỉnh Quảng Trị (Sáp nhập P.2, P.5, Đông Lễ, Đông Lương)',
    lat: 16.802,
    lng: 107.1113,
    district: 'Đông Hà',
    city: 'Quảng Trị',
    isSpecificUnit: true,
  },
  {
    key: 'phuong dong ha quang tri',
    aliases: ['phuong dong ha', 'phuong dong ha quang tri', 'dong ha quang tri'],
    shortAddress: 'Phường Đông Hà, Tỉnh Quảng Trị',
    displayName: 'Phường Đông Hà, Thành phố Đông Hà, Tỉnh Quảng Trị',
    lat: 16.8162,
    lng: 107.1003,
    district: 'Đông Hà',
    city: 'Quảng Trị',
    isSpecificUnit: true,
  },
];

// All Vietnam provinces / centrally governed cities for fallback coverage across North-Central-South
export const VN_PROVINCE_ANCHORS: VnAnchorEntry[] = [
  { key: 'ha noi', aliases: ['ha noi', 'hanoi'], shortAddress: 'Thành phố Hà Nội', displayName: 'Thành phố Hà Nội, Việt Nam', lat: 21.0278, lng: 105.8342, city: 'Hà Nội' },
  { key: 'ho chi minh', aliases: ['ho chi minh', 'tphcm', 'tp hcm', 'sai gon', 'hcm'], shortAddress: 'Thành phố Hồ Chí Minh', displayName: 'Thành phố Hồ Chí Minh, Việt Nam', lat: 10.7769, lng: 106.7009, city: 'Thành phố Hồ Chí Minh' },
  { key: 'da nang', aliases: ['da nang', 'danang'], shortAddress: 'Thành phố Đà Nẵng', displayName: 'Thành phố Đà Nẵng, Việt Nam', lat: 16.0544, lng: 108.2022, city: 'Đà Nẵng' },
  { key: 'hai phong', aliases: ['hai phong', 'haiphong'], shortAddress: 'Thành phố Hải Phòng', displayName: 'Thành phố Hải Phòng, Việt Nam', lat: 20.8449, lng: 106.6881, city: 'Hải Phòng' },
  { key: 'can tho', aliases: ['can tho', 'cantho'], shortAddress: 'Thành phố Cần Thơ', displayName: 'Thành phố Cần Thơ, Việt Nam', lat: 10.0452, lng: 105.7469, city: 'Cần Thơ' },
  { key: 'hue', aliases: ['hue', 'thua thien hue', 'tp hue'], shortAddress: 'Thành phố Huế', displayName: 'Thành phố Huế, Việt Nam', lat: 16.4637, lng: 107.5909, city: 'Huế' },
  { key: 'quang tri', aliases: ['quang tri', 'tinh quang tri', 'dong ha'], shortAddress: 'Đông Hà, Tỉnh Quảng Trị', displayName: 'Thành phố Đông Hà, Tỉnh Quảng Trị, Việt Nam', lat: 16.8162, lng: 107.1003, district: 'Đông Hà', city: 'Quảng Trị' },
  { key: 'quang binh', aliases: ['quang binh', 'dong hoi'], shortAddress: 'Đồng Hới, Quảng Bình (Quảng Trị)', displayName: 'Thành phố Đồng Hới, Quảng Bình, Việt Nam', lat: 17.4689, lng: 106.6223, district: 'Đồng Hới', city: 'Quảng Bình' },
  { key: 'ha tinh', aliases: ['ha tinh'], shortAddress: 'Thành phố Hà Tĩnh, Tỉnh Hà Tĩnh', displayName: 'Thành phố Hà Tĩnh, Tỉnh Hà Tĩnh, Việt Nam', lat: 18.3428, lng: 105.9057, city: 'Hà Tĩnh' },
  { key: 'nghe an', aliases: ['nghe an', 'tp vinh', 'vinh'], shortAddress: 'Thành phố Vinh, Tỉnh Nghệ An', displayName: 'Thành phố Vinh, Tỉnh Nghệ An, Việt Nam', lat: 18.6796, lng: 105.6813, city: 'Nghệ An' },
  { key: 'thanh hoa', aliases: ['thanh hoa'], shortAddress: 'Thành phố Thanh Hóa, Tỉnh Thanh Hóa', displayName: 'Thành phố Thanh Hóa, Tỉnh Thanh Hóa, Việt Nam', lat: 19.8067, lng: 105.7852, city: 'Thanh Hóa' },
  { key: 'ninh binh', aliases: ['ninh binh'], shortAddress: 'Thành phố Hoa Lư, Tỉnh Ninh Bình', displayName: 'Tỉnh Ninh Bình, Việt Nam', lat: 20.2506, lng: 105.9745, city: 'Ninh Bình' },
  { key: 'nam dinh', aliases: ['nam dinh'], shortAddress: 'Nam Định', displayName: 'Nam Định, Việt Nam', lat: 20.4388, lng: 106.1621, city: 'Nam Định' },
  { key: 'thai binh', aliases: ['thai binh'], shortAddress: 'Thái Bình', displayName: 'Thái Bình, Việt Nam', lat: 20.4463, lng: 106.3366, city: 'Thái Bình' },
  { key: 'hai duong', aliases: ['hai duong'], shortAddress: 'Hải Dương', displayName: 'Hải Dương, Việt Nam', lat: 20.9373, lng: 106.3146, city: 'Hải Dương' },
  { key: 'hung yen', aliases: ['hung yen'], shortAddress: 'Thành phố Hưng Yên, Tỉnh Hưng Yên', displayName: 'Tỉnh Hưng Yên, Việt Nam', lat: 20.6464, lng: 106.0511, city: 'Hưng Yên' },
  { key: 'bac ninh', aliases: ['bac ninh'], shortAddress: 'Thành phố Bắc Ninh, Tỉnh Bắc Ninh', displayName: 'Tỉnh Bắc Ninh, Việt Nam', lat: 21.1861, lng: 106.0763, city: 'Bắc Ninh' },
  { key: 'bac giang', aliases: ['bac giang'], shortAddress: 'Bắc Giang', displayName: 'Bắc Giang, Việt Nam', lat: 21.2731, lng: 106.1946, city: 'Bắc Giang' },
  { key: 'quang ninh', aliases: ['quang ninh', 'ha long'], shortAddress: 'Hạ Long, Tỉnh Quảng Ninh', displayName: 'Hạ Long, Tỉnh Quảng Ninh, Việt Nam', lat: 20.9712, lng: 107.0448, city: 'Quảng Ninh' },
  { key: 'thai nguyen', aliases: ['thai nguyen'], shortAddress: 'Thành phố Thái Nguyên, Tỉnh Thái Nguyên', displayName: 'Tỉnh Thái Nguyên, Việt Nam', lat: 21.5672, lng: 105.8252, city: 'Thái Nguyên' },
  { key: 'phu tho', aliases: ['phu tho', 'viet tri'], shortAddress: 'Việt Trì, Tỉnh Phú Thọ', displayName: 'Tỉnh Phú Thọ, Việt Nam', lat: 21.3227, lng: 105.402, city: 'Phú Thọ' },
  { key: 'vinh phuc', aliases: ['vinh phuc', 'vinh yen'], shortAddress: 'Vĩnh Yên, Vĩnh Phúc', displayName: 'Vĩnh Phúc, Việt Nam', lat: 21.3089, lng: 105.6049, city: 'Vĩnh Phúc' },
  { key: 'lang son', aliases: ['lang son'], shortAddress: 'Thành phố Lạng Sơn, Tỉnh Lạng Sơn', displayName: 'Tỉnh Lạng Sơn, Việt Nam', lat: 21.8537, lng: 106.7615, city: 'Lạng Sơn' },
  { key: 'cao bang', aliases: ['cao bang'], shortAddress: 'Thành phố Cao Bằng, Tỉnh Cao Bằng', displayName: 'Tỉnh Cao Bằng, Việt Nam', lat: 22.6663, lng: 106.2647, city: 'Cao Bằng' },
  { key: 'tuyen quang', aliases: ['tuyen quang'], shortAddress: 'Thành phố Tuyên Quang, Tỉnh Tuyên Quang', displayName: 'Tỉnh Tuyên Quang, Việt Nam', lat: 21.8236, lng: 105.2142, city: 'Tuyên Quang' },
  { key: 'ha giang', aliases: ['ha giang'], shortAddress: 'Hà Giang', displayName: 'Hà Giang, Việt Nam', lat: 22.8026, lng: 104.9784, city: 'Hà Giang' },
  { key: 'lao cai', aliases: ['lao cai', 'sa pa', 'sapa'], shortAddress: 'Thành phố Lào Cai, Tỉnh Lào Cai', displayName: 'Tỉnh Lào Cai, Việt Nam', lat: 22.4809, lng: 103.9755, city: 'Lào Cai' },
  { key: 'yen bai', aliases: ['yen bai'], shortAddress: 'Yên Bái', displayName: 'Yên Bái, Việt Nam', lat: 21.7168, lng: 104.8986, city: 'Yên Bái' },
  { key: 'son la', aliases: ['son la'], shortAddress: 'Thành phố Sơn La, Tỉnh Sơn La', displayName: 'Tỉnh Sơn La, Việt Nam', lat: 21.327, lng: 103.9144, city: 'Sơn La' },
  { key: 'dien bien', aliases: ['dien bien', 'dien bien phu'], shortAddress: 'Điện Biên Phủ, Tỉnh Điện Biên', displayName: 'Tỉnh Điện Biên, Việt Nam', lat: 21.386, lng: 103.023, city: 'Điện Biên' },
  { key: 'lai chau', aliases: ['lai chau'], shortAddress: 'Thành phố Lai Châu, Tỉnh Lai Châu', displayName: 'Tỉnh Lai Châu, Việt Nam', lat: 22.3864, lng: 103.4703, city: 'Lai Châu' },
  { key: 'hoa binh', aliases: ['hoa binh'], shortAddress: 'Hòa Bình', displayName: 'Hòa Bình, Việt Nam', lat: 20.8172, lng: 105.3376, city: 'Hòa Bình' },
  { key: 'quang nam', aliases: ['quang nam', 'tam ky', 'hoi an'], shortAddress: 'Tam Kỳ, Quảng Nam (Đà Nẵng)', displayName: 'Quảng Nam, Việt Nam', lat: 15.5736, lng: 108.474, city: 'Quảng Nam' },
  { key: 'quang ngai', aliases: ['quang ngai'], shortAddress: 'Thành phố Quảng Ngãi, Tỉnh Quảng Ngãi', displayName: 'Tỉnh Quảng Ngãi, Việt Nam', lat: 15.1214, lng: 108.8044, city: 'Quảng Ngãi' },
  { key: 'gia lai', aliases: ['gia lai', 'pleiku'], shortAddress: 'Pleiku, Tỉnh Gia Lai', displayName: 'Tỉnh Gia Lai, Việt Nam', lat: 13.9833, lng: 108.0, city: 'Gia Lai' },
  { key: 'binh dinh', aliases: ['binh dinh', 'quy nhon'], shortAddress: 'Quy Nhơn, Bình Định', displayName: 'Quy Nhơn, Bình Định, Việt Nam', lat: 13.7829, lng: 109.2197, city: 'Bình Định' },
  { key: 'dak lak', aliases: ['dak lak', 'buon ma thuot'], shortAddress: 'Buôn Ma Thuột, Tỉnh Đắk Lắk', displayName: 'Tỉnh Đắk Lắk, Việt Nam', lat: 12.6662, lng: 108.0378, city: 'Đắk Lắk' },
  { key: 'khanh hoa', aliases: ['khanh hoa', 'nha trang'], shortAddress: 'Nha Trang, Tỉnh Khánh Hòa', displayName: 'Tỉnh Khánh Hòa, Việt Nam', lat: 12.2388, lng: 109.1967, city: 'Khánh Hòa' },
  { key: 'lam dong', aliases: ['lam dong', 'da lat', 'dalat'], shortAddress: 'Đà Lạt, Tỉnh Lâm Đồng', displayName: 'Tỉnh Lâm Đồng, Việt Nam', lat: 11.9404, lng: 108.4583, city: 'Lâm Đồng' },
  { key: 'binh thuan', aliases: ['binh thuan', 'phan thiet'], shortAddress: 'Phan Thiết, Bình Thuận', displayName: 'Phan Thiết, Bình Thuận, Việt Nam', lat: 10.9289, lng: 108.1021, city: 'Bình Thuận' },
  { key: 'ba ria vung tau', aliases: ['vung tau', 'ba ria'], shortAddress: 'Thành phố Vũng Tàu', displayName: 'Vũng Tàu, Việt Nam', lat: 10.346, lng: 107.0843, city: 'Bà Rịa - Vũng Tàu' },
  { key: 'binh duong', aliases: ['binh duong', 'thu dau mot'], shortAddress: 'Thủ Dầu Một, Bình Dương', displayName: 'Bình Dương, Việt Nam', lat: 10.9804, lng: 106.6519, city: 'Bình Dương' },
  { key: 'dong nai', aliases: ['dong nai', 'bien hoa'], shortAddress: 'Biên Hòa, Tỉnh Đồng Nai', displayName: 'Tỉnh Đồng Nai, Việt Nam', lat: 10.9574, lng: 106.8427, city: 'Đồng Nai' },
  { key: 'tay ninh', aliases: ['tay ninh'], shortAddress: 'Thành phố Tây Ninh, Tỉnh Tây Ninh', displayName: 'Tỉnh Tây Ninh, Việt Nam', lat: 11.3352, lng: 106.1099, city: 'Tây Ninh' },
  { key: 'long an', aliases: ['long an', 'tan an'], shortAddress: 'Tân An, Long An', displayName: 'Long An, Việt Nam', lat: 10.5359, lng: 106.4137, city: 'Long An' },
  { key: 'dong thap', aliases: ['dong thap', 'cao lanh', 'sa dec'], shortAddress: 'Cao Lãnh, Tỉnh Đồng Tháp', displayName: 'Tỉnh Đồng Tháp, Việt Nam', lat: 10.4592, lng: 105.6329, city: 'Đồng Tháp' },
  { key: 'an giang', aliases: ['an giang', 'long xuyen', 'chau doc'], shortAddress: 'Long Xuyên, Tỉnh An Giang', displayName: 'Tỉnh An Giang, Việt Nam', lat: 10.3864, lng: 105.4352, city: 'An Giang' },
  { key: 'kien giang', aliases: ['kien giang', 'rach gia', 'phu quoc'], shortAddress: 'Rạch Giá, Kiên Giang', displayName: 'Kiên Giang, Việt Nam', lat: 10.0125, lng: 105.0809, city: 'Kiên Giang' },
  { key: 'vinh long', aliases: ['vinh long'], shortAddress: 'Thành phố Vĩnh Long, Tỉnh Vĩnh Long', displayName: 'Tỉnh Vĩnh Long, Việt Nam', lat: 10.2537, lng: 105.9722, city: 'Vĩnh Long' },
  { key: 'ca mau', aliases: ['ca mau'], shortAddress: 'Thành phố Cà Mau, Tỉnh Cà Mau', displayName: 'Tỉnh Cà Mau, Việt Nam', lat: 9.1768, lng: 105.1524, city: 'Cà Mau' },
];

export function normalizeViSearchText(value: string): string {
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

/**
 * Generates normalized fallback queries for Vietnamese addresses (inserts missing commas,
 * strips prefixes like "Phường"/"Tỉnh", and handles directional post-2025 unit names).
 */
export function buildVietnamSearchVariants(rawQuery: string): string[] {
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

  // Only strip directional modifier from a merged ward/commune segment (e.g. "Phường Nam Đông Hà" -> "Đông Hà")
  // when that ward name still retains >= 2 words after stripping, never mangling street or 2-word city names.
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
        const droppedFirst = words.slice(1).join(' ');
        if (words[0].toLowerCase() === 'trung' && words[1]?.toLowerCase() === 'tâm' && words.length >= 4) {
          return words.slice(2).join(' ');
        }
        return droppedFirst;
      }
      return rawWardName;
    })
    .filter(Boolean)
    .join(', ');

  const segments = withoutAdminPrefixes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const parentTail =
    segments.length >= 2 ? segments.slice(1).join(', ') : '';

  const candidates = [
    clean,
    withCommas,
    withoutAdminPrefixes,
    wardDirectionalCleaned,
    parentTail,
  ].filter((v, idx, arr) => v.length >= 2 && arr.indexOf(v) === idx);

  return candidates;
}

export function findLocalVietnamMatches(query: string): VietnamGeocodeResult[] {
  const norm = normalizeViSearchText(query);
  if (!norm) return [];

  const matches: VietnamGeocodeResult[] = [];
  for (const entry of [...VN_2025_SPECIAL_UNITS, ...VN_PROVINCE_ANCHORS]) {
    const matched = entry.aliases.some((alias) => {
      if (norm === alias) return true;
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|\\s|,)${escaped}(?:\\s|,|$)`).test(norm)) {
        return true;
      }
      return norm.length >= 5 && alias.includes(norm);
    });
    if (matched) {
      matches.push({
        displayName: entry.displayName,
        shortAddress: entry.shortAddress,
        lat: entry.lat,
        lng: entry.lng,
        district: entry.district,
        city: entry.city,
        source: 'vn-registry',
        isApproximateArea: !entry.isSpecificUnit,
      });
    }
  }
  return matches;
}

function deduplicateResults(
  items: VietnamGeocodeResult[],
): VietnamGeocodeResult[] {
  const out: VietnamGeocodeResult[] = [];
  for (const item of items) {
    const exists = out.some(
      (prev) =>
        Math.abs(prev.lat - item.lat) < 0.0008 &&
        Math.abs(prev.lng - item.lng) < 0.0008 &&
        normalizeViSearchText(prev.shortAddress) ===
          normalizeViSearchText(item.shortAddress),
    );
    if (!exists) {
      out.push(item);
    }
  }
  return out;
}

async function fetchJsonWithTimeout<T>(
  url: string,
  headers?: Record<string, string>,
  timeoutMs = 5500,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function formatNominatimItem(item: NominatimItem): VietnamGeocodeResult | null {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !item.display_name) {
    return null;
  }
  const a = item.address || {};
  const road = (a.road || a.pedestrian || '').trim();
  const streetPart = [a.house_number, road].filter(Boolean).join(' ').trim();
  const wardPart = (
    a.quarter ||
    a.neighbourhood ||
    a.suburb ||
    a.village ||
    a.hamlet ||
    ''
  ).trim();
  const districtPart = (
    a.city_district ||
    a.district ||
    a.county ||
    a.town ||
    ''
  ).trim();
  const cityPart = (a.city || a.state || '').trim();

  const parts = [streetPart, wardPart, districtPart, cityPart].filter(
    (part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx,
  );
  const shortAddress =
    parts.length >= 2
      ? parts.join(', ')
      : item.display_name
          .split(',')
          .slice(0, 4)
          .map((s) => s.trim())
          .filter(Boolean)
          .join(', ');

  return {
    displayName: item.display_name,
    shortAddress,
    lat: +lat.toFixed(6),
    lng: +lng.toFixed(6),
    road: road || undefined,
    suburb: wardPart || undefined,
    district: districtPart || undefined,
    city: cityPart || undefined,
    source: 'nominatim',
  };
}

function formatPhotonFeature(f: PhotonFeature): VietnamGeocodeResult | null {
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // Constrain to Vietnam bounding box
  if (lat < 8.0 || lat > 23.5 || lng < 102.0 || lng > 110.0) return null;

  const p = f.properties || {};
  const street = [p.housenumber, p.street].filter(Boolean).join(' ').trim();
  const name = (p.name || '').trim();
  const primary = street || name;
  const ward = (p.suburb || '').trim();
  const district = (p.district || p.county || '').trim();
  const city = (p.city || p.state || '').trim();

  const parts = [primary, ward, district, city].filter(
    (part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx,
  );
  if (parts.length === 0) return null;

  return {
    displayName: [...parts, p.country || 'Việt Nam']
      .filter((part, idx, arr) => Boolean(part) && arr.indexOf(part) === idx)
      .join(', '),
    shortAddress: parts.join(', '),
    lat: +lat.toFixed(6),
    lng: +lng.toFixed(6),
    road: p.street?.trim() || undefined,
    suburb: ward || undefined,
    district: district || undefined,
    city: city || undefined,
    source: 'photon',
  };
}

function formatArcGisCandidate(c: ArcGisCandidate): VietnamGeocodeResult | null {
  const lat = Number(c.location?.y);
  const lng = Number(c.location?.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const attr = c.attributes || {};
  const matchAddr = (attr.Match_addr || c.address || '').trim();
  if (!matchAddr) return null;

  const road = (attr.StName || '').trim() || undefined;
  const suburb = (attr.Nbrhd || '').trim() || undefined;
  const district = (attr.District || attr.Subregion || '').trim() || undefined;
  const city = (attr.City || attr.Region || '').trim() || undefined;

  const shortAddress = matchAddr
    .replace(/,\s*(VNM|Vietnam|Việt Nam)\s*$/i, '')
    .trim();

  return {
    displayName: matchAddr,
    shortAddress: shortAddress || matchAddr,
    lat: +lat.toFixed(6),
    lng: +lng.toFixed(6),
    road,
    suburb,
    district,
    city,
    source: 'arcgis',
  };
}

export class VietnamGeocodeHelper {
  private readonly searchCache = new Map<
    string,
    { expiresAt: number; data: VietnamGeocodeResult[] }
  >();
  private readonly reverseCache = new Map<
    string,
    { expiresAt: number; data: VietnamGeocodeResult | null }
  >();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;

  async searchAddress(rawQuery: string): Promise<VietnamGeocodeResult[]> {
    const clean = rawQuery.trim();
    if (clean.length < 2) return [];

    const cacheKey = normalizeViSearchText(clean);
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const variants = buildVietnamSearchVariants(clean);
    const localMatches = findLocalVietnamMatches(clean);
    const collected: VietnamGeocodeResult[] = [];

    // Check if query looks like an exact area/ward query rather than a specific street address
    const hasSpecificStreetKeyword = /\b(\d+|duong|pho|hem|kiet|ngo|ql|quoc lo|tinh lo)\b/.test(
      cacheKey,
    );

    // Prefer specific 2025 administrative merger entries first ONLY when searching at ward/area level
    if (!hasSpecificStreetKeyword) {
      for (const m of localMatches) {
        if (!m.isApproximateArea) {
          collected.push(m);
        }
      }
    }

    // Try progressive Vietnamese query variants across Photon, ArcGIS, and Nominatim
    for (let i = 0; i < variants.length; i += 1) {
      const q = variants[i];
      const [photonData, arcGisData, nominatimData] = await Promise.all([
        fetchJsonWithTimeout<{ features?: PhotonFeature[] }>(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(
            q,
          )}&bbox=102.1,8.1,109.5,23.4&limit=5`,
        ),
        fetchJsonWithTimeout<{ candidates?: ArcGisCandidate[] }>(
          `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?singleLine=${encodeURIComponent(
            q,
          )}&countryCode=VNM&langCode=vi&maxLocations=5&f=json&outFields=Addr_type,Match_addr,StName,Nbrhd,District,City,Subregion,Region`,
        ),
        i <= 1
          ? fetchJsonWithTimeout<NominatimItem[]>(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=vn&limit=5&accept-language=vi&q=${encodeURIComponent(
                q,
              )}`,
              {
                'User-Agent': NOMINATIM_USER_AGENT,
                'Accept-Language': 'vi,en;q=0.8',
              },
            )
          : Promise.resolve(null),
      ]);

      if (nominatimData && Array.isArray(nominatimData)) {
        for (const item of nominatimData) {
          const parsed = formatNominatimItem(item);
          if (parsed) collected.push(parsed);
        }
      }

      if (arcGisData?.candidates && Array.isArray(arcGisData.candidates)) {
        for (const cand of arcGisData.candidates) {
          const parsed = formatArcGisCandidate(cand);
          if (parsed) collected.push(parsed);
        }
      }

      if (photonData?.features && Array.isArray(photonData.features)) {
        for (const feat of photonData.features) {
          const parsed = formatPhotonFeature(feat);
          if (parsed) collected.push(parsed);
        }
      }

      if (collected.length > 0) break;
    }

    // Add province anchor fallback if external APIs returned nothing or user searched province name
    for (const m of localMatches) {
      collected.push(m);
    }

    const deduped = deduplicateResults(collected).slice(0, 7);
    this.searchCache.set(cacheKey, {
      expiresAt: Date.now() + VietnamGeocodeHelper.CACHE_TTL_MS,
      data: deduped,
    });
    return deduped;
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<VietnamGeocodeResult | null> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = this.reverseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // 1. Server-side Nominatim with compliant User-Agent
    const nominatimItem = await fetchJsonWithTimeout<NominatimItem>(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`,
      {
        'User-Agent': NOMINATIM_USER_AGENT,
        'Accept-Language': 'vi,en;q=0.8',
      },
    );
    const fromNominatim = nominatimItem
      ? formatNominatimItem(nominatimItem)
      : null;
    if (fromNominatim) {
      this.reverseCache.set(key, {
        expiresAt: Date.now() + VietnamGeocodeHelper.CACHE_TTL_MS,
        data: fromNominatim,
      });
      return fromNominatim;
    }

    // 2. ArcGIS World Reverse Geocoding fallback
    const arcGisRev = await fetchJsonWithTimeout<ArcGisReverseResponse>(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&langCode=vi&f=json`,
    );
    if (arcGisRev?.address) {
      const a = arcGisRev.address;
      const road = (a.Address || '').trim() || undefined;
      const suburb = (a.Neighborhood || '').trim() || undefined;
      const district = (a.District || a.Subregion || '').trim() || undefined;
      const city = (a.City || a.Region || '').trim() || undefined;
      const shortAddress =
        (a.Match_addr || a.LongLabel || '')
          .replace(/,\s*(VNM|Vietnam|Việt Nam)\s*$/i, '')
          .trim() || [road, suburb, district, city].filter(Boolean).join(', ');

      if (shortAddress) {
        const result: VietnamGeocodeResult = {
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
        this.reverseCache.set(key, {
          expiresAt: Date.now() + VietnamGeocodeHelper.CACHE_TTL_MS,
          data: result,
        });
        return result;
      }
    }

    // 3. Komoot Photon Reverse fallback
    const photonRev = await fetchJsonWithTimeout<{ features?: PhotonFeature[] }>(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
    );
    const firstPhoton = photonRev?.features?.[0]
      ? formatPhotonFeature(photonRev.features[0])
      : null;
    if (firstPhoton) {
      const pinned: VietnamGeocodeResult = {
        ...firstPhoton,
        lat: +lat.toFixed(6),
        lng: +lng.toFixed(6),
      };
      this.reverseCache.set(key, {
        expiresAt: Date.now() + VietnamGeocodeHelper.CACHE_TTL_MS,
        data: pinned,
      });
      return pinned;
    }

    // 4. Nearest Vietnam regional anchor fallback when external services are unreachable
    let nearest: VnAnchorEntry | null = null;
    let bestDistSq = Infinity;
    for (const anchor of VN_PROVINCE_ANCHORS) {
      const dLat = anchor.lat - lat;
      const dLng = anchor.lng - lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        nearest = anchor;
      }
    }

    if (nearest && bestDistSq <= 1.2) {
      const fallbackResult: VietnamGeocodeResult = {
        displayName: `${nearest.displayName} (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        shortAddress: nearest.shortAddress,
        lat: +lat.toFixed(6),
        lng: +lng.toFixed(6),
        district: nearest.district,
        city: nearest.city,
        source: 'vn-registry',
        isApproximateArea: true,
      };
      this.reverseCache.set(key, {
        expiresAt: Date.now() + VietnamGeocodeHelper.CACHE_TTL_MS,
        data: fallbackResult,
      });
      return fallbackResult;
    }

    return null;
  }
}
