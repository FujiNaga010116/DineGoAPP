# 🏪 Actor: Merchant (Đối tác Quán Ăn & Nhà Hàng)

Thư mục này gom nhóm toàn bộ các màn hình và chức năng dành riêng cho **Kênh Người Bán / Chủ Quán Ăn (DineGo Seller)**.

## 📄 Danh sách Màn hình (Pages)
- \MerchantDashboardPage.tsx\: Trung tâm điều hành quán ăn, bao gồm các phân hệ:
  - **Điều phối đơn hàng & Bếp trực tiếp**: Tiếp nhận đơn, cập nhật trạng thái làm món, điều phối bàn giao shipper khi trong bán kính an toàn.
  - **Quản lý thực đơn & Món ăn**: Thêm món, phân loại, cài đặt giá, tạm ngưng món hết hàng.
  - **Quản lý Voucher & Khuyến mãi quán**: Phát hành mã ưu đãi riêng cho quán để kích cầu.
  - **Hợp đồng Tiệc & Lịch Catering**: Tiếp nhận yêu cầu tiệc, soạn thảo báo giá, quản lý đặt cọc & quyết toán tiệc.
  - **Báo cáo Doanh thu & Đánh giá**: Biểu đồ doanh thu thực nhận, đối soát tiền về tài khoản ngân hàng, phản hồi đánh giá của khách.
  - **Hồ sơ pháp lý & Cài đặt gian hàng**: Xác thực giấy phép ĐKKD, Vệ sinh ATTP, thông tin ngân hàng nhận tiền.

## 🧩 Danh sách Components
- \MerchantCateringManager.tsx\: Module chuyên biệt quản lý các đơn đặt tiệc Catering quy mô lớn.
- \MerchantRegistrationModal.tsx\: Modal đăng ký trở thành đối tác nhà hàng của DineGo.
- \MerchantSetupScreen.tsx\: Màn hình hướng dẫn hoàn tất thiết lập thông tin quán mới tạo.
