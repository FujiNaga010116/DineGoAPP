// ==============================================================================
// DineGo Backend — Group Order Service (Sprint 2 — U020 & U021)
// Architecture: Real-time Shared Basket & Split Bill Engine
// ==============================================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { OrderStatus } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { AddGroupItemDto } from './dto/add-group-item.dto.js';
import { BillSplitDto, SplitType } from './dto/bill-split.dto.js';
import { CheckoutGroupOrderDto } from './dto/checkout-group-order.dto.js';
import { CreateGroupOrderDto } from './dto/create-group-order.dto.js';
import { JoinGroupOrderDto } from './dto/join-group-order.dto.js';
import type {
  BillSplitResult,
  GroupMember,
  GroupOrderItem,
  GroupOrderItemTopping,
  GroupOrderRoom,
  MemberBillShare,
} from './interfaces/group-order.interface.js';

@Injectable()
export class GroupOrderService {
  private readonly logger = new Logger(GroupOrderService.name);

  // In-memory Shared Rooms Map (RoomCode -> GroupOrderRoom)
  private readonly rooms = new Map<string, GroupOrderRoom>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper sinh mã phòng ngẫu nhiên 6 ký tự dễ nhớ (ví dụ: DG-A8F2)
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DG-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Helper sinh mã đơn hàng duy nhất cho Checkout
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `DG${yyyy}${mm}${dd}-GRP${randomHex}`;
  }

  /**
   * U020: Tạo phòng đặt nhóm (Host)
   */
  async createRoom(
    user: AuthenticatedUser,
    dto: CreateGroupOrderDto,
  ): Promise<GroupOrderRoom> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
    });

    if (!merchant || !merchant.isActive) {
      throw new BadRequestException('Nhà hàng không tồn tại hoặc đã tạm dừng nhận đơn');
    }

    let roomCode = this.generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = this.generateRoomCode();
    }

    const hostMember: GroupMember = {
      id: crypto.randomUUID(),
      name: `${user.email.split('@')[0]} (Trưởng nhóm)`,
      userId: user.id,
      isHost: true,
      joinedAt: new Date(),
    };

    const room: GroupOrderRoom = {
      id: crypto.randomUUID(),
      roomCode,
      roomName: dto.roomName?.trim() || `Đặt nhóm cùng ${merchant.name}`,
      hostUserId: user.id,
      hostName: hostMember.name,
      merchantId: merchant.id,
      merchantName: merchant.name,
      status: 'OPEN',
      createdAt: new Date(),
      members: [hostMember],
      items: [],
    };

    this.rooms.set(roomCode, room);
    this.logger.log(`[GroupOrder] Đã tạo phòng ${roomCode} cho quán ${merchant.name} bởi host ${user.email}`);

    return room;
  }

  /**
   * U020: Lấy thông tin phòng đặt nhóm và giỏ chung
   */
  async getRoom(roomCode: string): Promise<GroupOrderRoom> {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng đặt nhóm có mã ${roomCode}`);
    }
    return room;
  }

  /**
   * U020: Thành viên tham gia phòng qua mã phòng / link mời
   */
  async joinRoom(
    roomCode: string,
    dto: JoinGroupOrderDto,
    user?: AuthenticatedUser,
  ): Promise<{ room: GroupOrderRoom; member: GroupMember }> {
    const room = await this.getRoom(roomCode);

    if (room.status !== 'OPEN') {
      throw new BadRequestException(`Phòng đặt nhóm này hiện ở trạng thái ${room.status}, không thể tham gia`);
    }

    const existingMember = room.members.find(
      (m) =>
        (user && m.userId === user.id) ||
        m.name.toLowerCase() === dto.memberName.trim().toLowerCase(),
    );

    if (existingMember) {
      return { room, member: existingMember };
    }

    const newMember: GroupMember = {
      id: crypto.randomUUID(),
      name: dto.memberName.trim(),
      userId: user?.id,
      isHost: false,
      joinedAt: new Date(),
    };

    room.members.push(newMember);
    this.logger.log(`[GroupOrder] ${newMember.name} vừa tham gia phòng ${roomCode}`);

    return { room, member: newMember };
  }

  /**
   * U021: Thành viên thêm món vào giỏ chung
   */
  async addItem(roomCode: string, dto: AddGroupItemDto): Promise<GroupOrderRoom> {
    const room = await this.getRoom(roomCode);

    if (room.status !== 'OPEN') {
      throw new BadRequestException('Phòng đặt nhóm đã bị khóa hoặc đã thanh toán');
    }

    const member = room.members.find((m) => m.id === dto.memberId);
    if (!member) {
      throw new BadRequestException('Người tham gia không tồn tại trong phòng này');
    }

    // Xác thực món ăn thuộc về quán của phòng
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
    });

    if (!menuItem || menuItem.merchantId !== room.merchantId) {
      throw new BadRequestException('Món ăn không thuộc thực đơn của nhà hàng này');
    }

    if (!menuItem.isAvailable) {
      throw new BadRequestException(`Món "${menuItem.name}" hiện đã hết`);
    }

    // Xác thực toppings
    const toppings: GroupOrderItemTopping[] = [];
    let toppingsTotal = 0;

    if (dto.toppingIds && dto.toppingIds.length > 0) {
      const dbToppings = await this.prisma.topping.findMany({
        where: {
          id: { in: dto.toppingIds },
          merchantId: room.merchantId,
          isAvailable: true,
        },
      });

      for (const t of dbToppings) {
        const price = Number(t.price);
        toppings.push({
          toppingId: t.id,
          name: t.name,
          price,
        });
        toppingsTotal += price;
      }
    }

    const unitPrice = Number(menuItem.basePrice);
    const subtotal = (unitPrice + toppingsTotal) * dto.quantity;

    const groupItem: GroupOrderItem = {
      id: crypto.randomUUID(),
      memberId: member.id,
      memberName: member.name,
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      unitPrice,
      quantity: dto.quantity,
      toppings,
      note: dto.note?.trim(),
      subtotal,
    };

    room.items.push(groupItem);
    this.logger.log(`[GroupOrder] ${member.name} vừa thêm ${dto.quantity}x ${menuItem.name} vào phòng ${roomCode}`);

    return room;
  }

  /**
   * U021: Xóa món khỏi giỏ chung
   */
  async removeItem(
    roomCode: string,
    memberId: string,
    itemId: string,
    userId?: string,
  ): Promise<GroupOrderRoom> {
    const room = await this.getRoom(roomCode);

    if (room.status !== 'OPEN') {
      throw new BadRequestException('Phòng đặt nhóm đã bị khóa');
    }

    const itemIndex = room.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException('Không tìm thấy món ăn trong giỏ nhóm');
    }

    const item = room.items[itemIndex];
    const isHost = userId && room.hostUserId === userId;

    if (item.memberId !== memberId && !isHost) {
      throw new ForbiddenException('Bạn chỉ có thể xóa món do chính mình đã đặt');
    }

    room.items.splice(itemIndex, 1);
    return room;
  }

  /**
   * U021: Trưởng nhóm khóa phòng (ngăn thêm/xóa món tiếp)
   */
  async lockRoom(roomCode: string, hostUser: AuthenticatedUser): Promise<GroupOrderRoom> {
    const room = await this.getRoom(roomCode);

    if (room.hostUserId !== hostUser.id && !hostUser.roles.includes('ADMIN' as any)) {
      throw new ForbiddenException('Chỉ trưởng nhóm (Host) mới có quyền khóa phòng');
    }

    room.status = 'LOCKED';
    this.logger.log(`[GroupOrder] Phòng ${roomCode} đã được Host khóa`);
    return room;
  }

  /**
   * U021: Công cụ tính tiền chia hóa đơn (Split Bill: Chia đều hoặc Theo từng món)
   */
  async calculateBillSplit(roomCode: string, dto: BillSplitDto): Promise<BillSplitResult> {
    const room = await this.getRoom(roomCode);
    const splitType = dto.splitType || SplitType.BY_ITEM;
    const shippingFee = dto.shippingFee ?? 15000;

    let subtotal = 0;
    const memberItemMap = new Map<string, { total: number; count: number; names: string[] }>();

    // Khởi tạo cho toàn bộ thành viên
    for (const m of room.members) {
      memberItemMap.set(m.id, { total: 0, count: 0, names: [] });
    }

    for (const item of room.items) {
      subtotal += item.subtotal;
      const memData = memberItemMap.get(item.memberId);
      if (memData) {
        memData.total += item.subtotal;
        memData.count += item.quantity;
        memData.names.push(`${item.quantity}x ${item.menuItemName}`);
      }
    }

    const totalAmount = subtotal + shippingFee;
    const memberCount = Math.max(1, room.members.length);
    const shares: MemberBillShare[] = [];

    if (splitType === SplitType.EQUAL) {
      // Chia đều toàn bộ chi phí theo số lượng thành viên
      const equalShare = Math.round(totalAmount / memberCount);
      for (const m of room.members) {
        const memData = memberItemMap.get(m.id)!;
        shares.push({
          memberId: m.id,
          memberName: m.name,
          itemSubtotal: memData.total,
          allocatedShipping: Math.round(shippingFee / memberCount),
          totalToPay: equalShare,
          itemCount: memData.count,
          itemNames: memData.names,
        });
      }
    } else {
      // Chia theo món: Ai ăn món nào trả tiền món đó, phí ship chia đều cho thành viên có đặt món
      const activeMembers = Array.from(memberItemMap.entries()).filter(([, d]) => d.count > 0);
      const activeCount = Math.max(1, activeMembers.length);
      const shipPerPerson = Math.round(shippingFee / activeCount);

      for (const m of room.members) {
        const memData = memberItemMap.get(m.id)!;
        const allocatedShipping = memData.count > 0 ? shipPerPerson : 0;
        shares.push({
          memberId: m.id,
          memberName: m.name,
          itemSubtotal: memData.total,
          allocatedShipping,
          totalToPay: memData.total + allocatedShipping,
          itemCount: memData.count,
          itemNames: memData.names,
        });
      }
    }

    return {
      roomCode: room.roomCode,
      splitType,
      subtotal,
      shippingFee,
      totalAmount,
      memberCount,
      shares,
    };
  }

  /**
   * U021: Host tiến hành Checkout đơn nhóm thành Order chính thức trong hệ thống
   */
  async checkoutGroupOrder(
    roomCode: string,
    hostUser: AuthenticatedUser,
    dto: CheckoutGroupOrderDto,
  ): Promise<{ success: boolean; orderId: string; orderNumber: string; totalAmount: number }> {
    const room = await this.getRoom(roomCode);

    if (room.hostUserId !== hostUser.id && !hostUser.roles.includes('ADMIN' as any)) {
      throw new ForbiddenException('Chỉ trưởng nhóm mới có quyền tiến hành đặt đơn nhóm');
    }

    if (room.items.length === 0) {
      throw new BadRequestException('Giỏ hàng nhóm đang trống, vui lòng thêm món trước khi đặt');
    }

    const shippingFee = 15000;
    let subtotal = 0;
    for (const item of room.items) {
      subtotal += item.subtotal;
    }
    const totalAmount = subtotal + shippingFee;
    const orderNumber = this.generateOrderNumber();

    // Lưu vào bảng orders và order_items qua Transaction Prisma
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: hostUser.id,
          merchantId: room.merchantId,
          status: OrderStatus.CONFIRMED,
          subtotal,
          deliveryFee: shippingFee,
          discountAmount: 0,
          finalTotal: totalAmount,
          deliveryAddress: dto.deliveryAddress.trim(),
          recipientName: room.hostName,
          recipientPhone: dto.recipientPhone.trim(),
          customerNote: `[ĐƠN ĐẶT NHÓM - Phòng ${room.roomCode}]: ${dto.note || ''}`,
        },
      });

      for (const item of room.items) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            menuItemId: item.menuItemId,
            itemName: `[${item.memberName}] ${item.menuItemName}`,
            basePrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
            note: item.note,
          },
        });
      }

      return createdOrder;
    });

    room.status = 'CHECKED_OUT';
    this.logger.log(
      `[GroupOrder] Đã checkout thành công phòng ${room.roomCode} thành đơn ${order.orderNumber} (Tổng: ${totalAmount} VND)`,
    );

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount,
    };
  }
}
