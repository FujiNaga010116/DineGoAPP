# ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS — SOFTWARE REQUIREMENTS SPECIFICATION)
## Dự án: DineGo — Nền tảng Đặt đồ ăn, Mâm cỗ sự kiện & AI Local Culinary Guide

- **Mã môn học:** DN26_CPL (Chuyên đề Node.js & ReactJS)  
- **Nhóm thực hiện:** Nhóm 17  
- **Phiên bản:** v1.0.0 (Chốt Baseline Sprint 1)  
- **Ngày ban hành:** 30/10/2026  

---

## 1. GIỚI THIỆU TỔNG QUAN (INTRODUCTION)

### 1.1. Mục đích
Tài liệu Đặc tả Yêu cầu Phần mềm (SRS) này xác định các yêu cầu chức năng, yêu cầu phi chức năng, các quy tắc nghiệp vụ (Business Rules) và kiến trúc tổng quan của nền tảng **DineGo**. Đây là căn cứ kỹ thuật chính thức cho Product Backlog, kế hoạch kiểm thử (Test Plan) và tiêu chí nghiệm thu (Definition of Done) trong suốt 6 Sprint của dự án.

### 1.2. Phạm vi sản phẩm
DineGo là nền tảng thương mại điện tử ẩm thực toàn diện phục vụ 4 đối tượng người dùng chính:
1. **Khách hàng (Customer):** Đặt món ăn hàng ngày, đặt nhóm thời gian thực (Group Order), tùy biến và đặt mâm cỗ sự kiện với cơ chế đặt cọc, tương tác với trợ lý ảo AI Local Culinary Guide và theo dõi vị trí giao hàng theo thời gian thực.
2. **Nhà hàng / Đối tác ẩm thực (Merchant):** Quản lý hồ sơ quán, danh mục, món ăn, topping, tiếp nhận và xử lý đơn hàng ngày, phê duyệt và báo giá mâm cỗ sự kiện, theo dõi lịch phục vụ và quản lý doanh thu.
3. **Tài xế giao hàng (Shipper / Driver):** Tiếp nhận đơn hàng theo khoảng cách gần nhất, cập nhật trạng thái đơn hàng trên lộ trình và truyền phát tọa độ GPS thời gian thực.
4. **Quản trị viên hệ thống (Admin):** Kiểm duyệt quán ăn mới, giám sát toàn diện giao dịch (GMV), quản trị người dùng, quản trị tri thức ẩm thực địa phương (RAG Vector Database), xử lý khiếu nại và đối soát doanh thu cuối tháng.

---

## 2. KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ BẮT BUỘC

- **Kiến trúc Backend:** Modular Monolith trên nền tảng **NestJS 11** & **TypeScript 5.7**.
- **Cơ sở dữ liệu chính:** **Microsoft SQL Server 2022** (Chống lỗi Multiple Cascade Paths 1785 thông qua `onDelete: NoAction`).
- **ORM:** **Prisma ORM v6**.
- **Frontend Portal:** **React 19**, **TypeScript**, **Vite**, **TailwindCSS**, Axios interceptors và Single Page Application (SPA).
- **Cổng thanh toán:** **MoMo All-in-One Gateway v2** (QR Code, App Deeplink, HMAC-SHA256 Timing-Safe).
- **Thời gian thực & Định vị:** **Socket.io**, Geolocation API, công thức tính khoảng cách Haversine.
- **Trí tuệ nhân tạo (AI):** **OpenAI GPT-4o-mini**, RAG (Retrieval-Augmented Generation), Function Calling và Guardrail kiểm soát nội dung ẩm thực địa phương.

---

## 3. DANH SÁCH TÁC NHÂN HỆ THỐNG (ACTORS)

