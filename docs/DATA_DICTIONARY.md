# Từ Điển Dữ Liệu (Data Dictionary) — DineGo Platform

> **Phân hệ:** CSDL Tổng Thể (Sprint 1 — User Story U004)  
> **Cơ sở dữ liệu:** Microsoft SQL Server 2022 (`dinego_db`)  
> **Phiên bản tài liệu:** v1.0.0

---

## 1. Bảng `users` (Quản lý Tài khoản Người dùng)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `VARCHAR(36)` / UUID | **PK** | Không | `NEWID()` | Mã định danh duy nhất của người dùng |
| `email` | `NVARCHAR(255)` | **UK** | Không | Không | Địa chỉ email đăng nhập duy nhất |
| `password_hash`| `NVARCHAR(255)` | - | Không | Không | Mật khẩu băm an toàn bằng bcryptjs (salt cost 10) |
| `full_name` | `NVARCHAR(255)` | - | Không | Không | Họ và tên đầy đủ của người dùng |
| `phone_number` | `NVARCHAR(50)` | **UK** | Có | `NULL` | Số điện thoại liên hệ (duy nhất nếu có) |
| `avatar_url` | `NVARCHAR(MAX)` | - | Có | `NULL` | Đường dẫn ảnh đại diện |
| `is_email_verified` | `BIT` | - | Không | `0` (false) | Cờ xác thực email qua OTP |
| `is_active` | `BIT` | - | Không | `1` (true) | Trạng thái kích hoạt tài khoản |
| `created_at` | `DATETIME2` | - | Không | `SYSUTCDATETIME()` | Thời điểm tạo bản ghi |
| `updated_at` | `DATETIME2` | - | Không | `SYSUTCDATETIME()` | Thời điểm cập nhật cuối cùng |

---

## 2. Bảng `user_roles` (Phân quyền Vai trò Người dùng)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `VARCHAR(36)` / UUID | **PK** | Không | `NEWID()` | Mã định danh bản ghi phân quyền |
| `user_id` | `VARCHAR(36)` / UUID | **FK** | Không | Không | Tham chiếu `users(id)` |
| `role` | `NVARCHAR(50)` | - | Không | `'CUSTOMER'` | Vai trò: `CUSTOMER`, `MERCHANT`, `DRIVER`, `ADMIN` |
| `created_at` | `DATETIME2` | - | Không | `SYSUTCDATETIME()` | Thời điểm gán vai trò |

---

## 3. Bảng `user_sessions` (Phiên Đăng nhập & Thu hồi Token)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `VARCHAR(36)` / UUID | **PK** | Không | `NEWID()` | Mã phiên đăng nhập |
| `user_id` | `VARCHAR(36)` / UUID | **FK** | Không | Không | Tham chiếu `users(id)` |
| `token_hash` | `NVARCHAR(255)` | - | Không | Không | Băm bcrypt của refresh token |
| `is_revoked` | `BIT` | - | Không | `0` (false) | Cờ thu hồi phiên khi logout hoặc token rotation |
| `expires_at` | `DATETIME2` | - | Không | Không | Thời điểm hết hạn phiên (mặc định 7 ngày) |
| `created_at` | `DATETIME2` | - | Không | `SYSUTCDATETIME()` | Thời điểm đăng nhập |
| `updated_at` | `DATETIME2` | - | Không | `SYSUTCDATETIME()` | Thời điểm cập nhật trạng thái phiên |

---

