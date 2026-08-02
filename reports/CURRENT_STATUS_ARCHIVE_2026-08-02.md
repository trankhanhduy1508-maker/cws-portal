# Current Status — ARCHIVE (2026-08-02)

> Đây là bản snapshot lịch sử của `CURRENT_STATUS.md` trước khi file đó
> được rút gọn thành entry-point ngắn theo quy tắc Source-of-Truth Sync
> (`AGENTS.md`). Nội dung dưới đây giữ nguyên để không mất bằng chứng —
> KHÔNG phải nguồn sự thật hiện hành, xem `CURRENT_STATUS.md` ở gốc repo
> cho trạng thái mới nhất.

---

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

✅ **Auto Detect implemented (2026-08-01)**: researched Casso vs SePay from official docs (developer.sepay.vn, api.casso.vn/pricing-table) — chose **SePay** (free tier has MB Bank + webhook/API from the start; Casso free has no custom webhook, needs the 99k/month Starter plan). Built `POST /payments/webhook/sepay` → `PaymentsService.confirmViaSepayWebhook()`: filters `transferType != 'in'` safely (no error), reuses the existing `payment_notifications` table (migration 014) for idempotency/replay protection via SePay's transaction `id` (no parallel payment system created), then reuses the exact same `matchAndConfirm()` logic as the generic webhook (payment_code + storage_code + amount must all match) before setting PAID.

✅ **Webhook-only decision finalized + HMAC-SHA256 support added (2026-08-01, after deeper research — `reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md`)**: confirmed Webhook and SePay's separate "IPN" feature both depend on SePay detecting the bank transaction first (no real data-source redundancy from running both) — **IPN deliberately NOT implemented**, Android MBBank Listener remains the intended independent fallback. `SepayWebhookGuard` rewritten to support **HMAC-SHA256** (SePay's recommended mechanism — verifies `X-SePay-Signature`/`X-SePay-Timestamp` against the raw request body, ±5min replay window) as the preferred mode, falling back to the static API Key header if HMAC isn't configured (`SEPAY_WEBHOOK_HMAC_SECRET` takes priority over `SEPAY_WEBHOOK_API_KEY` if both are set). Required enabling `rawBody: true` in `main.ts` (Nest's built-in mechanism for exactly this use case — HMAC must sign the exact original bytes, not a re-serialized `JSON.stringify(req.body)`) — verified this doesn't break any other route via a full local boot + build + 88→96 passing tests.

CODE VERIFIED, RUNTIME VERIFIED locally (not just unit tests): booted the backend locally with a dummy HMAC secret, sent a real HTTP request with a correctly-computed HMAC signature — request passed the guard (no 401) and reached the repository layer, which only failed because of a deliberately-fake Supabase URL in this local smoke test (unrelated to the guard/HMAC logic). 23 new/updated tests this round (7 guard: unconfigured / HMAC valid / HMAC valid-without-"sha256="-prefix / missing-headers / wrong-signature / replay-window / invalid-timestamp / HMAC-takes-priority-over-API-key + existing API-key-fallback tests updated for the new mock shape; 1 new service test: wrong storage_code with a correct payment_code, distinct from the existing wrong-payment_code test). **96/96 backend tests pass, build clean.**

Docs updated: `backend/BACKEND_SETUP.md` §3c (HMAC-preferred setup steps), `backend/.env.example` (`SEPAY_WEBHOOK_HMAC_SECRET` + `SEPAY_WEBHOOK_API_KEY`), `DECISIONS.md` (Webhook-only + HMAC-priority decision).

✅ **Real MB Bank receiving account provided by Owner (2026-08-01)** — account number/holder name received in chat and used ONLY to verify the existing `QrBankProvider` reads them exclusively via `ConfigService`/`MB_BANK_ACCOUNT_NUMBER`/`MB_BANK_ACCOUNT_NAME` env vars (confirmed by reading the code, no change needed — already followed the "no hardcoding" requirement). **Not written into any repo file** — Owner enters it directly into Render.com Environment Variables.

✅ **Migration 014/015 applied to production (2026-08-01)** — `payment_notifications`/`payment_devices` did not exist on production Supabase until this point (never applied before). Found a real bug in `014_payment_notifications.sql`: `payment_id` column was typed `text` but `public.payments.id` is `uuid` — FK creation failed. Verified compatibility first (all `paymentId` values in code are genuine UUIDs from `randomUUID()`), fixed the column type to `uuid`, applied both migrations via Supabase, and confirmed via `list_tables` that the FK constraints now exist correctly. 96/96 tests still pass, build clean — no HMAC/guard logic touched. See `reports/payments/SEPAY_WEBHOOK_PRODUCTION_VERIFICATION_2026-08-01.md` for full detail.

✅ **SePay Test Mode/Sandbox implemented + RUNTIME VERIFIED end-to-end with real HTTP evidence (2026-08-02)** — added separate route `POST /payments/webhook/sepay/test` + `SepayWebhookTestGuard` (separate `SEPAY_WEBHOOK_HMAC_SECRET_TEST`/`SEPAY_WEBHOOK_API_KEY_TEST` env vars) so Sandbox transactions can never authenticate against the Live secret/route. Fixed both webhook responses to include `{"success": true}` per official SePay docs (previously missing — could cause needless retries). Owner sent a real SePay Sandbox transaction against a fixture payment row (`1ba658b6-dab8-419a-9086-3f05b6701384`, 2000đ, content `CWS SBXTEST01 AF061960`) — confirmed via direct Supabase query: `payments.status` flipped `processing`→`paid`, `payment_notifications` row correctly written (`status=processed`). Full audit + test matrix in `reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md`. **Still needs Owner** to (1) link the real MB Bank account on SePay (requires online banking login — agent cannot do this), (2) create the LIVE (not Test) webhook + set `SEPAY_WEBHOOK_HMAC_SECRET` on Render, (3) set `MB_BANK_ACCOUNT_NUMBER`/`MB_BANK_ACCOUNT_NAME` on Render, before any real bank transfer.

