// ==============================================================================
// DineGo Frontend — Group Order & Split Bill Page (Sprint 2 — U020, U021)
// GrabFood Group Order, Room Sharing Link, Lock/Unlock, Bill Split Engine
// ==============================================================================

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Share2,
  Receipt,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Copy,
  Store,
} from 'lucide-react';

interface GroupMember {
  id: string;
  name: string;
  isHost: boolean;
  avatar: string;
}

interface GroupItem {
  id: string;
  memberId: string;
  memberName: string;
  dishName: string;
  basePrice: number;
  quantity: number;
  note?: string;
}

export const GroupOrderPage: React.FC = () => {
  const [roomCode] = useState('DG-K92X');
  const [isLocked, setIsLocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [splitMode, setSplitMode] = useState<'BY_ITEM' | 'EQUAL'>('BY_ITEM');
  const [checkoutDone, setCheckoutDone] = useState(false);

  const [members, setMembers] = useState<GroupMember[]>([
    { id: 'm-1', name: 'Nguyễn Văn An (Bạn)', isHost: true, avatar: '👤' },
    { id: 'm-2', name: 'Trần Thị Bình', isHost: false, avatar: '👩' },
    { id: 'm-3', name: 'Lê Hoàng Cường', isHost: false, avatar: '👨' },
  ]);

  const [items, setItems] = useState<GroupItem[]>([
    {
      id: 'gi-1',
      memberId: 'm-1',
      memberName: 'Nguyễn Văn An (Bạn)',
      dishName: 'Phở Bò Tái Lăn Đặc Biệt',
      basePrice: 75000,
      quantity: 1,
      note: 'Nhiều hành hoa, quẩy giòn',
    },
    {
      id: 'gi-2',
      memberId: 'm-2',
      memberName: 'Trần Thị Bình',
      dishName: 'Cơm Tấm Sườn Cọng Nướng Than',
      basePrice: 65000,
      quantity: 1,
      note: 'Trứng ốp la lòng đào',
    },
    {
      id: 'gi-3',
      memberId: 'm-3',
      memberName: 'Lê Hoàng Cường',
      dishName: 'Trà Sữa Trân Châu Hoàng Kim',
      basePrice: 55000,
      quantity: 2,
      note: '50% đường, 70% đá',
    },
  ]);

  const [newFriendName, setNewFriendName] = useState('');
  const handleAddMember = () => {
    if (!newFriendName.trim()) return;
    const newMember: GroupMember = {
      id: `m-${Date.now()}`,
      name: newFriendName.trim(),
      isHost: false,
      avatar: '🧑',
    };
    setMembers([...members, newMember]);
    setNewFriendName('');
  };

  const [selectedMemberId, setSelectedMemberId] = useState('m-1');
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState(50000);

  const handleAddItem = () => {
    if (!dishName.trim() || isLocked) return;
    const targetMember = members.find((m) => m.id === selectedMemberId);
    const newItem: GroupItem = {
      id: `gi-${Date.now()}`,
      memberId: selectedMemberId,
      memberName: targetMember ? targetMember.name : 'Khách',
      dishName: dishName.trim(),
      basePrice: Number(dishPrice) || 50000,
      quantity: 1,
    };
    setItems([...items, newItem]);
    setDishName('');
  };

  const handleRemoveItem = (itemId: string) => {
    if (isLocked) return;
    setItems(items.filter((i) => i.id !== itemId));
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText?.(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pricing calculations
  const subtotal = items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
  const deliveryFee = 18000;
  const grandTotal = subtotal + deliveryFee;

  // Split calculations
  const memberBreakdowns = members.map((m) => {
    const memberItems = items.filter((i) => i.memberId === m.id);
    const itemTotal = memberItems.reduce((s, it) => s + it.basePrice * it.quantity, 0);
    const shippingShare = members.length > 0 ? Math.round(deliveryFee / members.length) : 0;

    let finalToPay = 0;
    if (splitMode === 'BY_ITEM') {
      finalToPay = itemTotal + shippingShare;
    } else {
      finalToPay = members.length > 0 ? Math.round(grandTotal / members.length) : 0;
    }

    return {
      member: m,
      itemTotal,
      shippingShare,
      finalToPay,
      itemCount: memberItems.reduce((s, it) => s + it.quantity, 0),
    };
  });

  return (
    <div className="container" style={{ padding: '28px 16px', maxWidth: 1160, paddingBottom: 60 }}>
      {/* Room Header Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 28,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                background: 'rgba(0, 177, 79, 0.1)',
                color: 'var(--primary)',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              Mã phòng: {roomCode}
            </span>
            <button
              onClick={handleCopyLink}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 10px',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Copy size={13} /> {copied ? 'Đã sao chép link!' : 'Copy link mời bạn'}
            </button>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Phòng Đặt Đồ Ăn Cùng Nhóm & Chia Tiền Tự Động
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
            Quán đang chọn: <strong>Cơm Tấm Sài Gòn 1985</strong> • Trưởng phòng: <strong>Nguyễn Văn An</strong>
          </p>
        </div>

        {/* Lock Room toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setIsLocked(!isLocked)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              background: isLocked ? '#FEE2E2' : 'rgba(0, 177, 79, 0.1)',
              color: isLocked ? '#DC2626' : 'var(--primary)',
              border: `1.5px solid ${isLocked ? '#DC2626' : 'var(--primary)'}`,
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            {isLocked ? 'Phòng đã khóa (Không nhận thêm)' : 'Phòng đang mở (Cho phép thêm món)'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28, alignItems: 'start' }}>
        {/* Left: Shared Basket */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={18} color="var(--primary)" /> Giỏ Hàng Chung ({items.length} món)
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {members.length} người đang tham gia
            </span>
          </div>

          {/* Quick Add Form */}
          {!isLocked && (
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px dashed var(--border)',
                borderRadius: 16,
                padding: 18,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10, color: 'var(--primary)' }}>
                + Thêm món nhanh cho thành viên:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr auto', gap: 10 }}>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Tên món (VD: Trà đào cam sả)"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />

                <input
                  type="number"
                  placeholder="Giá (VND)"
                  value={dishPrice}
                  onChange={(e) => setDishPrice(Number(e.target.value))}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />

                <button
                  onClick={handleAddItem}
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: '0.88rem', fontWeight: 700, borderRadius: 10 }}
                >
                  Thêm
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(0, 177, 79, 0.1)',
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                    >
                      {item.memberName}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                      {item.dishName}
                    </span>
                  </div>
                  {item.note && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ghi chú: {item.note}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.98rem' }}>
                      {(item.basePrice * item.quantity).toLocaleString()} đ
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.basePrice.toLocaleString()} đ x {item.quantity}
                    </div>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', padding: 4, cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add member box */}
          <div style={{ marginTop: 24, padding: 18, background: '#FFFFFF', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 10 }}>
              Mời thêm đồng nghiệp hoặc bạn bè vào nhóm:
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Tên bạn mới (VD: Hoàng Nam)"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: 10,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAddMember}
                className="btn btn-secondary"
                style={{ padding: '9px 18px', fontWeight: 700, borderRadius: 10 }}
              >
                + Mời bạn
              </button>
            </div>
          </div>
        </div>

        {/* Right: Split Bill Engine */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 24,
            boxShadow: 'var(--shadow-md)',
            position: 'sticky',
            top: 90,
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} color="var(--primary)" /> Chia Tiền Split Bill Tự Động
          </h3>

          {/* Split Mode toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setSplitMode('BY_ITEM')}
              style={{
                padding: '10px 8px',
                borderRadius: 10,
                background: splitMode === 'BY_ITEM' ? 'var(--primary)' : 'var(--bg-main)',
                border: `1px solid ${splitMode === 'BY_ITEM' ? 'var(--primary)' : 'var(--border)'}`,
                color: splitMode === 'BY_ITEM' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Chia theo món đã gọi
            </button>
            <button
              onClick={() => setSplitMode('EQUAL')}
              style={{
                padding: '10px 8px',
                borderRadius: 10,
                background: splitMode === 'EQUAL' ? 'var(--primary)' : 'var(--bg-main)',
                border: `1px solid ${splitMode === 'EQUAL' ? 'var(--primary)' : 'var(--border)'}`,
                color: splitMode === 'EQUAL' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Chia đều tất cả (Equal)
            </button>
          </div>

          {/* Summary Box */}
          <div style={{ background: 'var(--bg-main)', padding: 16, borderRadius: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4, color: 'var(--text-muted)' }}>
              <span>Tổng tiền món ăn:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{subtotal.toLocaleString()} đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6, color: 'var(--text-muted)' }}>
              <span>Phí giao hàng ({members.length} người cùng chia):</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>+{deliveryFee.toLocaleString()} đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 10, color: 'var(--text-main)' }}>
              <span>Tổng hóa đơn cả nhóm:</span>
              <span style={{ color: 'var(--primary)' }}>{grandTotal.toLocaleString()} đ</span>
            </div>
          </div>

          {/* Per member bill breakdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
              Chi tiết số tiền từng bạn cần thanh toán:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memberBreakdowns.map((b) => (
                <div
                  key={b.member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{b.member.avatar}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{b.member.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {b.finalToPay.toLocaleString()} đ
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      (Ship: {b.shippingShare.toLocaleString()} đ)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {checkoutDone ? (
            <div style={{ padding: 16, borderRadius: 14, background: '#D1FAE5', color: '#059669', textAlign: 'center' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 6px' }} />
              <strong>Đã chốt đơn nhóm thành công!</strong>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                Đơn hàng đã được chuyển tới quán chuẩn bị món.
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsLocked(true);
                setCheckoutDone(true);
              }}
              disabled={items.length === 0}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, borderRadius: 14 }}
            >
              Khóa Phòng & Chốt Đơn Nhóm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
