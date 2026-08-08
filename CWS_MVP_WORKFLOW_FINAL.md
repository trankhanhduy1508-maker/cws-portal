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
Google Login
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
    Validate output thật
    ↓
    Upload FULL OUTPUT lên B2 và LOCKED
    ↓
    Tạo 3–5 ảnh preview có watermark thật
    ↓
    Tính FINAL PRICE + tạo payment record/payment code
    ↓
    Sinh MB QR với amount + payment reference chính xác
    ↓
Webhook xác nhận thanh toán
    ↓
Payment = PAID
    ↓
    Unlock link tải Backblaze B2 có authorization
    ↓
Khách tải file gốc
    ↓
COMPLETED
```

------------------------------------------------------------------------

# Đăng nhập

-   Chỉ dùng Google Login (qua Supabase Auth).
-   Không OTP.
-   Không Facebook Login (đã gỡ khỏi MVP).
-   Không Zalo Login.
-   Không Email/Password.

Sau đăng nhập:

-   Tạo hoặc cập nhật Customer Profile (dùng UUID của Supabase Auth làm identity).
-   Lưu tên, avatar, email (theo dữ liệu Google cung cấp).
-   Không giả định có số điện thoại — có thể bổ sung số điện thoại và kênh liên hệ sau.

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

-   Facebook Login (đã gỡ khỏi MVP)
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

Google Login → Customer Profile → Job → Upload → Render → Progress → Validate →
B2 FULL OUTPUT LOCKED → 3–5 watermark previews → FINAL PRICE + QR →
SePay exact reference/amount + idempotency → PAID → unlock B2 → Download →
Cleanup → Worker Idle.

## Canonical payment ordering (supersedes older approval wording)

The production order is **RENDER FIRST → B2 FULL OUTPUT LOCKED → WATERMARK
PREVIEW → FINAL PRICE + QR → SEPAY VERIFY → UNLOCK B2**. Customer preview
approval is not required before payment creation. The final B2 object remains
unavailable through the customer API until the matching payment is genuinely
`PAID`; no database edit or fake payment may unlock it.
