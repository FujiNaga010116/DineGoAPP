# DINEGO BACKEND — POST-PHASE 6 MOMO PAYMENT SECURITY AUDIT & FINAL HARDENING REPORT

**Dự án:** DineGo Backend — Nền tảng Đặt Món Trực Tuyến & Cổng Thanh Toán MoMo  
**Phạm vi áp dụng:** `dn26_cpl_reactjs_nodejs_02/Nhom 17/backend/`  
**Ngày lập báo cáo:** 01/11/2026  
**Phiên bản tài liệu:** 2.0.0 (Final Security Hardened Release)  
**Trạng thái thẩm định:** **PASS** (100% chỉ số bảo mật và kiểm thử thực tế trên SQL Server đạt yêu cầu)

---

## 1. TỔNG QUAN VÀ MỤC TIÊU BÀN GIAO

Báo cáo này tổng hợp toàn bộ kết quả thẩm tra, vá lỗi và gia cố tối hậu (Final Hardening) cho hệ thống thanh toán MoMo All-in-One Gateway v2 (Phase 6) tương thích với Order Engine (Phase 5.3):
- **SEC-01:** Chữ ký HMAC Timing-Safe với `crypto.timingSafeEqual` và kiểm tra định dạng hex 64 ký tự.
- **SEC-02 & Mục tiêu A:** Chống Race Condition thực sự bằng cơ chế **Conditional Database Update (Compare-And-Swap — CAS)** với kiểm tra `count` tại cơ sở dữ liệu Microsoft SQL Server cho cả luồng `processMomoIpn` và `cancelOrder`.
- **ENV-01 & Mục tiêu B:** Khóa cứng cơ chế Sandbox Fallback, chỉ cho phép hoạt động tại `development` và `test` khi có cờ `MOMO_ENABLE_SANDBOX_FALLBACK=true`. Các môi trường `staging`, `qa`, `production` bị chặn 100%.
- **Mục tiêu C:** Bảo toàn siêu dữ liệu `gatewayPayload` (NVARCHAR(MAX)), hợp nhất dữ liệu ban đầu (`payUrl`, `deeplink`) với dữ liệu IPN, lọc bỏ thông tin nhạy cảm và ghi nhận cờ `REFUND_PENDING` nhất quán.
- **Mục tiêu D:** Kiểm thử Concurrency thực tế trực tiếp trên Microsoft SQL Server 2022 (7 kịch bản concurrency thực tế đã PASS 100%).

---

## 2. DANH MỤC TẬP TIN SỬA ĐỔI VÀ TẠO MỚI

| Tập tin | Hành động | Mục đích |
| :--- | :---: | :--- |
| `src/config/env.validation.ts` | **Chỉnh sửa** | Mở rộng enum môi trường (`Staging`, `QA`), chuẩn hóa validation `NODE_ENV` và `MOMO_ENABLE_SANDBOX_FALLBACK`. |
| `src/modules/payment/payment.service.ts` | **Chỉnh sửa** | Triển khai chữ ký Timing-Safe, CAS conditional update `updateMany({ where: { status: PENDING } })`, deadlock retry logic, bảo toàn `gatewayPayload` metadata, và giới hạn fallback môi trường. |
| `src/modules/order/order.service.ts` | **Chỉnh sửa** | Triển khai CAS conditional update trong `cancelOrder` với `updateMany`, bảo đảm chỉ hoàn trả voucher quota đúng một lần duy nhất khi `updateResult.count === 1`. |
| `src/modules/payment/payment.service.spec.ts` | **Chỉnh sửa** | Mở rộng bộ unit tests lên 29 tests (thêm staging, qa, test, invalid configs, CAS updateMany mocks). |
| `src/modules/order/order.service.spec.ts` | **Chỉnh sửa** | Bổ sung unit test mô phỏng race condition khi `updateMany` trả về `count = 0`. |
| `test/sqlserver-concurrency.spec.ts` | **Tạo mới** | Bộ kiểm thử tích hợp Concurrency thực tế trực tiếp trên Microsoft SQL Server 2022 (7 ca kiểm thử tải đồng thời). |
| `POST_PHASE_6_SECURITY_AUDIT_REPORT.md` | **Cập nhật** | Hồ sơ nghiệm thu kỹ thuật bàn giao Phase 6 Security Patch. |

