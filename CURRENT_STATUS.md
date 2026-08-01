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

⬜ Production Test — real end-to-end OAuth redirect (initiate → Google consent → callback → session restore → auto-continue → refresh → logout) not yet verified against the live Vercel deployment, only against mock auth locally. Needs: (1) confirm `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` are set on Vercel, (2) production URL to test against, (3) a human to complete the actual Google account consent screen click (cannot be automated by an agent).

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

## Git / Deployment

✅ `git push` to `origin/main` restored (2026-08-01) — root cause was NOT the credential-helper precedence conflict initially suspected (that was real and fixed, but proven-not-causal via SHA256 comparison showing `manager`/`store` cached the identical token); actual cause was GitHub denying that one PAT specifically for `git-receive-pack`, confirmed by hitting that exact endpoint directly. Fix: registered an SSH deploy key (`cws-portal-deploy`, "Allow write access") and switched this repo's remote to SSH (`git@github.com:...`, `core.sshCommand` pinned locally to the deploy key — scoped to this repo only). Full investigation: reports/GIT_PUSH_403_INVESTIGATION.md.

✅ 8 pending commits pushed to `origin/main` as of this update (Facebook→Google migration, landing/upload flow merge, MODEL_POLICY.md integration, this investigation report).

✅ Vercel auto-deploy confirmed working via GitHub integration (verified through GitHub's Deployments/commit-status API, read-only, no Vercel access needed): both pushed commits (`ce3a37e`, `19d964c`) triggered builds across **5** separate Vercel projects all linked to this repo (`cws-portal`, `cws-portal-janb`, `cws-portal-azen`, `cws-portal-s9o5`, `cws-portal-project` — likely leftover duplicates from earlier setup, not something fixed here since it wasn't in scope), all showing `state: success`.

⬜ Cannot visually verify the deployed site — every deployment URL (`https://cws-portal-*-nulyai825-7736s-projects.vercel.app`) redirects to `vercel.com/sso-api` (Vercel's deployment-protection/SSO wall), which needs an actual Vercel account login to bypass. If there's a public custom domain or an alias with protection disabled, it isn't recorded anywhere in this repo — Owner needs to provide it, or share/disable protection, for automated or manual production verification.

---

## Next Task

Verify Vercel picked up the new commits and redeployed production (need production URL from Owner or a working way to discover it).

Google OAuth production end-to-end test — needs Vercel env vars confirmed + a human to complete the actual Google consent click (cannot be automated).

Payment Auto Detect / Unlock — BLOCKED, needs real MB Bank account + webhook gateway credentials.

Worker Runtime Test — BLOCKED, needs physical Worker machine online.

After the above: continue MVP North Star (Google Login → Upload/Drive link → Queue → Worker → Render → Preview → Payment → Signed URL → Customer Download) per CWS_ROADMAP_MVP_V1.md priority order.
