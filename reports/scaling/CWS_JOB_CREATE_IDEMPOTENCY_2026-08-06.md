# CWS Job Create Idempotency — 2026-08-06

## Contract

- `POST /jobs` requires an `Idempotency-Key` header matching
  `[A-Za-z0-9._~-]{16,128}`.
- The key is opaque and stored only with the durable `render_orders` row.
- A retry with the same key and request fingerprint returns the original
  `jobId` and does not dispatch a second Worker job.
- Reusing a key with a different customer or payload is rejected.
- A database unique index closes the concurrent insert race; after a unique
  conflict the service re-reads the durable row and returns it.

## Evidence

- Idempotency unit tests: 4/4 PASS.
- Backend: 29 suites, 165 tests PASS; E2E 2/2 PASS.
- Load harness: 10/25/50/100 simulated customer runs PASS; duplicate retry
  returned the same job in every run.
- Frontend: 9/9 tests, lint and build PASS.

## Staging boundary

Migration `backend/migrations/018_job_create_idempotency.sql` has not been
applied to staging or production. The current session has no Supabase/psql
CLI, staging endpoint, or credential. Apply and verify it in isolated staging
before production deployment.
