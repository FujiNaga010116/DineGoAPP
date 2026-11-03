// ==============================================================================
// DineGo Frontend — Main Application Container (Sprints 1 - 5 Full E2E Integration)
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
import { AuthModal } from './components/common/AuthModal';
import { ReviewModal } from './components/common/ReviewModal';
import { CartProvider } from './context/CartContext';
import { MOCK_MERCHANTS, CURRENT_USER } from './api/client';
import type { Merchant, Order, OrderStatus, User } from './types';
import { QrCode, CheckCircle2 } from 'lucide-react';

const INITIAL_SAMPLE_ORDER: Order = {
  id: 'ord-sample-01',
  orderNumber: 'DG20261103-TRK88',
  status: 'COMPLETED',
  subtotal: 150000,
  deliveryFee: 15000,
  discountAmount: 25000,
  finalTotal: 140000,
  deliveryAddress: '45 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM',
  recipientName: 'Nguyễn Văn An',
  recipientPhone: '0901000004',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
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
    paidAt: new Date(Date.now() - 3500000).toISOString(),
  },
};

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant>(MOCK_MERCHANTS[0]);
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'u-customer-001',
    email: 'customer@dinego.vn',
    fullName: 'Nguyễn Văn An (Khách Hàng)',
    phoneNumber: '0901000004',
    roles: ['CUSTOMER'],
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dinego_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        return [INITIAL_SAMPLE_ORDER];
      }
    }
    return [INITIAL_SAMPLE_ORDER];
  });

  const [activeMomoPaymentOrder, setActiveMomoPaymentOrder] = useState<Order | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);

  useEffect(() => {
    localStorage.setItem('dinego_orders', JSON.stringify(orders));
  }, [orders]);

  const handleSelectMerchant = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setCurrentTab('restaurant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMerchantByName = (name: string) => {
    const found = MOCK_MERCHANTS.find((m) =>
      m.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (found) {
      handleSelectMerchant(found);
    } else {
      handleSelectMerchant(MOCK_MERCHANTS[0]);
    }
  };

  const handleOrderPlaced = (newOrder: Order) => {
    setOrders([newOrder, ...orders]);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main style={{ flexGrow: 1 }}>
        {/* Sprint 1 & 2: Food delivery explore */}
        {currentTab === 'home' && (
          <HomePage
            onSelectMerchant={handleSelectMerchant}
            onNavigate={(tab: any) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'restaurant' && (
          <RestaurantPage
            merchant={selectedMerchant}
            onBack={() => setCurrentTab('home')}
            onGoToCheckout={() => setCurrentTab('checkout')}
          />
        )}

        {currentTab === 'checkout' && (
          <CheckoutPage
            onBack={() => setCurrentTab('restaurant')}
            onOrderPlaced={handleOrderPlaced}
          />
        )}

        {/* Sprint 2: My Orders */}
        {currentTab === 'orders' && (
          <OrdersPage
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onPayMoMo={handlePayMoMo}
            onExplore={() => setCurrentTab('home')}
            onOpenReviewModal={(order) => setReviewModalOrder(order)}
          />
        )}

        {/* Sprint 3: Catering & Event Feast */}
        {currentTab === 'catering' && <CateringPage />}

        {/* Sprint 2: Real-time Group Ordering & Split Bill */}
        {currentTab === 'group-order' && <GroupOrderPage />}

        {/* Sprint 4: AI Local Culinary Guide */}
        {currentTab === 'ai-guide' && (
          <AiGuidePage onSelectMerchantByName={handleSelectMerchantByName} />
        )}

        {/* Sprint 4: GPS Shipper Real-Time Tracking */}
        {currentTab === 'tracking' && <TrackingPage />}

        {/* Sprint 5: Dashboard & Moderation & Reconciliation */}
        {currentTab === 'dashboard' && <DashboardPage currentUser={currentUser} />}
      </main>

      <Footer />

      {/* Sprint 1: Auth & Role Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={(user) => {
          setCurrentUser(user);
          // Tự động chuyển tab phù hợp vai trò
          if (user.roles.includes('ADMIN') || user.roles.includes('MERCHANT')) {
            setCurrentTab('dashboard');
          } else if (user.roles.includes('DRIVER')) {
            setCurrentTab('tracking');
          }
        }}
      />

      {/* Sprint 5: Customer Review & Complaint Modal */}
      <ReviewModal
        isOpen={!!reviewModalOrder}
        onClose={() => setReviewModalOrder(null)}
        order={reviewModalOrder}
        onSubmitted={(data) => {
          console.log('[Review / Complaint Submitted]', data);
        }}
      />

      {/* Sprint 6: MoMo Payment Simulator Modal */}
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
              Cổng thanh toán MoMo Sandbox
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
              Mã bảo mật: HMAC-SHA256 • Endpoint: https://test-payment.momo.vn
            </p>

            <button
              onClick={handleConfirmMoMoIpn}
              className="btn-momo"
              style={{ marginBottom: 10 }}
            >
              <CheckCircle2 size={18} />
              <span>Xác nhận MoMo IPN (Chuyển đơn sang CONFIRMED)</span>
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
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}
