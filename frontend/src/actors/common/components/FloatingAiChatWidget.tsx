// ==============================================================================
// DineGo Frontend — Floating Grab-Style Support & Culinary AI Chatbox Widget
// - Requires Login before chatting (links session to real user in SQL Server)
// ==============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  X,
  Send,
  RotateCcw,
  ArrowRight,
  Headphones,
  Minimize2,
  Plus,
  LogIn,
  History,
} from 'lucide-react';
import { customerApi } from '../../../api/client';
import { useCart } from '../../../context/CartContext';
import type { NavTab } from './Header';
import type { Merchant, MenuItem, User } from '../../../types';

interface RecommendationCard {
  id: string;
  name: string;
  price: number;
  description: string;
  merchantId: string;
  merchantSlug?: string;
  merchantName: string;
  rating: number;
}

interface QuickActionLink {
  label: string;
  tab: NavTab;
}

interface WidgetMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  recommendations?: RecommendationCard[];
  quickActions?: QuickActionLink[];
  timestamp: string;
}

export interface FloatingAiChatWidgetProps {
  currentUser?: User | null;
  merchants: Merchant[];
  menuItems: MenuItem[];
  onOpenAuthModal: () => void;
  onSelectMerchant: (merchant: Merchant) => void;
  onNavigate: (tab: NavTab) => void;
}

const QUICK_PROMPTS = [
  '🍜 Trưa nay ăn gì dưới 65k?',
  '🎫 Xem mã giảm giá đang có',
  '🎉 Tư vấn đặt mâm cỗ sự kiện',
  '📦 Kiểm tra đơn hàng của tôi',
];

const WELCOME_MSG: WidgetMessage = {
  id: 'welcome-1',
  sender: 'ai',
  text: 'Xin chào! Mình là Trợ lý AI của DineGo. Bạn cần tìm món ngon, kiểm tra đơn hàng hay hỗ trợ đặt mâm cỗ?',
  timestamp: 'Trực tuyến',
};