| Tác nhân | Ký hiệu Role | Mô tả vai trò và quyền hạn |
| :--- | :---: | :--- |
| **Khách hàng** | `CUSTOMER` | Người dùng tìm kiếm món ăn, tạo giỏ hàng, đặt món, đặt cọc mâm cỗ, chat với AI và đánh giá đơn hàng. |
| **Nhà hàng** | `MERCHANT` | Đối tác kinh doanh có quán ăn, quản lý thực đơn, duyệt đơn hàng và cấu hình mâm cỗ sự kiện. |
| **Tài xế** | `DRIVER` | Đối tác giao nhận thực phẩm từ quán đến địa chỉ khách hàng. |
| **Quản trị viên** | `ADMIN` | Quản trị viên cấp cao nhất, có toàn quyền trên hệ sinh thái DineGo. |

---

## 4. DANH SÁCH USE CASE CHI TIẾT THEO 4 LUỒNG NGHIỆP VỤ

### 4.1. Nền tảng & Xác thực (Core Identity & RBAC)
- **UC-01 (Đăng ký tài khoản & OTP):** Người dùng đăng ký bằng Email/Số điện thoại, nhận mã OTP 6 chữ số để kích hoạt tài khoản.
- **UC-02 (Đăng nhập & Duy trì phiên JWT):** Đăng nhập bằng Email/Mật khẩu hoặc Google OAuth, hệ thống cấp cặp Access Token (15m) và Refresh Token (7d) có cơ chế xoay vòng token (Token Rotation).
- **UC-03 (Phân quyền RBAC 4 vai trò):** Chặn truy cập trái phép bằng `RolesGuard` và `@Roles(...)` ở cả tầng API Backend và Route Guard Frontend.
- **UC-04 (Quên mật khẩu & Quản lý hồ sơ):** Yêu cầu mã đặt lại mật khẩu qua email; cập nhật thông tin cá nhân và sổ địa chỉ giao hàng.

### 4.2. Luồng 1: Đặt đồ ăn hằng ngày & Giao hàng (Daily Food & Delivery)
- **UC-10:** Merchant đăng ký quán và cập nhật thông tin (giờ mở cửa, tọa độ, địa chỉ).
- **UC-11:** Merchant CRUD danh mục món, món ăn kèm topping và tồn kho.
- **UC-12:** Khách hàng duyệt danh sách quán ăn và xem chi tiết thực đơn.
- **UC-13:** Tìm kiếm quán và món ăn theo tên, lọc theo khoảng cách bán kính địa lý.
- **UC-14:** Quản lý giỏ hàng (Cart Engine): ràng buộc giỏ hàng đơn nhà hàng, validate topping hợp lệ.
- **UC-15:** Chọn địa chỉ giao hàng trên bản đồ, tự động tính phí giao hàng theo khoảng cách.
- **UC-16:** Checkout đơn thường (COD hoặc Ví MoMo) kèm áp dụng mã giảm giá voucher.
- **UC-17:** Merchant nhận thông báo đơn hàng mới, xác nhận chuẩn bị và thông báo sẵn sàng giao.
- **UC-18:** Tạo phòng đặt nhóm (Group Order) qua link chia sẻ, đồng bộ giỏ hàng chung real-time bằng Socket.io.
- **UC-19:** Xem lịch sử đơn hàng và đặt lại đơn cũ bằng 1 chạm.

### 4.3. Luồng 2: Mâm cỗ sự kiện & Đặt cọc 2 đợt (Event Catering & Deposit)
- **UC-20:** Merchant tạo gói mâm cỗ mẫu (số người, thực đơn, đơn giá, công suất tối đa/ngày).
- **UC-21:** Khách hàng xem danh mục mâm cỗ theo loại sự kiện (cưới hỏi, giỗ chạp, tân gia, liên hoan).
- **UC-22:** Đặt cọc đợt 1 (30% - 50%) qua MoMo / Cổng thanh toán điện tử.
- **UC-23:** Thanh toán đợt 2 (phần còn lại) trước ngày diễn ra sự kiện.
- **UC-24:** Tùy biến mâm cỗ (thêm/bớt/đổi món) và nhận báo giá tự động theo thời gian thực.
- **UC-25:** Đặt lịch trước (tối thiểu 3 ngày) và kiểm tra slot trống của nhà hàng chống trùng lịch.
- **UC-26:** Merchant xem lịch đặt cỗ dạng Calendar và thiết lập chặn ngày bận.
- **UC-27:** Merchant phê duyệt, từ chối hoặc gửi đề xuất chỉnh sửa thực đơn cỗ cho khách.
- **UC-28:** Theo dõi tiến trình đơn cỗ (`Chờ duyệt` → `Chờ cọc` → `Đã cọc` → `Đang chuẩn bị` → `Hoàn tất`).
- **UC-29:** Hệ thống gửi thông báo nhắc lịch và nhắc thanh toán đợt 2 qua in-app và email.

