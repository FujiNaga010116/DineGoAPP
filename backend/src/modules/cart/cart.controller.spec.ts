// ==============================================================================
// DineGo Backend — Cart Controller Unit Tests (Phase 5.1)
// ==============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

describe('CartController', () => {
  let controller: CartController;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'user@dinego.vn',
    fullName: 'Test User',
    roles: [],
    isActive: true,
  };

  const mockCartService = {
    getCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.getCart with user id', async () => {
    mockCartService.getCart.mockResolvedValue({ items: [] });
    await controller.getCart(mockUser);
    expect(mockCartService.getCart).toHaveBeenCalledWith(mockUser.id);
  });

  it('should call service.addItem with user id and dto', async () => {
    const dto = { menuItemId: 'item-1', quantity: 2 };
    mockCartService.addItem.mockResolvedValue({ items: [] });
    await controller.addItem(mockUser, dto);
    expect(mockCartService.addItem).toHaveBeenCalledWith(mockUser.id, dto);
  });

  it('should call service.updateItemQuantity with user id, itemId and dto', async () => {
    const dto = { quantity: 5 };
    mockCartService.updateItemQuantity.mockResolvedValue({ items: [] });
    await controller.updateItemQuantity(mockUser, 'item-1', dto);
    expect(mockCartService.updateItemQuantity).toHaveBeenCalledWith(
      mockUser.id,
      'item-1',
      dto,
    );
  });

  it('should call service.removeItem with user id and itemId', async () => {
    mockCartService.removeItem.mockResolvedValue({ items: [] });
    await controller.removeItem(mockUser, 'item-1');
    expect(mockCartService.removeItem).toHaveBeenCalledWith(mockUser.id, 'item-1');
  });

  it('should call service.clearCart with user id', async () => {
    mockCartService.clearCart.mockResolvedValue({ items: [] });
    await controller.clearCart(mockUser);
    expect(mockCartService.clearCart).toHaveBeenCalledWith(mockUser.id);
  });
});
