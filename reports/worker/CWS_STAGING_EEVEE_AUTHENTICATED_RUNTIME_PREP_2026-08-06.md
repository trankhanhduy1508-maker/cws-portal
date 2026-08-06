# CWS authenticated staging Eevee runtime preparation — 2026-08-06

## Exact workload

```text
scene: tests/assets/cws_blender_unoptimized_eevee_stress.blend
engine: BLENDER_EEVEE / Blender 5.2.0 LTS
resolution: 1280x720
frames: 1..48
scene bytes: 572,308
scene SHA-256: 8AE22D0AA2A4131789C6D3E618266BD0ECFC4688D8363E4FA2C868CCD0F14CA0
output: PNG, 48 verified frames
output prefix: cws-staging/eevee-stress/cws-eevee-stress-task-48f/
autoexec: false
```

Manifest: `tests/fixtures/cws_eevee_stress_staging_manifest.json`.

## Contract audit

- Migration 016 provides staging-only `claim_next_staging_job` and returns a
  complete JobSpec. Only `jobs.staging_enabled = true` rows qualify.
- Migration 020 provides per-Worker identity hash, expiry/revocation and
  nonce replay storage.
- Migration 021 provides fresh healthy Worker claim, generation fencing,
  stale-heartbeat requeue, failed-Worker avoidance and bounded retry.
- Backend `WorkerRpcService` allowlists Worker RPCs and injects the
  authenticated Worker ID; request `worker_id` is not trusted.
- The Python staging adapter uses only `CWS_STAGING_*`; it has no production
  fallback and no delete/key-admin B2 capability.

## Required staging order

In a separate Supabase staging project only:

```text
1. Existing Worker base migrations required by the staging project
2. worker_migrations/016_staging_job_assignment_contract.sql
3. worker_migrations/020_021_preflight_check.sql       (read-only gate)
4. worker_migrations/020_worker_identity_rpc_auth_contract.sql
5. worker_migrations/021_production_failover_reassign_contract.sql
```

The preflight must be clean before applying 020/021. Production is not an
acceptable target.

## Worker A/B runtime matrix

Each host requires a different stable identity and a separate DPAPI store:

```text
Worker A: worker-stg-a → C:\CWS\secrets\worker-stg-a.dpapi
Worker B: worker-stg-b → C:\CWS\secrets\worker-stg-b.dpapi
```

Both Node Agents run under the dedicated least-privilege Windows account
`CWSNodeAgent`, with ACL limited to that account, SYSTEM and Administrators.
Provisioning uses `worker/provision_worker_identity.ps1`; only hash SQL is
applied to staging. Plaintext credentials are never logged.

## Authenticated test order

```text
A worker_ping/heartbeat
→ A claim_next_staging_job (48-frame JobSpec)
→ A renders/checkpoints frames 1..24
→ A heartbeat/process loss
→ backend marks stale assignment and requeues within retry budget
→ B claims the new generation with sufficient capability
→ B uses verified checkpoints and processes missing frames 25..48
→ A reconnects and stale completion is rejected by generation fencing
→ B completes exactly once
→ B uploads/verifies canonical output and returns Idle Saver
→ Admin sees A Offline/Unhealthy and B Rendering then Idle Saver
→ Customer remains in recovery, then Render Complete; no Amount/Payment early
```

The local rehearsal already proves frame checkpoint reuse. The authenticated
staging run must separately prove RPC lease timeout, reassign, stale completion
rejection, B2 metadata/checksum and Admin/Customer state.

## Current preflight evidence

The read-only preflight confirmed the scene checksum and Blender 5.2.0. It
reported these missing names without reading or printing values:

```text
CWS_STAGING_SUPABASE_URL
CWS_STAGING_SUPABASE_KEY
CWS_STAGING_B2_ENDPOINT
CWS_STAGING_B2_KEY_ID
CWS_STAGING_B2_APP_KEY
CWS_STAGING_B2_BUCKET
CWS_STAGING_B2_PREFIX
CWS_STAGING_WORKER_ID
CWS_STAGING_FLEET_ID
```

Therefore authenticated staging runtime is **BLOCKED**, and no backend, B2,
Worker host or production system was contacted.

## Local verification

- Scene preflight: checksum/size/Blender version PASS; staging readiness
  correctly returned BLOCKED without printing secret values.
- Staging preflight contract tests: 4/4 PASS.
- Worker suite: 48/48 PASS.
- Backend: 26 suites / 152 tests PASS; build PASS.
- Frontend: 4 files / 9 tests PASS; build PASS.
