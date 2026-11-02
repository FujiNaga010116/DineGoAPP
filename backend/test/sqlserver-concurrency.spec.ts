import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CancelledBy,
  DiscountType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PromotionScope,
  Role,
} from '../src/common/enums/index.js';
import { OrderService } from '../src/modules/order/order.service.js';
import { PaymentService } from '../src/modules/payment/payment.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Microsoft SQL Server Real Concurrency Integration Tests', () => {
  let prisma: PrismaService;
  let paymentService: PaymentService;
  let orderService: OrderService;
  let configService: ConfigService;

  const testUserId = 'user-concurrency-cust-test';
  const testMerchantOwnerId = 'user-concurrency-owner-test';
  const testMerchantId = 'merchant-concurrency-test';
  const testPromotionId = 'promo-concurrency-test';

  const customerUser = {
    id: testUserId,
    email: 'cust-concurrency@dinego.vn',
    fullName: 'Customer Concurrency Test',
    roles: [Role.CUSTOMER],
    isActive: true,
  };

  const secretKey = 'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';
  const accessKey = 'klm05TvNBzhg7h7j';
  const partnerCode = 'MOMOBKUN20180529';

  function createIpnSignature(
    orderId: string,
    requestId: string,
    amount: number,
    transId: number,
    responseTime: number,
    resultCode = 0,
    message = 'Thành công',
  ): string {
    const orderInfo = 'Thanh toan don hang';
    const orderType = 'momo_wallet';
    const payType = 'qr';
    const extraData = '';

    const raw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    return paymentService.createHmacSha256(raw, secretKey);
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    configService = new ConfigService({
      NODE_ENV: 'test',
      MOMO_PARTNER_CODE: partnerCode,
      MOMO_ACCESS_KEY: accessKey,
      MOMO_SECRET_KEY: secretKey,
      MOMO_ENABLE_SANDBOX_FALLBACK: 'true',
    });

    paymentService = new PaymentService(prisma, configService);
    orderService = new OrderService(prisma);

    // Dọn dẹp dữ liệu cũ nếu còn sót lại từ lần chạy trước
    await cleanTestData();

    // 1. Tạo User Merchant Owner & Customer
    await prisma.user.createMany({
      data: [
        {
          id: testMerchantOwnerId,
          email: 'owner-concurrency@dinego.vn',
          passwordHash: 'hash',
          fullName: 'Owner Concurrency',
          phoneNumber: '0900000001',
          isActive: true,
        },
        {
          id: testUserId,
          email: 'cust-concurrency@dinego.vn',
          passwordHash: 'hash',
          fullName: 'Cust Concurrency',
          phoneNumber: '0900000002',
          isActive: true,
        },
      ],
    });

    await prisma.userRole.createMany({
      data: [
        { userId: testMerchantOwnerId, role: Role.MERCHANT },
        { userId: testUserId, role: Role.CUSTOMER },
      ],
    });

    // 2. Tạo Merchant
    await prisma.merchant.create({
      data: {
        id: testMerchantId,
        ownerId: testMerchantOwnerId,
        name: 'Nhà Hàng Concurrency Test',
        slug: 'nha-hang-concurrency-test',
        phoneNumber: '0900000001',
        address: '123 Đường Test, Quận 1',
        isActive: true,
        isOpen: true,
      },
    });

    // 3. Tạo Voucher Test
    await prisma.promotion.create({
      data: {
        id: testPromotionId,
        code: 'CONCURRENCY50',
        name: 'Giảm 50k Concurrency Test',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50000,
        scope: PromotionScope.GLOBAL,
        minOrderValue: 100000,
        maxUsage: 100,
        currentUsage: 5,
        isActive: true,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
      },
    });
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
  });

  async function cleanTestData() {
    try {
      const testOrderIds = (
        await prisma.order.findMany({
          where: { userId: testUserId },
          select: { id: true },
        })
      ).map((o) => o.id);

      if (testOrderIds.length > 0) {
        await prisma.promotionUsage.deleteMany({
          where: { orderId: { in: testOrderIds } },
        });
        await prisma.payment.deleteMany({
          where: { orderId: { in: testOrderIds } },
        });
        await prisma.orderItemTopping.deleteMany({
          where: { orderItem: { orderId: { in: testOrderIds } } },
        });
        await prisma.orderItem.deleteMany({
          where: { orderId: { in: testOrderIds } },
        });
        await prisma.order.deleteMany({
          where: { id: { in: testOrderIds } },
        });
      }

      await prisma.promotion.deleteMany({
        where: { id: testPromotionId },
      });
      await prisma.merchant.deleteMany({
        where: { id: testMerchantId },
      });
      await prisma.userRole.deleteMany({
        where: { userId: { in: [testUserId, testMerchantOwnerId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUserId, testMerchantOwnerId] } },
      });
    } catch {
      // Ignored in cleanup
    }
  }

  // ----------------------------------------------------------------------------
  // TEST 1: IPN SUCCESS và cancelOrder chạy đồng thời trên cùng Order
  // ----------------------------------------------------------------------------
  it('1. IPN SUCCESS và cancelOrder chạy đồng thời: Đảm bảo nguyên tử CAS, không bao giờ để Order CANCELLED thành CONFIRMED', async () => {
    const orderId = 'ord-test-concurrent-1';
    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'DG-CONCUR-001',
        userId: testUserId,
        merchantId: testMerchantId,
        status: OrderStatus.PENDING,
        subtotal: 150000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 150000,
        deliveryAddress: '123 Test',
        recipientName: 'Anh Test',
        recipientPhone: '0901234567',
      },
    });

    await prisma.payment.create({
      data: {
        id: 'pay-test-concurrent-1',
        orderId,
        paymentMethod: PaymentMethod.MOMO_QR,
        paymentStatus: PaymentStatus.PENDING,
        amount: 150000,
        currency: 'VND',
        requestId: 'REQ-CONCUR-1',
        gatewayPayload: JSON.stringify({ payUrl: 'https://test-payment.momo.vn/pay1' }),
      },
    });

    const responseTime = Date.now();
    const transId = 11223344;
    const sig = createIpnSignature(orderId, 'REQ-CONCUR-1', 150000, transId, responseTime, 0);

    // Kích hoạt đồng thời 2 luồng IPN và cancelOrder
    const [_ipnResult, cancelResult] = await Promise.allSettled([
      paymentService.processMomoIpn({
        partnerCode,
        orderId,
        requestId: 'REQ-CONCUR-1',
        amount: 150000,
        orderInfo: 'Thanh toan don hang',
        orderType: 'momo_wallet',
        transId,
        resultCode: 0,
        message: 'Thành công',
        payType: 'qr',
        responseTime,
        extraData: '',
        signature: sig,
      }),
      orderService.cancelOrder(customerUser, orderId, {
        cancelReason: 'Khách đổi ý',
      }),
    ]);

    // Truy vấn bản ghi thực tế trong Microsoft SQL Server
    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const finalPayment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });

    // Kiểm tra tính nhất quán tuyệt đối:
    if (finalOrder.status === OrderStatus.CANCELLED) {
      // Trường hợp cancelOrder thắng cuộc đua CAS
      expect(cancelResult.status).toBe('fulfilled');
      // Payment phải phản ánh đúng MoMo đã trừ tiền SUCCESS
      expect(finalPayment.paymentStatus).toBe(PaymentStatus.SUCCESS);
      // gatewayPayload BẮT BUỘC có cờ REFUND_PENDING
      expect(finalPayment.gatewayPayload).toContain('REFUND_PENDING');
      // Đơn hàng KHÔNG được bị IPN ghi đè thành CONFIRMED
      expect(finalOrder.status).toBe(OrderStatus.CANCELLED);
    } else {
      // Trường hợp IPN thắng cuộc đua CAS
      expect(finalOrder.status).toBe(OrderStatus.CONFIRMED);
      expect(finalPayment.paymentStatus).toBe(PaymentStatus.SUCCESS);
      // Khi Order đã CONFIRMED, yêu cầu cancelOrder của khách hàng bị từ chối
      expect(cancelResult.status).toBe('rejected');
    }
  });

  // ----------------------------------------------------------------------------
  // TEST 2: Hai IPN SUCCESS đến đồng thời trên cùng một đơn hàng
  // ----------------------------------------------------------------------------
  it('2. Hai IPN SUCCESS đến đồng thời: Idempotent và bảo toàn Payment = SUCCESS, Order = CONFIRMED', async () => {
    const orderId = 'ord-test-concurrent-2';
    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'DG-CONCUR-002',
        userId: testUserId,
        merchantId: testMerchantId,
        status: OrderStatus.PENDING,
        subtotal: 120000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 120000,
        deliveryAddress: '123 Test',
        recipientName: 'Anh Test',
        recipientPhone: '0901234567',
      },
    });

    await prisma.payment.create({
      data: {
        id: 'pay-test-concurrent-2',
        orderId,
        paymentMethod: PaymentMethod.MOMO_QR,
        paymentStatus: PaymentStatus.PENDING,
        amount: 120000,
        currency: 'VND',
        requestId: 'REQ-CONCUR-2',
        gatewayPayload: JSON.stringify({ payUrl: 'https://test-payment.momo.vn/pay2' }),
      },
    });

    const responseTime = Date.now();
    const transId = 22334455;
    const sig = createIpnSignature(orderId, 'REQ-CONCUR-2', 120000, transId, responseTime, 0);

    const [ipn1, ipn2] = await Promise.all([
      paymentService.processMomoIpn({
        partnerCode,
        orderId,
        requestId: 'REQ-CONCUR-2',
        amount: 120000,
        orderInfo: 'Thanh toan don hang',
        orderType: 'momo_wallet',
        transId,
        resultCode: 0,
        message: 'Thành công',
        payType: 'qr',
        responseTime,
        extraData: '',
        signature: sig,
      }),
      paymentService.processMomoIpn({
        partnerCode,
        orderId,
        requestId: 'REQ-CONCUR-2',
        amount: 120000,
        orderInfo: 'Thanh toan don hang',
        orderType: 'momo_wallet',
        transId,
        resultCode: 0,
        message: 'Thành công',
        payType: 'qr',
        responseTime,
        extraData: '',
        signature: sig,
      }),
    ]);

    expect(ipn1.resultCode).toBe(0);
    expect(ipn2.resultCode).toBe(0);

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const finalPayment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });

    expect(finalOrder.status).toBe(OrderStatus.CONFIRMED);
    expect(finalPayment.paymentStatus).toBe(PaymentStatus.SUCCESS);
  });

  // ----------------------------------------------------------------------------
  // TEST 3: Hai yêu cầu cancelOrder đến đồng thời
  // ----------------------------------------------------------------------------
  it('3. Hai yêu cầu cancelOrder đến đồng thời: Chỉ DUY NHẤT một yêu cầu thành công, yêu cầu còn lại bị từ chối', async () => {
    const orderId = 'ord-test-concurrent-3';
    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'DG-CONCUR-003',
        userId: testUserId,
        merchantId: testMerchantId,
        status: OrderStatus.PENDING,
        subtotal: 100000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 100000,
        deliveryAddress: '123 Test',
        recipientName: 'Anh Test',
        recipientPhone: '0901234567',
      },
    });

    const [res1, res2] = await Promise.allSettled([
      orderService.cancelOrder(customerUser, orderId, { cancelReason: 'Yêu cầu 1' }),
      orderService.cancelOrder(customerUser, orderId, { cancelReason: 'Yêu cầu 2' }),
    ]);

    const successes = [res1, res2].filter((r) => r.status === 'fulfilled');
    const failures = [res1, res2].filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(finalOrder.status).toBe(OrderStatus.CANCELLED);
  });

  // ----------------------------------------------------------------------------
  // TEST 4: IPN đến sau khi Order đã CANCELLED (Late IPN)
  // ----------------------------------------------------------------------------
  it('4. IPN đến sau khi Order đã CANCELLED: Order giữ nguyên CANCELLED, Payment = SUCCESS có cờ REFUND_PENDING', async () => {
    const orderId = 'ord-test-late-cancelled';
    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'DG-CONCUR-004',
        userId: testUserId,
        merchantId: testMerchantId,
        status: OrderStatus.CANCELLED,
        cancelReason: 'Đã hủy trước khi IPN tới',
        cancelledBy: CancelledBy.USER,
        subtotal: 180000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 180000,
        deliveryAddress: '123 Test',
        recipientName: 'Anh Test',
        recipientPhone: '0901234567',
      },
    });

    await prisma.payment.create({
      data: {
        id: 'pay-test-late-cancelled',
        orderId,
        paymentMethod: PaymentMethod.MOMO_QR,
        paymentStatus: PaymentStatus.PENDING,
        amount: 180000,
        currency: 'VND',
        requestId: 'REQ-LATE-1',
        gatewayPayload: JSON.stringify({ payUrl: 'https://test-payment.momo.vn/pay-late-1' }),
      },
    });

    const responseTime = Date.now();
    const transId = 33445566;
    const sig = createIpnSignature(orderId, 'REQ-LATE-1', 180000, transId, responseTime, 0);

    const res = await paymentService.processMomoIpn({
      partnerCode,
      orderId,
      requestId: 'REQ-LATE-1',
      amount: 180000,
      orderInfo: 'Thanh toan don hang',
      orderType: 'momo_wallet',
      transId,
      resultCode: 0,
      message: 'Thành công',
      payType: 'qr',
      responseTime,
      extraData: '',
      signature: sig,
    });

    expect(res.resultCode).toBe(0);

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const finalPayment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });

    // TUYỆT ĐỐI không bị ghi đè CONFIRMED
    expect(finalOrder.status).toBe(OrderStatus.CANCELLED);
    expect(finalPayment.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(finalPayment.gatewayPayload).toContain('REFUND_PENDING');
    expect(finalPayment.gatewayPayload).toContain('https://test-payment.momo.vn/pay-late-1');
  });

  // ----------------------------------------------------------------------------
  // TEST 5: IPN đến sau khi Order đã COMPLETED
  // ----------------------------------------------------------------------------
  it('5. IPN đến sau khi Order đã COMPLETED: Order giữ nguyên COMPLETED, Payment = SUCCESS có cờ REFUND_PENDING', async () => {
    const orderId = 'ord-test-late-completed';
    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'DG-CONCUR-005',
        userId: testUserId,
        merchantId: testMerchantId,
        status: OrderStatus.COMPLETED,
        subtotal: 100000,
        discountAmount: 0,
        deliveryFee: 0,
        finalTotal: 100000,
        deliveryAddress: '123 Test',
        recipientName: 'Anh Test',
        recipientPhone: '0901234567',
      },
    });

    await prisma.payment.create({
      data: {
        id: 'pay-test-late-completed',
        orderId,
        paymentMethod: PaymentMethod.MOMO_QR,
        paymentStatus: PaymentStatus.PENDING,
        amount: 100000,
        currency: 'VND',
        requestId: 'REQ-LATE-2',
      },
    });

    const responseTime = Date.now();
    const transId = 44556677;
    const sig = createIpnSignature(orderId, 'REQ-LATE-2', 100000, transId, responseTime, 0);

    const res = await paymentService.processMomoIpn({
      partnerCode,
      orderId,
      requestId: 'REQ-LATE-2',
      amount: 100000,
      orderInfo: 'Thanh toan don hang',
      orderType: 'momo_wallet',
      transId,
      resultCode: 0,
      message: 'Thành công',
      payType: 'qr',
      responseTime,
      extraData: '',
      signature: sig,
    });

    expect(res.resultCode).toBe(0);

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const finalPayment = await prisma.payment.findUniqueOrThrow({ where: { orderId } });

    expect(finalOrder.status).toBe(OrderStatus.COMPLETED);
    expect(finalPayment.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(finalPayment.gatewayPayload).toContain('REFUND_PENDING');
  });

  // ----------------------------------------------------------------------------
  // TEST 6: Voucher Quota không bị hoàn hai lần khi hai luồng cancelOrder chạy song song
  // ----------------------------------------------------------------------------
  it('6. Voucher Quota: Không bao giờ bị hoàn hai lần khi có 2 luồng hủy đơn đồng thời', async () => {
    // Đặt voucher currentUsage = 5
    await prisma.promotion.update({
      where: { id: testPromotionId },
      data: { currentUsage: 5 },
    });

    const orderId = 'ord-test-voucher-quota';
    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: 'DG-CONCUR-006',
        userId: testUserId,
        merchantId: testMerchantId,
        promotionId: testPromotionId,
        status: OrderStatus.PENDING,
        subtotal: 150000,
        discountAmount: 50000,
        deliveryFee: 0,
        finalTotal: 100000,
        deliveryAddress: '123 Test',
        recipientName: 'Anh Test',
        recipientPhone: '0901234567',
      },
    });

    await prisma.promotionUsage.create({
      data: {
        orderId,
        promotionId: testPromotionId,
        userId: testUserId,
        discountAmount: 50000,
      },
    });

    // 2 request hủy đơn đồng thời
    await Promise.allSettled([
      orderService.cancelOrder(customerUser, orderId, { cancelReason: 'Hủy 1' }),
      orderService.cancelOrder(customerUser, orderId, { cancelReason: 'Hủy 2' }),
    ]);

    // Kiểm tra currentUsage của promotion trong SQL Server
    const promo = await prisma.promotion.findUniqueOrThrow({
      where: { id: testPromotionId },
    });

    // Ban đầu là 5, sau khi hủy chỉ được giảm ĐÚNG 1 lần xuống 4, KHÔNG được thành 3!
    expect(promo.currentUsage).toBe(4);
  });

  // ----------------------------------------------------------------------------
  // TEST 7: Payment và Order không rơi vào trạng thái mâu thuẫn
  // ----------------------------------------------------------------------------
  it('7. Payment và Order: Kiểm tra toàn vẹn không phát sinh mâu thuẫn dữ liệu', async () => {
    const orders = await prisma.order.findMany({
      where: { userId: testUserId },
      include: { payment: true },
    });

    for (const ord of orders) {
      if (ord.status === OrderStatus.CANCELLED && ord.payment?.paymentStatus === PaymentStatus.SUCCESS) {
        // Đã hủy nhưng Payment SUCCESS -> BẮT BUỘC phải có cờ REFUND_PENDING
        expect(ord.payment.gatewayPayload).toContain('REFUND_PENDING');
      }

      if (ord.status === OrderStatus.CONFIRMED && ord.payment) {
        // Đã xác nhận -> KHÔNG ĐƯỢC có cờ hoàn tiền
        expect(ord.payment.gatewayPayload || '').not.toContain('REFUND_PENDING');
      }
    }
  });
});
