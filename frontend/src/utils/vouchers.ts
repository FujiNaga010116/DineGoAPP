// ==============================================================================
// DineGo Frontend — Shared Event & Holiday Store Voucher Store
// Synchronized between Admin Campaign Manager, Customer Voucher Hunt, Cart & Checkout
// ==============================================================================

import { API_BASE_URL } from '../api/client';

export type VoucherEventTheme =
  | 'FLASH_SALE'
  | 'GIANG_SINH'
  | 'TET_NGUYEN_DAN'
  | 'LE_30_4'
  | 'TRUNG_THU'
  | 'ALL_PLATFORM';

export interface ManagedVoucher {
  id: string;
  code: string;
  discountType: 'FIXED_AMOUNT' | 'PERCENTAGE';
  title: string;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrder: number;
  usageCount: number;
  claimedCount?: number;
  maxUsage: number;
  endDate: string;
  isActive: boolean;
  eventTheme?: VoucherEventTheme;
  eventTag?: string;
  merchantId?: string; // 'ALL' or specific merchant id
  merchantName?: string;
  isFlashHunt?: boolean;
}

export const ADMIN_VOUCHERS_KEY = 'dinego_admin_vouchers';
export const getUserClaimsKey = (userId: string) =>
  `dinego_user_claimed_vouchers_${userId}`;

export const EVENT_THEME_OPTIONS: {
  value: VoucherEventTheme;
  label: string;
  badgeColor: string;
  badgeBg: string;
}[] = [
  {
    value: 'FLASH_SALE',
    label: 'Sự Kiện Flash Sale Giờ Vàng',
    badgeColor: '#C2410C',
    badgeBg: '#FFEDD5',
  },
  {
    value: 'GIANG_SINH',
    label: 'Lễ Giáng Sinh An Lành',
    badgeColor: '#B91C1C',
    badgeBg: '#FEE2E2',
  },
  {
    value: 'TET_NGUYEN_DAN',
    label: 'Tết Nguyên Đán Sum Vầy',
    badgeColor: '#A16207',
    badgeBg: '#FEF3C7',
  },
  {
    value: 'LE_30_4',
    label: 'Đại Lễ 30/4 - 1/5',
    badgeColor: '#1D4ED8',
    badgeBg: '#DBEAFE',
  },
  {
    value: 'TRUNG_THU',
    label: 'Lễ Hội Trăng Rằm Trung Thu',
    badgeColor: '#7E22CE',
    badgeBg: '#F3E8FF',
  },
  {
    value: 'ALL_PLATFORM',
    label: 'Ưu đãi thường niên toàn sàn',
    badgeColor: '#047857',
    badgeBg: '#D1FAE5',
  },
];

export const getEventThemeStyle = (theme?: VoucherEventTheme) =>
  EVENT_THEME_OPTIONS.find((t) => t.value === theme) || EVENT_THEME_OPTIONS[5];

