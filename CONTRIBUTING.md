# Quy ước Đóng góp & Phát triển Dự án DineGo (CONTRIBUTING.md)

Chào mừng bạn đến với dự án **DineGo – Nền tảng Đặt đồ ăn, Mâm cỗ sự kiện & AI Local Culinary Guide** (Nhóm 17).
Tài liệu này quy định các chuẩn mực về GitFlow, quy tắc commit, kiểm thử và quy trình Pull Request (PR) nhằm đảm bảo tính nhất quán và chất lượng mã nguồn của toàn đội ngũ.

---

## 1. Mô hình Phân nhánh (GitFlow)

Dự án áp dụng mô hình phân nhánh GitFlow chuẩn hoá:

```
main (Production-ready, chỉ nhận merge từ release/* hoặc hotfix/* có tag)
  │
develop (Nhánh tích hợp chính, nhận merge từ feature/*)
  ├── feature/U007-auth-register
  ├── feature/U018-order-checkout
  └── bugfix/fix-momo-signature
```

### Quy tắc đặt tên nhánh:
- **Tính năng mới (Feature):** `feature/U<mã_user_story>-<tên-ngắn-gọn>`  
  *Ví dụ:* `feature/U007-auth-register`, `feature/U018-checkout-voucher`
- **Sửa lỗi thường (Bugfix):** `bugfix/<mô-tả-lỗi>`  
  *Ví dụ:* `bugfix/fix-token-expiration`, `bugfix/cart-item-count`
- **Sửa lỗi khẩn cấp (Hotfix):** `hotfix/<phiên-bản>-<mô-tả>`  
  *Ví dụ:* `hotfix/v1.0.1-ipn-security`
- **Nhánh phát hành (Release):** `release/v<major>.<minor>.<patch>`  
  *Ví dụ:* `release/v1.0.0`

> ⚠️ **Quy tắc tuyệt đối:** Không push code trực tiếp lên nhánh `main` hoặc `develop`. Mọi thay đổi phải thông qua Pull Request có ít nhất 1 thành viên review và phê duyệt.

---

## 2. Quy ước Đặt tên Commit (Conventional Commits)

Mỗi commit message phải tuân thủ chuẩn **Conventional Commits**:

```
<type>(<scope>): <mô tả ngắn bằng tiếng Việt hoặc tiếng Anh>

[Tùy chọn: mô tả chi tiết lý do và giải pháp]
[Tùy chọn: Footer tham chiếu User Story hoặc Issue]
```

### Các `type` được chấp nhận:
- `feat`: Tính năng mới cho người dùng hoặc API mới.
- `fix`: Sửa lỗi trong mã nguồn.
- `docs`: Bổ sung, cập nhật tài liệu (SRS, ERD, README,...).
- `style`: Thay đổi định dạng code (khoảng trắng, format) không ảnh hưởng logic.
- `refactor`: Tái cấu trúc code mà không sửa lỗi hay thêm tính năng.
- `perf`: Tối ưu hoá hiệu năng truy vấn, thuật toán hoặc rendering.
- `test`: Thêm hoặc chỉnh sửa unit test, e2e test.
- `chore`: Thay đổi cấu hình build, package dependencies, CI/CD pipeline.

### Ví dụ commit chuẩn:
```bash
feat(auth): bổ sung API đăng ký xác thực qua OTP (U007)
fix(payment): ngăn chặn late IPN ghi đè trạng thái CANCELLED (SEC-02)
docs(erd): cập nhật sơ đồ thực thể và data dictionary 16 bảng (U004)
test(order): bổ sung unit test cho luồng rollback voucher khi hủy đơn
```

---

## 3. Tiêu chuẩn Mã nguồn & Linter

### Backend (NestJS 11 + TypeScript 5.7 + Prisma ORM v6):
- Chạy linter trước khi commit:
  ```bash
  npm run lint
  ```
- Định dạng code tự động:
  ```bash
  npm run format
  ```
- Kiểm tra toàn bộ Unit Test:
  ```bash
  npm test
  ```
- Tuyệt đối không sử dụng `any` không kiểm soát; định nghĩa rõ Interface/DTO với `class-validator`.
- Luôn xử lý giao dịch cơ sở dữ liệu trên Microsoft SQL Server bằng transaction an toàn (`$transaction`), tránh SQL Server Error 1785 bằng `onDelete: NoAction`.

### Frontend (React 19 + TypeScript + Vite + TailwindCSS):
- Kiểm tra build tĩnh trước khi mở PR:
  ```bash
  npm run build
  ```
- Đặt tên component theo chuẩn PascalCase (`RestaurantCard.tsx`, `CartDrawer.tsx`).
- Tách biệt logic API gọi backend trong thư mục `src/api/` hoặc `src/services/`.

---

## 4. Quy trình Mở Pull Request (PR)

1. Đảm bảo nhánh làm việc đã rebase hoặc merge code mới nhất từ nhánh `develop`.
2. Kiểm tra tất cả unit test và linter trên local đều đạt kết quả PASS (xanh).
3. Điền đầy đủ thông tin theo mẫu **PR Template** (`.github/pull_request_template.md`).
4. Gán ít nhất 1 Reviewer (thành viên khác trong nhóm kiểm tra chéo).
5. Sau khi Reviewer chấp thuận và CI/CD GitHub Actions báo xanh, tiến hành `Squash and merge` vào `develop`.

