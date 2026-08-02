# Official Decisions

Authentication

**[ACTIVE]** Google OAuth through Supabase only for MVP (updated 2026-08-01).

**[SUPERSEDED — thay thế bởi Google OAuth 2026-08-01]** Facebook Login (quyết định gốc trước 2026-08-01) — đã gỡ khỏi MVP, KHÔNG implement lại.

**[ACTIVE]** No email/password.

**[ACTIVE]** No OTP.

**[ACTIVE]** No Zalo Login.

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

---

Storage

**[ACTIVE]** Backblaze B2.

---

Worker

**[ACTIVE]** Python.

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
