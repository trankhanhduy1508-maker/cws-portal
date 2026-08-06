# CWS_ROADMAP_MVP_V1.md

## Staging identity/failover gate — 2026-08-06

- **BLOCKED**: staging preflight cannot run in the current session because no
  staging DB tool, endpoint or credential is available.
- Migrations 020/021 remain unapplied; production is untouched.
- Offline rehearsal remains **CODE/UNIT VERIFIED**, not staging runtime PASS.

## Worker failover readiness — 2026-08-06

- **IN_PROGRESS**: production identity/failover implementation and offline
  rehearsal are complete at code/unit level.
- **NEEDS_VERIFICATION**: apply migrations 020/021 in isolated staging,
  provision two physical Workers, run authenticated heartbeat/claim/reassign/
  revoke/expiry/rotation smoke, then verify production rollout.
- Payment remains downstream of final render/preview; failover recovery must
  not create or expose payment before `REVIEW_READY`.

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
-   Kiểm tra quyền truy cập — DONE (2026-08-02: `GoogleDriveService.resolve()` đã đúng — Google Drive API trả 404 cho file private khi dùng API key, code bắt đúng case này; thêm unit test mock fetch xác nhận hành vi, phân biệt rõ với lỗi API khác (500/quota) không bị hiểu nhầm thành lỗi quyền)
-   Hướng dẫn sửa quyền nếu cần — DONE (thông báo lỗi tiếng Việt rõ ràng: "kiểm tra lại quyền chia sẻ (chọn Bất kỳ ai có link)")
-   Tự tải file lên B2 — DONE (xác nhận bằng HTTP thật, `POST /files/upload`, 2026-08-02)
-   Sinh Storage Code — DONE

------------------------------------------------------------------------

# Giai đoạn 3 -- Render [NEEDS_VERIFICATION]

-   Worker nhận Job — NEEDS_VERIFICATION (sửa 2026-08-03, Owner uỷ quyền trực tiếp: **P0 "Worker không claim job MVP chung" đã fix ở mức code + DB evidence thật** — migration 014 thêm RPC `claim_next_generic_task` (áp dụng thật lên production, test claim+revert thành công trên 1 trong 6 job MVP thật đang chờ từ 2026-07-27), `cws_worker_full.py` nay thử claim job MVP thật SAU KHI hết `JOB_IDS_MULTI`. Vẫn NEEDS_VERIFICATION vì chưa chạy runtime thật trên máy Windows+Blender — xem `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`)
-   Chuẩn bị môi trường — NEEDS_VERIFICATION (cùng lý do trên: code xong, chưa có máy thật để chạy)
-   Render — NEEDS_VERIFICATION (chưa từng chạy với Worker vật lý thật trong môi trường agent; **`--enable-autoexec` đã fix 2026-08-03**: chỉ bật cho job Owner tự chọn (JOB_IDS_MULTI, không đổi hành vi), **tắt hẳn cho job MVP khách tự upload** (claim qua đường mới) — xem `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`)
-   Cập nhật % tiến độ thật — NEEDS_VERIFICATION (cơ chế code tồn tại, chưa verify runtime)
-   Báo lỗi nếu có — NEEDS_VERIFICATION (cơ chế code tồn tại, chưa verify runtime)

