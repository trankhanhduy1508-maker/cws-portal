# CWS Admin Google OAuth + AAL2 and production flow audit — 2026-08-06

## Source-of-truth and production baseline

- Local checkout is canonical `main`, HEAD equals `origin/main` before this
  change. Existing MVP decisions require Google OAuth for customers and
  Supabase-provider MFA for staff; the old Admin email/password decision is
  marked `SUPERSEDED` in `DECISIONS.md`.
- `https://cws-portal.vercel.app/` and `/#admin` returned HTTP 200 from Vercel.
- The live HTML served bundle `assets/index-C1D453Oa.js`. Read-only inspection
  found `signInWithPassword`, `cws_staff_token`, and `mfa.enroll`, but no
  deployed Google staff OAuth implementation. Therefore production Admin
  authentication was **NOT VERIFIED/PREVIOUS IMPLEMENTATION OBSERVED**.
- `GET https://cws-portal.onrender.com/staff/me` without a Bearer token returned
  HTTP 401. Health request timed out in this audit; no mutation was attempted.

## Implementation

- Staff Admin/Host login now starts Google OAuth through Supabase with return URL
  `/#admin`.
- After OAuth, the frontend calls the new non-sensitive `GET /staff/mfa-status`
  to reject non-staff identities before MFA enrollment. It then uses only
  Supabase TOTP enroll/challenge/verify APIs.
- `RoleGuard` remains the authorization boundary for Admin/Host data and still
  validates the signed Supabase token, `staff_roles`, role, and `aal2`.
- The new pre-MFA guard does not inspect `x-admin-key`, expose Admin data, or
  replace `RoleGuard`. Bearer tokens are no longer copied to `sessionStorage`.

## Customer-flow audit

| Boundary | Current status | Evidence / gap |
|---|---|---|
| Google customer login | CODE/UNIT + prior OAuth redirect evidence | Existing `AuthService` uses Supabase Google OAuth; real human credential completion remains pending. |
| Upload / Drive resolve | CODE/HTTP evidence | Existing reports verify Drive resolve and B2 upload paths; direct production customer job creation is not re-run. |
| Job / progress | CODE + prior isolated RPC evidence | Depends on physical Worker claim/render runtime; no fake PASS claimed. |
| Preview / approve | CODE and route wiring | Review images depend on a real render; roadmap correctly remains `NEEDS_VERIFICATION`. |
| MB QR / webhook / PAID | Sandbox verified; Live pending | Owner must configure/verify live SePay + MB Bank path. |
| Final download | HTTP ownership/signed URL evidence | Full chain with a newly rendered customer job remains unverified. |

No cosmetic or already verified feature was rewritten. No production data,
OAuth credentials, MFA secret, or deployment setting was changed by this task.

## Verification

- Frontend Vitest: **8/8 PASS**.
- Frontend lint: **PASS**.
- Frontend Vite build: **PASS** (existing large-chunk warning only).
- Backend Jest: **129/129 PASS**.
- Backend Nest build: **PASS**.
- New security tests cover anonymous, customer, staff pre-MFA onboarding and
  `x-admin-key` rejection; existing RoleGuard tests continue to cover AAL2.

## Remaining blockers

Production deployment, Google provider configuration/redirect allowlist,
Owner's real staff Google account with Authenticator enrollment, and the full
customer physical Worker-to-delivery flow remain runtime gates. No production
PASS is claimed until those external steps are evidenced.

## Deployment follow-up — 2026-08-06

- Vercel project `cws-portal`: deployment `dpl_4WznTivJZDLsR6zRjezt2zFspt6R` is `READY`, production, branch `main`, commit `7b0496e`.
- Live Vercel asset `index-Cart5-Q4.js` contains `/staff/mfa-status`, Google staff-login text, and `mfa.enroll`; it does not contain `cws_staff_token`.
- Supabase Google authorize initiation returned HTTP `302` to Google with the Supabase callback and production `https://cws-portal.vercel.app/#admin` redirect target. This is initiation evidence only; no account was used.
- Render `/staff/mfa-status` returned HTTP `404 Cannot GET /staff/mfa-status`, while `/health` returned HTTP `200`. Backend deployment is therefore stale or miswired; Admin API/AAL2 runtime verification cannot proceed.
- No real Google staff login, `staff_roles`, TOTP enrollment, `aal2`, or Admin API PASS is claimed. Founder must repair/trigger the Render deployment and complete one real staff OAuth + Authenticator smoke test.