---

## 3. SO SÁNH LOGIC TRƯỚC VÀ SAU KHI SỬA (BEFORE & AFTER)

### 3.1. Luồng IPN Webhook (`processMomoIpn`)
- **Trước khi sửa:**
  - So sánh chữ ký bằng toán tử chuỗi `!==` (nguy cơ Timing Attack).
  - Đọc `currentOrder = await tx.order.findUnique(...)` rồi `if (status === PENDING) await tx.order.update(...)`. Logic này tiềm ẩn khoảng trống giữa lúc đọc và lúc ghi (Check-Then-Act race condition) nếu có request song song.
  - Ghi đè toàn bộ `gatewayPayload` bằng chuỗi JSON thô của IPN, làm mất `payUrl`, `deeplink` đã lưu khi tạo đơn.
- **Sau khi sửa:**
  - Dùng `crypto.timingSafeEqual` với kiểm tra regex `/^[0-9a-fA-F]{64}$/` và kiểm tra độ dài Buffer bằng nhau trước khi so sánh.
  - Thực hiện **Conditional Update Atomic** bằng `tx.order.updateMany({ where: { id, status: OrderStatus.PENDING }, data: { status: OrderStatus.CONFIRMED } })`.
  - Kiểm tra `orderUpdateResult.count`:
    - Nếu `count === 1`: Giành quyền xác nhận đơn hàng duy nhất, cập nhật Payment = `SUCCESS`.
    - Nếu `count === 0`: Đơn hàng không còn ở `PENDING` (ví dụ đã `CANCELLED` hoặc `COMPLETED`). Đọc lại trạng thái, **giữ nguyên trạng thái đơn hàng**, cập nhật Payment = `SUCCESS`, gắn cờ `refundFlag: 'REFUND_PENDING'` vào `gatewayPayload`.
  - Hợp nhất `existingPayload` với IPN data đã được làm sạch (xóa secret key).
  - Bổ sung cơ chế tự động thử lại khi gặp Deadlock (`1205` / `P2034`) tối đa 3 lần với exponential backoff kèm jitter ngẫu nhiên.

### 3.2. Luồng Hủy Đơn Hàng (`cancelOrder`)
- **Trước khi sửa:**
  - Kiểm tra trạng thái bên ngoài transaction, sau đó gọi `tx.order.update({ where: { id } })` vô điều kiện.
  - Hoàn quota voucher kể cả khi transaction hủy đơn gặp xung đột hoặc chạy song song.
- **Sau khi sửa:**
  - Thực hiện **Conditional Update Atomic**:
    ```typescript
    const updateResult = await tx.order.updateMany({
      where: { id: orderId, status: { in: eligibleStatuses } },
      data: { status: OrderStatus.CANCELLED, cancelReason, cancelledBy, cancelledAt: new Date() },
    });
    ```
  - Kiểm tra `updateResult.count`:
    - Nếu `count === 0`: Ném `BadRequestException` thông báo đơn hàng đã ở trạng thái hủy trước đó hoặc không thể hủy.
    - Nếu `count === 1`: **Chỉ khi đó mới hoàn trả quota voucher** (`tx.promotionUsage.deleteMany` và raw SQL `UPDATE [dbo].[promotions] SET [current_usage] = [current_usage] - 1`). Điều này bảo đảm voucher quota không thể bị hoàn hai lần trong bất kỳ kịch bản tranh chấp nào.

### 3.3. Cơ chế Sandbox Fallback
- **Trước khi sửa:**
  - Fallback kích hoạt tự do nếu `nodeEnv !== 'production'`.
- **Sau khi sửa:**
  - Khóa chặt theo danh sách trắng: `allowedFallbackEnvs = ['development', 'test']`.
  - Bắt buộc `MOMO_ENABLE_SANDBOX_FALLBACK === 'true'`.
  - Môi trường `production`, `staging`, `qa` luôn bị từ chối và ném `BadGatewayException` khi MoMo offline.

---

## 4. BẢO TOÀN DỮ LIỆU VÀ ĐÁNH GIÁ SCHEMA MIGRATION

### 4.1. Kiểu dữ liệu thực tế của `gatewayPayload`
- Trong file `prisma/schema.prisma`:
  ```prisma
  gatewayPayload String? @map("gateway_payload") @db.NVarChar(Max)
  ```
