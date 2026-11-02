import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../common/enums/index.js';
import bcryptjs from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roles: Role[];
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtAccessSecret: string;
  private readonly jwtAccessExpiresIn: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtRefreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Secrets are required — validated by env.validation.ts at startup.
    // If missing, ConfigService.getOrThrow throws before reaching this point.
    // We add an explicit guard here as a second line of defense.
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new InternalServerErrorException(
        '[Security] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables.',
      );
    }

    this.jwtAccessSecret = accessSecret;
    this.jwtRefreshSecret = refreshSecret;
    this.jwtAccessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    this.jwtRefreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  /**
   * Register a new user account with default CUSTOMER role
   */
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Check for existing email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng trên hệ thống');
    }

    // 2. Check for existing phone number if provided
    if (dto.phoneNumber) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existingPhone) {
        throw new ConflictException('Số điện thoại này đã được sử dụng trên hệ thống');
      }
    }

    // 3. Hash password securely (cost: 10)
    const passwordHash = await bcryptjs.hash(dto.password, 10);

    try {
      // 4. Create user with default CUSTOMER role only (prevent privilege escalation)
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: dto.fullName.trim(),
          phoneNumber: dto.phoneNumber || null,
          roles: {
            create: {
              role: Role.CUSTOMER,
            },
          },
        },
        include: {
          roles: true,
        },
      });

      // 5. Return sanitized user data (never return passwordHash)
      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        roles: user.roles.map((r) => r.role),
        createdAt: user.createdAt,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Email hoặc số điện thoại đã tồn tại trong cơ sở dữ liệu',
        );
      }
      throw error;
    }
  }

  /**
   * Login with email and password, issuing access & refresh tokens
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Find user by email including roles
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        roles: true,
      },
    });

    // 2. Constant-time-like rejection (do not reveal if email exists)
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await bcryptjs.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 3. Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa hoặc vô hiệu hóa');
    }

    const roles = user.roles.map((r) => r.role as Role);

    // 4. Generate Access and Refresh Tokens
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user.id,
      user.email,
      roles,
    );

    // 5. Store hashed Refresh Token in UserSession for revocation support
    const refreshTokenHash = await bcryptjs.hash(refreshToken, 10);
    const expiresAt = this.calculateExpiresDate(this.jwtRefreshExpiresIn);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtAccessExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    };
  }

  /**
   * Refresh token rotation: verifies refresh token, invalidates old session, issues new token pair
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn sử dụng',
      );
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Loại token không hợp lệ để làm mới phiên');
    }

    // Find active sessions for this user
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId: payload.sub,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    let matchingSession: (typeof sessions)[0] | null = null;
    for (const session of sessions) {
      const isMatch = await bcryptjs.compare(dto.refreshToken, session.tokenHash);
      if (isMatch) {
        matchingSession = session;
        break;
      }
    }

    if (!matchingSession) {
      this.logger.warn(
        `[Security Alert]: Detected refresh token reuse or revoked token for user ID: ${payload.sub}`,
      );
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc phiên đăng nhập đã bị thu hồi',
      );
    }

    // Revoke old session immediately (Token Rotation Strategy)
    await this.prisma.userSession.update({
      where: { id: matchingSession.id },
      data: { isRevoked: true },
    });

    // Fetch latest user data and active roles
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa',
      );
    }

    const roles = user.roles.map((r) => r.role as Role);

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokenPair(user.id, user.email, roles);

    // Save new session hash
    const newSessionHash = await bcryptjs.hash(newRefreshToken, 10);
    const expiresAt = this.calculateExpiresDate(this.jwtRefreshExpiresIn);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: newSessionHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtAccessExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    };
  }

  /**
   * Revoke active user session on logout
   */
  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const sessions = await this.prisma.userSession.findMany({
        where: { userId, isRevoked: false },
      });

      for (const session of sessions) {
        const isMatch = await bcryptjs.compare(refreshToken, session.tokenHash);
        if (isMatch) {
          await this.prisma.userSession.update({
            where: { id: session.id },
            data: { isRevoked: true },
          });
          return { success: true, message: 'Đăng xuất phiên hiện tại thành công' };
        }
      }
    }

    // If no specific refreshToken provided or match not found, revoke all sessions for this user
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return { success: true, message: 'Đăng xuất tất cả các phiên thành công' };
  }

  /**
   * Get user profile by authenticated user ID
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      roles: user.roles.map((r) => r.role),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Helper to generate access and refresh token pair
   */
  private async generateTokenPair(
    userId: string,
    email: string,
    roles: Role[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      roles,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      roles,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.jwtAccessSecret,
        expiresIn: this.jwtAccessExpiresIn as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.jwtRefreshSecret,
        expiresIn: this.jwtRefreshExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Helper to calculate expiresAt DateTime from string duration (e.g. '7d', '15m')
   */
  private calculateExpiresDate(duration: string): Date {
    const now = new Date();
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10) || 7;

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      default:
        now.setDate(now.getDate() + 7);
    }

    return now;
  }
}
