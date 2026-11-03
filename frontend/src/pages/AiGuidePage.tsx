// ==============================================================================
// DineGo Frontend — AI Local Culinary Guide (Sprint 4 — U034 to U038)
// GrabFood AI Culinary Assistant, Local RAG Recommendations & Quick Order Link
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

    // AI Simulation with Local RAG Knowledge
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
      } else if (lower.includes('miền trung') || lower.includes('cay') || lower.includes('bún bò')) {
        aiResponseText =
          'Hương vị đậm đà, cay nồng của **Bún Bò Huế Cố Đô** chắc chắn sẽ làm hài lòng bạn! Nước dùng thơm dậy mùi sả cây, mắm ruốc nguyên chất và sa tế ớt hiểm cay xé lưỡi.';
        dishes = [
          {
            name: 'Bún Bò Huế Bắp Bò Gân Giòn',
            restaurant: 'Bún Bò Huế Hương Giang',
            price: 60000,
            region: 'Huế (Miền Trung)',
            description: 'Nước dùng mắm ruốc thơm lừng, thịt bắp hoa hoa tươi giòn sần sật.',
          },
        ];
      } else {
        aiResponseText =
          `DineGo AI đã tìm thấy gợi ý ẩm thực tuyệt vời phù hợp với yêu cầu: "${prompt}". Mời bạn thưởng thức các món đặc sản từ các nhà hàng đối tác được chấm 4.9 sao của chúng tôi!`;
        dishes = [
          {
            name: 'Cơm Tấm Ba Rọi Nướng Mật Ong',
            restaurant: 'Cơm Tấm Sài Gòn 1985',
            price: 60000,
            region: 'Đặc sản Sài Gòn',
            description: 'Thịt ba chỉ nướng mật hoa rừng thơm phức, da giòn mềm tan.',
          },
          {
            name: 'Trà Sữa Trân Châu Hoàng Kim',
            restaurant: 'Trà Sữa Phúc Long & Koi',
            price: 55000,
            region: 'Thức uống giải nhiệt',
            description: 'Trà ô long thơm đậm vị sữa thanh nhẹ, trân châu dai mềm ngọt vừa.',
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
    }, 700);
  };

  return (
    <div className="container" style={{ padding: '28px 16px', maxWidth: 960, paddingBottom: 60 }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 14px',
            borderRadius: 20,
            background: 'rgba(0, 177, 79, 0.1)',
            color: 'var(--primary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          <Sparkles size={15} /> Trợ Lý Ẩm Thực Thông Minh (Sprint 4 — RAG Engine)
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
          DineGo AI Local Culinary Guide
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
          Hỏi đáp bằng ngôn ngữ tự nhiên. Khám phá văn hóa ẩm thực Bắc - Trung - Nam và nhận gợi ý chuẩn khẩu vị.
        </p>
      </div>

      {/* Preset Queries Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
        {PRESET_QUERIES.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Container Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 620,
        }}
      >
        {/* Messages Stream */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
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
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #00B14F, #06B6D4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(0, 177, 79, 0.3)',
                    }}
                  >
                    <Bot size={22} />
                  </div>
                )}

                <div>
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: 18,
                      background: isAi ? 'var(--bg-main)' : 'var(--primary)',
                      color: isAi ? 'var(--text-main)' : '#FFFFFF',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      border: isAi ? '1px solid var(--border)' : 'none',
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
                            background: '#FFFFFF',
                            border: '1.5px solid var(--border)',
                            borderRadius: 14,
                            padding: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                {dish.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  background: 'rgba(0, 177, 79, 0.1)',
                                  color: 'var(--primary)',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  fontWeight: 700,
                                }}
                              >
                                {dish.region}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              🏪 {dish.restaurant} •{' '}
                              <strong style={{ color: 'var(--primary)' }}>{dish.price.toLocaleString()} đ</strong>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {dish.description}
                            </div>
                          </div>

                          <button
                            onClick={() => onSelectMerchantByName && onSelectMerchantByName(dish.restaurant)}
                            className="btn btn-primary"
                            style={{
                              padding: '8px 16px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              borderRadius: 10,
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
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: 'rgba(0, 177, 79, 0.1)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={20} />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Bot size={18} color="var(--primary)" />
              <span>DineGo AI đang phân tích khẩu vị của bạn...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: '#FFFFFF' }}>
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
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '12px 22px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
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
