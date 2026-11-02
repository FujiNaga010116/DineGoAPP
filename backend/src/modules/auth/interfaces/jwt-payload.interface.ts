import { Role } from '../../../common/enums/index.js';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: Role[];
  type?: 'access' | 'refresh';
}
