// ==============================================================================
// DineGo Backend — Promotion Controller (Phase 5.2)
// Architecture: RESTful Controller with RBAC & JWT Guards
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
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { QueryPromotionDto } from './dto/query-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { ValidateVoucherDto } from './dto/validate-voucher.dto.js';
import type {
  PromotionResponse,
  VoucherValidationResult,
} from './interfaces/promotion-response.interface.js';
import { PromotionService } from './promotion.service.js';

@ApiTags('Promotion Engine')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kiểm tra mã voucher với giỏ hàng hiện tại',
    description:
      'Xác thực tính hợp lệ của mã voucher dựa trên các món ăn trong giỏ hàng hiện tại của người dùng và tính toán số tiền giảm giá chính xác phía backend.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Kết quả kiểm tra voucher (kèm isValid, số tiền giảm và lý do từ chối nếu có).',
  })
  async validateVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValidateVoucherDto,
  ): Promise<VoucherValidationResult> {
    return this.promotionService.validateVoucherForCart(user.id, dto.code);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MERCHANT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Tạo mới chương trình khuyến mãi / mã voucher',
    description:
      'Chỉ dành cho ADMIN (tạo toàn sàn hoặc theo quán) hoặc MERCHANT (tạo voucher cho quán của mình).',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo mã khuyến mãi thành công.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không đủ quyền hạn.',
  })
  @ApiResponse({
    status: 409,
    description: 'Mã voucher đã tồn tại.',
  })
  async createPromotion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePromotionDto,
  ): Promise<PromotionResponse> {
    return this.promotionService.createPromotion(user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách mã khuyến mãi',
    description: 'Xem danh sách khuyến mãi có hỗ trợ lọc theo quán, phạm vi và trạng thái.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách khuyến mãi phân trang.',
  })
  async getPromotions(@Query() query: QueryPromotionDto): Promise<{
    items: PromotionResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.promotionService.getPromotions(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết một mã khuyến mãi',
  })
  @ApiParam({ name: 'id', description: 'ID khuyến mãi UUID' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết khuyến mãi.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy khuyến mãi.',
  })
  async getPromotionById(@Param('id') id: string): Promise<PromotionResponse> {
    return this.promotionService.getPromotionById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MERCHANT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cập nhật thông tin mã khuyến mãi',
    description: 'ADMIN cập nhật bất kỳ, MERCHANT chỉ cập nhật voucher của quán mình.',
  })
  @ApiParam({ name: 'id', description: 'ID khuyến mãi UUID' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật khuyến mãi thành công.',
  })
  async updatePromotion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<PromotionResponse> {
    return this.promotionService.updatePromotion(user, id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MERCHANT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Kích hoạt hoặc vô hiệu hóa mã khuyến mãi',
  })
  @ApiParam({ name: 'id', description: 'ID khuyến mãi UUID' })
  @ApiResponse({
    status: 200,
    description: 'Thay đổi trạng thái thành công.',
  })
  async toggleStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<PromotionResponse> {
    return this.promotionService.toggleActive(user, id, Boolean(isActive));
  }
}
