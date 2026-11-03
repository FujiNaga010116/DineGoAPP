# 🍽️ DineGo — Nền Tảng Đặt Món Trực Tuyến, Mâm Cỗ Sự Kiện & Cổng Thanh Toán MoMo

[![CI/CD Pipeline](https://github.com/FujiNaga010116/DineGoAPP/actions/workflows/ci.yml/badge.svg)](https://github.com/FujiNaga010116/DineGoAPP/actions/workflows/ci.yml)
[![Docker Image Build](https://github.com/FujiNaga010116/DineGoAPP/actions/workflows/docker-build.yml/badge.svg)](https://github.com/FujiNaga010116/DineGoAPP/actions/workflows/docker-build.yml)
[![Database](https://img.shields.io/badge/Database-MS%20SQL%20Server%202022-CC292B?logo=microsoft-sql-server)](https://www.microsoft.com/sql-server)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20+%20Vite-61DAFB?logo=react)](https://react.dev/)

> **Đồ án môn học:** Chuyên đề Node.js & ReactJS (DN26_CPL)  
> **Nhóm thực hiện:** Nhóm 17  
> **Repository:** [https://github.com/FujiNaga010116/DineGoAPP.git](https://github.com/FujiNaga010116/DineGoAPP.git)

---

## 📚 Tài liệu Kiến trúc & Đặc tả Nghiệp vụ (Sprint 1 Baseline)

- 📜 [Đặc tả Yêu cầu Phần mềm (SRS v1.0)](./docs/SRS.md) — 4 luồng nghiệp vụ, UC-01 đến UC-49, Business Rules (BR-01 đến BR-45).
- 🗄️ [Sơ đồ Thực thể Quan hệ (ERD)](./docs/ERD.md) — Sơ đồ Mermaid 16 bảng dữ liệu, giải pháp tránh lỗi SQL Server 1785.
- 📖 [Từ điển Dữ liệu (Data Dictionary)](./docs/DATA_DICTIONARY.md) — Mô tả chi tiết kiểu dữ liệu, ràng buộc, index của 16 bảng.
- 🎨 [Đặc tả Giao diện UI/UX & Wireframe](./docs/UI_UX_SPECIFICATION.md) — Style guide, bảng màu DineGo Emerald, cấu trúc màn hình Customer/Merchant/Admin.
- 🤝 [Quy ước Đóng góp & GitFlow (CONTRIBUTING.md)](./CONTRIBUTING.md) — Quy tắc nhánh, Conventional Commits, tiêu chuẩn PR.

---

## 📌 1. Giới thiệu tổng quan

**DineGo** là hệ sinh thái ứng dụng đặt món ăn trực tuyến hiện đại, kết nối người dùng (Customer), nhà hàng/đối tác (Merchant) và đội ngũ quản trị (Admin). Hệ thống được xây dựng theo kiến trúc **Modular Monolith**, tối ưu hóa hiệu năng, bảo mật giao dịch tài chính với cổng thanh toán điện tử **MoMo All-in-One Gateway v2** và đảm bảo tính toàn vẹn dữ liệu trên hệ quản trị cơ sở dữ liệu **Microsoft SQL Server**.

### Các tính năng cốt lõi:
- 🔐 **Authentication & RBAC:** Đăng ký, đăng nhập JWT (Access Token + Refresh Token), phân quyền theo Role (`CUSTOMER`, `MERCHANT`, `ADMIN`).
- 🛒 **Cart Engine:** Quản lý giỏ hàng thông minh, ràng buộc mỗi giỏ chỉ chứa món của một nhà hàng tại một thời điểm, kiểm soát tình trạng món ăn và topping real-time.
- 🏷️ **Promotion & Voucher Engine:** Hệ thống mã giảm giá (giảm theo % hoặc số tiền cố định), kiểm soát quota sử dụng, chống lạm dụng voucher và tự động hoàn quota khi đơn bị hủy.
- 📦 **Order Engine:** Đặt hàng, snapshot thông tin món ăn/giá tại thời điểm đặt, FSM (Finite State Machine) trạng thái đơn hàng nghiêm ngặt (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `COMPLETED` / `CANCELLED`).
- 💳 **MoMo Payment Gateway (Phase 6):** Tích hợp MoMo All-in-One Gateway v2 (QR Code & App Deeplink), xác thực chữ ký HMAC-SHA256 Timing-Safe, cơ chế CAS (Compare-And-Swap) chống Race Condition và Late IPN.
- 💻 **Frontend Portal:** Giao diện đặt món trực quan, mượt mà xây dựng trên React 19, Vite và TailwindCSS.

---

## 🏗️ 2. Cấu trúc thư mục dự án

```
DineGoAPP/
├── backend/                             # Mã nguồn Server (NestJS 11 + Prisma ORM)
│   ├── prisma/
│   │   ├── migrations/                  # Lịch sử 5 migrations cho Microsoft SQL Server
│   │   └── schema.prisma                # Định nghĩa Prisma Schema & Indexes
│   ├── src/
│   │   ├── common/                      # Guards, Interceptors, Filters, Enums dùng chung
│   │   ├── config/                      # Validation biến môi trường (class-validator)
│   │   ├── modules/
│   │   │   ├── auth/                    # Xác thực & Phân quyền
│   │   │   ├── cart/                    # Xử lý giỏ hàng
│   │   │   ├── merchant/                # Quản lý nhà hàng, menu, topping
│   │   │   ├── order/                   # Động cơ quản lý đơn hàng
│   │   │   ├── payment/                 # MoMo Payment Service & IPN Webhook
│   │   │   └── promotion/               # Khuyến mãi & Voucher
│   │   ├── prisma/                      # Prisma Client Service kết nối SQL Server
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                            # Bộ kiểm thử E2E & Concurrency trên SQL Server
│   │   ├── app.e2e-spec.ts              # E2E Testing
│   │   └── sqlserver-concurrency.spec.ts# 7 kịch bản Concurrency trực tiếp trên SQL Server
│   ├── .env.example                     # File mẫu biến môi trường backend
│   └── package.json
│
├── frontend/                            # Mã nguồn Client (React 19 + TypeScript + Vite)
│   ├── src/
│   │   ├── components/                  # UI Components tái sử dụng
│   │   ├── layouts/                     # Layout giao diện chính
│   │   ├── pages/                       # Các trang (Trang chủ, Menu, Đơn hàng, Thanh toán)
│   │   ├── services/                    # API client giao tiếp với Backend
│   │   ├── types/                       # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── .gitignore                           # Git ignore tổng cho cả Monorepo
└── README.md                            # Hướng dẫn cài đặt và vận hành
```

---

## ⚙️ 3. Yêu cầu môi trường cài đặt (Prerequisites)

Trước khi tiến hành cài đặt, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

1. **Node.js:** Phiên bản `>= 20.x` (Khuyến nghị **Node.js 22.x LTS**).
2. **npm:** Phiên bản `>= 10.x` (đi kèm Node.js).
3. **Microsoft SQL Server:** Phiên bản 2019 hoặc 2022 (Bản Developer hoặc Express).
4. **SQL Server Management Studio (SSMS):** Dùng để quản trị và kiểm tra cơ sở dữ liệu.
5. **Git:** Phiên bản mới nhất.
6. **Docker & Docker Compose (Tùy chọn):** Nếu muốn khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất.

---

## 🐳 Khởi chạy Nhanh Toàn Bộ Bằng Docker Compose (U002)

Nếu máy đã cài Docker Desktop, bạn có thể khởi chạy toàn bộ hệ sinh thái (SQL Server 2022, Redis, Backend NestJS, Frontend React) chỉ với 1 lệnh:

```bash
# Khởi chạy toàn bộ stack trong nền
docker compose up -d --build

# Xem log các container
docker compose logs -f
```

- **Frontend SPA:** [http://localhost](http://localhost) (Cổng 80)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Swagger API Docs:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Microsoft SQL Server 2022:** `localhost:1433` (Password: `DineGo@2026_SecurePass`)
- **Redis Cache:** `localhost:6379`

---

## 🗄️ 4. Hướng dẫn thiết lập Cơ sở dữ liệu (Microsoft SQL Server)

DineGo sử dụng Microsoft SQL Server làm cơ sở dữ liệu chính.

### Bước 4.1: Khởi tạo Database trong SSMS
1. Mở **SQL Server Management Studio (SSMS)** và đăng nhập vào SQL Server instance của bạn (ví dụ: `localhost` hoặc `localhost\SQLEXPRESS`).
2. Mở cửa sổ **New Query** và thực thi câu lệnh SQL sau để tạo cơ sở dữ liệu:
   ```sql
   CREATE DATABASE dinego_db;
   GO
   ```
3. *(Tùy chọn nếu dùng SQL Server Authentication)*: Tạo tài khoản chuyên dụng:
   ```sql
   USE [master];
   GO
   CREATE LOGIN [dinego_user] WITH PASSWORD = N'DineGo@2026_SecurePass', DEFAULT_DATABASE = [dinego_db], CHECK_EXPIRATION = OFF, CHECK_POLICY = OFF;
   GO
   USE [dinego_db];
   GO
   CREATE USER [dinego_user] FOR LOGIN [dinego_user];
   GO
   ALTER ROLE [db_owner] ADD MEMBER [dinego_user];
   GO
   ```

---

## 🚀 5. Hướng dẫn cài đặt & khởi chạy Backend

### Bước 5.1: Cài đặt Dependencies
Mở terminal và di chuyển vào thư mục `backend`:
```bash
cd backend
npm install
```

### Bước 5.2: Cấu hình biến môi trường (`.env`)
Sao chép file `.env.example` thành file `.env`:
```bash
cp .env.example .env
```
*(Trên Windows PowerShell, bạn có thể chạy: `Copy-Item .env.example .env`)*

Mở file `.env` và cập nhật thông tin:
```env
PORT=3000
NODE_ENV=development
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Chuỗi kết nối SQL Server (Tùy theo cấu hình máy bạn):
# Cách 1: Windows Authentication (Khuyên dùng cho máy cá nhân)
DATABASE_URL="sqlserver://localhost:1433;database=dinego_db;integratedSecurity=true;trustServerCertificate=true"

# Cách 2: SQL Server Authentication với user riêng
DATABASE_URL="sqlserver://localhost:1433;database=dinego_db;user=dinego_user;password=DineGo@2026_SecurePass;trustServerCertificate=true"

# JWT Secrets (Tối thiểu 32 ký tự ngẫu nhiên)
JWT_ACCESS_SECRET="dinego_development_jwt_access_secret_key_32_chars"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET="dinego_development_jwt_refresh_secret_key_32_chars"
JWT_REFRESH_EXPIRES_IN=7d

# MoMo Sandbox Credentials (Phase 6)
MOMO_PARTNER_CODE="MOMOBKUN20180529"
MOMO_ACCESS_KEY="klm05TvNBzhg7h7j"
MOMO_SECRET_KEY="at67qH6mk8w5Y1nAyMoYKMWACiEi2Aca"
MOMO_API_ENDPOINT="https://test-payment.momo.vn/v2/gateway/api/create"
MOMO_REDIRECT_URL="http://localhost:5173/payment/result"
MOMO_IPN_URL="http://localhost:3000/api/v1/payments/momo/ipn"
MOMO_ENABLE_SANDBOX_FALLBACK=true
```

### Bước 5.3: Đồng bộ Database với Prisma
Chạy các lệnh sau để khởi tạo Prisma Client và áp dụng toàn bộ 5 migrations có sẵn:
```bash
# 1. Kiểm tra tính hợp lệ của schema
npx prisma validate

# 2. Sinh Prisma Client
npx prisma generate

# 3. Áp dụng các migration lên SQL Server
npx prisma migrate deploy

# 4. Kiểm tra trạng thái migration (Database schema is up to date!)
npx prisma migrate status

# 5. Khởi tạo dữ liệu mẫu 4 vai trò & nhà hàng (Seed Data)
npm run seed
```

Tài khoản mẫu được tạo tự động:
- **Admin:** `admin@dinego.vn` / `DineGo@2026_SecurePass` (Vai trò `ADMIN`)
- **Merchant:** `merchant@dinego.vn` / `DineGo@2026_SecurePass` (Vai trò `MERCHANT`)
- **Driver:** `driver@dinego.vn` / `DineGo@2026_SecurePass` (Vai trò `DRIVER`)
- **Customer:** `customer@dinego.vn` / `DineGo@2026_SecurePass` (Vai trò `CUSTOMER`)

### Bước 5.4: Khởi động Backend Server
```bash
# Chế độ phát triển (Hot reload)
npm run start:dev

# Hoặc chế độ production
npm run build
npm run start:prod
```
Khi khởi động thành công, Backend sẽ lắng nghe tại:
- **API URL:** `http://localhost:3000/api/v1`
- **Swagger Documentation:** `http://localhost:3000/api/docs`

---

## 💻 6. Hướng dẫn cài đặt & khởi chạy Frontend

### Bước 6.1: Cài đặt Dependencies
Mở một cửa sổ terminal mới và di chuyển vào thư mục `frontend`:
```bash
cd frontend
npm install
```

### Bước 6.2: Khởi động Frontend Dev Server
```bash
npm run dev
```
Giao diện người dùng sẽ chạy tại:
- **Client URL:** `http://localhost:5173`

---

## 🧪 7. Kiểm thử & Đảm bảo chất lượng (Quality Assurance)

Dự án trang bị bộ kiểm thử toàn diện từ Unit Test, E2E Test đến kiểm thử Concurrency trực tiếp trên Microsoft SQL Server thật.

### Chạy kiểm tra toàn bộ trong thư mục `backend/`:
```bash
cd backend

# 1. Kiểm tra Linter (oxlint siêu tốc, type-aware)
npm run lint

# 2. Kiểm tra TypeScript Types
npx tsc --noEmit

# 3. Chạy toàn bộ Unit Tests & SQL Server Concurrency Tests
npm run test

# 4. Chạy kiểm thử End-to-End (E2E)
npm run test:e2e

# 5. Chạy riêng bài kiểm thử Concurrency thực tế trên Microsoft SQL Server
npx vitest run test/sqlserver-concurrency.spec.ts
```

### Bảng tóm tắt kết quả kiểm thử:
- ✅ **145/145 Unit & Integration Tests Passed**
- ✅ **30/30 E2E API Tests Passed**
- ✅ **0 errors, 0 warnings** trên toàn bộ 87 tập tin mã nguồn.
- ✅ **7/7 kịch bản Concurrency thực tế trên SQL Server 2022 Passed:**
  1. IPN SUCCESS và `cancelOrder` chạy đồng thời trên cùng đơn hàng.
  2. Hai IPN SUCCESS đến đồng thời.
  3. Hai yêu cầu hủy đơn đến đồng thời.
  4. Late IPN đến sau khi đơn đã hủy (`CANCELLED`).
  5. Late IPN đến sau khi đơn đã hoàn tất (`COMPLETED`).
  6. Voucher quota bảo đảm không bao giờ bị hoàn hai lần khi có xung đột.
  7. Kiểm tra tính toàn vẹn trạng thái giữa bảng `orders` và `payments`.

---

## 🛡️ 8. Cơ chế Bảo mật MoMo Payment Engine (Phase 6)

1. **HMAC Timing-Safe Comparison (`SEC-01`):** Sử dụng `crypto.timingSafeEqual` kết hợp kiểm tra độ dài buffer và định dạng hex 64 ký tự để ngăn chặn hoàn toàn tấn công kênh kề (Side-Channel Timing Attacks).
2. **CAS Conditional Database Update (`SEC-02`):** Cả luồng IPN và luồng hủy đơn đều sử dụng câu lệnh cập nhật có điều kiện `updateMany({ where: { status: PENDING } })` và đối chiếu `count === 1`. Đơn hàng đã hủy tuyệt đối không thể bị IPN ghi đè thành xác nhận.
3. **Cờ đối soát hoàn tiền an toàn:** Khi nhận Late IPN trên đơn đã hủy, Payment được ghi nhận `SUCCESS` (phản ánh MoMo đã trừ tiền) và tự động gắn cờ `refundFlag: 'REFUND_PENDING'` vào trường `gatewayPayload` (`NVARCHAR(MAX)`) để kế toán đối soát hoàn tiền cho khách.
4. **Deadlock Auto-Retry:** Tự động bắt lỗi xung đột khóa của SQL Server (Error 1205) hoặc Prisma (P2034) và thử lại tối đa 3 lần với thuật toán exponential backoff & jitter ngẫu nhiên.
5. **Khóa Sandbox Fallback ở Production:** Tuyệt đối không sinh URL thanh toán mock tại môi trường `production`, `staging`, hoặc `qa`.

---

## 👥 9. Đội ngũ phát triển (Nhóm 17)

- **Đơn vị:** Lớp DN26_CPL — Node.js & ReactJS
- **Nhóm:** Nhóm 17
- **Email liên hệ:** admin@dinego.vn

---
*Chúc bạn có trải nghiệm tuyệt vời khi cài đặt và phát triển cùng DineGo!*

