# CWS production E2E control-plane audit — 2026-08-07

## Read-only runtime evidence

- Git HEAD: `985186f`.
- Render `/health`: HTTP 200, `{"status":"ok","service":"cws-backend"}`.
- Render CORS preflight from `https://cws-portal.vercel.app`: HTTP 204,
  `Access-Control-Allow-Origin: https://cws-portal.vercel.app`.
- Supabase production project: `ynhxlxetwuiyejcjypsi`, status
  `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.
- Schema preflight: `workers`, `jobs`, `tasks`, `task_attempts`, generation,
  heartbeat, retry and failed-worker columns all PASS.
- Production counts (read-only): 29 registered Workers, 0 fresh heartbeat
  Workers, 247 open queued/active tasks.
- Initial audit found the required production bridge absent. Migrations 020,
  021 and 022 were subsequently applied through the authenticated Supabase
  migration API and verified: `worker_identities`, `worker_auth_nonces`,
  `claim_next_resilient_task(text,integer)`,
  `get_claimed_task_spec(bigint,integer,text)`, `report_heartbeat` and
  `requeue_stale_tasks` now exist; `jobs.max_retry_attempts` exists.
- Vercel connector: canonical project `cws-portal` and domain are present;
  latest observed READY production deployment carries commit
  `ebc7e017d7c3250b3a0680d8e8e15bb5fe56d818`, not current HEAD.

## Why E2E cannot be claimed

The production backend bridge is now present, but the Windows host has no
production Worker identity, `CWS_*` runtime configuration or B2 credentials.
The Desktop package has been updated with the canonical `production_node_agent.py`
and dependencies and compile verification passed. No production job, payment,
B2 mutation or fake completion was created.

This report is read-only evidence, not a production PASS.
