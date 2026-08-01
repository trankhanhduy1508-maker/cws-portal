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

✅ Landing/Upload flow merged into a single first page (2026-08-01): hero + Upload zone + Drive-link paste + "Đăng nhập với Google" + "Bắt đầu render" CTA are all visible immediately, no forced login gate before seeing them. Login is only required when the render CTA is actually pressed; on success (mock-verified via Playwright screenshot, see reports/AUTH_GOOGLE_MIGRATION_REPORT.md) the flow auto-continues straight to Render Profile selection — no dead-end login screen. Pasted Drive links survive a real OAuth full-page redirect (persisted via sessionStorage, re-resolved through the real backend call on return); a manually-selected file does not (browser File objects can't survive a page reload) — customer re-selects it once, already authenticated.

✅ Google OAuth provider enabled on Supabase (Owner-confirmed 2026-08-01, independently verified via public `GET /auth/v1/settings` endpoint: `"google": true`, `"facebook": false`)

✅ Production URL confirmed (Owner, 2026-08-01): **https://cws-portal.vercel.app/** — RUNTIME VERIFIED (one-off Playwright against the live site, not a project dependency, removed after use): page loads (`HTTP 200`), renders all 4 required elements identically to local (hero, Upload/Drive tabs, "Đăng nhập với Google", "Bắt đầu render"), zero "Facebook" text anywhere, zero browser console errors. `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` confirmed correctly set on Vercel (proven, not assumed — see below).

✅ **REAL Google login completed by Owner on production (2026-08-01) — verified end-to-end directly against the database, not assumed:**
- `auth.users`: real user `galavang9999@gmail.com`, `provider: google`, `last_sign_in_at` matches the reported login time.
- `customer_profiles` trigger (`handle_new_auth_user()`) correctly fired: `full_name: "Tran Khanh"` and `avatar_url` (real Google profile photo URL) both correctly extracted from Google's OAuth claims; `phone: null` (correctly not fabricated, per requirement).
- **`consent_source: "google_login"`** — this is live proof the migration 016 fix (dynamic provider instead of the old hardcoded `'facebook_login'`) works correctly on a real account, not just in theory.
- Repeat-login upsert behavior confirmed correct: `consent_at`/`created_at` preserved from first login, `last_login_at`/`updated_at` refreshed on the later login — matches the `ON CONFLICT (id) DO UPDATE` design exactly (no duplicate profile created).
- RLS re-verified against this **real** row (not a test row): anonymous/unauthenticated REST requests to `customer_profiles` — both unfiltered and targeting this exact `id` directly — return `[]`. Confirms row-level security genuinely protects real customer data, not just passes a synthetic test.
- No `render_orders` yet for this customer (Owner completed login only, hasn't created a job) — Job/Upload/Render/Payment steps remain unverified against the real backend; that requires either the Owner driving the real UI through a job (I have no access to their authenticated browser session to do this myself), a physical Worker machine, or real bank credentials — see Next Task.

✅ Google OAuth initiation chain RUNTIME VERIFIED end-to-end up to the point requiring real human credentials: clicked "Đăng nhập với Google" on production → correctly redirected through Supabase's OAuth authorize flow → landed on the **real** `accounts.google.com` sign-in page, confirmed via full URL inspection: `redirect_uri=https://ynhxlxetwuiyejcjypsi.supabase.co/auth/v1/callback` (exact match to the correct Supabase project), `client_id=767392504649-...apps.googleusercontent.com` (a real registered Google OAuth client), `opparams` embeds `redirect_to=https://cws-portal.vercel.app` (confirms the post-login return trip is correctly configured for this exact production domain), `scope=email+profile`. Screen showed Google's real "Sign in with Google / to continue to ynhxlxetwuiyejcjypsi.supabase.co". **Stopped exactly there — no credentials entered, cannot be automated further.**

⬜ Remaining: the actual credential entry + consent click (requires Owner, a human, one time) — then session restore / refresh / logout against the real Supabase session, which I can verify immediately after if Owner does that one click and reports back (or if a session cookie is somehow shared, though a fresh manual login is simplest).

---

## Payment

✅ Backend — CODE VERIFIED: webhook (`POST /payments/webhook`, `WebhookSecretGuard`), MBBank Android Notification Listener (`POST /payment/notification`, `DeviceSignatureGuard` — per-device HMAC, not a shared secret), device heartbeat, admin device listing — all real implementations, not stubs (confirmed by reading the actual controller/service code, not assuming from docs). 73/73 backend unit tests pass.

⬜ Auto Detect / Unlock — RUNTIME NOT VERIFIED (code is complete; what's missing is a real MB Bank transaction + real webhook gateway credentials to trigger it against, which this environment doesn't have)

---

## Security

✅ RLS enabled on all sensitive tables (get_advisors: 0 ERROR)

✅ All 41 public RPC functions pinned search_path (fixed function_search_path_mutable WARN, migration worker_migrations/013)

---

## Android

Research only.

No longer MVP priority.

---

## Git / Deployment

✅ `git push` to `origin/main` restored (2026-08-01) — root cause was NOT the credential-helper precedence conflict initially suspected (that was real and fixed, but proven-not-causal via SHA256 comparison showing `manager`/`store` cached the identical token); actual cause was GitHub denying that one PAT specifically for `git-receive-pack`, confirmed by hitting that exact endpoint directly. Fix: registered an SSH deploy key (`cws-portal-deploy`, "Allow write access") and switched this repo's remote to SSH (`git@github.com:...`, `core.sshCommand` pinned locally to the deploy key — scoped to this repo only). Full investigation: reports/GIT_PUSH_403_INVESTIGATION.md.

✅ 8 pending commits pushed to `origin/main` as of this update (Facebook→Google migration, landing/upload flow merge, MODEL_POLICY.md integration, this investigation report).

✅ Vercel auto-deploy confirmed working via GitHub integration (verified through GitHub's Deployments/commit-status API, read-only, no Vercel access needed): both pushed commits (`ce3a37e`, `19d964c`) triggered builds across **5** separate Vercel projects all linked to this repo (`cws-portal`, `cws-portal-janb`, `cws-portal-azen`, `cws-portal-s9o5`, `cws-portal-project` — likely leftover duplicates from earlier setup, not something fixed here since it wasn't in scope), all showing `state: success`.

✅ Production URL: **https://cws-portal.vercel.app/** (Owner-confirmed 2026-08-01 — this is the stable alias, separate from the per-deployment SSO-walled preview URLs found earlier; no protection on this one). `curl` confirms `HTTP 200`, served by Vercel, `<title>cws-portal</title>`.

---

## End-to-End Flow (frontend, mock backend)

✅ RUNTIME VERIFIED (2026-08-01, one-off Playwright, not a project dependency, removed after use): Landing (merged Upload/Drive/Google-login/Render CTA) → file selected → "Bắt đầu render" while logged out → mock Google login fires → auto-continues to Render Profile → profile selected → Processing (queued→searching→allocating→connected→rendering) → Review screen (REVIEW_READY) → "Duyệt kết quả này" → Payment screen (AWAITING_PAYMENT, QR/transfer content shown) → auto-confirmed PAID by mock → Packaging → Finished screen with working "Tải thành phẩm" download link → Logout → back on Landing (not a dead-end screen). Zero browser console errors throughout. This confirms the landing/upload merge from earlier today didn't regress anything downstream.

Minor pre-existing observation (NOT caused by this session's changes, not fixed — out of scope): Review screen showed "Chưa có ảnh xem trước." (no preview images) in this run even though `mockBackend.js` does generate 3 placeholder images for `REVIEW_READY`. Not investigated further since it didn't block the flow and isn't related to any code touched this session.

⬜ RUNTIME NOT VERIFIED against the real backend (Supabase/NestJS/B2/Worker Fleet) or real Vercel production — same blockers as above (Vercel SSO wall, no physical Worker, no real payment credentials).

---

## Next Task

**LOOP stopped here (2026-08-01, updated after Owner completed a real Google login)** — remaining items for MVP Definition of Done are blocked on Owner/external action, not on further autonomous code work:

1. ~~Vercel production URL~~ — RESOLVED: https://cws-portal.vercel.app/, fully verified.
2. ~~Real Google login~~ — RESOLVED: Owner completed it on production; verified end-to-end directly in the database (`auth.users`, `customer_profiles`, RLS) — see Login section above.
3. **Job/Upload/Render/Payment against the real backend** — needs the Owner to actually create a job through the real UI while logged in (upload a file or paste a Drive link, proceed through render profile selection). I have no access to the Owner's authenticated browser session to do this myself; a fresh unauthenticated session of my own would just hit the same "must log in" gate again. If the Owner does this, I can verify each subsequent step (job row created, B2 storage, worker pickup, payment webhook) directly against the database/API the same way login was just verified.
4. Real MB Bank account + webhook gateway credentials — needed to verify Payment Auto Detect/Unlock against a real transaction (code is complete and unit-tested).
5. A physical Worker machine (Python/Blender) — needed for Worker Runtime Test.

Once any of the above becomes available, resume with that specific verification. No other independent MVP code task was found this session — see reports/MVP_LOOP_2026-08-01.md for the full audit.
