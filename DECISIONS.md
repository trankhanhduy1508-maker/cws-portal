# Official Decisions

## Worker resilience remains inside the existing scheduler boundary — 2026-08-08

**[ACTIVE]** CWS adopts only small resilience patterns at the existing Worker
and Backend boundaries. The system retains PostgreSQL `FOR UPDATE SKIP LOCKED`
claim, `Job -> Task -> Worker -> Lease -> Generation -> Output` ownership,
stable per-Worker identity, task-scoped storage capabilities and generation
fencing. OmniRoute is explicitly rejected as a production dependency or
scheduler replacement.

**[ACTIVE]** Failure taxonomy is
`CUSTOMER_INPUT_ERROR`, `CAPABILITY_MISMATCH`, `BLENDER_RENDER_ERROR`,
`WORKER_HOST_ERROR`, `STORAGE_TRANSIENT`, `BACKEND_TRANSIENT`,
`NETWORK_TRANSIENT`, and `SECURITY_VIOLATION`. Only repeated host/render
failures affect Worker health; security fails closed. Existing
`health_state` is reused with additive `PROBING` recovery. Thresholds are
three open host/render occurrences for `DEGRADED` and five for
`QUARANTINED`; successful non-security probe returns `OK`.

**[ACTIVE]** Retry authority remains split: operation retry is bounded and
jittered in the Worker adapter; the canonical production Node Agent keeps
`max_retries=0` because Backend/Postgres owns task retry/failover through
`jobs.max_retry_attempts`, stale leases and generation fencing. These tiers
must not be merged.

This decision adds no broker, scheduler service, AI runtime, project or broad
credential. Migration `worker_migrations/027_worker_resilience_policy.sql`
is additive and service-role-only through the existing authenticated gateway.
Evidence: `reports/process/CWS_WORKER_RESILIENCE_ANALYZE_2026-08-08.md` and
`reports/evidence/CWS_WORKER_RESILIENCE_HARDENING_2026-08-08.md`.

## Mandatory GitHub Spec Kit execution framework - 2026-08-08

**[ACTIVE]** Every CWS change must pass through the checked-in execution
sequence `Constitution -> Specify -> Clarify (when needed) -> Plan -> Tasks ->
Analyze -> Implement -> Converge/Verify`. GitHub Spec Kit is layered above the
existing CWS documents; it does not replace the roadmap, workflow, schema,
architecture, status, decisions, or runtime evidence that own their domains.
The CWS constitution is `.specify/memory/constitution.md`, and `AGENTS.md`
must make this workflow discoverable to every future Codex session.

This decision changes agent execution only. It creates no runtime dependency,
new project/service/resource, broad credential, or application refactor. A
future change still requires the existing CWS evidence and source-of-truth
sync gates before it can be reported DONE. Evidence:
`reports/process/CWS_SPECKIT_INTEGRATION_2026-08-08.md`.

## Production browser runtime must fail closed — 2026-08-08

**[ACTIVE]** The customer application has no mock authentication, mock job,
mock progress, mock payment, or mock result module in any production build.
If Supabase or Backend configuration is missing, the portal must show a clear
error and must not create local customer/job state. ETA may be shown as a
non-binding estimate, but no final customer price or payment is shown until a
real Worker render has completed, the full output is locked on B2, and real
watermarked previews exist. The final price/payment is then shown without a
customer-approval gate.

**[ACTIVE]** A READY deployment, heartbeat, unit test, or local simulation is
not Production E2E evidence. Only a customer-owned stored input, durable job
and task assignment, physical Blender execution, verified B2 output, backend
completion and customer-visible result may establish that claim.

## Customer upload ownership and Worker claim capability — 2026-08-08

**[ACTIVE]** Customer upload and job creation require a valid Supabase customer
session. Backend records each B2 upload object key against the authenticated
user in a service-role-only table and verifies ownership before dispatch. A
client-supplied `fileRef` is never an authorization proof.

**[ACTIVE]** Workers declare only the supported canonical input schemes (`b2`
and optionally `google_drive`) on each authenticated claim. PostgreSQL performs
source filtering in the same atomic `FOR UPDATE SKIP LOCKED` claim, so a
B2-only Worker cannot consume unsupported Drive backlog.

**[ACTIVE]** Internal Worker/fleet `SECURITY DEFINER` functions are Backend/
database-internal APIs. Direct `PUBLIC`, `anon` or `authenticated` execution is
forbidden; canonical Workers use the HMAC-authenticated Backend gateway.

## Worker RPC gateway-only boundary — 2026-08-08

**[ACTIVE]** Production Worker control-plane RPCs are executable only through
the authenticated Backend Worker gateway. Direct `anon`/`authenticated`
Supabase EXECUTE is revoked for current and historical Worker registration,
claim, heartbeat, progress, completion, failure and state RPCs. Backend
`service_role` execution remains explicitly granted; Workers never receive a
Supabase service-role key. Production migration `worker_rpc_gateway_only`
version `20260808023827` is verified. Evidence:
`reports/evidence/CWS_PRODUCTION_E2E_V2_2_P0_REALITY_CHECK_2026-08-08.md`.

