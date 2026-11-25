// ==============================================================================
// DineGo Backend — Notification Controller
// Multi-actor notification endpoints scoped to authenticated user & role.
// ==============================================================================

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import {
  type CreateNotificationPayload,
  NotificationService,
} from './notification.service.js';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo cho actor/tài khoản hiện tại' })
  async listForActor(
    @CurrentUser() user: AuthenticatedUser,
    @Query('role') role?: string,
    @Query('merchantId') merchantId?: string,
    @Query('driverId') driverId?: string,
  ) {
    const requestedRole = String(role || 'CUSTOMER').toUpperCase();
    if (requestedRole === 'ADMIN' && !user.roles?.includes(Role.ADMIN)) {
      throw new ForbiddenException('Chỉ quản trị viên mới có thể xem thông báo Admin.');
    }
    return this.notificationService.listForActor({
      userId: user.id,
      role: requestedRole,
      merchantId,
      driverId,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo một hoặc nhiều thông báo cho các actor' })
  async createNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { items?: CreateNotificationPayload[]; item?: CreateNotificationPayload },
  ) {
    const rawItems = Array.isArray(body?.items)
      ? body.items
      : body?.item
      ? [body.item]
      : [];

    const hasAllBroadcast = rawItems.some(
      (i) => String(i?.targetRole || '').toUpperCase() === 'ALL',
    );
    if (hasAllBroadcast && !user.roles?.includes(Role.ADMIN)) {
      throw new ForbiddenException('Chỉ quản trị viên mới có thể gửi thông báo toàn sàn.');
    }

    return this.notificationService.createBatch(rawItems);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo của tài khoản hiện tại là đã đọc' })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { role?: string; merchantId?: string; driverId?: string },
  ) {
    return this.notificationService.markAllAsRead({
      userId: user.id,
      role: String(body?.role || 'CUSTOMER').toUpperCase(),
      merchantId: body?.merchantId,
      driverId: body?.driverId,
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo là đã đọc cho tài khoản hiện tại' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Delete('clear-read')
  @ApiOperation({ summary: 'Ẩn các thông báo đã đọc khỏi danh sách của tài khoản hiện tại' })
  async clearRead(
    @CurrentUser() user: AuthenticatedUser,
    @Query('role') role?: string,
    @Query('merchantId') merchantId?: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.notificationService.clearRead({
      userId: user.id,
      role: String(role || 'CUSTOMER').toUpperCase(),
      merchantId,
      driverId,
    });
  }
}
