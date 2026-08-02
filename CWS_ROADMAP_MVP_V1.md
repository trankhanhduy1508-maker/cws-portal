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

# Giai đoạn 7 -- Trang quản trị [DONE — code+unit test; HUMAN_VERIFICATION_PENDING — enroll MFA thật]

Audit lại `AdminScreen.jsx` (689 dòng) 2026-08-02: nội dung dashboard đã
đầy đủ, không cần viết lại — chỉ thiếu lớp xác thực đúng chuẩn (đã bổ
sung, xem dưới).

-   Danh sách khách hàng — DONE (`adminListCustomers`, bảng + tìm kiếm theo tên/email/id)
-   Danh sách Job — DONE (`adminListJobs`, bảng `visibleJobs` với status/tiến độ)
-   Tiến độ — DONE (cột status trong bảng Job, cùng dữ liệu `stageProgress` đã verify ở Giai đoạn 3)
-   Thanh toán — DONE (`GET /payments/devices`, `GET /payments/by-code/:paymentCode`, tra cứu Payment Code trên UI)
-   Preview — DONE (`handleOpenPreview`/`adminGetJobPreview`, modal hiển thị ảnh watermark)
-   File cuối — DONE (link `adminGetDownloadUrl` trong bảng Job, qua route đã audit ở Giai đoạn 6)
-   Tìm kiếm theo Customer / Storage Code / Payment Code — DONE (3 ô tìm kiếm riêng, đều hoạt động qua route thật)

**Authentication + Authorization + MFA (2026-08-02, DONE ở mức code/unit test, xem `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md`):**
- Bỏ hoàn toàn nhánh `x-admin-key` làm bypass trong `RoleGuard` (route Admin Portal chính) — theo đúng yêu cầu "Không tạo bypass".
- Bắt buộc Supabase session thật (email/password, tài khoản provision qua migration 013 `staff_roles`) + MFA (TOTP) CHÍNH THỨC của Supabase Auth (`supabase.auth.mfa.*`, bật mặc định miễn phí trên mọi project — không tự lưu/quản lý TOTP secret).
- Backend enforce lại bằng cách đọc claim `aal` (Authenticator Assurance Level) từ chính access token đã được `client.auth.getUser()` xác thực — `aal !== 'aal2'` → từ chối, không tin tưởng Frontend.
- 6 kịch bản bảo mật bắt buộc đều có unit test PASS (`role.guard.spec.ts`): anonymous → DENY, customer authenticated → DENY, admin chưa MFA → DENY, admin + MFA (aal2) → PASS, gọi API trực tiếp thiếu MFA assurance → DENY, cross-role/privilege escalation → DENY.
- Frontend: `StaffMfaLogin.jsx` — đăng nhập email/password → tự động enroll (hiện QR do Supabase sinh) nếu tài khoản chưa có factor, hoặc challenge (nhập mã 6 số) nếu đã có — không có đường tắt bỏ qua bước này.

**HUMAN_VERIFICATION_PENDING**: chưa có tài khoản Admin/Host thật nào
được Owner tạo qua Supabase Dashboard (`staff_roles`) để tự chạy thử
enroll QR that bằng Authenticator app thật — logic đã đúng theo tài
liệu chính thức Supabase + unit test, nhưng **chưa được Owner xác nhận
bằng 1 lần đăng nhập thật**. Đây là bước duy nhất cần Owner, mọi phần
độc lập khác đã hoàn tất.

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
