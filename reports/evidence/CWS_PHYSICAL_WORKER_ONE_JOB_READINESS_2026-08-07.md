# CWS physical Worker one-job readiness evidence

Date: 2026-08-07

## Read-only production evidence

| Check | Result |
|---|---|
| `https://cws-portal.vercel.app/` | HTTP 200 |
| `https://cws-portal.onrender.com/health` | HTTP 200 |
| Anonymous `GET /jobs` | HTTP 401 |
| Anonymous `GET /fleet/workers` | HTTP 401 |
| Anonymous `GET /customers/crm` | HTTP 401 |
| Anonymous `/worker/rpc/worker_ping` probe | rejected/no unauthenticated operation |

No job, upload, payment, webhook, or production database/storage mutation was
performed.

## Local verification

- Backend: 32 suites, 172 tests, build and lint pass.
- Frontend: 9 tests, lint and Vite production build pass.
- Worker: 49 tests and Python compile pass.

## Scope conclusion

The implementation and local tests cover the intended order:

```text
upload/Drive → job/task → Worker claim/heartbeat/progress → REVIEW_READY
→ approve/runtime price → payment verification → packaging → FINISHED/download
```

This is not production E2E PASS. The remaining evidence requires an
authenticated customer, physical Windows Worker + Blender, valid B2 runtime
access, and one real payment/webhook. The exact run checklist is in
`CWS_PHYSICAL_WORKER_ONE_JOB_READINESS.md`.