## Secure first-run Worker enrollment — 2026-08-07

**[ACTIVE]** The canonical Node Agent must not self-register a production
Worker from hostname, GPU, `worker_id`, or an unauthenticated caller-supplied
`register_worker` request. Current production evidence has 29 registry rows,
0 identities, 0 leases, and 0 fresh heartbeats; MAY083 cannot be mapped safely
without a bootstrap trust anchor. Any future auto-provision flow must first
authenticate the machine or a one-time Owner-issued enrollment credential, then
issue the existing per-worker DPAPI/HMAC credential. Evidence:
`CWS_PROVISIONING_AUTO_BIND_GATE_2026-08-07.md`.

## B2-first Worker input — 2026-08-07

**[ACTIVE]** Production Worker input may use authenticated B2 objects directly;
Google Drive is optional and is required only for Drive-backed JobSpecs. The
Node Agent must not require a Drive API key for B2-only jobs. Missing Drive
configuration must fail closed only when a Drive URI is actually assigned.

## Production Worker host binding audit — 2026-08-07

**[ACTIVE]** Do not infer or reuse a production `worker_id` for a physical
host from GPU, hostname or registration age. The production schema currently
has no hostname/device-fingerprint mapping, `worker_identities` is empty, and
the canonical Node Agent requires an explicitly provisioned per-Worker
credential. The legacy `register_worker` RPC accepts a caller-supplied ID and
is not an acceptable automatic binding mechanism. Any future auto-bind must
use an approved bootstrap identity contract and preserve per-Worker
credential/HMAC isolation. Evidence:
`reports/evidence/CWS_PRODUCTION_WORKER_AUTO_BIND_AUDIT_2026-08-07.md`.

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

**[SUPERSEDED — by Worker RPC gateway-only boundary 2026-08-08]** Worker
publishable RPCs remain available because the staging/full-E2E contract depends
on them. Production now uses the authenticated Backend gateway and direct
client-role EXECUTE is revoked.

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
submit/upload → job → render/progress → validate output → upload FULL OUTPUT
vào B2 ở trạng thái LOCKED → tạo 3–5 preview watermark thật → tính giá runtime
→ tạo payment record/payment code/MB QR → SePay kiểm tra đúng reference + amount
và idempotency → PAID → unlock/download output. Không tạo payment trước khi
render, validate, full-output lock và preview hoàn tất. `JobsService`
`createPaymentAfterRender()` là boundary tạo payment; `finalizeDelivery()` chỉ
unlock output đã upload sau PAID, không render/package/upload lại.

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

**[ACTIVE — supersedes the older customer-approval wording on 2026-08-08]**
Official workflow order: Upload/Drive link -> create real Job -> Worker picks up
Job -> real Blender render/progress -> validate output -> upload FULL OUTPUT to
B2 LOCKED -> generate 3–5 real watermarked previews -> compute FINAL PRICE ->
create payment record/payment code/MB QR -> SePay verifies exact reference and
amount with idempotency -> PAID -> unlock authorized B2 download -> customer
download. Customer preview approval is not a prerequisite for payment.

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

**[SUPERSEDED 2026-08-08 BY JOB-SCOPED STORAGE CAPABILITIES]** B2 credential Worker (thêm 2026-08-03): không hardcode
trong `cws_worker_full.py` (file bị auto-update, phân phối rộng) —
bắt buộc đọc `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` từ biến môi trường, set
cục bộ qua `cws_worker.bat` trên từng máy (file không bị auto-update).
Scope tối thiểu xác nhận qua audit thật: bucket `MTEB90`, prefix
`renders/`, Read+Write, không cần delete/quản lý bucket. Xem
`reports/worker/CWS_B2_LEAST_PRIVILEGE_AUDIT_2026-08-03.md`.

---

Hosting

**[ACTIVE]** Vercel.

**[ACTIVE]** CWS has exactly one canonical Vercel production project:
`cws-portal` serving `https://cws-portal.vercel.app`. Normal deployment is a
push to `main` through that existing Git Integration. Agents must not import
the repository into a new Vercel project or run project-creation automation.
Duplicate projects require environment/domain comparison before an authorized
Vercel operator disconnects or deletes them.

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

