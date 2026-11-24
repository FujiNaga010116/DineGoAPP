# 🏪 Backend Actor: Merchant (Đối tác Quán Ăn & Nhà Hàng)

Thư mục này gom nhóm toàn bộ các logic nghiệp vụ dành cho **Kênh Đối Tác Quán Ăn (DineGo Seller)**.

## 📦 Các Modules & APIs phụ trách:
1. **Merchant Module (\src/modules/merchant\):**
   - Quản lý thông tin gian hàng (tên, logo, địa chỉ GPS, giờ mở/đóng cửa).
   - Quản lý danh mục & thực đơn món ăn (Menu CRUD, bật/tắt trạng thái còn món).
   - Bếp trực tiếp: Cập nhật tiến độ nấu món, xác nhận bàn giao cho tài xế với điều kiện kiểm tra bán kính có mặt thực tế.
   - Báo cáo tài chính & doanh thu thực nhận (đã trừ chiết khấu sàn).
   - Hồ sơ pháp lý (Đăng ký kinh doanh, Giấy VSATTP, tài khoản ngân hàng thụ hưởng).
2. **Catering Module (\src/modules/catering\):**
   - Quy trình đặt tiệc trọn gói: Tiếp nhận yêu cầu tiệc, soạn bảng báo giá (proposal).
   - Quản lý quy trình 3 giai đoạn: Đặt cọc (Deposit) -> Triển khai tiệc -> Quyết toán (Final Settlement).
