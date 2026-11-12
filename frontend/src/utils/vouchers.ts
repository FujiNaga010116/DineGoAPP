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

// Legacy demo IDs that should be stripped so only real Merchant/Admin created vouchers exist
const LEGACY_SEED_VOUCHER_IDS = new Set([
  'v-01',
  'v-02',
  'v-03',
  'v-04',
  'v-05',
  'v-06',
  'v-07',
]);

export const DEFAULT_ADMIN_VOUCHERS: ManagedVoucher[] = [];

const sanitizeVoucherList = (list: ManagedVoucher[]): ManagedVoucher[] =>
  list
    .filter((v) => v && v.id && !LEGACY_SEED_VOUCHER_IDS.has(String(v.id)))
    .map((v: ManagedVoucher) => ({
      ...v,
      merchantId: v.merchantId || 'ALL',
      merchantName: v.merchantName || 'Toàn sàn DineGo',
      eventTheme: v.eventTheme || 'ALL_PLATFORM',
      eventTag: v.eventTag || 'Ưu đãi toàn sàn',
      claimedCount: v.claimedCount ?? v.usageCount ?? 0,
      isFlashHunt: v.isFlashHunt !== false,
    }));

export const loadAdminVouchers = (): ManagedVoucher[] => {
  try {
    const saved = localStorage.getItem(ADMIN_VOUCHERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleaned = sanitizeVoucherList(parsed);
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(ADMIN_VOUCHERS_KEY, JSON.stringify(cleaned));
        }
        return cleaned;
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
  const cleaned = sanitizeVoucherList(vouchers);
  const serialized = JSON.stringify(cleaned);
  try {
    localStorage.setItem(ADMIN_VOUCHERS_KEY, serialized);
    window.dispatchEvent(new CustomEvent('dinego_vouchers_updated'));
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('dinego_vouchers_sync');
      ch.postMessage(serialized);
      ch.close();
    }
  } catch {
    // Ignore storage errors
  }
  if (syncBackend) {
    void fetch(`${API_BASE_URL}/promotions/live/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vouchers: cleaned }),
    }).catch(() => {});
  }
};

export const fetchRemoteAdminVouchers = async (): Promise<ManagedVoucher[] | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/promotions/live`);
    if (!res.ok) return null;
    const data = (await res.json()) as { vouchers: ManagedVoucher[] | null };
    if (Array.isArray(data?.vouchers)) {
      const cleaned = sanitizeVoucherList(data.vouchers);
      // If backend still had legacy seed vouchers, push the cleaned list back to backend
      if (cleaned.length !== data.vouchers.length) {
        saveAdminVouchers(cleaned, true);
      } else {
        saveAdminVouchers(cleaned, false);
      }
      return cleaned;
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

