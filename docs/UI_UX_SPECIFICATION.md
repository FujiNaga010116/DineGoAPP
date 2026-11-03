# TÀI LIỆU ĐẶC TẢ GIAO DIỆN & THIẾT KẾ UI/UX (UI/UX SPECIFICATION)
## Dự án: DineGo — Nền tảng Đặt đồ ăn, Mâm cỗ sự kiện & AI Local Culinary Guide

- **Phân hệ:** Thiết kế & Giao diện (Sprint 1 — User Story U006)  
- **Phiên bản:** v1.0.0  
- **Công nghệ Frontend:** React 19, TypeScript, Vite, TailwindCSS, Lucide Icons  

---

## 1. HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM & STYLE GUIDE)

### 1.1. Bảng màu thương hiệu (Brand Color Palette)
Hệ màu được lấy cảm hứng từ sự tươi mới của nông sản, hương vị ẩm thực truyền thống và sự tiện lợi công nghệ:

| Tên Màu | Mã HEX | Vai Trò Ứng Dụng | Ý Nghĩa Thiết Kế |
| :--- | :---: | :--- | :--- |
| **DineGo Emerald (Primary)** | `#059669` | Màu chủ đạo, nút CTA chính, Header, Logo, Badge trạng thái thành công | Tượng trưng cho nguyên liệu xanh tươi, vệ sinh an toàn thực phẩm |
| **DineGo Accent Orange** | `#F97316` | Màu nhấn, huy hiệu giảm giá, thông báo khuyến mãi, nút Đặt Cọc | Kích thích vị giác, cảm giác ấm cúng của mâm cỗ sum vầy |
| **Surface Light (Background)** | `#F8FAFC` | Nền trang người dùng, thẻ sản phẩm, danh sách quán | Mang lại cảm giác thoáng đãng, dễ đọc |
| **Neutral Dark (Text Primary)**| `#0F172A` | Tiêu đề chính (H1, H2), tên món ăn, giá tiền nổi bật | Độ tương phản cao, tối ưu khả năng tiếp cận (Accessibility) |
| **Neutral Muted (Text Muted)** | `#64748B` | Mô tả phụ, thời gian chuẩn bị món, khoảng cách km | Tránh gây rối mắt cho người dùng |
| **Danger Red** | `#EF4444` | Thông báo lỗi, nút Hủy Đơn, cảnh báo trễ hạn | Cảnh báo thao tác phá hủy hoặc lỗi giao dịch |
| **Warning Amber** | `#F59E0B` | Trạng thái Chờ Duyệt, Chờ Đặt Cọc, Điểm đánh giá sao | Biểu thị trạng thái đang chờ xử lý |

### 1.2. Kiểu chữ (Typography)
- **Font chữ chính:** `Inter`, `Plus Jakarta Sans` hoặc font hệ thống `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`.
- **Cấp bậc văn bản:**
  - `Hero Title`: 32px - 40px, Bold (700)
  - `Heading 1`: 24px - 28px, Bold (700)
  - `Heading 2`: 20px - 22px, Semi-Bold (600)
  - `Body Regular`: 14px - 16px, Normal (400), Line-height 1.5
  - `Caption / Meta`: 12px - 13px, Medium (500)

### 1.3. Lưới giao diện & Độ phân giải đáp ứng (Responsive Grid)
- **Mobile First Viewport:** 375px – 430px (Khách hàng và Tài xế sử dụng di động).
- **Tablet / Small Laptop:** 768px – 1024px.
- **Desktop Dashboard:** 1280px – 1920px (Nhà hàng và Quản trị viên điều hành).

---

## 2. KIẾN TRÚC MÀN HÌNH CHÍNH (SCREEN WIREFRAME BREAKDOWN)

### 2.1. Cổng Khách hàng (Customer Web & Mobile-Web)
1. **Trang Chủ (HomePage):**
   - Header: Logo DineGo, Thanh tìm kiếm địa phương, Địa chỉ giao hàng hiện tại, Giỏ hàng nổi (Floating Cart Button) kèm huy hiệu số lượng món.
   - Hero Banner: Giới thiệu dịch vụ Đặt Đồ Ăn Hàng Ngày & Mâm Cỗ Sự Kiện.
   - Category Carousel: Thức ăn nhanh, Mâm cỗ gia đình, Món ngon Bắc - Trung - Nam, Đồ uống.
   - Danh sách Quán Nổi Bật: Grid thẻ nhà hàng kèm khoảng cách km, đánh giá sao, thời gian giao hàng dự kiến.
