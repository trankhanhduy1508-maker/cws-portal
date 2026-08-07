# CWS — Physical Worker one-job E2E readiness

Updated: 2026-08-07

This checklist prepares one real job without changing production configuration,
domain, credentials, or data. It does not claim physical Worker, B2, live
payment, or production E2E success.

## Verified

- Production web HTTP 200; Render `/health` HTTP 200.
- Anonymous `GET /jobs`, `/fleet/workers`, and `/customers/crm` HTTP 401.
- Backend 32 suites/172 tests, build and lint pass.
- Frontend 9 tests, lint and production build pass.
- Worker 49 tests and Python compile pass.

## Prepared code path

```text
upload/Drive → POST /jobs + Idempotency-Key → internal task
→ Worker claim/heartbeat/progress → REVIEW_READY + preview
→ approve → runtime price/payment intent → verified PAID
→ packaging → FINISHED → authorized short-lived B2 download
```

These are code/local tests, not a physical runtime claim. A real Windows
Worker/Blender, B2 runtime access, authenticated customer session, and one
real payment/webhook are still required.

## Founder run checklist

1. On the physical Windows Worker, install the committed generic Worker and
   Blender, provision the per-worker identity using the DPAPI/ACL procedure in
   `CWS_STAGING_WORKER_FAILOVER_GUIDE.md`, and start Node Agent under the
   dedicated least-privilege account.
2. Sign in to the production portal with Google, upload one small `.blend` (or
   use Drive), submit once with a fresh `Idempotency-Key`, and record the job ID.
3. Confirm Worker heartbeat/progress, B2 output, and customer `REVIEW_READY`;
   do not pay before this state.
4. Approve preview, make one real bank transfer using the displayed code, wait
   for verified `PAID`/`FINISHED`, then download through the portal and record
   timestamps/job ID.
