# CWS staging E2E blocker audit — 2026-08-05

## Machine-safe inspection

- `CWS_*`, `SUPABASE_*`, `B2_*`, `AWS_*`, and `S3_*` environment variable names: absent.
- No staging secret value was printed or read.
- Available Supabase connector project list contains exactly one project: `ynhxlxetwuiyejcjypsi`, named `trankhanhduy1508-maker's Project`, `ACTIVE_HEALTHY`. No separate staging project is present in the connector account.
- No B2 MCP tool is available. No B2 credential or endpoint is present in the environment.
- Production project was not queried or mutated.

## Exact staging Supabase requirements

Owner must create or provide a separate staging project and set these machine-local values through secret storage/environment:

```text
CWS_STAGING_SUPABASE_URL=https://<staging-project-ref>.supabase.co
CWS_STAGING_SUPABASE_KEY=<staging-publishable-or-legacy-anon-key>
CWS_STAGING_WORKER_ID=<stable-node-identity>
CWS_STAGING_FLEET_ID=<positive-integer-fleet-id>
```

The staging database must expose only the Worker Fleet surface needed by this adapter, with RLS/grants or an assignment RPC appropriate for the staging machine identity. Required RPC names/signatures used by the adapter are:

- `register_worker(p_worker_id text, p_fleet_id bigint, p_gpu_name text, p_vram_mb integer)`
- `worker_ping(p_worker_id text)`
- `claim_next_generic_task(p_worker_id text, p_worker_vram_mb integer)`
- `report_heartbeat(p_task_id bigint, p_generation integer, p_worker_id text)`
- `report_worker_state_transition(p_worker_id text, p_to_state text, p_task_id bigint, p_reason text)`
- `complete_task(p_task_id bigint, p_generation integer, p_worker_id text)`
- `fail_task(p_task_id bigint, p_generation integer, p_worker_id text, p_error_type text)`

The existing `claim_next_generic_task` contract in `worker_migrations/014_claim_next_generic_mvp_task.sql` returns only task/job IDs, frame range, and generation. That is insufficient for the generic engine. Staging must either:

1. expose a staging-only assignment RPC returning the complete dynamic JobSpec fields: `job_id`, `task_id`, `attempt_id`, `lease_generation`, `project_uri`, `frame_start`, `frame_end`, `output_prefix`, `output_format`, `autoexec`, `required_vram_mb`, `required_ram_mb`; or
2. grant minimal staging RLS SELECT access to the claimed task/job rows so a separate read can build exactly those fields.

No production schema or data is copied or inferred by this task.

## Exact staging B2 requirements

Owner must create a staging bucket or isolated prefix and set:

```text
CWS_STAGING_B2_ENDPOINT=s3.<region>.backblazeb2.com
CWS_STAGING_B2_KEY_ID=<bucket-scoped-application-key-id>
CWS_STAGING_B2_APP_KEY=<application-key-secret>
CWS_STAGING_B2_BUCKET=<staging-bucket>
CWS_STAGING_B2_PREFIX=<staging-prefix>
```

Create the application key in Backblaze Console → Application Keys, restrict it to the staging bucket and exact prefix, and grant only the read/write operations required for `HeadObject` and `PutObject`/multipart upload. Do not grant delete, bucket-admin, key-admin, lifecycle-admin, or production-bucket access.

## Current classification

- Local Node Agent → Generic Worker → Blender → local checkpoint → cleanup → ACTIVE_IDLE: existing **REAL RUNTIME VERIFIED** evidence retained.
- Staging adapter contracts: code/unit verified.
- Supabase staging lease/assignment: **BLOCKED** — no staging project/credential and incomplete JobSpec assignment contract.
- B2 staging upload/resume/verify: **BLOCKED** — no staging bucket/prefix/key.
- FULL E2E: **not run**; no fake PASS.
