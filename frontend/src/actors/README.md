# 🏗️ Kiến Trúc Phân Hệ Theo Tác Nhân (Actor-Based Architecture) - Frontend

Chào mừng bạn đến với hệ thống giao diện **DineGo**. Nhằm giúp các thành viên trong đội ngũ phát triển dễ dàng tìm kiếm file, đọc hiểu luồng ứng dụng và chỉnh sửa tính năng theo từng vai trò, toàn bộ các màn hình và chức năng đã được quy hoạch rõ ràng thành các thư mục theo từng Actor:

\\\
frontend/src/actors/
├── customer/     # 👤 Dành cho Khách Hàng (Customer)
│   ├── pages/        # Màn hình đặt món, giỏ hàng, thanh toán, hồ sơ, săn voucher, tiệc...
│   ├── components/   # Modal đặt cọc, đánh giá, chi tiết báo giá tiệc...
│   └── README.md     # Hướng dẫn chi tiết phân hệ Customer
├── merchant/     # 🏪 Dành cho Chủ Quán / Nhà Hàng (Merchant / DineGo Seller)
│   ├── pages/        # Dashboard quản lý quán ăn, bếp trực tiếp, thực đơn, doanh thu...
│   ├── components/   # Quản lý Catering, đăng ký gian hàng, thiết lập quán...
│   └── README.md     # Hướng dẫn chi tiết phân hệ Merchant
├── driver/       # 🛵 Dành cho Tài Xế Giao Hàng (Driver / DineGo Express)
│   ├── pages/        # Console nhận đơn, bản đồ điều hướng GPS, lịch sử ca, ví thu nhập...
│   ├── components/   # Bản đồ lộ trình, quét VietQR...
│   └── README.md     # Hướng dẫn chi tiết phân hệ Driver
├── admin/        # 🛡️ Dành cho Quản Trị Viên (System Admin)
│   ├── pages/        # Dashboard giám sát sàn, phê duyệt quán & tài xế, đối soát...
│   └── README.md     # Hướng dẫn chi tiết phân hệ Admin
└── common/       # 🌐 Dùng chung (Shared giữa các Actors)
    └── components/   # Header, Footer, AuthModal, Chuông thông báo (NotificationBell)...
\\\

---

## 📌 Tính Tương Thích Ngược (Backward Compatibility)
> [!NOTE]
> Cấu trúc này được lồng vào hệ thống mà **KHÔNG** làm thay đổi hay phá vỡ các đường dẫn import cũ trong \src/pages\ hay \src/components\. 
> Lập trình viên có thể:
> 1. Truy cập trực tiếp qua thư mục \src/actors/<tên_actor>\ để làm việc tập trung vào nghiệp vụ của actor mình phụ trách.
> 2. Hoặc tiếp tục import qua \src/pages\ và \src/components\ như trước đây mà không gặp bất kỳ lỗi biên dịch nào.
