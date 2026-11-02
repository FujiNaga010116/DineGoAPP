import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng làm mới token');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token xác thực không hợp lệ hoặc sai chữ ký');
      }
      throw (
        err ||
        new UnauthorizedException('Vui lòng cung cấp Access Token hợp lệ để thực hiện yêu cầu')
      );
    }
    return user;
  }
}
