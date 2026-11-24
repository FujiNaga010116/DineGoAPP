# 🌐 Backend Common / Shared Modules

Thư mục này gom nhóm các module cốt lõi dùng chung cho tất cả các tác nhân trong hệ thống:

1. **Auth Module (\src/modules/auth\):** Đăng ký, đăng nhập JWT, làm mới token, phân quyền RBAC (Role-Based Access Control) cho Customer, Merchant, Driver, Admin.
2. **Order Module (\src/modules/order\):** Trái tim của hệ thống đặt món: Quản lý vòng đời đơn hàng xuyên suốt từ Customer -> Merchant -> Driver -> Admin.
3. **Promotion Module (\src/modules/promotion\):** Quản lý mã giảm giá toàn sàn và voucher của từng quán, tính toán chiết khấu đơn hàng.
4. **Health Module (\src/modules/health\):** Giám sát trạng thái hoạt động của cơ sở dữ liệu và hệ thống (DevOps health checks).
