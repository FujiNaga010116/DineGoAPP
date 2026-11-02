import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('DineGo API E2E', () => {
  let app: INestApplication<App>;

  const mockPrisma = {
    merchant: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    userSession: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    category: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    menuItem: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    topping: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    cart: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    cartItemTopping: {
      create: vi.fn(),
    },
    promotion: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
    },
    promotionUsage: {
      count: vi.fn().mockResolvedValue(0),
    },
    order: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    isHealthy: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Core Endpoints', () => {
    it('/api/v1 (GET) - Should return application metadata', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'DineGo Backend API');
      expect(res.body).toHaveProperty('version', '1.0.0');
    });

    it('/api/v1/health (GET) - Should return service status ok and uptime', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('dinego-backend');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptimeSeconds');
      expect(res.body).toHaveProperty('memoryUsageMb');
    });
  });

  describe('Validation & Error Filter Handling', () => {
    it('/api/v1/test-validation (POST) - Valid payload passes', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/test-validation')
        .send({
          email: 'user@dinego.vn',
          fullName: 'Nguyen Van A',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('user@dinego.vn');
    });

    it('/api/v1/test-validation (POST) - Invalid email triggers ValidationPipe & GlobalExceptionFilter (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/test-validation')
        .send({
          email: 'not-an-email',
          fullName: 'A',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('path');
    });

    it('/api/v1/test-validation (POST) - Non-whitelisted field is rejected (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/test-validation')
        .send({
          email: 'user@dinego.vn',
          fullName: 'Nguyen Van A',
          hackerField: 'injection',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
    });

    it('/api/v1/test-error (GET) - Should return standardized JSON error format', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/test-error');

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          statusCode: 400,
          message: 'Mô phỏng lỗi BadRequest được xử lý qua GlobalExceptionFilter',
          path: '/api/v1/test-error',
          method: 'GET',
        }),
      );
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Authentication & RBAC Endpoints (Phase 3)', () => {
    it('/api/v1/auth/register (POST) - Rejects invalid registration payload (short password)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@dinego.vn',
          password: '123', // Less than 6 chars
          fullName: 'Nguyễn Văn A',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('/api/v1/auth/register (POST) - Rejects attempted role escalation in payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'hacker@dinego.vn',
          password: 'SecurePassword123@',
          fullName: 'Attacker',
          role: 'ADMIN', // Non-whitelisted field
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
    });

    it('/api/v1/auth/me (GET) - Rejects unauthenticated request without token (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(401);
    });

    it('/api/v1/auth/admin-only (GET) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/admin-only');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(401);
    });

    it('/api/v1/auth/merchant-only (GET) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/merchant-only');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('Merchant & Menu Endpoints (Phase 4)', () => {
    it('/api/v1/merchants (GET) - Public list of approved merchants returns pagination', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/merchants');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 10);
      expect(res.body).toHaveProperty('totalPages');
    });

    it('/api/v1/merchants (POST) - Rejects unauthenticated creation (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchants')
        .send({
          name: 'Quán Ăn Mới',
          address: '123 Đường Số 1, Q.1',
          phoneNumber: '0901234567',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/merchants/my-merchants (GET) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/merchants/my-merchants');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/merchants/invalid-uuid (GET) - Rejects invalid UUID parameter (400)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/merchants/not-a-valid-uuid');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/merchants/:merchantId/approval (PATCH) - Rejects unauthenticated approval (401)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/merchants/00000000-0000-0000-0000-000000000000/approval')
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Cart Endpoints (Phase 5.1)', () => {
    it('/api/v1/cart (GET) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/cart');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/cart/items (POST) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          menuItemId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/cart/items/:itemId (PATCH) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/cart/items/00000000-0000-0000-0000-000000000000')
        .send({ quantity: 2 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/cart/items/:itemId (DELETE) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/cart/items/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/cart (DELETE) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer()).delete('/api/v1/cart');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Promotion Endpoints (Phase 5.2)', () => {
    it('/api/v1/promotions/validate (POST) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/promotions/validate')
        .send({ code: 'DINEGO50' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/promotions (POST) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/promotions')
        .send({
          code: 'PROMO10',
          name: 'Promo 10',
          discountType: 'FIXED_AMOUNT',
          discountValue: 10000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/promotions (GET) - Returns list of promotions (200 OK)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/promotions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
    });

    it('/api/v1/promotions/:id (GET) - Returns 404 for non-existent promotion', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/promotions/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/promotions/:id (PATCH) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/promotions/00000000-0000-0000-0000-000000000000')
        .send({ name: 'New Name' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Payment Endpoints (Phase 6: MoMo Payment Engine)', () => {
    it('/api/v1/payments/momo/create (POST) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/momo/create')
        .send({ orderId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/payments/momo/ipn (POST) - Rejects webhook with invalid signature (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/momo/ipn')
        .send({
          partnerCode: 'MOMOBKUN20180529',
          orderId: '00000000-0000-0000-0000-000000000000',
          requestId: 'REQ-123',
          amount: 50000,
          orderInfo: 'Thanh toan',
          orderType: 'momo_wallet',
          transId: 123456,
          resultCode: 0,
          message: 'Success',
          payType: 'qr',
          responseTime: 1710000000,
          signature: 'invalid_sha256_signature',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Chữ ký IPN không hợp lệ');
    });

    it('/api/v1/payments/orders/:orderId (GET) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/payments/orders/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('/api/v1/payments (GET) - Rejects unauthenticated request (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/payments');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
