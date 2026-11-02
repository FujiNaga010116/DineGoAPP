import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');

  // 1. CORS Configuration
  app.enableCors({
    origin: corsOrigin.includes(',')
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : corsOrigin,
    credentials: true,
  });

  // 2. Global API Prefix
  app.setGlobalPrefix(apiPrefix);

  // 3. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 4. Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 5. Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DineGo API')
    .setDescription(
      'DineGo — Nền tảng đặt đồ ăn hằng ngày, đặt tiệc/mâm cỗ sự kiện & AI Culinary Guide (Nhóm 17)',
    )
    .setVersion('1.0.0')
    .addTag('Health Check', 'Kiểm tra trạng thái dịch vụ và tài nguyên')
    .addTag('App / Core', 'Endpoint hệ thống và kiểm thử Phase 1')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    customSiteTitle: 'DineGo API Documentation',
  });

  // 6. Start Application
  await app.listen(port);
  logger.log(`========================================================`);
  logger.log(`🚀 DineGo Backend is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
  logger.log(`💚 Health Check endpoint:        http://localhost:${port}/${apiPrefix}/health`);
  logger.log(`========================================================`);
}

await bootstrap();
