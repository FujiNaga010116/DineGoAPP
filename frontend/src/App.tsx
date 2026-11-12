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
import { AiGuidePage } from './pages/AiGuidePage';
import { TrackingPage } from './pages/TrackingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomerProfilePage } from './pages/CustomerProfilePage';
import { AuthModal } from './components/common/AuthModal';
import { ReviewModal } from './components/common/ReviewModal';
import { MerchantRegistrationModal } from './components/common/MerchantRegistrationModal';
import { AddressSetupModal } from './components/common/AddressSetupModal';
import { CartProvider } from './context/CartContext';
import { MOCK_MERCHANTS, MOCK_MENU_ITEMS, MOCK_DRIVERS, MOCK_USERS } from './api/client';
import type { DriverProfile, Merchant, MenuItem, Order, OrderStatus, Role, SavedAddress, User } from './types';
import { QrCode, CheckCircle2 } from 'lucide-react';

const INITIAL_SAMPLE_ORDER: Order = {
  id: 'ord-sample-01',
  orderNumber: 'DG20261103-TRK88',
  customerId: 'u-user1-001',
  customerEmail: 'customer@dinego.vn',
  status: 'PREPARING',
  subtotal: 150000,
  deliveryFee: 15000,
  discountAmount: 25000,
  finalTotal: 140000,
  deliveryAddress: '45 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM',
  recipientName: 'Nguyễn Văn An',
  recipientPhone: '0901000004',
  createdAt: new Date(Date.now() - 1800000).toISOString(),
  merchant: {
    id: 'merchant-com-tam',
    name: 'Cơm Tấm Sài Gòn 1985',
    address: '123 Nguyễn Huệ, Quận 1, TP. HCM',
    phoneNumber: '0901000002',
  },
  items: [
    {
      id: 'oi-1',
      itemName: 'Cơm Tấm Sườn Cọng Nướng Than',
      basePrice: 65000,
      quantity: 2,
      subtotal: 130000,
      toppings: [
        { id: 't-1', toppingName: 'Trứng ốp la lòng đào', toppingPrice: 10000 },
      ],
    },
  ],
  payment: {
    id: 'pay-sample-01',
    paymentMethod: 'MOMO_QR',
    paymentStatus: 'SUCCESS',
    amount: 140000,
    currency: 'VND',
    transactionRef: 'MOMO-99887766',
    paidAt: new Date(Date.now() - 1700000).toISOString(),
  },
};

