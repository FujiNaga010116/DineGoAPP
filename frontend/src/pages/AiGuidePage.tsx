// ==============================================================================
// DineGo Frontend — AI Local Culinary Guide (Sprint 4 — U034 to U038)
// ==============================================================================

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Utensils,
  MapPin,
  Flame,
  ArrowRight,
  Compass,
} from 'lucide-react';
import type { Merchant } from '../types';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  recommendedDishes?: {
    name: string;
    restaurant: string;
    price: number;
    region: string;
    description: string;
  }[];
  timestamp: string;
}

interface AiGuidePageProps {
  onSelectMerchantByName?: (name: string) => void;
}

const PRESET_QUERIES = [
  '🍜 Trưa nay ăn gì thanh đạm dưới 60.000đ?',
  '🌶️ Tìm món cay nồng đậm đà chuẩn vị miền Trung',
  '🥩 Gợi ý quán cơm tấm sườn nướng chuẩn Sài Gòn 1985',
  '🥗 Món ăn nhẹ healthy ít dầu mỡ cho bữa tối',
];

export const AiGuidePage: React.FC<AiGuidePageProps> = ({ onSelectMerchantByName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Xin chào! Tôi là **DineGo AI Local Culinary Guide** — trợ lý ẩm thực bản địa thông minh của bạn. Hãy nói cho tôi biết khẩu vị hôm nay của bạn (chua, cay, mặn, ngọt), vùng miền yêu thích (Bắc - Trung - Nam) hoặc ngân sách, tôi sẽ tìm cho bạn món ăn ưng ý nhất!',
      timestamp: '12:00',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    // AI Simulation with Local RAG Knowledge (Phù hợp Sprint 4 RAG Engine)
    setTimeout(() => {
      let aiResponseText = '';
      let dishes: any[] = [];

      const lower = prompt.toLowerCase();
      if (lower.includes('hà nội') || lower.includes('phở') || lower.includes('thanh đạm')) {
        aiResponseText =
          'Dựa trên kho tri thức ẩm thực Hà Thành, món lý tưởng nhất cho bạn hôm nay là **Phở Bò Tái Lăn** hoặc **Phở Bò Tái Nạm**. Nước dùng hầm từ xương bò tươi suốt 12 tiếng thơm nức mùi gừng nướng, thảo quả và hoa hồi, ăn kèm quẩy giòn chuẩn điệu phố cổ.';
        dishes = [
          {
            name: 'Phở Bò Tái Lăn Truyền Thống',
            restaurant: 'Phở Thìn Lò Đúc 1979',
            price: 75000,
            region: 'Hà Nội (Miền Bắc)',
            description: 'Thịt bò xào lăn tỏi tươi, hành lá xắt nhuyễn đầy ắp mặt tô.',
          },
        ];
      } else if (lower.includes('sài gòn') || lower.includes('cơm tấm') || lower.includes('sườn')) {
        aiResponseText =
          'Nhắc đến Sài Gòn thì không thể bỏ qua **Cơm Tấm Sườn Cọng Nướng Than**! Sườn non ướp mật ong và nước mắm cốt đậm đà, nướng trên than hoa đượm lửa, ăn cùng chả trứng hấp béo ngậy và chén mỡ hành tóp mỡ giòn rụm.';
        dishes = [
          {
            name: 'Cơm Tấm Sườn Cọng Nướng Than',
            restaurant: 'Cơm Tấm Sài Gòn 1985',
            price: 65000,
            region: 'Sài Gòn (Miền Nam)',
            description: 'Sườn cọng nướng than hoa thơm lừng kèm bì chả đặc biệt.',
          },
        ];
      } else if (lower.includes('miền trung') || lower.includes('cay') || lower.includes('huế')) {
        aiResponseText =
          'Ẩm thực miền Trung nổi tiếng với vị cay nồng và mắm ruốc đặc trưng. Tôi gợi ý cho bạn món **Bún Bò Huế Cố Đô** với chả cua quết tay, giò heo mềm ngậy và nước lèo sả ớt đỏ rực thơm lừng.';
        dishes = [
          {
            name: 'Bún Bò Giò Chả Huế',
            restaurant: 'Bún Bò O Phượng Gia Truyền',
            price: 55000,
            region: 'Huế (Miền Trung)',
            description: 'Nước lèo sả ruốc đậm đà, chả cua Huế tự làm tươi ngon.',
          },
        ];
      } else {
        aiResponseText =
          'Tôi đã hiểu yêu cầu của bạn! Hệ thống đề xuất bữa trưa dinh dưỡng với các món bán chạy nhất tại khu vực của bạn, đảm bảo hương vị tươi ngon và chuẩn vệ sinh an toàn thực phẩm:';
        dishes = [
          {
            name: 'Cơm Tấm Sườn Cọng Nướng Than',
            restaurant: 'Cơm Tấm Sài Gòn 1985',
            price: 65000,
            region: 'Sài Gòn',
            description: 'Món ăn quốc dân bán chạy nhất tuần này.',
          },
          {
            name: 'Phở Bò Tái Lăn Truyền Thống',
            restaurant: 'Phở Thìn Lò Đúc 1979',
            price: 75000,
            region: 'Hà Nội',
            description: 'Đậm vị truyền thống thơm gừng tỏi.',
          },
        ];
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        recommendedDishes: dishes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: 960 }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(255, 87, 34, 0.2))',
            color: '#A78BFA',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          <Compass size={16} /> DineGo AI Local Guide (Sprint 4 — U034, U036)
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>
          Trợ Lý Ẩm Thực Thông Minh Bản Địa
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Được huấn luyện trên kho tri thức ẩm thực 3 miền Bắc - Trung - Nam, giúp bạn chọn món ăn nhanh chuẩn vị nhất.
        </p>
      </div>

      {/* Preset Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
        {PRESET_QUERIES.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Box */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 600,
        }}
      >
        {/* Messages Stream */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m) => {
            const isAi = m.sender === 'ai';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignSelf: isAi ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                }}
              >
                {isAi && (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={20} />
                  </div>
                )}

                <div>
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: 16,
                      background: isAi ? 'var(--bg-card)' : 'var(--primary)',
                      color: isAi ? 'var(--text-main)' : '#fff',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {m.text}
                  </div>

                  {/* Recommended Dishes Cards */}
                  {m.recommendedDishes && m.recommendedDishes.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {m.recommendedDishes.map((dish, i) => (
                        <div
                          key={i}
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 14,
                            padding: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{dish.name}</span>
                              <span style={{ fontSize: '0.72rem', background: 'rgba(255, 87, 34, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                                {dish.region}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              🏪 {dish.restaurant} • <strong>{dish.price.toLocaleString()} đ</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {dish.description}
                            </div>
                          </div>

                          <button
                            onClick={() => onSelectMerchantByName && onSelectMerchantByName(dish.restaurant)}
                            className="btn btn-primary"
                            style={{
                              padding: '8px 14px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            Đặt món ngay <ArrowRight size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, textAlign: isAi ? 'left' : 'right' }}>
                    {m.timestamp}
                  </div>
                </div>

                {!isAi && (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <Bot size={18} color="#8B5CF6" />
              <span>DineGo AI đang phân tích khẩu vị của bạn...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: 10 }}
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Nhập yêu cầu: 'Gợi ý món cay ấm bụng', 'Đặc sản Đà Nẵng', 'Bữa trưa 40k'..."
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: 14,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: '#fff',
                fontSize: '0.92rem',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '12px 20px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Send size={18} />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
