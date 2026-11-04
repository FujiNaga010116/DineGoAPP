// ==============================================================================
// DineGo Frontend — Catering & Event Feast Page
// Commercial Catering Experience, 72h Advance Rule, 2-Stage Deposit, MoMo QR
// ==============================================================================

import React, { useState } from 'react';
import {
  AlertCircle,
  DollarSign,
  UtensilsCrossed,
} from 'lucide-react';

interface FeastPackage {
  id: string;
  name: string;
  description: string;
  pricePerTable: number;
  guestCountPerTable: number;
  imageUrl: string;
  dishes: string[];
}

const FEAST_PACKAGES: FeastPackage[] = [
  {
    id: 'pkg-tan-gia-01',
    name: 'Mâm Cỗ Tân Gia Thịnh Vượng',
    description: 'Thực đơn 8 món chuẩn vị truyền thống mừng nhà mới, sung túc tài lộc.',
    pricePerTable: 2500000,
    guestCountPerTable: 6,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    dishes: [
      'Gỏi củ hũ dừa tôm thịt',
      'Gà ta hấp lá chanh gia truyền',
      'Bò né bông thiên lý sốt tiêu xanh',
      'Tôm sú hấp nước dừa Bến Tre',
      'Cá chẽm phi lê sốt chua ngọt',
      'Xôi vò hạt sen thơm bùi',
      'Canh măng sườn giò heo',
      'Chè hạt sen long nhãn tráng miệng',
    ],
  },
  {
    id: 'pkg-cuoi-hoi-02',
    name: 'Mâm Tiệc Cưới Hỏi Song Hỷ',
    description: 'Bữa tiệc 10 món sang trọng, giao lưu họ hàng hai bên trọn vẹn hạnh phúc.',
    pricePerTable: 3800000,
    guestCountPerTable: 10,
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80',
    dishes: [
      'Khai vị 3 món thượng hạng',
      'Súp vi cá bào ngư hải sản',
      'Heo sữa quay giòn da bánh bao',
      'Tôm càng xanh nướng mọi phô mai',
      'Bò Úc sốt tiêu đen kèm bánh mì',
      'Cá tầm nướng muối ớt Tây Bắc',
      'Lẩu hải sản chua cay Tomyum',
      'Cơm chiên hoàng bào lạp xưởng',
      'Rau củ xào nấm đông cô',
      'Panna Cotta dâu tây Đà Lạt',
    ],
  },
  {
    id: 'pkg-thuong-tho-03',
    name: 'Mâm Tiệc Thượng Thọ An Khang',
    description: 'Thực đơn bổ dưỡng, thanh đạm phù hợp người cao tuổi mừng đại thọ.',
    pricePerTable: 2200000,
    guestCountPerTable: 6,
    imageUrl: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=600&auto=format&fit=crop&q=80',
    dishes: [
      'Súp gà xé nấm tuyết bồi bổ',
      'Gà ác tiềm thuốc bắc hạt sen',
      'Chả giò bách hoa chiên xù',
      'Cá bống mú hấp xì dầu kiểu Hồng Kông',
      'Thịt kho tàu nước dừa trứng cút',
      'Canh súp bông cải tôm tươi',
      'Cơm tấm hạt ngọc hấp lá dứa',
      'Chè yến đường phèn táo đỏ',
    ],
  },
];

interface BookingRecord {
  id: string;
  bookingCode: string;
  packageName: string;
  tableCount: number;
  eventDate: string;
  eventAddress: string;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  status: 'PENDING_DEPOSIT' | 'DEPOSIT_PAID' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export const CateringPage: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState<FeastPackage>(FEAST_PACKAGES[0]);
  const [tableCount, setTableCount] = useState<number>(5);
  const [depositPercent, setDepositPercent] = useState<30 | 50>(30);

  const defaultEventDate = new Date(Date.now() + 5 * 24 * 3600 * 1000)
    .toISOString()
    .split('T')[0];
  const [eventDate, setEventDate] = useState<string>(defaultEventDate);
  const [eventAddress, setEventAddress] = useState<string>(
    'Trung tâm Hội nghị Tiệc cưới Riverside, 360 Bến Vân Đồn, Quận 4, TP. HCM',
  );

