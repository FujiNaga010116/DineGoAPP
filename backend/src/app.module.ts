import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LoggingMiddleware } from './common/middleware/logging.middleware.js';
import { validateEnv } from './config/env.validation.js';
import { AiGuideModule } from './modules/ai-guide/ai-guide.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { CateringModule } from './modules/catering/catering.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { GroupOrderModule } from './modules/group-order/group-order.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MerchantModule } from './modules/merchant/merchant.module.js';
import { OrderModule } from './modules/order/order.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { PromotionModule } from './modules/promotion/promotion.module.js';
import { TrackingModule } from './modules/tracking/tracking.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    MerchantModule,
    CartModule,
    PromotionModule,
    OrderModule,
    PaymentModule,
    GroupOrderModule,
    CateringModule,
    AiGuideModule,
    TrackingModule,
    DashboardModule,
    FeedbackModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('{*path}');
  }
}
