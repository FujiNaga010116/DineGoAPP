import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have standard Prisma delegate models defined on instance', () => {
    expect(service.user).toBeDefined();
    expect(service.userRole).toBeDefined();
    expect(service.merchant).toBeDefined();
    expect(service.category).toBeDefined();
    expect(service.menuItem).toBeDefined();
    expect(service.topping).toBeDefined();
    expect(service.menuItemTopping).toBeDefined();
    expect(service.userSession).toBeDefined();
  });
});
