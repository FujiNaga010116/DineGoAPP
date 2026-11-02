// ==============================================================================
// DineGo Backend — Order Controller Unit Tests (Phase 5.3)
// ==============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderStatus, Role } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { OrderController } from './order.controller.js';
import type { OrderService } from './order.service.js';

describe('OrderController', () => {
  let controller: OrderController;
  let mockOrderService: any;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@dinego.vn',
    fullName: 'Test Customer',
    roles: [Role.CUSTOMER],
    isActive: true,
  };

  beforeEach(() => {
    mockOrderService = {
      createOrder: vi.fn(),
      getOrders: vi.fn(),
      getOrderById: vi.fn(),
      cancelOrder: vi.fn(),
      updateOrderStatus: vi.fn(),
    };

    controller = new OrderController(
      mockOrderService as unknown as OrderService,
    );
  });

  it('should call orderService.createOrder with user and dto', async () => {
    const dto = {
      deliveryAddress: '123 Đường A',
      recipientName: 'Anh A',
      recipientPhone: '0901234567',
    };

    const mockResponse: any = {
      id: 'order-1',
      orderNumber: 'DG20261028-111111',
      status: OrderStatus.PENDING,
    };

    mockOrderService.createOrder.mockResolvedValue(mockResponse);

    const result = await controller.createOrder(mockUser, dto);

    expect(result).toBe(mockResponse);
    expect(mockOrderService.createOrder).toHaveBeenCalledWith(mockUser, dto);
  });

  it('should call orderService.getOrders with user and query', async () => {
    const query = { page: 1, limit: 10 };
    mockOrderService.getOrders.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    const result = await controller.getOrders(mockUser, query);

    expect(result.items).toEqual([]);
    expect(mockOrderService.getOrders).toHaveBeenCalledWith(mockUser, query);
  });

  it('should call orderService.getOrderById with user and id', async () => {
    mockOrderService.getOrderById.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'DG20261028-111111',
    });

    const result = await controller.getOrderById(mockUser, 'order-1');

    expect(result.id).toBe('order-1');
    expect(mockOrderService.getOrderById).toHaveBeenCalledWith(mockUser, 'order-1');
  });

  it('should call orderService.cancelOrder with user, id and cancelReason', async () => {
    const dto = { cancelReason: 'Bận việc' };
    mockOrderService.cancelOrder.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.CANCELLED,
    });

    const result = await controller.cancelOrder(mockUser, 'order-1', dto);

    expect(result.status).toBe(OrderStatus.CANCELLED);
    expect(mockOrderService.cancelOrder).toHaveBeenCalledWith(
      mockUser,
      'order-1',
      dto,
    );
  });

  it('should call orderService.updateOrderStatus with user, id and status', async () => {
    const dto = { status: OrderStatus.CONFIRMED };
    mockOrderService.updateOrderStatus.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.CONFIRMED,
    });

    const result = await controller.updateOrderStatus(mockUser, 'order-1', dto);

    expect(result.status).toBe(OrderStatus.CONFIRMED);
    expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith(
      mockUser,
      'order-1',
      dto,
    );
  });
});
