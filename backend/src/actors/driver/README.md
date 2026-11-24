# 🛵 Backend Actor: Driver / Shipper (Tài xế giao hàng)

Thư mục này gom nhóm toàn bộ các logic nghiệp vụ dành riêng cho **Tài Xế Giao Hàng (DineGo Driver)**.

## 📦 Các Modules & APIs phụ trách:
1. **Tracking Module (\src/modules/tracking\):**
   - Phân bổ & nhận chuyến: Tài xế nhận đơn, xác thực vị trí có mặt tại quán trong bán kính cho phép.
   - Định vị thời gian thực (Real-time GPS Tracking) qua WebSocket / Socket.io Gateway:
     - Gửi tọa độ GPS di chuyển của tài xế đến khách hàng và quán ăn.
     - Tính toán khoảng cách và thời gian dự kiến giao hàng (ETA).
   - Nhật ký ca làm việc: Lưu trữ thời gian bắt đầu/kết thúc ca, số chuyến hoàn thành.
   - Báo cáo sự cố & Đơn bom hàng: Lưu vết bằng chứng chụp ảnh và vị trí để Admin thẩm định.
   - Geocoding Việt Nam (\ietnam-geocoding.service.ts\): Chuẩn hóa địa chỉ tiếng Việt và tọa độ bản đồ.
