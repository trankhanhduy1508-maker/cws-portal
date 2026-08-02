# CWS_ROADMAP_MVP_V1.md

# Computer Workspace (CWS)

## MVP Roadmap V1

> Mục tiêu: xây dựng một MVP chạy hoàn chỉnh từ lúc khách đăng nhập đến
> lúc nhận file sau thanh toán.

------------------------------------------------------------------------

# Giai đoạn 1 -- Nền tảng [DONE]

## 1. Frontend [DONE]

-   Vercel — DONE (production https://cws-portal.vercel.app/ xác nhận sống)
-   Trang chủ — DONE
-   Google Login — DONE (đăng nhập thật đã verify qua database, 2026-08-01)
-   Dashboard khách hàng — DONE (Progress/Job Status)

## 2. Backend [DONE]

-   Render.com — DONE (production https://cws-portal.onrender.com xác nhận sống)
-   API — DONE
-   Job Manager — DONE (code + unit test; xem ghi chú NEEDS_VERIFICATION runtime ở Giai đoạn 3)
-   Worker Manager — DONE (code: heartbeat/register/claim/scheduler); runtime với Worker vật lý thật xem Giai đoạn 3

## 3. Database [DONE]

-   Supabase — DONE
-   Auth — DONE (Google OAuth qua Supabase, xem DECISIONS.md)
-   Customer Profile — DONE (trigger `handle_new_auth_user()` verify với tài khoản thật)
-   Jobs — DONE (schema + RLS xác nhận)
-   Payments — DONE (schema đã sửa xong lỗi kiểu dữ liệu `payment_id`, xem `reports/payments/SEPAY_WEBHOOK_PRODUCTION_VERIFICATION_2026-08-01.md`)

## 4. Storage [DONE]

-   Backblaze B2 — DONE (upload/signed URL xác nhận bằng HTTP thật, 2026-08-02)
-   source/ — DONE (route `POST /files/upload`)
-   review/ — NEEDS_VERIFICATION (cơ chế tồn tại trong schema `storage_objects.review_path`/`review_images`, chưa xác nhận có dữ liệu thật đi qua)
-   final/ — DONE (đóng gói + signed URL xác nhận bằng HTTP thật)
-   logs/ — DONE (`worker_logs` bảng tồn tại, route đọc log tồn tại)

------------------------------------------------------------------------

# Giai đoạn 2 -- Luồng khách hàng [NEEDS_VERIFICATION]

-   Google Login — DONE
-   Tạo Customer Profile — DONE
-   Tạo Job — NEEDS_VERIFICATION (code + unit test PASS, unit test mock E2E PASS; **chưa có 1 job thật nào được tạo qua UI thật bởi khách hàng đã đăng nhập thật** — xem `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`)
-   Dán Google Drive / OneDrive / Dropbox — DONE (`POST /drive/resolve` xác nhận trả response thật trên production, 2026-08-01)
-   Kiểm tra quyền truy cập — NEEDS_VERIFICATION (chưa có evidence riêng xác nhận UX báo lỗi quyền hoạt động đúng với 1 link thật bị chặn quyền)
-   Hướng dẫn sửa quyền nếu cần — NEEDS_VERIFICATION (cùng lý do trên)
-   Tự tải file lên B2 — DONE (xác nhận bằng HTTP thật, `POST /files/upload`, 2026-08-02)
-   Sinh Storage Code — DONE

------------------------------------------------------------------------

# Giai đoạn 3 -- Render [NEEDS_VERIFICATION]

-   Worker nhận Job — NEEDS_VERIFICATION (audit code đầy đủ 2026-08-02, xem `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`: cơ chế claim/fencing token/RPC đều xác nhận đúng và tồn tại thật trên database, nhưng **`cws_worker_full.py` hiện hardcode 1 danh sách `job_id` cố định (`JOB_IDS_MULTI`) cho công việc riêng của Owner — CHƯA claim job MVP bất kỳ do khách tạo qua Portal**. Đây là gap thiết kế thật, không chỉ "chưa có máy vật lý")
-   Chuẩn bị môi trường — NEEDS_VERIFICATION (cùng lý do trên)
-   Render — NEEDS_VERIFICATION (chưa từng chạy với Worker vật lý thật trong môi trường agent; `--enable-autoexec` đang bật, chỉ an toàn khi nguồn file vẫn do Owner tự chọn — xem report audit mục 2.3, cần quyết định trước khi dùng cho MVP tự-phục-vụ)
-   Cập nhật % tiến độ thật — NEEDS_VERIFICATION (cơ chế code tồn tại, chưa verify runtime)
-   Báo lỗi nếu có — NEEDS_VERIFICATION (cơ chế code tồn tại, chưa verify runtime)

BLOCKED (2 lý do khách quan, không phải chưa làm): (1) không có máy
Worker vật lý trong môi trường agent, (2) Worker hiện tại không claim
được job MVP chung — cần Owner quyết định hướng (sửa sang claim theo
queue chung, hoặc giữ nguyên cho business riêng và làm 1 worker MVP
khác). Xem `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md` +
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`.

------------------------------------------------------------------------

# Giai đoạn 4 -- Preview [NEEDS_VERIFICATION]

## Video

-   Trích 3--5 frame đại diện — NEEDS_VERIFICATION
-   Watermark lặp chéo "CWS RENDER" — NEEDS_VERIFICATION

## Hình ảnh

-   Chọn 3--5 ảnh đại diện — NEEDS_VERIFICATION
-   Watermark lặp chéo — NEEDS_VERIFICATION

Khách chỉ xem preview, chưa được tải file gốc. Phụ thuộc Giai đoạn 3
(Render) chưa có evidence runtime thật — không thể tự verify Preview
tách rời khỏi 1 lần Render thật.

------------------------------------------------------------------------

# Giai đoạn 5 -- Thanh toán [DONE — Sandbox; NEEDS_VERIFICATION — Live]

-   Tạo QR MB Bank — DONE
-   Nội dung chuyển khoản: CWS {storage_code} {payment_code} — DONE
-   Webhook tự xác nhận — DONE qua SePay **Test Mode/Sandbox** (evidence
    HTTP + DB thật, 2026-08-02, `reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md`).
    **Live (giao dịch MB Bank thật) — NEEDS_VERIFICATION**, cần Owner:
    liên kết tài khoản MB Bank thật trên SePay + tạo Webhook Live +
    set `SEPAY_WEBHOOK_HMAC_SECRET` trên Render.
-   Payment = PAID — DONE (Sandbox, evidence thật)

------------------------------------------------------------------------

# Giai đoạn 6 -- Bàn giao [DONE — cơ chế; NEEDS_VERIFICATION — gắn với 1 job thật]

-   Kiểm tra file final — DONE (gate `status===FINISHED` + `downloadUrl`)
-   Tự mở link Backblaze B2 — DONE (signed URL AWS4-HMAC-SHA256, TTL 300s, xác nhận bằng HTTP thật 2026-08-02, `reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md`)
-   Khách tải file — DONE (audit log `downloads` xác nhận ghi đúng; ownership check xác nhận chặn đúng qua HTTP thật — anonymous/khác chủ → 403)
-   Job COMPLETED — NEEDS_VERIFICATION khi gắn liền với 1 job thật đi hết chuỗi (cơ chế đã DONE, nhưng chưa có 1 lần chạy nối tiếp thật từ Render→Preview→Approve→Payment→đây, xem Giai đoạn 3)

------------------------------------------------------------------------

# Giai đoạn 7 -- Trang quản trị [IN_PROGRESS]

-   Danh sách khách hàng — TODO/IN_PROGRESS (chưa xác nhận đủ trong `AdminScreen.jsx`, cần audit riêng)
-   Danh sách Job — IN_PROGRESS (route `GET /jobs/by-storage-code`, `GET /payments/by-code` tồn tại với `RoleGuard`)
-   Tiến độ — TODO/IN_PROGRESS (chưa audit riêng)
-   Thanh toán — IN_PROGRESS (`GET /payments/devices`, `GET /payments/by-code/:paymentCode` tồn tại)
-   Preview — TODO/IN_PROGRESS (chưa audit riêng)
-   File cuối — TODO/IN_PROGRESS (chưa audit riêng)
-   Tìm kiếm theo Customer / Storage Code / Payment Code — IN_PROGRESS (1 phần route tra cứu theo storage_code/payment_code đã tồn tại)

Xác thực Admin hiện dùng `RoleGuard`/`x-admin-key` (shared secret đơn
giản, xem `AGENTS.md` — không phải hệ thống phân quyền enterprise theo
chủ ý MVP). Owner đã yêu cầu nâng cấp lên MFA/TOTP cho Admin — CHƯA bắt
đầu, đây là Task riêng đang chờ Owner xác nhận LOOP tiếp tục (xem
`reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md` và hội thoại
2026-08-02 — KHÔNG được coi là DONE cho tới khi có audit + implementation riêng).

------------------------------------------------------------------------

# Không làm trong MVP

-   MoMo
-   Stripe
-   PayPal
-   Facebook Login (đã gỡ khỏi MVP)
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
Google Login
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