BLOCKED (1 lý do khách quan còn lại, đã giảm từ 2 xuống 1 sau fix
2026-08-03): không có máy Worker Windows+Python+Blender vật lý trong
môi trường agent để chạy runtime thật — code đã sẵn sàng claim job MVP
chung (không còn cần Owner quyết định kiến trúc, đã fix theo hướng
"thêm RPC mới, không đổi hành vi Fleet cũ"). B2 credential hardcode
(`cws_worker_full.py`) vẫn BLOCKED — key hiện tại test thật trả về 401
Unauthorized từ Backblaze, cần Owner xác nhận key đang chạy thật + tạo
key mới giới hạn quyền. Xem `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`,
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` +
`reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`.

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

# Giai đoạn 7 -- Trang quản trị [NEEDS_VERIFICATION — Google OAuth + MFA runtime]

Audit lại `AdminScreen.jsx` (689 dòng) 2026-08-02: nội dung dashboard đã
đầy đủ, không cần viết lại — chỉ thiếu lớp xác thực đúng chuẩn (đã bổ
sung, xem dưới).

-   Tổng số Worker — CODE/UNIT VERIFIED (`GET /fleet/workers`, dữ liệu thật)
-   Worker Online — CODE/UNIT VERIFIED (backend derives từ heartbeat freshness ≤180s)
-   Worker Offline — CODE/UNIT VERIFIED (backend derives từ heartbeat stale >180s)
-   Đang chờ / Idle Saver — CODE/UNIT VERIFIED (`nodeState === ACTIVE_IDLE`, state có trong Node Agent contract)
-   Đang Render — CODE/UNIT VERIFIED (`nodeState === BUSY`, backend map từ Worker state contract)
-   Customer CRM — CODE/UNIT VERIFIED (`GET /customers/crm`, aggregate server-side từ `customer_profiles`, `render_orders`, `payments`; production AAL2 session pending)
-   Customer jobs/render/payment UI trong `/#admin` — SUPERSEDED; CRM là khu vực chăm sóc khách riêng, customer render flow vẫn ở `/`

**Authentication + Authorization + MFA (2026-08-06, CODE/UNIT VERIFIED; production runtime pending, xem `reports/admin/CWS_ADMIN_GOOGLE_OAUTH_AAL2_2026-08-06.md`):**
- Bỏ hoàn toàn nhánh `x-admin-key` làm bypass trong `RoleGuard` (route Admin Portal chính) — theo đúng yêu cầu "Không tạo bypass".
- Bắt buộc Supabase session thật (Google OAuth, tài khoản Google được cấp role qua `staff_roles`) + MFA (TOTP) CHÍNH THỨC của Supabase Auth (`supabase.auth.mfa.*`, không tự lưu/quản lý TOTP secret).
- Backend enforce lại bằng cách đọc claim `aal` (Authenticator Assurance Level) từ chính access token đã được `client.auth.getUser()` xác thực — `aal !== 'aal2'` → từ chối, không tin tưởng Frontend.
- 6 kịch bản bảo mật bắt buộc đều có unit test PASS (`role.guard.spec.ts`): anonymous → DENY, customer authenticated → DENY, admin chưa MFA → DENY, admin + MFA (aal2) → PASS, gọi API trực tiếp thiếu MFA assurance → DENY, cross-role/privilege escalation → DENY.
- Frontend: `StaffMfaLogin.jsx` — Google OAuth → kiểm tra staff role → tự động enroll (QR do Supabase sinh) nếu chưa có factor, hoặc challenge mã 6 số nếu đã có; bearer token chỉ giữ trong memory.
- Backend: `GET /staff/mfa-status` chỉ xác nhận staff identity trước MFA; mọi Admin/Host data route vẫn qua `RoleGuard` và bắt buộc `aal2`. Không có `x-admin-key` bypass.

**PRODUCTION_VERIFICATION_PENDING**: production route and bundle are live;
real Google provider → staff role → TOTP → AAL2 session still requires a human
Admin account and has not been claimed.

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

# Production verification follow-up — 2026-08-06

