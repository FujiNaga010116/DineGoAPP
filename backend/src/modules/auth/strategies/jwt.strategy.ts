import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../../common/enums/index.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // JWT_ACCESS_SECRET is required — validated by env.validation.ts at startup.
    // We guard here as a second line of defense in case the module is initialized directly.
    const accessSecret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!accessSecret) {
      throw new InternalServerErrorException(
        '[Security] JWT_ACCESS_SECRET must be set in environment variables.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // 1. Guard against token misuse (Refresh Token cannot be used as Access Token)
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Loại token không hợp lệ để truy cập tài nguyên');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Token không hợp lệ hoặc thiếu thông tin định danh');
    }

    // 2. Verify user exists and is active in database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản người dùng không còn tồn tại trên hệ thống');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa hoặc vô hiệu hóa');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role as Role),
      isActive: user.isActive,
    };
  }
}
