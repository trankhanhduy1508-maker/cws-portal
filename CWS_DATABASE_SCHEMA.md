# CWS_DATABASE_SCHEMA.md

# Computer Workspace (CWS)

## Database Schema -- MVP V1

> Mục tiêu: thiết kế cơ sở dữ liệu tối giản nhưng đủ để vận hành toàn bộ
> luồng MVP.

------------------------------------------------------------------------

# 1. customer_profiles

Lưu hồ sơ khách hàng.

  Field               Type        Ghi chú
  ------------------- ----------- -----------------------
  id                  UUID        PK
  facebook_id         text        ID Facebook
  full_name           text        Họ tên
  email               text        Có thể rỗng
  avatar_url          text        Ảnh đại diện
  phone               text        Có thể bổ sung sau
  preferred_contact   text        Facebook/Zalo/Email
  marketing_consent   boolean     Đồng ý nhận quảng cáo
  created_at          timestamp   
  updated_at          timestamp   

------------------------------------------------------------------------

# 2. jobs

Mỗi đơn render là một Job.

  Field              Type
  ------------------ -----------
  id                 UUID
  customer_id        UUID
  project_name       text
  software           text
  software_version   text
  source_url         text
  storage_code       text
  status             text
  progress_percent   integer
  created_at         timestamp
  updated_at         timestamp

Quan hệ:

customer_profiles (1) → (N) jobs

------------------------------------------------------------------------

# 3. storage_objects

Theo dõi dữ liệu trong Backblaze B2.

-   id
-   job_id
-   source_path
-   review_path
-   final_path
-   log_path
-   uploaded_at

------------------------------------------------------------------------

# 4. review_images

Ảnh preview có watermark.

-   id
-   job_id
-   image_path
-   display_order
-   created_at

Một Job có nhiều ảnh preview.

------------------------------------------------------------------------

# 5. payments

Thanh toán.

-   id
-   job_id
-   payment_code
-   amount
-   bank_name
-   account_number
-   transfer_content
-   status
-   paid_at
-   created_at

------------------------------------------------------------------------

# 6. downloads

Lịch sử tải file.

-   id
-   job_id
-   customer_id
-   downloaded_at
-   ip_address

------------------------------------------------------------------------

# 7. worker_logs

Log render.

-   id
-   job_id
-   worker_name
-   message
-   level
-   created_at

------------------------------------------------------------------------

# 8. notifications

Thông báo hệ thống.

-   id
-   customer_id
-   job_id
-   title
-   content
-   is_read
-   created_at

------------------------------------------------------------------------

# Quan hệ

``` text
customer_profiles
        │
        └──────────── jobs
                       │
        ┌──────────────┼──────────────┐
        │              │              │
storage_objects   review_images   payments
        │                             │
        └──────────────┐              │
                       │              │
                  downloads      worker_logs
                       │
                 notifications
```

------------------------------------------------------------------------

# Trạng thái Job

-   DRAFT
-   CHECKING_SOURCE
-   IMPORTING_SOURCE
-   READY_FOR_WORKER
-   PREPARING
-   RENDERING
-   REVIEW_READY
-   WAITING_PAYMENT
-   PAID
-   DELIVERED
-   COMPLETED
-   FAILED

------------------------------------------------------------------------

# Nguyên tắc

-   UUID cho khóa chính.
-   Một khách có nhiều Job.
-   Một Job có nhiều preview.
-   Một Job có một storage_code duy nhất.
-   Một Job chỉ mở tải sau khi Payment = PAID.
-   Thiết kế tối giản, ưu tiên MVP.