export const DEFAULT_ADMIN_VOUCHERS: ManagedVoucher[] = [
  {
    id: 'v-01',
    code: 'COMTAM40K',
    discountType: 'FIXED_AMOUNT',
    title: 'Giảm 40.000đ cho đơn Cơm Tấm từ 120.000đ',
    discountValue: 40000,
    minOrder: 120000,
    usageCount: 84,
    claimedCount: 145,
    maxUsage: 200,
    endDate: '2026-12-31',
    isActive: true,
    eventTheme: 'FLASH_SALE',
    eventTag: 'Flash Sale Bữa Trưa Quán Chuẩn',
    merchantId: 'merchant-com-tam',
    merchantName: 'Cơm Tấm Sài Gòn 1985',
    isFlashHunt: true,
  },
  {
    id: 'v-02',
    code: 'PHOTHIN25',
    discountType: 'PERCENTAGE',
    title: 'Giảm 25% (tối đa 45k) mừng Lễ Hội Ẩm Thực',
    discountValue: 25,
    maxDiscountAmount: 45000,
    minOrder: 90000,
    usageCount: 52,
    claimedCount: 112,
    maxUsage: 150,
    endDate: '2026-12-25',
    isActive: true,
    eventTheme: 'GIANG_SINH',
    eventTag: 'Ưu Đãi Mùa Lễ Giáng Sinh',
    merchantId: 'merchant-pho-thin',
    merchantName: 'Phở Thìn Lò Đúc 1979',
    isFlashHunt: true,
  },
  {
    id: 'v-03',
    code: 'GONGCHAXMAS',
    discountType: 'FIXED_AMOUNT',
    title: 'Giảm 35.000đ hóa đơn Trà Sữa từ 100.000đ',
    discountValue: 35000,
    minOrder: 100000,
    usageCount: 168,
    claimedCount: 240,
    maxUsage: 300,
    endDate: '2026-12-26',
    isActive: true,
    eventTheme: 'GIANG_SINH',
    eventTag: 'Noel Ngọt Ngào • Quán Tặng Deal',
    merchantId: 'merchant-gongcha',
    merchantName: 'Trà Sữa Gong Cha Premium',
    isFlashHunt: true,
  },
  {
    id: 'v-04',
    code: 'PIZZAFEST30',
    discountType: 'PERCENTAGE',
    title: 'Giảm 30% (tối đa 80k) cho tiệc Pizza & Pasta dịp Lễ',
    discountValue: 30,
    maxDiscountAmount: 80000,
    minOrder: 220000,
    usageCount: 39,
    claimedCount: 88,
    maxUsage: 120,
    endDate: '2026-12-31',
    isActive: true,
    eventTheme: 'LE_30_4',
    eventTag: 'Đại Tiệc Lễ Hội • Giảm Sâu 30%',
    merchantId: 'merchant-pizza',
    merchantName: 'Pizza Artisan & Pasta',
    isFlashHunt: true,
  },
  {
    id: 'v-05',
    code: 'DINEGO30',
    discountType: 'FIXED_AMOUNT',
    title: 'Giảm 30.000đ cho đơn toàn sàn từ 120.000đ',
    discountValue: 30000,
    minOrder: 120000,
    usageCount: 342,
    claimedCount: 390,
    maxUsage: 500,
    endDate: '2026-12-31',
    isActive: true,
    eventTheme: 'TET_NGUYEN_DAN',
    eventTag: 'Lì Xì Đầu Năm Toàn Sàn',
    merchantId: 'ALL',
    merchantName: 'Toàn sàn DineGo',
    isFlashHunt: true,
  },
  {
    id: 'v-06',
    code: 'FREESHIP15K',
    discountType: 'FIXED_AMOUNT',
    title: 'Miễn phí vận chuyển 15.000đ cho đơn từ 50.000đ',
    discountValue: 15000,
    minOrder: 50000,
    usageCount: 615,
    claimedCount: 720,
    maxUsage: 1000,
    endDate: '2026-12-15',
    isActive: true,
    eventTheme: 'ALL_PLATFORM',
    eventTag: 'Freeship Mọi Đơn Hàng',
    merchantId: 'ALL',
    merchantName: 'Toàn sàn DineGo',
    isFlashHunt: true,
  },
  {
    id: 'v-07',
    code: 'TIECVIP15',
    discountType: 'PERCENTAGE',
    title: 'Giảm 15% cho hợp đồng Đặt Tiệc từ 3.000.000đ',
    discountValue: 15,
    minOrder: 3000000,
    usageCount: 18,
    claimedCount: 35,
    maxUsage: 100,
    endDate: '2027-01-15',
    isActive: true,
    eventTheme: 'TRUNG_THU',
    eventTag: 'Ưu Đãi Đặt Tiệc Lễ Hội',
    merchantId: 'ALL',
    merchantName: 'Toàn sàn DineGo',
    isFlashHunt: false,
  },
];

