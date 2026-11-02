// ==============================================================================
// DineGo Backend — Payment Controller (Phase 6: MoMo Payment Engine)
// ==============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { CreateMomoPaymentDto } from './dto/create-momo-payment.dto.js';
import { MomoIpnDto } from './dto/momo-ipn.dto.js';
import { QueryPaymentDto } from './dto/query-payment.dto.js';
import type {
  CreateMomoPaymentResponse,
  PaymentListResponse,
  PaymentResponse,
} from './interfaces/payment-response.interface.js';
import { PaymentService } from './payment.service.js';

@ApiTags('Payment Engine')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ----------------------------------------------------------------------------
  // 1. Tạo thanh toán MoMo
  // ----------------------------------------------------------------------------
  @Post('momo/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tạo liên kết thanh toán MoMo cho đơn hàng',
    description:
      'Tạo yêu cầu thanh toán MoMo v2 với chữ ký HMAC-SHA256, hỗ trợ Idempotency và trả về URL thanh toán (MoMo PayUrl / QR code / Deeplink).',
  })
  @ApiResponse({
    status: 200,
    description: 'Khởi tạo link thanh toán MoMo thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Trạng thái đơn hàng không hợp lệ hoặc đã thanh toán thành công.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền thanh toán cho đơn hàng của người dùng khác.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn hàng.',
  })
  async createMomoPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMomoPaymentDto,
  ): Promise<CreateMomoPaymentResponse> {
    return this.paymentService.createMomoPayment(user, dto);
  }

  // ----------------------------------------------------------------------------
  // 2. Webhook IPN từ MoMo Gateway (Public Webhook, xác thực bằng HMAC-SHA256)
  // ----------------------------------------------------------------------------
  @Post('momo/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook nhận kết quả thanh toán tức thì (IPN) từ MoMo',
    description:
      'Endpoint công khai dành riêng cho MoMo gọi về. Xác thực chữ ký HMAC-SHA256, đối soát số tiền và cập nhật trạng thái đơn hàng sang CONFIRMED một cách nguyên tử.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xử lý IPN thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Chữ ký không hợp lệ hoặc số tiền thanh toán không khớp.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn hàng / giao dịch.',
  })
  async handleMomoIpn(
    @Body() ipnDto: MomoIpnDto,
  ): Promise<{ message: string; resultCode: number }> {
    return this.paymentService.processMomoIpn(ipnDto);
  }

  // ----------------------------------------------------------------------------
  // 3. Tra cứu thanh toán theo Order ID
  // ----------------------------------------------------------------------------
  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Tra cứu trạng thái thanh toán của một đơn hàng',
    description:
      'Lấy thông tin chi tiết thanh toán của đơn hàng theo Order UUID. Phân quyền: Owner hoặc Admin.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID đơn hàng (UUID v4)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thanh toán thành công.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thông tin thanh toán.',
  })
  async getPaymentByOrderId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<PaymentResponse> {
    return this.paymentService.getPaymentByOrderId(user, orderId);
  }

  // ----------------------------------------------------------------------------
  // 4. Danh sách lịch sử giao dịch thanh toán
  // ----------------------------------------------------------------------------
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Lấy danh sách các giao dịch thanh toán (có phân trang)',
    description:
      'Customer chỉ thấy giao dịch của mình. Merchant thấy giao dịch của quán mình. Admin thấy tất cả.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách giao dịch thành công.',
  })
  async getPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryPaymentDto,
  ): Promise<PaymentListResponse> {
    return this.paymentService.getPayments(user, query);
  }
}
