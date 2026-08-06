# CWS Admin Job Shared-Key Removal — 2026-08-06

## Finding

`JobsController` accepted the legacy `x-admin-key`/`?adminKey=` value as an
Admin identity for job list, ownership, preview, payment approval, logs,
notifications, cancellation, and download paths. This was weaker than the
active Google OAuth + Supabase TOTP/AAL2 decision.

## Fix and evidence

`JobsController` now determines Admin scope only through server-side Supabase
verification: Bearer token, `staff_roles`, and `aal2`. Customer ownership and
anonymous unowned-job rules are unchanged.

The backend regression test confirms both legacy header and query parameter are
denied and the repository is not called. No secret, credential, schema, or
production environment was changed.

This closes only the shared-key residual. Production Worker identity/RPC
authentication, physical isolation, real Admin AAL2 session, B2 credential and
real payment remain separate gates.