export const FloatingAiChatWidget: React.FC<FloatingAiChatWidgetProps> = ({
  currentUser,
  merchants,
  menuItems,
  onOpenAuthModal,
  onSelectMerchant,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [addedDishId, setAddedDishId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => `wchat-${Date.now()}`);
  const { addItem } = useCart();

  const storageKey = `dinego_floating_chat_${currentUser?.id || 'guest'}`;

  const [messages, setMessages] = useState<WidgetMessage[]>([WELCOME_MSG]);
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState<
    Array<{ id: string; title: string; lastMessage: string; updatedAt: string }>
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-minimize chatbox when clicking anywhere outside the widget
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetContainerRef.current && !widgetContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadWidgetHistory = async () => {
    if (!currentUser) return;
    setLoadingHistory(true);
    const data = await customerApi.getWidgetSessions(currentUser.id, currentUser.email);
    if (Array.isArray(data)) setHistorySessions(data);
    setLoadingHistory(false);
  };

  const handleRestoreSession = async (targetSessionId: string) => {
    const rows = await customerApi.getWidgetSessionMessages(targetSessionId);
    if (Array.isArray(rows) && rows.length > 0) {
      setSessionId(targetSessionId);
      setMessages(rows as WidgetMessage[]);
      setShowHistory(false);
    }
  };

  // Load AI messages per logged-in user and isolate state cleanly when switching accounts
  useEffect(() => {
    setShowHistory(false);
    setHistorySessions([]);
    setSessionId(`wchat-${currentUser?.id || 'guest'}-${Date.now()}`);
    if (!currentUser) {
      setMessages([WELCOME_MSG]);
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    setMessages([WELCOME_MSG]);
  }, [currentUser?.id, storageKey]);

  useEffect(() => {
    if (!currentUser) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages, storageKey, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [messages, isOpen, isTyping]);

  const handleResetChat = () => {
    setSessionId(`wchat-${Date.now()}`);
    setMessages([WELCOME_MSG]);
  };

  const handleSend = async (overrideText?: string) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    const text = (overrideText ?? inputText).trim();
    if (!text || isTyping) return;

    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (!overrideText) setInputText('');

    const userMsg: WidgetMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        text: m.text,
        recommendedIds: (m.recommendations || []).map((r) => r.id),
      }));
      const data = await customerApi.sendWidgetChat({
        message: text,
        userId: currentUser.id,
        userEmail: currentUser.email,
        sessionId,
        history: historyPayload,
      });
      if (!data) {
        throw new Error('Backend unavailable');
      }
      if (data?.sessionId) setSessionId(data.sessionId);
      const aiMsg: WidgetMessage = {
        id: `a-${Date.now()}`,
        sender: 'ai',
        text: data.reply || 'Mình đã tiếp nhận yêu cầu của bạn.',
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        quickActions: Array.isArray(data.quickActions) ? (data.quickActions as QuickActionLink[]) : [],
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'ai',
          text: 'Không kết nối được tới máy chủ AI Backend (http://localhost:3000). Vui lòng kiểm tra Backend đang chạy và thử lại.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAddDish = (rec: RecommendationCard) => {
    const targetMerchant =
      merchants.find(
        (m) =>
          m.id === rec.merchantId ||
          (rec.merchantSlug && m.slug === rec.merchantSlug) ||
          m.name.toLowerCase() === rec.merchantName.toLowerCase(),
      ) || merchants[0];
    const matchedDish =
      menuItems.find((item) => item.id === rec.id || item.name.toLowerCase() === rec.name.toLowerCase()) ||
      ({
        id: rec.id,
        merchantId: targetMerchant?.id || rec.merchantId,
        categoryId: 'cat-ai',
        name: rec.name,
        slug: rec.id,
        description: rec.description,
        basePrice: rec.price,
        isAvailable: true,
        isActive: true,
        imageUrl: undefined,
        toppings: [],
      } as MenuItem);
    const added = addItem(
      targetMerchant?.id || rec.merchantId,
      targetMerchant?.name || rec.merchantName,
      matchedDish,
      1,
      [],
    );
    if (added) {
      setAddedDishId(rec.id);
      setTimeout(() => setAddedDishId(null), 1800);
    }
  };

  const handleOpenMerchant = (rec: RecommendationCard) => {
    const target =
      merchants.find(
        (m) =>
          m.id === rec.merchantId ||
          (rec.merchantSlug && m.slug === rec.merchantSlug) ||
          m.name.toLowerCase() === rec.merchantName.toLowerCase(),
      ) || merchants[0];
    if (target) {
      onSelectMerchant(target);
      setIsOpen(false);
    }
  };

  return (
    <div ref={widgetContainerRef} style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 1200 }}>
      {isOpen && (
        <div
          style={{
            width: 380,
            maxWidth: 'calc(100vw - 28px)',
            height: 540,
            maxHeight: 'calc(100vh - 100px)',
            background: '#FFFFFF',
            borderRadius: 20,
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.24)',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #00B14F 0%, #047857 100%)',
              color: '#FFFFFF',
              padding: '13px 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Headphones size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.2 }}>
                  Trợ lý AI DineGo
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Gemini AI • Gợi ý món &amp; Hỗ trợ
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {currentUser && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showHistory;
                      setShowHistory(next);
                      if (next) void loadWidgetHistory();
                    }}
                    title="Xem lại lịch sử các cuộc trò chuyện cũ"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: 'none',
                      background: showHistory ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.18)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <History size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHistory(false);
                      handleResetChat();
                    }}
                    title="Cuộc trò chuyện mới (Lịch sử cũ vẫn được lưu)"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(255,255,255,0.18)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={13} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Thu gọn"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.18)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Minimize2 size={13} />
              </button>
            </div>
          </div>

          {/* Body: Require Login Gate if Guest */}
          {!currentUser ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '28px 24px',
                textAlign: 'center',
                background: '#F8FAFC',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#00B14F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogIn size={28} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0F172A' }}>
                Đăng nhập để trò chuyện
              </h4>
              <p style={{ margin: 0, fontSize: '0.83rem', color: '#64748B', lineHeight: 1.5 }}>
                Vui lòng đăng nhập tài khoản DineGo để Trợ lý AI có thể kiểm tra đơn hàng, mã giảm giá và gợi ý món ăn chuẩn xác cho bạn.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAuthModal();
                }}
                style={{
                  marginTop: 6,
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#00B14F',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <LogIn size={16} />
                <span>Đăng nhập ngay</span>
              </button>
            </div>
          ) : showHistory ? (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px',
                background: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                  Lịch sử hội thoại đã lưu
                </span>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  style={{
                    border: 'none',
                    background: '#E2E8F0',
                    color: '#334155',
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Quay lại chat
                </button>
              </div>
              {loadingHistory ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
                  Đang tải lịch sử từ SQL Server...
                </div>
              ) : historySessions.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
                  Chưa có cuộc trò chuyện cũ nào được lưu.
                </div>
              ) : (
                historySessions.map((hs) => (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => void handleRestoreSession(hs.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: hs.id === sessionId ? '1px solid #00B14F' : '1px solid #E2E8F0',
                      background: hs.id === sessionId ? '#ECFDF5' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                        {hs.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', flexShrink: 0 }}>
                        {hs.updatedAt}
                      </span>
                    </div>
                    {hs.lastMessage && (
                      <span
                        style={{
                          fontSize: '0.76rem',
                          color: '#475569',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {hs.lastMessage}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '14px 14px 10px',
                  background: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '86%',
                        padding: '10px 13px',
                        borderRadius:
                          msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.sender === 'user' ? '#00B14F' : '#FFFFFF',
                        color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B',
                        fontSize: '0.83rem',
                        lineHeight: 1.48,
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
                        border: msg.sender === 'ai' ? '1px solid #E2E8F0' : 'none',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {msg.text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={idx}>{part.slice(2, -2)}</strong>
                        ) : (
                          <React.Fragment key={idx}>{part}</React.Fragment>
                        ),
                      )}
                    </div>

                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          marginTop: 8,
                          width: '92%',
                        }}
                      >
                        {msg.recommendations.map((rec) => (
                          <div
                            key={rec.id}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 12,
                              padding: '10px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 10,
                              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  color: '#0F172A',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {rec.name}
                              </div>
                              <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 2 }}>
                                {rec.merchantName} • ★ {rec.rating.toFixed(1)}
                              </div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00B14F', marginTop: 2 }}>
                                {rec.price.toLocaleString('vi-VN')}đ
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleQuickAddDish(rec)}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: 8,
                                  border: 'none',
                                  background: addedDishId === rec.id ? '#059669' : '#00B14F',
                                  color: '#FFFFFF',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 3,
                                }}
                              >
                                <Plus size={12} />
                                <span>{addedDishId === rec.id ? 'Đã thêm' : 'Thêm giỏ'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenMerchant(rec)}
                                style={{
                                  padding: '4px 9px',
                                  borderRadius: 8,
                                  border: '1px solid #CBD5E1',
                                  background: '#F8FAFC',
                                  color: '#334155',
                                  fontSize: '0.71rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 3,
                                }}
                              >
                                <span>Xem quán</span>
                                <ArrowRight size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.quickActions && msg.quickActions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                        {msg.quickActions.map((qa) => (
                          <button
                            key={qa.label}
                            type="button"
                            onClick={() => {
                              onNavigate(qa.tab);
                              setIsOpen(false);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              border: '1px solid #00B14F',
                              background: '#ECFDF5',
                              color: '#047857',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {qa.label} →
                          </button>
                        ))}
                      </div>
                    )}

                    <span style={{ fontSize: '0.66rem', color: '#94A3B8', marginTop: 3 }}>
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 14,
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      color: '#64748B',
                      fontWeight: 700,
                    }}
                  >
                    DineGo đang trả lời...
                  </div>
                )}
                <div ref={listEndRef} />
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  background: '#FFFFFF',
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  flexShrink: 0,
                }}
              >
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => void handleSend(qp)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 999,
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#334155',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {qp}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
                style={{
                  padding: '10px 12px',
                  background: '#FFFFFF',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <input
                  type="text"
                  placeholder="Nhập câu hỏi món ăn, voucher, hỗ trợ..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 999,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '0.82rem',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    background: inputText.trim() && !isTyping ? '#00B14F' : '#CBD5E1',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputText.trim() && !isTyping ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Small Circular Floating Launcher Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Hỗ trợ & Tư vấn AI DineGo"
          style={{
            width: 52,
            height: 52,
            padding: 0,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #00B14F 0%, #059669 100%)',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(0, 177, 79, 0.38)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </div>
  );
};
