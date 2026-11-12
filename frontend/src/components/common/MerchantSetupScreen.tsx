// ==============================================================================
// DineGo Frontend — In-App Restaurant Setup & Onboarding Screen
// Shown inside the Merchant Portal right after a new Merchant user creates an account
// ==============================================================================

import React, { useState } from 'react';
import {
  Store,
  MapPin,
  Phone,
  Clock,
  Camera,
  CreditCard,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Utensils,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import type { Merchant, MenuItem, User } from '../../types';

interface MerchantSetupScreenProps {
  currentUser: User;
  onCompleteSetup: (newMerchant: Merchant, updatedUser: User, initialDishes: MenuItem[]) => void;
  onLogout: () => void;
}

const SAMPLE_STOREFRONT_PHOTOS = [
  {
    name: 'Nhà hàng Cơm & Món Việt',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Quán Phở / Bún Truyền Thống',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tiệm Trà Sữa & Cà Phê',
    url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Nhà hàng Pizza & Món Âu',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
  },
];

interface DraftDish {
  name: string;
  price: string;
  categoryName: string;
  description: string;
}

export const MerchantSetupScreen: React.FC<MerchantSetupScreenProps> = ({
  currentUser,
  onCompleteSetup,
  onLogout,
}) => {
  // 1. Store Basic Info
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('Cơm & Món Việt');
  const [storePhone, setStorePhone] = useState(currentUser.phoneNumber || '');
  const [openingHours, setOpeningHours] = useState('07:00 - 22:00');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeFrontImage, setStoreFrontImage] = useState(SAMPLE_STOREFRONT_PHOTOS[0].url);

  // 2. Legal & Payout Info
  const [businessLicense, setBusinessLicense] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [bankName, setBankName] = useState('Vietcombank');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState(
    (currentUser.fullName || '').toUpperCase(),
  );

  // 3. Initial Menu Items Setup
  const [draftDishes, setDraftDishes] = useState<DraftDish[]>([
    {
      name: 'Món Đặc Biệt Của Quán',
      price: '55000',
      categoryName: 'Món Chính',
      description: 'Nguyên liệu tươi ngon tuyển chọn mỗi ngày, chế biến chuẩn vị nhà hàng.',
    },
    {
      name: 'Combo Bữa Trưa Tiết Kiệm',
      price: '65000',
      categoryName: 'Combo Đặc Sắc',
      description: 'Phần ăn đầy đặn kèm canh và trà đá mát lạnh.',
    },
  ]);

  const [errorMsg, setErrorMsg] = useState('');

  const handleAddDraftDish = () => {
    setDraftDishes((prev) => [
      ...prev,
      {
        name: '',
        price: '45000',
        categoryName: 'Món Chính',
        description: '',
      },
    ]);
  };

  const handleRemoveDraftDish = (idx: number) => {
    setDraftDishes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChangeDraftDish = (idx: number, field: keyof DraftDish, value: string) => {
    setDraftDishes((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!storeName.trim()) {
      setErrorMsg('Vui lòng nhập Tên nhà hàng / Quán ăn của bạn.');
      return;
    }

    if (!storeAddress.trim()) {
      setErrorMsg('Vui lòng nhập Địa chỉ kinh doanh thực tế của nhà hàng.');
      return;
    }

    if (!storePhone.trim()) {
      setErrorMsg('Vui lòng nhập Số điện thoại liên hệ của nhà hàng.');
      return;
    }

    const nowDate = new Date().toISOString().split('T')[0];
    const newMerchantId = `merchant-${Date.now()}`;
    const slug = storeName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const newMerchant: Merchant = {
      id: newMerchantId,
      ownerUserId: currentUser.id,
      ownerEmail: currentUser.email,
      name: storeName.trim(),
      slug,
      address: storeAddress.trim(),
      phoneNumber: storePhone.trim(),
      ownerName: currentUser.fullName,
      storeFrontImage,
      businessLicenseNumber:
        businessLicense.trim() || `GPKD-${Date.now().toString().slice(-6)}`,
      foodSafetyCertNumber: `ATTP-VN-2026-${Date.now().toString().slice(-4)}`,
      taxCode: taxCode.trim() || `031${Date.now().toString().slice(-7)}`,
      bankName: bankName.trim() || 'Vietcombank',
      bankAccountNumber: bankAccountNumber.trim() || '0071000889900',
      bankAccountHolder:
        bankAccountHolder.trim().toUpperCase() || currentUser.fullName.toUpperCase(),
      commissionRate: 15,
      openingHours: openingHours.trim() || '07:00 - 22:00',
      kycStatus: 'VERIFIED',
      verifiedAt: nowDate,
      coverUrl: storeFrontImage,
      logoUrl: storeFrontImage,
      rating: 5.0,
      reviewCount: 1,
      deliveryTimeMin: 20,
      deliveryTimeMax: 30,
      isActive: true,
      isOpen: true,
      categories: [storeCategory],
    };

    const updatedUser: User = {
      ...currentUser,
      phoneNumber: storePhone.trim(),
      address: storeAddress.trim(),
      bankName: newMerchant.bankName,
      bankAccountNumber: newMerchant.bankAccountNumber,
      bankAccountHolder: newMerchant.bankAccountHolder,
      merchantId: newMerchantId,
      avatarUrl: storeFrontImage,
    };

    const validDishes: MenuItem[] = draftDishes
      .filter((d) => d.name.trim() !== '')
      .map((d, idx) => ({
        id: `dish-${Date.now()}-${idx + 1}`,
        merchantId: newMerchantId,
        name: d.name.trim(),
        description:
          d.description.trim() ||
          `Món ngon đặc trưng tại ${storeName.trim()}, chế biến nóng hổi.`,
        basePrice: Number(d.price) > 0 ? Number(d.price) : 45000,
        imageUrl: storeFrontImage,
        categoryName: d.categoryName.trim() || 'Món Chính',
        isActive: true,
        isAvailable: true,
        toppings: [
          {
            id: `top-${Date.now()}-${idx + 1}`,
            name: 'Thêm phần đặc biệt',
            price: 10000,
            isActive: true,
            isAvailable: true,
          },
        ],
      }));

    onCompleteSetup(newMerchant, updatedUser, validDishes);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <header
        style={{
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1E293B',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
            }}
          >
            <Store size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              DineGo Merchant Center — Thiết Lập Quán & Gian Hàng
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
              Xin chào <strong>{currentUser.fullName}</strong> ({currentUser.email}) • Hoàn tất hồ sơ quán để bắt đầu nhận đơn
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#F8FAFC',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} />
          <span>Đăng xuất</span>
        </button>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: 920, width: '100%', margin: '28px auto 60px auto', padding: '0 20px' }}>
        {/* Welcome Onboarding Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1.5px solid #FDE68A',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#D97706',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#92400E', margin: '0 0 6px 0' }}>
              Chào mừng đối tác mới! Hãy thiết lập Nhà hàng của bạn
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#78350F', margin: 0, lineHeight: 1.5 }}>
              Tài khoản chủ quán <strong>{currentUser.email}</strong> đã được tạo thành công. Vui lòng điền thông tin quán ăn, địa chỉ mặt bằng, tài khoản nhận doanh thu và các món ăn khởi đầu bên dưới để mở gian hàng trên DineGo.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#DC2626',
              fontSize: '0.88rem',
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* SECTION 1: THÔNG TIN NHÀ HÀNG & MẶT BẰNG */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Store size={20} color="#D97706" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                1. Thông tin Nhà hàng & Địa chỉ kinh doanh
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Tên Nhà hàng / Quán ăn *
                </label>
                <input
                  type="text"
                  placeholder="VD: Bún Bò Huế Đông Ba / Cơm Niêu Sài Gòn"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Ngành hàng ẩm thực chính *
                </label>
                <select
                  value={storeCategory}
                  onChange={(e) => setStoreCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="Cơm & Món Việt">Cơm văn phòng / Cơm tấm & Món Việt</option>
                  <option value="Phở / Bún">Phở / Bún / Mì truyền thống</option>
                  <option value="Trà sữa">Trà sữa, Cà phê & Đồ uống</option>
                  <option value="Món Nướng">Lẩu & Nướng BBQ</option>
                  <option value="Pizza">Pizza, Mỳ Ý & Đồ ăn nhanh</option>
                  <option value="Mâm Cỗ">Đặt Tiệc & Mâm Cỗ Sự Kiện</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Số điện thoại Hotline của Quán *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    placeholder="0909123456"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Khung giờ mở cửa hoạt động
                </label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    placeholder="07:00 - 22:00"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Địa chỉ kinh doanh thực tế của Nhà hàng *
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} color="#D97706" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            {/* Storefront Image */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Hình ảnh mặt tiền / Bảng hiệu Nhà hàng
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {SAMPLE_STOREFRONT_PHOTOS.map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStoreFrontImage(photo.url)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: storeFrontImage === photo.url ? '2px solid #D97706' : '1px solid #CBD5E1',
                      background: storeFrontImage === photo.url ? '#FFFBEB' : '#F8FAFC',
                      color: storeFrontImage === photo.url ? '#B45309' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mẫu {idx + 1}: {photo.name}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 14, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Camera size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="url"
                    placeholder="Dán link ảnh đại diện / mặt tiền quán..."
                    value={storeFrontImage}
                    onChange={(e) => setStoreFrontImage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                {storeFrontImage && (
                  <img
                    src={storeFrontImage}
                    alt="Preview"
                    style={{
                      width: 180,
                      height: 84,
                      objectFit: 'cover',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: PHÁP LÝ & TÀI KHOẢN NGÂN HÀNG NHẬN ĐỐI SOÁT */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <CreditCard size={20} color="#0284C7" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                2. Thông tin Pháp lý & Tài khoản ngân hàng nhận doanh thu
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Số Giấy phép kinh doanh (nếu có)
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    placeholder="VD: GPKD-41A8029144"
                    value={businessLicense}
                    onChange={(e) => setBusinessLicense(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Mã số thuế
                </label>
                <input
                  type="text"
                  placeholder="VD: 0318992819"
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Ngân hàng thụ hưởng
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="MB Bank">MB Bank</option>
                  <option value="ACB">ACB</option>
                  <option value="BIDV">BIDV</option>
                  <option value="VietinBank">VietinBank</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Số tài khoản nhận đối soát
                </label>
                <input
                  type="text"
                  placeholder="VD: 0071000889900"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Tên chủ tài khoản
                </label>
                <input
                  type="text"
                  placeholder="NGUYEN VAN A"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: THIẾT LẬP THỰC ĐƠN KHỞI ĐẦU */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Utensils size={20} color="#00B14F" />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    3. Khởi tạo Món ăn đầu tiên cho Thực đơn quán
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    Bạn có thể chỉnh sửa nhanh các món khởi đầu dưới đây hoặc thêm/sửa chi tiết sau trong trang Quản lý Thực đơn
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddDraftDish}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                <span>Thêm món</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {draftDishes.map((dish, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px',
                    borderRadius: 12,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 0.9fr 1fr 1.6fr auto',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Tên món ăn #{idx + 1}
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Cơm Sườn Nướng"
                      value={dish.name}
                      onChange={(e) => handleChangeDraftDish(idx, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Giá bán (VNĐ)
                    </label>
                    <input
                      type="number"
                      placeholder="55000"
                      value={dish.price}
                      onChange={(e) => handleChangeDraftDish(idx, 'price', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Danh mục
                    </label>
                    <input
                      type="text"
                      placeholder="Món Chính"
                      value={dish.categoryName}
                      onChange={(e) => handleChangeDraftDish(idx, 'categoryName', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Mô tả ngắn
                    </label>
                    <input
                      type="text"
                      placeholder="Mô tả thành phần món..."
                      value={dish.description}
                      onChange={(e) => handleChangeDraftDish(idx, 'description', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>

                  <div style={{ paddingTop: 18 }}>
                    {draftDishes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftDish(idx)}
                        style={{
                          padding: '8px',
                          borderRadius: 8,
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          color: '#DC2626',
                          cursor: 'pointer',
                        }}
                        title="Xoá món này"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FFFFFF',
              padding: '18px 24px',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: '0.84rem' }}>
              <ShieldCheck size={20} color="#00B14F" />
              <span>Quán sau khi thiết lập sẽ được kích hoạt ngay trên hệ thống và mở trang Quản trị Nhà hàng.</span>
            </div>

            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 28px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(217, 119, 6, 0.3)',
              }}
            >
              <CheckCircle2 size={18} />
              <span>Hoàn Tất Thiết Lập & Mở Quán Ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

