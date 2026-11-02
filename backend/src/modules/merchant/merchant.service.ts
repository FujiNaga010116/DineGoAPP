import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MerchantStatus, Role } from '../../common/enums/index.js';
import { generateSlug } from '../../common/utils/slug.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { ApproveMerchantDto } from './dto/approve-merchant.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { CreateMerchantDto } from './dto/create-merchant.dto.js';
import { CreateToppingDto } from './dto/create-topping.dto.js';
import { QueryMerchantDto } from './dto/query-merchant.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';
import { UpdateMerchantDto } from './dto/update-merchant.dto.js';
import { UpdateToppingDto } from './dto/update-topping.dto.js';

@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // 1. MERCHANT PROFILE & APPROVAL
  // ============================================================================

  async createMerchant(ownerId: string, dto: CreateMerchantDto) {
    let slug = generateSlug(dto.name);

    // Collision avoidance: if slug exists, append random 4-char suffix
    const existingSlug = await this.prisma.merchant.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    // Create merchant with initial PENDING status (requires Admin review)
    const merchant = await this.prisma.merchant.create({
      data: {
        ownerId,
        name: dto.name,
        slug,
        description: dto.description || null,
        address: dto.address,
        phoneNumber: dto.phoneNumber,
        latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : null,
        longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : null,
        openingTime: dto.openingTime || null,
        closingTime: dto.closingTime || null,
        deliveryType: dto.deliveryType,
        logoUrl: dto.logoUrl || null,
        coverUrl: dto.coverUrl || null,
        status: MerchantStatus.PENDING,
      },
    });

    // Ensure user has MERCHANT role
    const hasMerchantRole = await this.prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId: ownerId,
          role: Role.MERCHANT,
        },
      },
    });

    if (!hasMerchantRole) {
      await this.prisma.userRole.create({
        data: {
          userId: ownerId,
          role: Role.MERCHANT,
        },
      });
    }

    return merchant;
  }

  async getMerchants(query: QueryMerchantDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.MerchantWhereInput = {
      status: MerchantStatus.APPROVED,
      isActive: true,
    };

    if (query.deliveryType) {
      where.deliveryType = query.deliveryType;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { address: { contains: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rating: 'desc' },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMyMerchants(ownerId: string) {
    return this.prisma.merchant.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMerchantById(id: string, currentUser?: AuthenticatedUser) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Không tìm thấy nhà hàng');
    }

    // If not approved, only Owner or Admin can view
    if (merchant.status !== MerchantStatus.APPROVED) {
      const isOwner = currentUser?.id === merchant.ownerId;
      const isAdmin = currentUser?.roles?.includes(Role.ADMIN);

      if (!isOwner && !isAdmin) {
        throw new NotFoundException('Không tìm thấy nhà hàng hoặc nhà hàng chưa được phê duyệt');
      }
    }

    return merchant;
  }

  async updateMerchant(
    id: string,
    ownerId: string,
    isAdmin: boolean,
    dto: UpdateMerchantDto,
  ) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });

    if (!merchant) {
      throw new NotFoundException('Không tìm thấy nhà hàng');
    }

    if (!isAdmin && merchant.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa thông tin nhà hàng này');
    }

    // Preserve existing slug to prevent breaking published URLs
    return this.prisma.merchant.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        phoneNumber: dto.phoneNumber,
        latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : undefined,
        longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : undefined,
        openingTime: dto.openingTime,
        closingTime: dto.closingTime,
        deliveryType: dto.deliveryType,
        isOpen: dto.isOpen,
        isActive: dto.isActive,
        logoUrl: dto.logoUrl,
        coverUrl: dto.coverUrl,
      },
    });
  }

  async approveMerchant(id: string, dto: ApproveMerchantDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });

    if (!merchant) {
      throw new NotFoundException('Không tìm thấy nhà hàng');
    }

    return this.prisma.merchant.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }

  // ============================================================================
  // 2. CATEGORY MANAGEMENT
  // ============================================================================

  async createCategory(
    merchantId: string,
    ownerId: string,
    isAdmin: boolean,
    dto: CreateCategoryDto,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    return this.prisma.category.create({
      data: {
        merchantId,
        name: dto.name,
        description: dto.description || null,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async getCategories(merchantId: string) {
    return this.prisma.category.findMany({
      where: { merchantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async updateCategory(
    merchantId: string,
    categoryId: string,
    ownerId: string,
    isAdmin: boolean,
    dto: UpdateCategoryDto,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.merchantId !== merchantId) {
      throw new NotFoundException('Không tìm thấy danh mục món thuộc nhà hàng này');
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async deleteCategory(
    merchantId: string,
    categoryId: string,
    ownerId: string,
    isAdmin: boolean,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { menuItems: true },
        },
      },
    });

    if (!category || category.merchantId !== merchantId) {
      throw new NotFoundException('Không tìm thấy danh mục món thuộc nhà hàng này');
    }

    // Safety constraint: Prevent deleting category with active menu items
    if (category._count.menuItems > 0) {
      throw new BadRequestException(
        'Không thể xóa danh mục đang có món ăn. Vui lòng chuyển hoặc xóa món ăn trước.',
      );
    }

    return this.prisma.category.delete({
      where: { id: categoryId },
    });
  }

  // ============================================================================
  // 3. MENU ITEM MANAGEMENT
  // ============================================================================

  async createMenuItem(
    merchantId: string,
    ownerId: string,
    isAdmin: boolean,
    dto: CreateMenuItemDto,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    // Verify category belongs to this merchant
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || category.merchantId !== merchantId) {
      throw new BadRequestException('Danh mục được chỉ định không thuộc về nhà hàng này');
    }

    let slug = generateSlug(dto.name);
    const existingItem = await this.prisma.menuItem.findFirst({
      where: { merchantId, slug },
    });
    if (existingItem) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    return this.prisma.menuItem.create({
      data: {
        merchantId,
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
        basePrice: new Prisma.Decimal(dto.basePrice),
        isAvailable: dto.isAvailable ?? true,
        isActive: dto.isActive ?? true,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async getMenuItems(
    merchantId: string,
    categoryId?: string,
    includeInactive: boolean = false,
  ) {
    const where: Prisma.MenuItemWhereInput = {
      merchantId,
      ...(includeInactive ? {} : { isActive: true }),
      ...(categoryId ? { categoryId } : {}),
    };

    return this.prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        menuItemToppings: {
          include: {
            topping: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getMenuItemById(merchantId: string, menuItemId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, merchantId },
      include: {
        category: true,
        menuItemToppings: {
          include: {
            topping: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy món ăn');
    }

    return item;
  }

  async updateMenuItem(
    merchantId: string,
    menuItemId: string,
    ownerId: string,
    isAdmin: boolean,
    dto: UpdateMenuItemDto,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    const item = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, merchantId },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy món ăn');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || category.merchantId !== merchantId) {
        throw new BadRequestException('Danh mục không thuộc về nhà hàng này');
      }
    }

    return this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        basePrice: dto.basePrice !== undefined ? new Prisma.Decimal(dto.basePrice) : undefined,
        isAvailable: dto.isAvailable,
        isActive: dto.isActive,
        displayOrder: dto.displayOrder,
      },
    });
  }

  async deleteMenuItem(
    merchantId: string,
    menuItemId: string,
    ownerId: string,
    isAdmin: boolean,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    const item = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, merchantId },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy món ăn');
    }

    // Soft delete to protect future order snapshots
    return this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: { isActive: false },
    });
  }

  // ============================================================================
  // 4. TOPPING MANAGEMENT & LINKING
  // ============================================================================

  async createTopping(
    merchantId: string,
    ownerId: string,
    isAdmin: boolean,
    dto: CreateToppingDto,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    return this.prisma.topping.create({
      data: {
        merchantId,
        name: dto.name,
        price: new Prisma.Decimal(dto.price),
        isAvailable: dto.isAvailable ?? true,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getToppings(merchantId: string) {
    return this.prisma.topping.findMany({
      where: { merchantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTopping(
    merchantId: string,
    toppingId: string,
    ownerId: string,
    isAdmin: boolean,
    dto: UpdateToppingDto,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    const topping = await this.prisma.topping.findFirst({
      where: { id: toppingId, merchantId },
    });

    if (!topping) {
      throw new NotFoundException('Không tìm thấy topping thuộc nhà hàng này');
    }

    return this.prisma.topping.update({
      where: { id: toppingId },
      data: {
        name: dto.name,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        isAvailable: dto.isAvailable,
        isActive: dto.isActive,
      },
    });
  }

  async deleteTopping(
    merchantId: string,
    toppingId: string,
    ownerId: string,
    isAdmin: boolean,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    const topping = await this.prisma.topping.findFirst({
      where: { id: toppingId, merchantId },
    });

    if (!topping) {
      throw new NotFoundException('Không tìm thấy topping');
    }

    return this.prisma.topping.update({
      where: { id: toppingId },
      data: { isActive: false },
    });
  }

  async linkToppingToMenuItem(
    merchantId: string,
    menuItemId: string,
    toppingId: string,
    ownerId: string,
    isAdmin: boolean,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    // Verify menuItem belongs to this merchant
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, merchantId },
    });
    if (!menuItem) {
      throw new NotFoundException('Không tìm thấy món ăn thuộc nhà hàng này');
    }

    // Verify topping belongs to this merchant (prevent cross-merchant links)
    const topping = await this.prisma.topping.findFirst({
      where: { id: toppingId, merchantId },
    });
    if (!topping) {
      throw new NotFoundException('Không tìm thấy topping thuộc nhà hàng này');
    }

    // Check if already linked
    const existing = await this.prisma.menuItemTopping.findUnique({
      where: {
        menuItemId_toppingId: {
          menuItemId,
          toppingId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.menuItemTopping.create({
      data: {
        menuItemId,
        toppingId,
      },
      include: {
        topping: true,
      },
    });
  }

  async unlinkToppingFromMenuItem(
    merchantId: string,
    menuItemId: string,
    toppingId: string,
    ownerId: string,
    isAdmin: boolean,
  ) {
    await this.verifyMerchantOwnership(merchantId, ownerId, isAdmin);

    const existing = await this.prisma.menuItemTopping.findUnique({
      where: {
        menuItemId_toppingId: {
          menuItemId,
          toppingId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Liên kết giữa món ăn và topping không tồn tại');
    }

    await this.prisma.menuItemTopping.delete({
      where: {
        menuItemId_toppingId: {
          menuItemId,
          toppingId,
        },
      },
    });

    return { success: true, message: 'Đã hủy liên kết topping khỏi món ăn' };
  }

  // ============================================================================
  // HELPER: VERIFY OWNERSHIP (PREVENT IDOR)
  // ============================================================================

  private async verifyMerchantOwnership(
    merchantId: string,
    userId: string,
    isAdmin: boolean,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Không tìm thấy nhà hàng');
    }

    if (!isAdmin && merchant.ownerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền quản lý nhà hàng này');
    }

    return merchant;
  }
}
