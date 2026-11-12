import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CateringService } from './catering.service.js';

describe('CateringService (Sprint 3 — U023 đến U033)', () => {
  let service: CateringService;

  const mockCustomerUser: AuthenticatedUser = {
    id: 'user-cust-1',
    email: 'customer@dinego.vn',
    fullName: 'Khách đặt tiệc',
    isActive: true,
    roles: [Role.CUSTOMER],
  };

  const mockMerchantUser: AuthenticatedUser = {
    id: 'user-merch-1',
    email: 'merchant@dinego.vn',
    fullName: 'Nhà hàng tiệc',
    isActive: true,
    roles: [Role.MERCHANT],
  };

  const mockPrisma = {};

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CateringService(mockPrisma as unknown as PrismaService);
  });

  describe('Feast Package Catalog (U023 & U024)', () => {
    it('should list default packages and filter by eventType', async () => {
      const allPkgs = await service.getPackages({});
      expect(allPkgs.length).toBeGreaterThanOrEqual(2);

      const weddingPkgs = await service.getPackages({ eventType: 'WEDDING' });
      expect(weddingPkgs.every((p) => p.eventType === 'WEDDING')).toBe(true);
    });

    it('should create new feast package with dishes', async () => {
      const pkg = await service.createPackage({
        merchantId: 'merchant-1',
        name: 'Mâm Cỗ Tân Gia Thịnh Vượng',
        eventType: 'HOUSEWARMING',
        servingsPerTable: 6,
        pricePerTable: 2000000,
        maxTablesPerDay: 20,
        dishes: [
          { name: 'Gỏi Củ Hủ Dừa', course: 'APPETIZER' },
          { name: 'Heo Quay Bánh Hỏi', course: 'MAIN' },
        ],
      });

      expect(pkg.name).toBe('Mâm Cỗ Tân Gia Thịnh Vượng');
      expect(pkg.dishes.length).toBe(2);
      expect(pkg.isActive).toBe(true);
    });

    it('should update feast package information', async () => {
      const pkgs = await service.getPackages({});
      const target = pkgs[0];

      const updated = await service.updatePackage(target.id, {
        name: 'Tên Gói Mới',
        pricePerTable: 3000000,
      });

      expect(updated.name).toBe('Tên Gói Mới');
      expect(updated.pricePerTable).toBe(3000000);
    });
  });

  describe('calculateQuote Pricing Engine (U025)', () => {
    it('should calculate quote with volume discounts and custom dish surcharges', async () => {
      const pkgs = await service.getPackages({});
      const target = pkgs[0]; // Price 2.800.000đ/table

      // 10 tables: 5% discount (28.000.000 - 1.400.000 = 26.600.000 + 500.000 service fee = 27.100.000)
      const quote = await service.calculateQuote({
        packageId: target.id,
        tableCount: 10,
        customDishes: ['Thêm Tôm Càng (+150k/bàn)'],
      });

      expect(quote.discountPercentage).toBe(5);
      expect(quote.customDishesSurcharge).toBe(1 * 150000 * 10);
      expect(quote.minDepositRequired).toBe(Math.round((quote.totalEstimatedAmount * 30) / 100));
    });

    it('should apply 10% discount for >= 30 tables', async () => {
      const pkgs = await service.getPackages({});
      const target = pkgs[0];

      const quote = await service.calculateQuote({
        packageId: target.id,
        tableCount: 35,
      });

      expect(quote.discountPercentage).toBe(10);
    });
  });

  describe('createBooking & BR-24 (U026)', () => {
    it('should reject booking if eventDate is less than 3 days in advance (BR-24)', async () => {
      const pkgs = await service.getPackages({});
      const target = pkgs[0];

      // Tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      await expect(
        service.createBooking(mockCustomerUser, {
          packageId: target.id,
          eventDate: tomorrowStr,
          eventTime: '12:00',
          eventLocation: '123 Lê Duẩn, Q.1',
          tableCount: 5,
          guestCount: 50,
          depositRate: 30,
          customerPhone: '0901234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create booking successfully when >= 3 days in advance', async () => {
      const pkgs = await service.getPackages({});
      const target = pkgs[0];

      // 10 days in future
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const futureStr = future.toISOString().split('T')[0];

      const booking = await service.createBooking(mockCustomerUser, {
        packageId: target.id,
        eventDate: futureStr,
        eventTime: '18:00',
        eventLocation: '123 Phố Đi Bộ, Q.1',
        tableCount: 8,
        guestCount: 80,
        depositRate: 40,
        customerPhone: '0901234567',
      });

      expect(booking.bookingCode).toMatch(/^DG-FEAST-/);
      expect(booking.status).toBe('REQUESTED');
      expect(booking.depositRate).toBe(40);
      expect(booking.timeline.length).toBe(1);
    });
  });

  describe('Merchant Calendar & Block Date (U027)', () => {
    it('should block date and reject new bookings on blocked date', async () => {
      const pkgs = await service.getPackages({});
      const target = pkgs[0];

      const future = new Date();
      future.setDate(future.getDate() + 12);
      const futureStr = future.toISOString().split('T')[0];

      await service.blockDate(target.merchantId, {
        date: futureStr,
        reason: 'Nghỉ bảo trì bếp',
      });

      const cal = await service.getMerchantCalendar(target.merchantId);
      expect(cal.blockedDates).toContain(futureStr);

      await expect(
        service.createBooking(mockCustomerUser, {
          packageId: target.id,
          eventDate: futureStr,
          eventTime: '11:00',
          eventLocation: 'Khách sạn Caravelle',
          tableCount: 5,
          guestCount: 50,
          depositRate: 30,
          customerPhone: '0901234567',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Deposit Payment & Remaining Balance (U028, U029, U030)', () => {
    it('should initiate MoMo deposit payment and confirm deposit', async () => {
      const pkgs = await service.getPackages({});
      const future = new Date();
      future.setDate(future.getDate() + 15);

      const booking = await service.createBooking(mockCustomerUser, {
        packageId: pkgs[0].id,
        eventDate: future.toISOString().split('T')[0],
        eventTime: '18:00',
        eventLocation: 'Nhà thi đấu Q.7',
        tableCount: 5,
        guestCount: 50,
        depositRate: 30,
        customerPhone: '0901234567',
      });

      // Initiate deposit payment
      const paymentInit = await service.initiateDepositPayment(booking.id, mockCustomerUser, {
        paymentMethod: 'MOMO',
      });

      expect(paymentInit.payUrl).toContain('test-payment.momo.vn');
      expect(paymentInit.depositAmount).toBe(booking.depositAmount);

      // Confirm deposit payment
      const confirmed = await service.confirmDepositPayment(booking.id, 'MOMO_TRANS_9999');
      expect(confirmed.status).toBe('DEPOSIT_PAID');
      expect(confirmed.depositPaidAt).toBeDefined();

      // Settle remaining balance (U030)
      const settled = await service.settleRemainingBalance(booking.id, mockCustomerUser, {
        paymentMethod: 'MOMO',
      });
      expect(settled.isFullyPaid).toBe(true);
      expect(settled.remainingPaidAt).toBeDefined();
    });
  });

  describe('Merchant Review & Cancellation Refund BR-44 (U031)', () => {
    it('should transition status to APPROVED_WAITING_DEPOSIT and notify customer', async () => {
      const pkgs = await service.getPackages({});
      const future = new Date();
      future.setDate(future.getDate() + 20);

      const booking = await service.createBooking(mockCustomerUser, {
        packageId: pkgs[0].id,
        eventDate: future.toISOString().split('T')[0],
        eventTime: '18:00',
        eventLocation: 'Trung tâm Hội Nghị GEM',
        tableCount: 10,
        guestCount: 100,
        depositRate: 30,
        customerPhone: '0901234567',
      });

      const reviewed = await service.reviewBooking(booking.id, mockMerchantUser, {
        status: 'APPROVED_WAITING_DEPOSIT',
        merchantNotes: 'Quán đồng ý nhận tiệc',
      });

      expect(reviewed.status).toBe('APPROVED_WAITING_DEPOSIT');

      // Check notification generated (U033)
      const notifs = await service.getUserNotifications(mockCustomerUser.id);
      expect(notifs.some((n) => n.bookingId === booking.id && n.type === 'BOOKING_APPROVED')).toBe(true);
    });

    it('should calculate 100% deposit refund if cancelled >= 7 days before event (BR-44)', async () => {
      const pkgs = await service.getPackages({});
      const future = new Date();
      future.setDate(future.getDate() + 10); // 10 days remaining >= 7

      const booking = await service.createBooking(mockCustomerUser, {
        packageId: pkgs[0].id,
        eventDate: future.toISOString().split('T')[0],
        eventTime: '12:00',
        eventLocation: 'Hội trường tiệc',
        tableCount: 5,
        guestCount: 50,
        depositRate: 50,
        customerPhone: '0901234567',
      });

      await service.confirmDepositPayment(booking.id);

      const cancelled = await service.reviewBooking(booking.id, mockCustomerUser, {
        status: 'CANCELLED',
      });

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.merchantNotes).toContain('100%');
    });
  });

  describe('Booking Timeline & Notifications (U032, U033)', () => {
    it('should retrieve booking timeline with chronological events', async () => {
      const pkgs = await service.getPackages({});
      const future = new Date();
      future.setDate(future.getDate() + 8);

      const booking = await service.createBooking(mockCustomerUser, {
        packageId: pkgs[0].id,
        eventDate: future.toISOString().split('T')[0],
        eventTime: '11:00',
        eventLocation: 'Tòa nhà Landmark 81',
        tableCount: 4,
        guestCount: 40,
        depositRate: 30,
        customerPhone: '0901234567',
      });

      const timelineData = await service.getBookingTimeline(booking.id);
      expect(timelineData.bookingCode).toBe(booking.bookingCode);
      expect(timelineData.timeline.length).toBeGreaterThanOrEqual(1);
    });

    it('should mark notification as read', async () => {
      const notifs = await service.getUserNotifications(mockCustomerUser.id);
      if (notifs.length > 0) {
        const notifId = notifs[0].id;
        const res = await service.markNotificationAsRead(notifId, mockCustomerUser.id);
        expect(res.success).toBe(true);
        expect(notifs[0].isRead).toBe(true);
      }
    });
  });
});

