# 🛡️ Backend Actor: Admin (Quản trị viên Hệ thống)

Thư mục này gom nhóm toàn bộ các logic nghiệp vụ quản trị và vận hành toàn sàn **DineGo Platform**.

## 📦 Các Modules & APIs phụ trách:
1. **Dashboard Module (\src/modules/dashboard\):**
   - Thống kê toàn sàn: Tổng doanh thu (GMV), số lượng đơn hàng, số lượng người dùng mới, tỷ lệ hoàn tất đơn.
   - Quản trị đối tác nhà hàng: Duyệt hồ sơ pháp lý, kích hoạt gian hàng, xử lý khóa/cảnh cáo quán vi phạm.
   - Quản trị tài xế: Duyệt hồ sơ đăng ký tài xế, ảnh chân dung thực tế, bằng lái xe, kiểm tra lịch sử chuyến.
   - Quản lý người dùng: Danh sách khách hàng, lịch sử khiếu nại, mở/khóa tài khoản.
   - Xử lý khiếu nại & đối soát: Quyết định bồi thường/phạt đối với đơn bom hàng, xuất báo cáo tài chính định kỳ.
