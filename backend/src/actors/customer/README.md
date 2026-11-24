# 👤 Backend Actor: Customer (Khách hàng)

Thư mục này gom nhóm toàn bộ các controller, service và module xử lý logic dành riêng cho **Khách hàng** trên hệ thống DineGo Backend.

## 📦 Các Modules & APIs phụ trách:
1. **Cart Module (\src/modules/cart\):**
   - Quản lý giỏ hàng người dùng (thêm món, sửa số lượng, ghi chú món, xóa món).
   - Kiểm tra món cùng nhà hàng / cảnh báo khi thêm món từ quán khác.
2. **Group Order Module (\src/modules/group-order\):**
   - Tạo phòng đặt đơn nhóm, tạo liên kết mời bạn bè.
   - Thêm món theo thời gian thực (realtime room), chốt đơn và chia tiền tự động.
3. **AI Guide Module (\src/modules/ai-guide\):**
   - Trợ lý ẩm thực thông minh tích hợp Google Gemini AI và RAG kiến trúc.
   - Trả lời tư vấn món ăn ngon, quán ăn hot theo khẩu vị và khoảng cách.
4. **Feedback Module (\src/modules/feedback\):**
   - Tạo đánh giá, gửi hình ảnh món ăn, chấm điểm sao cho quán ăn sau đơn hàng.
5. **Payment Module (\src/modules/payment\):**
   - Tích hợp cổng thanh toán MoMo, VNPay, chuyển khoản ngân hàng VietQR.
   - Xử lý Webhook IPN cập nhật trạng thái thanh toán tự động.
