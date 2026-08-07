# Official Decisions

## Failover preflight and Worker provisioning — 2026-08-06

**[ACTIVE]** Migration 020/021 is applied only after the read-only preflight.
DDL fails closed on a busy table (`lock_timeout=5s`); the retry constraint is
additive `NOT VALID` and existing rows are not silently rewritten. Worker
identity/audit rows are retained on rollback; revoke is preferred to deletion.

**[ACTIVE]** Production Worker fleet membership and capability are provisioned
out-of-band. `register_worker` is not exposed through the authenticated Worker
gateway. Rotation replaces the hash; revocation marks the identity revoked.

## Worker failover/reassign contract — 2026-08-06

**[ACTIVE — implementation prepared; production apply requires approval]**
Automatic recovery uses the existing pull scheduler and `tasks.generation` as
the fencing token. A Worker is eligible only when its presence is fresh, its
health/desired state permits work, and its capability matches the task. A
stale active lease is superseded and requeued to another eligible Worker;
`failed_by` prevents immediate reassignment to the failed Worker. Each Job
has bounded `max_retry_attempts` (default 3, bounded 1–10); exhaustion becomes
an explicit task failure. Old attempts cannot heartbeat, complete or finalize
after generation changes. Partial frame checkpointing remains
renderer/storage-dependent; the MVP restarts an unresumable task rather than
claiming false resume. Evidence:
`reports/worker/CWS_WORKER_PROVISIONING_FAILOVER_2026-08-06.md`.

## Remediation decisions — 2026-08-05

**[ACTIVE]** Production CORS is an explicit canonical-origin allowlist with `credentials: false`; wildcard origins are rejected. Staging/local origins are tested only through non-production configuration.

**[ACTIVE]** Historical credentials are never printed or embedded in reports. Legacy credential-bearing helpers are disabled; production rotation is Owner-controlled and follows replacement → deploy/health-check → revoke-old order.

**[ACTIVE]** Worker publishable RPCs remain available only because the current staging/full-E2E contract depends on them; production rollout remains blocked until worker node authentication is redesigned and reviewed. Migration 019 was applied only to staging.

Authentication

**[ACTIVE]** Google OAuth through Supabase only for MVP (updated 2026-08-01).

**[SUPERSEDED — thay thế bởi Google OAuth 2026-08-01]** Facebook Login (quyết định gốc trước 2026-08-01) — đã gỡ khỏi MVP, KHÔNG implement lại.

**[ACTIVE]** No email/password — áp dụng cho đăng nhập KHÁCH HÀNG
(Google OAuth only). KHÔNG áp dụng cho Admin/Host (staff), xem quyết
định "Admin Authentication" riêng ngay dưới — 2 nhóm người dùng khác
nhau, không mâu thuẫn nhau.

**[ACTIVE]** No OTP.

**[ACTIVE]** No Zalo Login.

---

Admin Authentication (thêm 2026-08-02)

**[SUPERSEDED — thay thế bởi quyết định Google OAuth + AAL2 2026-08-06]**
Admin/Host đăng nhập bằng Supabase Auth email/password. Thiết kế cũ này
không còn đáp ứng yêu cầu Owner về Google Login cho Admin.

**[ACTIVE — 2026-08-06]** Admin/Host (staff, KHÔNG phải khách hàng) đăng
nhập bằng Google OAuth qua Supabase Auth. Chỉ user đã được cấp `staff_roles`
mới được vào bước MFA; không có đăng ký hoặc bypass. Sau OAuth, bắt buộc
TOTP chính thức của Supabase Auth (`supabase.auth.mfa.*`), không tự lưu/quản
lý TOTP secret và không dùng thư viện TOTP bên thứ ba. Backend chỉ mở Admin
data routes khi token hợp lệ, role đúng và claim `aal2`; pre-MFA status route
chỉ xác nhận staff identity để hoàn tất onboarding, không trả dữ liệu Admin.

## Founder product scope — 2026-08-06

**[SUPERSEDED — thay thế bởi Founder Admin Fleet + Customer CRM 2026-08-06]** Admin MVP (`/#admin`) chỉ là Worker Fleet Status Dashboard. Chỉ
hiển thị tổng số Worker, Online, Offline và `ACTIVE_IDLE` với nhãn
"Đang chờ / Idle Saver". `ACTIVE_IDLE` là state đã có trong Node Agent/Worker
contract: máy vẫn online, không render, giữ control channel/heartbeat và áp
dụng policy idle an toàn; không tạo state mới và không thực hiện Sleep,
Hibernate, shutdown hoặc thay đổi power policy ngoài contract. Admin không
hiển thị customer jobs, render progress, preview, payment hay download.