  const [bookings, setBookings] = useState<BookingRecord[]>([
    {
      id: 'bk-sample-01',
      bookingCode: 'DG-FEAST-902144',
      packageName: 'Mâm Cỗ Tân Gia Thịnh Vượng',
      tableCount: 6,
      eventDate: defaultEventDate,
      eventAddress: 'Biệt thự 12, Thảo Điền, TP. Thủ Đức',
      totalAmount: 14250000,
      depositAmount: 4275000,
      remainingAmount: 9975000,
      status: 'DEPOSIT_PAID',
      createdAt: '2026-11-01',
    },
  ]);

  const [activeMomoModal, setActiveMomoModal] = useState<BookingRecord | null>(null);

  const grossTotal = selectedPackage.pricePerTable * tableCount;
  let discountRate = 0;
  if (tableCount >= 10) discountRate = 10;
  else if (tableCount >= 5) discountRate = 5;

  const discountAmount = Math.round((grossTotal * discountRate) / 100);
  const netTotal = grossTotal - discountAmount;
  const depositAmount = Math.round((netTotal * depositPercent) / 100);
  const remainingAmount = netTotal - depositAmount;

  const chosenTime = new Date(eventDate).getTime();
  const now = Date.now();
  const hoursUntilEvent = (chosenTime - now) / (1000 * 3600);
  const isValidAdvanceTime = hoursUntilEvent >= 72;

