# Current Status

## Worker

✅ Heartbeat

✅ Register

✅ Upload

✅ Download

✅ Claim Job

✅ Auto Update (verified end-to-end: WORKER_VERSION + worker_config.latest_version = 1.17.0, B2 file worker-releases/cws_worker_full.py confirmed present/downloadable)

⬜ Runtime Test (BLOCKED — no physical Worker machine / Python / Blender in this environment)

---

## Upload

✅ B2 Upload

✅ Verify Upload

---

## Dashboard

✅ Progress

✅ Job Status

---

## Login

✅ Frontend (Google Login — provider: google, replaces Facebook per DECISIONS.md 2026-08-01)

⬜ Google OAuth provider enable (BLOCKED — needs Supabase Auth provider config + Google Cloud Console OAuth Client (Web) + Vercel env vars VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY, no CLI/API access to Supabase Auth Providers UI or Google Cloud Console in this environment — see reports/AUTH_GOOGLE_MIGRATION_REPORT.md for exact values/URLs)

⬜ Production Test

---

## Payment

✅ Backend

⬜ Auto Detect

⬜ Unlock

---

## Security

✅ RLS enabled on all sensitive tables (get_advisors: 0 ERROR)

✅ All 41 public RPC functions pinned search_path (fixed function_search_path_mutable WARN, migration worker_migrations/013)

---

## Android

Research only.

No longer MVP priority.

---

## Next Task

Google OAuth — BLOCKED, needs Project Owner action (Supabase Dashboard + Google Cloud Console + Vercel env vars, see reports/AUTH_GOOGLE_MIGRATION_REPORT.md for exact values).

Payment Auto Detect / Unlock — BLOCKED, needs real MB Bank account + webhook gateway credentials.

Worker Runtime Test — BLOCKED, needs physical Worker machine online.

Production testing — depends on above.
