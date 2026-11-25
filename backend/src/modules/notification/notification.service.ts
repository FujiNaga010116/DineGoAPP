// ==============================================================================
// DineGo Backend — Notification Service
// Persists multi-actor notifications in SQL Server with per-user read/clear state.
// Auto-creates tables on startup so teammates can pull & run without manual steps.
// ==============================================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface NotificationActorContext {
  userId: string;
  role: string;
  merchantId?: string;
  driverId?: string;
}

export interface CreateNotificationPayload {
  id?: string;
  targetRole: string;
  targetUserId?: string | null;
  targetMerchantId?: string | null;
  targetDriverId?: string | null;
  category: string;
  title: string;
  message: string;
  priority?: string;
  actionTab?: string;
  orderRef?: string;
  senderLabel?: string;
  createdAt?: string;
  timestampMs?: number;
}

export interface ActorNotificationDto {
  id: string;
  targetRole: string;
  targetUserId?: string | null;
  targetMerchantId?: string | null;
  targetDriverId?: string | null;
  category: string;
  title: string;
  message: string;
  createdAt: string;
  timestampMs: number;
  isRead: boolean;
  priority: 'normal' | 'high' | 'urgent';
  actionTab?: string;
  orderRef?: string;
  senderLabel?: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private tablesReady = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    if (this.tablesReady) return;
    try {
      await this.prisma.$executeRawUnsafe(`
        IF OBJECT_ID(N'dbo.actor_notifications', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.actor_notifications (
            id NVARCHAR(100) NOT NULL PRIMARY KEY,
            target_role NVARCHAR(20) NOT NULL,
            target_user_id NVARCHAR(100) NULL,
            target_merchant_id NVARCHAR(100) NULL,
            target_driver_id NVARCHAR(100) NULL,
            category NVARCHAR(30) NOT NULL,
            title NVARCHAR(300) NOT NULL,
            message NVARCHAR(MAX) NOT NULL,
            priority NVARCHAR(20) NOT NULL DEFAULT 'normal',
            action_tab NVARCHAR(80) NULL,
            order_ref NVARCHAR(100) NULL,
            sender_label NVARCHAR(150) NULL,
            created_at_label NVARCHAR(80) NULL,
            timestamp_ms BIGINT NOT NULL,
            created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
          );
          CREATE INDEX IX_actor_notifications_role_ts
            ON dbo.actor_notifications (target_role, timestamp_ms DESC);
        END
      `);

      await this.prisma.$executeRawUnsafe(`
        IF OBJECT_ID(N'dbo.actor_notification_reads', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.actor_notification_reads (
            notification_id NVARCHAR(100) NOT NULL,
            reader_key NVARCHAR(150) NOT NULL,
            is_read BIT NOT NULL DEFAULT 1,
            is_cleared BIT NOT NULL DEFAULT 0,
            updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
            CONSTRAINT PK_actor_notification_reads PRIMARY KEY (notification_id, reader_key)
          );
        END
      `);

      this.tablesReady = true;
    } catch (err) {
      this.logger.warn(`Failed to ensure notification tables: ${(err as Error).message}`);
    }
  }

  private getReaderKey(userId: string): string {
    return `user:${String(userId || '').trim()}`;
  }

  private formatNowVi(): string {
    return new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  async listForActor(ctx: NotificationActorContext): Promise<ActorNotificationDto[]> {
    await this.ensureTables();
    const role = String(ctx.role || 'CUSTOMER').toUpperCase();
    const userId = String(ctx.userId || '').trim();
    const merchantId = ctx.merchantId ? String(ctx.merchantId).trim() : '';
    const driverId = ctx.driverId ? String(ctx.driverId).trim() : '';
    const readerKey = this.getReaderKey(userId);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        target_role: string;
        target_user_id: string | null;
        target_merchant_id: string | null;
        target_driver_id: string | null;
        category: string;
        title: string;
        message: string;
        priority: string;
        action_tab: string | null;
        order_ref: string | null;
        sender_label: string | null;
        created_at_label: string | null;
        timestamp_ms: bigint | number;
        is_read: boolean | number | null;
      }>
    >(
      `
      SELECT TOP 100
        n.id,
        n.target_role,
        n.target_user_id,
        n.target_merchant_id,
        n.target_driver_id,
        n.category,
        n.title,
        n.message,
        n.priority,
        n.action_tab,
        n.order_ref,
        n.sender_label,
        n.created_at_label,
        n.timestamp_ms,
        ISNULL(r.is_read, 0) AS is_read
      FROM dbo.actor_notifications n
      LEFT JOIN dbo.actor_notification_reads r
        ON r.notification_id = n.id AND r.reader_key = @P1
      WHERE ISNULL(r.is_cleared, 0) = 0
        AND (
          n.target_role = 'ALL'
          OR n.target_role = @P2
        )
        AND (
          n.target_user_id IS NULL
          OR n.target_user_id = ''
          OR n.target_user_id = @P3
        )
        AND (
          n.target_merchant_id IS NULL
          OR n.target_merchant_id = ''
          OR (@P2 = 'MERCHANT' AND @P4 <> '' AND n.target_merchant_id = @P4)
        )
        AND (
          n.target_driver_id IS NULL
          OR n.target_driver_id = ''
          OR (@P2 = 'DRIVER' AND @P5 <> '' AND n.target_driver_id = @P5)
        )
      ORDER BY n.timestamp_ms DESC
      `,
      readerKey,
      role,
      userId,
      merchantId,
      driverId,
    );

    return rows.map((row) => ({
      id: row.id,
      targetRole: row.target_role,
      targetUserId: row.target_user_id,
      targetMerchantId: row.target_merchant_id,
      targetDriverId: row.target_driver_id,
      category: row.category,
      title: row.title,
      message: row.message,
      createdAt: row.created_at_label || this.formatNowVi(),
      timestampMs: Number(row.timestamp_ms) || Date.now(),
      isRead: Boolean(row.is_read),
      priority:
        row.priority === 'urgent' || row.priority === 'high' ? row.priority : 'normal',
      actionTab: row.action_tab || undefined,
      orderRef: row.order_ref || undefined,
      senderLabel: row.sender_label || undefined,
    }));
  }

  async createBatch(items: CreateNotificationPayload[]): Promise<ActorNotificationDto[]> {
    await this.ensureTables();
    if (!items.length) return [];

    const nowMs = Date.now();
    const nowLabel = this.formatNowVi();
    const created: ActorNotificationDto[] = [];

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const id =
        item.id?.trim() ||
        `notif-${nowMs}-${i}-${Math.random().toString(36).slice(2, 7)}`;
      const targetRole = String(item.targetRole || 'ALL').toUpperCase();
      const targetUserId = item.targetUserId?.trim() || null;
      const targetMerchantId = item.targetMerchantId?.trim() || null;
      const targetDriverId = item.targetDriverId?.trim() || null;
      const category = String(item.category || 'SYSTEM').toUpperCase();
      const title = String(item.title || '').slice(0, 290);
      const message = String(item.message || '');
      const priority =
        item.priority === 'urgent' || item.priority === 'high' ? item.priority : 'normal';
      const actionTab = item.actionTab?.trim() || null;
      const orderRef = item.orderRef?.trim() || null;
      const senderLabel = item.senderLabel?.trim() || 'Hệ thống DineGo';
      const createdAtLabel = item.createdAt?.trim() || nowLabel;
      const timestampMs = Number(item.timestampMs) || nowMs + i;

      if (!title || !message) continue;

      await this.prisma.$executeRawUnsafe(
        `
        IF NOT EXISTS (SELECT 1 FROM dbo.actor_notifications WHERE id = @P1)
        BEGIN
          INSERT INTO dbo.actor_notifications (
            id, target_role, target_user_id, target_merchant_id, target_driver_id,
            category, title, message, priority, action_tab, order_ref, sender_label,
            created_at_label, timestamp_ms
          )
          VALUES (
            @P1, @P2, @P3, @P4, @P5,
            @P6, @P7, @P8, @P9, @P10, @P11, @P12,
            @P13, @P14
          )
        END
        `,
        id,
        targetRole,
        targetUserId,
        targetMerchantId,
        targetDriverId,
        category,
        title,
        message,
        priority,
        actionTab,
        orderRef,
        senderLabel,
        createdAtLabel,
        timestampMs,
      );

      created.push({
        id,
        targetRole,
        targetUserId,
        targetMerchantId,
        targetDriverId,
        category,
        title,
        message,
        createdAt: createdAtLabel,
        timestampMs,
        isRead: false,
        priority,
        actionTab: actionTab || undefined,
        orderRef: orderRef || undefined,
        senderLabel,
      });
    }

    return created;
  }

  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    await this.ensureTables();
    const readerKey = this.getReaderKey(userId);
    await this.prisma.$executeRawUnsafe(
      `
      MERGE dbo.actor_notification_reads AS target
      USING (SELECT @P1 AS notification_id, @P2 AS reader_key) AS src
      ON target.notification_id = src.notification_id AND target.reader_key = src.reader_key
      WHEN MATCHED THEN
        UPDATE SET is_read = 1, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (notification_id, reader_key, is_read, is_cleared)
        VALUES (@P1, @P2, 1, 0);
      `,
      notificationId,
      readerKey,
    );
    return { success: true };
  }

  async markAllAsRead(ctx: NotificationActorContext): Promise<{ success: boolean }> {
    const items = await this.listForActor(ctx);
    const unread = items.filter((n) => !n.isRead);
    for (const item of unread) {
      await this.markAsRead(item.id, ctx.userId);
    }
    return { success: true };
  }

  async clearRead(ctx: NotificationActorContext): Promise<{ success: boolean }> {
    await this.ensureTables();
    const readerKey = this.getReaderKey(ctx.userId);
    const items = await this.listForActor(ctx);
    const readIds = items.filter((n) => n.isRead).map((n) => n.id);
    for (const id of readIds) {
      await this.prisma.$executeRawUnsafe(
        `
        MERGE dbo.actor_notification_reads AS target
        USING (SELECT @P1 AS notification_id, @P2 AS reader_key) AS src
        ON target.notification_id = src.notification_id AND target.reader_key = src.reader_key
        WHEN MATCHED THEN
          UPDATE SET is_cleared = 1, is_read = 1, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (notification_id, reader_key, is_read, is_cleared)
          VALUES (@P1, @P2, 1, 1);
        `,
        id,
        readerKey,
      );
    }
    return { success: true };
  }
}