- Production after Founder CORS fix: Render `/health` HTTP 200; CORS preflight from `https://cws-portal.vercel.app` returns HTTP 204 with matching allow-origin and no credentials grant. Vercel bundle serves the fleet/CRM patch markers and points to `https://cws-portal.onrender.com`.
- Supabase Google authorize initiation: HTTP 302 to Google with production callback/redirect target.
- Render `/staff/mfa-status`: HTTP 401 without credentials, confirming the route is live and protected. Real Google → staff_roles → TOTP → aal2 → Admin API remains human verification pending.
- Next owner gate: repair/trigger Render deployment, then execute one real staff OAuth + Authenticator smoke test. Customer physical Worker → Render → Preview → Payment → Download remains NEEDS_VERIFICATION.
- Admin Fleet UI scope is CODE/UNIT VERIFIED: chỉ gọi `GET /fleet/workers` và map `online`/`nodeState === ACTIVE_IDLE`; production runtime awaits Render deployment + real AAL2 session.
- Fresh read-only probes: Vercel public bundle contains fleet/CRM markers and no old `Tiếp tục thanh toán` CTA; Render `/health` is HTTP 200 and `/staff/mfa-status` is HTTP 401 without credentials. No authenticated Admin PASS is claimed.
- 2026-08-06 Render crash evidence: backend fails closed at boot because the effective CORS environment input is `*`; set `CORS_ORIGINS=https://cws-portal.vercel.app` and remove any legacy `CORS_ORIGIN=*` before redeploy. See `reports/security/CWS_RENDER_CORS_CRASH_2026-08-06.md`.
- Historical pre-fix probe: `/health` HTTP 200, CORS preflight exposed `*`, and `/staff/mfa-status` was HTTP 404; this was resolved by the Founder Render configuration update above.
- 2026-08-06 CRM implementation: `GET /customers/crm` reads existing customer profiles, render orders, and paid payment rows; no duplicate schema or secrets. Backend/frontend tests and builds pass; real CRM data requires an Admin AAL2 session.
- 2026-08-06 production evidence: Vercel CRM UI deployment is READY; Render `/customers/crm` now returns HTTP 401 without credentials and `/health` 200 after auto-deploy. Route protection is verified; Admin AAL2 CRM data read remains NEEDS_VERIFICATION.
- 2026-08-06 counter/aggregate hardening: Fleet `ACTIVE_IDLE/BUSY/OFFLINE` counters use a canonical frontend helper with tests; CRM paid/non-paid/orphan/latest-job/lifecycle aggregation has direct unit coverage. Backend 141/141 and frontend 9/9 pass.
- 2026-08-06 Scheduler hardening: state-order regression coverage confirms render completion stops at `REVIEW_READY` and payment finalization is gated by `AWAITING_PAYMENT`; backend 141/141 PASS. Physical Worker runtime remains NEEDS_VERIFICATION.
- 2026-08-06 Worker/Security audit: staging project download now has HTTPS + explicit host allowlist + redirect rejection with Worker 38/38 PASS. This does not change the production NO-GO decision: Worker identity/RPC authentication, hostile Blend isolation, and physical Windows/GPU E2E remain blocked.
- 2026-08-06 security follow-up: `JobsController` no longer accepts the
  legacy shared admin key for cross-customer job access; Bearer + staff role +
  `aal2` is the only Admin path. Regression test added.

# Scale audit follow-up — 2026-08-06

- Scheduler now prevents overlapping ticks and reuses one fleet presence snapshot per tick.
- Payment one-intent-per-Job migration is prepared but requires duplicate preflight in isolated staging before application.
- 100/1,000 and 1,000/10,000 capacity remain unmeasured in real infrastructure. Evidence: `reports/scaling/CWS_CAPACITY_AND_CONCURRENCY_AUDIT_2026-08-06.md`.
- Upload memory bottleneck is mitigated in code with disk-backed streaming and cleanup; scheduler task reads are batched at 200 Job IDs per query. Runtime capacity remains NEEDS_VERIFICATION in isolated staging.

# Functional/security verification follow-up — 2026-08-06

- Local functional verification is green: frontend 9/9, backend 161/161 plus E2E `/health` 1/1, Worker 48/48, builds pass and frontend lint passes. Backend lint remains blocked by pre-existing repo-wide CRLF/Prettier violations; no bulk format was applied.
- TestSprite CLI integration was attempted; cloud execution is blocked only by missing `TESTSPRITE_API_KEY` and target configuration.
- Strix execution is blocked on this machine by missing Docker/runtime and approved LLM credential; no third-party security PASS is claimed.
- Fixed the backend E2E harness and CommonJS/ESM `archiver` packaging boundary. Details: `reports/security/CWS_TESTSPRITE_STRIX_FUNCTIONAL_SECURITY_AUDIT_2026-08-06.md`.
- Backend dependency audit remains a release risk: 5 high and 12 moderate findings, with breaking upgrade path; do not use `npm audit fix --force`.
- Upload object-key path/control-character hardening is code/unit verified; dependency remediation remains blocked on an isolated Nest 11 canary.

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
