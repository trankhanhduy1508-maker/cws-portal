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

## Fresh verification — 2026-08-07

- Local canonical `main` and `origin/main`: `4f4600804e19f4a1937d36cb7ad83c19c57f1311`.
- Connected Vercel project lookup confirmed project `cws-portal`, id
  `prj_oEEqu24zYqTq1p9FJhzkUake0pEi`, production domain
  `https://cws-portal.vercel.app`, and Git production branch `main`.
- Production deployment remains READY but still points to
  `95abec7b5b49e7788066ef328647845c12968851`, not current `main`.
- Production web smoke: HTTP 200; Vercel headers show HTTPS/HSTS. This is a
  read-only smoke check and does not verify the new UI bundle.
- No safe deployment was performed: the connected deploy operation requires a
  local file payload, while this worktree contains unrelated uncommitted
  backend changes. Deploying it would not prove or deploy the canonical commit.
- Status: deployment-to-current-HEAD **BLOCKED/NEEDS_VERIFICATION**; no env,
  domain, project or production data was changed.
