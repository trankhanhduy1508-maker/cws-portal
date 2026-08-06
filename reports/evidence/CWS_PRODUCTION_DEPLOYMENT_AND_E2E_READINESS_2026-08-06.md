# CWS Production Deployment and E2E Readiness — 2026-08-06

## Deployment evidence

- Canonical `main` and `origin/main`: `b63098750717be4150d102890bcbebe3a1c3227a`.
- Canonical Vercel project: `cws-portal`, project id `prj_oEEqu24zYqTq1p9FJhzkUake0pEi`.
- Production domain: `https://cws-portal.vercel.app`.
- Vercel production deployment: `dpl_5Z7dcBLrWFzNj9UbHtN4WujzHobQ`, commit
  `95abec7b5b49e7788066ef328647845c12968851`; this is older than current main.
- A safe deploy attempt through the authenticated Vercel connector was rejected
  before deployment by `payment_required` / `api-deployments-free-per-day`,
  remaining quota `0`, reset in 24 hours. No project, domain, env, or data was changed.

## Read-only production evidence

- Vercel `/`: HTTP 200; bundle contains `Bắt đầu render`, `Fleet`, `CRM`,
  `Đang render`, and `Idle Saver`; old pre-render payment CTA is absent.
- Render `/health`: HTTP 200.
- CORS preflight from `https://cws-portal.vercel.app`: HTTP 204 with exact allow-origin.
- Anonymous `/staff/mfa-status`, `/fleet/workers`, `/customers/crm`, and `/jobs` are protected.

## E2E boundary

One real job is not claimed PASS. The remaining chain requires an authenticated
customer, physical authenticated Worker/Node Agent with Blender, valid production
B2 credentials, and real payment/webhook. No production job or payment was created.

## Next action

After Vercel quota reset, deploy canonical `main`, repeat these probes, then run
one small real job with the physical Worker and payment owner gate.