## 4. Bảng `merchants` (Nhà hàng & Đối tác ẩm thực)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `VARCHAR(36)` / UUID | **PK** | Không | `NEWID()` | Mã định danh quán ăn |
| `owner_id` | `VARCHAR(36)` / UUID | **FK** | Không | Không | Người sở hữu quán (`users(id)`) |
| `name` | `NVARCHAR(255)` | - | Không | Không | Tên hiển thị của nhà hàng |
| `slug` | `NVARCHAR(255)` | **UK** | Không | Không | URL thân thiện duy nhất |
| `description` | `NVARCHAR(MAX)` | - | Có | `NULL` | Giới thiệu quán, phong cách ẩm thực |
| `address` | `NVARCHAR(500)` | - | Không | Không | Địa chỉ trụ sở phục vụ |
| `latitude` | `DECIMAL(10,7)` | - | Có | `NULL` | Tọa độ vĩ độ định vị địa lý |
| `longitude`| `DECIMAL(10,7)` | - | Có | `NULL` | Tọa độ kinh độ định vị địa lý |
| `phone_number`| `NVARCHAR(50)` | - | Không | Không | Số điện thoại liên hệ quán |
| `logo_url` | `NVARCHAR(MAX)` | - | Có | `NULL` | Ảnh logo thương hiệu |
| `cover_url`| `NVARCHAR(MAX)` | - | Có | `NULL` | Ảnh bìa quán |
| `status` | `NVARCHAR(50)` | - | Không | `'PENDING'` | Trạng thái: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED` |
| `delivery_type`| `NVARCHAR(50)` | - | Không | `'DINEGO_SHIPPER'` | Loại giao hàng: `MERCHANT_SELF`, `DINEGO_SHIPPER`, `BOTH` |
| `is_open` | `BIT` | - | Không | `1` (true) | Đang mở cửa đón khách hay tạm đóng |
| `is_active`| `BIT` | - | Không | `1` (true) | Quán có đang được kích hoạt vận hành |
| `rating` | `DECIMAL(3,2)` | - | Không | `0.00` | Điểm đánh giá trung bình (1.00 - 5.00) |

---

## 5. Bảng `categories` (Danh mục Món ăn)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `VARCHAR(36)` / UUID | **PK** | Không | `NEWID()` | Mã danh mục |
| `merchant_id` | `VARCHAR(36)` / UUID | **FK** | Không | Không | Tham chiếu `merchants(id)` |
| `name` | `NVARCHAR(255)` | - | Không | Không | Tên danh mục (ví dụ: Món Chính, Nước, Tráng Miệng) |
| `description` | `NVARCHAR(MAX)` | - | Có | `NULL` | Mô tả danh mục |
| `display_order` | `INT` | - | Không | `0` | Thứ tự hiển thị menu |
| `is_active` | `BIT` | - | Không | `1` | Trạng thái danh mục |

---

## 6. Bảng `menu_items` (Món ăn / Đồ uống)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `VARCHAR(36)` / UUID | **PK** | Không | `NEWID()` | Mã món ăn |
| `merchant_id` | `VARCHAR(36)` / UUID | **FK** | Không | Không | Tham chiếu `merchants(id)` |
| `category_id` | `VARCHAR(36)` / UUID | **FK** | Không | Không | Tham chiếu `categories(id)` |
| `name` | `NVARCHAR(255)` | - | Không | Không | Tên món ăn |
| `description` | `NVARCHAR(MAX)` | - | Có | `NULL` | Mô tả thành phần, khẩu vị |
| `price` | `DECIMAL(10,2)` | - | Không | Không | Đơn giá món ăn (VNĐ) |
| `image_url` | `NVARCHAR(MAX)` | - | Có | `NULL` | Ảnh chụp thực tế của món |
| `is_available` | `BIT` | - | Không | `1` | Còn hàng hay tạm hết |
| `preparation_time` | `INT` | - | Không | `15` | Thời gian chế biến dự kiến (phút) |

---

## 7. Bảng `toppings` (Topping / Tùy chọn Thêm)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `VARCHAR(36)` / UUID | **PK** | Không | `NEWID()` | Mã topping |
| `merchant_id` | `VARCHAR(36)` / UUID | **FK** | Không | Không | Tham chiếu `merchants(id)` |
| `name` | `NVARCHAR(255)` | - | Không | Không | Tên topping (Ví dụ: Thêm trứng ốp la, Trân châu) |
| `price` | `DECIMAL(10,2)` | - | Không | `0.00` | Giá phụ thu topping |
| `is_available` | `BIT` | - | Không | `1` | Topping còn phục vụ hay hết |

---

## 8. Bảng `menu_item_toppings` (Liên kết Món ăn và Topping)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `menu_item_id` | `VARCHAR(36)` / UUID | **PK, FK** | Không | Không | Tham chiếu `menu_items(id)` |
| `topping_id` | `VARCHAR(36)` / UUID | **PK, FK** | Không | Không | Tham chiếu `toppings(id)` |

---

## 9. Bảng `carts` & `cart_items` & `cart_item_toppings` (Giỏ hàng Người dùng)

- `carts`: Lưu trữ giỏ hàng riêng biệt của mỗi người dùng (`userId` UNIQUE).
- `cart_items`: Lưu các món ăn trong giỏ, số lượng và ghi chú của khách. Ràng buộc nghiệp vụ: Một giỏ hàng tại một thời điểm chỉ chứa món của cùng 1 nhà hàng.
- `cart_item_toppings`: Danh sách topping đi kèm từng item trong giỏ.

---

## 10. Bảng `promotions` & `promotion_usages` (Mã giảm giá & Quota)

- `promotions`: Quản lý voucher (`code` UNIQUE, `discount_type`: `PERCENTAGE` hoặc `FIXED_AMOUNT`, `min_order_value`, `max_discount`, `usage_limit`, `used_count`).
- `promotion_usages`: Ghi nhận lượt sử dụng theo đơn hàng. Khi đơn hàng bị hủy hợp lệ, hệ thống hoàn quota nguyên tử bằng CAS update giảm `used_count` và xóa/đánh dấu lượt dùng.

---

## 11. Bảng `orders`, `order_items`, `order_item_toppings` (Đơn hàng)

- `orders`:
  - `id`: Mã UUID nội bộ.
  - `order_code`: Mã đơn thân thiện định dạng `DGYYYYMMDD-XXXXXX`.
  - `status`: FSM chuyển trạng thái `PENDING` → `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP` → `COMPLETED` / `CANCELLED`.
  - Snapshot địa chỉ giao, tên khách, số điện thoại, phí ship, giảm giá voucher, tổng tiền.
- `order_items`: Snapshot tên món ăn, đơn giá tại thời điểm đặt hàng.
- `order_item_toppings`: Snapshot tên topping và giá topping tại thời điểm đặt.

---

## 12. Bảng `payments` (Cổng Thanh Toán MoMo & Lịch sử Giao Dịch)

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép NULL | Mặc Định | Mô Tả Nghiệp Vụ |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `VARCHAR(36)` / UUID | **PK** | Không | `NEWID()` | Mã định danh giao dịch thanh toán |
| `order_id` | `VARCHAR(36)` / UUID | **FK, UK** | Không | Không | Quan hệ 1-1 với đơn hàng `orders(id)` |
| `payment_method` | `NVARCHAR(50)` | - | Không | Không | `MOMO`, `MOMO_QR`, `MOMO_ATM`, `COD` |
| `amount` | `DECIMAL(10,2)` | - | Không | Không | Số tiền giao dịch bắt buộc thanh toán |
| `payment_status` | `NVARCHAR(50)` | - | Không | `'PENDING'` | Trạng thái: `PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`, `REFUNDED` |
| `transaction_ref`| `NVARCHAR(255)` | - | Có | `NULL` | Mã tham chiếu đơn hàng gửi sang MoMo |
| `request_id` | `NVARCHAR(255)` | **UK** | Có | `NULL` | Request ID duy nhất gửi MoMo Gateway |
| `momo_trans_id` | `NVARCHAR(255)` | - | Có | `NULL` | Mã giao dịch MoMo cấp sau khi thanh toán |
| `pay_url` | `NVARCHAR(MAX)` | - | Có | `NULL` | Link thanh toán QR Code / Web của MoMo |
| `gateway_payload`| `NVARCHAR(MAX)` | - | Có | `NULL` | Dữ liệu phản hồi nguyên bản của IPN MoMo |
| `paid_at` | `DATETIME2` | - | Có | `NULL` | Thời điểm khách quét mã thanh toán thành công |
| `created_at` | `DATETIME2` | - | Không | `SYSUTCDATETIME()` | Thời điểm tạo yêu cầu thanh toán |

