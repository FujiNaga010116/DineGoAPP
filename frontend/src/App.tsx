// ==============================================================================
// DineGo Frontend — Main Application Container
// 4 Standalone Portals: Customer Storefront | Merchant Seller Center | Driver Console | Enterprise Admin
// - Every restaurant has its own merchant account (1-to-1)
// - Multiple drivers can register & manage their independent profiles (1-to-1)
// - Admin has deep system control & user management
// - Clean separate logout with NO role-switching buttons in each portal
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Header, type NavTab } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { RestaurantPage } from './pages/RestaurantPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { CateringPage } from './pages/CateringPage';
import { GroupOrderPage } from './pages/GroupOrderPage';
import { VoucherHuntPage } from './pages/VoucherHuntPage';
import { AiGuidePage } from './pages/AiGuidePage';
import { TrackingPage } from './pages/TrackingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomerProfilePage } from './pages/CustomerProfilePage';
import { AuthModal } from './components/common/AuthModal';
import { ReviewModal } from './components/common/ReviewModal';
import { MerchantRegistrationModal } from './components/common/MerchantRegistrationModal';
import { MerchantSetupScreen } from './components/common/MerchantSetupScreen';
import { AddressSetupModal } from './components/common/AddressSetupModal';
import { CartProvider } from './context/CartContext';
import { API_BASE_URL, MOCK_MERCHANTS, MOCK_MENU_ITEMS, MOCK_DRIVERS, MOCK_USERS, isDriverProfileVerified, adminApi } from './api/client';
import type {
  DeliveryDisputeReport,
  DriverProfile,
  DriverShift,
  DriverShiftTrip,
  Merchant,
  MenuItem,
  Order,
  OrderStatus,
  Role,
  SavedAddress,
  User,
} from './types';
import { QrCode, CheckCircle2 } from 'lucide-react';
import { pushActorNotification, pushMultiActorNotifications } from './utils/notifications';

function createDriverShiftRecord(driver: DriverProfile, existingShifts: DriverShift[]): DriverShift {
  const driverShiftCount = existingShifts.filter((s) => s.driverId === driver.id).length;
  const now = new Date();
  const datePart = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return {
    id: `shift-${now.getTime()}-${driverShiftCount + 1}`,
    shiftCode: `CA-${datePart}-${String(driverShiftCount + 1).padStart(2, '0')}`,
    driverId: driver.id,
    driverName: driver.fullName,
    operatingZone: driver.operatingZone || 'Chưa đăng ký',
    vehicleType: driver.vehicleType || 'Chưa đăng ký',
    licensePlate: driver.licensePlate || 'Chưa cập nhật',
    startedAt: now.toISOString(),
    endedAt: null,
    status: 'ACTIVE',
    tripsCount: 0,
    grossShippingEarned: 0,
    netIncomeEarned: 0,
    trips: [],
  };
}

interface AppContentProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

function hydrateSeedCustomerCoords(rawUser: User): User {
  const normalizedRoles: Role[] = Array.isArray(rawUser?.roles)
    ? rawUser.roles
    : (rawUser as any)?.role
      ? [(rawUser as any).role as Role]
      : ['CUSTOMER'];
  const user: User = { ...rawUser, roles: normalizedRoles };
  const seedMatch = MOCK_USERS.find((m) => m.id === user.id);
  if (!seedMatch || user.addressLat != null) return user;
  if (seedMatch.addressLat != null && seedMatch.address === user.address) {
    return {
      ...user,
      addressLat: seedMatch.addressLat,
      addressLng: seedMatch.addressLng,
      savedAddresses:
        user.savedAddresses && user.savedAddresses.length > 0
          ? user.savedAddresses.map((addr, idx) =>
            idx === 0 &&
              seedMatch.savedAddresses?.[0] &&
              addr.fullAddress === seedMatch.savedAddresses[0].fullAddress
              ? {
                ...addr,
                latitude: addr.latitude ?? seedMatch.savedAddresses[0].latitude,
                longitude: addr.longitude ?? seedMatch.savedAddresses[0].longitude,
                mapReferenceName:
                  addr.mapReferenceName ?? seedMatch.savedAddresses[0].mapReferenceName,
                mapVerified: addr.mapVerified ?? seedMatch.savedAddresses[0].mapVerified,
              }
              : addr,
          )
          : seedMatch.savedAddresses,
    };
  }
  return user;
}

const mergeUsersDirectory = (base: User[], incoming: Partial<User>[]): User[] => {
  const byEmail = new Map<string, User>();
  for (const u of base) {
    if (u?.email) byEmail.set(u.email.trim().toLowerCase(), u);
  }
  for (const inc of incoming) {
    if (!inc?.email) continue;
    const key = inc.email.trim().toLowerCase();
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, {
        id: inc.id || `u-sync-${Date.now()}`,
        email: inc.email.trim(),
        fullName: inc.fullName || inc.email.trim(),
        phoneNumber: inc.phoneNumber,
        avatarUrl: inc.avatarUrl,
        roles: Array.isArray(inc.roles) && inc.roles.length > 0 ? inc.roles : ['CUSTOMER'],
        isActive: inc.isActive !== false,
      });
    } else {
      byEmail.set(key, {
        ...existing,
        fullName: existing.fullName || inc.fullName || existing.email,
        phoneNumber: existing.phoneNumber || inc.phoneNumber,
        avatarUrl: existing.avatarUrl || inc.avatarUrl,
      });
    }
  }
  return Array.from(byEmail.values());
};

