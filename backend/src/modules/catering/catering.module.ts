import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CateringController } from './catering.controller.js';
import { CateringService } from './catering.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CateringController],
  providers: [CateringService],
  exports: [CateringService],
})
export class CateringModule {}

