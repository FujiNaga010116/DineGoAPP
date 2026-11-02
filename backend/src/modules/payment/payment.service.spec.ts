// ==============================================================================
// DineGo Backend — Payment Service Unit Tests (Phase 6: MoMo Payment Engine)
// ==============================================================================

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { PaymentService } from './payment.service.js';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPrisma: any;
  let mockConfigService: Partial<ConfigService>;

  const mockCustomerUser: AuthenticatedUser = {
    id: 'user-cust-101',
    email: 'customer@dinego.vn',
    fullName: 'Nguyen Van A',
    roles: [Role.CUSTOMER],
    isActive: true,
  };

  const _mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-999',
    email: 'admin@dinego.vn',
    fullName: 'Admin System',
    roles: [Role.ADMIN],
    isActive: true,
  };

  const mockOtherUser: AuthenticatedUser = {
    id: 'user-cust-202',
    email: 'other@dinego.vn',
    fullName: 'Tran Van B',
    roles: [Role.CUSTOMER],
    isActive: true,
  };

  const sampleOrder = {
    id: 'order-uuid-001',
    orderNumber: 'ORD-20261028-001',
    userId: 'user-cust-101',
    merchantId: 'merchant-uuid-1',
    status: OrderStatus.PENDING,
    finalTotal: 150000,
    payment: null as any,
  };

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        const configMap: Record<string, string> = {
          MOMO_PARTNER_CODE: 'MOMOBKUN20180529',
          MOMO_ACCESS_KEY: 'klm05TvNBzhg7h7j',
          MOMO_SECRET_KEY: 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca',
          MOMO_API_ENDPOINT: 'https://test-payment.momo.vn/v2/gateway/api/create',
          MOMO_REDIRECT_URL: 'http://localhost:5173/payment/result',
          MOMO_IPN_URL: 'http://localhost:3000/api/v1/payments/momo/ipn',
        };
        return configMap[key];
      }),
    };

    mockPrisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue(sampleOrder),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      payment: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      merchant: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
        return cb(mockPrisma);
      }),
    };

    service = new PaymentService(mockPrisma as any, mockConfigService as any);
  });

  describe('HMAC-SHA256 Signature (SEC-01 Timing-Safe)', () => {
    it('phải tạo mã băm HMAC-SHA256 chính xác với khóa bí mật', () => {
      const raw = 'partnerCode=MOMO&orderId=123&amount=50000';
      const secret = 'test-secret-key';
      const sig1 = service.createHmacSha256(raw, secret);
      const sig2 = service.createHmacSha256(raw, secret);

      expect(sig1).toHaveLength(64);
      expect(sig1).toBe(sig2);
    });

    it('verifyHmacSha256 phải chấp nhận chữ ký hợp lệ', () => {
      const raw = 'partnerCode=MOMO&orderId=123&amount=50000';
      const secret = 'test-secret-key';
      const validSig = service.createHmacSha256(raw, secret);

      expect(service.verifyHmacSha256(raw, validSig, secret)).toBe(true);
    });

    it('verifyHmacSha256 phải từ chối chữ ký bị thay đổi một ký tự', () => {
      const raw = 'partnerCode=MOMO&orderId=123&amount=50000';
      const secret = 'test-secret-key';
      const validSig = service.createHmacSha256(raw, secret);
      const tamperedSig = validSig.substring(0, 63) + (validSig[63] === 'a' ? 'b' : 'a');

      expect(service.verifyHmacSha256(raw, tamperedSig, secret)).toBe(false);
    });

    it('verifyHmacSha256 phải từ chối chữ ký sai độ dài (không đủ 64 hex)', () => {
      const raw = 'partnerCode=MOMO&orderId=123&amount=50000';
      const secret = 'test-secret-key';

      expect(service.verifyHmacSha256(raw, 'short-sig', secret)).toBe(false);
      expect(service.verifyHmacSha256(raw, 'a'.repeat(63), secret)).toBe(false);
      expect(service.verifyHmacSha256(raw, 'a'.repeat(65), secret)).toBe(false);
    });

    it('verifyHmacSha256 phải từ chối chữ ký chứa ký tự không phải hex', () => {
      const raw = 'partnerCode=MOMO&orderId=123&amount=50000';
      const secret = 'test-secret-key';
      // 64 ký tự nhưng chứa 'z' (không thuộc hex)
      const nonHexSig = 'z'.repeat(64);

      expect(service.verifyHmacSha256(raw, nonHexSig, secret)).toBe(false);
    });

    it('verifyHmacSha256 phải từ chối chữ ký rỗng hoặc undefined', () => {
      const raw = 'partnerCode=MOMO&orderId=123&amount=50000';
      const secret = 'test-secret-key';

      expect(service.verifyHmacSha256(raw, '', secret)).toBe(false);
      expect(service.verifyHmacSha256(raw, null as any, secret)).toBe(false);
      expect(service.verifyHmacSha256(raw, undefined as any, secret)).toBe(false);
    });
  });

  describe('createMomoPayment', () => {
    it('phải ném NotFoundException nếu đơn hàng không tồn tại', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createMomoPayment(mockCustomerUser, {
          orderId: 'non-existent-order',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('phải ném ForbiddenException nếu người dùng không sở hữu đơn và không phải Admin', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);

      await expect(
        service.createMomoPayment(mockOtherUser, {
          orderId: sampleOrder.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('phải ném BadRequestException nếu đơn hàng không ở trạng thái PENDING', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...sampleOrder,
        status: OrderStatus.CONFIRMED,
      });

      await expect(
        service.createMomoPayment(mockCustomerUser, {
          orderId: sampleOrder.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('phải ném BadRequestException nếu đơn hàng đã được thanh toán SUCCESS trước đó', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...sampleOrder,
        payment: {
          id: 'pay-1',
          paymentStatus: PaymentStatus.SUCCESS,
        },
      });

      await expect(
        service.createMomoPayment(mockCustomerUser, {
          orderId: sampleOrder.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('phải tự động xác nhận đơn hàng 0đ (100% giảm giá voucher) mà không cần gọi MoMo', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...sampleOrder,
        finalTotal: 0,
      });

      mockPrisma.payment.upsert.mockResolvedValue({
        id: 'pay-free-1',
        orderId: sampleOrder.id,
        amount: 0,
        paymentStatus: PaymentStatus.SUCCESS,
      });

      const res = await service.createMomoPayment(mockCustomerUser, {
        orderId: sampleOrder.id,
      });

      expect(res.amount).toBe(0);
      expect(res.message).toContain('Đơn hàng 0đ được xác nhận');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleOrder.id },
          data: { status: OrderStatus.CONFIRMED },
        }),
      );
    });

    it('phải hỗ trợ Idempotency khi gửi lại cùng idempotencyKey của cùng một đơn hàng', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-idem-1',
        orderId: sampleOrder.id,
        requestId: 'ORD-REQ-1',
        gatewayPayload: JSON.stringify({
          payUrl: 'https://test-payment.momo.vn/v2/gateway/pay?orderId=001',
        }),
      });

      const res = await service.createMomoPayment(mockCustomerUser, {
        orderId: sampleOrder.id,
        idempotencyKey: 'idem-key-1',
      });

      expect(res.paymentId).toBe('pay-idem-1');
      expect(res.message).toContain('Idempotent');
    });

    it('phải khởi tạo thanh toán MoMo và lưu bản ghi PENDING thành công', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.upsert.mockResolvedValue({
        id: 'pay-uuid-99',
        orderId: sampleOrder.id,
        amount: 150000,
        paymentStatus: PaymentStatus.PENDING,
        requestId: 'REQ-123',
      });

      const res = await service.createMomoPayment(mockCustomerUser, {
        orderId: sampleOrder.id,
        paymentMethod: PaymentMethod.MOMO_QR,
      });

      expect(res.orderId).toBe(sampleOrder.id);
      expect(res.amount).toBe(150000);
      expect(res.payUrl).toBeDefined();
      expect(mockPrisma.payment.upsert).toHaveBeenCalled();
    });
  });

  describe('processMomoIpn', () => {
    it('phải ném BadRequestException nếu chữ ký HMAC-SHA256 không hợp lệ', async () => {
      const invalidIpnDto = {
        partnerCode: 'MOMOBKUN20180529',
        orderId: sampleOrder.id,
        requestId: 'REQ-123',
        amount: 150000,
        orderInfo: 'Thanh toan',
        orderType: 'momo_wallet',
        transId: 99887766,
        resultCode: 0,
        message: 'Thành công',
        payType: 'qr',
        responseTime: Date.now(),
        signature: 'invalid-signature-hash',
      };

      await expect(service.processMomoIpn(invalidIpnDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném NotFoundException nếu không tìm thấy bản ghi Payment của đơn hàng', async () => {
      const secret = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';
      const accessKey = 'klm05TvNBzhg7h7j';
      const partnerCode = 'MOMOBKUN20180529';
      const orderId = 'order-not-found';
      const requestId = 'REQ-123';
      const amount = 150000;
      const orderInfo = 'Thanh toan';
      const orderType = 'momo_wallet';
      const transId = 99887766;
      const resultCode = 0;
      const message = 'Thành công';
      const payType = 'qr';
      const responseTime = 1710000000;
      const extraData = '';

      const raw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      const signature = service.createHmacSha256(raw, secret);

      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.processMomoIpn({
          partnerCode,
          orderId,
          requestId,
          amount,
          orderInfo,
          orderType,
          transId,
          resultCode,
          message,
          payType,
          responseTime,
          extraData,
          signature,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('phải ném BadRequestException nếu số tiền IPN không khớp với đơn hàng (Amount Tampering)', async () => {
      const secret = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';
      const accessKey = 'klm05TvNBzhg7h7j';
      const partnerCode = 'MOMOBKUN20180529';
      const orderId = sampleOrder.id;
      const requestId = 'REQ-123';
      const tamperedAmount = 1000; // Đơn hàng 150.000đ nhưng hacker gửi 1.000đ
      const orderInfo = 'Thanh toan';
      const orderType = 'momo_wallet';
      const transId = 99887766;
      const resultCode = 0;
      const message = 'Thành công';
      const payType = 'qr';
      const responseTime = 1710000000;
      const extraData = '';

      const raw = `accessKey=${accessKey}&amount=${tamperedAmount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      const signature = service.createHmacSha256(raw, secret);

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: sampleOrder.id,
        amount: 150000,
        paymentStatus: PaymentStatus.PENDING,
      });

      await expect(
        service.processMomoIpn({
          partnerCode,
          orderId,
          requestId,
          amount: tamperedAmount,
          orderInfo,
          orderType,
          transId,
          resultCode,
          message,
          payType,
          responseTime,
          extraData,
          signature,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('phải hoàn thành nguyên tử: cập nhật Payment = SUCCESS và Order = CONFIRMED khi resultCode = 0', async () => {
      const secret = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';
      const accessKey = 'klm05TvNBzhg7h7j';
      const partnerCode = 'MOMOBKUN20180529';
      const orderId = sampleOrder.id;
      const requestId = 'REQ-123';
      const amount = 150000;
      const orderInfo = 'Thanh toan';
      const orderType = 'momo_wallet';
      const transId = 99887766;
      const resultCode = 0;
      const message = 'Thành công';
      const payType = 'qr';
      const responseTime = 1710000000;
      const extraData = '';

      const raw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      const signature = service.createHmacSha256(raw, secret);

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: sampleOrder.id,
        amount: 150000,
        paymentStatus: PaymentStatus.PENDING,
      });

      const res = await service.processMomoIpn({
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      });

      expect(res.resultCode).toBe(0);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.SUCCESS,
            transactionRef: String(transId),
          }),
        }),
      );
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleOrder.id, status: OrderStatus.PENDING },
          data: { status: OrderStatus.CONFIRMED },
        }),
      );
    });

    it('phải xử lý Idempotent khi webhook gửi lại giao dịch đã thành công', async () => {
      const secret = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';
      const accessKey = 'klm05TvNBzhg7h7j';
      const partnerCode = 'MOMOBKUN20180529';
      const orderId = sampleOrder.id;
      const requestId = 'REQ-123';
      const amount = 150000;
      const orderInfo = 'Thanh toan';
      const orderType = 'momo_wallet';
      const transId = 99887766;
      const resultCode = 0;
      const message = 'Thành công';
      const payType = 'qr';
      const responseTime = 1710000000;
      const extraData = '';

      const raw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      const signature = service.createHmacSha256(raw, secret);

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: sampleOrder.id,
        amount: 150000,
        paymentStatus: PaymentStatus.SUCCESS, // Đã SUCCESS
      });

      const res = await service.processMomoIpn({
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      });

      expect(res.resultCode).toBe(0);
      expect(res.message).toContain('trước đó');
      // Không gọi update lại
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('SEC-02: Late IPN - KHÔNG được cập nhật Order CANCELLED thành CONFIRMED và phải ghi nhận cờ hoàn tiền', async () => {
      const secret = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';
      const accessKey = 'klm05TvNBzhg7h7j';
      const partnerCode = 'MOMOBKUN20180529';
      const orderId = sampleOrder.id;
      const requestId = 'REQ-123';
      const amount = 150000;
      const orderInfo = 'Thanh toan';
      const orderType = 'momo_wallet';
      const transId = 99887766;
      const resultCode = 0;
      const message = 'Thành công';
      const payType = 'qr';
      const responseTime = 1710000000;
      const extraData = '';

      const raw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      const signature = service.createHmacSha256(raw, secret);

      // Payment đang PENDING nhưng Order thực tế đã bị CANCELLED
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: sampleOrder.id,
        amount: 150000,
        paymentStatus: PaymentStatus.PENDING,
        order: {
          ...sampleOrder,
          status: OrderStatus.CANCELLED,
        },
      });

      // tx.order.findUnique trả về CANCELLED
      mockPrisma.order.findUnique.mockResolvedValue({
        ...sampleOrder,
        status: OrderStatus.CANCELLED,
      });
      // updateMany trả về count: 0 vì không có order nào PENDING
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const res = await service.processMomoIpn({
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      });

      expect(res.resultCode).toBe(0);

      // KHÔNG ĐƯỢC gọi order.update thành CONFIRMED
      expect(mockPrisma.order.update).not.toHaveBeenCalled();

      // Payment được cập nhật SUCCESS nhưng có gắn cờ REFUND_PENDING
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.SUCCESS,
            transactionRef: String(transId),
            gatewayPayload: expect.stringContaining('REFUND_PENDING'),
          }),
        }),
      );
    });

    it('SEC-02: Late IPN - KHÔNG được cập nhật Order COMPLETED thành CONFIRMED', async () => {
      const secret = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';
      const accessKey = 'klm05TvNBzhg7h7j';
      const partnerCode = 'MOMOBKUN20180529';
      const orderId = sampleOrder.id;
      const requestId = 'REQ-123';
      const amount = 150000;
      const orderInfo = 'Thanh toan';
      const orderType = 'momo_wallet';
      const transId = 99887766;
      const resultCode = 0;
      const message = 'Thành công';
      const payType = 'qr';
      const responseTime = 1710000000;
      const extraData = '';

      const raw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      const signature = service.createHmacSha256(raw, secret);

      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: sampleOrder.id,
        amount: 150000,
        paymentStatus: PaymentStatus.PENDING,
        order: {
          ...sampleOrder,
          status: OrderStatus.COMPLETED,
        },
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        ...sampleOrder,
        status: OrderStatus.COMPLETED,
      });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const res = await service.processMomoIpn({
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      });

      expect(res.resultCode).toBe(0);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('ENV-01 Sandbox Fallback Restriction', () => {
    it('ở môi trường Production, phải từ chối fallback và ném BadGatewayException khi MoMo lỗi', async () => {
      const prodConfigService: Partial<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'MOMO_ENABLE_SANDBOX_FALLBACK') return 'true'; // Cố tình bật nhưng là Prod
          return mockConfigService.get!(key);
        }),
      };

      const prodService = new PaymentService(mockPrisma as any, prodConfigService as any);

      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error connecting to MoMo'));

      try {
        await expect(
          prodService.createMomoPayment(mockCustomerUser, {
            orderId: sampleOrder.id,
          }),
        ).rejects.toThrow('Không thể kết nối đến cổng thanh toán MoMo');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('ở môi trường Staging, phải từ chối fallback và ném BadGatewayException', async () => {
      const stagingConfigService: Partial<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === 'NODE_ENV') return 'staging';
          if (key === 'MOMO_ENABLE_SANDBOX_FALLBACK') return 'true';
          return mockConfigService.get!(key);
        }),
      };

      const stagingService = new PaymentService(mockPrisma as any, stagingConfigService as any);

      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('MoMo gateway down'));

      try {
        await expect(
          stagingService.createMomoPayment(mockCustomerUser, {
            orderId: sampleOrder.id,
          }),
        ).rejects.toThrow('Không thể kết nối đến cổng thanh toán MoMo');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('ở môi trường QA, phải từ chối fallback và ném BadGatewayException', async () => {
      const qaConfigService: Partial<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === 'NODE_ENV') return 'qa';
          if (key === 'MOMO_ENABLE_SANDBOX_FALLBACK') return 'true';
          return mockConfigService.get!(key);
        }),
      };

      const qaService = new PaymentService(mockPrisma as any, qaConfigService as any);

      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('MoMo gateway timeout'));

      try {
        await expect(
          qaService.createMomoPayment(mockCustomerUser, {
            orderId: sampleOrder.id,
          }),
        ).rejects.toThrow('Không thể kết nối đến cổng thanh toán MoMo');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('ở môi trường Test có bật MOMO_ENABLE_SANDBOX_FALLBACK=true, cho phép fallback an toàn', async () => {
      const testConfigService: Partial<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === 'NODE_ENV') return 'test';
          if (key === 'MOMO_ENABLE_SANDBOX_FALLBACK') return 'true';
          return mockConfigService.get!(key);
        }),
      };

      const testService = new PaymentService(mockPrisma as any, testConfigService as any);

      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.upsert.mockResolvedValue({
        id: 'pay-fallback-test',
        orderId: sampleOrder.id,
        amount: 150000,
        paymentStatus: PaymentStatus.PENDING,
      });

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline in test'));

      try {
        const res = await testService.createMomoPayment(mockCustomerUser, {
          orderId: sampleOrder.id,
        });

        expect(res.orderId).toBe(sampleOrder.id);
        expect(res.payUrl).toContain('test-payment.momo.vn');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('ở môi trường Development nhưng cấu hình MOMO_ENABLE_SANDBOX_FALLBACK không hợp lệ (không phải true), phải từ chối fallback', async () => {
      const devConfigService: Partial<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'MOMO_ENABLE_SANDBOX_FALLBACK') return 'invalid_value';
          return mockConfigService.get!(key);
        }),
      };

      const devService = new PaymentService(mockPrisma as any, devConfigService as any);

      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      try {
        await expect(
          devService.createMomoPayment(mockCustomerUser, {
            orderId: sampleOrder.id,
          }),
        ).rejects.toThrow('Không thể kết nối đến cổng thanh toán MoMo');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('ở môi trường Development có bật MOMO_ENABLE_SANDBOX_FALLBACK=true, cho phép fallback an toàn', async () => {
      const devConfigService: Partial<ConfigService> = {
        get: vi.fn((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'MOMO_ENABLE_SANDBOX_FALLBACK') return 'true';
          return mockConfigService.get!(key);
        }),
      };

      const devService = new PaymentService(mockPrisma as any, devConfigService as any);

      mockPrisma.order.findUnique.mockResolvedValue(sampleOrder);
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.upsert.mockResolvedValue({
        id: 'pay-fallback-1',
        orderId: sampleOrder.id,
        amount: 150000,
        paymentStatus: PaymentStatus.PENDING,
      });

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      try {
        const res = await devService.createMomoPayment(mockCustomerUser, {
          orderId: sampleOrder.id,
        });

        expect(res.orderId).toBe(sampleOrder.id);
        expect(res.payUrl).toContain('test-payment.momo.vn');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('getPaymentByOrderId', () => {
    it('phải ném NotFoundException nếu không tìm thấy thanh toán', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.getPaymentByOrderId(mockCustomerUser, 'non-existent-order'),
      ).rejects.toThrow(NotFoundException);
    });

    it('phải ném ForbiddenException nếu người xem không phải chủ đơn, merchant hay Admin', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: 'order-1',
        amount: 100000,
        currency: 'VND',
        paymentMethod: PaymentMethod.MOMO_QR,
        paymentStatus: PaymentStatus.PENDING,
        requestId: 'REQ-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        order: {
          id: 'order-1',
          orderNumber: 'ORD-1',
          userId: 'user-other',
          merchantId: 'merchant-other',
        },
      });

      await expect(
        service.getPaymentByOrderId(mockCustomerUser, 'order-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('phải trả về PaymentResponse nếu người xem là chủ đơn hàng', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: 'order-1',
        amount: 100000,
        currency: 'VND',
        paymentMethod: PaymentMethod.MOMO_QR,
        paymentStatus: PaymentStatus.SUCCESS,
        transactionRef: 'MOMO-999',
        requestId: 'REQ-1',
        idempotencyKey: null,
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        order: {
          id: 'order-1',
          orderNumber: 'ORD-1',
          userId: mockCustomerUser.id,
          merchantId: 'merchant-1',
        },
      });

      const res = await service.getPaymentByOrderId(mockCustomerUser, 'order-1');
      expect(res.id).toBe('pay-1');
      expect(res.amount).toBe(100000);
      expect(res.paymentStatus).toBe(PaymentStatus.SUCCESS);
    });
  });
});
