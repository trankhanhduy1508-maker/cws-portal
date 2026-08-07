# CWS production physical Worker readiness audit — 2026-08-07

## Verified

- Host: `MAY083`.
- Desktop package contains the canonical `worker/production_node_agent.py`,
  `worker/worker_engine.py`, authenticated RPC client, DPAPI store and Blender
  5.2.0 executable.
- Production Supabase project `ynhxlxetwuiyejcjypsi` exposes the required
  `report_heartbeat`, `claim_next_resilient_task`, `get_claimed_task_spec`,
  `complete_task`, `fail_task` and `update_task_stage` routines.
- Worker unit suite: 69/69 PASS.

## Read-only production state

- `public.workers`: 29 rows; all observed rows are `offline`.
- `public.worker_identities`: 0 rows.
- Fresh workers: 0.
- `public.worker_leases`: 0.
- Open tasks: 247.

## Host provisioning state

None of the required production variables are present in process, user or
machine environment: `CWS_BACKEND_URL`, `CWS_WORKER_ID`,
`CWS_WORKER_CREDENTIAL_FILE`, `CWS_B2_ENDPOINT`, `CWS_B2_BUCKET`,
`CWS_B2_KEY_ID`, `CWS_B2_APP_KEY`, `CWS_B2_OUTPUT_PREFIX` and
`CWS_GOOGLE_DRIVE_API_KEY`. No DPAPI credential store was found.

The package's launcher defaults to `python`; the host Python installations do
not include `boto3`, which the production Node Agent requires for B2 input/output.
This is a host provisioning prerequisite, not a reason to bypass the real B2
adapter or use the legacy Worker.

## Result

Production physical Worker E2E is **BLOCKED** before heartbeat. No job was
created, no task was claimed, and no Blender/B2 evidence was fabricated.

The only remaining external gate is authorized per-worker identity plus scoped
B2/Drive runtime configuration installed on MAY083. After that gate, the
existing Node Agent can be started and the real one-job E2E can be verified.
