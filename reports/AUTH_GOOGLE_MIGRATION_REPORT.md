# Auth Migration: Facebook → Google OAuth (Supabase Auth)

Date: 2026-08-01

## Addendum 2026-08-01: REAL production verification (closes this migration's open item)

Owner completed an actual Google login + consent on production
(https://cws-portal.vercel.app/). Verified directly against the
database (read-only, no assumptions):

- `auth.users`: real account `galavang9999@gmail.com`, `provider: google`.
- `customer_profiles`: `full_name`/`avatar_url` correctly populated from
  Google's real OAuth claims, `phone: null` (not fabricated).
- **`consent_source: "google_login"`** — direct proof the migration 016
  fix (deriving consent source from `raw_app_meta_data->>'provider'`
  instead of the old hardcoded `'facebook_login'`) works correctly
  against a real login, not just in the migration's own logic review.
- Repeat-login upsert verified correct: `consent_at`/`created_at`
  preserved from the first login, `last_login_at`/`updated_at` refreshed
  — no duplicate profile row, matches the `ON CONFLICT (id) DO UPDATE`
  design.
- RLS re-verified against this real row specifically (not a synthetic
  test row): anonymous REST requests to `customer_profiles`, including
  one targeting this exact `id`, return `[]`.

Also independently re-verified via one-off Playwright (not a project
dependency, removed after use) against the live production URL: page
renders all required elements identically to local, zero console
errors, and clicking "Đăng nhập với Google" correctly chains through
Supabase's OAuth authorize flow to the real `accounts.google.com`
sign-in screen with the correct `redirect_uri`
(`ynhxlxetwuiyejcjypsi.supabase.co/auth/v1/callback`), a real Google
`client_id`, and the correct return-to production domain — proving
Vercel's `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` are
correctly configured. Stopped exactly at the credential-entry screen,
as it must — an agent cannot and should not enter real human
credentials.

**This closes the "Production Test" gap** noted as open at the end of
the original migration below. Remaining: job creation and the rest of
the pipeline against the real backend still need the Owner to drive
one job through the real UI (no access to their authenticated browser
session), plus a physical Worker and real bank credentials for the
final stages — tracked in `CURRENT_STATUS.md` / `reports/MVP_LOOP_2026-08-01.md`.

## Scope

Replaced Facebook Login with Google OAuth via Supabase Auth, per updated
`DECISIONS.md`. Auth-only change — no unrelated refactor, no new auth
server, no email/password login added.

## Addendum 2026-08-01: landing/upload flow reorganization

Follow-up request: the first page must show Upload, Drive-link paste,
"Đăng nhập với Google", and "Bắt đầu render" all at once — no forced
login screen before the customer even sees these actions. Login should
only be required at the moment they actually try to render, and after
login they must land back in the real flow, not a dead-end login page.

**Changed** (auth-flow-adjacent files only, no redesign):
- `src/App.jsx` — merged the `LANDING` and `UPLOAD` screen states into
  one screen (removed `SCREEN.LOGIN`/`SCREEN.UPLOAD` from the state
  machine, kept `SCREEN.LANDING` as the single entry screen rendering
  both `LandingScreen` and `UploadScreen` together). Auth is now
  enforced inside `handleContinueFromUpload` (the "Bắt đầu render"
  handler) instead of gating the whole page.
- `src/hooks/useAuth.js` — `login()` now returns `true`/`false` so the
  caller can tell a synchronous mock login (continue immediately) apart
  from a real Supabase redirect (page is navigating away, nothing more
  to do here) or a failure.
- `src/pages/LandingScreen.jsx` — dropped the old `onStart` screen-nav
  button; added an inline Google login button/status (reusing the
  existing `Button`/error-copy style, no new design system).
- `src/pages/UploadScreen.jsx` — renamed the CTA from "Tiếp tục" to
  "Bắt đầu render" per the acceptance criteria wording. No other
  changes; `LoginScreen.jsx` is left in place, unused, for reference/
  rollback — not deleted.

**Real browser redirect vs. resume**: `signInWithOAuth` does a full-page
navigation (`redirectTo: window.location.origin`), which discards all
React state, including any in-progress `File` selection — this is a
hard browser limitation, not something fixable without switching to a
popup-based OAuth flow (out of scope, over-engineering for MVP). What
*is* preserved: if the customer pasted a Drive link (a plain string,
already backend-validated) before being asked to log in,
`handleContinueFromUpload` persists it to `sessionStorage` first; after
the redirect returns authenticated, an effect restores it, re-resolves
it through the real backend call (not faked), and auto-continues to
Render Profile — no second click needed. A manually-selected file
cannot be restored this way; the customer simply re-selects it once,
already logged in.

**Verified**: `oxlint` clean, 5/5 vitest pass, `vite build` clean.
Visually verified with a one-off Playwright (installed `--no-save`,
uninstalled afterward, not a project dependency) headless-Chromium
script against mock auth (`VITE_ENABLE_MOCK_AUTH=true` in a local,
gitignored `.env`, removed after testing) at a 390×844 mobile viewport:
first paint shows all 4 required elements simultaneously (Upload tab,
Drive-link tab, Google login button, disabled "Bắt đầu render"); after
pasting+resolving a Drive link the render CTA enables; clicking it
while logged out triggers the (mock) Google login and the app
auto-continues straight through to the Render Profile screen — no
separate login page shown at any point. Zero browser console errors
during the run. **Not verified**: the real full-page-redirect resume
path against a live Google provider (blocked on the same Owner Action
as the rest of this migration — no real OAuth credentials in this
environment).

## Why this was low-risk

The backend was already provider-agnostic: it never called a
Facebook-specific API. It verifies whatever opaque Supabase session
token is presented (`supabase.auth.getUser(token)`), and
`customer_profiles` is created/updated by a Postgres trigger
(`handle_new_auth_user()`) that reads generic OAuth claims
(`full_name`/`name`, `avatar_url`/`picture`) — Google returns the same
claim names Facebook did. So switching provider needed no backend
rewrite, just `provider: 'facebook'` → `provider: 'google'` on the
frontend call to `signInWithOAuth()`.

## Code changes

**Frontend** (`src/`): `AuthService.js` (`startFacebookLogin` →
`startGoogleLogin`, provider string, error copy),
`hooks/useAuth.js`, `services/mockBackend.js` (`mockFacebookLogin` →
`mockGoogleLogin`), `services/supabaseClient.js`, `pages/LoginScreen.jsx`
(UI text), `pages/StaffLoginScreen.jsx` (comment only — staff
email/password login is untouched, out of scope), `App.jsx`,
`services/RenderService.js`, `services/AuthService.test.js` (rewritten
for Google), `.env.example`.

**Backend** (`backend/src/`): comment-only updates in
`common/guards/jwt-auth.guard.ts`, `common/optional-auth.util.ts`,
`config/configuration.ts`, `customers/domain/customer-profile.ts`,
`customers/repositories/customer-profiles.repository.interface.ts`,
`jobs/domain/render-order.ts`, `jobs/jobs.controller.ts`,
`jobs/jobs.service.ts`, `.env.example`, `API_DOCUMENTATION.md`,
`BACKEND_SETUP.md`. No behavioral change — auth verification logic
already didn't reference "facebook" anywhere.

**Database** — `backend/migrations/016_google_oauth_migration.sql`,
applied directly to the production Supabase project
(`ynhxlxetwuiyejcjypsi`) via the Supabase connector:
- **Real bug found during audit**: migration 012
  (`customer_profiles_consent.sql`) exists in the repo but was **never
  applied to production** — `consent_source`/`consent_at`/
  `last_login_at` did not exist on the live `customer_profiles` table.
  Migration 016 catches this up with `ADD COLUMN IF NOT EXISTS`
  (safe/idempotent regardless of whether 012 was separately applied
  elsewhere).
- Rewrote `handle_new_auth_user()` so `consent_source` is derived from
  the real OAuth provider (`auth.users.raw_app_meta_data->>'provider'`,
  e.g. `'google_login'`) instead of the previous hardcoded
  `'facebook_login'` literal — that hardcode would have silently
  mislabeled every new Google signup had it not been fixed.
- `customer_profiles.facebook_id` (from migration 005) is **not
  dropped** — confirmed via grep that no code path reads or writes it
  (the trigger has always kept identity on `auth.users.id`, never on
  this column). Marked via `COMMENT ON COLUMN` as deprecated instead.
- Verified via `get_advisors` (security): 0 ERROR-level findings after
  applying; the one pre-existing WARN on `handle_new_auth_user`
  (callable via PostgREST RPC as `SECURITY DEFINER`) predates this
  migration and is unrelated to it. RLS policies (owner-scoped,
  `auth.uid() = customer_id`/`= id`) are unchanged and still enforced.

## Security

- No service-role key or Google Client Secret is present anywhere in
  the repo — same pattern as Facebook before it: the OAuth secret is
  entered only in the Supabase Dashboard (Authentication > Providers),
  never in `.env`/`.env.example`/code.
- Backend identity is derived exclusively from
  `supabase.auth.getUser(<bearer token>)` — never trusts a
  frontend-supplied user id.
- RLS: unchanged, still owner-scoped (`auth.uid() = id` /
  `= customer_id`) on `customer_profiles`, `render_orders`,
  `review_images`, `downloads`, `notifications`.

## Verification

| Check | Result |
|---|---|
| Frontend lint (`oxlint`) | pass, no warnings |
| Frontend tests (`vitest`) | 5/5 pass (rewritten for Google) |
| Frontend build (`vite build`) | pass |
| Backend build (`nest build`) | pass |
| Backend tests (`jest`) | 73/73 pass, 11/11 suites |
| Supabase security advisors | 0 ERROR after migration |

Not verified: real browser OAuth round-trip (no live Google Provider
credentials in this environment) and duplicate-login upsert behavior
against a real Google account — both require the Owner Action below
first.

## OWNER ACTION REQUIRED (cannot be done from this environment)

No CLI/API/browser access to Google Cloud Console or the Supabase
Auth **Providers** dashboard page exists in this environment (the
Supabase connector used here covers SQL/migrations, not the Auth
provider toggle UI), so these steps must be done manually:

1. **Google Cloud Console** (console.cloud.google.com) → APIs &
   Services → Credentials → Create Credentials → OAuth client ID →
   **Web application**.
   - Authorized redirect URI (exact value, deterministic from the
     Supabase project ref, already used as the pattern for every
     provider on this project):
     `https://ynhxlxetwuiyejcjypsi.supabase.co/auth/v1/callback`
   - Authorized JavaScript origins: the real Vercel production domain
     (not determined here — no `.vercel/project.json` in this repo, no
     Vercel CLI/API access in this environment; check the Vercel
     dashboard for the project's assigned/custom domain) plus
     `http://localhost:5173` for local dev if needed.
2. **Supabase Dashboard** → Authentication → Providers → **Google** →
   Enable → paste the Client ID and Client Secret from step 1. Do not
   send the Client Secret in chat/commit it — paste it directly in the
   dashboard.
3. **Supabase Dashboard** → Authentication → URL Configuration → Site
   URL + Redirect URLs → set to the real Vercel production domain
   (same one used in step 1).
4. **Vercel** → confirm `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_PUBLISHABLE_KEY` are already set for the Portal
   project (unchanged by this migration — same variables Facebook used).
5. After steps 1–4, do one real login end-to-end and confirm a row
   appears/updates in `customer_profiles` with
   `consent_source = 'google_login'`.

## Next Task

Blocked on Owner Action above. Once the Google Provider is live,
verify: OAuth initiation → callback → session restore on refresh →
logout → protected `#host`/History routes → duplicate-login (second
login updates the same row instead of creating a new one, guaranteed
by the trigger's `ON CONFLICT (id) DO UPDATE`).
