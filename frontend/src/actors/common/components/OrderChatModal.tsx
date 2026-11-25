// ==============================================================================
// DineGo Frontend — Real-time Order Chat Modal
// Enables seamless two-way communication between:
// 1. Customer <-> Merchant (prep notes, special requests, menu adjustments)
// 2. Customer <-> Driver (delivery instructions, location notes, arrival alerts)
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Store,
  Bike,
  User,
  Sparkles,
  CheckCheck,
  MessageSquare,
} from 'lucide-react';
import type { Order, OrderChatChannel, OrderChatMessage, OrderChatSenderRole } from '../../../types';
import {
  getOrderChatMessages,
  markOrderMessagesAsRead,
  QUICK_CANNED_REPLIES,
  seedInitialOrderGreetings,
  sendOrderChatMessage,
  subscribeOrderChat,
} from '../../../utils/orderChat';

interface OrderChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  currentUserRole?: OrderChatSenderRole;
  currentUserId?: string;
  currentUserName?: string;
  defaultChannel?: OrderChatChannel;
  assignedDriverName?: string;
}

export const OrderChatModal: React.FC<OrderChatModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUserRole = 'CUSTOMER',
  currentUserId = 'current-user',
  currentUserName = 'Bạn',
  defaultChannel,
  assignedDriverName,
}) => {
  const driverName = assignedDriverName || order?.assignedDriverName || '';
  const hasDriver = Boolean(order?.assignedDriverId || (driverName && driverName !== 'Chưa ghép tài xế'));

  const [activeChannel, setActiveChannel] = useState<OrderChatChannel>(() => {
    if (defaultChannel) return defaultChannel;
    if (currentUserRole === 'DRIVER') return 'CUSTOMER_DRIVER';
    return 'CUSTOMER_MERCHANT';
  });

  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync active channel when opening with specified channel
  useEffect(() => {
    if (defaultChannel) {
      setActiveChannel(defaultChannel);
    } else if (currentUserRole === 'DRIVER') {
      setActiveChannel('CUSTOMER_DRIVER');
    } else if (currentUserRole === 'MERCHANT') {
      setActiveChannel('CUSTOMER_MERCHANT');
    }
  }, [defaultChannel, currentUserRole, isOpen]);

  // Seed greetings and load messages when order or channel changes
  useEffect(() => {
    if (!isOpen || !order) return;

    seedInitialOrderGreetings(order, driverName);
    const msgs = getOrderChatMessages(order.id, activeChannel);
    setMessages(msgs);
    markOrderMessagesAsRead(order.id, activeChannel, currentUserId);
  }, [isOpen, order?.id, activeChannel, currentUserId, driverName]);

  // Subscribe to real-time chat updates
  useEffect(() => {
    if (!isOpen || !order) return;

    const unsubscribe = subscribeOrderChat((incomingMsg) => {
      if (incomingMsg.orderId === order.id && incomingMsg.channel === activeChannel) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });
        markOrderMessagesAsRead(order.id, activeChannel, currentUserId);
      }
    });

    return () => unsubscribe();
  }, [isOpen, order?.id, activeChannel, currentUserId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !order) return null;

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text) return;

    const newMsg = sendOrderChatMessage({
      orderId: order.id,
      orderNumber: order.orderNumber,
      channel: activeChannel,
      senderRole: currentUserRole,
      senderId: currentUserId,
      senderName: currentUserName,
      message: text,
    });

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const cannedReplies =
    QUICK_CANNED_REPLIES[currentUserRole]?.[activeChannel] || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          height: '620px',
          maxHeight: '90vh',
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background:
                  activeChannel === 'CUSTOMER_MERCHANT'
                    ? 'rgba(2, 132, 199, 0.25)'
                    : 'rgba(0, 177, 79, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeChannel === 'CUSTOMER_MERCHANT' ? '#38BDF8' : '#4ADE80',
              }}
            >
              {activeChannel === 'CUSTOMER_MERCHANT' ? (
                <Store size={20} />
              ) : (
                <Bike size={20} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Đơn hàng #{order.orderNumber}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.15)',
                    fontWeight: 600,
                  }}
                >
                  Trực tuyến
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 2 }}>
                {activeChannel === 'CUSTOMER_MERCHANT'
                  ? `Nhà hàng: ${order.merchant?.name || 'Cửa hàng'}`
                  : `Shipper: ${driverName || 'Chưa nhận đơn'}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Channel Switcher Tabs (For Customer or when role permits) */}
        {currentUserRole === 'CUSTOMER' && (
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              padding: '4px 8px',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveChannel('CUSTOMER_MERCHANT')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 9,
                border: 'none',
                background:
                  activeChannel === 'CUSTOMER_MERCHANT' ? '#FFFFFF' : 'transparent',
                color:
                  activeChannel === 'CUSTOMER_MERCHANT' ? '#0284C7' : '#64748B',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow:
                  activeChannel === 'CUSTOMER_MERCHANT'
                    ? '0 1px 3px rgba(0,0,0,0.08)'
                    : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Store size={15} />
              <span>Quán ({order.merchant?.name || 'Nhà hàng'})</span>
            </button>

            <button
              type="button"
              disabled={!hasDriver}
              onClick={() => setActiveChannel('CUSTOMER_DRIVER')}
              title={!hasDriver ? 'Chưa có tài xế nhận đơn này' : undefined}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 9,
                border: 'none',
                background:
                  activeChannel === 'CUSTOMER_DRIVER' ? '#FFFFFF' : 'transparent',
                color: !hasDriver
                  ? '#94A3B8'
                  : activeChannel === 'CUSTOMER_DRIVER'
                  ? '#059669'
                  : '#64748B',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: hasDriver ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow:
                  activeChannel === 'CUSTOMER_DRIVER'
                    ? '0 1px 3px rgba(0,0,0,0.08)'
                    : 'none',
                transition: 'all 0.15s ease',
                opacity: !hasDriver ? 0.6 : 1,
              }}
            >
              <Bike size={15} />
              <span>Tài xế ({hasDriver ? driverName : 'Chờ ghép...'})</span>
            </button>
          </div>
        )}

        {/* Channel Role Banner when in Merchant / Driver mode */}
        {currentUserRole !== 'CUSTOMER' && (
          <div
            style={{
              padding: '8px 16px',
              background: currentUserRole === 'MERCHANT' ? '#EFF6FF' : '#F0FDF4',
              color: currentUserRole === 'MERCHANT' ? '#0369A1' : '#15803D',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0,
            }}
          >
            <span>
              Đang nhắn tin với khách hàng: <strong>{order.recipientName}</strong> ({order.recipientPhone})
            </span>
            <span>Địa chỉ: {order.deliveryAddress}</span>
          </div>
        )}

        {/* Message Bubble Thread */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#F8FAFC',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94A3B8',
                fontSize: '0.84rem',
              }}
            >
              <MessageSquare size={36} color="#CBD5E1" style={{ margin: '0 auto 10px' }} />
              <div>Chưa có tin nhắn nào trong kênh này.</div>
              <div style={{ fontSize: '0.76rem', marginTop: 4 }}>
                Hãy gửi tin nhắn hoặc chọn gợi ý nhanh bên dưới để bắt đầu trao đổi!
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              const formattedTime = new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* Sender Header */}
                  {!isMine && (
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color:
                          msg.senderRole === 'MERCHANT'
                            ? '#0284C7'
                            : msg.senderRole === 'DRIVER'
                            ? '#059669'
                            : '#475569',
                        marginBottom: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {msg.senderRole === 'MERCHANT' ? (
                        <>
                          <Store size={11} />
                          <span>[Quán] {msg.senderName}</span>
                        </>
                      ) : msg.senderRole === 'DRIVER' ? (
                        <>
                          <Bike size={11} />
                          <span>[Shipper] {msg.senderName}</span>
                        </>
                      ) : (
                        <>
                          <User size={11} />
                          <span>[Khách] {msg.senderName}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isMine
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      background: isMine
                        ? 'linear-gradient(135deg, #00B14F 0%, #059669 100%)'
                        : '#FFFFFF',
                      color: isMine ? '#FFFFFF' : '#0F172A',
                      fontSize: '0.86rem',
                      lineHeight: 1.45,
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                      border: isMine ? 'none' : '1px solid #E2E8F0',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.message}
                  </div>

                  {/* Timestamp & Read state */}
                  <div
                    style={{
                      fontSize: '0.67rem',
                      color: '#94A3B8',
                      marginTop: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0 2px',
                    }}
                  >
                    <span>{formattedTime}</span>
                    {isMine && <CheckCheck size={12} color="#10B981" />}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Canned Replies Carousel */}
        {cannedReplies.length > 0 && (
          <div
            style={{
              padding: '8px 14px',
              background: '#FFFFFF',
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            {cannedReplies.map((reply, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(reply)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 999,
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  color: '#334155',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <Sparkles size={11} color="#00B14F" />
                <span>{reply}</span>
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Bar */}
        <div
          style={{
            padding: '12px 16px',
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeChannel === 'CUSTOMER_MERCHANT'
                ? 'Nhắn tin cho quán (ít đá, không hành, gia vị...)'
                : 'Nhắn tin cho shipper (chỉ đường, bấm chuông...)'
            }
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 24,
              border: '1.5px solid #CBD5E1',
              fontSize: '0.86rem',
              outline: 'none',
              background: '#F8FAFC',
              color: '#0F172A',
            }}
          />

          <button
            type="button"
            disabled={!inputText.trim()}
            onClick={() => handleSendMessage()}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: inputText.trim() ? '#00B14F' : '#CBD5E1',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={18} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>
    </div>
  );
};