**[ACTIVE — approved by Issue #18 / Roadmap V2.2 on 2026-08-08]** Production Workers use one random
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
payment creation/confirmation endpoints are Admin AAL2-only; the scheduler
creates payment exclusively inside `JobsService.createPaymentAfterRender()`
after the locked final output and real previews exist. This prevents public
payment spam, payment existence leakage and client-controlled state transitions.

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

## ZIP/RAR project input boundary - 2026-08-08

**[ACTIVE]** MVP accepts `.blend` directly, `.zip`, or `.rar` containing exactly
one `.blend`. The generic Worker extracts archives only inside the per-attempt
workspace, preserves relative asset paths, rejects traversal, links/reparse
points, duplicate/ambiguous entries, nested archives and bounded archive-bomb
sizes/ratios. RAR uses managed 7-Zip through an argument vector with no shell.
Existing `render_orders.project_name` remains input-name metadata; no duplicate
database column is introduced. Production B2 and physical Worker archive runtime
remain separate verification gates.

## Safe customer Blend optimization boundary - 2026-08-08

**[ACTIVE]** Every customer `.blend` follows immutable original -> read-only
Blender analyzer -> working copy -> safe optimizer -> analyzer validation ->
render. The original is hash-checked before and after preparation and is never
passed to a mutating optimizer. The approved optimizer may only apply the
harmless working-copy policy already covered by code/tests; it must not reduce
samples, resolution, subdivision, texture/asset quality, volumetrics or change
the render engine without a separately approved benchmark/policy. Customer
files run with Blender CLI/background and `--disable-autoexec`.

## Runtime pricing boundary - 2026-08-07

**[ACTIVE]** After render completion, locked full-output upload and real preview
generation, customer price is
computed from recorded Worker runtime using a 6,000 VND/worker-hour host
baseline multiplied by 2.5. If verified execution/heartbeat runtime is absent
or invalid, payment creation must fail closed; no demo or minimum fallback price
may be created. Production payment remains gated on this runtime-derived amount.

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

## Physical Worker stable identity provisioning — 2026-08-08

**[ACTIVE]** A trusted operator provisions a physical Windows host through the
existing per-worker identity contract. When no prior ID exists, the tool derives
a stable non-secret ID from SHA-256(`cws-worker-v1:` + normalized Windows
MachineGuid); the raw MachineGuid is never stored in Supabase, logs or Git.
Provisioning must run after a host image is specialized; a pre-provisioned
DPAPI store/ID must never be copied into a golden image.
Provisioning atomically creates the `workers` registry row and upserts only the
credential hash/expiry in `worker_identities`; plaintext exists only inside the
same-user Windows DPAPI store. Re-provisioning rotates that one Worker without
changing any fleet-wide secret. This does not revive unauthenticated
self-registration or caller-trusted `worker_id`.

**[SUPERSEDED 2026-08-08]** Scoped B2 credentials as per-host runtime
configuration are no longer canonical. Workers must not receive long-lived B2
credentials and must not require `CWS_B2_*` values before claiming work.

Evidence: `reports/evidence/CWS_PRODUCTION_E2E_V2_2_P1_MAY083_PROVISIONING_2026-08-08.md`.

## Job-scoped Worker storage capabilities — 2026-08-08

**[ACTIVE]** Long-lived Backblaze B2 application credentials stay only on the
trusted Backend. An authenticated Worker that owns the current fenced task
generation may request a short-lived (120-second), exact-object S3-compatible
presigned GET for its input or PUT/GET for an assigned output frame. Backend
derives bucket/key/frame bounds from server-side JobSpec and never trusts a
Worker-supplied object key.

Worker provisioning stores only the per-Worker HMAC identity credential under
Windows DPAPI/ACL. There is no manual B2 operation per Worker or per Job. A
compromised Worker can request capabilities only for its currently claimed
task and capability lifetime; it cannot obtain the B2 account key, Supabase
service role, another job's arbitrary key, or fleet-wide storage access. Adding
Worker 101/1001 uses the same enrollment contract.

Backblaze's official S3-compatible API documents presigned URL support for
upload and download. Native `b2_get_upload_url` was rejected because its
reusable bucket upload token is broader and may remain valid for up to 24
hours. Evidence: `reports/security/CWS_JOB_SCOPED_B2_CAPABILITY_2026-08-08.md`.

## Bounded Worker enrollment through Backend — 2026-08-08

**[ACTIVE; SUPERSEDES per-Worker SQL provisioning as the normal fleet path]**
Normal Worker 2–100 enrollment uses short-lived one-time tickets issued only by
an Admin Google OAuth session with TOTP/AAL2. A ticket is bound to one stable
Worker ID and consumed atomically. The final credential is generated on the
Worker, stored under same-user Windows DPAPI/ACL, and only its SHA-256 verifier
reaches Backend/Postgres. Lost-response retry is idempotent only for the exact
same Worker/credential; existing identities cannot be overwritten by an
enrollment ticket.

There is no global enrollment secret, manual database edit, B2 credential or
Supabase service role on a Worker. A compromised Worker cannot issue tickets
and therefore cannot create fleet identities. The existing offline SQL helper
is retained only as recovery/reference and is no longer the canonical normal
fleet-growth procedure.

Evidence: `reports/security/CWS_BOUNDED_WORKER_ENROLLMENT_2026-08-08.md`.
