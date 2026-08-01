# Official Decisions

Authentication

Google OAuth through Supabase only for MVP (updated 2026-08-01, replaces prior decision).

Facebook Login is removed from MVP.

No email/password.

No OTP.

No Zalo Login.

---

Payment

Vietnam Bank QR.

No MoMo.

No PayPal.

Official workflow order (confirmed 2026-08-01, already implemented — see CreateJobDto/JobsService.createOrder/JobsService.approve): Upload/Drive link -> confirm render -> create real Job in database -> Worker picks up Job -> Render -> generate watermarked Preview -> customer views Preview -> customer approves -> only then request payment -> confirm PAID -> unlock Final Output -> customer Download.

Payment must never be required before Render/Preview.

Job creation must never wait until the payment step.

Payment verification automation (confirmed 2026-08-01, researched from official docs): use **SePay** (sepay.vn) to auto-detect MB Bank incoming transactions for MVP. Free tier (0đ/month, 50 transactions/month) includes MB Bank support and webhook/API access from the start. Casso was evaluated and rejected for MVP — its free tier (30 transactions/month) has no custom webhook, only Telegram/email reports; webhook access requires the Starter paid plan (99k VND/month), which does not fit "ưu tiên giải pháp miễn phí". See `backend/BACKEND_SETUP.md` mục 3c for setup steps and `POST /payments/webhook/sepay` for the implementation.

**Webhook-only decision (confirmed 2026-08-01, after deeper architecture research — see `reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md`): use SePay "Webhook" only. Do NOT implement SePay "IPN" in this MVP.** Webhook and IPN are two genuinely different SePay features (different payload shape, partly different auth) but both depend on SePay first detecting the MB Bank transaction — running both does not create real data-source redundancy, only extra complexity. The existing Android MBBank Notification Listener remains the intended independent fallback (different failure domain — reads the MBBank app's own notification on-device, not routed through SePay at all).

Webhook authentication: **prefer HMAC-SHA256** (SePay's own recommended mechanism — signs the request body and includes a timestamp for replay protection) when the Owner's SePay dashboard offers it; fall back to the static API Key header (`Authorization: Apikey <key>`) if HMAC isn't selectable for the account/plan in use. `SepayWebhookGuard` supports both, selected automatically by which env var (`SEPAY_WEBHOOK_HMAC_SECRET` vs `SEPAY_WEBHOOK_API_KEY`) is configured, HMAC taking priority if both are set.

---

Storage

Backblaze B2.

---

Worker

Python.

---

Hosting

Vercel.

---

Database

Supabase.

---

Development

MVP First.

Avoid over-engineering.

---

Android

Notification Listener is research only.

Not required for MVP.

---

Worker Auto Update

Use B2 release.

Latest version comes from backend.

Never hardcode version.
