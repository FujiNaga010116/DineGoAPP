import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let healthController: HealthController;
  const mockPrisma = {
    isHealthy: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    mockPrisma.isHealthy.mockResolvedValue(true);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(healthController).toBeDefined();
  });

  it('should return health status as ok when database is healthy', async () => {
    const result = await healthController.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('dinego-backend');
    expect(result.version).toBe('1.0.0');
    expect(result.details.database.status).toBe('up');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('uptimeSeconds');
  });

  it('should return health status as degraded when database is down', async () => {
    mockPrisma.isHealthy.mockResolvedValue(false);
    const result = await healthController.check();
    expect(result.status).toBe('degraded');
    expect(result.details.database.status).toBe('down');
  });
});
