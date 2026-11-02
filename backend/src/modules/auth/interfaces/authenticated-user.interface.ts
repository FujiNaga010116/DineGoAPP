import { Role } from '../../../common/enums/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  isActive: boolean;
}
