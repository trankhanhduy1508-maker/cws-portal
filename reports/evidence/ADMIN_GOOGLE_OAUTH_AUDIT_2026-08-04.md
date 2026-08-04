# CWS Admin Google OAuth Audit â€” 2026-08-04

## Scope

- Branch: `agent/roadmap-mvp-v2`
- Canonical repository: `trankhanhduy1508-maker/cws-portal`
- No production deployment, merge, credential rotation, or destructive data action was performed.

## Implemented

- Added Admin Google OAuth through the existing Supabase Auth client.
- OAuth callback returns to `/?staff=admin`; the frontend opens the existing `#admin` Admin screen.
- Added `GET /staff/access` with Supabase JWT authentication to check `staff_roles` server-side before MFA.
- Google authentication alone does not grant Admin access.
- Existing `RoleGuard` continues to enforce `staff_roles` and `aal2` for Admin APIs.
- Normal authenticated users without a `staff_roles` row receive DENY and are signed out of the Admin flow.
- Existing email/password + TOTP MFA flow remains available.

## Validation

- Backend targeted controller tests: server-side Admin allow and non-staff deny â€” PASS.
- Backend Jest: 25 suites / 140 tests â€” PASS.
- Nest build â€” PASS; frontend Vitest 5/5 â€” PASS; Vite build â€” PASS; oxlint â€” PASS.
- Vercel Git checks still fail with `build-rate-limit`; no current-head Preview was created.

## Runtime limitation / OWNER TODO

- Google provider must be enabled in Supabase Auth with the production callback URL.
- The real Google Admin account must already have a `staff_roles(role='admin')` row.
- The account must enroll/complete Supabase TOTP MFA; OAuth does not bypass MFA.
- Live Google OAuth and production callback cannot be claimed PASS without the configured provider/account.