  const handleCreateBooking = () => {
    if (!isValidAdvanceTime) {
      alert('Vui lòng chọn ngày tổ chức tiệc trước tối thiểu 72 giờ (3 ngày) theo quy định chuẩn bị của nhà hàng!');
      return;
    }

    const newBooking: BookingRecord = {
      id: `bk-${Date.now()}`,
      bookingCode: `DG-FEAST-${Date.now().toString().slice(-6)}`,
      packageName: selectedPackage.name,
      tableCount,
      eventDate,
      eventAddress,
      totalAmount: netTotal,
      depositAmount,
      remainingAmount,
      status: 'PENDING_DEPOSIT',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setBookings([newBooking, ...bookings]);
    setActiveMomoModal(newBooking);
  };

  const handleConfirmMomoDeposit = (bookingId: string) => {
    setBookings(
      bookings.map((b) => (b.id === bookingId ? { ...b, status: 'DEPOSIT_PAID' } : b)),
    );
    setActiveMomoModal(null);
  };

  const handleSettleRemaining = (bookingId: string) => {
    setBookings(
      bookings.map((b) => (b.id === bookingId ? { ...b, status: 'COMPLETED' } : b)),
    );
  };

  const handleCancelBooking = (booking: BookingRecord) => {
    const daysUntil = (new Date(booking.eventDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    let refundPercent = 0;
    if (daysUntil >= 7) refundPercent = 100;
    else if (daysUntil >= 3) refundPercent = 50;
    else refundPercent = 0;

    const refundValue = Math.round((booking.depositAmount * refundPercent) / 100);
    const confirmed = window.confirm(
      `Chính sách hoàn cọc tiệc DineGo:\n` +
        `Thời gian còn lại: ${Math.round(daysUntil)} ngày.\n` +
        `Chính sách áp dụng: Hoàn ${refundPercent}% tiền cọc (${refundValue.toLocaleString()} VND qua MoMo).\n\n` +
        `Bạn có chắc chắn muốn hủy đặt tiệc này không?`,
    );

    if (confirmed) {
      setBookings(
        bookings.map((b) => (b.id === booking.id ? { ...b, status: 'CANCELLED' } : b)),
      );
    }
  };

  return (
    <div className="container" style={{ padding: '28px 16px', maxWidth: 1160, paddingBottom: 60 }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
          Dịch Vụ Đặt Mâm Cỗ & Sự Kiện Tại Gia
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
          Mâm Tiệc & Nấu Cỗ Tại Gia Chuyên Nghiệp
        </h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 640, margin: '0 auto', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Tân gia, cưới hỏi, thượng thọ, liên hoan công ty. Bếp trưởng phục vụ tận nơi, bảo chứng đặt cọc trực tuyến minh bạch.
        </p>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 28, alignItems: 'start' }}>
        {/* Left: Package List */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UtensilsCrossed size={18} color="var(--primary)" /> 1. Chọn Gói Thực Đơn Mâm Cỗ
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEAST_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.id === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  style={{
                    background: '#FFFFFF',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 6px 20px rgba(0, 177, 79, 0.12)' : 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 16 }}>
                    <img
                      src={pkg.imageUrl}
                      alt={pkg.name}
                      style={{ width: 110, height: 110, borderRadius: 12, objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                          {pkg.name}
                        </h4>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {pkg.pricePerTable.toLocaleString()} đ
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>/mâm</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 10px', lineHeight: 1.4 }}>
                        {pkg.description} ({pkg.guestCountPerTable} người/mâm)
                      </p>

                      {/* Dishes pills */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {pkg.dishes.slice(0, 4).map((dish, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.74rem',
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'var(--bg-main)',
                              color: 'var(--text-muted)',
                              fontWeight: 600,
                            }}
                          >
                            • {dish}
                          </span>
                        ))}
                        {pkg.dishes.length > 4 && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700, padding: '2px 4px' }}>
                            +{pkg.dishes.length - 4} món nữa...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Quote Calculator & Booking Box */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 24,
            boxShadow: 'var(--shadow-md)',
            position: 'sticky',
            top: 90,
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={18} color="var(--primary)" /> 2. Báo Giá & Đặt Cọc Hợp Đồng
          </h3>

          {/* Table count slider */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Quy mô đặt mâm:</label>
              <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>{tableCount} mâm</span>
            </div>
            <input
              type="range"
              min={2}
              max={30}
              value={tableCount}
              onChange={(e) => setTableCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <span>2 mâm (Nhỏ)</span>
              <span>5 mâm (-5%)</span>
              <span>10 mâm (-10%)</span>
              <span>30 mâm</span>
            </div>
          </div>

          {/* Deposit percent choice */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
              Tỷ lệ đặt cọc đợt 1 (MoMo):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDepositPercent(30)}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  background: depositPercent === 30 ? 'rgba(0, 177, 79, 0.1)' : 'var(--bg-main)',
                  border: `1.5px solid ${depositPercent === 30 ? 'var(--primary)' : 'var(--border)'}`,
                  color: depositPercent === 30 ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Cọc 30% ({Math.round(netTotal * 0.3).toLocaleString()} đ)
              </button>
              <button
                type="button"
                onClick={() => setDepositPercent(50)}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  background: depositPercent === 50 ? 'rgba(0, 177, 79, 0.1)' : 'var(--bg-main)',
                  border: `1.5px solid ${depositPercent === 50 ? 'var(--primary)' : 'var(--border)'}`,
                  color: depositPercent === 50 ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                Cọc 50% ({Math.round(netTotal * 0.5).toLocaleString()} đ)
              </button>
            </div>
          </div>

          {/* Event Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
              Ngày tổ chức tiệc (Đặt trước tối thiểu 72 giờ):
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--bg-main)',
                border: `1px solid ${isValidAdvanceTime ? 'var(--border)' : '#EF4444'}`,
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
              }}
            />
            {!isValidAdvanceTime && (
              <div style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <AlertCircle size={14} /> Cần đặt trước ít nhất 72 giờ để bếp trưởng chuẩn bị nguyên liệu tươi ngon!
              </div>
            )}
          </div>

          {/* Event Address */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
              Địa chỉ tổ chức tiệc tại gia:
            </label>
            <input
              type="text"
              value={eventAddress}
              onChange={(e) => setEventAddress(e.target.value)}
              placeholder="Số nhà, Tên đường, Quận, TP"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Financial Breakdown */}
          <div style={{ background: 'var(--bg-main)', padding: 16, borderRadius: 12, marginBottom: 18, fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6, color: 'var(--text-muted)' }}>
              <span>Đơn giá niêm yết:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{grossTotal.toLocaleString()} đ</span>
            </div>
            {discountRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 6 }}>
                <span>Ưu đãi mâm lớn ({discountRate}%):</span>
                <span>-{discountAmount.toLocaleString()} đ</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 8, color: 'var(--text-main)' }}>
              <span>Tổng chi phí tiệc:</span>
              <span>{netTotal.toLocaleString()} đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: 'var(--primary)', fontWeight: 800 }}>
              <span>Tiền cọc đợt 1 ({depositPercent}%):</span>
              <span>{depositAmount.toLocaleString()} đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <span>Còn lại thanh toán khi tiệc xong:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{remainingAmount.toLocaleString()} đ</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleCreateBooking}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '0.95rem', fontWeight: 800, borderRadius: 12 }}
          >
            Xác Nhận Đặt Tiệc & Đặt Cọc MoMo
          </button>
        </div>
      </div>

