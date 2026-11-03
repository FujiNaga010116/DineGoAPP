import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
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
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
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
  // SPRINT 1 ENHANCEMENTS: OTP, GOOGLE, FORGOT PASSWORD & PROFILE (U007, U008, U011)
  // ----------------------------------------------------------------------------

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U007: Gửi mã OTP xác thực email',
    description: 'Tạo mã OTP 6 chữ số ngẫu nhiên và gửi tới email đăng ký.',
  })
  @ApiResponse({ status: 200, description: 'Đã gửi mã OTP thành công' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U007: Xác thực mã OTP',
    description: 'Kiểm tra mã OTP 6 chữ số và kích hoạt trạng thái email đã xác thực.',
  })
  @ApiResponse({ status: 200, description: 'Xác thực OTP thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP sai hoặc đã hết hạn' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U008: Đăng nhập bằng Google OAuth',
    description: 'Xác thực thông tin người dùng Google, tự động tạo tài khoản CUSTOMER nếu chưa tồn tại.',
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập Google thành công, trả về token pair' })
  loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U011: Yêu cầu đặt lại mật khẩu khi quên',
    description: 'Gửi link/token đặt lại mật khẩu đến email người dùng.',
  })
  @ApiResponse({ status: 200, description: 'Gửi yêu cầu thành công' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U011: Đặt lại mật khẩu bằng token',
    description: 'Xác thực token và cập nhật mật khẩu mới.',
  })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Token không hợp lệ hoặc đã hết hạn' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'U011: Cập nhật thông tin hồ sơ cá nhân',
    description: 'Cập nhật họ tên, số điện thoại, ảnh đại diện của tài khoản hiện tại.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thông tin thành công' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'U011: Đổi mật khẩu tài khoản',
    description: 'Xác thực mật khẩu cũ và đổi sang mật khẩu mới.',
  })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Mật khẩu cũ không chính xác' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
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
