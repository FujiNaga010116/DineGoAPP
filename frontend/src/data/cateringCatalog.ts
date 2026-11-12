// ==============================================================================
// DineGo Frontend — Catering Catalog, Party Types & Pricing Helpers
// ==============================================================================

import type { ManagedVoucher } from '../utils/vouchers';

export type PartyTypeId =
  | 'wedding'
  | 'memorial'
  | 'birthday'
  | 'housewarming'
  | 'corporate'
  | 'longevity';

export interface PartyTypeOption {
  id: PartyTypeId;
  title: string;
  subtitle: string;
  priceHint: string;
  recommendedTables: string;
  accentBg: string;
  accentColor: string;
  tag: string;
}

export interface FeastPackage {
  id: string;
  merchantId: string;
  name: string;
  merchantName: string;
  merchantAddress: string;
  merchantLat: number;
  merchantLng: number;
  merchantBadge: string;
  serviceArea: string;
  rating: number;
  reviewCount: number;
  description: string;
  pricePerTable: number;
  guestCountPerTable: number;
  imageUrl: string;
  dishes: string[];
  partyTypes: PartyTypeId[];
  highlightTag?: string;
}

export interface BookingRecord {
  id: string;
  bookingCode: string;
  partyTypeTitle?: string;
  merchantId?: string;
  merchantName?: string;
  serviceArea?: string;
  packageName: string;
  pricePerTable?: number;
  guestCountPerTable?: number;
  imageUrl?: string;
  dishes?: string[];
  tableCount: number;
  eventDate: string;
  eventTime?: string;
  eventAddress: string;
  eventLat?: number;
  eventLng?: number;
  contactName?: string;
  contactPhone?: string;
  customNote?: string;
  voucherCode?: string;
  voucherDiscount?: number;
  grossTotal?: number;
  discountAmount?: number;
  depositPercent?: 30 | 50;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  status: 'PENDING_DEPOSIT' | 'DEPOSIT_PAID' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export const PARTY_TYPES: PartyTypeOption[] = [
  {
    id: 'wedding',
    title: 'Đám cưới & Đính hôn',
    subtitle: 'Thực đơn 8–10 món sang trọng, trình bày chuẩn tiệc cưới tại gia & sảnh.',
    priceHint: 'Từ 3.200.000đ/mâm',
    recommendedTables: '10–30 mâm',
    accentBg: '#FFF1F2',
    accentColor: '#E11D48',
    tag: 'Phổ biến nhất',
  },
  {
    id: 'memorial',
    title: 'Đám giỗ & Cúng gia tiên',
    subtitle: 'Mâm cỗ truyền thống chuẩn vị 3 miền, trang trọng, đúng giờ cúng.',
    priceHint: 'Từ 1.950.000đ/mâm',
    recommendedTables: '3–12 mâm',
    accentBg: '#FEF3C7',
    accentColor: '#B45309',
    tag: 'Chuẩn vị truyền thống',
  },
  {
    id: 'birthday',
    title: 'Sinh nhật & Thôi nôi',
    subtitle: 'Món ngon hợp khẩu vị cả gia đình và trẻ nhỏ, trang trí bàn tiệc gọn đẹp.',
    priceHint: 'Từ 1.850.000đ/mâm',
    recommendedTables: '2–10 mâm',
    accentBg: '#E0F2FE',
    accentColor: '#0284C7',
    tag: 'Gia đình yêu thích',
  },
  {
    id: 'housewarming',
    title: 'Tân gia & Khai trương',
    subtitle: 'Mâm cỗ thịnh vượng mừng nhà mới, phát lộc khai trương hồng phát.',
    priceHint: 'Từ 2.500.000đ/mâm',
    recommendedTables: '4–15 mâm',
    accentBg: '#ECFDF5',
    accentColor: '#00B14F',
    tag: 'Tài lộc sung túc',
  },
  {
    id: 'corporate',
    title: 'Liên hoan công ty & Gala',
    subtitle: 'Tiệc tất niên, tổng kết quý, chiêu đãi đối tác kèm hóa đơn VAT.',
    priceHint: 'Từ 2.800.000đ/mâm',
    recommendedTables: '5–30 mâm',
    accentBg: '#EEF2FF',
    accentColor: '#4F46E5',
    tag: 'Hỗ trợ xuất VAT',
  },
  {
    id: 'longevity',
    title: 'Mừng thượng thọ & Sum họp',
    subtitle: 'Món hầm bổ dưỡng, thanh đạm tốt cho sức khỏe ông bà, người lớn tuổi.',
    priceHint: 'Từ 2.200.000đ/mâm',
    recommendedTables: '3–12 mâm',
    accentBg: '#F3E8FF',
    accentColor: '#7E22CE',
    tag: 'Thanh đạm bổ dưỡng',
  },
];

export const FEAST_PACKAGES: FeastPackage[] = [
  {
    id: 'pkg-cuoi-hoi-02',
    merchantId: 'merchant-catering-hoang-gia',
    name: 'Mâm Tiệc Cưới Hỏi Song Hỷ',
    merchantName: 'Bếp Cỗ Hoàng Gia — Quận 1',
    merchantAddress: '210 Hai Bà Trưng, Phường Tân Định, Quận 1, TP. HCM',
    merchantLat: 10.7854,
    merchantLng: 106.6962,
    merchantBadge: 'Đối tác Vàng',
    serviceArea: '210 Hai Bà Trưng, Q.1 • Phục vụ toàn TP.HCM',
    rating: 4.9,
    reviewCount: 318,
    description: 'Bữa tiệc 10 món thượng hạng, giao lưu họ hàng hai bên trọn vẹn hạnh phúc.',
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
    partyTypes: ['wedding', 'corporate'],
    highlightTag: 'Bán chạy #1',
  },
  {
    id: 'pkg-cuoi-truyen-thong-04',
    merchantId: 'merchant-catering-phuong-nam',
    name: 'Mâm Cỗ Vu Quy Trăm Năm',
    merchantName: 'Nhà Hàng Tiệc Phương Nam — Quận 7',
    merchantAddress: '45 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. HCM',
    merchantLat: 10.7327,
    merchantLng: 106.7196,
    merchantBadge: 'Chuẩn 5★',
    serviceArea: '45 Nguyễn Văn Linh, Q.7 • Phú Mỹ Hưng & lân cận',
    rating: 4.8,
    reviewCount: 204,
    description: 'Thực đơn 8 món đậm đà hương vị tiệc cưới Nam Bộ, phục vụ nóng tại bàn.',
    pricePerTable: 3200000,
    guestCountPerTable: 10,
    imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80',
    dishes: [
      'Gỏi ngó sen tôm thịt bánh phồng',
      'Súp cua tóc tiên nấm đông cô',
      'Gà quay mật ong xôi chiên phồng',
      'Tôm sú hấp bia tươi',
      'Bò nấu lagu kèm bánh mì nóng',
      'Cá điêu hồng chiên xù mắm xoài',
      'Lẩu thái hải sản bún tươi',
      'Rau câu dừa lá dứa tráng miệng',
    ],
    partyTypes: ['wedding', 'housewarming'],
    highlightTag: 'Tiết kiệm',
  },
  {
    id: 'pkg-tan-gia-01',
    merchantId: 'merchant-com-tam',
    name: 'Mâm Cỗ Tân Gia Thịnh Vượng',
    merchantName: 'Cơm Tấm Sài Gòn 1985',
    merchantAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM',
    merchantLat: 10.7736,
    merchantLng: 106.7037,
    merchantBadge: 'Bếp trưởng xác thực',
    serviceArea: '123 Nguyễn Huệ, Q.1 • Đúng giờ cam kết',
    rating: 4.9,
    reviewCount: 276,
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
    partyTypes: ['housewarming', 'memorial', 'birthday'],
    highlightTag: 'Đánh giá cao',
  },
  {
    id: 'pkg-dam-gio-05',
    merchantId: 'merchant-catering-ha-thanh',
    name: 'Mâm Cỗ Gia Tiên Truyền Thống',
    merchantName: 'Bếp Cỗ Gia Truyền — Quận 3',
    merchantAddress: '112 Cách Mạng Tháng 8, Phường Võ Thị Sáu, Quận 3, TP. HCM',
    merchantLat: 10.7785,
    merchantLng: 106.6869,
    merchantBadge: 'Chuẩn vị truyền thống',
    serviceArea: '112 CMT8, Q.3 • Giao nóng giữ nhiệt chuyên dụng',
    rating: 4.8,
    reviewCount: 189,
    description: 'Mâm cỗ cúng gia tiên trang trọng với xôi gấc, gà luộc cánh tiên, nem rán.',
    pricePerTable: 1950000,
    guestCountPerTable: 6,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    dishes: [
      'Gà ta luộc lá chanh tạo dáng cánh tiên',
      'Xôi gấc đậu xanh cốt dừa',
      'Nem rán hải sản giòn rụm',
      'Giò lụa ước lễ & chả quế',
      'Thịt đông / Thịt kho tàu trứng cút',
      'Canh bóng thả thập cẩm / Canh măng',
      'Nộm su hào cà rốt tôm thịt',
      'Chè trôi nước ngũ sắc',
    ],
    partyTypes: ['memorial', 'longevity', 'housewarming'],
    highlightTag: 'Chuẩn lễ nghi',
  },
  {
    id: 'pkg-sinh-nhat-06',
    merchantId: 'merchant-catering-bistro',
    name: 'Mâm Tiệc Gia Đình & Sinh Nhật Ấm Cúng',
    merchantName: 'DineGo Bistro & Tiệc — Thủ Đức',
    merchantAddress: '88 Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP. HCM',
    merchantLat: 10.8495,
    merchantLng: 106.7574,
    merchantBadge: 'Hợp trẻ em & gia đình',
    serviceArea: '88 Võ Văn Ngân, Thủ Đức • Tặng dụng cụ ăn',
    rating: 4.8,
    reviewCount: 162,
    description: 'Thực đơn Á - Âu hài hòa, ít cay, dễ ăn cho cả trẻ nhỏ và người lớn.',
    pricePerTable: 1850000,
    guestCountPerTable: 6,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    dishes: [
      'Salad cá hồi sốt mè rang',
      'Súp bí đỏ kem tươi bánh mì bơ tỏi',
      'Gà nướng mật ong xốt BBQ',
      'Tôm chiên cốm xanh giòn tan',
      'Mỳ Ý bò bằm phô mai',
      'Sườn non nướng tảng sốt mật ong',
      'Cơm chiên hải sản dương châu',
      'Bánh flan caramel & trái cây tươi',
    ],
    partyTypes: ['birthday', 'housewarming'],
    highlightTag: 'Giá tốt nhất',
  },
  {
    id: 'pkg-cong-ty-07',
    merchantId: 'merchant-catering-saigon-pro',
    name: 'Mâm Tiệc Liên Hoan Doanh Nghiệp VIP',
    merchantName: 'Saigon Event Catering — Bình Thạnh',
    merchantAddress: '99 Điện Biên Phủ, Phường 15, Bình Thạnh, TP. HCM',
    merchantLat: 10.8012,
    merchantLng: 106.7114,
    merchantBadge: 'Xuất VAT điện tử',
    serviceArea: '99 Điện Biên Phủ, Bình Thạnh • Phục vụ hội nghị',
    rating: 4.9,
    reviewCount: 245,
    description: 'Mâm 10 người đầy đặn, hải sản tươi sống và bò Mỹ, phù hợp tiếp khách & gala.',
    pricePerTable: 2800000,
    guestCountPerTable: 10,
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80',
    dishes: [
      'Khai vị gỏi tiến vua tôm thịt & chả giò',
      'Súp hải sản rong biển trứng cua',
      'Bò Mỹ lúc lắc khoai tây chiên',
      'Tôm sú rang muối Hồng Kông',
      'Mực hấp gừng hành kiểu Thái',
      'Giò heo chiên giòn muối sả',
      'Lẩu nấm gà ta thanh ngọt',
      'Cơm chiên cá mặn gà xé',
      'Trái cây 4 mùa ướp lạnh',
    ],
    partyTypes: ['corporate', 'wedding', 'birthday'],
    highlightTag: 'Phù hợp Gala',
  },
  {
    id: 'pkg-thuong-tho-03',
    merchantId: 'merchant-catering-an-vien',
    name: 'Mâm Tiệc Thượng Thọ An Khang',
    merchantName: 'Bếp Dưỡng Sinh An Viên — Quận 10',
    merchantAddress: '320 Sư Vạn Hạnh, Phường 2, Quận 10, TP. HCM',
    merchantLat: 10.7723,
    merchantLng: 106.6691,
    merchantBadge: 'Thực đơn dinh dưỡng',
    serviceArea: '320 Sư Vạn Hạnh, Q.10 • Ít dầu mỡ, dễ tiêu',
    rating: 4.9,
    reviewCount: 141,
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
    partyTypes: ['longevity', 'memorial'],
    highlightTag: 'Chuyên Mừng Thọ',
  },
];

export const CATERING_NOTE_SUGGESTIONS: string[] = [
  'Ít cay, phù hợp trẻ nhỏ & người lớn tuổi',
  'Không dùng mì chính (bột ngọt)',
  'Đổi 1 món chiên sang món hấp/luộc',
  'Giao đúng giờ để kịp làm lễ',
  'Kèm chén đũa & khăn lạnh đầy đủ',
];

export const EVENT_TIME_SLOTS: string[] = [
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
];

export interface FeastPricingBreakdown {
  grossTotal: number;
  volumeDiscountRate: number;
  volumeDiscountAmount: number;
  afterVolumeTotal: number;
  voucherDiscountAmount: number;
  netTotal: number;
  depositAmount: number;
  remainingAmount: number;
}

export function calculateVoucherDiscount(
  voucher: ManagedVoucher | null,
  subtotal: number,
): number {
  if (!voucher || subtotal < Number(voucher.minOrder || 0)) {
    return 0;
  }
  if (voucher.discountType === 'FIXED_AMOUNT') {
    return Math.min(subtotal, Number(voucher.discountValue || 0));
  }
  const raw = Math.round((subtotal * Number(voucher.discountValue || 0)) / 100);
  if (voucher.maxDiscountAmount && voucher.maxDiscountAmount > 0) {
    return Math.min(subtotal, raw, voucher.maxDiscountAmount);
  }
  return Math.min(subtotal, raw);
}

export function calculateFeastPricing(
  pricePerTable: number,
  tableCount: number,
  depositPercent: 30 | 50,
  appliedVoucher: ManagedVoucher | null,
): FeastPricingBreakdown {
  const grossTotal = pricePerTable * tableCount;
  let volumeDiscountRate = 0;
  if (tableCount >= 10) volumeDiscountRate = 10;
  else if (tableCount >= 5) volumeDiscountRate = 5;

  const volumeDiscountAmount = Math.round((grossTotal * volumeDiscountRate) / 100);
  const afterVolumeTotal = grossTotal - volumeDiscountAmount;
  const voucherDiscountAmount = calculateVoucherDiscount(appliedVoucher, afterVolumeTotal);
  const netTotal = Math.max(0, afterVolumeTotal - voucherDiscountAmount);
  const depositAmount = Math.round((netTotal * depositPercent) / 100);
  const remainingAmount = netTotal - depositAmount;

  return {
    grossTotal,
    volumeDiscountRate,
    volumeDiscountAmount,
    afterVolumeTotal,
    voucherDiscountAmount,
    netTotal,
    depositAmount,
    remainingAmount,
  };
}

