// ==============================================================================
// DineGo Backend — Payment Controller Unit Tests (Phase 6: MoMo Payment Engine)
// ==============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethod, PaymentStatus, Role } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { PaymentController } from './payment.controller.js';
import type { PaymentService } from './payment.service.js';

describe('PaymentController', () => {
  let controller: PaymentController;
  let mockService: Partial<PaymentService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-101',
    email: 'user@dinego.vn',
    fullName: 'Test User',
    roles: [Role.CUSTOMER],
    isActive: true,
  };

  beforeEach(() => {
    mockService = {
      createMomoPayment: vi.fn(),
      processMomoIpn: vi.fn(),
      getPaymentByOrderId: vi.fn(),
      getPayments: vi.fn(),
    };

    controller = new PaymentController(mockService as any);
  });

  it('createMomoPayment ủy quyền chính xác cho PaymentService', async () => {
    const dto = {
      orderId: 'order-1',
      paymentMethod: PaymentMethod.MOMO_QR,
    };
    const expectedRes = {
      paymentId: 'pay-1',
      orderId: 'order-1',
      orderNumber: 'ORD-1',
      amount: 50000,
      payUrl: 'https://test-payment.momo.vn/pay',
      message: 'Thành công',
    };

    (mockService.createMomoPayment as any).mockResolvedValue(expectedRes);

    const result = await controller.createMomoPayment(mockUser, dto);

    expect(result).toBe(expectedRes);
    expect(mockService.createMomoPayment).toHaveBeenCalledWith(mockUser, dto);
  });

  it('handleMomoIpn ủy quyền chính xác cho processMomoIpn', async () => {
    const ipnDto = {
      partnerCode: 'MOMO',
      orderId: 'order-1',
      requestId: 'REQ-1',
      amount: 50000,
      orderInfo: 'Thanh toan',
      orderType: 'momo_wallet',
      transId: 123456,
      resultCode: 0,
      message: 'Success',
      payType: 'qr',
      responseTime: 1710000000,
      signature: 'valid-sig',
    };

    const expectedRes = { message: 'Xử lý IPN thành công', resultCode: 0 };
    (mockService.processMomoIpn as any).mockResolvedValue(expectedRes);

    const result = await controller.handleMomoIpn(ipnDto);

    expect(result).toBe(expectedRes);
    expect(mockService.processMomoIpn).toHaveBeenCalledWith(ipnDto);
  });

  it('getPaymentByOrderId ủy quyền chính xác cho PaymentService', async () => {
    const expectedRes = {
      id: 'pay-1',
      orderId: 'order-1',
      paymentMethod: PaymentMethod.MOMO_QR,
      paymentStatus: PaymentStatus.SUCCESS,
      amount: 50000,
      currency: 'VND',
      transactionRef: 'REF-1',
      requestId: 'REQ-1',
      idempotencyKey: null,
      paidAt: null,
      createdAt: '2026-10-28T00:00:00Z',
      updatedAt: '2026-10-28T00:00:00Z',
    };

    (mockService.getPaymentByOrderId as any).mockResolvedValue(expectedRes);

    const result = await controller.getPaymentByOrderId(mockUser, 'order-1');

    expect(result).toBe(expectedRes);
    expect(mockService.getPaymentByOrderId).toHaveBeenCalledWith(mockUser, 'order-1');
  });
});
