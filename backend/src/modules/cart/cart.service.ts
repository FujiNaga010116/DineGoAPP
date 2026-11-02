// ==============================================================================
// DineGo Backend — Cart Service (Phase 5.1)
// Architecture: Clean Architecture / Modular Monolith
// Database: Microsoft SQL Server via Prisma ORM
// ==============================================================================

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MerchantStatus } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import type {
  CartItemResponse,
  CartItemToppingResponse,
  CartMerchantResponse,
  CartResponse,
} from './interfaces/cart-response.interface.js';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Sắp xếp mảng ID để so sánh tập hợp toppings trùng khớp
   */
  private sortIds(ids: string[]): string {
    return [...ids].sort().join(',');
  }

  /**
   * Lấy giỏ hàng của người dùng hiện tại
   * Luôn tính toán giá tiền (subtotal) phía backend từ database, không tin client
   */
  async getCart(userId: string): Promise<CartResponse> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        merchant: true,
        items: {
          include: {
            menuItem: true,
            toppings: {
              include: {
                topping: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const cartItems = cart?.items ?? [];
    if (!cart || cartItems.length === 0) {
      return {
        id: cart?.id ?? null,
        merchant: null,
        items: [],
        summary: {
          totalItems: 0,
          subtotal: 0,
        },
      };
    }

    let merchantResponse: CartMerchantResponse | null = null;
    if (cart.merchant) {
      merchantResponse = {
        id: cart.merchant.id,
        name: cart.merchant.name,
        slug: cart.merchant.slug,
        address: cart.merchant.address,
        phoneNumber: cart.merchant.phoneNumber,
        logoUrl: cart.merchant.logoUrl,
        isOpen: cart.merchant.isOpen,
        isActive: cart.merchant.isActive,
      };
    }

    let totalItems = 0;
    let cartSubtotal = 0;

    const itemsResponse: CartItemResponse[] = cartItems.map((item) => {
      const basePrice = item.menuItem ? Number(item.menuItem.basePrice) : 0;

      let toppingsSum = 0;
      const toppingsList = item.toppings ?? [];
      const toppingsResponse: CartItemToppingResponse[] = toppingsList.map(
        (cit) => {
          const toppingPrice = cit.topping ? Number(cit.topping.price) : 0;
          toppingsSum += toppingPrice;
          return {
            id: cit.id,
            toppingId: cit.topping?.id ?? cit.toppingId,
            name: cit.topping?.name ?? '',
            price: toppingPrice,
            isAvailable: cit.topping?.isAvailable ?? true,
            isActive: cit.topping?.isActive ?? true,
          };
        },
      );

      const itemUnitPrice = Math.round((basePrice + toppingsSum) * 100) / 100;
      const itemSubtotal = Math.round(itemUnitPrice * item.quantity * 100) / 100;

      totalItems += item.quantity;
      cartSubtotal += itemSubtotal;

      return {
        id: item.id,
        menuItemId: item.menuItem?.id ?? item.menuItemId,
        name: item.menuItem?.name ?? '',
        slug: item.menuItem?.slug ?? '',
        imageUrl: item.menuItem?.imageUrl ?? null,
        basePrice,
        quantity: item.quantity,
        note: item.note,
        isAvailable: item.menuItem?.isAvailable ?? true,
        isActive: item.menuItem?.isActive ?? true,
        toppings: toppingsResponse,
        itemUnitPrice,
        itemSubtotal,
      };
    });

    return {
      id: cart.id,
      merchant: merchantResponse,
      items: itemsResponse,
      summary: {
        totalItems,
        subtotal: Math.round(cartSubtotal * 100) / 100,
      },
    };
  }

  /**
   * Thêm món ăn vào giỏ hàng
   * Đảm bảo tính toàn vẹn:
   * - Món tồn tại, đang bán, merchant đang hoạt động
   * - Giỏ hàng chỉ thuộc về 1 quán (single merchant rule)
   * - Topping hợp lệ thuộc món
   * - Tự động cộng dồn nếu cùng món + topping + note
   */
  async addItem(userId: string, dto: AddToCartDto): Promise<CartResponse> {
    const toppingIds = dto.toppingIds ?? [];

    // 1. Kiểm tra MenuItem và Merchant trong DB
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
      include: {
        merchant: true,
        menuItemToppings: {
          include: {
            topping: true,
          },
        },
      },
    });

    if (!menuItem) {
      throw new NotFoundException('Món ăn không tồn tại trên hệ thống');
    }

    if (!menuItem.isActive || !menuItem.isAvailable) {
      throw new BadRequestException(
        'Món ăn hiện tại không khả dụng hoặc đã tạm ngừng bán',
      );
    }

    const { merchant } = menuItem;
    if (
      merchant.status !== MerchantStatus.APPROVED ||
      !merchant.isActive
    ) {
      throw new BadRequestException(
        'Nhà hàng hiện đang tạm ngừng hoạt động hoặc chưa được duyệt',
      );
    }

    if (!merchant.isOpen) {
      throw new BadRequestException(
        'Nhà hàng hiện tại đang đóng cửa, vui lòng quay lại sau',
      );
    }

    // 2. Kiểm tra Topping hợp lệ thuộc món ăn
    if (toppingIds.length > 0) {
      const allowedToppingMap = new Map<string, { isActive: boolean; isAvailable: boolean }>();
      for (const mit of menuItem.menuItemToppings) {
        allowedToppingMap.set(mit.toppingId, {
          isActive: mit.topping.isActive,
          isAvailable: mit.topping.isAvailable,
        });
      }

      for (const tId of toppingIds) {
        const toppingMeta = allowedToppingMap.get(tId);
        if (!toppingMeta) {
          throw new BadRequestException(
            'Một hoặc nhiều topping không thuộc về món ăn này',
          );
        }
        if (!toppingMeta.isActive || !toppingMeta.isAvailable) {
          throw new BadRequestException(
            'Một hoặc nhiều topping đã tạm ngừng phục vụ',
          );
        }
      }
    }

    // 3. Thực hiện trong Database Transaction để đảm bảo tính nhất quán (ACID)
    await this.prisma.$transaction(async (tx) => {
      // Tìm hoặc tạo giỏ hàng cho user
      let cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              toppings: true,
            },
          },
        },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            userId,
            merchantId: merchant.id,
          },
          include: {
            items: {
              include: {
                toppings: true,
              },
            },
          },
        });
      }

      // Kiểm tra quy tắc 1 merchant cho 1 giỏ hàng
      if (cart.merchantId && cart.merchantId !== merchant.id && cart.items.length > 0) {
        if (!dto.clearExisting) {
          const currentMerchant = await tx.merchant.findUnique({
            where: { id: cart.merchantId },
            select: { name: true },
          });
          const merchantName = currentMerchant?.name || 'nhà hàng khác';

          throw new ConflictException({
            message: `Giỏ hàng của bạn đang có món từ "${merchantName}". Bạn có muốn xóa giỏ cũ để thêm món từ "${merchant.name}" không?`,
            differentMerchant: true,
            currentMerchantId: cart.merchantId,
            newMerchantId: merchant.id,
          });
        }

        // Người dùng đã đồng ý xóa giỏ cũ để chọn quán mới
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        await tx.cart.update({
          where: { id: cart.id },
          data: { merchantId: merchant.id },
        });

        cart.items = [];
        cart.merchantId = merchant.id;
      } else if (!cart.merchantId) {
        await tx.cart.update({
          where: { id: cart.id },
          data: { merchantId: merchant.id },
        });
        cart.merchantId = merchant.id;
      }

      // Kiểm tra xem món kèm cùng danh sách topping và cùng note đã có trong giỏ chưa
      const newToppingSignature = this.sortIds(toppingIds);
      const normalizedNote = dto.note?.trim() || null;

      const existingItem = cart.items.find((item) => {
        if (item.menuItemId !== dto.menuItemId) return false;
        const itemNote = item.note?.trim() || null;
        if (itemNote !== normalizedNote) return false;

        const itemToppingSignature = this.sortIds(
          item.toppings.map((t) => t.toppingId),
        );
        return itemToppingSignature === newToppingSignature;
      });

      if (existingItem) {
        const updatedQuantity = existingItem.quantity + dto.quantity;
        if (updatedQuantity > 99) {
          throw new BadRequestException(
            'Số lượng món này trong giỏ hàng vượt quá giới hạn tối đa (99)',
          );
        }

        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: updatedQuantity },
        });
      } else {
        const createdItem = await tx.cartItem.create({
          data: {
            cartId: cart.id,
            menuItemId: dto.menuItemId,
            quantity: dto.quantity,
            note: normalizedNote,
          },
        });

        if (toppingIds.length > 0) {
          for (const toppingId of toppingIds) {
            await tx.cartItemTopping.create({
              data: {
                cartItemId: createdItem.id,
                toppingId,
              },
            });
          }
        }
      }
    });

    return this.getCart(userId);
  }

  /**
   * Cập nhật số lượng của một món trong giỏ hàng
   */
  async updateItemQuantity(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Món ăn không tồn tại trong giỏ hàng của bạn');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  /**
   * Xóa 1 món khỏi giỏ hàng
   */
  async removeItem(userId: string, itemId: string): Promise<CartResponse> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Món ăn không tồn tại trong giỏ hàng của bạn');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.delete({
        where: { id: itemId },
      });

      const remainingCount = await tx.cartItem.count({
        where: { cartId: cartItem.cartId },
      });

      if (remainingCount === 0) {
        await tx.cart.update({
          where: { id: cartItem.cartId },
          data: { merchantId: null },
        });
      }
    });

    return this.getCart(userId);
  }

  /**
   * Xóa toàn bộ giỏ hàng
   */
  async clearCart(userId: string): Promise<CartResponse> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
        await tx.cart.update({
          where: { id: cart.id },
          data: { merchantId: null },
        });
      });
    }

    return this.getCart(userId);
  }
}
