# CWS_ROADMAP_MVP_V1.md

# Computer Workspace (CWS)

## MVP Roadmap V1

> Mục tiêu: xây dựng một MVP chạy hoàn chỉnh từ lúc khách đăng nhập đến
> lúc nhận file sau thanh toán.

------------------------------------------------------------------------

# Giai đoạn 1 -- Nền tảng

## 1. Frontend

-   Vercel
-   Trang chủ
-   Facebook Login
-   Dashboard khách hàng

## 2. Backend

-   Render.com
-   API
-   Job Manager
-   Worker Manager

## 3. Database

-   Supabase
-   Auth
-   Customer Profile
-   Jobs
-   Payments

## 4. Storage

-   Backblaze B2
-   source/
-   review/
-   final/
-   logs/

------------------------------------------------------------------------

# Giai đoạn 2 -- Luồng khách hàng

-   Facebook Login
-   Tạo Customer Profile
-   Tạo Job
-   Dán Google Drive / OneDrive / Dropbox
-   Kiểm tra quyền truy cập
-   Hướng dẫn sửa quyền nếu cần
-   Tự tải file lên B2
-   Sinh Storage Code

------------------------------------------------------------------------

# Giai đoạn 3 -- Render

-   Worker nhận Job
-   Chuẩn bị môi trường
-   Render
-   Cập nhật % tiến độ thật
-   Báo lỗi nếu có

------------------------------------------------------------------------

# Giai đoạn 4 -- Preview

## Video

-   Trích 3--5 frame đại diện
-   Watermark lặp chéo "CWS RENDER"

## Hình ảnh

-   Chọn 3--5 ảnh đại diện
-   Watermark lặp chéo

Khách chỉ xem preview, chưa được tải file gốc.

------------------------------------------------------------------------

# Giai đoạn 5 -- Thanh toán

-   Tạo QR MB Bank
-   Nội dung chuyển khoản: CWS {storage_code} {payment_code}
-   Webhook tự xác nhận
-   Payment = PAID

------------------------------------------------------------------------

# Giai đoạn 6 -- Bàn giao

-   Kiểm tra file final
-   Tự mở link Backblaze B2
-   Khách tải file
-   Job COMPLETED

------------------------------------------------------------------------

# Giai đoạn 7 -- Trang quản trị

-   Danh sách khách hàng
-   Danh sách Job
-   Tiến độ
-   Thanh toán
-   Preview
-   File cuối
-   Tìm kiếm theo:
    -   Customer
    -   Storage Code
    -   Payment Code

------------------------------------------------------------------------

# Không làm trong MVP

-   MoMo
-   Stripe
-   PayPal
-   Google Login
-   OTP
-   Zalo Login
-   AI ETA
-   Marketplace
-   Multi-region
-   Video preview đầy đủ
-   Enterprise Security

------------------------------------------------------------------------

# Definition of Done

``` text
Facebook Login
→ Customer Profile
→ Tạo Job
→ Kiểm tra link
→ Upload B2
→ Worker Render
→ % Progress
→ Preview Watermark
→ MB QR
→ Webhook
→ Payment = PAID
→ Mở link B2
→ Khách tải file
→ COMPLETED
```
