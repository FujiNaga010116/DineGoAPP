// ==============================================================================
// DineGo Backend — Real-Time GPS Tracking Controller (Sprint 4 — U039 đến U042)
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
import { UpdateDeliveryStatusDto, UpdateGpsLocationDto } from './dto/update-gps.dto.js';
import { TrackingService } from './tracking.service.js';

@ApiTags('Real-Time GPS Tracking & Geofencing (Sprint 4 — U039 đến U042)')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('orders/:orderId/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U039: Tài xế tiếp nhận đơn hàng giao',
    description: 'Tài xế bấm nhận đơn hàng để bắt đầu lộ trình nhận và giao món.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng (UUID)' })
  assignShipper(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trackingService.assignShipper(orderId, user);
  }

  @Post('orders/:orderId/gps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U040 & U041: Tài xế cập nhật tọa độ GPS thời gian thực (5s/lần)',
    description:
      'Gửi vĩ độ, kinh độ GPS. Hệ thống tự động kích hoạt Geofencing bán kính 100m để đổi trạng thái đơn sang ARRIVED_AT_STORE hoặc ARRIVED_AT_DESTINATION.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng' })
  updateGps(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateGpsLocationDto,
  ) {
    return this.trackingService.updateShipperGps(orderId, user, dto);
  }

  @Patch('orders/:orderId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U039: Tài xế cập nhật trạng thái tiến trình giao hàng',
    description: 'Chuyển đổi trạng thái lộ trình: PICKED_UP -> DELIVERING -> DELIVERED.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng' })
  updateStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.trackingService.updateDeliveryStatus(orderId, user, dto);
  }

  @Get('orders/:orderId/live')
  @ApiOperation({
    summary: 'U042: Bản đồ theo dõi đơn hàng trực tiếp cho khách hàng (Live Tracking)',
    description:
      'Lấy vị trí thời gian thực của shipper trên bản đồ, khoảng cách còn lại (km), thời gian ước tính (ETA phút) và timeline.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Dữ liệu định vị trực tiếp của đơn hàng.' })
  getLiveTracking(@Param('orderId') orderId: string) {
    return this.trackingService.getLiveTracking(orderId);
  }
}