export const AppContent: React.FC<AppContentProps> = ({ currentUser, setCurrentUser }) => {
  // 1. Users state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('dinego_users_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeUsersDirectory(
            MOCK_USERS,
            parsed.map((u) => hydrateSeedCustomerCoords(u)),
          );
        }
      } catch { }
    }
    return MOCK_USERS;
  });

  // Drivers state initialized early so initial Driver routing can enforce onboarding
  const [drivers, setDrivers] = useState<DriverProfile[]>(() => {
    const saved = localStorage.getItem('dinego_drivers_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { }
    }
    return MOCK_DRIVERS;
  });

  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (currentUser?.roles?.includes('ADMIN')) return 'admin-overview';
    if (currentUser?.roles?.includes('MERCHANT')) return 'merchant-orders';
    if (currentUser?.roles?.includes('DRIVER')) {
      const matchedDriver = drivers.find(
        (d) => d.id === currentUser.driverId || d.userId === currentUser.id,
      );
      return isDriverProfileVerified(matchedDriver) ? 'driver-orders' : 'driver-profile';
    }
    return 'home';
  });

  // 2. Merchants state (Each restaurant is 1-to-1 bound to its own account)
  const fixLegacyTeaImage = (url?: string) =>
    url && url.includes('photo-1558857563-b37cfb8cb36b') ? '/images/tra-sua-ca-phe.jpg' : url;

  const [merchants, setMerchants] = useState<Merchant[]>(() => {
    const saved = localStorage.getItem('dinego_merchants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((m: Merchant) => {
            const seedMatch = MOCK_MERCHANTS.find((sm) => sm.id === m.id);
            return {
              ...(seedMatch || {}),
              ...m,
              name: seedMatch?.isCateringOnly ? seedMatch.name : m.name,
              address: seedMatch?.isCateringOnly ? seedMatch.address : m.address,
              latitude: m.latitude ?? seedMatch?.latitude,
              longitude: m.longitude ?? seedMatch?.longitude,
              isCateringOnly: m.isCateringOnly ?? seedMatch?.isCateringOnly,
              coverUrl: fixLegacyTeaImage(m.coverUrl) || m.coverUrl,
              logoUrl: fixLegacyTeaImage(m.logoUrl) || m.logoUrl,
            };
          });
          const existingIds = new Set(normalized.map((m: Merchant) => m.id));
          const missingSeeds = MOCK_MERCHANTS.filter((sm) => !existingIds.has(sm.id));
          return [...normalized, ...missingSeeds];
        }
      } catch { }
    }
    return MOCK_MERCHANTS;
  });

  // Current merchant profile for the logged in merchant user (null if not set up yet)
  const ownedMerchant = currentUser?.roles?.includes('MERCHANT')
    ? merchants.find(
      (m) =>
        (currentUser.merchantId && m.id === currentUser.merchantId) ||
        m.ownerUserId === currentUser.id,
    ) || null
    : null;

  const selectedMerchant = ownedMerchant || merchants[0];
  const needsMerchantSetup = Boolean(currentUser?.roles?.includes('MERCHANT') && !ownedMerchant);

  // Current driver profile for the logged in driver user
  const currentDriverProfile =
    currentUser?.roles?.includes('DRIVER')
      ? drivers.find((d) => d.id === currentUser.driverId || d.userId === currentUser.id) ||
      drivers[0]
      : drivers[0];

  const [allMenuItems, setAllMenuItems] = useState<Record<string, MenuItem[]>>(() => {
    const saved = localStorage.getItem('dinego_menu_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return Object.fromEntries(
            Object.entries(parsed).map(([merchantId, items]) => [
              merchantId,
              Array.isArray(items)
                ? items.map((item: MenuItem) => ({
                  ...item,
                  imageUrl: fixLegacyTeaImage(item.imageUrl) || item.imageUrl,
                }))
                : [],
            ]),
          );
        }
      } catch { }
    }
    return MOCK_MENU_ITEMS;
  });

  const [isMerchantRegisterModalOpen, setIsMerchantRegisterModalOpen] = useState(false);

  useEffect(() => {
    try {
      const latestRaw = localStorage.getItem('dinego_users_list');
      const latestStored: User[] = latestRaw ? JSON.parse(latestRaw) : [];
      const merged = mergeUsersDirectory(
        Array.isArray(latestStored) ? latestStored : [],
        currentUser ? [...users, currentUser] : users,
      );
      localStorage.setItem('dinego_users_list', JSON.stringify(merged));
    } catch {
      localStorage.setItem('dinego_users_list', JSON.stringify(users));
    }
  }, [users, currentUser]);

  // Cross-tab localStorage & backend live account directory sync (for real-time invitations across tabs/browsers)
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'dinego_users_list' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setUsers((prev) => mergeUsersDirectory(prev, parsed));
          }
        } catch {
          // Ignore malformed JSON
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);

    const syncWithBackend = async () => {
      try {
        const publicList = (currentUser ? [...users, currentUser] : users).map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phoneNumber: u.phoneNumber,
          avatarUrl: u.avatarUrl,
          roles: u.roles,
          isActive: u.isActive,
        }));
        const res = await fetch(`${API_BASE_URL}/group-orders/live/accounts/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts: publicList }),
        });
        if (res.ok) {
          const synced = (await res.json()) as Partial<User>[];
          if (Array.isArray(synced)) {
            setUsers((prev) => {
              const next = mergeUsersDirectory(prev, synced);
              return next.length === prev.length ? prev : next;
            });
          }
        }
      } catch {
        // Offline / decoupled fallback silently ignored
      }
    };
    void syncWithBackend();

    return () => window.removeEventListener('storage', handleStorageSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, users.length]);

  useEffect(() => {
    localStorage.setItem('dinego_merchants', JSON.stringify(merchants));
  }, [merchants]);

  useEffect(() => {
    localStorage.setItem('dinego_drivers_list', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('dinego_menu_items', JSON.stringify(allMenuItems));
  }, [allMenuItems]);

  // Orders state loaded directly from SQL Server database (No hardcoded demo orders)
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let active = true;
    const loadDatabaseOrders = async () => {
      const ledger = await adminApi.getDatabaseLedger();
      if (active && ledger && Array.isArray(ledger.orders)) {
        setOrders(ledger.orders);
        localStorage.setItem('dinego_orders', JSON.stringify(ledger.orders));
      }
    };
    void loadDatabaseOrders();
    return () => {
      active = false;
    };
  }, []);

  const [driverShifts, setDriverShifts] = useState<DriverShift[]>(() => {
    let initial: DriverShift[] = [];
    const saved = localStorage.getItem('dinego_driver_shifts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          initial = parsed;
        }
      } catch {
        initial = [];
      }
    }
    if (
      currentUser?.roles?.includes('DRIVER') &&
      isDriverProfileVerified(currentDriverProfile) &&
      currentDriverProfile.status !== 'OFFLINE' &&
      !initial.some((s) => s.driverId === currentDriverProfile.id && s.status === 'ACTIVE')
    ) {
      initial = [createDriverShiftRecord(currentDriverProfile, initial), ...initial];
    }
    return initial;
  });

  const [activeMomoPaymentOrder, setActiveMomoPaymentOrder] = useState<Order | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authTargetRole, setAuthTargetRole] = useState<Role>('CUSTOMER');
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [isAddressSetupModalOpen, setIsAddressSetupModalOpen] = useState(false);
  const [pendingAfterAddressSetup, setPendingAfterAddressSetup] = useState<(() => void) | null>(null);
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState<string | null>(null);
  const [customerProfileSection, setCustomerProfileSection] = useState<
    'info' | 'addresses' | 'payment' | 'security' | 'invoices'
  >('info');
  const [deliveryDisputes, setDeliveryDisputes] = useState<DeliveryDisputeReport[]>(() => {
    const saved = localStorage.getItem('dinego_delivery_disputes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const serialized = JSON.stringify(orders);
    localStorage.setItem('dinego_orders', serialized);
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('dinego_orders_sync');
      ch.postMessage(serialized);
      ch.close();
    }
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('dinego_driver_shifts', JSON.stringify(driverShifts));
  }, [driverShifts]);

  useEffect(() => {
    const serialized = JSON.stringify(deliveryDisputes);
    localStorage.setItem('dinego_delivery_disputes', serialized);
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('dinego_disputes_sync');
      ch.postMessage(serialized);
      ch.close();
    }
  }, [deliveryDisputes]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dinego_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders((prev) =>
              JSON.stringify(prev) === e.newValue ? prev : parsed.filter((o: Order) => o.id !== 'ord-sample-01'),
            );
          }
        } catch { }
      }
      if (e.key === 'dinego_delivery_disputes' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setDeliveryDisputes((prev) => (JSON.stringify(prev) === e.newValue ? prev : parsed));
          }
        } catch { }
      }
    };
    window.addEventListener('storage', onStorage);

    const ordCh = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_orders_sync') : null;
    if (ordCh) {
      ordCh.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          try {
            const parsed = JSON.parse(ev.data);
            if (Array.isArray(parsed)) {
              setOrders((prev) => (JSON.stringify(prev) === ev.data ? prev : parsed));
            }
          } catch { }
        }
      };
    }

    const dispCh = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dinego_disputes_sync') : null;
    if (dispCh) {
      dispCh.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          try {
            const parsed = JSON.parse(ev.data);
            if (Array.isArray(parsed)) {
              setDeliveryDisputes((prev) => (JSON.stringify(prev) === ev.data ? prev : parsed));
            }
          } catch { }
        }
      };
    }

    void adminApi.getDatabaseLedger().then((ledger) => {
      if (Array.isArray(ledger?.deliveryDisputes) && ledger.deliveryDisputes.length > 0) {
        setDeliveryDisputes(ledger.deliveryDisputes);
      }
    });

    return () => {
      window.removeEventListener('storage', onStorage);
      ordCh?.close();
      dispCh?.close();
    };
  }, []);

  const handleStartDriverShift = (driver: DriverProfile) => {
    if (!isDriverProfileVerified(driver)) return;
    setDriverShifts((prev) => {
      if (prev.some((s) => s.driverId === driver.id && s.status === 'ACTIVE')) {
        return prev;
      }
      return [createDriverShiftRecord(driver, prev), ...prev];
    });
  };

  const handleEndDriverShift = (
    driverId: string,
    reason: 'MANUAL_OFFLINE' | 'LOGOUT' = 'MANUAL_OFFLINE',
  ) => {
    const nowIso = new Date().toISOString();
    setDriverShifts((prev) =>
      prev.map((s) =>
        s.driverId === driverId && s.status === 'ACTIVE'
          ? { ...s, status: 'ENDED', endedAt: nowIso, endReason: reason }
          : s,
      ),
    );
  };

  const recordOrderCompletedInShift = (completedOrder: Order, driver: DriverProfile) => {
    const fee = completedOrder.deliveryFee || 15000;
    const net = Math.round(fee * 0.85);
    const trip: DriverShiftTrip = {
      orderId: completedOrder.id,
      orderNumber: completedOrder.orderNumber,
      merchantName: completedOrder.merchant?.name || 'Nhà hàng',
      deliveryAddress: completedOrder.deliveryAddress,
      recipientName: completedOrder.recipientName,
      deliveryFee: fee,
      netEarning: net,
      completedAt: new Date().toISOString(),
    };

    setDriverShifts((prev) => {
      const hasRecorded = prev.some(
        (s) => s.driverId === driver.id && s.trips.some((t) => t.orderId === completedOrder.id),
      );
      if (hasRecorded) return prev;

      const activeIdx = prev.findIndex(
        (s) => s.driverId === driver.id && s.status === 'ACTIVE',
      );
      if (activeIdx === -1) {
        const fresh = createDriverShiftRecord(driver, prev);
        const populated: DriverShift = {
          ...fresh,
          tripsCount: 1,
          grossShippingEarned: fee,
          netIncomeEarned: net,
          trips: [trip],
        };
        return [populated, ...prev];
      }

      return prev.map((s, idx) =>
        idx === activeIdx
          ? {
            ...s,
            tripsCount: s.tripsCount + 1,
            grossShippingEarned: s.grossShippingEarned + fee,
            netIncomeEarned: s.netIncomeEarned + net,
            trips: [trip, ...s.trips],
          }
          : s,
      );
    });
  };

  const handleLogout = () => {
    if (currentUser?.roles?.includes('DRIVER')) {
      handleEndDriverShift(currentDriverProfile.id, 'LOGOUT');
      setDrivers((prev) =>
        prev.map((d) => (d.id === currentDriverProfile.id ? { ...d, status: 'OFFLINE' } : d)),
      );
    }
    setCurrentUser(null);
    localStorage.removeItem('dinego_user');
    setActiveMomoPaymentOrder(null);
    setReviewModalOrder(null);
    setIsAddressSetupModalOpen(false);
    setPendingAfterAddressSetup(null);
    setCurrentTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuthModal = (mode?: 'login' | 'register', targetRole?: Role) => {
    setAuthModalMode(mode || 'login');
    setAuthTargetRole(targetRole || 'CUSTOMER');
    setIsAuthModalOpen(true);
  };

  const handleToggleDishAvailability = (dishId: string) => {
    const mId = selectedMerchant.id;
    const currentDishes = allMenuItems[mId] || MOCK_MENU_ITEMS[mId] || [];
    const updated = currentDishes.map((d) =>
      d.id === dishId ? { ...d, isAvailable: !d.isAvailable } : d,
    );
    setAllMenuItems((prev) => ({
      ...prev,
      [mId]: updated,
    }));
  };

  const handleAddDish = (dish: MenuItem) => {
    const mId = dish.merchantId || selectedMerchant.id;
    const currentDishes = allMenuItems[mId] || MOCK_MENU_ITEMS[mId] || [];
    setAllMenuItems((prev) => ({
      ...prev,
      [mId]: [dish, ...currentDishes],
    }));
  };

  const handleUpdateDish = (dish: MenuItem) => {
    const mId = dish.merchantId || selectedMerchant.id;
    const currentDishes = allMenuItems[mId] || MOCK_MENU_ITEMS[mId] || [];
    const updated = currentDishes.map((d) => (d.id === dish.id ? dish : d));
    setAllMenuItems((prev) => ({
      ...prev,
      [mId]: updated,
    }));
  };

  const handleDeleteDish = (dishId: string) => {
    const mId = selectedMerchant.id;
    const currentDishes = allMenuItems[mId] || MOCK_MENU_ITEMS[mId] || [];
    setAllMenuItems((prev) => ({
      ...prev,
      [mId]: currentDishes.filter((d) => d.id !== dishId),
    }));
  };

  // Step 1: Register a new Merchant user account (Store setup happens inside the app at Step 2)
  const handleMerchantAccountCreated = (newOwnerUser: User) => {
    setUsers((prev) => [newOwnerUser, ...prev]);
    setCurrentUser(newOwnerUser);
    localStorage.setItem('dinego_user', JSON.stringify(newOwnerUser));
    setActiveMomoPaymentOrder(null);
    setReviewModalOrder(null);
    setCurrentTab('merchant-orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2: Complete Restaurant Setup inside the app (or via full registration)
  const handleMerchantRegistered = (
    newMerchant: Merchant,
    newOwnerUser: User,
    initialDishes: MenuItem[] = [],
  ) => {
    setMerchants((prev) => [newMerchant, ...prev]);
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === newOwnerUser.id);
      return exists
        ? prev.map((u) => (u.id === newOwnerUser.id ? newOwnerUser : u))
        : [newOwnerUser, ...prev];
    });
    setAllMenuItems((prev) => ({
      ...prev,
      [newMerchant.id]: initialDishes,
    }));
    setCurrentUser(newOwnerUser);
    localStorage.setItem('dinego_user', JSON.stringify(newOwnerUser));
    setActiveMomoPaymentOrder(null);
    setReviewModalOrder(null);
    setCurrentTab('merchant-orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Register a new independent Driver -> enforce mandatory vehicle & personal onboarding before shipping
  const handleDriverRegistered = (newDriver: DriverProfile, newDriverUser: User) => {
    setDrivers((prev) => [newDriver, ...prev]);
    setUsers((prev) => [newDriverUser, ...prev]);
    setCurrentUser(newDriverUser);
    localStorage.setItem('dinego_user', JSON.stringify(newDriverUser));
    setActiveMomoPaymentOrder(null);
    setReviewModalOrder(null);
    setCurrentTab('driver-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Register a new Customer
  const handleCustomerRegistered = (newCustUser: User) => {
    setUsers((prev) => [newCustUser, ...prev]);
    setCurrentUser(newCustUser);
    localStorage.setItem('dinego_user', JSON.stringify(newCustUser));
    setActiveMomoPaymentOrder(null);
    setReviewModalOrder(null);
    if (currentTab !== 'checkout') {
      setCurrentTab('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update Customer profile
  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('dinego_user', JSON.stringify(updatedUser));
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleRequireAddressSetup = (afterSetup?: () => void) => {
    setPendingAfterAddressSetup(() => afterSetup || null);
    setIsAddressSetupModalOpen(true);
  };

  const handleSaveCustomerAddress = (savedAddress: SavedAddress, makeDefault: boolean) => {
    if (!currentUser) return;
    const existing = currentUser.savedAddresses || [];
    const shouldDefault = makeDefault || existing.length === 0;
    const normalizedExisting = shouldDefault
      ? existing.map((a) => ({ ...a, isDefault: false }))
      : [...existing];
    const nextSaved = [{ ...savedAddress, isDefault: shouldDefault }, ...normalizedExisting];
    const defaultObj = nextSaved.find((a) => a.isDefault) || nextSaved[0];
    const updatedUser: User = {
      ...currentUser,
      address: defaultObj.fullAddress,
      addressLat: defaultObj.latitude,
      addressLng: defaultObj.longitude,
      savedAddresses: nextSaved,
    };
    handleUpdateUser(updatedUser);
    setIsAddressSetupModalOpen(false);
    if (pendingAfterAddressSetup) {
      const callback = pendingAfterAddressSetup;
      setPendingAfterAddressSetup(null);
      callback();
    }
  };

  // Update Merchant profile & store settings
  const handleUpdateMerchantProfile = (updatedMerchant: Merchant, updatedUser?: User) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === updatedMerchant.id ? updatedMerchant : m)),
    );
    if (updatedUser) {
      setCurrentUser(updatedUser);
      localStorage.setItem('dinego_user', JSON.stringify(updatedUser));
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    }
  };

  // Update Driver profile & vehicle info
  const handleUpdateDriverProfile = (updatedDriver: DriverProfile, updatedUser?: User) => {
    setDrivers((prev) => prev.map((d) => (d.id === updatedDriver.id ? updatedDriver : d)));
    if (updatedUser) {
      setCurrentUser(updatedUser);
      localStorage.setItem('dinego_user', JSON.stringify(updatedUser));
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    }
  };

  // Admin toggles user account active / suspended (synchronized with Merchant & Driver status)
  const handleToggleUserStatus = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const nextActive = targetUser.isActive === false ? true : false;
    void adminApi.updateUserStatus(
      userId,
      nextActive,
      nextActive ? 'Mở khóa tài khoản bởi Admin' : 'Tạm khóa tài khoản bởi Admin',
      targetUser.email,
    );
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u)),
    );
    if (targetUser.merchantId) {
      setMerchants((prev) =>
        prev.map((m) =>
          m.id === targetUser.merchantId ? { ...m, isActive: nextActive } : m,
        ),
      );
    }
    if (targetUser.driverId) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === targetUser.driverId
            ? { ...d, status: nextActive ? 'ONLINE' : 'SUSPENDED' }
            : d,
        ),
      );
    }
  };

  // Admin updates merchant KYC & operating status (synchronized with User account)
  const handleAdminUpdateMerchantStatus = (
    merchantId: string,
    nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
    reason?: string,
  ) => {
    void adminApi.updateMerchantStatus(merchantId, nextStatus, reason);
    const targetMerchant = merchants.find((m) => m.id === merchantId);
    const isNowActive = nextStatus === 'APPROVED';
    setMerchants((prev) =>
      prev.map((m) => {
        if (m.id !== merchantId) return m;
        return {
          ...m,
          kycStatus:
            nextStatus === 'APPROVED'
              ? 'VERIFIED'
              : nextStatus === 'REJECTED'
              ? 'REJECTED'
              : m.kycStatus,
          isActive: isNowActive,
          verifiedAt:
            nextStatus === 'APPROVED'
              ? new Date().toISOString().slice(0, 10)
              : m.verifiedAt,
        };
      }),
    );
    setUsers((prev) =>
      prev.map((u) =>
        u.merchantId === merchantId ? { ...u, isActive: isNowActive } : u,
      ),
    );
    pushActorNotification({
      targetRole: 'MERCHANT',
      targetMerchantId: merchantId,
      category: 'KYC',
      title:
        nextStatus === 'APPROVED'
          ? `✅ Hồ sơ pháp lý quán "${targetMerchant?.name || 'Cửa hàng'}" đã được Admin phê duyệt!`
          : nextStatus === 'REJECTED'
          ? `❌ Hồ sơ pháp lý quán "${targetMerchant?.name || 'Cửa hàng'}" bị từ chối`
          : `⚠️ Gian hàng "${targetMerchant?.name || 'Cửa hàng'}" đang bị tạm khóa bởi Admin`,
      message:
        reason ||
        (nextStatus === 'APPROVED'
          ? 'Gian hàng đã được kích hoạt mở bán chính thức trên sàn DineGo.'
          : 'Vui lòng kiểm tra và cập nhật lại Hồ sơ pháp lý & Avatar chủ sở hữu.'),
      priority: 'urgent',
      actionTab: 'merchant-kyc',
      senderLabel: 'Ban Quản Trị DineGo',
    });
  };

  // Admin updates driver active / suspended status (synchronized with User account)
  const handleAdminUpdateDriverStatus = (
    driverId: string,
    nextStatus: 'ACTIVE' | 'SUSPENDED',
    reason?: string,
  ) => {
    void adminApi.updateDriverStatus(driverId, nextStatus, reason);
    const isNowActive = nextStatus === 'ACTIVE';
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? { ...d, status: isNowActive ? 'ONLINE' : 'SUSPENDED' }
          : d,
      ),
    );
    setUsers((prev) =>
      prev.map((u) =>
        u.driverId === driverId ? { ...u, isActive: isNowActive } : u,
      ),
    );
    pushActorNotification({
      targetRole: 'DRIVER',
      targetDriverId: driverId,
      category: 'KYC',
      title:
        nextStatus === 'ACTIVE'
          ? '✅ Tài khoản Tài xế của bạn đã được Admin mở khóa hoạt động'
          : '⚠️ Tài khoản Tài xế của bạn đã bị tạm đình chỉ nhận chuyến',
      message: reason || 'Cập nhật trạng thái vận hành từ Ban Quản Trị DineGo.',
      priority: 'urgent',
      actionTab: 'driver-profile',
      senderLabel: 'Ban Quản Trị DineGo',
    });
  };

  const [activeBrowseMerchant, setActiveBrowseMerchant] = useState<Merchant>(merchants[0]);

  const handleSelectMerchant = (merchant: Merchant) => {
    setActiveBrowseMerchant(merchant);
    setCurrentTab('restaurant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMerchantByName = (name: string) => {
    const found = merchants.find((m) =>
      m.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (found) {
      handleSelectMerchant(found);
    } else {
      handleSelectMerchant(merchants[0] || MOCK_MERCHANTS[0]);
    }
  };

  const handleOrderPlaced = (newOrder: Order) => {
    if (!currentUser && newOrder.orderType !== 'CATERING') return;
    const ownedOrder: Order = {
      ...newOrder,
      customerId: newOrder.customerId || currentUser?.id || 'guest',
      customerEmail: newOrder.customerEmail || currentUser?.email,
    };
    setOrders([ownedOrder, ...orders]);
    if (ownedOrder.orderType !== 'CATERING') {
      void adminApi.saveDatabaseOrder(ownedOrder);
    }
    const itemsSummary = (ownedOrder.items || [])
      .map((i) => `${i.quantity}x ${i.itemName}`)
      .join(', ');
    pushMultiActorNotifications([
      {
        targetRole: 'MERCHANT',
        targetMerchantId: ownedOrder.merchant?.id,
        category: ownedOrder.orderType === 'CATERING' ? 'CATERING' : 'ORDER',
        title: `🔔 Đơn hàng mới #${ownedOrder.orderNumber} từ ${ownedOrder.recipientName}`,
        message: `${itemsSummary || 'Đơn đặt món mới'} • Tổng: ${ownedOrder.finalTotal.toLocaleString('vi-VN')}đ. Hãy tiếp nhận đơn ngay!`,
        priority: 'urgent',
        actionTab: ownedOrder.orderType === 'CATERING' ? 'merchant-catering' : 'merchant-orders',
        orderRef: ownedOrder.orderNumber,
        senderLabel: ownedOrder.recipientName,
      },
      {
        targetRole: 'CUSTOMER',
        targetUserId: ownedOrder.customerId,
        category: ownedOrder.orderType === 'CATERING' ? 'CATERING' : 'ORDER',
        title: `✅ Đặt đơn thành công #${ownedOrder.orderNumber}`,
        message: `Đơn hàng tại "${ownedOrder.merchant?.name}" (${ownedOrder.finalTotal.toLocaleString('vi-VN')}đ) đang chờ quán xác nhận.`,
        priority: 'normal',
        actionTab: 'orders',
        orderRef: ownedOrder.orderNumber,
        senderLabel: ownedOrder.merchant?.name || 'DineGo',
      },
      {
        targetRole: 'DRIVER',
        category: 'DELIVERY',
        title: `🛵 Có đơn hàng mới #${ownedOrder.orderNumber} tại ${ownedOrder.merchant?.name}`,
        message: `Giao tới: ${ownedOrder.deliveryAddress} • Cước vận chuyển: ${(ownedOrder.deliveryFee || 20000).toLocaleString('vi-VN')}đ.`,
        priority: 'high',
        actionTab: 'driver-orders',
        orderRef: ownedOrder.orderNumber,
        senderLabel: ownedOrder.merchant?.name || 'Điều phối DineGo',
      },
      {
        targetRole: 'ADMIN',
        category: 'ORDER',
        title: `📦 Giao dịch đơn mới #${ownedOrder.orderNumber} (${ownedOrder.finalTotal.toLocaleString('vi-VN')}đ)`,
        message: `Khách: ${ownedOrder.recipientName} • Quán: ${ownedOrder.merchant?.name}.`,
        priority: 'normal',
        actionTab: 'admin-overview',
        orderRef: ownedOrder.orderNumber,
        senderLabel: 'Sổ cái Giao dịch',
      },
    ]);
    setCurrentTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateOrderDetails = (orderId: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)),
    );
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    let merchantComp = 0;
    // Operational Case 6: Quán hủy khi tài xế đã đến nơi -> Bồi thường tài xế 15.000đ cước di chuyển
    if (newStatus === 'CANCELLED' && targetOrder && (targetOrder.driverArrivedAtStore || targetOrder.assignedDriverId)) {
      merchantComp = 15000;
      const assignedDrvId = targetOrder.assignedDriverId;
      if (assignedDrvId) {
        setDrivers((prev) =>
          prev.map((drv) =>
            drv.id === assignedDrvId
              ? { ...drv, walletBalance: (drv.walletBalance || 0) + 15000 }
              : drv,
          ),
        );
      }
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: newStatus,
            merchantCancellationCompensation: merchantComp || o.merchantCancellationCompensation,
          };
        }
        return o;
      }),
    );
    void adminApi.updateDatabaseOrderStatus(orderId, {
      status: newStatus,
      assignedDriverId: targetOrder?.assignedDriverId || undefined,
      assignedDriverName: targetOrder?.assignedDriverName || undefined,
    });
    if (targetOrder) {
      const statusNotifMap: Partial<Record<OrderStatus, { title: string; msg: string; cat: 'ORDER' | 'KITCHEN' | 'DELIVERY' }>> = {
        CONFIRMED: {
          title: `🏪 Quán "${targetOrder.merchant?.name}" đã tiếp nhận đơn #${targetOrder.orderNumber}`,
          msg: 'Nhà hàng đã xác nhận đơn hàng của bạn và chuẩn bị chuyển vào bếp.',
          cat: 'ORDER',
        },
        PREPARING: {
          title: `🍳 Bếp quán "${targetOrder.merchant?.name}" đang nấu đơn #${targetOrder.orderNumber}`,
          msg: 'Đầu bếp đang chế biến món ăn nóng hổi cho bạn.',
          cat: 'KITCHEN',
        },
        READY_FOR_PICKUP: {
          title: `🍲 Món ăn đơn #${targetOrder.orderNumber} đã nấu xong!`,
          msg: 'Quán đã đóng gói hoàn tất và đang chờ bàn giao cho tài xế.',
          cat: 'KITCHEN',
        },
        DELIVERING: {
          title: `🚚 Tài xế đang giao đơn #${targetOrder.orderNumber} tới bạn`,
          msg: `Tài xế ${targetOrder.assignedDriverName || 'DineGo Express'} đã nhận món từ quán và đang trên đường giao.`,
          cat: 'DELIVERY',
        },
        COMPLETED: {
          title: `🎉 Đơn hàng #${targetOrder.orderNumber} đã giao thành công!`,
          msg: `Chúc bạn ngon miệng! Hãy bấm "Đánh giá món ăn & Tài xế" để gửi phản hồi cho quán ${targetOrder.merchant?.name} nhé.`,
          cat: 'ORDER',
        },
        CANCELLED: {
          title: `❌ Đơn hàng #${targetOrder.orderNumber} đã bị hủy`,
          msg: targetOrder.cancelReason || 'Đơn hàng đã chuyển sang trạng thái hủy.',
          cat: 'ORDER',
        },
      };
      const meta = statusNotifMap[newStatus];
      if (meta) {
        const batch: Parameters<typeof pushMultiActorNotifications>[0] = [
          {
            targetRole: 'CUSTOMER',
            targetUserId: targetOrder.customerId,
            category: meta.cat,
            title: meta.title,
            message: meta.msg,
            priority: newStatus === 'COMPLETED' || newStatus === 'DELIVERING' ? 'high' : 'normal',
            actionTab: 'orders',
            orderRef: targetOrder.orderNumber,
            senderLabel: targetOrder.merchant?.name || 'DineGo',
          },
        ];
        if (newStatus === 'READY_FOR_PICKUP') {
          batch.push({
            targetRole: 'DRIVER',
            targetDriverId: targetOrder.assignedDriverId,
            category: 'DELIVERY',
            title: `📦 Món đơn #${targetOrder.orderNumber} tại "${targetOrder.merchant?.name}" đã sẵn sàng!`,
            message: 'Vui lòng di chuyển tới quán và bấm "Báo đã đến nhà hàng" để nhận bàn giao món.',
            priority: 'urgent',
            actionTab: 'driver-orders',
            orderRef: targetOrder.orderNumber,
            senderLabel: targetOrder.merchant?.name,
          });
        }
        if (newStatus === 'COMPLETED') {
          batch.push(
            {
              targetRole: 'MERCHANT',
              targetMerchantId: targetOrder.merchant?.id,
              category: 'ORDER',
              title: `💰 Đơn hàng #${targetOrder.orderNumber} đã giao thành công`,
              message: `Doanh thu đơn (${targetOrder.finalTotal.toLocaleString('vi-VN')}đ) đã được ghi nhận vào báo cáo đối soát của quán.`,
              priority: 'normal',
              actionTab: 'merchant-analytics',
              orderRef: targetOrder.orderNumber,
              senderLabel: 'DineGo Đối soát',
            },
            {
              targetRole: 'DRIVER',
              targetDriverId: targetOrder.assignedDriverId,
              category: 'DELIVERY',
              title: `💵 Hoàn tất chuyến giao #${targetOrder.orderNumber}`,
              message: `Cước phí chuyến giao đã được cộng vào Ví thu nhập tài xế của bạn.`,
              priority: 'normal',
              actionTab: 'driver-earnings',
              orderRef: targetOrder.orderNumber,
              senderLabel: 'DineGo Express',
            },
          );
        }
        pushMultiActorNotifications(batch);
      }
    }
    if (newStatus === 'COMPLETED' && targetOrder && targetOrder.assignedDriverId) {
      const assignedDrv = drivers.find((d) => d.id === targetOrder.assignedDriverId);
      if (assignedDrv) {
        recordOrderCompletedInShift(targetOrder, assignedDrv);
      }
    }
  };

  const handleSyncCateringOrderFromMerchant = (
    bookingId: string,
    bookingCode: string,
    action: 'CONFIRM_DEPOSIT' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
    meta?: { finalBillCode?: string; completedAt?: string; confirmedAt?: string },
  ) => {
    const nowIso = meta?.confirmedAt || new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        const matches =
          o.orderNumber === bookingCode || o.id === `ord-catering-${bookingId}`;
        if (!matches) return o;
        if (action === 'CONFIRM_DEPOSIT') {
          return {
            ...o,
            status: o.status === 'PENDING' ? 'CONFIRMED' : o.status,
            payment: o.payment
              ? {
                ...o.payment,
                paymentStatus: 'SUCCESS',
                transactionRef:
                  o.payment.transactionRef?.startsWith('MOMO-PENDING-')
                    ? `MOMO-FEAST-${bookingCode.slice(-6)}`
                    : o.payment.transactionRef || `MOMO-FEAST-${bookingCode.slice(-6)}`,
                paidAt: nowIso,
              }
              : o.payment,
            cateringDetails: o.cateringDetails
              ? {
                ...o.cateringDetails,
                depositConfirmedByMerchant: true,
                depositConfirmedAt: nowIso,
              }
              : o.cateringDetails,
          };
        }
        if (action === 'APPROVED') {
          return {
            ...o,
            status: 'CONFIRMED',
            payment:
              o.payment && o.payment.paymentStatus !== 'SUCCESS'
                ? {
                  ...o.payment,
                  paymentStatus: 'SUCCESS',
                  paidAt: o.payment.paidAt || nowIso,
                }
                : o.payment,
            cateringDetails: o.cateringDetails
              ? {
                ...o.cateringDetails,
                depositConfirmedByMerchant: true,
                depositConfirmedAt: o.cateringDetails.depositConfirmedAt || nowIso,
                merchantApproved: true,
              }
              : o.cateringDetails,
          };
        }
        if (action === 'REJECTED') {
          return {
            ...o,
            status: 'CANCELLED',
            cancelReason: 'Nhà hàng từ chối tiếp nhận hợp đồng đặt tiệc',
          };
        }
        return {
          ...o,
          status: 'COMPLETED',
          payment:
            o.payment && o.payment.paymentStatus !== 'SUCCESS'
              ? {
                ...o.payment,
                paymentStatus: 'SUCCESS',
                paidAt: o.payment.paidAt || nowIso,
              }
              : o.payment,
          cateringDetails: o.cateringDetails
            ? {
              ...o.cateringDetails,
              depositConfirmedByMerchant: true,
              merchantApproved: true,
              finalBillIssued: true,
              finalBillCode: meta?.finalBillCode,
              completedAt: meta?.completedAt,
            }
            : o.cateringDetails,
        };
      }),
    );

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('dinego_catering_')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;
        const nextStatus =
          action === 'COMPLETED'
            ? 'COMPLETED'
            : action === 'REJECTED'
              ? 'CANCELLED'
              : action === 'CONFIRM_DEPOSIT' || action === 'APPROVED'
                ? 'DEPOSIT_PAID'
                : null;
        if (!nextStatus) continue;
        localStorage.setItem(
          key,
          JSON.stringify(
            parsed.map((rec: Record<string, unknown>) =>
              rec.id === bookingId || rec.bookingCode === bookingCode
                ? { ...rec, status: nextStatus }
                : rec,
            ),
          ),
        );
      }
    } catch {
      // Ignore storage sync failure
    }
  };

  const handleAcceptDriverOrder = (orderId: string, driver: DriverProfile) => {
    handleStartDriverShift(driver);
    if (driver.status === 'OFFLINE') {
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, status: 'ONLINE' } : d)),
      );
    }
    const targetOrder = orders.find((o) => o.id === orderId);
    const nextStatus = targetOrder?.status === 'PENDING' ? 'CONFIRMED' : targetOrder?.status || 'CONFIRMED';
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
            ...o,
            assignedDriverId: driver.id,
            assignedDriverName: driver.fullName,
            status: o.status === 'PENDING' ? 'CONFIRMED' : o.status,
          }
          : o,
      ),
    );
    void adminApi.updateDatabaseOrderStatus(orderId, {
      status: nextStatus,
      assignedDriverId: driver.id,
      assignedDriverName: driver.fullName,
    });
    if (targetOrder) {
      pushMultiActorNotifications([
        {
          targetRole: 'MERCHANT',
          targetMerchantId: targetOrder.merchant?.id,
          category: 'DELIVERY',
          title: `🛵 Tài xế ${driver.fullName} (${driver.licensePlate}) đã nhận giao đơn #${targetOrder.orderNumber}`,
          message: 'Tài xế đang di chuyển tới quán để nhận món.',
          priority: 'normal',
          actionTab: 'merchant-orders',
          orderRef: targetOrder.orderNumber,
          senderLabel: driver.fullName,
        },
        {
          targetRole: 'CUSTOMER',
          targetUserId: targetOrder.customerId,
          category: 'DELIVERY',
          title: `🛵 Tài xế ${driver.fullName} đã nhận đơn #${targetOrder.orderNumber}`,
          message: `Biển số: ${driver.licensePlate} • SĐT: ${driver.phoneNumber}.`,
          priority: 'normal',
          actionTab: 'orders',
          orderRef: targetOrder.orderNumber,
          senderLabel: 'DineGo Express',
        },
      ]);
    }
  };

  const handleMarkDriverArrivedAtStore = (orderId: string) => {
    const arrivedAt = new Date().toISOString();
    const targetOrder = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
            ...o,
            driverArrivedAtStore: true,
            driverArrivedAtStoreAt: o.driverArrivedAtStoreAt || arrivedAt,
          }
          : o,
      ),
    );
    if (targetOrder) {
      pushActorNotification({
        targetRole: 'MERCHANT',
        targetMerchantId: targetOrder.merchant?.id,
        category: 'DELIVERY',
        title: `📍 Tài xế ${targetOrder.assignedDriverName || 'Shipper'} đã có mặt tại quán!`,
        message: `Đơn #${targetOrder.orderNumber}: Vui lòng kiểm tra và bấm "Xác nhận bàn giao món cho Shipper".`,
        priority: 'urgent',
        actionTab: 'merchant-orders',
        orderRef: targetOrder.orderNumber,
        senderLabel: targetOrder.assignedDriverName || 'Tài xế',
      });
    }
  };

  const handleConfirmMerchantPickup = (orderId: string) => {
    const confirmedAt = new Date().toISOString();
    const targetOrder = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
            ...o,
            merchantConfirmedPickup: true,
            merchantConfirmedPickupAt: confirmedAt,
            status:
              o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING'
                ? 'READY_FOR_PICKUP'
                : o.status,
          }
          : o,
      ),
    );
    if (targetOrder) {
      pushMultiActorNotifications([
        {
          targetRole: 'DRIVER',
          targetDriverId: targetOrder.assignedDriverId,
          category: 'DELIVERY',
          title: `🤝 Quán "${targetOrder.merchant?.name}" đã xác nhận bàn giao đơn #${targetOrder.orderNumber}`,
          message: 'Bạn đã có thể bấm "Bắt đầu giao hàng" tới địa chỉ của khách.',
          priority: 'urgent',
          actionTab: 'driver-orders',
          orderRef: targetOrder.orderNumber,
          senderLabel: targetOrder.merchant?.name,
        },
        {
          targetRole: 'CUSTOMER',
          targetUserId: targetOrder.customerId,
          category: 'DELIVERY',
          title: `🤝 Quán đã bàn giao túi món ăn #${targetOrder.orderNumber} cho Tài xế`,
          message: `Tài xế ${targetOrder.assignedDriverName || 'Shipper'} chuẩn bị xuất phát giao tới bạn.`,
          priority: 'normal',
          actionTab: 'orders',
          orderRef: targetOrder.orderNumber,
          senderLabel: targetOrder.merchant?.name,
        },
      ]);
    }
  };

  const handleConfirmCustomerReceipt = (orderId: string) => {
    const confirmedAt = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
            ...o,
            customerConfirmedReceipt: true,
            customerConfirmedAt: confirmedAt,
          }
          : o,
      ),
    );
  };

  const handleSubmitDeliveryDispute = (report: DeliveryDisputeReport) => {
    void adminApi.createDatabaseDispute(report);
    setDeliveryDisputes((prev) => [report, ...prev]);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === report.orderId
          ? {
            ...o,
            status: 'CANCELLED',
            cancelledBy: 'DRIVER_DISPUTE',
            cancelReason: `Khách bom hàng / Không nhận: ${report.reasonLabel}`,
            deliveryDispute: report,
          }
          : o,
      ),
    );
  };

  const handleResolveDeliveryDispute = (
    reportId: string,
    decision: 'COMPENSATED_DRIVER' | 'REJECTED',
    adminNote?: string,
  ) => {
    void adminApi.resolveDatabaseDispute(reportId, decision, adminNote);
    const target = deliveryDisputes.find((d) => d.id === reportId);
    setDeliveryDisputes((prev) =>
      prev.map((d) =>
        d.id === reportId
          ? {
            ...d,
            status: decision,
            adminNote: adminNote || d.adminNote,
          }
          : d,
      ),
    );
    if (
      decision === 'COMPENSATED_DRIVER' &&
      target &&
      target.status === 'PENDING_REVIEW'
    ) {
      // 1. Bồi hoàn cước phí vào ví của tài xế
      setDrivers((prev) =>
        prev.map((drv) =>
          drv.id === target.driverId
            ? {
              ...drv,
              walletBalance: drv.walletBalance + (target.compensationAmount || 15000),
            }
            : drv,
        ),
      );

      // 2. Chế tài khách hàng (Khóa COD + Blacklist nếu vi phạm bom hàng) - Images 1 & 3
      const isFeastBom = target.orderId.includes('catering') || target.reason === 'REFUSED_ORDER';
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === target.customerId || u.phoneNumber === target.customerPhone) {
            return {
              ...u,
              codBlocked: true,
              isBlacklisted: isFeastBom ? true : u.isBlacklisted,
              blacklistReason: isFeastBom
                ? 'Vi phạm bom đơn tiệc lớn / từ chối nhận hàng không lý do'
                : u.blacklistReason,
            };
          }
          return u;
        }),
      );

      // Cập nhật currentUser nếu đang đăng nhập tài khoản khách này
      setCurrentUser((prev) => {
        if (prev && (prev.id === target.customerId || prev.phoneNumber === target.customerPhone)) {
          return {
            ...prev,
            codBlocked: true,
            isBlacklisted: isFeastBom ? true : prev.isBlacklisted,
            blacklistReason: isFeastBom
              ? 'Vi phạm bom đơn tiệc lớn / từ chối nhận hàng không lý do'
              : prev.blacklistReason,
          };
        }
        return prev;
      });
    }
  };

  const handlePayMoMo = (order: Order) => {
    if (!currentUser) return;
    const isOwner =
      order.customerId === currentUser.id ||
      (!order.customerId &&
        !!order.customerEmail &&
        order.customerEmail.toLowerCase() === currentUser.email.toLowerCase());
    if (!isOwner && !currentUser.roles.includes('ADMIN')) return;
    setActiveMomoPaymentOrder(order);
  };

  const handleConfirmMoMoIpn = () => {
    if (!activeMomoPaymentOrder) return;

    setOrders(
      orders.map((o) => {
        if (o.id === activeMomoPaymentOrder.id) {
          return {
            ...o,
            status: 'CONFIRMED',
            payment: {
              ...(o.payment || {
                id: `pay-${Date.now()}`,
                paymentMethod: 'MOMO_QR',
                amount: o.finalTotal,
                currency: 'VND',
              }),
              paymentStatus: 'SUCCESS',
              transactionRef: `MOMO-${Math.floor(100000000 + Math.random() * 900000000)}`,
              paidAt: new Date().toISOString(),
            },
          };
        }
        return o;
      }),
    );

    setActiveMomoPaymentOrder(null);
  };

  // Determine which standalone Portal Shell is active
  const isMerchantPortalTab =
    currentTab === 'dashboard' ||
    currentTab === 'merchant-orders' ||
    currentTab === 'merchant-menu' ||
    currentTab === 'merchant-vouchers' ||
    currentTab === 'merchant-catering' ||
    currentTab === 'merchant-analytics' ||
    currentTab === 'merchant-kyc';

  const isAdminPortalTab =
    currentTab === 'admin-overview' ||
    currentTab === 'admin-merchants' ||
    currentTab === 'admin-drivers' ||
    currentTab === 'admin-users' ||
    currentTab === 'admin-complaints' ||
    currentTab === 'admin-reconciliation' ||
    currentTab === 'admin-vouchers' ||
    currentTab === 'admin-knowledge' ||
    currentTab === 'admin-settings';

  const isDriverPortalMode =
    currentTab === 'driver-orders' ||
    currentTab === 'driver-map' ||
    currentTab === 'driver-history' ||
    currentTab === 'driver-earnings' ||
    currentTab === 'driver-profile' ||
    (currentTab === 'tracking' && Boolean(currentUser?.roles?.includes('DRIVER')));

  const isDriverOrTrackingTab =
    currentTab === 'tracking' ||
    currentTab === 'driver-orders' ||
    currentTab === 'driver-map' ||
    currentTab === 'driver-history' ||
    currentTab === 'driver-earnings' ||
    currentTab === 'driver-profile';

  // Customer Storefront Header & Footer ONLY render when in Customer Portal mode
  const isCustomerStorefrontShell =
    !isMerchantPortalTab && !isAdminPortalTab && !isDriverPortalMode;

  // Strictly scope orders by owning account / merchant
  const customerOrders = currentUser
    ? orders.filter(
      (o) =>
        o.customerId === currentUser.id ||
        (!o.customerId &&
          !!o.customerEmail &&
          o.customerEmail.toLowerCase() === currentUser.email.toLowerCase()),
    )
    : orders.filter((o) => o.customerId === 'guest');

  const driverActiveOrder =
    orders.find(
      (o) =>
        o.assignedDriverId === currentDriverProfile.id &&
        o.status !== 'COMPLETED' &&
        o.status !== 'CANCELLED',
    ) || null;

  const merchantOrders = orders.filter((o) => o.merchant?.id === selectedMerchant.id);

  const activeCustomerOrdersCount = customerOrders.filter((o) =>
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status),
  ).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isCustomerStorefrontShell && (
        <Header
          key={currentUser?.id || 'guest'}
          currentTab={currentTab}
          onNavigate={(tab) => {
            if (tab === 'customer-profile') {
              setCustomerProfileSection('info');
            }
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenCustomerInvoices={() => {
            setCustomerProfileSection('invoices');
            setCurrentTab('customer-profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          currentUser={currentUser}
          onOpenAuthModal={handleOpenAuthModal}
          onLogout={handleLogout}
          onOpenMerchantRegisterModal={() => handleOpenAuthModal('register', 'MERCHANT')}
          activeOrdersCount={activeCustomerOrdersCount}
        />
      )}

      <main style={{ flexGrow: 1 }}>
        {/* 1. CUSTOMER STOREFRONT SHELL */}
        {currentTab === 'home' && (
          <HomePage
            onSelectMerchant={handleSelectMerchant}
            onNavigate={(tab: any) => setCurrentTab(tab)}
            merchants={merchants}
            onOpenMerchantRegisterModal={() => handleOpenAuthModal('register', 'MERCHANT')}
            currentUser={currentUser}
            onOpenAddressSetup={handleRequireAddressSetup}
          />
        )}

        {currentTab === 'restaurant' && (
          <RestaurantPage
            merchant={activeBrowseMerchant}
            onBack={() => setCurrentTab('home')}
            onGoToCheckout={() => setCurrentTab('checkout')}
            menuItems={allMenuItems}
            currentUser={currentUser}
            onRequireAddressSetup={handleRequireAddressSetup}
          />
        )}

        {currentTab === 'checkout' && (
          <CheckoutPage
            key={currentUser?.id || 'guest'}
            onBack={() => setCurrentTab('restaurant')}
            onOrderPlaced={handleOrderPlaced}
            currentUser={currentUser}
            onOpenAuthModal={(mode) => handleOpenAuthModal(mode, 'CUSTOMER')}
            merchants={merchants}
            onOpenAddressSetup={() => handleRequireAddressSetup()}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersPage
            key={currentUser?.id || 'guest'}
            orders={customerOrders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onConfirmCustomerReceipt={handleConfirmCustomerReceipt}
            onAcceptDriverOrder={handleAcceptDriverOrder}
            onMarkDriverArrivedAtStore={handleMarkDriverArrivedAtStore}
            onConfirmMerchantPickup={handleConfirmMerchantPickup}
            onTrackOrder={(orderId) => {
              setSelectedTrackingOrderId(orderId);
              setCurrentTab('tracking');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            drivers={drivers}
            onPayMoMo={handlePayMoMo}
            onExplore={() => setCurrentTab('home')}
            onOpenReviewModal={(order) => setReviewModalOrder(order)}
          />
        )}

        {currentTab === 'catering' && (
          <CateringPage
            key={currentUser?.id || 'guest'}
            currentUser={currentUser}
            onOrderPlaced={handleOrderPlaced}
          />
        )}

        {currentTab === 'group-order' && (
          <GroupOrderPage
            key={currentUser?.id || 'guest'}
            merchants={merchants}
            menuItemsMap={allMenuItems}
            currentUser={currentUser}
            allUsers={users}
            onOrderPlaced={handleOrderPlaced}
            onOpenAuthModal={(mode) => handleOpenAuthModal(mode, 'CUSTOMER')}
            onOpenAddressSetup={() => handleRequireAddressSetup()}
            onNavigate={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'vouchers' && (
          <VoucherHuntPage
            key={currentUser?.id || 'guest'}
            merchants={merchants}
            currentUser={currentUser}
            onSelectMerchant={handleSelectMerchant}
            onOpenAuthModal={(mode) => handleOpenAuthModal(mode, 'CUSTOMER')}
            onNavigate={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'ai-guide' && (
          <AiGuidePage onSelectMerchantByName={handleSelectMerchantByName} />
        )}

        {currentTab === 'customer-profile' && (
          <CustomerProfilePage
            key={`${currentUser?.id || 'guest'}-${customerProfileSection}`}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            orders={customerOrders}
            initialSection={customerProfileSection}
          />
        )}

        {/* 2. DRIVER PARTNER CONSOLE SHELL & CUSTOMER TRACKING VIEW */}
        {isDriverOrTrackingTab && (
          <TrackingPage
            key={isDriverPortalMode ? currentDriverProfile.id : currentUser?.id || 'guest'}
            activeOrder={
              isDriverPortalMode
                ? driverActiveOrder
                : (selectedTrackingOrderId
                  ? orders.find((o) => o.id === selectedTrackingOrderId)
                  : null) || customerOrders[0] || null
            }
            allOrders={isDriverPortalMode ? orders : customerOrders}
            activeTab={currentTab}
            onNavigate={(tab) => {
              if (
                currentUser?.roles?.includes('DRIVER') &&
                !isDriverProfileVerified(currentDriverProfile) &&
                tab !== 'driver-profile'
              ) {
                setCurrentTab('driver-profile');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrderDetails={handleUpdateOrderDetails}
            onAcceptDriverOrder={handleAcceptDriverOrder}
            onMarkDriverArrivedAtStore={handleMarkDriverArrivedAtStore}
            onConfirmCustomerReceipt={handleConfirmCustomerReceipt}
            driverDisputes={deliveryDisputes.filter((d) => d.driverId === currentDriverProfile.id)}
            onSubmitDeliveryDispute={handleSubmitDeliveryDispute}
            isDriverMode={isDriverPortalMode}
            currentDriver={currentDriverProfile}
            currentUser={currentUser}
            onUpdateDriverProfile={handleUpdateDriverProfile}
            merchants={merchants}
            menuItemsMap={allMenuItems}
            driverShifts={driverShifts.filter((s) => s.driverId === currentDriverProfile.id)}
            onStartDriverShift={handleStartDriverShift}
            onEndDriverShift={handleEndDriverShift}
            onLogout={handleLogout}
            onOpenReviewModal={(order) => setReviewModalOrder(order)}
            onExploreFood={() => setCurrentTab('home')}
          />
        )}

        {/* 3. MERCHANT SELLER CENTER SHELL & 4. ENTERPRISE ADMIN BACKOFFICE SHELL */}
        {isMerchantPortalTab && needsMerchantSetup && currentUser ? (
          <MerchantSetupScreen
            currentUser={currentUser}
            onCompleteSetup={handleMerchantRegistered}
            onLogout={handleLogout}
          />
        ) : (
          (isMerchantPortalTab || isAdminPortalTab) && (
            <DashboardPage
              key={isAdminPortalTab ? 'admin' : selectedMerchant.id}
              currentUser={currentUser}
              activeTab={currentTab}
              onNavigate={(tab) => {
                setCurrentTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenAuthModal={handleOpenAuthModal}
              onLogout={handleLogout}
              orders={isAdminPortalTab ? orders : merchantOrders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              merchantDishes={allMenuItems[selectedMerchant.id] || MOCK_MENU_ITEMS[selectedMerchant.id] || []}
              onToggleDishAvailability={handleToggleDishAvailability}
              onAddDish={handleAddDish}
              onUpdateDish={handleUpdateDish}
              onDeleteDish={handleDeleteDish}
              currentMerchant={selectedMerchant}
              onUpdateMerchantProfile={handleUpdateMerchantProfile}
              allMerchants={merchants}
              allDriversList={drivers}
              allUsersList={users}
              onToggleUserStatus={handleToggleUserStatus}
              deliveryDisputes={deliveryDisputes}
              onResolveDeliveryDispute={handleResolveDeliveryDispute}
              onConfirmMerchantPickup={handleConfirmMerchantPickup}
              onAdminUpdateMerchantStatus={handleAdminUpdateMerchantStatus}
              onAdminUpdateDriverStatus={handleAdminUpdateDriverStatus}
              onOpenMerchantRegisterModal={() => handleOpenAuthModal('register', 'MERCHANT')}
              onSyncCateringOrderFromMerchant={handleSyncCateringOrderFromMerchant}
            />
          )
        )}
      </main>

      {isCustomerStorefrontShell && (
        <Footer
          onNavigate={(tab) => {
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenAuthModal={handleOpenAuthModal}
          onOpenMerchantRegisterModal={() => handleOpenAuthModal('register', 'MERCHANT')}
        />
      )}

      {/* Merchant Onboarding & KYC Modal */}
      <MerchantRegistrationModal
        isOpen={isMerchantRegisterModalOpen}
        onClose={() => setIsMerchantRegisterModalOpen(false)}
        onRegistered={handleMerchantRegistered}
      />

      {/* Multi-Actor Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        initialRole={authTargetRole}
        allUsers={users}
        allMerchants={merchants}
        allDrivers={drivers}
        onRegisterMerchantAccount={handleMerchantAccountCreated}
        onRegisterDriverAccount={handleDriverRegistered}
        onRegisterCustomerAccount={handleCustomerRegistered}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('dinego_user', JSON.stringify(user));
          setActiveMomoPaymentOrder(null);
          setReviewModalOrder(null);
          setIsAuthModalOpen(false);
          if (user.roles.includes('ADMIN')) {
            setCurrentTab('admin-overview');
          } else if (user.roles.includes('MERCHANT')) {
            const linkedMerchant = merchants.find(
              (m) => m.id === user.merchantId || m.ownerUserId === user.id,
            );
            setCurrentTab(linkedMerchant?.isCateringOnly ? 'merchant-catering' : 'merchant-orders');
          } else if (user.roles.includes('DRIVER')) {
            const matchedDriver = drivers.find(
              (d) => d.id === user.driverId || d.userId === user.id,
            );
            if (matchedDriver && isDriverProfileVerified(matchedDriver) && matchedDriver.status !== 'OFFLINE') {
              handleStartDriverShift(matchedDriver);
            }
            setCurrentTab(
              isDriverProfileVerified(matchedDriver) ? 'driver-orders' : 'driver-profile',
            );
          } else if (currentTab !== 'checkout') {
            setCurrentTab('home');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Mandatory Map-Verified Address Setup Modal for Ordering */}
      {isAddressSetupModalOpen && (
        <AddressSetupModal
          key={currentUser?.id || 'guest'}
          isOpen={isAddressSetupModalOpen}
          currentUser={currentUser}
          onClose={() => {
            setIsAddressSetupModalOpen(false);
            setPendingAfterAddressSetup(null);
          }}
          onSaveAddress={handleSaveCustomerAddress}
        />
      )}

      {/* Customer Review & Complaint Modal */}
      <ReviewModal
        isOpen={!!reviewModalOrder}
        onClose={() => setReviewModalOrder(null)}
        order={reviewModalOrder}
        onSubmitted={(data) => {
          if (!reviewModalOrder) return;
          const nowStr = new Date().toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          if (data.type === 'COMPLAINT') {
            try {
              const saved = localStorage.getItem('dinego_admin_complaints');
              const currentList = saved ? JSON.parse(saved) : [];
              const newComplaint = {
                id: `cmp-${Date.now()}`,
                code: `CMP-${String(Date.now()).slice(-6)}`,
                orderId: reviewModalOrder.id,
                orderNumber: reviewModalOrder.orderNumber,
                customerId: currentUser?.id || reviewModalOrder.customerId || '',
                customerName: currentUser?.fullName || reviewModalOrder.recipientName || 'Khách hàng',
                merchantId: reviewModalOrder.merchant?.id || '',
                merchantName: reviewModalOrder.merchant?.name || 'Nhà hàng DineGo',
                driverId: reviewModalOrder.assignedDriverId || '',
                driverName: reviewModalOrder.assignedDriverName || '',
                issueType: data.description || 'Khiếu nại chất lượng đơn hàng',
                evidenceImage:
                  reviewModalOrder.items?.[0]?.itemImage ||
                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=240&auto=format&fit=crop&q=80',
                compensationAmount: Math.min(reviewModalOrder.finalTotal || 35000, 100000),
                resolutionNotes: '',
                status: 'OPEN',
                createdAt: nowStr,
              };
              const nextComplaints = [
                newComplaint,
                ...(Array.isArray(currentList) ? currentList : []),
              ];
              const serializedComplaints = JSON.stringify(nextComplaints);
              localStorage.setItem('dinego_admin_complaints', serializedComplaints);
              void adminApi.createDatabaseComplaint(newComplaint);
              window.dispatchEvent(new CustomEvent('dinego_complaints_updated'));
              if (typeof BroadcastChannel !== 'undefined') {
                const ch = new BroadcastChannel('dinego_complaints_sync');
                ch.postMessage(serializedComplaints);
                ch.close();
              }
              pushMultiActorNotifications([
                {
                  targetRole: 'ADMIN',
                  category: 'DISPUTE',
                  title: `⚠️ Khiếu nại mới #${newComplaint.code} cho đơn #${reviewModalOrder.orderNumber}`,
                  message: `Khách ${newComplaint.customerName} phản ánh quán "${newComplaint.merchantName}": ${newComplaint.issueType}.`,
                  priority: 'urgent',
                  actionTab: 'admin-complaints',
                  orderRef: reviewModalOrder.orderNumber,
                  senderLabel: newComplaint.customerName,
                },
                {
                  targetRole: 'MERCHANT',
                  targetMerchantId: reviewModalOrder.merchant?.id,
                  category: 'DISPUTE',
                  title: `⚠️ Đơn hàng #${reviewModalOrder.orderNumber} có phản ánh từ khách hàng`,
                  message: `Nội dung: "${newComplaint.issueType}". Vui lòng kiểm tra chất lượng món và phối hợp xử lý.`,
                  priority: 'high',
                  actionTab: 'merchant-orders',
                  orderRef: reviewModalOrder.orderNumber,
                  senderLabel: newComplaint.customerName,
                },
              ]);
            } catch { }
          } else if (data.type === 'REVIEW') {
            try {
              const saved = localStorage.getItem('dinego_merchant_reviews');
              const parsed = saved ? JSON.parse(saved) : [];
              const currentList: any[] = Array.isArray(parsed) ? parsed : [];
              const targetMerchantId = reviewModalOrder.merchant?.id || '';
              const targetMerchantName = reviewModalOrder.merchant?.name || 'Nhà hàng DineGo';
              const itemsSummary = (reviewModalOrder.items || [])
                .map((i) => `${i.quantity}x ${i.itemName}`)
                .join(', ');

              const existingIdx = currentList.findIndex(
                (r) =>
                  (r.orderId && r.orderId === reviewModalOrder.id) ||
                  (r.orderRef && r.orderRef === reviewModalOrder.orderNumber),
              );

              const newReview = {
                id: existingIdx >= 0 ? currentList[existingIdx].id : `rev-${Date.now()}`,
                orderId: reviewModalOrder.id,
                orderRef: reviewModalOrder.orderNumber,
                merchantId: targetMerchantId,
                merchantName: targetMerchantName,
                customerId: currentUser?.id || '',
                customerName:
                  currentUser?.fullName || reviewModalOrder.recipientName || 'Khách hàng',
                itemsSummary,
                rating: Number(data.rating) || 5,
                driverRating: Number(data.driverRating) || 5,
                comment: data.comment || '',
                reply: existingIdx >= 0 ? currentList[existingIdx].reply : null,
                repliedAt: existingIdx >= 0 ? currentList[existingIdx].repliedAt : null,
                date: nowStr,
              };

              const nextList =
                existingIdx >= 0
                  ? currentList.map((r, i) => (i === existingIdx ? newReview : r))
                  : [newReview, ...currentList];

              const serialized = JSON.stringify(nextList);
              localStorage.setItem('dinego_merchant_reviews', serialized);
              window.dispatchEvent(new CustomEvent('dinego_reviews_updated'));
              if (typeof BroadcastChannel !== 'undefined') {
                const ch = new BroadcastChannel('dinego_reviews_sync');
                ch.postMessage(serialized);
                ch.close();
              }
              pushMultiActorNotifications([
                {
                  targetRole: 'MERCHANT',
                  targetMerchantId: targetMerchantId,
                  category: 'REVIEW',
                  title: `⭐ Khách hàng ${newReview.customerName} vừa đánh giá ${newReview.rating} sao cho đơn #${newReview.orderRef}`,
                  message: `"${newReview.comment}" (${itemsSummary || 'Món ăn của quán'}). Bấm để xem và gửi phản hồi ngay!`,
                  priority: 'high',
                  actionTab: 'merchant-analytics',
                  orderRef: newReview.orderRef,
                  senderLabel: newReview.customerName,
                },
                ...(reviewModalOrder.assignedDriverId
                  ? [
                    {
                      targetRole: 'DRIVER' as const,
                      targetDriverId: reviewModalOrder.assignedDriverId,
                      category: 'REVIEW' as const,
                      title: `⭐ Khách hàng đánh giá ${newReview.driverRating} sao cho chuyến giao #${newReview.orderRef}`,
                      message: `Cảm ơn bạn đã hoàn thành tốt chuyến giao đơn #${newReview.orderRef}!`,
                      priority: 'normal' as const,
                      actionTab: 'driver-history' as const,
                      orderRef: newReview.orderRef,
                      senderLabel: newReview.customerName,
                    },
                  ]
                  : []),
              ]);

              // Update merchant rating & review count
              if (targetMerchantId) {
                const mReviews = nextList.filter(
                  (r) =>
                    r.merchantId === targetMerchantId ||
                    (r.merchantName &&
                      r.merchantName.toLowerCase() === targetMerchantName.toLowerCase()),
                );
                if (mReviews.length > 0) {
                  const avg =
                    Math.round(
                      (mReviews.reduce((s, r) => s + (Number(r.rating) || 5), 0) /
                        mReviews.length) *
                      10,
                    ) / 10;
                  setMerchants((prev) =>
                    prev.map((m) =>
                      m.id === targetMerchantId
                        ? {
                          ...m,
                          rating: avg,
                          reviewCount: Math.max(Number(m.reviewCount || 0), mReviews.length),
                        }
                        : m,
                    ),
                  );
                }
              }
            } catch { }
          }
        }}
      />

      {/* MoMo QR Gateway Modal */}
      {activeMomoPaymentOrder && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center', maxWidth: 440 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: 'var(--momo)',
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              M
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              Thanh toán an toàn qua Ví MoMo
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
              Thanh toán cho đơn hàng #{activeMomoPaymentOrder.orderNumber}
            </p>

            <div
              style={{
                background: '#fff',
                padding: 16,
                borderRadius: 16,
                display: 'inline-block',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 170,
                  height: 170,
                  background: '#f8fafc',
                  border: '2px dashed #d82d8b',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d82d8b',
                  fontWeight: 700,
                  gap: 8,
                }}
              >
                <QrCode size={60} color="#d82d8b" />
                <span style={{ fontSize: '0.8rem' }}>Mã QR MoMo Gateway</span>
              </div>
            </div>

            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FF4081', marginBottom: 6 }}>
              {activeMomoPaymentOrder.finalTotal.toLocaleString('vi-VN')} VND
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Giao dịch bảo mật chuẩn MoMo OpenAPI v2
            </p>

            <button
              onClick={handleConfirmMoMoIpn}
              className="btn-momo"
              style={{ marginBottom: 10 }}
            >
              <CheckCircle2 size={18} />
              <span>Tôi đã hoàn tất thanh toán trên MoMo</span>
            </button>

            <button
              onClick={() => setActiveMomoPaymentOrder(null)}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.88rem',
              }}
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dinego_user');
    if (saved) {
      try {
        return hydrateSeedCustomerCoords(JSON.parse(saved));
      } catch {
        return null;
      }
    }
    return null;
  });

  return (
    <CartProvider userId={currentUser?.id ?? null}>
      <AppContent currentUser={currentUser} setCurrentUser={setCurrentUser} />
    </CartProvider>
  );
}