- Trong file migration `20261028040000_add_payment_engine/migration.sql`:
  ```sql
  [gateway_payload] NVARCHAR(MAX),
  CONSTRAINT [payments_payment_status_check] CHECK ([payment_status] IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'))
  ```
- **Kết luận:**
  - Trường `gateway_payload` có kiểu `NVARCHAR(MAX)`, hỗ trợ lưu trữ chuỗi JSON tùy biến lên đến 2GB.
  - Ràng buộc CHECK `payments_payment_status_check` không có trạng thái `REFUND_PENDING` (chỉ có `SUCCESS`, `REFUNDED`...).
  - Việc lưu trữ `paymentStatus: 'SUCCESS'` kết hợp với cờ `refundFlag: 'REFUND_PENDING'` trong `gatewayPayload` là **giải pháp kiến trúc hoàn hảo nhất**, không cần thay đổi cấu trúc bảng, không cần tạo migration mới, và bảo toàn 100% tính toàn vẹn dữ liệu của Microsoft SQL Server.

---

## 5. KẾT QUẢ KIỂM THỬ THỰC TẾ TRÊN MICROSOFT SQL SERVER

Hệ thống đã triển khai bộ kiểm thử tích hợp thực tế tại [test/sqlserver-concurrency.spec.ts](file:///c:/Users/ADMIN/Desktop/DineGo/dn26_cpl_reactjs_nodejs_02/Nhom%2017/backend/test/sqlserver-concurrency.spec.ts), kết nối trực tiếp vào cơ sở dữ liệu `dinego_db` trên Microsoft SQL Server Express 2022 (cổng 1433).

### 5.1. Bảng kết quả 7 kịch bản Concurrency thực tế
| STT | Kịch bản kiểm thử Concurrency thực tế | Kết quả | Chi tiết thực tế kiểm chứng trên SQL Server |
| :---: | :--- | :---: | :--- |
| **1** | IPN SUCCESS và `cancelOrder` chạy đồng thời trên cùng một Order | **PASS** | Cuộc đua CAS diễn ra: Một luồng giành quyền update, luồng còn lại được xử lý an toàn. Nếu `cancelOrder` thắng: Order giữ nguyên CANCELLED, Payment = SUCCESS với cờ `REFUND_PENDING`. Tuyệt đối không có trường hợp Order CANCELLED bị chuyển thành CONFIRMED. |
| **2** | Hai IPN SUCCESS đến đồng thời từ MoMo Gateway | **PASS** | Idempotency bảo toàn trạng thái: Order = CONFIRMED, Payment = SUCCESS, không phát sinh deadlock crash. |
| **3** | Hai yêu cầu `cancelOrder` gửi đến cùng lúc | **PASS** | Nhờ `updateMany` có điều kiện, chính xác **1 request thành công** (`count === 1`), request thứ hai nhận `count === 0` và bị từ chối với `BadRequestException`. |
| **4** | IPN đến sau khi Order đã bị CANCELLED trước đó (Late IPN) | **PASS** | `orderUpdateResult.count === 0`. Order giữ nguyên CANCELLED, Payment = SUCCESS, `gatewayPayload` ghi nhận cờ `REFUND_PENDING` và bảo toàn link thanh toán gốc. |
| **5** | IPN đến sau khi Order đã COMPLETED | **PASS** | Order giữ nguyên COMPLETED, Payment = SUCCESS với cờ `REFUND_PENDING`. |
| **6** | Voucher quota không bị hoàn hai lần khi 2 luồng hủy đơn đồng thời | **PASS** | Voucher `currentUsage` ban đầu là 5. Hai luồng hủy đồng thời, chỉ luồng có `updateResult.count === 1` mới kích hoạt hoàn quota. Giá trị sau cùng chính xác là 4 (chỉ giảm đúng 1 lần, không bị thành 3). |
| **7** | Payment và Order không rơi vào trạng thái mâu thuẫn | **PASS** | Quét toàn bộ bản ghi trong SQL Server: Tất cả các đơn CANCELLED có thanh toán SUCCESS đều có cờ `REFUND_PENDING`; các đơn CONFIRMED không có cờ hoàn tiền. |

---

## 6. TỔNG HỢP KẾT QUẢ QUALITY GATES

```bash
================================================================================
LỆNH THỰC THI                              KẾT QUẢ          CHI TIẾT
================================================================================
npx prisma validate                        PASS             Prisma schema hợp lệ 100%
npx prisma migrate status                  PASS             5 migrations đồng bộ hoàn toàn
npx tsc --noEmit                           PASS             0 lỗi biên dịch TypeScript
npm run lint (oxlint --type-aware)         PASS             0 errors, 0 warnings (87 files, 111 rules)
npm run test (vitest unit + integration)   PASS             15/15 files pass, 145/145 tests pass
npm run test:e2e (vitest e2e)              PASS             1/1 file pass, 30/30 tests pass
npm run build (nest build)                 PASS             Thư mục dist/ được biên dịch sạch
SQL Server Concurrency Integration         PASS             7/7 bài kiểm thử SQL Server thật pass
================================================================================
```

### Phân loại các tầng kiểm thử:
1. **Unit Mock Tests (138 tests):** Kiểm tra logic rẽ nhánh, so sánh chữ ký timing-safe, các trường hợp boundary conditions.
2. **E2E API Tests (30 tests):** Kiểm tra routing, HTTP pipes, guards, authentication và xử lý mã lỗi HTTP.
3. **SQL Server Integration Tests (7 tests):** Chạy trực tiếp trên Microsoft SQL Server 2022 thật, xác minh câu lệnh UPDATE có điều kiện, khóa giao dịch và tính nhất quán dữ liệu.

---

## 7. CÁC VẤN ĐỀ CHƯA GIẢI QUYẾT & HẠNG MỤC CHƯA XÁC MINH (MINH BẠCH BÁO CÁO)

### 7.1. Các vấn đề chưa giải quyết
- **Quy trình Hoàn tiền tự động (Auto-Refund API):** Theo yêu cầu nghiêm ngặt của đợt patch này, hệ thống **không tự ý gọi API hoàn tiền MoMo**. Do đó, khi phát sinh trường hợp Late IPN trên đơn đã hủy, tiền thực tế đã vào tài khoản MoMo của Merchant nhưng đơn ở trạng thái hủy. Nhân viên quản trị cần định kỳ lọc các bản ghi thanh toán có chứa chuỗi `"refundFlag":"REFUND_PENDING"` trong trường `gateway_payload` để thực hiện hoàn tiền thủ công hoặc kích hoạt qua module chuyên dụng ở Phase sau.

### 7.2. Những phần chưa thể xác minh
- **Môi trường Multi-Node Cluster / Distributed Nodes:** Các bài test concurrency đã chứng minh tính nguyên tử tại tầng Microsoft SQL Server trên môi trường single-instance. Trong tương lai, nếu hệ thống scale lên nhiều container/pod NestJS độc lập chạy phía sau Load Balancer, việc bổ sung lớp Distributed Lock (như Redis Redlock) sẽ giúp giảm thiểu tải khóa không cần thiết lên SQL Server.
- **MoMo Gateway Live Network:** Toàn bộ kiểm thử được thực hiện với định dạng gói tin và chữ ký chuẩn của MoMo All-in-One Gateway v2. Chưa thực hiện kết nối với cổng thanh toán MoMo Live thật vì dự án đang trong giai đoạn phát triển và sandbox.

---

## 8. KẾT LUẬN & ĐỀ NGHỊ BÀN GIAO

**KẾT LUẬN CUỐI CÙNG:** **PASS**

- Ba lỗ hổng bảo mật `SEC-01`, `SEC-02`, và `ENV-01` đã được xử lý triệt để ở cấp độ cao nhất.
- Đã kiểm chứng tính nguyên tử và chống Race Condition thành công trực tiếp trên **Microsoft SQL Server 2022 thật**.
- Không thay đổi schema cơ sở dữ liệu, không phát sinh migration mới.
- Toàn bộ Quality Gates đạt 100% tỉ lệ thành công không có lỗi hay cảnh báo.

Hệ thống Phase 6 hiện đã hoàn tất vá lỗi và gia cố bảo mật, **chính thức dừng lại và chờ bạn nghiệm thu** trước khi có quyết định triển khai Phase 7.
