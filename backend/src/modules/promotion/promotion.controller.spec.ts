// ==============================================================================
// DineGo Backend — Promotion Controller Unit Tests (Phase 5.2)
// ==============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscountType, Role } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';

describe('PromotionController', () => {
  let controller: PromotionController;

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-id',
    email: 'admin@dinego.vn',
    fullName: 'Admin',
    roles: [Role.ADMIN],
    isActive: true,
  };

  const mockCustomerUser: AuthenticatedUser = {
    id: 'customer-id',
    email: 'customer@dinego.vn',
    fullName: 'Customer',
    roles: [Role.CUSTOMER],
    isActive: true,
  };

  const mockPromotionService = {
    validateVoucherForCart: vi.fn(),
    createPromotion: vi.fn(),
    getPromotions: vi.fn(),
    getPromotionById: vi.fn(),
    updatePromotion: vi.fn(),
    toggleActive: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        {
          provide: PromotionService,
          useValue: mockPromotionService,
        },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call validateVoucherForCart with userId and code', async () => {
    mockPromotionService.validateVoucherForCart.mockResolvedValue({ isValid: true });
    await controller.validateVoucher(mockCustomerUser, { code: 'SALE10' });
    expect(mockPromotionService.validateVoucherForCart).toHaveBeenCalledWith(
      mockCustomerUser.id,
      'SALE10',
    );
  });

  it('should call createPromotion with user and dto', async () => {
    const dto = {
      code: 'NEWPROMO',
      name: 'New Promotion',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 20000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
    };
    mockPromotionService.createPromotion.mockResolvedValue({ id: 'promo-1' });
    await controller.createPromotion(mockAdminUser, dto);
    expect(mockPromotionService.createPromotion).toHaveBeenCalledWith(
      mockAdminUser,
      dto,
    );
  });

  it('should call getPromotions with query params', async () => {
    const query = { page: 1, limit: 10 };
    mockPromotionService.getPromotions.mockResolvedValue({ items: [], total: 0 });
    await controller.getPromotions(query);
    expect(mockPromotionService.getPromotions).toHaveBeenCalledWith(query);
  });

  it('should call getPromotionById with id', async () => {
    mockPromotionService.getPromotionById.mockResolvedValue({ id: 'p-1' });
    await controller.getPromotionById('p-1');
    expect(mockPromotionService.getPromotionById).toHaveBeenCalledWith('p-1');
  });

  it('should call updatePromotion with user, id and dto', async () => {
    const dto = { name: 'Updated' };
    mockPromotionService.updatePromotion.mockResolvedValue({ id: 'p-1' });
    await controller.updatePromotion(mockAdminUser, 'p-1', dto);
    expect(mockPromotionService.updatePromotion).toHaveBeenCalledWith(
      mockAdminUser,
      'p-1',
      dto,
    );
  });

  it('should call toggleActive with user, id and boolean', async () => {
    mockPromotionService.toggleActive.mockResolvedValue({ id: 'p-1', isActive: false });
    await controller.toggleStatus(mockAdminUser, 'p-1', false);
    expect(mockPromotionService.toggleActive).toHaveBeenCalledWith(
      mockAdminUser,
      'p-1',
      false,
    );
  });
});