      {/* Bookings History Section */}
      <div style={{ marginTop: 48 }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 16 }}>
          Hợp Đồng & Tiến Trình Đặt Tiệc Của Bạn ({bookings.length})
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {bookings.map((b) => (
            <div
              key={b.id}
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 20,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>{b.bookingCode}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontWeight: 700,
                    background:
                      b.status === 'COMPLETED'
                        ? '#D1FAE5'
                        : b.status === 'DEPOSIT_PAID'
                        ? '#E0F2FE'
                        : b.status === 'CANCELLED'
                        ? '#FEE2E2'
                        : '#FEF3C7',
                    color:
                      b.status === 'COMPLETED'
                        ? '#059669'
                        : b.status === 'DEPOSIT_PAID'
                        ? '#0284C7'
                        : b.status === 'CANCELLED'
                        ? '#DC2626'
                        : '#D97706',
                  }}
                >
                  {b.status === 'PENDING_DEPOSIT' && 'Chờ đặt cọc MoMo'}
                  {b.status === 'DEPOSIT_PAID' && 'Đã đặt cọc hợp đồng'}
                  {b.status === 'COMPLETED' && 'Tiệc hoàn tất (Đã quyết toán)'}
                  {b.status === 'CANCELLED' && 'Đã hủy tiệc'}
                </span>
              </div>

              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                {b.packageName}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Ngày tổ chức: <strong>{b.eventDate}</strong> • Quy mô: <strong>{b.tableCount} mâm</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Địa điểm: {b.eventAddress}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Tiền cọc đợt 1:</div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{b.depositAmount.toLocaleString()} đ</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Tất toán sau tiệc:</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{b.remainingAmount.toLocaleString()} đ</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {b.status === 'PENDING_DEPOSIT' && (
                  <button
                    onClick={() => setActiveMomoModal(b)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    Thanh toán cọc MoMo
                  </button>
                )}
                {b.status === 'DEPOSIT_PAID' && (
                  <button
                    onClick={() => handleSettleRemaining(b.id)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    Quyết toán tại tiệc
                  </button>
                )}
                {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleCancelBooking(b)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: '#FEE2E2',
                      color: '#DC2626',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy & Hoàn cọc
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MoMo Deposit Modal */}
      {activeMomoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#FFFFFF',
              borderRadius: 18,
              padding: 28,
              textAlign: 'center',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--momo)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                M
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--momo)', margin: 0 }}>
                MoMo Payment Gateway
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Quét mã QR để đặt cọc đợt 1 cho hợp đồng: <strong>{activeMomoModal.bookingCode}</strong>
            </p>

            <div
              style={{
                background: '#F8FAFC',
                padding: 16,
                borderRadius: 14,
                border: '1px solid #E2E8F0',
                display: 'inline-block',
                margin: '0 auto 16px',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|0901000002|DineGo%20Deposit|${activeMomoModal.depositAmount}|0|0`}
                alt="MoMo QR"
                style={{ width: 180, height: 180, display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#D82D8B', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
              {activeMomoModal.depositAmount.toLocaleString()} VND
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Nội dung chuyển: <code>{activeMomoModal.bookingCode}</code>
            </div>

            <button
              onClick={() => handleConfirmMomoDeposit(activeMomoModal.id)}
              className="btn-momo"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                fontSize: '0.95rem',
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              Tôi đã chuyển tiền cọc MoMo thành công
            </button>
            <button
              onClick={() => setActiveMomoModal(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