**[ACTIVE]** Customer portal (`/`) là flow render độc lập:
submit/upload → job → render/progress → render hoàn tất → preview → customer
approve → tính và hiển thị số tiền thanh toán runtime → payment → webhook
verified/PAID → unlock/download output. Không tạo payment, không yêu cầu
payment và không hiển thị số tiền cần thanh toán trước khi render hoàn tất.
Backend `JobsService.approve()` là boundary tạo payment sau `REVIEW_READY`;
`finalizeDelivery()` chỉ đóng gói/mở download sau `PAID`.

**[SUPERSEDED — thay thế bởi quyết định MFA 2026-08-02 ở trên]** Bảo vệ
Admin Portal chỉ bằng 1 shared secret tĩnh (`x-admin-key`) không gắn
với tài khoản/MFA cụ thể nào — nhánh này đã bị GỠ KHỎI `RoleGuard` (vẫn
còn ở 3 route legacy ngoài phạm vi Admin Portal chính: preview/logs/
download của `JobsController`, xem report trên mục lý do giữ lại).

---

Payment

**[ACTIVE]** Vietnam Bank QR.

**[ACTIVE]** No MoMo.

**[ACTIVE]** No PayPal.

**[ACTIVE]** Official workflow order (confirmed 2026-08-01, already implemented — see CreateJobDto/JobsService.createOrder/JobsService.approve): Upload/Drive link -> confirm render -> create real Job in database -> Worker picks up Job -> Render -> generate watermarked Preview -> customer views Preview -> customer approves -> only then request payment -> confirm PAID -> unlock Final Output -> customer Download.

**[ACTIVE]** Payment must never be required before Render/Preview.

**[ACTIVE]** Job creation must never wait until the payment step.

**[ACTIVE]** Payment verification automation (confirmed 2026-08-01, researched from official docs): use **SePay** (sepay.vn) to auto-detect MB Bank incoming transactions for MVP. Free tier (0đ/month, 50 transactions/month) includes MB Bank support and webhook/API access from the start. Casso was evaluated and rejected for MVP — its free tier (30 transactions/month) has no custom webhook, only Telegram/email reports; webhook access requires the Starter paid plan (99k VND/month), which does not fit "ưu tiên giải pháp miễn phí". See `backend/BACKEND_SETUP.md` mục 3c for setup steps and `POST /payments/webhook/sepay` for the implementation.