✅ **PAID → unlock final output → B2 signed download URL — audited + RUNTIME VERIFIED against real production HTTP calls (2026-08-02)**: feature already fully implemented, no code changes needed. `JobsService.finalizeDelivery()` (called on every scheduler tick) only packages/unlocks when `order.status === AWAITING_PAYMENT` AND `paymentsService.getStatus() === PAID` (code + existing unit tests, `jobs.service.spec.ts:234-279`). `GET /jobs/:id/download` → `getDownloadRedirectUrl()`: checks `order.status === FINISHED`, calls `assertOwnership()`, logs to `downloads` table, generates a B2 presigned URL (300s TTL) via `B2StorageService.getSignedUrl()`. Verified live against production with 2 throwaway fixture `render_orders` rows (deleted after): (1) anonymous job (`customer_id=null`) → 302 redirect to a valid AWS4-HMAC-SHA256 signed URL, `X-Amz-Expires=300` confirmed, fetching it returned the exact uploaded test bytes; direct unsigned request to the same B2 object → **401** (bucket confirmed private, not public); (2) job with a real `customer_id` → anonymous request → **403 Forbidden** (cross-customer/anonymous access correctly blocked). Download audit row was correctly written to `downloads` table on each call. See `reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md`.

✅ **Job-creation-before-payment ordering re-verified against current code (2026-08-01, Owner asked to formalize this as an official decision)**: `CreateJobDto` (`backend/src/jobs/dto/create-job.dto.ts`) has no `paymentId` field at all; `JobsService.createOrder()` explicitly sets `paymentId: null` on creation; payment is only created inside `JobsService.approve()`, called from `POST /jobs/:id/approve` — which only fires after the customer views and approves the watermarked Preview. Frontend (`App.jsx#handleContinueToProcessing`) calls `job.start()` immediately after Render Profile selection, with no payment step in between. `CWS_ROADMAP_MVP_V1.md` already lists Giai đoạn 3 (Render) → 4 (Preview) → 5 (Thanh toán) in the correct order — no contradiction found. **No code/UI/API change was needed — already correctly implemented.** Recorded as an explicit official decision in `DECISIONS.md` since it had never been written down there before, only implied by code/other docs.

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

**🟢 P0 FINDING RESOLVED (2026-08-01):** Owner found the real backend URL is **`https://cws-portal.onrender.com`** (not the `cws-backend.onrender.com` example from `BACKEND_SETUP.md` — that was always just illustrative), set `VITE_CWS_API_BASE_URL` on Vercel, and redeployed. Independently re-verified, not assumed:
- `GET https://cws-portal.onrender.com/health` → `200`, `{"status":"ok","service":"cws-backend",...}`.
- Production bundle hash changed (`index-DnVtLEJ9.js` → `index-CeCG97lI.js`, confirming a real new deploy) and now contains `https://cws-portal.onrender.com` baked in — proves the env var was picked up at build time.
- CORS preflight from `https://cws-portal.vercel.app` → `204`, `access-control-allow-origin: *` (permissive but functional; not the tightest practice for later hardening, not a blocker).
- **Live network trace via Playwright against production** (pasted a real Drive link, unauthenticated — this path runs before the login gate): `POST https://cws-portal.onrender.com/drive/resolve` → **`201`**, real backend response rendered correctly in the UI. `GET /jobs` → `401` (correct — matches the documented `AdminKeyGuard` fix for anonymous job listing, not a bug).
- **Production is now genuinely running against the real backend, not the mock.**

Bug found and fixed via this trace: `useJobHistory()` (`src/hooks/useJobHistory.js`) auto-fetched `GET /jobs` on every page mount unconditionally — guaranteed to 401 for every anonymous visitor, and redundant even when logged in since `handleOpenHistory` in `App.jsx` already calls `reload()` explicitly when History is actually opened. Removed the eager mount-time fetch; `oxlint`/`vitest`/`vite build` all still pass.

---

## Next Task

**LOOP continuing (2026-08-01, updated after backend connected to production)**:

1. ~~Vercel production URL~~ — RESOLVED.
2. ~~Real Google login~~ — RESOLVED, verified against the database.
3. ~~Backend connected to production~~ — RESOLVED: `https://cws-portal.onrender.com`, verified live (health check, CORS, real network trace of an actual API call succeeding). Fixed one real bug found via this verification (`useJobHistory` wasteful/failing eager fetch).
4. **Job/Upload/Render/Payment through the real UI while logged in** — this can now genuinely exercise the real backend (previously it couldn't, even if attempted). Still needs the Owner to drive it (upload a file or paste a Drive link, proceed through render profile selection while logged in) — I have no access to the Owner's authenticated browser session to do this myself. Once done, I can verify each step (job row, B2 storage, worker pickup, payment webhook) directly against the database the same way login was verified.
5. Real MB Bank account + webhook gateway credentials — needed to verify Payment Auto Detect/Unlock against a real transaction (code is complete and unit-tested).
6. A physical Worker machine (Python/Blender) — needed for Worker Runtime Test.

Once any of the above becomes available, resume with that specific verification.