interface AppContentProps {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

function hydrateSeedCustomerCoords(user: User): User {
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

export const AppContent: React.FC<AppContentProps> = ({ currentUser, setCurrentUser }) => {
  // 1. Users state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('dinego_users_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u) => hydrateSeedCustomerCoords(u));
        }
      } catch {}
    }
    return MOCK_USERS;
  });

  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (currentUser?.roles?.includes('ADMIN')) return 'admin-overview';
    if (currentUser?.roles?.includes('MERCHANT')) return 'merchant-orders';
    if (currentUser?.roles?.includes('DRIVER')) return 'driver-orders';
    return 'home';
  });

  // 2. Merchants state (Each restaurant is 1-to-1 bound to its own account)
  const [merchants, setMerchants] = useState<Merchant[]>(() => {
    const saved = localStorage.getItem('dinego_merchants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return MOCK_MERCHANTS;
  });

  // 3. Drivers state (Multiple independent driver accounts)
  const [drivers, setDrivers] = useState<DriverProfile[]>(() => {
    const saved = localStorage.getItem('dinego_drivers_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return MOCK_DRIVERS;
  });

  // Current merchant profile for the logged in merchant user
  const selectedMerchant =
    currentUser?.merchantId
      ? merchants.find((m) => m.id === currentUser.merchantId) || merchants[0]
      : merchants[0];

  // Current driver profile for the logged in driver user
  const currentDriverProfile =
    currentUser?.driverId
      ? drivers.find((d) => d.id === currentUser.driverId) || drivers[0]
      : drivers[0];

  const [allMenuItems, setAllMenuItems] = useState<Record<string, MenuItem[]>>(() => {
    const saved = localStorage.getItem('dinego_menu_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return MOCK_MENU_ITEMS;
  });

  const [isMerchantRegisterModalOpen, setIsMerchantRegisterModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('dinego_users_list', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('dinego_merchants', JSON.stringify(merchants));
  }, [merchants]);

  useEffect(() => {
    localStorage.setItem('dinego_drivers_list', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('dinego_menu_items', JSON.stringify(allMenuItems));
  }, [allMenuItems]);

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dinego_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((o: Order) =>
            o.id === INITIAL_SAMPLE_ORDER.id && !o.customerId
              ? {
                  ...o,
                  customerId: INITIAL_SAMPLE_ORDER.customerId,
                  customerEmail: INITIAL_SAMPLE_ORDER.customerEmail,
                }
              : o,
          );
        }
      } catch {
        return [INITIAL_SAMPLE_ORDER];
      }
    }
    return [INITIAL_SAMPLE_ORDER];
  });

  const [activeMomoPaymentOrder, setActiveMomoPaymentOrder] = useState<Order | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authTargetRole, setAuthTargetRole] = useState<Role>('CUSTOMER');
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [isAddressSetupModalOpen, setIsAddressSetupModalOpen] = useState(false);
  const [pendingAfterAddressSetup, setPendingAfterAddressSetup] = useState<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem('dinego_orders', JSON.stringify(orders));
  }, [orders]);

  const handleLogout = () => {
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

  // Register a new independent Merchant
  const handleMerchantRegistered = (
    newMerchant: Merchant,
    newOwnerUser: User,
    initialDishes: MenuItem[] = [],
  ) => {
    setMerchants((prev) => [newMerchant, ...prev]);
    setUsers((prev) => [newOwnerUser, ...prev]);
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

  // Register a new independent Driver
  const handleDriverRegistered = (newDriver: DriverProfile, newDriverUser: User) => {
    setDrivers((prev) => [newDriver, ...prev]);
    setUsers((prev) => [newDriverUser, ...prev]);
    setCurrentUser(newDriverUser);
    localStorage.setItem('dinego_user', JSON.stringify(newDriverUser));
    setActiveMomoPaymentOrder(null);
    setReviewModalOrder(null);
    setCurrentTab('driver-orders');
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

  // Update Driver profile & vehicle info
  const handleUpdateDriverProfile = (updatedDriver: DriverProfile, updatedUser?: User) => {
    setDrivers((prev) => prev.map((d) => (d.id === updatedDriver.id ? updatedDriver : d)));
    if (updatedUser) {
      setCurrentUser(updatedUser);
      localStorage.setItem('dinego_user', JSON.stringify(updatedUser));
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    }
  };

  // Admin toggles user account active / suspended
  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: u.isActive === false ? true : false } : u)),
    );
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
    if (!currentUser) return;
    const ownedOrder: Order = {
      ...newOrder,
      customerId: newOrder.customerId || currentUser.id,
      customerEmail: newOrder.customerEmail || currentUser.email,
    };
    setOrders([ownedOrder, ...orders]);
    setCurrentTab('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(
      orders.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: newStatus,
          };
        }
        return o;
      }),
    );
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
    currentTab === 'admin-knowledge' ||
    currentTab === 'admin-settings';

  const isDriverPortalMode =
    currentTab === 'driver-orders' ||
    currentTab === 'driver-map' ||
    currentTab === 'driver-earnings' ||
    currentTab === 'driver-profile' ||
    (currentTab === 'tracking' && Boolean(currentUser?.roles?.includes('DRIVER')));

  const isDriverOrTrackingTab =
    currentTab === 'tracking' ||
    currentTab === 'driver-orders' ||
    currentTab === 'driver-map' ||
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
    : [];

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
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          currentUser={currentUser}
          onOpenAuthModal={handleOpenAuthModal}
          onLogout={handleLogout}
          onOpenMerchantRegisterModal={() => setIsMerchantRegisterModalOpen(true)}
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
            onOpenMerchantRegisterModal={() => setIsMerchantRegisterModalOpen(true)}
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
            onPayMoMo={handlePayMoMo}
            onExplore={() => setCurrentTab('home')}
            onOpenReviewModal={(order) => setReviewModalOrder(order)}
          />
        )}

        {currentTab === 'catering' && (
          <CateringPage key={currentUser?.id || 'guest'} currentUser={currentUser} />
        )}

        {currentTab === 'group-order' && <GroupOrderPage />}

        {currentTab === 'ai-guide' && (
          <AiGuidePage onSelectMerchantByName={handleSelectMerchantByName} />
        )}

        {currentTab === 'customer-profile' && (
          <CustomerProfilePage
            key={currentUser?.id || 'guest'}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {/* 2. DRIVER PARTNER CONSOLE SHELL & CUSTOMER TRACKING VIEW */}
        {isDriverOrTrackingTab && (
          <TrackingPage
            key={isDriverPortalMode ? currentDriverProfile.id : currentUser?.id || 'guest'}
            activeOrder={isDriverPortalMode ? orders[0] || null : customerOrders[0] || null}
            allOrders={isDriverPortalMode ? orders : customerOrders}
            activeTab={currentTab}
            onNavigate={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            isDriverMode={isDriverPortalMode}
            currentDriver={currentDriverProfile}
            currentUser={currentUser}
            onUpdateDriverProfile={handleUpdateDriverProfile}
            onLogout={handleLogout}
            onOpenReviewModal={(order) => setReviewModalOrder(order)}
            onExploreFood={() => setCurrentTab('home')}
          />
        )}

        {/* 3. MERCHANT SELLER CENTER SHELL & 4. ENTERPRISE ADMIN BACKOFFICE SHELL */}
        {(isMerchantPortalTab || isAdminPortalTab) && (
          <DashboardPage
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
            allMerchants={merchants}
            allDriversList={drivers}
            allUsersList={users}
            onToggleUserStatus={handleToggleUserStatus}
            onOpenMerchantRegisterModal={() => setIsMerchantRegisterModalOpen(true)}
          />
        )}
      </main>

      {isCustomerStorefrontShell && (
        <Footer
          onNavigate={(tab) => {
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenAuthModal={handleOpenAuthModal}
          onOpenMerchantRegisterModal={() => setIsMerchantRegisterModalOpen(true)}
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
        onRegisterMerchantAccount={handleMerchantRegistered}
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
            setCurrentTab('merchant-orders');
          } else if (user.roles.includes('DRIVER')) {
            setCurrentTab('driver-orders');
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
          console.log('[Review / Complaint Submitted]', data);
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