**[ACTIVE]** **Webhook-only decision (confirmed 2026-08-01, after deeper architecture research — see `reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md`): use SePay "Webhook" only. Do NOT implement SePay "IPN" in this MVP.** Webhook and IPN are two genuinely different SePay features (different payload shape, partly different auth) but both depend on SePay first detecting the MB Bank transaction — running both does not create real data-source redundancy, only extra complexity. The existing Android MBBank Notification Listener remains the intended independent fallback (different failure domain — reads the MBBank app's own notification on-device, not routed through SePay at all).

**[ACTIVE]** Webhook authentication: **prefer HMAC-SHA256** (SePay's own recommended mechanism — signs the request body and includes a timestamp for replay protection) when the Owner's SePay dashboard offers it; fall back to the static API Key header (`Authorization: Apikey <key>`) if HMAC isn't selectable for the account/plan in use. `SepayWebhookGuard` supports both, selected automatically by which env var (`SEPAY_WEBHOOK_HMAC_SECRET` vs `SEPAY_WEBHOOK_API_KEY`) is configured, HMAC taking priority if both are set. RUNTIME VERIFIED via SePay Sandbox 2026-08-02 (see reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md).

**[ACTIVE]** SePay Test Mode/Sandbox is a fully separate SePay account (`my.dev.sepay.vn`) from Live (`my.sepay.vn`), confirmed 2026-08-02 from official docs — CWS isolates them via a separate route (`POST /payments/webhook/sepay/test`) + separate guard + separate secret (`SEPAY_WEBHOOK_HMAC_SECRET_TEST`/`SEPAY_WEBHOOK_API_KEY_TEST`), reusing the exact same matching/idempotency logic as Live (single Supabase project, no parallel data model). See `reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md`.

**[ACTIVE]** Payment reconciliation (thêm 2026-08-03, payment/refund
safety net): dùng 1 SQL view chỉ-đọc (`payment_reconciliation_anomalies`,
migration 015) thay vì cron job/backend feature mới — đủ để Admin phát
hiện bất thường ngay qua Supabase SQL Editor, không cần môi trường
build (Node/npm không có trong môi trường agent lúc fix). Khi có môi
trường build, nên wire thẳng view này vào Admin Dashboard thay vì viết
lại logic. Xem `reports/payments/CWS_PAID_ORPHAN_ORDER_FINDING_2026-08-03.md`.

**[ACTIVE]** Payment reconciliation — wire vào Admin Dashboard (thêm
2026-08-03, sau khi có môi trường Node/npm portable): `GET
/payments/reconciliation-anomalies` (`RoleGuard`, admin-only) đọc
THẲNG view `payment_reconciliation_anomalies` qua
`PaymentsRepository.listReconciliationAnomalies()` — KHÔNG viết lại
logic phát hiện bất thường ở Backend/Frontend, view vẫn là nguồn sự
thật duy nhất, đúng quyết định ở trên. `AdminScreen.jsx` hiển thị 1
bảng mới ngay sau bảng Job (ưu tiên hiển thị cao hơn Worker Fleet vì
là rủi ro tiền/khách trực tiếp). Xem
`reports/payments/CWS_PAYMENT_RECONCILIATION_DASHBOARD_WIRING_2026-08-03.md`.

---

Storage

**[ACTIVE]** Backblaze B2.

---

Worker

**[ACTIVE]** Python.

**[ACTIVE]** Generic MVP job claim (thêm 2026-08-03, Owner uỷ quyền
trực tiếp): Worker (`cws_worker_full.py`) claim job MVP thật do khách
tạo qua Portal bằng RPC additive `claim_next_generic_task()` (migration
014) — phân biệt job Portal vs job Owner tự cấu hình bằng đặc điểm CẤU
TRÚC id (UUID vs tên tay), KHÔNG dùng danh sách loại trừ. `JOB_IDS_MULTI`
(Owner tự chọn) luôn được thử claim TRƯỚC, không đổi hành vi Fleet cũ.
Xem `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`.

**[ACTIVE]** `--enable-autoexec` chỉ bật cho job Owner tự chọn
(JOB_IDS_MULTI); TẮT hẳn cho job MVP khách tự upload (claim qua
`claim_next_generic_task()`) — input không tin cậy không được phép
thực thi Python script tuỳ ý từ file `.blend`. Xem
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` mục 2.3 +
`reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`.

**[ACTIVE]** B2 credential Worker (thêm 2026-08-03): không hardcode
trong `cws_worker_full.py` (file bị auto-update, phân phối rộng) —
bắt buộc đọc `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` từ biến môi trường, set
cục bộ qua `cws_worker.bat` trên từng máy (file không bị auto-update).
Scope tối thiểu xác nhận qua audit thật: bucket `MTEB90`, prefix
`renders/`, Read+Write, không cần delete/quản lý bucket. Xem
`reports/worker/CWS_B2_LEAST_PRIVILEGE_AUDIT_2026-08-03.md`.

---

Hosting

**[ACTIVE]** Vercel.

---

Database

**[ACTIVE]** Supabase.

---

Development

**[ACTIVE]** MVP First.

**[ACTIVE]** Avoid over-engineering.

---

Android

**[ACTIVE]** Notification Listener is research only.

**[ACTIVE]** Not required for MVP.

---

Worker Auto Update

**[ACTIVE]** Use B2 release.

**[ACTIVE]** Latest version comes from backend.

**[ACTIVE]** Never hardcode version.


## Worker architecture correction — 2026-08-05

Owner xác nhận cws_worker_full.py là legacy Worker. Quyết định: không restore/copy/để Worker mới phụ thuộc artifact cũ. Worker fleet cài Engine một lần; mỗi JobSpec/TaskSpec mới là dữ liệu động từ Backend/Scheduler. Node Agent quản lý presence/lifecycle/supervision; Backend quản lý assignment/lease/priority/retry/billing; Worker chỉ thực thi một attempt render và thoát.

Evidence: reports/worker/CWS_WORKER_LEGACY_SALVAGE_MATRIX_2026-08-05.md.

## Founder Admin Fleet + Customer CRM — 2026-08-06

**[ACTIVE]** Admin MVP (`/#admin`) có hai khu vực tách biệt: Worker Fleet gồm
Tổng Worker, Online, Offline, `ACTIVE_IDLE`/Idle Saver và `BUSY`/Đang Render,
map trực tiếp từ `GET /fleet/workers`; Customer CRM tối giản đọc từ các bảng
đã có `customer_profiles`, `render_orders` và `payments`. CRM chỉ hiển thị
email, tên Google nếu có, mốc đăng ký/hoạt động, tổng job, job hoàn thành,
tổng payment đã `paid` đáng tin cậy, job gần nhất và lifecycle `new`/
`rendered`/`returning`. Không tạo schema CRM trùng lặp, không lưu
password/token/secret, và chỉ Admin/Host qua `RoleGuard` + AAL2 được đọc.
Không thêm campaign, sales pipeline hay marketing automation.

## Worker production identity/RPC — 2026-08-06

**[PROPOSED — Founder approval required]** Production Workers use one random
per-worker credential, stored only as a SHA-256 hash by the backend. Requests
use HTTPS, `Authorization: Worker`, worker id, timestamp, unique nonce and
HMAC-SHA256 over the method/path/raw-body hash. Backend checks lifecycle,
expiry, revocation and nonce uniqueness, then calls only an allowlisted RPC
with the authenticated worker id injected server-side. Node Agent stores the
credential in user-scoped Windows DPAPI under a dedicated least-privilege
account. Worker id alone is never authentication and no fleet-wide shared
secret is used. Full contract/evidence: `reports/security/CWS_WORKER_PRODUCTION_IDENTITY_RPC_CONTRACT_2026-08-06.md`.

## Admin job authorization hardening — 2026-08-06

**[ACTIVE]** Shared `x-admin-key`/`?adminKey=` is not an Admin identity and is
not accepted by `JobsController`. Cross-customer job access requires a valid
Supabase Bearer token, an authorized `staff_roles` row, and server-side
`aal2`. Customer ownership checks remain unchanged.

## Capacity guardrails — 2026-08-06

**[ACTIVE]** Scheduler ticks must not overlap and must reuse one fleet-presence
snapshot within each tick; this reduces query amplification without changing
Worker assignment ownership.

**[ACTIVE]** A Job may have at most one payment intent.
`backend/migrations/017_payment_one_intent_per_job.sql` is the additive database
race guard; preflight and isolated staging application are required before
production. No duplicate payment rows are deleted automatically.

**[ACTIVE]** Capacity claims require measured isolated staging evidence. Local
simulation results are algorithmic only and never authorize a production
scale claim.

**[ACTIVE]** MVP upload uses disk-backed streaming temporary storage with
bounded multipart limits and cleanup; B2 receives a read stream. Scheduler
task reads use batches of 200 Job IDs. Direct-to-B2 multipart and broker/queue
infrastructure remain deferred until staging metrics prove they are needed.

## SQL source of truth and Redis boundary - 2026-08-06

**[ACTIVE]** CWS MVP keeps PostgreSQL/Supabase as the source of truth for
users, Worker registry, jobs/tasks, leases/generations, pricing, payments,
render results and audit/history. The current heartbeat contract updates
presence/lease atomically in PostgreSQL and does not create a history row for
every heartbeat. Redis is not added to MVP because the repository has no Redis
client/deployment and no isolated staging evidence of a DB presence bottleneck.
If a measured bottleneck appears later, Redis may be introduced only for
ephemeral presence TTL, scheduler locks/cache and transient progress; it must
have a safe PostgreSQL fallback and never own payment or financial state.

Evidence: `reports/scaling/CWS_100_CUSTOMER_BACKEND_LOAD_SIMULATION_2026-08-06.md`.

## Job create idempotency - 2026-08-06

**[ACTIVE]** `POST /jobs` uses a client-supplied opaque `Idempotency-Key`.
The key is globally unique in `render_orders`, bounded and paired with a
server-generated request fingerprint. Same-key/same-payload retries return the
original Job; same-key/different-payload requests are rejected. PostgreSQL's
unique index is the correctness boundary for concurrent retries. The key is
not a credential and is never logged as a secret. Migration 018 must pass
isolated staging preflight before production application.

## API security boundary — 2026-08-06

**[ACTIVE]** Payment details are customer-owned data: `GET /payments/:id`
requires the linked job owner or a server-verified Admin AAL2 session. Direct
payment creation/confirmation endpoints are Admin AAL2-only; customer payment
creation remains exclusively inside `JobsService.approve()` after
`REVIEW_READY`. This prevents public payment spam, payment existence leakage
and client-controlled state transitions.

**[ACTIVE]** MVP abuse protection uses bounded in-process limits on expensive
upload, Drive resolve, job and payment-detail routes, plus strict DTO bounds and
global whitelist rejection. A shared edge limiter may be added only after
staging evidence or deployment configuration requires it.

## NestJS major upgrade gate - 2026-08-07

**[ACTIVE]** NestJS 11 is evaluated only in an isolated canary. The canary
passed 172/172 tests and build, and `js-yaml` 5.2.3 removed its remaining audit
finding. Production stays on Nest 10 until the canary is validated against
isolated Supabase/B2/Worker/payment staging and the major-upgrade regression
gate is explicitly cleared. No `npm audit fix --force` is allowed.

## Premium UI implementation boundary - 2026-08-07

**[ACTIVE]** The MVP presentation layer uses a dark responsive theme and a
lightweight CSS 3D CWS mark. Three.js is intentionally not added before MVP
runtime verification: the effect is decorative, while the existing customer
state machine and render-before-payment gate remain unchanged.

## ZIP project input boundary - 2026-08-07

**[ACTIVE]** MVP accepts `.blend` directly or `.zip` containing exactly one
`.blend`. The generic Worker extracts ZIPs only inside the per-attempt
workspace, preserves relative asset paths, rejects traversal/symlink/ambiguous
archives, and never recursively extracts nested archives. Existing
`render_orders.project_name` remains the input-name metadata; no duplicate
database column is introduced. Production B2 and physical Worker ZIP runtime
remain separate verification gates.

## Runtime pricing boundary - 2026-08-07

**[ACTIVE]** After render completion and preview approval, customer price is
computed from recorded Worker runtime using a 6,000 VND/worker-hour host
baseline multiplied by 2.5. If verified execution/heartbeat runtime is absent
or invalid, approval must fail closed; no demo or minimum fallback price may be
created. Production payment remains gated on this runtime-derived amount.

## Production Node Agent bridge - 2026-08-07

**[ACTIVE]** The production Worker runtime is the credential-gated
`production_node_agent.py` loop, not the legacy Worker scripts or staging
harness. It must obtain the assignment through the authenticated backend
gateway, read a complete dynamic JobSpec only while holding the current
task/generation lease, and use the generic `worker_engine.py` for Drive/B2
download, Blender execution, checkpoint upload and status reporting. The
read-only spec bridge is prepared in migration 022; production application,
per-worker provisioning and physical runtime verification remain gates.

## Legacy Worker parity boundary — 2026-08-07

**[ACTIVE]** `cws_worker_full.py` and `worker_full.py` are knowledge
references only. Production must not restore their unpinned dependency
installation, unsafe Blender auto-execution, remote shutdown/update, or blind
scene mutation. Equivalent MVP capabilities use the modular Node Agent/Worker
Engine path: pinned Blender bootstrap, authenticated dynamic JobSpec, safe
`.blend`/`.zip` handling, read-only scene preflight, bounded process ownership,
checkpointed output integrity and redacted host telemetry. Physical
Worker/B2/backend E2E is still required before claiming Worker DONE.

Evidence: `FEATURE_PARITY_LEGACY_VS_PRODUCTION.md`.

## Production input signature validation — 2026-08-07

**[ACTIVE]** The production Worker validates downloaded project bytes before
preflight: `.blend` must have a `BLENDER` header or a gzip stream whose
decompressed prefix is `BLENDER`; `.zip` must have a ZIP signature. HTML/error
responses are rejected and removed. This protects the real Blender path from
Drive/CDN error payloads without trusting MIME or filename alone.

Evidence: `reports/worker/CWS_OFFICIAL_BLENDER_FIXTURE_VERIFICATION_2026-08-07.md`.
