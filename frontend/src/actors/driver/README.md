# 🛵 Actor: Driver / Shipper (Tài xế giao hàng)

Thư mục này gom nhóm toàn bộ các màn hình và chức năng dành riêng cho **Tài Xế Giao Hàng (DineGo Driver)**.

## 📄 Danh sách Màn hình (Pages)
- \DriverTrackingPage.tsx\: Trung tâm điều phối chuyến đi dành cho tài xế với 5 phân hệ chuyên sâu:
  - **Nhận & Xử lý Chuyến**: Danh sách đơn chờ nhận, xác nhận nhận chuyến, điều kiện bán kính kiểm tra có mặt tại quán.
  - **Bản đồ Điều hướng GPS**: Định vị trực tiếp thời gian thực lộ trình di chuyển từ vị trí tài xế -> quán ăn -> địa chỉ khách hàng.
  - **Lịch sử Ca Giao Hàng**: Nhật ký ca trực, tổng chuyến hoàn thành, báo cáo sự cố/tố cáo đơn bom hàng.
  - **Ví Thu nhập & Đối soát**: Chi tiết số dư ví, đối soát cước phí từng đơn hàng, quản lý rút tiền về tài khoản ngân hàng.
  - **Quản lý Tài khoản & Phương tiện**: Đăng tải ảnh chân dung thực tế, hồ sơ phương tiện (biển số, giấy phép lái xe, CCCD).

## 🧩 Danh sách Components
- \DeliveryMap.tsx\: Bản đồ tương tác định vị trực tiếp vị trí tài xế, quán ăn và địa chỉ giao hàng.
- \VietQrPaymentModal.tsx\: Modal mã VietQR cho phép tài xế thu tiền hoặc nạp tiền ví cước nhanh chóng.
