# CWS_ROADMAP_GIAI_DOAN_1.md

# ROADMAP GIAI ĐOẠN 1 (MVP NGẮN HẠN)

## Mục tiêu

Hoàn thành một phiên bản CWS có thể chạy từ đầu đến cuối để bắt đầu nhận
khách hàng thật.

## Phạm vi

### 1. Đăng nhập

-   Đăng nhập cơ bản.
-   Phân quyền Customer/Admin.

### 2. Upload

-   Upload file.
-   Theo dõi tiến trình.
-   Lưu file.

### 3. Tạo đơn hàng

-   Tạo Job.
-   Hiển thị trạng thái.

### 4. Thanh toán (ĐƠN GIẢN)

-   QR MB Bank.
-   VietQR.
-   QR MoMo.
-   Nội dung chuyển khoản tự sinh.
-   Admin xác nhận.
-   Không triển khai Stripe.
-   Không triển khai PayPal.
-   Chưa làm Refund.
-   Chưa làm Underpaid/Overpaid.

### 5. Worker

-   Sau khi Admin xác nhận thanh toán thì Worker nhận Job.

### 6. Render

-   Worker xử lý.
-   Cập nhật trạng thái.

### 7. Trả kết quả

-   Chỉ đúng khách hàng được tải file.
-   Không triển khai Secure Output nâng cao.

### 8. Trang quản trị

-   Danh sách Job.
-   Trạng thái.
-   Thanh toán.
-   Worker.
-   Tìm kiếm cơ bản.

## Không làm trong Giai đoạn 1

-   Marketplace
-   ETA
-   Pricing Engine
-   Secure Output nâng cao
-   Payment Enterprise
-   Refund
-   Analytics
-   Affiliate
-   Báo cáo nâng cao

## Điều kiện hoàn thành

Luồng sau phải chạy được:

Upload → Tạo Job → Thanh toán → Admin xác nhận → Worker chạy → Render →
Khách tải file

Nếu luồng trên chưa chạy hoàn chỉnh thì Giai đoạn 1 chưa hoàn thành.
