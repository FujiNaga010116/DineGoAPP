import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/index.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockExecutionContext(user: any): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no roles are required on endpoint', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockExecutionContext({
      id: 'u1',
      roles: [Role.CUSTOMER],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the single required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockExecutionContext({
      id: 'u1',
      roles: [Role.ADMIN],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has multiple roles and at least one matches', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MERCHANT]);
    const context = createMockExecutionContext({
      id: 'u1',
      roles: [Role.CUSTOMER, Role.MERCHANT],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access (403 Forbidden) if user lacks the required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockExecutionContext({
      id: 'u1',
      roles: [Role.CUSTOMER],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access if user has empty roles or user is undefined', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
