# Customer auth and ownership hardening — 2026-08-03

## Audit finding

The real frontend already requires Google OAuth before it resolves an upload
and reaches job creation (`App.jsx#handleContinueFromUpload`). The backend,
however, still allowed `POST /jobs` without a Bearer token and retained an
anonymous compatibility path for job actions and `/ws/jobs/:id`. That left a
direct API caller able to create or access an ownerless job by UUID.

## Fix

- `POST /jobs` now uses `JwtAuthGuard`; the customer flow can only create a
  job with a verified Supabase user.
- `JobsService.assertOwnership()` now rejects missing identity with `401` and
  ownerless/mismatched jobs with `403`; Admin bypass remains unchanged.
- WebSocket realtime now requires a verified token matching the job owner,
  including rejecting ownerless jobs. Missing jobs still close with `4004`
  before auth evaluation.
- Updated unit tests to cover the new contract.

No migration, credential, or production data change was made.

## Verification

- Backend Jest: **117/117 PASS**, 16 suites.
- Backend Nest build: **PASS**.
- Backend lint: **known repository baseline failure** from CRLF/Prettier
  formatting across unrelated files; it was run without applying formatting
  and no lint-only mass rewrite was included in this task.
- Tests cover wrong-owner REST, missing customer identity, ownerless jobs,
  wrong-owner realtime, missing-token realtime, matching-owner realtime, and
  missing-job behavior.

This is security/unit/build evidence, not full customer E2E. Real Google OAuth
provider configuration and a real customer/Worker/B2/payment run remain
required for the full flow.
