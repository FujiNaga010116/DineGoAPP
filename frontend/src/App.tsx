// ==============================================================================
// DineGo Frontend — Main Application Router & Container
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { RestaurantPage } from './pages/RestaurantPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { CartProvider } from './context/CartContext';
import { MOCK_MERCHANTS } from './api/client';
import type { Merchant, Order, OrderStatus } from './types';
import { QrCode, CheckCircle2 } from 'lucide-react';

const INITIAL_SAMPLE_ORDER: Order = {
  id: 'ord-sample-01',
  orderNumber: 'DG20261028-4D25CA',
  status: 'CONFIRMED',
  subtotal: 150000,
  deliveryFee: 15000,
  discountAmount: 25000,
  finalTotal: 140000,
  deliveryAddress: '13 Lò Đúc, Phường Phạm Đình Hổ, Hai Bà Trưng, Hà Nội',
  recipientName: 'Nguyễn Văn An',
  recipientPhone: '0987654321',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  merchant: {
    id: 'merchant-pho-thin',
    name: 'Phở Thìn Lò Đúc 1979',
    address: '13 Lò Đúc, Hai Bà Trưng, Hà Nội',
    phoneNumber: '0901234567',
  },
  items: [
    {
      id: 'oi-1',
      itemName: 'Phở Bò Tái Lăn Truyền Thống',
      basePrice: 75000,
      quantity: 2,
      subtotal: 150000,
      toppings: [
        { id: 't-1', toppingName: 'Quẩy giòn nóng hổi', toppingPrice: 10000 },
      ],
    },
  ],
  payment: {
    id: 'pay-sample-01',
    paymentMethod: 'MOMO_QR',
    paymentStatus: 'SUCCESS',
    amount: 140000,
    currency: 'VND',
    transactionRef: 'MOMO-293810294',
    paidAt: new Date(Date.now() - 3500000).toISOString(),
  },
};

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'home' | 'restaurant' | 'checkout' | 'orders'>('home');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant>(MOCK_MERCHANTS[0]);
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dinego_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [INITIAL_SAMPLE_ORDER];
      }
    }
    return [INITIAL_SAMPLE_ORDER];
  });
  const [activeMomoPaymentOrder, setActiveMomoPaymentOrder] = useState<Order | null>(null);

  useEffect(() => {
    localStorage.setItem('dinego_orders', JSON.stringify(orders));
  }, [orders]);

  const handleSelectMerchant = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setCurrentTab('restaurant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <Header currentTab={currentTab} onNavigate={(tab) => {
        setCurrentTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }} />

      <main style={{ flexGrow: 1 }}>
        {currentTab === 'home' && (
          <HomePage
            onSelectMerchant={handleSelectMerchant}
            onNavigate={(tab) => setCurrentTab(tab)}
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

        {currentTab === 'orders' && (
          <OrdersPage
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onPayMoMo={handlePayMoMo}
            onExplore={() => setCurrentTab('home')}
          />
        )}
      </main>

      <Footer />

      {/* MoMo QR Modal Simulator */}
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