### 4.4. Luồng 3: AI Local Culinary Guide & Real-time Tracking
- **UC-30:** Giao diện trò chuyện tương tác với AI Local Culinary Guide (SSE Streaming).
- **UC-31:** Trợ lý ảo gợi ý món ăn và quán ăn địa phương theo ngữ cảnh (ngân sách, số người, khẩu vị).
- **UC-32:** Quản trị cơ sở tri thức ẩm thực địa phương (Vector Database RAG).
- **UC-33:** Tìm kiếm và lọc món ăn bằng câu lệnh ngôn ngữ tự nhiên.
- **UC-34:** Tài xế nhận đơn hàng, xem lộ trình và cập nhật tiến trình giao hàng.
- **UC-35:** Truyền phát vị trí GPS của tài xế theo thời gian thực (Socket.io room).
- **UC-36:** Geofencing: Tự động phát hiện tài xế đến gần quán/khách trong bán kính 100m để đổi trạng thái đơn.
- **UC-37:** Khách hàng theo dõi vị trí tài xế di chuyển trên bản đồ trực quan kèm ước lượng ETA.

### 4.5. Luồng 4: Admin & Merchant Dashboard, Đánh giá & Khiếu nại
- **UC-40:** Dashboard thống kê doanh thu, món bán chạy cho Merchant.
- **UC-41:** Dashboard tổng quan toàn sàn cho Admin (GMV, số lượng đơn theo luồng, tăng trưởng).
- **UC-42:** Admin kiểm duyệt quán ăn mới, khóa hoặc mở khóa tài khoản đối tác vi phạm.
- **UC-43:** Đối soát doanh thu cuối tháng giữa sàn và nhà hàng, xuất báo cáo đối soát Excel/PDF.
- **UC-44:** Khách hàng gửi đánh giá kèm chấm sao và hình ảnh sau khi hoàn thành đơn.
- **UC-45:** Nhà hàng phản hồi đánh giá của khách hàng.
- **UC-46:** Hủy đơn hàng thường theo quy tắc trạng thái và hoàn tiền tự động nếu đã thanh toán.
- **UC-47:** Hủy đơn mâm cỗ và tính toán tỷ lệ hoàn cọc theo mốc thời gian trước sự kiện.
- **UC-48:** Khách hàng gửi khiếu nại; Admin thụ lý và đưa ra quyết định đền bù/hoàn tiền.
- **UC-49:** Tạo và quản lý mã khuyến mãi voucher (giới hạn số lượt, giá trị đơn tối thiểu).

---

## 5. QUY TẮC NGHIỆP VỤ BẮT BUỘC (BUSINESS RULES)

- **BR-01 (Mật khẩu & Mã hóa):** Mật khẩu người dùng tối thiểu 6 ký tự, phải được băm bằng bcrypt với salt cost 10 trước khi lưu DB.
- **BR-02 (Cặp JWT Token):** Access Token có thời hạn 15 phút, Refresh Token có thời hạn 7 ngày. Khi làm mới, phiên cũ bị thu hồi ngay lập tức để chống tấn công phát lại token.
- **BR-12 (Giới hạn Giỏ hàng):** Một giỏ hàng của khách chỉ được chứa các món ăn thuộc về DUY NHẤT 1 nhà hàng. Nếu thêm món từ quán khác, hệ thống yêu cầu xác nhận làm mới giỏ hàng.
- **BR-13 (Phí giao hàng theo khoảng cách):**
  - Dưới 2 km: Cố định 15.000 VNĐ.
  - Từ 2 km đến 5 km: 15.000 + 5.000 VNĐ/km phát sinh.
  - Trên 5 km: 30.000 + 7.000 VNĐ/km phát sinh.
