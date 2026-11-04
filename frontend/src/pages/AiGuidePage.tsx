// ==============================================================================
// DineGo Frontend — Local Culinary Guide
// Regional Culinary Consultation & Instant Restaurant Menu Navigation
// ==============================================================================

import React, { useState } from 'react';
import {
  Send,
  Utensils,
  User,
  ArrowRight,
} from 'lucide-react';

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
  'Trưa nay ăn gì thanh đạm dưới 60.000đ?',
  'Tìm món cay nồng đậm đà chuẩn vị miền Trung',
  'Gợi ý quán cơm tấm sườn nướng chuẩn Sài Gòn 1985',
  'Món ăn nhẹ ít dầu mỡ cho bữa tối',
];

export const AiGuidePage: React.FC<AiGuidePageProps> = ({ onSelectMerchantByName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Xin chào! Tôi là chuyên gia tư vấn ẩm thực địa phương của DineGo. Hãy chia sẻ khẩu vị hôm nay của bạn (thanh đạm, đậm đà, cay nồng), vùng miền yêu thích (Bắc - Trung - Nam) hoặc ngân sách bữa ăn, tôi sẽ gợi ý những món ngon phù hợp nhất.',
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

    setTimeout(() => {
      let aiResponseText = '';
      let dishes: any[] = [];

      const lower = prompt.toLowerCase();
      if (lower.includes('hà nội') || lower.includes('phở') || lower.includes('thanh đạm')) {
        aiResponseText =
          'Dựa trên khẩu vị thanh đạm chuẩn vị Hà Thành, món phù hợp nhất cho bạn hôm nay là Phở Bò Tái Lăn hoặc Phở Bò Tái Nạm. Nước dùng hầm từ xương bò tươi suốt 12 giờ thơm mùi gừng nướng, thảo quả và hoa hồi, dùng kèm quẩy giòn truyền thống.';
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
          'Đặc trưng ẩm thực Sài Gòn nổi bật nhất với Cơm Tấm Sườn Cọng Nướng Than. Sườn non ướp mật ong và nước mắm cốt đậm đà, nướng trên than hoa đượm lửa, dùng kèm chả trứng hấp và mỡ hành tóp mỡ giòn.';
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
          'Hương vị đậm đà, cay nồng của Bún Bò Huế Cố Đô rất hợp với sở thích của bạn. Nước dùng dậy mùi sả cây, mắm ruốc nguyên chất và sa tế ớt hiểm truyền thống.';
        dishes = [
          {
            name: 'Bún Bò Huế Bắp Bò Gân Giòn',
            restaurant: 'Bún Bò Huế Hương Giang',
            price: 60000,
            region: 'Huế (Miền Trung)',
            description: 'Nước dùng mắm ruốc thơm lừng, thịt bắp hoa tươi giòn.',
          },
        ];
      } else {
        aiResponseText =
          `Dưới đây là các gợi ý ẩm thực được đánh giá cao phù hợp với nhu cầu "${prompt}" từ các nhà hàng đối tác uy tín trên DineGo:`;
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
    }, 600);
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
            fontSize: '0.76rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 10,
          }}
        >
          Chuyên Gia Tư Vấn Ẩm Thực Bản Địa
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
          Gợi Ý Món Ngon Theo Khẩu Vị
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
          Tra cứu đặc sản vùng miền Bắc - Trung - Nam và tìm kiếm bữa ăn phù hợp với ngân sách của bạn.
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
          borderRadius: 18,
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 600,
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
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: '#00B14F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}
                  >
                    <Utensils size={18} />
                  </div>
                )}

                <div>
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: 14,
                      background: isAi ? 'var(--bg-main)' : 'var(--primary)',
                      color: isAi ? 'var(--text-main)' : '#FFFFFF',
                      fontSize: '0.9rem',
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
                            borderRadius: 12,
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
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                              {dish.restaurant} •{' '}
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
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            Xem thực đơn <ArrowRight size={14} />
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
                      background: 'rgba(0, 177, 79, 0.1)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <span>Đang tìm kiếm thực đơn phù hợp...</span>
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
              placeholder="Nhập khẩu vị hoặc món ăn bạn muốn tìm: 'Món cay ấm bụng', 'Cơm tấm sườn nướng', 'Bữa trưa 50k'..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '12px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
            >
              <Send size={16} />
              <span>Tìm gợi ý</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
