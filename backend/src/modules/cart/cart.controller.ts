// ==============================================================================
// DineGo Backend — Cart Controller (Phase 5.1)
// Architecture: RESTful Controller with JWT Authentication
// ==============================================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CartService } from './cart.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import type { CartResponse } from './interfaces/cart-response.interface.js';

@ApiTags('Cart Engine')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Xem chi tiết giỏ hàng hiện tại của người dùng',
    description:
      'Lấy danh sách món ăn, toppings kèm theo và tổng tiền tạm tính được tính toán trực tiếp từ database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin giỏ hàng thành công.',
  })
  async getCart(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponse> {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Thêm món ăn vào giỏ hàng',
    description:
      'Thêm món ăn với số lượng, ghi chú và các topping được chọn. Tự động kiểm tra trạng thái món, trạng thái quán và đảm bảo giỏ chỉ chứa món của 1 quán.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thêm món vào giỏ hàng thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Món ăn hoặc topping không hợp lệ, hoặc quán đang đóng cửa.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy món ăn.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Giỏ hàng đang có món từ nhà hàng khác (trả về conflict và yêu cầu xác nhận clearExisting).',
  })
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddToCartDto,
  ): Promise<CartResponse> {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({
    summary: 'Cập nhật số lượng của một món trong giỏ hàng',
    description: 'Thay đổi số lượng (1 - 99) cho một món cụ thể trong giỏ.',
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID của CartItem cần cập nhật',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật số lượng thành công.',
  })
  @ApiResponse({
    status: 404,
    description: 'Món ăn không tồn tại trong giỏ hàng.',
  })
  async updateItemQuantity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    return this.cartService.updateItemQuantity(user.id, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({
    summary: 'Xóa một món khỏi giỏ hàng',
    description: 'Xóa món cụ thể theo cartItemId khỏi giỏ hàng của người dùng.',
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID của CartItem cần xóa',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa món thành công.',
  })
  @ApiResponse({
    status: 404,
    description: 'Món không tồn tại trong giỏ hàng.',
  })
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ): Promise<CartResponse> {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Xóa toàn bộ giỏ hàng',
    description: 'Làm rỗng giỏ hàng và đặt lại trạng thái ban đầu.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đã xóa toàn bộ giỏ hàng thành công.',
  })
  async clearCart(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponse> {
    return this.cartService.clearCart(user.id);
  }
}
