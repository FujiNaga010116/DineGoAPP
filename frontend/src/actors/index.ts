/**
 * DineGo Actor-based Architecture Index
 * Phân chia cấu trúc theo 4 tác nhân chính:
 * 1. Customer (Khách hàng)
 * 2. Merchant (Nhà hàng / Đối tác quán)
 * 3. Driver (Tài xế giao hàng)
 * 4. Admin (Quản trị viên hệ thống)
 * Cùng với Common (Thành phần dùng chung giữa các tác nhân)
 */

export * as CustomerActor from './customer';
export * as MerchantActor from './merchant';
export * as DriverActor from './driver';
export * as AdminActor from './admin';
export * as CommonActor from './common';
