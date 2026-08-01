# Auth Migration: Facebook → Google OAuth (Supabase Auth)

Date: 2026-08-01

## Scope

Replaced Facebook Login with Google OAuth via Supabase Auth, per updated
`DECISIONS.md`. Auth-only change — no unrelated refactor, no new auth
server, no email/password login added.

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
