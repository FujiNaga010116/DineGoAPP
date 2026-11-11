// ==============================================================================
// DineGo Backend — Order Service (Phase 5.3)
// Architecture: Clean Architecture / Modular Monolith
// Database: Microsoft SQL Server via Prisma ORM
// ==============================================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'crypto';
import {
  CancelledBy,
  DiscountType,
  OrderStatus,
  PromotionScope,
  Role,
} from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { EstimateShippingDto } from './dto/estimate-shipping.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import type {
  OrderItemResponse,
  OrderItemToppingResponse,
  OrderListResponse,
  OrderResponse,
} from './interfaces/order-response.interface.js';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Sinh mã đơn hàng duy nhất, dễ đọc theo định dạng DG-YYYYMMDD-XXXXXX
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `DG${yyyy}${mm}${dd}-${randomHex}`;
  }

  /**
   * Helper: Map Entity Database sang DTO Response an toàn
   */
  private mapToOrderResponse(order: any): OrderResponse {
    const items: OrderItemResponse[] = (order.items ?? []).map((item: any) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      itemImage: item.itemImage,
      basePrice: Number(item.basePrice),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
      note: item.note,
      toppings: (item.toppings ?? []).map((t: any): OrderItemToppingResponse => ({
        id: t.id,
        toppingId: t.toppingId,
        toppingName: t.toppingName,
        toppingPrice: Number(t.toppingPrice),
      })),
    }));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as OrderStatus,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      deliveryFee: Number(order.deliveryFee),
      finalTotal: Number(order.finalTotal),
      deliveryAddress: order.deliveryAddress,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      customerNote: order.customerNote,
      cancelReason: order.cancelReason,
      cancelledBy: order.cancelledBy,
      cancelledAt: order.cancelledAt,
      idempotencyKey: order.idempotencyKey,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      merchant: {
        id: order.merchant?.id ?? order.merchantId,
        name: order.merchant?.name ?? '',
        slug: order.merchant?.slug ?? '',
        address: order.merchant?.address ?? '',
        phoneNumber: order.merchant?.phoneNumber ?? '',
        logoUrl: order.merchant?.logoUrl ?? null,
      },
      user: order.user
        ? {
            id: order.user.id,
            fullName: order.user.fullName,
            email: order.user.email,
            phoneNumber: order.user.phoneNumber,
          }
        : undefined,
      promotion: order.promotion
        ? {
            id: order.promotion.id,
            code: order.promotion.code,
            name: order.promotion.name,
            discountType: order.promotion.discountType,
            discountValue: Number(order.promotion.discountValue),
          }
        : null,
      payment: order.payment
        ? {
            id: order.payment.id,
            paymentMethod: order.payment.paymentMethod,
            paymentStatus: order.payment.paymentStatus,
            amount: Number(order.payment.amount),
            currency: order.payment.currency ?? 'VND',
            transactionRef: order.payment.transactionRef,
            paidAt: order.payment.paidAt
              ? new Date(order.payment.paidAt).toISOString()
              : null,
          }
        : null,
      items,
    };
  }

  /**
   * Tạo đơn hàng mới từ giỏ hàng hiện tại (Phase 5.3)
   * Kiểm tra toàn vẹn giá món, topping, voucher, kiểm soát đồng thời và ghi nhận lịch sử nguyên tử
   */
  async createOrder(
    user: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    // 1. Kiểm tra Idempotency Key (nếu client cung cấp)
    if (dto.idempotencyKey) {
      const existingOrder = await this.prisma.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          items: {
            include: { toppings: true },
          },
          merchant: true,
          promotion: true,
          user: true,
        },
      });

      if (existingOrder) {
        if (existingOrder.userId !== user.id) {
          throw new ConflictException(
            'Khóa idempotency này đã được sử dụng bởi người dùng khác',
          );
        }
        this.logger.log(
          `[Idempotency] Yêu cầu tạo đơn trùng khóa ${dto.idempotencyKey}, trả lại đơn đã tạo ${existingOrder.orderNumber}`,
        );
        return this.mapToOrderResponse(existingOrder);
      }
    }

    // 2. Lấy giỏ hàng của người dùng hiện tại
    const cart = await this.prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        merchant: true,
        items: {
          include: {
            menuItem: true,
            toppings: {
              include: { topping: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const cartItems = cart?.items ?? [];
    if (!cart || !cart.merchantId || cartItems.length === 0) {
      throw new BadRequestException(
        'Giỏ hàng đang trống, vui lòng chọn món trước khi đặt đơn',
      );
    }

    // 3. Kiểm tra nhà hàng hợp lệ và đang hoạt động
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: cart.merchantId },
    });

    if (!merchant || !merchant.isActive) {
      throw new BadRequestException(
        'Nhà hàng hiện đang tạm ngưng hoạt động hoặc không tồn tại',
      );
    }

    // 4. Kiểm tra lại từng món ăn và topping trực tiếp từ Database
    // Không tin giá do client hoặc cache, tính lại snapshot giá tươi
    let calculatedSubtotal = 0;
    const preparedOrderItems: {
      menuItemId: string;
      itemName: string;
      itemImage: string | null;
      basePrice: number;
      quantity: number;
      subtotal: number;
      note: string | null;
      toppings: {
        toppingId: string;
        toppingName: string;
        toppingPrice: number;
      }[];
    }[] = [];

    for (const item of cartItems) {
      const freshMenuItem = await this.prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (
        !freshMenuItem ||
        !freshMenuItem.isActive ||
        !freshMenuItem.isAvailable
      ) {
        throw new BadRequestException(
          `Món "${item.menuItem?.name ?? 'Món ăn'}" hiện không còn khả dụng để đặt hàng`,
        );
      }

      if (freshMenuItem.merchantId !== merchant.id) {
        throw new BadRequestException(
          `Món "${freshMenuItem.name}" không thuộc về nhà hàng được chọn`,
        );
      }

      const basePrice = Number(freshMenuItem.basePrice);
      let toppingsSum = 0;
      const preparedToppings: {
        toppingId: string;
        toppingName: string;
        toppingPrice: number;
      }[] = [];

      for (const cit of item.toppings ?? []) {
        const freshTopping = await this.prisma.topping.findUnique({
          where: { id: cit.toppingId },
        });

        if (
          !freshTopping ||
          !freshTopping.isActive ||
          !freshTopping.isAvailable
        ) {
          throw new BadRequestException(
            `Topping "${cit.topping?.name ?? 'Topping'}" hiện không còn khả dụng`,
          );
        }

        if (freshTopping.merchantId !== merchant.id) {
          throw new BadRequestException(
            `Topping "${freshTopping.name}" không thuộc về nhà hàng được chọn`,
          );
        }

        const toppingPrice = Number(freshTopping.price);
        toppingsSum += toppingPrice;
        preparedToppings.push({
          toppingId: freshTopping.id,
          toppingName: freshTopping.name,
          toppingPrice,
        });
      }

      const itemTotal = (basePrice + toppingsSum) * item.quantity;
      calculatedSubtotal += itemTotal;

      preparedOrderItems.push({
        menuItemId: freshMenuItem.id,
        itemName: freshMenuItem.name,
        itemImage: freshMenuItem.imageUrl,
        basePrice,
        quantity: item.quantity,
        subtotal: itemTotal,
        note: item.note,
        toppings: preparedToppings,
      });
    }

    // Làm tròn tiền chuẩn 2 số thập phân
    calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;

    // 5. Xác thực Voucher (nếu có cung cấp)
    let appliedPromotion: any = null;
    let discountAmount = 0;

    if (dto.voucherCode) {
      const normalizedCode = dto.voucherCode.trim().toUpperCase();
      const promotion = await this.prisma.promotion.findUnique({
        where: { code: normalizedCode },
      });

      if (!promotion) {
        throw new BadRequestException('Mã voucher không tồn tại trên hệ thống');
      }

      if (!promotion.isActive) {
        throw new BadRequestException(
          'Mã voucher hiện đang bị tạm khóa hoặc ngừng áp dụng',
        );
      }

      const now = new Date();
      if (now < promotion.startDate) {
        throw new BadRequestException('Chương trình khuyến mãi chưa bắt đầu');
      }

      if (now > promotion.endDate) {
        throw new BadRequestException('Mã voucher đã hết hạn sử dụng');
      }

      if (
        promotion.maxUsage != null &&
        promotion.currentUsage >= promotion.maxUsage
      ) {
        throw new BadRequestException(
          'Mã voucher đã hết lượt sử dụng trên toàn hệ thống',
        );
      }

      if (promotion.maxUsagePerUser != null) {
        const userUsageCount = await this.prisma.promotionUsage.count({
          where: {
            promotionId: promotion.id,
            userId: user.id,
          },
        });

        if (userUsageCount >= promotion.maxUsagePerUser) {
          throw new BadRequestException(
            `Bạn đã sử dụng hết số lần cho phép của mã voucher này (${promotion.maxUsagePerUser} lần)`,
          );
        }
      }

      if (
        promotion.scope === PromotionScope.MERCHANT &&
        promotion.merchantId !== merchant.id
      ) {
        throw new BadRequestException(
          'Mã voucher này chỉ áp dụng cho nhà hàng chỉ định',
        );
      }

      const minOrderValue = Number(promotion.minOrderValue);
      if (calculatedSubtotal < minOrderValue) {
        throw new BadRequestException(
          `Đơn hàng chưa đạt giá trị tối thiểu ${minOrderValue.toLocaleString('vi-VN')} VND để áp dụng mã này`,
        );
      }

      // Tính số tiền giảm
      let rawDiscount = 0;
      const discountVal = Number(promotion.discountValue);
      if (promotion.discountType === DiscountType.PERCENTAGE) {
        rawDiscount = (calculatedSubtotal * discountVal) / 100;
        if (promotion.maxDiscountAmount != null) {
          rawDiscount = Math.min(
            rawDiscount,
            Number(promotion.maxDiscountAmount),
          );
        }
      } else {
        rawDiscount = discountVal;
      }

      discountAmount = Math.min(
        Math.round(rawDiscount * 100) / 100,
        calculatedSubtotal,
      );
      appliedPromotion = promotion;
    }

    const finalTotal = Math.max(0, calculatedSubtotal - discountAmount);

    // 6. Thực thi Giao dịch Database Nguyên tử (Transaction)
    // Bao gồm: Kiểm soát đồng thời voucher, tạo Order + snapshot items, ghi PromotionUsage, xóa Cart
    return await this.prisma.$transaction(async (tx) => {
      // 6.1. Nếu có áp dụng voucher, thực hiện conditional update nguyên tử trên SQL Server
      if (appliedPromotion) {
        const updateResult = await tx.$executeRaw`
          UPDATE [dbo].[promotions]
          SET [current_usage] = [current_usage] + 1,
              [updated_at] = SYSDATETIME()
          WHERE [id] = ${appliedPromotion.id}
            AND ([max_usage] IS NULL OR [current_usage] < [max_usage])
        `;

        if (updateResult === 0) {
          throw new BadRequestException(
            'Mã voucher vừa hết lượt sử dụng trên toàn hệ thống',
          );
        }

        // Kiểm tra lại lượt cá nhân bên trong transaction (chống race condition 2 request đồng thời từ cùng 1 user)
        if (appliedPromotion.maxUsagePerUser != null) {
          const freshUserUsages = await tx.promotionUsage.count({
            where: {
              promotionId: appliedPromotion.id,
              userId: user.id,
            },
          });

          if (freshUserUsages >= appliedPromotion.maxUsagePerUser) {
            throw new BadRequestException(
              `Bạn đã sử dụng hết số lần cho phép của mã voucher này (${appliedPromotion.maxUsagePerUser} lần)`,
            );
          }
        }
      }

      // 6.2. Sinh mã đơn hàng và tạo Order Snapshot
      const orderNumber = this.generateOrderNumber();

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          merchantId: merchant.id,
          promotionId: appliedPromotion ? appliedPromotion.id : null,
          status: OrderStatus.PENDING,
          subtotal: calculatedSubtotal,
          discountAmount,
          deliveryFee: 0,
          finalTotal,
          deliveryAddress: dto.deliveryAddress,
          deliveryLatitude: dto.deliveryLatitude ?? null,
          deliveryLongitude: dto.deliveryLongitude ?? null,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          customerNote: dto.customerNote ?? null,
          idempotencyKey: dto.idempotencyKey ?? null,
          items: {
            create: preparedOrderItems.map((poi) => ({
              menuItemId: poi.menuItemId,
              itemName: poi.itemName,
              itemImage: poi.itemImage,
              basePrice: poi.basePrice,
              quantity: poi.quantity,
              subtotal: poi.subtotal,
              note: poi.note,
              toppings: {
                create: poi.toppings.map((top) => ({
                  toppingId: top.toppingId,
                  toppingName: top.toppingName,
                  toppingPrice: top.toppingPrice,
                })),
              },
            })),
          },
        },
        include: {
          items: {
            include: { toppings: true },
          },
          merchant: true,
          promotion: true,
          user: true,
        },
      });

      // 6.3. Ghi nhận PromotionUsage gắn liền với Order thành công
      if (appliedPromotion) {
        await tx.promotionUsage.create({
          data: {
            promotionId: appliedPromotion.id,
            userId: user.id,
            orderId: createdOrder.id,
            discountAmount,
          },
        });
      }

      // 6.4. Xóa sạch giỏ hàng sau khi đã ghi Order thành công
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      await tx.cart.update({
        where: { id: cart.id },
        data: { merchantId: null },
      });

      this.logger.log(
        `[OrderEngine] Tạo thành công đơn hàng ${createdOrder.orderNumber} (Tổng tiền: ${finalTotal} VND) cho người dùng ${user.id}`,
      );

      return this.mapToOrderResponse(createdOrder);
    });
  }

  /**
   * Lấy danh sách đơn hàng có phân trang và lọc theo vai trò (RBAC)
   */
  async getOrders(
    user: AuthenticatedUser,
    query: QueryOrderDto,
  ): Promise<OrderListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    const isAdmin = user.roles.includes(Role.ADMIN);
    const isMerchant = user.roles.includes(Role.MERCHANT);

    if (isAdmin) {
      if (query.merchantId) {
        where.merchantId = query.merchantId;
      }
    } else if (isMerchant) {
      // Merchant chỉ xem đơn của các nhà hàng mình sở hữu
      const ownedMerchants = await this.prisma.merchant.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      });
      const ownedMerchantIds = ownedMerchants.map((m) => m.id);

      if (query.merchantId) {
        if (!ownedMerchantIds.includes(query.merchantId)) {
          throw new ForbiddenException(
            'Bạn không có quyền quản lý đơn hàng của nhà hàng này',
          );
        }
        where.merchantId = query.merchantId;
      } else {
        where.merchantId = { in: ownedMerchantIds };
      }
    } else {
      // CUSTOMER: Chỉ xem đơn hàng của chính mình
      where.userId = user.id;
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { toppings: true },
          },
          merchant: true,
          promotion: true,
          user: true,
          payment: true,
        },
      }),
    ]);

    return {
      items: orders.map((o) => this.mapToOrderResponse(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Xem chi tiết một đơn hàng theo quyền truy cập
   */
  async getOrderById(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { toppings: true },
        },
        merchant: true,
        promotion: true,
        user: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID "${orderId}"`);
    }

    const isAdmin = user.roles.includes(Role.ADMIN);
    const isOwnerCustomer = order.userId === user.id;

    if (!isAdmin && !isOwnerCustomer) {
      // Kiểm tra nếu là Merchant sở hữu nhà hàng này
      const isMerchantOwner = await this.prisma.merchant.findFirst({
        where: {
          id: order.merchantId,
          ownerId: user.id,
        },
      });

      if (!isMerchantOwner) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập thông tin đơn hàng này',
        );
      }
    }

    return this.mapToOrderResponse(order);
  }

  /**
   * Hủy đơn hàng theo quy tắc trạng thái và phân quyền
   */
  async cancelOrder(
    user: AuthenticatedUser,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID "${orderId}"`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng đã ở trạng thái hủy trước đó');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy đơn hàng đã hoàn tất');
    }

    const isAdmin = user.roles.includes(Role.ADMIN);
    const isCustomer = order.userId === user.id;
    let cancelledBy = CancelledBy.SYSTEM;

    if (isAdmin) {
      cancelledBy = CancelledBy.ADMIN;
    } else if (isCustomer) {
      // Khách hàng chỉ được hủy khi đơn ở trạng thái PENDING
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          'Khách hàng chỉ có thể hủy đơn khi đơn hàng đang chờ xác nhận (PENDING)',
        );
      }
      cancelledBy = CancelledBy.USER;
    } else {
      // Merchant
      const isMerchantOwner = order.merchant.ownerId === user.id;
      if (!isMerchantOwner) {
        throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này');
      }

      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          'Nhà hàng chỉ có thể hủy đơn khi đơn ở trạng thái PENDING hoặc CONFIRMED',
        );
      }
      cancelledBy = CancelledBy.MERCHANT;
    }

    const eligibleStatuses = isCustomer
      ? [OrderStatus.PENDING]
      : [OrderStatus.PENDING, OrderStatus.CONFIRMED];

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // 1. CONDITIONAL DATABASE UPDATE (Atomic CAS):
      // Chỉ cập nhật nếu đơn còn nằm trong danh sách trạng thái hợp lệ
      const updateResult = await tx.order.updateMany({
        where: {
          id: orderId,
          status: { in: eligibleStatuses },
        },
        data: {
          status: OrderStatus.CANCELLED,
          cancelReason: dto.cancelReason,
          cancelledBy,
          cancelledAt: new Date(),
        },
      });

      // 2. Kiểm tra count để xác định transaction có thực sự giành quyền hủy hay không
      if (updateResult.count === 0) {
        // Đã có transaction khác đổi trạng thái đơn (ví dụ: MoMo IPN vừa chuyển CONFIRMED hoặc đơn đã bị hủy)
        const freshOrder = await tx.order.findUnique({
          where: { id: orderId },
        });

        if (!freshOrder) {
          throw new NotFoundException(`Không tìm thấy đơn hàng với ID "${orderId}"`);
        }
        if (freshOrder.status === OrderStatus.CANCELLED) {
          throw new BadRequestException('Đơn hàng đã ở trạng thái hủy trước đó');
        }
        if (freshOrder.status === OrderStatus.COMPLETED) {
          throw new BadRequestException('Không thể hủy đơn hàng đã hoàn tất');
        }
        if (isCustomer && freshOrder.status !== OrderStatus.PENDING) {
          throw new BadRequestException(
            'Khách hàng chỉ có thể hủy đơn khi đơn hàng đang chờ xác nhận (PENDING)',
          );
        }
        throw new BadRequestException(
          `Không thể hủy đơn hàng ở trạng thái hiện tại: ${freshOrder.status}`,
        );
      }

      // 3. updateResult.count === 1: Đảm bảo transaction NÀY giành quyền hủy đơn DUY NHẤT
      // CHỈ HOÀN QUOTA VOUCHER KHI VÀ CHỈ KHI updateResult.count === 1
      // Ngăn chặn tuyệt đối việc hoàn quota voucher 2 lần trong mọi kịch bản concurrency
      if (order.promotionId) {
        await tx.promotionUsage.deleteMany({
          where: { orderId: order.id },
        });
        await tx.$executeRaw`
          UPDATE [dbo].[promotions]
          SET [current_usage] = CASE WHEN [current_usage] > 0 THEN [current_usage] - 1 ELSE 0 END,
              [updated_at] = SYSDATETIME()
          WHERE [id] = ${order.promotionId}
        `;
      }

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: {
            include: { toppings: true },
          },
          merchant: true,
          promotion: true,
          user: true,
          payment: true,
        },
      });
    });

    this.logger.log(
      `[OrderEngine] Đơn hàng ${order.orderNumber} đã bị hủy bởi ${cancelledBy}. Lý do: ${dto.cancelReason}`,
    );

    return this.mapToOrderResponse(updatedOrder);
  }

  /**
   * Cập nhật trạng thái đơn hàng (Dành riêng cho Merchant và Admin)
   */
  async updateOrderStatus(
    user: AuthenticatedUser,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID "${orderId}"`);
    }

    const isAdmin = user.roles.includes(Role.ADMIN);
    if (!isAdmin) {
      const isMerchantOwner = order.merchant.ownerId === user.id;
      if (!isMerchantOwner) {
        throw new ForbiddenException(
          'Bạn không có quyền cập nhật trạng thái đơn hàng của nhà hàng này',
        );
      }
    }

    // Finite State Machine (FSM) luồng trạng thái hợp lệ
    const allowedTransitions: Record<string, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.READY_FOR_PICKUP]: [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const validNextStates = allowedTransitions[order.status] ?? [];
    if (!validNextStates.includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái đơn hàng từ "${order.status}" sang "${dto.status}"`,
      );
    }

    const updateData: any = {
      status: dto.status,
    };

    if (dto.status === OrderStatus.CANCELLED) {
      updateData.cancelReason =
        dto.note ?? 'Đơn hàng bị hủy bởi nhà hàng/quản trị viên';
      updateData.cancelledBy = isAdmin
        ? CancelledBy.ADMIN
        : CancelledBy.MERCHANT;
      updateData.cancelledAt = new Date();
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Nếu hủy đơn có gắn voucher, hoàn trả quota voucher
      if (dto.status === OrderStatus.CANCELLED && order.promotionId) {
        await tx.promotionUsage.deleteMany({
          where: { orderId: order.id },
        });
        await tx.$executeRaw`
          UPDATE [dbo].[promotions]
          SET [current_usage] = CASE WHEN [current_usage] > 0 THEN [current_usage] - 1 ELSE 0 END,
              [updated_at] = SYSDATETIME()
          WHERE [id] = ${order.promotionId}
        `;
      }

      return tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: {
            include: { toppings: true },
          },
          merchant: true,
          promotion: true,
          user: true,
          payment: true,
        },
      });
    });

    this.logger.log(
      `[OrderEngine] Cập nhật trạng thái đơn ${order.orderNumber}: ${order.status} -> ${dto.status}`,
    );

    return this.mapToOrderResponse(updatedOrder);
  }

  // ----------------------------------------------------------------------------
  // SPRINT 2 ENHANCEMENTS: SHIPPING ESTIMATION & REORDER (U017, U022)
  // ----------------------------------------------------------------------------

  /**
   * U017: Tính toán khoảng cách và phí giao hàng theo quy tắc bậc thang BR-13
   */
  async estimateShippingFee(dto: EstimateShippingDto): Promise<{
    distanceKm: number;
    shippingFee: number;
    estimatedDurationMinutes: number;
  }> {
    let distanceKm = dto.distanceKm ?? 1.5;

    // Nếu truyền tọa độ và merchantId, tính khoảng cách thực tế bằng Haversine
    if (dto.merchantId && dto.customerLat !== undefined && dto.customerLng !== undefined) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: dto.merchantId },
      });

      if (merchant && merchant.latitude && merchant.longitude) {
        const mLat = Number(merchant.latitude);
        const mLng = Number(merchant.longitude);
        const cLat = dto.customerLat;
        const cLng = dto.customerLng;

        const R = 6371; // Bán kính Trái Đất (km)
        const dLat = ((cLat - mLat) * Math.PI) / 180;
        const dLon = ((cLng - mLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((mLat * Math.PI) / 180) *
            Math.cos((cLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = Math.round(R * c * 10) / 10; // Làm tròn 1 chữ số thập phân
      }
    }

    // Quy tắc tính phí theo Business Rule BR-13:
    // - Dưới 2 km: Cố định 15.000 VNĐ
    // - Từ 2 km đến 5 km: 15.000 + 5.000 VNĐ / mỗi km vượt
    // - Trên 5 km: 30.000 + 7.000 VNĐ / mỗi km vượt
    let shippingFee = 15000;
    if (distanceKm > 5) {
      const extraKm = Math.ceil(distanceKm - 5);
      shippingFee = 30000 + extraKm * 7000;
    } else if (distanceKm > 2) {
      const extraKm = Math.ceil(distanceKm - 2);
      shippingFee = 15000 + extraKm * 5000;
    }

    const estimatedDurationMinutes = Math.max(15, Math.round(15 + distanceKm * 3));

    return {
      distanceKm,
      shippingFee,
      estimatedDurationMinutes,
    };
  }

  /**
   * U022: Đặt lại đơn hàng cũ (Reorder - Tự động tải lại các món vào giỏ hàng)
   */
  async reorder(user: AuthenticatedUser, orderId: string): Promise<{
    success: boolean;
    message: string;
    cartId: string;
    merchantId: string;
    itemCount: number;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { toppings: true },
        },
        merchant: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần đặt lại');
    }

    if (order.userId !== user.id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Bạn không có quyền đặt lại đơn hàng này');
    }

    if (!order.merchant || !order.merchant.isActive) {
      throw new BadRequestException('Nhà hàng này hiện không còn hoạt động để đặt lại món');
    }

    // 1. Tìm hoặc tạo giỏ hàng cho người dùng
    const cart = await this.prisma.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    // 2. Làm sạch giỏ hàng cũ nếu đang chứa món từ quán khác (Đảm bảo single-restaurant rule BR-12)
    const existingItems = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { menuItem: true },
    });

    if (existingItems.length > 0 && existingItems[0].menuItem.merchantId !== order.merchantId) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    // 3. Sao chép các món từ đơn hàng cũ vào giỏ
    let addedCount = 0;
    for (const item of order.items) {
      if (!item.menuItemId) continue;

      // Kiểm tra món còn tồn tại và sẵn sàng bán không
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (menuItem && menuItem.isAvailable) {
        const cartItem = await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            note: item.note,
          },
        });

        // Bổ sung toppings tương ứng nếu có
        for (const topping of item.toppings) {
          // Tìm topping tương ứng
          const existingTopping = await this.prisma.topping.findFirst({
            where: {
              merchantId: order.merchantId,
              name: topping.toppingName,
              isAvailable: true,
            },
          });

          if (existingTopping) {
            await this.prisma.cartItemTopping.create({
              data: {
                cartItemId: cartItem.id,
                toppingId: existingTopping.id,
              },
            });
          }
        }
        addedCount++;
      }
    }

    return {
      success: true,
      message: `Đã sao chép thành công ${addedCount} món ăn vào giỏ hàng của bạn.`,
      cartId: cart.id,
      merchantId: order.merchantId,
      itemCount: addedCount,
    };
  }
}
