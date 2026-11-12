// ==============================================================================
// DineGo Backend — Group Order Controller (Sprint 2 — U020 & U021)
// ==============================================================================

import {
  Body,
  Controller,
  Delete,
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
import { AddGroupItemDto } from './dto/add-group-item.dto.js';
import { BillSplitDto } from './dto/bill-split.dto.js';
import { CheckoutGroupOrderDto } from './dto/checkout-group-order.dto.js';
import { CreateGroupOrderDto } from './dto/create-group-order.dto.js';
import { JoinGroupOrderDto } from './dto/join-group-order.dto.js';
import { GroupOrderService } from './group-order.service.js';
import type { PublicAccountRecord } from './group-order.service.js';

@ApiTags('Group Order Engine (Sprint 2 — U020 & U021)')
@Controller('group-orders')
export class GroupOrderController {
  constructor(private readonly groupOrderService: GroupOrderService) {}

  @Get('live/accounts')
  @ApiOperation({ summary: 'Lấy danh sách tài khoản đồng bộ để mời vào đơn nhóm' })
  listLiveAccounts() {
    return this.groupOrderService.listPublicAccounts();
  }

  @Post('live/accounts/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đồng bộ danh mục tài khoản công khai cho đặt đơn nhóm' })
  syncLiveAccounts(@Body() body: { accounts?: PublicAccountRecord[] }) {
    return this.groupOrderService.syncPublicAccounts(body?.accounts || []);
  }

  @Get('live/rooms')
  @ApiOperation({ summary: 'Lấy danh sách phòng đặt nhóm đang hoạt động' })
  listLiveRooms() {
    return this.groupOrderService.listLiveRooms();
  }

  @Post('live/rooms')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lưu / cập nhật trạng thái phòng đặt nhóm' })
  upsertLiveRoom(@Body() body: Record<string, unknown>) {
    return this.groupOrderService.upsertLiveRoom(body);
  }

  @Delete('live/rooms/:roomCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa phòng đặt nhóm khỏi bộ nhớ đồng bộ' })
  deleteLiveRoom(@Param('roomCode') roomCode: string) {
    return this.groupOrderService.deleteLiveRoom(roomCode);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'U020: Tạo phòng đặt nhóm mới (Host)',
    description: 'Trưởng nhóm khởi tạo phòng đặt nhóm cho một nhà hàng và nhận mã phòng duy nhất.',
  })
  @ApiResponse({ status: 201, description: 'Tạo phòng đặt nhóm thành công.' })
  createRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGroupOrderDto,
  ) {
    return this.groupOrderService.createRoom(user, dto);
  }

  @Get(':roomCode')
  @ApiOperation({
    summary: 'U020: Xem chi tiết phòng đặt nhóm và giỏ chung',
    description: 'Lấy trạng thái phòng, danh sách thành viên và các món trong giỏ chung.',
  })
  @ApiParam({ name: 'roomCode', example: 'DG-A8F2', description: 'Mã phòng đặt nhóm' })
  getRoom(@Param('roomCode') roomCode: string) {
    return this.groupOrderService.getRoom(roomCode);
  }

  @Post(':roomCode/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U020: Tham gia vào phòng đặt nhóm',
    description: 'Thành viên tham gia vào phòng thông qua mã phòng hoặc link chia sẻ.',
  })
  @ApiParam({ name: 'roomCode', example: 'DG-A8F2', description: 'Mã phòng đặt nhóm' })
  joinRoom(
    @Param('roomCode') roomCode: string,
    @Body() dto: JoinGroupOrderDto,
  ) {
    return this.groupOrderService.joinRoom(roomCode, dto);
  }

  @Post(':roomCode/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'U021: Thêm món ăn vào giỏ chung',
    description: 'Thành viên chọn món, số lượng, tùy chọn topping và gửi vào giỏ chung.',
  })
  @ApiParam({ name: 'roomCode', example: 'DG-A8F2', description: 'Mã phòng đặt nhóm' })
  addItem(
    @Param('roomCode') roomCode: string,
    @Body() dto: AddGroupItemDto,
  ) {
    return this.groupOrderService.addItem(roomCode, dto);
  }

  @Delete(':roomCode/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U021: Xóa món khỏi giỏ chung',
    description: 'Thành viên xóa món của chính mình, hoặc Host có quyền xóa bất kỳ món nào.',
  })
  @ApiParam({ name: 'roomCode', example: 'DG-A8F2', description: 'Mã phòng' })
  @ApiParam({ name: 'itemId', description: 'ID món trong giỏ nhóm cần xóa' })
  removeItem(
    @Param('roomCode') roomCode: string,
    @Param('itemId') itemId: string,
    @Query('memberId') memberId: string,
  ) {
    return this.groupOrderService.removeItem(roomCode, memberId, itemId);
  }

  @Post(':roomCode/lock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U021: Trưởng nhóm khóa phòng đặt món',
    description: 'Chốt danh sách, không cho phép thêm hay sửa món nữa để chuẩn bị đặt hàng.',
  })
  @ApiParam({ name: 'roomCode', example: 'DG-A8F2', description: 'Mã phòng' })
  lockRoom(
    @Param('roomCode') roomCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupOrderService.lockRoom(roomCode, user);
  }

  @Post(':roomCode/split-bill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U021: Tính toán chia tiền (Split Bill)',
    description: 'Tính số tiền mỗi thành viên cần trả (chia đều EQUAL hoặc theo món BY_ITEM).',
  })
  @ApiParam({ name: 'roomCode', example: 'DG-A8F2', description: 'Mã phòng' })
  calculateBillSplit(
    @Param('roomCode') roomCode: string,
    @Body() dto: BillSplitDto,
  ) {
    return this.groupOrderService.calculateBillSplit(roomCode, dto);
  }

  @Post(':roomCode/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U021: Trưởng nhóm xác nhận đặt hàng đơn nhóm',
    description: 'Chuyển toàn bộ món từ giỏ chung thành đơn hàng Order chính thức trên sàn DineGo.',
  })
  @ApiParam({ name: 'roomCode', example: 'DG-A8F2', description: 'Mã phòng' })
  checkoutGroupOrder(
    @Param('roomCode') roomCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutGroupOrderDto,
  ) {
    return this.groupOrderService.checkoutGroupOrder(roomCode, user, dto);
  }
}

