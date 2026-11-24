# 👤 Actor: Customer (Khách hàng)

Thư mục này gom nhóm toàn bộ các màn hình (pages) và thành phần giao diện (components) phục vụ cho vai trò **Khách hàng** trên hệ thống DineGo.

## 📄 Danh sách Màn hình (Pages)
- \HomePage.tsx\: Trang chủ hiển thị banner, danh mục ẩm thực, gợi ý món ăn gần bạn.
- \RestaurantPage.tsx\: Chi tiết quán ăn, thực đơn món, tùy chọn món ăn, đánh giá của quán.
- \CheckoutPage.tsx\: Trang thanh toán đơn hàng, chọn địa chỉ, áp dụng voucher, chọn phương thức thanh toán.
- \OrdersPage.tsx\: Quản lý danh sách đơn hàng đã đặt, theo dõi trạng thái món, hủy đơn hoặc xem lại hoá đơn.
- \CustomerProfilePage.tsx\: Quản lý thông tin tài khoản cá nhân, sổ địa chỉ nhận hàng, lịch sử giao dịch.
- \GroupOrderPage.tsx\: Đặt đơn nhóm cùng bạn bè/đồng nghiệp theo thời gian thực (real-time split bill).
- \VoucherHuntPage.tsx\: Sàn săn mã giảm giá, voucher freeship và ưu đãi giờ vàng.
- \AiGuidePage.tsx\: Trợ lý AI gợi ý món ngon, trả lời thắc mắc ẩm thực theo vị trí và sở thích.
- \CateringPage.tsx\: Đặt tiệc Catering trọn gói cho hội nghị, sinh nhật, tiệc công ty.

## 🧩 Danh sách Components
- \CustomerProposalReviewModal.tsx\: Modal xem xét và phản hồi báo giá tiệc Catering từ nhà hàng.
- \CustomerDepositQrModal.tsx\: Modal quét mã QR đặt cọc tiệc Catering.
- \CateringDepositReceiptModal.tsx\: Phiếu xác nhận đặt cọc tiệc thành công.
- \CateringFinalBillModal.tsx\: Hóa đơn quyết toán cuối cùng của tiệc.
- \ReviewModal.tsx\: Modal viết đánh giá, chấm điểm sao món ăn và quán sau khi nhận hàng.
