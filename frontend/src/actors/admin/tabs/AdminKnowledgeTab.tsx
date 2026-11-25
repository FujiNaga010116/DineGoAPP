import React from 'react';

export interface KnowledgeChunkItem {
  id: string;
  source: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface AdminKnowledgeTabProps {
  knowledgeChunks: KnowledgeChunkItem[];
  kbSearchQuery: string;
  setKbSearchQuery: (val: string) => void;
  kbSourceInput: string;
  setKbSourceInput: (val: string) => void;
  kbContentInput: string;
  setKbContentInput: (val: string) => void;
  kbSaving: boolean;
  aiSystemPrompt: string;
  setAiSystemPrompt: (val: string) => void;
  aiPromptSaving: boolean;
  showAiPromptModal: boolean;
  setShowAiPromptModal: (open: boolean) => void;
  showKbCreateModal: boolean;
  setShowKbCreateModal: (open: boolean) => void;
  handleSaveAiSystemPrompt: (e: React.FormEvent) => Promise<void> | void;
  handleAddKnowledgeChunk: (e: React.FormEvent) => Promise<void> | void;
  handleDeleteKnowledgeChunk: (chunkId: string) => Promise<void> | void;
}

export const AdminKnowledgeTab: React.FC<AdminKnowledgeTabProps> = ({
  knowledgeChunks,
  kbSearchQuery,
  setKbSearchQuery,
  kbSourceInput,
  setKbSourceInput,
  kbContentInput,
  setKbContentInput,
  kbSaving,
  aiSystemPrompt,
  setAiSystemPrompt,
  aiPromptSaving,
  showAiPromptModal,
  setShowAiPromptModal,
  showKbCreateModal,
  setShowKbCreateModal,
  handleSaveAiSystemPrompt,
  handleAddKnowledgeChunk,
  handleDeleteKnowledgeChunk,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Compact Header Bar with Pop-up Modal Triggers */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '18px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Tri thức &amp; Huấn luyện Trợ lý AI (Gemini + RAG)
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#059669',
                background: '#ECFDF5',
                padding: '4px 10px',
                borderRadius: 999,
              }}
            >
              {knowledgeChunks.length} đoạn tri thức đang hoạt động
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Quản lý System Prompt hành vi AI và dữ liệu <code>knowledge_base_vectors</code> trong SQL Server
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAiPromptModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Cấu hình System Prompt AI
          </button>
          <button
            type="button"
            onClick={() => setShowKbCreateModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#00B14F',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            + Thêm tri thức RAG
          </button>
        </div>
      </div>

      {/* Knowledge Base List */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '18px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Danh sách Tri thức trong SQL Server
          </h4>
          <input
            type="text"
            placeholder="Tìm theo nguồn hoặc nội dung..."
            value={kbSearchQuery}
            onChange={(e) => setKbSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              fontSize: '0.8rem',
              width: 240,
              outline: 'none',
            }}
          />
        </div>

        {knowledgeChunks.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: '0.86rem' }}>
            Chưa có đoạn tri thức nào trong cơ sở dữ liệu. Hãy nhấn &quot;+ Thêm tri thức RAG&quot; ở góc trên!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {knowledgeChunks
              .filter((k) => {
                const q = kbSearchQuery.trim().toLowerCase();
                if (!q) return true;
                return k.source.toLowerCase().includes(q) || k.content.toLowerCase().includes(q);
              })
              .map((k) => (
                <div
                  key={k.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 14,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#4F46E5',
                          background: '#EEF2FF',
                          padding: '2px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {k.source}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {k.authorName} • {k.createdAt || 'Mới tạo'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#1E293B', lineHeight: 1.5 }}>{k.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteKnowledgeChunk(k.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #FECACA',
                      background: '#FFFFFF',
                      color: '#DC2626',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Xóa
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* POP-UP MODAL: AI SYSTEM PROMPT TRAINING */}
      {showAiPromptModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowAiPromptModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 660,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: '22px 24px',
              boxShadow: '0 24px 50px rgba(15, 23, 42, 0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Huấn luyện System Prompt Trợ lý AI (Gemini)
                </h3>
                <p style={{ fontSize: '0.79rem', color: '#64748B', margin: '4px 0 0 0' }}>
                  Nạp trực tiếp vào Gemini mỗi khi khách hàng nhắn tin ở Chatbox góc phải dưới
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiPromptModal(false)}
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  color: '#475569',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                type="button"
                onClick={() =>
                  setAiSystemPrompt(
                    'Bạn là Trợ lý AI thông minh & CSKH của sàn đặt đồ ăn DineGo. Phong cách: thân thiện, ngắn gọn, chính xác, xưng hô "mình - bạn".\n' +
                      'Quy tắc bắt buộc:\n' +
                      '1. Chỉ gợi ý món ăn có thật trong danh sách <menu_catalog>, tuyệt đối không bịa món hoặc sai giá.\n' +
                      '2. Nếu khách yêu cầu số lượng cụ thể (VD: "chọn 1 món thôi", "gợi ý 2 món"), trả về đúng số lượng đó trong recommendedIds.\n' +
                      '3. Nếu khách nói "món khác", "đổi món", "không thích món này", tuyệt đối KHÔNG chọn lại các ID trong previouslyRecommendedIds.\n' +
                      '4. Nếu khách chỉ chào hỏi hoặc hỏi đơn hàng, voucher, khiếu nại, mâm cỗ thì trả lời trực tiếp dựa trên dữ liệu và để recommendedIds = [].\n' +
                      '5. Không tự bịa việc đã gửi email/SMS hay số tài khoản ngân hàng; nếu cần thanh toán hoặc xử lý sự cố đơn hàng, hướng dẫn khách thanh toán trực tiếp tại màn hình Đặt hàng hoặc gửi khiếu nại trong mục Đơn hàng.',
                  )
                }
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#334155',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Nạp mẫu Prompt chuẩn
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleSaveAiSystemPrompt(e);
                setShowAiPromptModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <textarea
                rows={8}
                value={aiSystemPrompt}
                onChange={(e) => setAiSystemPrompt(e.target.value)}
                placeholder="Nhập System Prompt hướng dẫn cách AI tư vấn món, xử lý khiếu nại, kiểm tra đơn..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: '0.82rem',
                  color: '#0F172A',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAiPromptModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={aiPromptSaving || !aiSystemPrompt.trim()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: aiPromptSaving || !aiSystemPrompt.trim() ? '#CBD5E1' : '#00B14F',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: aiPromptSaving || !aiSystemPrompt.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {aiPromptSaving ? 'Đang lưu...' : 'Lưu Prompt AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: CREATE RAG KNOWLEDGE CHUNK */}
      {showKbCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowKbCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 580,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: '22px 24px',
              boxShadow: '0 24px 50px rgba(15, 23, 42, 0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Thêm đoạn Tri thức AI (RAG)
                </h3>
                <p style={{ fontSize: '0.79rem', color: '#64748B', margin: '4px 0 0 0' }}>
                  Lưu vào bảng <code>knowledge_base_vectors</code> (SQL Server) để AI tra cứu chính xác
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowKbCreateModal(false)}
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  color: '#475569',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleAddKnowledgeChunk(e);
                setShowKbCreateModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <input
                type="text"
                placeholder="Nguồn / Chủ đề tri thức (VD: Cẩm nang ẩm thực Quận 1 TP.HCM)"
                value={kbSourceInput}
                onChange={(e) => setKbSourceInput(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: '0.84rem',
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
              <textarea
                rows={5}
                placeholder="Nhập nội dung tri thức chi tiết về món ăn, quán đặc sản, quy định đặt mâm cỗ..."
                value={kbContentInput}
                onChange={(e) => setKbContentInput(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: '0.84rem',
                  color: '#0F172A',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowKbCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={kbSaving || !kbContentInput.trim()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: kbSaving || !kbContentInput.trim() ? '#CBD5E1' : '#00B14F',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    border: 'none',
                    cursor: kbSaving || !kbContentInput.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {kbSaving ? 'Đang lưu...' : 'Lưu đoạn tri thức'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