- **BR-14 (Ràng buộc Voucher):**
  - Đơn hàng chỉ được áp dụng tối đa 1 voucher.
  - Giá trị đơn hàng tối thiểu phải $\ge$ `minOrderValue`.
  - Quota voucher giảm ngay khi đơn tạo; nếu đơn bị hủy hợp lệ, quota phải được hoàn trả chính xác 1 lần bằng CAS update.
- **BR-21 (Tỷ lệ đặt cọc mâm cỗ):** Đơn mâm cỗ bắt buộc đặt cọc tối thiểu từ 30% đến 50% tổng giá trị đơn để được xác nhận giữ lịch phục vụ.
- **BR-24 (Thời gian đặt mâm cỗ tối thiểu):** Khách hàng phải đặt trước ngày diễn ra sự kiện tối thiểu 3 ngày (72 giờ) để nhà hàng đủ thời gian chuẩn bị thực phẩm.
- **BR-43 (Quy tắc hủy đơn thường):** Khách hàng chỉ được hủy đơn miễn phí khi đơn còn ở trạng thái `PENDING`. Khi nhà hàng đã chuyển sang `CONFIRMED` hoặc `PREPARING`, khách không được tự ý hủy qua app.
- **BR-44 (Chính sách hoàn cọc mâm cỗ):**
  - Hủy trước sự kiện $\ge$ 7 ngày: Hoàn trả 100% tiền cọc.
  - Hủy trước sự kiện từ 3 đến 6 ngày: Hoàn trả 50% tiền cọc.
  - Hủy trước sự kiện $< 3$ ngày (hoặc $< 72$ giờ): Không hoàn cọc (100% tiền cọc thuộc về nhà hàng bù đắp chi phí nguyên vật liệu).
- **BR-45 (Bảo mật MoMo IPN & Chữ ký Timing-Safe):** Xác thực chữ ký IPN từ MoMo bằng `crypto.timingSafeEqual` để triệt tiêu lỗ hổng Timing Attack. Kiểm soát CAS update để ngăn chặn Late IPN khôi phục đơn đã CANCELLED thành CONFIRMED.

---

## 6. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

- **NFR-01 (Tính Bảo trì & Chuẩn hoá Mã nguồn):** Kiến trúc Modular Monolith rõ ràng, tuân thủ Clean Code, không sử dụng `any`, có tài liệu API Swagger đầy đủ tại `/api/docs`.
- **NFR-02 (Tính Khả dụng & Đóng gói):** Toàn bộ ứng dụng có thể khởi chạy môi trường dev và staging bằng 1 lệnh duy nhất `docker compose up`. Có pipeline CI/CD kiểm tra tự động trước mỗi merge.
- **NFR-03 (Hiệu năng Hệ thống):** Thời gian phản hồi API trung bình đạt p95 $< 500$ ms. Hỗ trợ tối thiểu 200 người dùng đồng thời (CCU).
- **NFR-04 (Bảo mật theo OWASP Top 10):** Chống SQL Injection bằng Prisma Parameterized Queries; chống XSS/CSRF; Rate Limiting các endpoint nhạy cảm (Login, Register, OTP); Timing-Safe HMAC Verification.
- **NFR-05 (An toàn AI & Kiểm soát Chi phí):** Guardrail AI giới hạn chỉ tư vấn thông tin liên quan đến ẩm thực Việt Nam và các món ăn trên sàn DineGo, từ chối trả lời nội dung nhạy cảm/chính trị; Rate Limit 20 truy vấn chat/giờ cho mỗi khách hàng.

