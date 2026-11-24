/**
 * DineGo Backend Actor-based Architecture Index
 * Phân chia theo 4 tác nhân chính:
 * 1. Customer (Khách hàng)
 * 2. Merchant (Nhà hàng / Quán ăn)
 * 3. Driver (Tài xế giao hàng)
 * 4. Admin (Quản trị sàn)
 * Cùng với Common (Thành phần dùng chung)
 */

export * as CustomerActor from './customer/index.js';
export * as MerchantActor from './merchant/index.js';
export * as DriverActor from './driver/index.js';
export * as AdminActor from './admin/index.js';
export * as CommonActor from './common/index.js';
