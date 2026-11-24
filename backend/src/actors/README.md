# 🏗️ Kiến Trúc Phân Hệ Theo Tác Nhân (Actor-Based Architecture) - Backend

Hệ thống Backend **DineGo** được xây dựng trên nền tảng **NestJS** kết hợp **Prisma ORM** và cơ sở dữ liệu **PostgreSQL / SQL Server**.

Nhằm phục vụ cho việc bàn giao code, bảo trì và phát triển tính năng thuận tiện nhất, thư mục \src/actors/\ tổng hợp và liên kết toàn bộ các Module, Controller và Service theo 4 tác nhân chính:

\\\
backend/src/actors/
├── customer/     # 👤 Dành cho Khách Hàng (Customer)
│   ├── index.ts      # Re-export Cart, GroupOrder, AiGuide, Feedback, Payment
│   └── README.md     # Hướng dẫn chi tiết nghiệp vụ Customer
├── merchant/     # 🏪 Dành cho Đối Tác Quán Ăn (Merchant)
│   ├── index.ts      # Re-export Merchant, Catering
│   └── README.md     # Hướng dẫn chi tiết nghiệp vụ Merchant
├── driver/       # 🛵 Dành cho Tài Xế Giao Hàng (Driver)
│   ├── index.ts      # Re-export Tracking, GPS Geocoding
│   └── README.md     # Hướng dẫn chi tiết nghiệp vụ Driver
├── admin/        # 🛡️ Dành cho Quản Trị Viên (Admin)
│   ├── index.ts      # Re-export Dashboard, Quản trị đối tác & tài xế
│   └── README.md     # Hướng dẫn chi tiết nghiệp vụ Admin
└── common/       # 🌐 Dùng chung (Shared)
    ├── index.ts      # Re-export Auth, Order workflow, Promotion, Health
    └── README.md     # Hướng dẫn các module dùng chung
\\\

---

## 📌 Tính Tương Thích & Độc Lập
> [!NOTE]
> Các module nguyên bản trong \src/modules/*\ vẫn giữ nguyên vị trí để đảm bảo quy chuẩn Modular của NestJS trong \AppModule\. Thư mục \src/actors\ đóng vai trò là bản đồ chỉ mục tác nhân (Actor Registry) và cổng xuất module/service theo vai trò, giúp bất kỳ kỹ sư nào khi tiếp nhận dự án cũng có thể định vị và chỉnh sửa chính xác phần nghiệp vụ mong muốn chỉ trong vài giây.
