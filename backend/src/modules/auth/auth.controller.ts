import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../common/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface.js';

@ApiTags('Authentication & RBAC')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Đăng ký tài khoản người dùng mới',
    description: 'Tạo tài khoản với mật khẩu bảo mật, mặc định gán vai trò CUSTOMER.',
  })
  @ApiResponse({ status: 201, description: 'Đăng ký tài khoản thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Email hoặc số điện thoại đã tồn tại' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập hệ thống DineGo',
    description: 'Xác thực email và mật khẩu, cấp cặp JWT Access Token và Refresh Token.',
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về token pair' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không chính xác / Tài khoản bị khóa' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới Access Token bằng Refresh Token (Token Rotation)',
    description: 'Thu hồi phiên cũ và cấp cặp Access Token & Refresh Token mới.',
  })
  @ApiResponse({ status: 200, description: 'Làm mới token thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã bị thu hồi' })
  refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đăng xuất khỏi hệ thống',
    description: 'Thu hồi phiên đăng nhập tương ứng trong cơ sở dữ liệu.',
  })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực hoặc token không hợp lệ' })
  logout(
    @CurrentUser('id') userId: string,
    @Body() body?: { refreshToken?: string },
  ) {
    return this.authService.logout(userId, body?.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin hồ sơ người dùng hiện tại',
    description: 'Yêu cầu Access Token hợp lệ trong Authorization Header.',
  })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản và danh sách vai trò' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ, hết hạn hoặc tài khoản bị khóa' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  // ----------------------------------------------------------------------------
  // DEMO RBAC ENDPOINTS TO VERIFY ROLES GUARD
  // ----------------------------------------------------------------------------

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Endpoint dành riêng cho Quản trị viên (ADMIN)',
    description: 'Kiểm tra hoạt động của RolesGuard và @Roles(Role.ADMIN).',
  })
  @ApiResponse({ status: 200, description: 'Truy cập thành công với vai trò ADMIN' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (Thiếu role ADMIN)' })
  adminOnly(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Chào mừng Quản trị viên hệ thống DineGo!',
      user,
    };
  }

  @Get('merchant-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Endpoint dành riêng cho Đối tác Quán ăn (MERCHANT)',
    description: 'Kiểm tra hoạt động của RolesGuard và @Roles(Role.MERCHANT).',
  })
  @ApiResponse({ status: 200, description: 'Truy cập thành công với vai trò MERCHANT' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (Thiếu role MERCHANT)' })
  merchantOnly(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Chào mừng Đối tác Nhà hàng DineGo!',
      user,
    };
  }
}
