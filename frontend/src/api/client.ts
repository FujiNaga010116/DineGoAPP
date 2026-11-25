// ==============================================================================
// DineGo Frontend — API Client Barrel (Tach gon theo 4 Actor & giu tuong thich)
// ==============================================================================

export { API_BASE_URL, getAuthHeaders, safeRequest } from './http';
export {
  CURRENT_USER,
  MOCK_MERCHANTS,
  MOCK_DRIVERS,
  MOCK_USERS,
  MOCK_MENU_ITEMS,
  VALID_VOUCHERS,
  isDriverProfileVerified,
} from '../data/mockSeed';
import { safeRequest } from './http';
import { createAdminApi } from './admin.api';
import { createCateringApi } from './catering.api';
import { createCustomerApi } from './customer.api';
import { createDriverApi } from './driver.api';
import { createMerchantApi } from './merchant.api';

export const adminApi = createAdminApi(safeRequest);
export const cateringApi = createCateringApi(safeRequest);
export const customerApi = createCustomerApi(safeRequest);
export const driverApi = createDriverApi(safeRequest);
export const merchantApi = createMerchantApi(safeRequest);
