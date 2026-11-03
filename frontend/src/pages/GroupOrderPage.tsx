// ==============================================================================
// DineGo Frontend — Group Order & Split Bill Page (Sprint 2 — U020, U021)
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
  const [roomCode, setRoomCode] = useState('DG-K92X');
  const [isLocked, setIsLocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [splitMode, setSplitMode] = useState<'BY_ITEM' | 'EQUAL'>('BY_ITEM');

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

  // Thêm bạn mới vào phòng
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

  // Thêm món nhanh vào giỏ nhóm
  const [selectedMemberId, setSelectedMemberId] = useState('m-1');
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState(50000);

  const handleAddItem = () => {
    if (!dishName.trim() || isLocked) return;
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return;

    const newItem: GroupItem = {
      id: `gi-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      dishName: dishName.trim(),
      basePrice: Number(dishPrice),
      quantity: 1,
    };
    setItems([...items, newItem]);
    setDishName('');
  };

  const handleRemoveItem = (id: string) => {
    if (isLocked) return;
    setItems(items.filter((i) => i.id !== id));
  };

  // Financial calculations
  const subtotal = items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);
  const deliveryFee = 20000;
  const grandTotal = subtotal + deliveryFee;

  // Split bill breakdown
  const memberBreakdowns = members.map((m) => {
    const memberItems = items.filter((i) => i.memberId === m.id);
    const itemTotal = memberItems.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);

    if (splitMode === 'EQUAL') {
      const perPerson = Math.round(grandTotal / members.length);
      return {
        member: m,
        itemCount: memberItems.length,
        itemTotal,
        shippingShare: Math.round(deliveryFee / members.length),
        finalToPay: perPerson,
      };
    } else {
      // BY_ITEM: trả tiền món của mình + chia đều phí ship
      const shippingShare = Math.round(deliveryFee / members.length);
      return {
        member: m,
        itemCount: memberItems.length,
        itemTotal,
        shippingShare,
        finalToPay: itemTotal + shippingShare,
      };
    }
  });

  const [checkoutDone, setCheckoutDone] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://dinego.vn/group-order/${roomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container" style={{ padding: '32px 16px' }}>
      {/* Header Room Info */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 24,
          marginBottom: 28,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: 8,
                fontSize: '1.1rem',
                letterSpacing: 2,
              }}
            >
              {roomCode}
            </span>
            <button
              onClick={handleCopyLink}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Copy size={14} /> {copied ? 'Đã sao chép link!' : 'Copy link mời bạn'}
            </button>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Phòng Đặt Đồ Ăn Cùng Nhóm (Sprint 2 — U020)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Quán đang chọn: <strong>Cơm Tấm Sài Gòn 1985 & Phở Thìn</strong> • Trưởng phòng: <strong>Nguyễn Văn An</strong>
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
              background: isLocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isLocked ? '#EF4444' : '#10B981',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
            {isLocked ? 'Phòng đã khóa (Không nhận thêm món)' : 'Phòng đang mở (Cho phép thêm món)'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28, alignItems: 'start' }}>
        {/* Left: Shared Basket */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={20} color="var(--primary)" /> Giỏ Hàng Chung Nhóm ({items.length} phần)
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {members.length} thành viên tham gia
            </span>
          </div>

          {/* Quick Add Form */}
          {!isLocked && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, color: 'var(--primary)' }}>
                + Thêm món nhanh cho thành viên:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr auto', gap: 10 }}>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '0.85rem',
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
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />

                <input
                  type="number"
                  placeholder="Giá (VND)"
                  value={dishPrice}
                  onChange={(e) => setDishPrice(Number(e.target.value))}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />

                <button
                  onClick={handleAddItem}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
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
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--primary)',
                        fontWeight: 600,
                      }}
                    >
                      {item.memberName}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.dishName}</span>
                  </div>
                  {item.note && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Ghi chú: {item.note}</div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {(item.basePrice * item.quantity).toLocaleString()} đ
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.basePrice.toLocaleString()} đ x {item.quantity}
                    </div>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      style={{ background: 'transparent', color: 'var(--danger)', padding: 4 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add member box */}
          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
              Mời thêm bạn vào nhóm:
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Tên bạn (VD: Hoàng Nam)"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: '#fff',
                }}
              />
              <button onClick={handleAddMember} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                + Mời bạn
              </button>
            </div>
          </div>
        </div>

        {/* Right: Split Bill Engine (U021) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 20,
            padding: 24,
            boxShadow: 'var(--shadow-lg)',
            position: 'sticky',
            top: 90,
          }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={20} color="var(--primary)" /> Chia Tiền Split Bill (Sprint 2 — U021)
          </h3>

          {/* Split Mode toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setSplitMode('BY_ITEM')}
              style={{
                padding: '10px 8px',
                borderRadius: 10,
                background: splitMode === 'BY_ITEM' ? 'var(--primary-light)' : 'var(--bg-card)',
                border: `1px solid ${splitMode === 'BY_ITEM' ? 'var(--primary)' : 'var(--border)'}`,
                color: splitMode === 'BY_ITEM' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              Chia theo món đã gọi
            </button>
            <button
              onClick={() => setSplitMode('EQUAL')}
              style={{
                padding: '10px 8px',
                borderRadius: 10,
                background: splitMode === 'EQUAL' ? 'var(--primary-light)' : 'var(--bg-card)',
                border: `1px solid ${splitMode === 'EQUAL' ? 'var(--primary)' : 'var(--border)'}`,
                color: splitMode === 'EQUAL' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              Chia đều tất cả (Equal)
            </button>
          </div>

          {/* Summary Box */}
          <div style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tiền đồ ăn:</span>
              <span>{subtotal.toLocaleString()} đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Phí ship ({members.length} người chia):</span>
              <span>+{deliveryFee.toLocaleString()} đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <span>Tổng hóa đơn cả nhóm:</span>
              <span style={{ color: 'var(--primary)' }}>{grandTotal.toLocaleString()} đ</span>
            </div>
          </div>

          {/* Per member bill breakdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
              Số tiền từng người cần thanh toán:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memberBreakdowns.map((b) => (
                <div
                  key={b.member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{b.member.avatar}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{b.member.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#10B981', fontSize: '0.95rem' }}>
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
            <div style={{ padding: 16, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', textAlign: 'center' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 6px' }} />
              <strong>Đã chốt đơn nhóm thành công!</strong>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                Đơn hàng đã chuyển sang trạng thái chuẩn bị món tại nhà hàng.
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
              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
            >
              Khóa Phòng & Chốt Đơn Nhóm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

