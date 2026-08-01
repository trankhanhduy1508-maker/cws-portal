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
