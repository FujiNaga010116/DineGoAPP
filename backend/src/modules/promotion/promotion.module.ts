// ==============================================================================
// DineGo Backend — Promotion Module (Phase 5.2)
// ==============================================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CartModule } from '../cart/cart.module.js';
import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';

@Module({
  imports: [PrismaModule, CartModule],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
