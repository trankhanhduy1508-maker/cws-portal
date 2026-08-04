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

## Security lockdown follow-up (2026-08-04)

- Audited the authenticated upload, resumable upload, B2 key generation, Drive resolver, job ownership routes, worker/host route guards, realtime ticket RPC grants, and repository credential-hygiene contracts.
- Hardened the legacy single-request upload endpoint so it resolves the customer from the authenticated Supabase token before writing to B2.
- Sanitized the legacy upload filename before constructing the B2 object key; client path separators and unsafe/control characters are no longer copied into the key.
- Resumable uploads continue to require customer ownership of the session, enforce 8 MiB chunks/2 GiB total, validate the first chunk's Blender signature, and use generated object IDs.
- The worker's generic customer-job path continues to render without `--enable-autoexec`; trusted Owner jobs remain a separate operational path and require explicit isolation/least-privilege validation on a real Windows worker.

Validation after hardening:

- Backend Jest: 25 suites / 141 tests PASS.
- Nest build PASS.
- Full production/runtime malware scanning, Windows worker sandboxing, Defender state, B2 bucket ACL, and live OAuth/MFA remain OWNER/host-runtime verification items; no claim of PASS was made for those.

