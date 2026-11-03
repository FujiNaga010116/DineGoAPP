// ==============================================================================
// DineGo Backend — Order Controller (Phase 5.3)
// ==============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { EstimateShippingDto } from './dto/estimate-shipping.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import type {
  OrderListResponse,
  OrderResponse,
} from './interfaces/order-response.interface.js';
import { OrderService } from './order.service.js';

@ApiTags('Order Engine')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo đơn hàng mới từ giỏ hàng hiện tại',
    description:
      'Chuyển giỏ hàng hiện tại thành đơn hàng, kiểm tra tính khả dụng của món/topping, tính discount, kiểm soát đồng thời voucher nguyên tử và làm sạch giỏ hàng.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo đơn hàng thành công, trả về thông tin chi tiết đơn hàng.',
  })
  @ApiResponse({
    status: 400,
    description: 'Giỏ hàng trống, món/topping không hợp lệ hoặc voucher không thỏa điều kiện.',
  })
  @ApiResponse({
    status: 409,
    description: 'Trùng lặp khóa idempotency với người dùng khác.',
  })
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    return this.orderService.createOrder(user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách đơn hàng',
    description:
      'Customer xem đơn của chính mình; Merchant xem đơn các quán mình sở hữu; Admin có quyền xem toàn hệ thống.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đơn hàng phân trang.',
  })
  async getOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryOrderDto,
  ): Promise<OrderListResponse> {
    return this.orderService.getOrders(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết một đơn hàng',
    description: 'Chỉ chủ đơn hàng, chủ quán nhận đơn hoặc Admin mới được phép truy cập.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết đơn hàng kèm các món và topping snapshot.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem đơn hàng này.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn hàng.',
  })
  async getOrderById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<OrderResponse> {
    return this.orderService.getOrderById(user, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Hủy đơn hàng',
    description:
      'Customer chỉ được hủy khi đơn ở trạng thái PENDING; Merchant được hủy khi PENDING hoặc CONFIRMED; Admin có toàn quyền hủy.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Hủy đơn hàng thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Trạng thái đơn hàng không cho phép hủy.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền hủy đơn hàng này.',
  })
  async cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    return this.orderService.cancelOrder(user, id, dto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật trạng thái đơn hàng (Dành cho Quán & Admin)',
    description:
      'Chuyển trạng thái đơn hàng theo luồng Finite State Machine: PENDING -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> COMPLETED.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái đơn hàng thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bước chuyển trạng thái không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền cập nhật trạng thái đơn này.',
  })
  async updateOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    return this.orderService.updateOrderStatus(user, id, dto);
  }

  @Post('estimate-shipping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U017: Ước tính phí giao hàng theo khoảng cách',
    description: 'Tính phí giao hàng tự động theo công thức bậc thang BR-13 hoặc tọa độ GPS.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin khoảng cách, thời gian dự kiến và phí giao hàng.',
  })
  async estimateShipping(@Body() dto: EstimateShippingDto) {
    return this.orderService.estimateShippingFee(dto);
  }

  @Post(':id/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U022: Đặt lại đơn hàng cũ (Reorder)',
    description: 'Tự động thêm lại toàn bộ món ăn và topping từ đơn hàng cũ vào giỏ hàng.',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng cũ cần đặt lại' })
  @ApiResponse({
    status: 200,
    description: 'Đã thêm thành công các món cũ vào giỏ hàng.',
  })
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.orderService.reorder(user, id);
  }
}
