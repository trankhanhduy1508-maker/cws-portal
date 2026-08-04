# Payment and direct-upload auth guards — 2026-08-03

## Audit finding

The real customer flow authenticates before job creation, but the standalone
payment endpoints (`POST /payments`, `GET /payments/:id`,
`POST /payments/:id/confirm`) and direct B2 upload endpoint were still
reachable anonymously. The QR provider already rejects direct confirmation
as PAID, but anonymous access still exposed an unnecessary attack/cost
surface.

## Change

- Added `JwtAuthGuard` to standalone payment create/read/confirm routes.
- Added `JwtAuthGuard` before the memory-buffered direct upload interceptor.
- Kept webhook/SePay/device routes on their dedicated guards.
- Kept `POST /drive/resolve` public because the landing UX resolves a pasted
  link before the submit/auth boundary; it only validates/resolves metadata and
  does not upload or create a job.

Payment records do not currently have a customer owner column, so this change
does **not** claim full payment IDOR/owner isolation. That remains a separate
schema/service task and is recorded as a remaining MVP security gap.

## Verification

- Backend Jest: **117/117 PASS**, 16 suites.
- Backend Nest build: **PASS**.
- No production data, credentials, or migration was changed.

This is auth/unit/build evidence, not Full E2E.
