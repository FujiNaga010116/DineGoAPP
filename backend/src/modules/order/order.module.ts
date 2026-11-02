// ==============================================================================
// DineGo Backend — Order Module (Phase 5.3)
// ==============================================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CartModule } from '../cart/cart.module.js';
import { PromotionModule } from '../promotion/promotion.module.js';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';

@Module({
  imports: [PrismaModule, CartModule, PromotionModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
