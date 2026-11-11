// ==============================================================================
// DineGo Backend — Real-Time GPS Tracking Controller (Sprint 4 — U039 đến U042)
// ==============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import {
  AssignShipperDto,
  UpdateDeliveryStatusDto,
  UpdateGpsLocationDto,
} from './dto/update-gps.dto.js';
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
    @Body() dto?: AssignShipperDto,
  ) {
    return this.trackingService.assignShipper(orderId, user, dto);
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U042: Bản đồ theo dõi đơn hàng trực tiếp cho khách hàng (Live Tracking)',
    description:
      'Lấy vị trí thời gian thực của shipper trên bản đồ, khoảng cách còn lại (km), thời gian ước tính (ETA phút) và timeline.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Dữ liệu định vị trực tiếp của đơn hàng.' })
  getLiveTracking(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trackingService.getLiveTracking(orderId, user);
  }

  @Get('geocode/search')
  @ApiOperation({
    summary: 'Tìm kiếm địa chỉ toàn Việt Nam (Nominatim + Photon + ArcGIS + 2025 VN fallback)',
    description:
      'Tra cứu địa chỉ giao hàng khắp các tỉnh/thành Việt Nam, hỗ trợ tên hành chính sau sáp nhập 2025.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Chuỗi địa chỉ cần tìm' })
  searchGeocode(@Query('q') q?: string) {
    return this.trackingService.searchVietnamAddress(q || '');
  }

  @Get('geocode/reverse')
  @ApiOperation({
    summary: 'Dịch ngược tọa độ bản đồ (lat, lng) sang địa chỉ Việt Nam',
  })
  @ApiQuery({ name: 'lat', required: true, description: 'Vĩ độ' })
  @ApiQuery({ name: 'lng', required: true, description: 'Kinh độ' })
  reverseGeocode(
    @Query('lat') latStr?: string,
    @Query('lng') lngStr?: string,
  ) {
    const lat = Number(latStr);
    const lng = Number(lngStr);
    return this.trackingService.reverseVietnamCoordinates(lat, lng);
  }

  @Sse('orders/:orderId/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U042: Stream SSE tọa độ shipper theo thời gian thực',
    description:
      'Kết nối Server-Sent Events để nhận tự động vị trí GPS mới, ETA và trạng thái Geofence của đơn hàng.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng' })
  streamTracking(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Observable<MessageEvent>> {
    return this.trackingService.streamOrderTracking(orderId, user);
  }
}