export const loadAdminVouchers = (): ManagedVoucher[] => {
  try {
    const saved = localStorage.getItem(ADMIN_VOUCHERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((v: ManagedVoucher) => ({
          ...v,
          merchantId: v.merchantId || 'ALL',
          merchantName: v.merchantName || 'Toàn sàn DineGo',
          eventTheme: v.eventTheme || 'ALL_PLATFORM',
          eventTag: v.eventTag || 'Ưu đãi toàn sàn',
          claimedCount: v.claimedCount ?? v.usageCount ?? 0,
          isFlashHunt: v.isFlashHunt !== false,
        }));
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_ADMIN_VOUCHERS;
};

export const saveAdminVouchers = (
  vouchers: ManagedVoucher[],
  syncBackend = true,
) => {
  try {
    localStorage.setItem(ADMIN_VOUCHERS_KEY, JSON.stringify(vouchers));
  } catch {
    // Ignore storage errors
  }
  if (syncBackend) {
    void fetch(`${API_BASE_URL}/promotions/live/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vouchers }),
    }).catch(() => {});
  }
};

export const fetchRemoteAdminVouchers = async (): Promise<ManagedVoucher[] | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/promotions/live`);
    if (!res.ok) return null;
    const data = (await res.json()) as { vouchers: ManagedVoucher[] | null };
    if (Array.isArray(data?.vouchers) && data.vouchers.length > 0) {
      saveAdminVouchers(data.vouchers, false);
      return data.vouchers;
    }
  } catch {
    // Offline fallback
  }
  return null;
};

export const loadUserClaimedCodes = (userId?: string | null): string[] => {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getUserClaimsKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((c) => String(c).toUpperCase());
      }
    }
  } catch {
    // Ignore storage errors
  }
  return [];
};

export const saveUserClaimedCodes = (userId: string, codes: string[]) => {
  try {
    localStorage.setItem(
      getUserClaimsKey(userId),
      JSON.stringify(Array.from(new Set(codes.map((c) => c.toUpperCase())))),
    );
  } catch {
    // Ignore storage errors
  }
};

export const fetchRemoteUserClaimedCodes = async (
  userId?: string | null,
): Promise<string[] | null> => {
  if (!userId) return null;
  try {
    const res = await fetch(
      `${API_BASE_URL}/promotions/live/claims/${encodeURIComponent(userId)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { claimedCodes?: string[] };
    if (Array.isArray(data?.claimedCodes)) {
      const local = loadUserClaimedCodes(userId);
      const merged = Array.from(
        new Set([...local, ...data.claimedCodes.map((c) => String(c).toUpperCase())]),
      );
      saveUserClaimedCodes(userId, merged);
      return merged;
    }
  } catch {
    // Offline fallback
  }
  return null;
};

export const claimVoucherForAccount = async (
  userId: string,
  voucherCode: string,
): Promise<{ claimedCodes: string[]; updatedVouchers: ManagedVoucher[] }> => {
  const code = voucherCode.trim().toUpperCase();
  const currentCodes = loadUserClaimedCodes(userId);
  const alreadyClaimed = currentCodes.includes(code);
  const nextCodes = alreadyClaimed ? currentCodes : [...currentCodes, code];
  saveUserClaimedCodes(userId, nextCodes);

  let updatedVouchers = loadAdminVouchers();
  if (!alreadyClaimed) {
    updatedVouchers = updatedVouchers.map((v) =>
      v.code.toUpperCase() === code
        ? { ...v, claimedCount: Number(v.claimedCount || 0) + 1 }
        : v,
    );
    saveAdminVouchers(updatedVouchers, false);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/promotions/live/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        vouchers?: ManagedVoucher[] | null;
        claimedCodes?: string[];
      };
      if (Array.isArray(data?.vouchers) && data.vouchers.length > 0) {
        updatedVouchers = data.vouchers;
        saveAdminVouchers(updatedVouchers, false);
      } else {
        saveAdminVouchers(updatedVouchers, true);
      }
      if (Array.isArray(data?.claimedCodes)) {
        const merged = Array.from(new Set([...nextCodes, ...data.claimedCodes]));
        saveUserClaimedCodes(userId, merged);
        return { claimedCodes: merged, updatedVouchers };
      }
    }
  } catch {
    // Offline fallback
  }

  return { claimedCodes: nextCodes, updatedVouchers };
};

