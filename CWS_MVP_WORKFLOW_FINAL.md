# CWS_MVP_WORKFLOW_FINAL.md

# Computer Workspace (CWS)

## MVP Workflow (Final)

> Phiên bản workflow chính thức dùng làm nguồn sự thật cho MVP.

## Kiến trúc

-   Frontend: Vercel
-   Backend/API: Render.com
-   Database & Auth: Supabase
-   Storage: Backblaze B2
-   Render: Worker

------------------------------------------------------------------------

# Luồng tổng thể

``` text
Facebook Login
    ↓
Customer Profile
    ↓
Tạo Job
    ↓
Dán Google Drive / OneDrive / Dropbox Link
    ↓
Kiểm tra quyền truy cập
    ↓
Hướng dẫn sửa quyền nếu bị chặn
    ↓
Tự tải file lên Backblaze B2
    ↓
Sinh Storage Code
    ↓
Worker nhận Job
    ↓
Render
    ↓
Hiển thị % tiến độ thật
    ↓
Tạo 3–5 ảnh preview có watermark
    ↓
Khách duyệt
    ↓
Sinh MB QR
    ↓
Webhook xác nhận thanh toán
    ↓
Payment = PAID
    ↓
Mở link tải Backblaze B2
    ↓
Khách tải file gốc
    ↓
COMPLETED
```

------------------------------------------------------------------------

# Đăng nhập

-   Chỉ dùng Facebook Login.
-   Không OTP.
-   Không Google Login.
-   Không Zalo Login.
-   Không Email/Password.

Sau đăng nhập:

-   Tạo Customer Profile.
-   Lưu tên, avatar, email (nếu Facebook cung cấp).
-   Có thể bổ sung số điện thoại và kênh liên hệ sau.

------------------------------------------------------------------------

# Tạo Job

Khách nhập:

-   Tên dự án.
-   Phần mềm.
-   Phiên bản.
-   Link chia sẻ.
-   Ghi chú.

Nguồn hỗ trợ:

-   Google Drive
-   OneDrive
-   Dropbox
-   Direct Link

Backend kiểm tra quyền truy cập trước khi tạo Job.

------------------------------------------------------------------------

# Upload

Hệ thống tự:

-   Tải file từ link.
-   Upload lên Backblaze B2.
-   Sinh Storage Code duy nhất.

Cấu trúc:

``` text
jobs/{storage_code}/
    source/
    review/
    final/
    logs/
```

------------------------------------------------------------------------

# Render

Worker:

-   Nhận Job.
-   Render.
-   Báo % tiến độ thật.
-   Báo lỗi nếu có.

Không dùng ETA giả.

------------------------------------------------------------------------

# Preview

## Video

Không gửi video preview.

Chỉ trích:

-   3--5 frame đại diện.

## Ảnh

Chỉ chọn:

-   3--5 ảnh đại diện.

Watermark:

-   Lặp chéo toàn ảnh.
-   Nội dung: CWS RENDER.

------------------------------------------------------------------------

# Review

Khách:

-   Đồng ý.
-   Hoặc yêu cầu chỉnh sửa.

Nếu đồng ý:

→ Sinh QR thanh toán.

------------------------------------------------------------------------

# Thanh toán

Chỉ dùng:

-   MB Bank QR.

Nội dung chuyển khoản:

``` text
CWS {storage_code} {payment_code}
```

Webhook:

-   Kiểm tra số tiền.
-   Kiểm tra nội dung.
-   Kiểm tra payment_code.
-   Kiểm tra storage_code.

Nếu hợp lệ:

``` text
payment_status = PAID
```

------------------------------------------------------------------------

# Bàn giao

Sau khi PAID:

-   Mở quyền tải file.
-   Tạo link Backblaze B2.
-   Khách tải file.
-   Ghi log download.

------------------------------------------------------------------------

# Admin

Theo dõi:

-   Customer.
-   Jobs.
-   Worker.
-   Progress.
-   Preview.
-   Payment.
-   Download.

------------------------------------------------------------------------

# Không thuộc MVP

-   Google Login
-   OTP
-   Zalo Login
-   Stripe
-   PayPal
-   MoMo
-   Marketplace
-   AI ETA
-   Multi-region
-   Video preview đầy đủ
-   Enterprise modules

------------------------------------------------------------------------

# Definition of Done

MVP chỉ hoàn thành khi toàn bộ luồng chạy end-to-end:

Facebook Login → Customer Profile → Job → Upload → Render → Progress →
Preview → MB QR → Webhook → PAID → Download → COMPLETED.
