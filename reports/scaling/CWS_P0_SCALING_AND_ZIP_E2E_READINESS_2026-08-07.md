# CWS P0 Scaling and ZIP Production E2E Readiness — 2026-08-07

## Evidence boundary

No production mutation, payment, upload, database migration or Worker
provisioning was performed. Production checks are read-only. Load tests use
the real local Nest application/controllers and deterministic in-memory
adapters for persistence/Worker boundaries; they are not staging capacity.

## P0 audit result

The canonical `main` code already contains the relevant MVP guardrails:

- `POST /jobs`: bounded `Idempotency-Key`, request fingerprint and durable
  unique-key race recovery.
- Payment: one-intent partial unique-index migration, with duplicate preflight.
- Upload: disk-backed streaming, 2 GiB bound, abort/error cleanup and rate
  limit; no whole-file RAM buffer.
- Scheduler: single-flight tick, one presence snapshot and batched task reads.
- Worker: DB claim/generation fencing and bounded retry/failover contracts.

No new Redis, queue broker or architecture layer was justified by current
evidence. The database remains the source of truth for durable state.

## Load evidence

Command:

```text
cd backend
npm run test:e2e -- --runInBand
```

Result: 2 suites / 2 tests PASS. Scenarios 10, 25, 50 and 100 all submitted
and completed their simulated review-ready flow. The harness uses independent
reserved test proxy IPs so the production per-IP abuse guard does not turn
100 independent customers into one source. Results observed in the passing
run:

| Customers | Submitted | Duplicate claims | Failovers | Stale completions rejected | p95 submit ms | Scheduler ms |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 0 | 0 | 0 | 7.22 | 0.47 |
| 25 | 25 | 0 | 1 | 1 | 12.59 | 0.30 |
| 50 | 50 | 0 | 1 | 1 | 22.92 | 0.53 |
| 100 | 100 | 0 | 1 | 1 | 52.81 | 1.10 |

The separate contract simulation also ran 100 jobs/1,000 Workers and 1,000
jobs/10,000 Workers with zero duplicate claims; it remains algorithmic-only.

## Production read-only evidence

- Vercel `https://cws-portal.vercel.app/`: HTTP 200; served bundle contains
  `.zip` marker.
- Render `https://cws-portal.onrender.com/health`: HTTP 200.
- CORS preflight from `https://cws-portal.vercel.app`: HTTP 204 with exact
  `Access-Control-Allow-Origin`.
- Anonymous `/jobs`, `/fleet/workers` and `/customers/crm`: HTTP 401.
- Git: `HEAD == origin/main == 5df3b0abe80490adf9fcc1a82b56ffb565c07fd0`.

## ZIP production E2E gate

The following remains **NEEDS_VERIFICATION**, not PASS:

```text
authenticated customer upload .zip
→ production B2 input
→ physical Windows Worker download/extract/render
→ progress/output B2
→ REVIEW_READY/preview
→ real payment/webhook
→ FINISHED/download
```

Required external gates are an authenticated customer session, a provisioned
physical Worker with Blender and Worker credential, scoped B2 production
access, and Founder-approved real payment/webhook verification.

## Commands rerun

- Backend: 174/174 tests, build and lint PASS.
- Backend E2E/load: 2/2 PASS.
- Frontend: 11/11 tests, lint and build PASS.
- Worker: 53/53 tests and Python compile PASS.
- Contract simulation: 100/1,000 and 1,000/10,000 synthetic scenarios PASS.