2. **Trang Thực Đơn Quán (RestaurantPage):**
   - Cover & Logo quán, giờ hoạt động, địa chỉ, khoảng cách từ vị trí khách.
   - Menu Tabs theo Danh mục món.
   - Dish Card: Ảnh đại diện, tên món, đơn giá, nút chọn option/topping mở Modal chi tiết.
3. **Trang Giỏ Hàng & Thanh Toán (CheckoutPage):**
   - Danh sách món ăn trong giỏ, tùy chỉnh số lượng.
   - Lựa chọn hình thức nhận hàng (Giao tận nơi / Tự đến lấy).
   - Bản đồ mini xác định vị trí giao hàng & hiển thị phí ship.
   - Ô nhập mã Voucher khuyến mãi & xem số tiền được giảm.
   - Chọn phương thức thanh toán: MoMo (QR Code / Deeplink) hoặc COD (Tiền mặt).
4. **Trang Quản Lý Đơn Hàng & Lịch Sử (OrdersPage):**
   - Tabs: `Đang xử lý` / `Lịch sử đơn`.
   - Tiến trình trực quan FSM: `Chờ xác nhận` → `Đang nấu` → `Đang giao` → `Hoàn tất`.
   - Nút Đặt lại đơn cũ nhanh chóng.
5. **Widget Chat AI Local Culinary Guide:**
   - Bong bóng chat góc phải màn hình, hỗ trợ SSE streaming, gợi ý các câu hỏi nhanh ("Gợi ý quán bún bò chuẩn vị gần tôi", "Mâm cỗ 10 người ngân sách 3 triệu").

### 2.2. Phân hệ Mâm Cỗ Sự Kiện (Event Catering Flow)
1. **Trang Khám Phá Mâm Cỗ:**
   - Lọc theo loại hình sự kiện: Tiệc cưới, Giỗ chạp, Tân gia, Tiệc công ty.
   - Thẻ mâm cỗ: Số lượng món/mâm, số người phục vụ, đơn giá trọn gói.
2. **Trang Tùy Biến Mâm Cỗ (Custom Feast Planner):**
   - Giao diện kéo/thả hoặc checkbox thêm/bớt/đổi món.
   - Bộ tính toán giá tự động theo thời gian thực (Real-time Pricing Engine).
   - Lịch chọn ngày tổ chức sự kiện: Kiểm tra công suất và slot phục vụ trống của quán.
3. **Trang Đặt Cọc & Thanh Toán 2 Đợt:**
   - Hiển thị tỷ lệ cọc: Đợt 1 (30% - 50%) thanh toán ngay qua MoMo.
   - Đợt 2 (phần còn lại) thanh toán trước ngày diễn ra sự kiện.
   - Chính sách hoàn cọc minh bạch: Hoàn 100% nếu hủy trước 7 ngày, 50% nếu hủy trước 3 ngày.

### 2.3. Bảng Điều Khiển Nhà Hàng (Merchant Dashboard)
- **Menu Management:** Quản lý món ăn, tùy chọn topping, bật/tắt trạng thái còn hàng.
- **Order Processing Board:** Bảng Kanban các đơn hàng phát sinh thời gian thực qua Webhook/Socket.io.
- **Feast Booking Calendar:** Lịch hiển thị các ngày đã kín chỗ hoặc chặn ngày nghỉ phục vụ.
- **Revenue Analytics:** Biểu đồ doanh thu ngày, tuần, tháng và đối soát hoa hồng.

### 2.4. Bảng Điều Khiển Quản Trị Hệ Thống (Admin Dashboard)
- **Tổng quan sàn:** GMV, tổng số đơn thường & mâm cỗ, lượng người dùng hoạt động.
- **Duyệt hồ sơ Quán:** Kiểm tra giấy phép kinh doanh, vệ sinh an toàn thực phẩm trước khi kích hoạt.
- **Quản trị Tri thức Ẩm thực:** Nhập dữ liệu đặc sản vùng miền làm nguồn tri thức cho AI RAG.
- **Xử lý Khiếu nại & Đối soát:** Thụ lý tranh chấp, đưa ra phán quyết hoàn tiền.

