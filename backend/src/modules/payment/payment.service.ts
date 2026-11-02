// ==============================================================================
// DineGo Backend — Payment Service (Phase 6: MoMo Payment Engine)
// ==============================================================================

import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { OrderStatus, PaymentMethod, PaymentStatus, Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import type { CreateMomoPaymentDto } from './dto/create-momo-payment.dto.js';
import type { MomoIpnDto } from './dto/momo-ipn.dto.js';
import type { QueryPaymentDto } from './dto/query-payment.dto.js';
import type {
  MomoCreatePaymentRequest,
  MomoCreatePaymentResponse,
} from './interfaces/momo-api.interface.js';
import type {
  CreateMomoPaymentResponse,
  PaymentListResponse,
  PaymentResponse,
} from './interfaces/payment-response.interface.js';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly apiEndpoint: string;
  private readonly redirectUrl: string;
  private readonly ipnUrl: string;
  private readonly nodeEnv: string;
  private readonly isSandboxFallbackEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.partnerCode =
      this.configService.get<string>('MOMO_PARTNER_CODE') || 'MOMOBKUN20180529';
    this.accessKey =
      this.configService.get<string>('MOMO_ACCESS_KEY') || 'klm05TvNBzhg7h7j';
    this.secretKey =
      this.configService.get<string>('MOMO_SECRET_KEY') ||
      'at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca';
    this.apiEndpoint =
      this.configService.get<string>('MOMO_API_ENDPOINT') ||
      'https://test-payment.momo.vn/v2/gateway/api/create';
    this.redirectUrl =
      this.configService.get<string>('MOMO_REDIRECT_URL') ||
      'http://localhost:5173/payment/result';
    this.ipnUrl =
      this.configService.get<string>('MOMO_IPN_URL') ||
      'http://localhost:3000/api/v1/payments/momo/ipn';
    this.nodeEnv =
      this.configService.get<string>('NODE_ENV') || 'development';

    const fallbackConfig = this.configService.get<string>('MOMO_ENABLE_SANDBOX_FALLBACK');
    // Chỉ cho phép bật fallback khi NODE_ENV === 'development' hoặc 'test', và MOMO_ENABLE_SANDBOX_FALLBACK === 'true'
    // Staging, QA, Production và bất kỳ môi trường nào khác đều bị khóa cứng tuyệt đối
    const allowedFallbackEnvs = ['development', 'test'];
    this.isSandboxFallbackEnabled =
      allowedFallbackEnvs.includes(this.nodeEnv) && fallbackConfig === 'true';
  }

  // ----------------------------------------------------------------------------
  // Helper: Tạo chữ ký HMAC-SHA256 chuẩn MoMo
  // ----------------------------------------------------------------------------
  public createHmacSha256(rawSignature: string, secretKey: string): string {
    return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
  }

  // ----------------------------------------------------------------------------
  // Helper: So sánh chữ ký HMAC an toàn thời gian thực (Timing-Safe Comparison)
  // Ngăn ngừa tấn công kênh kề (Side-channel Timing Attacks - SEC-01)
  // ----------------------------------------------------------------------------
  public verifyHmacSha256(rawSignature: string, signature: string, secretKey: string): boolean {
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    // MoMo HMAC-SHA256 digest dạng hex luôn có đúng 64 ký tự hex [0-9a-fA-F]
    const hexRegex = /^[0-9a-fA-F]{64}$/;
    if (!hexRegex.test(signature)) {
      return false;
    }

    const expectedSignature = this.createHmacSha256(rawSignature, secretKey);

    const sigBuffer = Buffer.from(signature.toLowerCase(), 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature.toLowerCase(), 'utf8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  /**
   * Helper: Thực thi thao tác database transaction có retry đối với lỗi Deadlock / Transaction Conflict
   * Giới hạn tối đa 3 lần thử, sử dụng exponential backoff kèm jitter
   */
  public async executeWithDeadlockRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 50,
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        // Kiểm tra lỗi Deadlock từ SQL Server (1205) hoặc Prisma write conflict (P2034)
        const isDeadlock =
          error?.code === 'P2034' ||
          (typeof error?.message === 'string' && error.message.includes('1205')) ||
          error?.meta?.code === 1205;

        if (isDeadlock && attempt < maxRetries) {
          const jitter = Math.floor(Math.random() * 40);
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          this.logger.warn(
            `[Deadlock Detected] Gặp xung đột khóa giao dịch (attempt ${attempt}/${maxRetries}). Thử lại sau ${delay}ms...`,
          );
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  // ----------------------------------------------------------------------------
  // 1. Tạo liên kết thanh toán MoMo (All-in-One Gateway v2)
  // ----------------------------------------------------------------------------
  async createMomoPayment(
    user: AuthenticatedUser,
    dto: CreateMomoPaymentDto,
  ): Promise<CreateMomoPaymentResponse> {
    const { orderId, paymentMethod = PaymentMethod.MOMO_QR, idempotencyKey } = dto;

    // A. Kiểm tra đơn hàng tồn tại
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại`);
    }

    // B. Kiểm tra quyền sở hữu đơn hàng
    const isAdmin = user.roles.includes(Role.ADMIN);
    if (!isAdmin && order.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
    }

    // C. Kiểm tra trạng thái đơn hàng (chỉ thanh toán khi PENDING)
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Không thể tạo giao dịch thanh toán cho đơn hàng đang ở trạng thái: ${order.status}`,
      );
    }

    // D. Kiểm tra thanh toán đã thành công trước đó chưa
    if (order.payment && order.payment.paymentStatus === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Đơn hàng này đã được thanh toán thành công trước đó');
    }

    // E. Kiểm tra Idempotency nếu client gửi idempotencyKey
    if (idempotencyKey) {
      const existingByIdempotency = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existingByIdempotency) {
        if (existingByIdempotency.orderId !== order.id) {
          throw new BadRequestException(
            'Idempotency key đã được sử dụng cho một đơn hàng khác',
          );
        }
        // Tái sử dụng link thanh toán nếu đơn hàng vẫn đang chờ
        let savedPayload: Record<string, unknown> = {};
        try {
          if (existingByIdempotency.gatewayPayload) {
            savedPayload = JSON.parse(existingByIdempotency.gatewayPayload);
          }
        } catch {
          // Ignore json parse error
        }
        const payUrl =
          (savedPayload.payUrl as string) ||
          `https://test-payment.momo.vn/v2/gateway/pay?orderId=${order.id}&requestId=${existingByIdempotency.requestId}`;

        return {
          paymentId: existingByIdempotency.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: Number(order.finalTotal),
          payUrl,
          message: 'Tái sử dụng yêu cầu thanh toán hợp lệ (Idempotent)',
        };
      }
    }

    const amount = Math.round(Number(order.finalTotal));
    const requestId = `${order.orderNumber}_${Date.now()}`;
    const orderInfo = `Thanh toan don hang #${order.orderNumber} qua DineGo`;
    const extraData = '';
    const requestType =
      paymentMethod === PaymentMethod.MOMO_ATM ? 'payWithMethod' : 'captureWallet';

    // F. Trường hợp đặc biệt: Đơn hàng 0đ (100% giảm giá voucher)
    if (amount <= 0) {
      const zeroPayment = await this.prisma.$transaction(async (tx) => {
        const p = await tx.payment.upsert({
          where: { orderId: order.id },
          update: {
            paymentStatus: PaymentStatus.SUCCESS,
            amount: 0,
            paidAt: new Date(),
            gatewayPayload: JSON.stringify({ reason: 'Free voucher order' }),
          },
          create: {
            orderId: order.id,
            paymentMethod,
            paymentStatus: PaymentStatus.SUCCESS,
            amount: 0,
            currency: 'VND',
            requestId,
            idempotencyKey: idempotencyKey ?? null,
            paidAt: new Date(),
            gatewayPayload: JSON.stringify({ reason: 'Free voucher order' }),
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CONFIRMED },
        });

        return p;
      });

      return {
        paymentId: zeroPayment.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: 0,
        payUrl: `${this.redirectUrl}?orderId=${order.id}&resultCode=0`,
        message: 'Đơn hàng 0đ được xác nhận thanh toán thành công tự động',
      };
    }

    // G. Tạo chữ ký HMAC-SHA256 theo chuẩn MoMo v2
    // Cú pháp: accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}&orderId=${order.id}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = this.createHmacSha256(rawSignature, this.secretKey);

    const requestBody: MomoCreatePaymentRequest = {
      partnerCode: this.partnerCode,
      partnerName: 'DineGo Food Delivery',
      storeId: 'DineGoHQ',
      requestId,
      amount,
      orderId: order.id,
      orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature,
    };

    // H. Gửi HTTP POST sang MoMo Gateway (ENV-01: Chặn fallback ở Production)
    let momoResponse: MomoCreatePaymentResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        momoResponse = (await res.json()) as MomoCreatePaymentResponse;
      } else {
        const errorText = await res.text();
        this.logger.warn(`MoMo Gateway HTTP ${res.status}: ${errorText}`);

        if (this.isSandboxFallbackEnabled) {
          this.logger.warn('Chế độ Sandbox Fallback được bật (Dev/Test only).');
          momoResponse = {
            partnerCode: this.partnerCode,
            orderId: order.id,
            requestId,
            amount,
            responseTime: Date.now(),
            message: 'Khởi tạo thành công (Sandbox Fallback Mock)',
            resultCode: 0,
            payUrl: `https://test-payment.momo.vn/v2/gateway/pay?orderId=${order.id}&requestId=${requestId}`,
            deeplink: `momo://?action=payWithApp&orderId=${order.id}`,
            qrCodeUrl: `https://test-payment.momo.vn/v2/gateway/pay?orderId=${order.id}&requestId=${requestId}`,
          };
        } else {
          throw new BadGatewayException(
            `Cổng thanh toán MoMo phản hồi lỗi (${res.status}). Vui lòng thử lại sau.`,
          );
        }
      }
    } catch (networkErr: unknown) {
      if (networkErr instanceof BadGatewayException) {
        throw networkErr;
      }
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      this.logger.warn(`Không thể kết nối MoMo endpoint: ${msg}`);

      if (this.isSandboxFallbackEnabled) {
        this.logger.warn('Chế độ Sandbox Fallback được kích hoạt khi offline (Dev/Test only).');
        momoResponse = {
          partnerCode: this.partnerCode,
          orderId: order.id,
          requestId,
          amount,
          responseTime: Date.now(),
          message: 'Khởi tạo thành công (Offline Sandbox Mock)',
          resultCode: 0,
          payUrl: `https://test-payment.momo.vn/v2/gateway/pay?orderId=${order.id}&requestId=${requestId}`,
          deeplink: `momo://?action=payWithApp&orderId=${order.id}`,
          qrCodeUrl: `https://test-payment.momo.vn/v2/gateway/pay?orderId=${order.id}&requestId=${requestId}`,
        };
      } else {
        throw new BadGatewayException(
          'Không thể kết nối đến cổng thanh toán MoMo hoặc quá thời gian chờ (Timeout).',
        );
      }
    }

    // I. Lưu / Cập nhật bản ghi Payment trong database
    const payment = await this.prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        amount,
        requestId,
        idempotencyKey: idempotencyKey ?? null,
        gatewayPayload: JSON.stringify(momoResponse),
      },
      create: {
        orderId: order.id,
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        amount,
        currency: 'VND',
        requestId,
        idempotencyKey: idempotencyKey ?? null,
        gatewayPayload: JSON.stringify(momoResponse),
      },
    });

    return {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      payUrl:
        momoResponse.payUrl ||
        `https://test-payment.momo.vn/v2/gateway/pay?orderId=${order.id}&requestId=${requestId}`,
      deeplink: momoResponse.deeplink,
      qrCodeUrl: momoResponse.qrCodeUrl,
      message: momoResponse.message || 'Tạo yêu cầu thanh toán MoMo thành công',
    };
  }

  // ----------------------------------------------------------------------------
  // 2. Xử lý IPN Webhook từ MoMo (Bảo mật HMAC-SHA256 & Nguyên tử)
  // ----------------------------------------------------------------------------
  async processMomoIpn(
    ipnDto: MomoIpnDto,
  ): Promise<{ message: string; resultCode: number }> {
    const {
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
      extraData = '',
      signature,
    } = ipnDto;

    // A. Xác thực chữ ký HMAC-SHA256 (SEC-01: Timing-Safe Comparison & Hex Validation)
    // Chuỗi mẫu IPN:
    // accessKey=$accessKey&amount=$amount&extraData=$extraData&message=$message&orderId=$orderId&orderInfo=$orderInfo&orderType=$orderType&partnerCode=$partnerCode&payType=$payType&requestId=$requestId&responseTime=$responseTime&resultCode=$resultCode&transId=$transId
    const rawIpnSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const isValidSignature = this.verifyHmacSha256(rawIpnSignature, signature, this.secretKey);

    if (!isValidSignature) {
      this.logger.error(
        `[MoMo Security Violation] Chữ ký IPN không hợp lệ hoặc sai định dạng cho orderId=${orderId}, requestId=${requestId}`,
      );
      throw new BadRequestException('Chữ ký IPN không hợp lệ (Invalid HMAC Signature)');
    }

    // B. Tìm bản ghi Payment và Order
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      this.logger.error(`[MoMo IPN Error] Không tìm thấy thanh toán cho orderId=${orderId}`);
      throw new NotFoundException(`Không tìm thấy thanh toán cho đơn hàng ${orderId}`);
    }

    // C. Kiểm tra đối soát số tiền (Amount Reconciliation)
    const expectedAmount = Math.round(Number(payment.amount));
    const receivedAmount = Math.round(Number(amount));

    if (expectedAmount !== receivedAmount) {
      this.logger.error(
        `[MoMo Fraud Alert] Lệch số tiền thanh toán! Dự kiến: ${expectedAmount}, Nhận được: ${receivedAmount}`,
      );
      throw new BadRequestException('Số tiền thanh toán không khớp với đơn hàng');
    }

    // D. Idempotency cho Webhook:
    // Nếu giao dịch đã SUCCESS, bỏ qua không xử lý lại (ngăn chặn duplicate / late failure callback)
    if (payment.paymentStatus === PaymentStatus.SUCCESS) {
      this.logger.log(
        `[MoMo IPN Idempotent] Giao dịch cho đơn hàng ${orderId} đã được ghi nhận thành công trước đó.`,
      );
      return { message: 'Giao dịch đã được ghi nhận trước đó', resultCode: 0 };
    }

    // E. Thực thi cập nhật trạng thái nguyên tử trong Database Transaction (SEC-02 Hardened)
    await this.executeWithDeadlockRetry(async () => {
      await this.prisma.$transaction(async (tx) => {
        // Phục hồi metadata ban đầu từ payment.gatewayPayload để không bị mất payUrl, deeplink...
        let existingPayload: Record<string, unknown> = {};
        try {
          if (payment.gatewayPayload) {
            existingPayload = JSON.parse(payment.gatewayPayload);
          }
        } catch {
          existingPayload = {};
        }

        // Làm sạch dữ liệu IPN (loại bỏ secret/nhạy cảm nếu có)
        const sanitizedIpnDto = Object.assign({}, ipnDto);
        delete (sanitizedIpnDto as any).secretKey;

        if (Number(resultCode) === 0) {
          // Giao dịch MoMo THÀNH CÔNG

          // 1. CONDITIONAL DATABASE UPDATE (Atomic CAS):
          // Chỉ chuyển trạng thái Order PENDING -> CONFIRMED nếu đơn thực sự đang PENDING
          const orderUpdateResult = await tx.order.updateMany({
            where: {
              id: payment.orderId,
              status: OrderStatus.PENDING,
            },
            data: {
              status: OrderStatus.CONFIRMED,
            },
          });

          if (orderUpdateResult.count === 1) {
            // Giao dịch NÀY giành quyền xác nhận đơn hàng thành công
            const mergedPayload = Object.assign({}, existingPayload, {
              ipn: sanitizedIpnDto,
              confirmedAt: new Date().toISOString(),
            });

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                paymentStatus: PaymentStatus.SUCCESS,
                transactionRef: String(transId),
                paidAt: new Date(responseTime || Date.now()),
                gatewayPayload: JSON.stringify(mergedPayload),
              },
            });

            this.logger.log(
              `[MoMo Payment Success] Đơn hàng ${payment.orderId} thanh toán thành công qua MoMo (TransId: ${transId})`,
            );
          } else {
            // orderUpdateResult.count === 0:
            // Đơn hàng KHÔNG ở trạng thái PENDING (đã CONFIRMED từ trước hoặc đã CANCELLED/COMPLETED)
            const currentOrder = await tx.order.findUnique({
              where: { id: payment.orderId },
            });

            if (!currentOrder) {
              throw new NotFoundException(`Đơn hàng ${payment.orderId} không tồn tại`);
            }

            if (currentOrder.status === OrderStatus.CONFIRMED) {
              // Đơn đã CONFIRMED từ trước (idempotent / concurrent retry)
              const mergedPayload = Object.assign({}, existingPayload, {
                ipn: sanitizedIpnDto,
              });

              await tx.payment.update({
                where: { id: payment.id },
                data: {
                  paymentStatus: PaymentStatus.SUCCESS,
                  transactionRef: String(transId),
                  paidAt: new Date(responseTime || Date.now()),
                  gatewayPayload: JSON.stringify(mergedPayload),
                },
              });
            } else {
              // SEC-02: Đơn hàng đã bị CANCELLED hoặc COMPLETED trước khi IPN đến (Late IPN)
              // TUYỆT ĐỐI KHÔNG cập nhật Order CANCELLED thành CONFIRMED!
              this.logger.warn(
                `[SEC-02 Late IPN Alert] Đơn hàng ${payment.orderId} hiện ở trạng thái "${currentOrder.status}", nhưng nhận được MoMo IPN SUCCESS (TransId: ${transId}). Giữ nguyên trạng thái Order và gắn cờ hoàn tiền (REFUND_PENDING).`,
              );

              const mergedPayload = Object.assign({}, existingPayload, {
                ipn: sanitizedIpnDto,
                refundFlag: 'REFUND_PENDING',
                refundReason: `Late IPN received while Order status was ${currentOrder.status}`,
                flaggedAt: new Date().toISOString(),
              });

              await tx.payment.update({
                where: { id: payment.id },
                data: {
                  paymentStatus: PaymentStatus.SUCCESS,
                  transactionRef: String(transId),
                  paidAt: new Date(responseTime || Date.now()),
                  gatewayPayload: JSON.stringify(mergedPayload),
                },
              });
            }
          }
        } else {
          // Giao dịch MoMo THẤT BẠI
          const mergedPayload = Object.assign({}, existingPayload, {
            ipn: sanitizedIpnDto,
            failedAt: new Date().toISOString(),
          });

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              paymentStatus: PaymentStatus.FAILED,
              transactionRef: String(transId),
              gatewayPayload: JSON.stringify(mergedPayload),
            },
          });

          this.logger.warn(
            `[MoMo Payment Failed] Giao dịch thất bại cho đơn hàng ${payment.orderId}. ResultCode: ${resultCode}, Message: ${message}`,
          );
        }
      });
    });

    return { message: 'Xử lý IPN thành công', resultCode: 0 };
  }

  // ----------------------------------------------------------------------------
  // 3. Tra cứu chi tiết thanh toán theo Order ID
  // ----------------------------------------------------------------------------
  async getPaymentByOrderId(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<PaymentResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            merchantId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thông tin thanh toán cho đơn hàng ${orderId}`);
    }

    // Kiểm tra quyền truy cập: Admin, Customer sở hữu đơn, hoặc Merchant của đơn
    const isAdmin = user.roles.includes(Role.ADMIN);
    if (!isAdmin) {
      const isOwner = payment.order.userId === user.id;
      let isMerchantOwner = false;
      if (user.roles.includes(Role.MERCHANT)) {
        const merchant = await this.prisma.merchant.findFirst({
          where: { id: payment.order.merchantId, ownerId: user.id },
          select: { id: true },
        });
        isMerchantOwner = !!merchant;
      }

      if (!isOwner && !isMerchantOwner) {
        throw new ForbiddenException('Bạn không có quyền xem thông tin thanh toán này');
      }
    }

    return this.mapToPaymentResponse(payment, payment.order.orderNumber);
  }

  // ----------------------------------------------------------------------------
  // 4. Danh sách giao dịch thanh toán (Phân trang & Lọc)
  // ----------------------------------------------------------------------------
  async getPayments(
    user: AuthenticatedUser,
    query: QueryPaymentDto,
  ): Promise<PaymentListResponse> {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.paymentStatus = status;
    }

    const isAdmin = user.roles.includes(Role.ADMIN);
    const isMerchant = user.roles.includes(Role.MERCHANT);

    if (isAdmin) {
      // Admin xem tất cả các giao dịch
    } else if (isMerchant) {
      const ownedMerchants = await this.prisma.merchant.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });
      const ownedMerchantIds = ownedMerchants.map((m) => m.id);
      where.order = { merchantId: { in: ownedMerchantIds } };
    } else {
      // Customer: chỉ xem giao dịch của chính mình
      where.order = { userId: user.id };
    }

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data = payments.map((p) =>
      this.mapToPaymentResponse(p, p.order?.orderNumber),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ----------------------------------------------------------------------------
  // Helper: Mapping Entity sang Response DTO
  // ----------------------------------------------------------------------------
  private mapToPaymentResponse(
    payment: {
      id: string;
      orderId: string;
      paymentMethod: string;
      paymentStatus: string;
      amount: unknown;
      currency: string;
      transactionRef: string | null;
      requestId: string;
      idempotencyKey: string | null;
      paidAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    orderNumber?: string,
  ): PaymentResponse {
    return {
      id: payment.id,
      orderId: payment.orderId,
      orderNumber,
      paymentMethod: payment.paymentMethod as PaymentMethod,
      paymentStatus: payment.paymentStatus as PaymentStatus,
      amount: Number(payment.amount),
      currency: payment.currency,
      transactionRef: payment.transactionRef,
      requestId: payment.requestId,
      idempotencyKey: payment.idempotencyKey,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}
