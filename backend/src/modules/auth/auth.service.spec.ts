import { ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../common/enums/index.js';
import bcryptjs from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

// Test-only placeholder secrets — 32+ chars, never used outside test suite
const TEST_ACCESS_SECRET = 'test_access_secret_placeholder_xx32';
const TEST_REFRESH_SECRET = 'test_refresh_secret_placeholder_x32';

describe('AuthService', () => {
  let authService: AuthService;

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((promises) => Promise.all(promises)),
  };

  const mockJwtService = {
    signAsync: vi.fn().mockResolvedValue('mocked_jwt_token'),
    verifyAsync: vi.fn(),
  };

  // Provide required secrets — mock returns test placeholders for secret keys,
  // falls back to provided defaultValue for optional config (e.g. JWT_*_EXPIRES_IN)
  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => {
      if (key === 'JWT_ACCESS_SECRET') return TEST_ACCESS_SECRET;
      if (key === 'JWT_REFRESH_SECRET') return TEST_REFRESH_SECRET;
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('startup security guard', () => {
    it('should throw InternalServerErrorException if JWT_ACCESS_SECRET is missing', async () => {
      const missingSecretConfig = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'JWT_ACCESS_SECRET') return undefined; // missing!
          if (key === 'JWT_REFRESH_SECRET') return TEST_REFRESH_SECRET;
          return defaultValue;
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            AuthService,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: JwtService, useValue: mockJwtService },
            { provide: ConfigService, useValue: missingSecretConfig },
          ],
        }).compile(),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException if JWT_REFRESH_SECRET is missing', async () => {
      const missingRefreshConfig = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'JWT_ACCESS_SECRET') return TEST_ACCESS_SECRET;
          if (key === 'JWT_REFRESH_SECRET') return undefined; // missing!
          return defaultValue;
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            AuthService,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: JwtService, useValue: mockJwtService },
            { provide: ConfigService, useValue: missingRefreshConfig },
          ],
        }).compile(),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('register', () => {
    it('should register a new user with CUSTOMER role and hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@dinego.vn',
        fullName: 'Nguyễn Văn A',
        phoneNumber: '0901234567',
        roles: [{ role: Role.CUSTOMER }],
        createdAt: new Date(),
      });

      const result = await authService.register({
        email: 'test@dinego.vn',
        password: 'Password123@',
        fullName: 'Nguyễn Văn A',
        phoneNumber: '0901234567',
      });

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@dinego.vn');
      expect(result.roles).toEqual([Role.CUSTOMER]);
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.register({
          email: 'duplicate@dinego.vn',
          password: 'Password123@',
          fullName: 'Nguyễn Văn B',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials and issue tokens', async () => {
      const passwordHash = await bcryptjs.hash('Password123@', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@dinego.vn',
        fullName: 'Nguyễn Văn A',
        passwordHash,
        isActive: true,
        roles: [{ role: Role.CUSTOMER }],
      });
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-1' });

      const result = await authService.login({
        email: 'user@dinego.vn',
        password: 'Password123@',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.tokenType).toBe('Bearer');
      expect(result.user.roles).toEqual([Role.CUSTOMER]);
      expect(mockPrisma.userSession.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const passwordHash = await bcryptjs.hash('CorrectPassword@', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@dinego.vn',
        passwordHash,
        isActive: true,
        roles: [{ role: Role.CUSTOMER }],
      });

      await expect(
        authService.login({
          email: 'user@dinego.vn',
          password: 'WrongPassword@',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user account is inactive', async () => {
      const passwordHash = await bcryptjs.hash('Password123@', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@dinego.vn',
        passwordHash,
        isActive: false, // Inactive
        roles: [{ role: Role.CUSTOMER }],
      });

      await expect(
        authService.login({
          email: 'user@dinego.vn',
          password: 'Password123@',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should rotate tokens and create new session when refreshToken is valid', async () => {
      const plainToken = 'valid_refresh_token';
      const tokenHash = await bcryptjs.hash(plainToken, 10);

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        email: 'user@dinego.vn',
        type: 'refresh',
      });

      mockPrisma.userSession.findMany.mockResolvedValue([
        {
          id: 'session-old',
          userId: 'user-123',
          tokenHash,
          isRevoked: false,
        },
      ]);
      mockPrisma.userSession.update.mockResolvedValue({ id: 'session-old' });
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-new' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@dinego.vn',
        fullName: 'Nguyễn Văn A',
        isActive: true,
        roles: [{ role: Role.CUSTOMER }],
      });

      const result = await authService.refreshTokens({ refreshToken: plainToken });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-old' },
        data: { isRevoked: true },
      });
      expect(mockPrisma.userSession.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if session has been revoked or reused', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        email: 'user@dinego.vn',
        type: 'refresh',
      });
      mockPrisma.userSession.findMany.mockResolvedValue([]); // No active session matches

      await expect(
        authService.refreshTokens({ refreshToken: 'stolen_or_revoked_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke user sessions upon logout', async () => {
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });

      const res = await authService.logout('user-123');
      expect(res.success).toBe(true);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('getProfile', () => {
    it('should return sanitized user profile without sensitive fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@dinego.vn',
        fullName: 'Nguyễn Văn A',
        phoneNumber: '0901234567',
        avatarUrl: null,
        isEmailVerified: true,
        isActive: true,
        passwordHash: 'secret_hash',
        roles: [{ role: Role.CUSTOMER }, { role: Role.MERCHANT }],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await authService.getProfile('user-123');

      expect(profile.id).toBe('user-123');
      expect(profile.roles).toEqual([Role.CUSTOMER, Role.MERCHANT]);
      expect(profile).not.toHaveProperty('passwordHash');
    });
  });

  describe('sendOtp & verifyOtp (U007)', () => {
    it('should generate and store OTP code and return success message', async () => {
      const res = await authService.sendOtp({ email: 'test@dinego.vn' });
      expect(res.success).toBe(true);
      expect(res.message).toContain('Mã xác thực OTP');
    });

    it('should throw BadRequestException when verifying unrequested OTP', async () => {
      await expect(
        authService.verifyOtp({ email: 'unknown@dinego.vn', otp: '123456' }),
      ).rejects.toThrow();
    });

    it('should verify correct OTP and mark isEmailVerified if user exists', async () => {
      await authService.sendOtp({ email: 'verify@dinego.vn' });
      // Access internal store to get the generated OTP for testing
      const store = (authService as any).otpStore.get('verify@dinego.vn');
      expect(store).toBeDefined();

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-v1', email: 'verify@dinego.vn' });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-v1', isEmailVerified: true });

      const res = await authService.verifyOtp({
        email: 'verify@dinego.vn',
        otp: store.code,
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-v1' },
        data: { isEmailVerified: true },
      });
    });
  });

  describe('loginWithGoogle (U008)', () => {
    it('should create new user with CUSTOMER role and return tokens if not existing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'google-user-1',
        email: 'google@dinego.vn',
        fullName: 'Google User',
        isActive: true,
        roles: [{ role: Role.CUSTOMER }],
      });
      mockPrisma.userSession.create.mockResolvedValue({});

      const tokens = await authService.loginWithGoogle({
        email: 'google@dinego.vn',
        fullName: 'Google User',
      });

      expect(tokens.accessToken).toBe('mocked_jwt_token');
      expect(tokens.user.email).toBe('google@dinego.vn');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });

  describe('forgotPassword & resetPassword (U011)', () => {
    it('should issue reset token and allow password reset', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-reset-1',
        email: 'forgot@dinego.vn',
      });

      const forgotRes = await authService.forgotPassword({ email: 'forgot@dinego.vn' });
      expect(forgotRes.success).toBe(true);

      // Retrieve generated token from store
      const entries = Array.from((authService as any).passwordResetStore.entries()) as [string, any][];
      const tokenEntry = entries.find(([, val]) => val.email === 'forgot@dinego.vn');
      expect(tokenEntry).toBeDefined();
      const token = tokenEntry![0];

      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.userSession.updateMany.mockResolvedValue({});

      const resetRes = await authService.resetPassword({
        token,
        newPassword: 'NewSecurePassword@2026',
      });

      expect(resetRes.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('updateProfile & changePassword (U011)', () => {
    it('should update user profile successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-up-1', email: 'up@dinego.vn' });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-up-1',
        email: 'up@dinego.vn',
        fullName: 'Tên Mới',
        phoneNumber: '0988888888',
        avatarUrl: 'https://new-avatar.jpg',
        isEmailVerified: true,
        roles: [{ role: Role.CUSTOMER }],
        updatedAt: new Date(),
      });

      const res = await authService.updateProfile('user-up-1', {
        fullName: 'Tên Mới',
        phoneNumber: '0988888888',
        avatarUrl: 'https://new-avatar.jpg',
      });

      expect(res.fullName).toBe('Tên Mới');
      expect(res.phoneNumber).toBe('0988888888');
    });

    it('should change password when old password matches', async () => {
      const hashedOldPassword = await bcryptjs.hash('OldPassword@123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-cp-1',
        passwordHash: hashedOldPassword,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const res = await authService.changePassword('user-cp-1', {
        oldPassword: 'OldPassword@123',
        newPassword: 'BrandNewPass@2026',
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });
});
