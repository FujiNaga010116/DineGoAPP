import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { SplitType } from './dto/bill-split.dto.js';
import { GroupOrderService } from './group-order.service.js';

describe('GroupOrderService (Sprint 2 — U020 & U021)', () => {
  let service: GroupOrderService;

  const mockMerchant = {
    id: 'merchant-123',
    name: 'Cơm Tấm 1985',
    isActive: true,
  };

  const mockMenuItem = {
    id: 'dish-1',
    merchantId: 'merchant-123',
    name: 'Cơm Sườn Nướng',
    basePrice: 50000,
    isAvailable: true,
  };

  const mockTopping = {
    id: 'top-1',
    merchantId: 'merchant-123',
    name: 'Trứng Ốp La',
    price: 10000,
    isAvailable: true,
  };

  const mockHostUser: AuthenticatedUser = {
    id: 'user-host-1',
    email: 'host@dinego.vn',
    roles: [Role.CUSTOMER],
  };

  const mockMemberUser: AuthenticatedUser = {
    id: 'user-member-2',
    email: 'member@dinego.vn',
    roles: [Role.CUSTOMER],
  };

  const mockPrisma = {
    merchant: {
      findUnique: vi.fn(),
    },
    menuItem: {
      findUnique: vi.fn(),
    },
    topping: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      const tx = {
        order: {
          create: vi.fn().mockResolvedValue({
            id: 'ord-grp-1',
            orderNumber: 'DG20261103-GRP123',
            totalAmount: 125000,
          }),
        },
        orderItem: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(tx);
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GroupOrderService(mockPrisma as unknown as PrismaService);
  });

  describe('createRoom & getRoom (U020)', () => {
    it('should create a new group order room with host member and OPEN status', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);

      const room = await service.createRoom(mockHostUser, {
        merchantId: mockMerchant.id,
        roomName: 'Ăn trưa công ty',
      });

      expect(room.roomCode).toMatch(/^DG-[A-Z0-9]{4}$/);
      expect(room.hostUserId).toBe(mockHostUser.id);
      expect(room.status).toBe('OPEN');
      expect(room.members.length).toBe(1);
      expect(room.members[0].isHost).toBe(true);
    });

    it('should throw BadRequestException if merchant is not active', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'inactive', isActive: false });

      await expect(
        service.createRoom(mockHostUser, { merchantId: 'inactive' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for invalid room code', async () => {
      await expect(service.getRoom('INVALID-CODE')).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinRoom (U020)', () => {
    it('should add new participant to room', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      const room = await service.createRoom(mockHostUser, { merchantId: mockMerchant.id });

      const res = await service.joinRoom(room.roomCode, { memberName: 'Bạn A' }, mockMemberUser);

      expect(res.room.members.length).toBe(2);
      expect(res.member.name).toBe('Bạn A');
      expect(res.member.isHost).toBe(false);
    });
  });

  describe('addItem & removeItem (U021)', () => {
    it('should add item with toppings to shared basket', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      const room = await service.createRoom(mockHostUser, { merchantId: mockMerchant.id });

      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findMany.mockResolvedValue([mockTopping]);

      const updated = await service.addItem(room.roomCode, {
        memberId: room.members[0].id,
        menuItemId: mockMenuItem.id,
        quantity: 2,
        toppingIds: [mockTopping.id],
      });

      expect(updated.items.length).toBe(1);
      // Unit price 50000 + 10000 = 60000 * 2 = 120000
      expect(updated.items[0].subtotal).toBe(120000);
      expect(updated.items[0].toppings.length).toBe(1);
    });

    it('should allow member to remove their item', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      const room = await service.createRoom(mockHostUser, { merchantId: mockMerchant.id });
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findMany.mockResolvedValue([]);

      await service.addItem(room.roomCode, {
        memberId: room.members[0].id,
        menuItemId: mockMenuItem.id,
        quantity: 1,
      });

      const itemId = room.items[0].id;
      const res = await service.removeItem(room.roomCode, room.members[0].id, itemId);

      expect(res.items.length).toBe(0);
    });
  });

  describe('calculateBillSplit (U021)', () => {
    it('should calculate bill split BY_ITEM accurately', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      const room = await service.createRoom(mockHostUser, { merchantId: mockMerchant.id });
      const joinRes = await service.joinRoom(room.roomCode, { memberName: 'Bạn B' });

      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findMany.mockResolvedValue([]);

      // Host adds 1 item (50k)
      await service.addItem(room.roomCode, {
        memberId: room.members[0].id,
        menuItemId: mockMenuItem.id,
        quantity: 1,
      });

      // Member B adds 2 items (100k)
      await service.addItem(room.roomCode, {
        memberId: joinRes.member.id,
        menuItemId: mockMenuItem.id,
        quantity: 2,
      });

      const split = await service.calculateBillSplit(room.roomCode, {
        splitType: SplitType.BY_ITEM,
        shippingFee: 20000,
      });

      expect(split.subtotal).toBe(150000);
      expect(split.shippingFee).toBe(20000);
      expect(split.totalAmount).toBe(170000);

      // Shipping 20k split across 2 active members = 10k each
      const hostShare = split.shares.find((s) => s.memberId === room.members[0].id);
      const memberShare = split.shares.find((s) => s.memberId === joinRes.member.id);

      expect(hostShare?.totalToPay).toBe(50000 + 10000);
      expect(memberShare?.totalToPay).toBe(100000 + 10000);
    });

    it('should calculate bill split EQUAL accurately', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      const room = await service.createRoom(mockHostUser, { merchantId: mockMerchant.id });
      await service.joinRoom(room.roomCode, { memberName: 'Bạn C' });

      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findMany.mockResolvedValue([]);

      await service.addItem(room.roomCode, {
        memberId: room.members[0].id,
        menuItemId: mockMenuItem.id,
        quantity: 2, // 100k
      });

      const split = await service.calculateBillSplit(room.roomCode, {
        splitType: SplitType.EQUAL,
        shippingFee: 20000,
      });

      // Total = 100k + 20k = 120k / 2 members = 60k each
      expect(split.totalAmount).toBe(120000);
      expect(split.shares[0].totalToPay).toBe(60000);
      expect(split.shares[1].totalToPay).toBe(60000);
    });
  });

  describe('lockRoom & checkoutGroupOrder (U021)', () => {
    it('should allow host to lock room and checkout successfully', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      const room = await service.createRoom(mockHostUser, { merchantId: mockMerchant.id });

      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
      mockPrisma.topping.findMany.mockResolvedValue([]);
      await service.addItem(room.roomCode, {
        memberId: room.members[0].id,
        menuItemId: mockMenuItem.id,
        quantity: 2,
      });

      const locked = await service.lockRoom(room.roomCode, mockHostUser);
      expect(locked.status).toBe('LOCKED');

      const checkoutRes = await service.checkoutGroupOrder(room.roomCode, mockHostUser, {
        deliveryAddress: '123 Phố Đi Bộ, Q.1',
        recipientPhone: '0901234567',
      });

      expect(checkoutRes.success).toBe(true);
      expect(checkoutRes.orderNumber).toBeDefined();
      expect(room.status).toBe('CHECKED_OUT');
    });

    it('should prevent non-host from locking or checking out', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(mockMerchant);
      const room = await service.createRoom(mockHostUser, { merchantId: mockMerchant.id });

      await expect(service.lockRoom(room.roomCode, mockMemberUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
