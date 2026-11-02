import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../common/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
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
import { MerchantService } from './merchant.service.js';

@ApiTags('Merchant & Menu')
@Controller('merchants')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  // ============================================================================
  // 1. MERCHANT PROFILE & APPROVAL
  // ============================================================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo hồ sơ nhà hàng mới',
    description: 'Tài khoản đăng nhập tạo quán với trạng thái PENDING (chờ duyệt).',
  })
  @ApiResponse({ status: 201, description: 'Tạo hồ sơ nhà hàng thành công' })
  createMerchant(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMerchantDto,
  ) {
    return this.merchantService.createMerchant(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Danh sách nhà hàng công khai (Đã được duyệt)',
    description: 'Lấy danh sách các nhà hàng đang hoạt động, hỗ trợ phân trang và tìm kiếm.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách nhà hàng phân trang' })
  getMerchants(@Query() query: QueryMerchantDto) {
    return this.merchantService.getMerchants(query);
  }

  @Get('my-merchants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách nhà hàng của tôi',
    description: 'Lấy tất cả nhà hàng do tài khoản hiện tại sở hữu.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách nhà hàng của người dùng' })
  getMyMerchants(@CurrentUser('id') userId: string) {
    return this.merchantService.getMyMerchants(userId);
  }

  @Get(':merchantId')
  @ApiOperation({
    summary: 'Xem chi tiết thông tin nhà hàng',
    description: 'Lấy thông tin chi tiết nhà hàng và danh mục món.',
  })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết nhà hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà hàng' })
  getMerchantById(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ) {
    return this.merchantService.getMerchantById(merchantId, currentUser);
  }

  @Patch(':merchantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật thông tin nhà hàng',
    description: 'Chỉ chủ sở hữu quán hoặc Quản trị viên mới có quyền cập nhật.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thông tin thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa' })
  updateMerchant(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMerchantDto,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.updateMerchant(merchantId, user.id, isAdmin, dto);
  }

  @Patch(':merchantId/approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Phê duyệt hoặc từ chối nhà hàng (Dành riêng cho ADMIN)',
    description: 'Cập nhật trạng thái nhà hàng thành APPROVED hoặc REJECTED.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái duyệt thành công' })
  @ApiResponse({ status: 403, description: 'Yêu cầu quyền Quản trị viên (ADMIN)' })
  approveMerchant(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Body() dto: ApproveMerchantDto,
  ) {
    return this.merchantService.approveMerchant(merchantId, dto);
  }

  // ============================================================================
  // 2. CATEGORY ENDPOINTS
  // ============================================================================

  @Post(':merchantId/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo danh mục món ăn mới cho nhà hàng' })
  createCategory(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.createCategory(merchantId, user.id, isAdmin, dto);
  }

  @Get(':merchantId/categories')
  @ApiOperation({ summary: 'Lấy danh mục món ăn của nhà hàng' })
  getCategories(@Param('merchantId', ParseUUIDPipe) merchantId: string) {
    return this.merchantService.getCategories(merchantId);
  }

  @Patch(':merchantId/categories/:categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật danh mục món ăn' })
  updateCategory(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCategoryDto,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.updateCategory(merchantId, categoryId, user.id, isAdmin, dto);
  }

  @Delete(':merchantId/categories/:categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa danh mục món ăn (Chỉ khi không có món)' })
  deleteCategory(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.deleteCategory(merchantId, categoryId, user.id, isAdmin);
  }

  // ============================================================================
  // 3. MENU ITEM ENDPOINTS
  // ============================================================================

  @Post(':merchantId/menu-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo món ăn mới cho nhà hàng' })
  createMenuItem(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMenuItemDto,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.createMenuItem(merchantId, user.id, isAdmin, dto);
  }

  @Get(':merchantId/menu-items')
  @ApiOperation({ summary: 'Lấy danh sách món ăn của nhà hàng' })
  getMenuItems(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.merchantService.getMenuItems(merchantId, categoryId);
  }

  @Get(':merchantId/menu-items/:menuItemId')
  @ApiOperation({ summary: 'Chi tiết món ăn và danh sách topping' })
  getMenuItemById(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
  ) {
    return this.merchantService.getMenuItemById(merchantId, menuItemId);
  }

  @Patch(':merchantId/menu-items/:menuItemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin món ăn' })
  updateMenuItem(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMenuItemDto,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.updateMenuItem(merchantId, menuItemId, user.id, isAdmin, dto);
  }

  @Delete(':merchantId/menu-items/:menuItemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ẩn món ăn khỏi menu (Soft-delete)' })
  deleteMenuItem(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.deleteMenuItem(merchantId, menuItemId, user.id, isAdmin);
  }

  // ============================================================================
  // 4. TOPPING ENDPOINTS & LINKING
  // ============================================================================

  @Post(':merchantId/toppings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo topping mới cho nhà hàng' })
  createTopping(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateToppingDto,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.createTopping(merchantId, user.id, isAdmin, dto);
  }

  @Get(':merchantId/toppings')
  @ApiOperation({ summary: 'Lấy danh sách topping của nhà hàng' })
  getToppings(@Param('merchantId', ParseUUIDPipe) merchantId: string) {
    return this.merchantService.getToppings(merchantId);
  }

  @Patch(':merchantId/toppings/:toppingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin topping' })
  updateTopping(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('toppingId', ParseUUIDPipe) toppingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateToppingDto,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.updateTopping(merchantId, toppingId, user.id, isAdmin, dto);
  }

  @Delete(':merchantId/toppings/:toppingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ẩn topping khỏi danh sách bán' })
  deleteTopping(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('toppingId', ParseUUIDPipe) toppingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.deleteTopping(merchantId, toppingId, user.id, isAdmin);
  }

  @Post(':merchantId/menu-items/:menuItemId/toppings/:toppingId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gán topping vào món ăn' })
  linkTopping(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Param('toppingId', ParseUUIDPipe) toppingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.linkToppingToMenuItem(
      merchantId,
      menuItemId,
      toppingId,
      user.id,
      isAdmin,
    );
  }

  @Delete(':merchantId/menu-items/:menuItemId/toppings/:toppingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hủy gán topping khỏi món ăn' })
  unlinkTopping(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Param('toppingId', ParseUUIDPipe) toppingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isAdmin = user.roles.includes(Role.ADMIN);
    return this.merchantService.unlinkToppingFromMenuItem(
      merchantId,
      menuItemId,
      toppingId,
      user.id,
      isAdmin,
    );
  }
}
