import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AiGuideController } from './ai-guide.controller.js';
import { AiGuideService } from './ai-guide.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AiGuideController],
  providers: [AiGuideService],
  exports: [AiGuideService],
})
export class AiGuideModule {}

