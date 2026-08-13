# Canonical Worker Capability-Gap Analysis

Date: 2026-08-13  
Scope: canonical `production_node_agent.py` + `worker_engine.py` only  
Status: **CODE REVIEWED; REAL E2E NOT VERIFIED**

## Staging execution attempt — blocked before first runtime stage

The existing `worker/staging_e2e.py` harness was inspected, but execution did not
start because the approved staging dependencies are absent from this machine:

- all required `CWS_STAGING_*` configuration values are unset;
- no staging-only project host is configured;
- no Blender executable is available in the current PATH/configuration;
- Python `boto3` was initially unavailable and has now been installed in the local user site.

No production credential, production URL, production database, legacy launcher, or
legacy secret was used. No staging resource was created. Therefore no canonical
startup, heartbeat, claim, render, B2, completion, or cleanup runtime evidence was
produced.

## Exact prerequisite inventory

### Environment variables read by the current harness

| Variable | Purpose | Classification | Secret/mock policy |
|---|---|---|---|
| `CWS_STAGING_SUPABASE_URL` | Staging Supabase REST/RPC base URL | Staging resource; non-secret | Separate staging project only |
| `CWS_STAGING_SUPABASE_KEY` | Staging RPC authentication | Staging credential; secret/public-key policy follows provider | Inject locally; never print/commit; never service-role |
| `CWS_STAGING_B2_ENDPOINT` | S3-compatible staging endpoint | Staging resource; non-secret | Staging B2 only |
| `CWS_STAGING_B2_KEY_ID` | B2 staging application key ID | Staging credential | Bucket/prefix-scoped only |
| `CWS_STAGING_B2_APP_KEY` | B2 staging application secret | Staging credential | Bucket/prefix-scoped only |
| `CWS_STAGING_B2_BUCKET` | B2 staging bucket | Staging resource; non-secret | Dedicated staging bucket or approved isolated bucket |
| `CWS_STAGING_B2_PREFIX` | Output object namespace | Local approved value | No traversal or production prefix |
| `CWS_STAGING_WORKER_ID` | Stable staging Worker identity | Staging identity/resource | Must be authorized by staging RPCs |
| `CWS_STAGING_FLEET_ID` | Staging fleet registration/claim scope | Staging resource; integer | Must exist and be authorized in staging |
| `CWS_STAGING_PROJECT_HOSTS` | Remote project download allowlist | Local non-secret configuration | Approved staging host only |

The current harness does not read `CWS_STAGING_BLENDER`; Blender is supplied by
the required `--blender` CLI argument. Other CLI-only controls are `--spec`,
`--root`, `--timeout`, `--vram-mb`, `--ram-mb`, `--gpu-name`, and timing options.

### Current backend calls and authorization

The current adapter calls `register_worker`, `worker_ping`,
`claim_next_staging_job`, `report_heartbeat`, `report_worker_state_transition`,
`complete_task`, and `fail_task` through staging Supabase REST RPC. The claim must
return a complete current `JobSpec`; the harness does not infer fields from legacy
Worker schemas. The staging key must be bounded to this surface and must not be
service-role.

### Local prerequisites and input/output

- Python 3: available at `C:\Program Files\Python312\python.exe`.
- `boto3`: installed in the local user site and import verified.
- Local workspace: prepared as `.codex-staging-workspace`.
- Blender executable: not found in inspected local installation/tool paths.
- Staging Supabase project/Worker identity/fleet and B2 bucket/prefix/key: unavailable.
- Input: harmless `.blend` or approved `.zip`; local `file://` or HTTPS from
  `CWS_STAGING_PROJECT_HOSTS` only.
- B2: read/write within the staging prefix for checkpoint HEAD/upload/verification;
  no delete, bucket-admin, lifecycle-admin, or production access.

## Grounded conclusion

The legacy implementation is a capability reference only. The canonical path has
implementation and unit/contract coverage for the requested MVP lifecycle, but the
machine-readable staging and real Blender/B2/backend lifecycle evidence is not
complete. No code P0 gap is proven by this review, so no speculative implementation
was made.

## Capability matrix

| Legacy capability | MVP required? | Canonical location | Priority/status | Security boundary | Evidence |
|---|---:|---|---|---|---|
| Receive authorized job | Yes | `production_node_agent.py` `ProductionRpcAdapter.claim`; `worker_rpc_auth.py` | P0 — code verified, runtime pending | HMAC Worker gateway, worker identity, lease/generation | Contract tests; staging claim pending |
| Obtain input securely | Yes | `DriveOrB2Downloader` + backend storage capability | P0 — code verified, runtime pending | HTTPS, allowlisted Drive/API path, short-lived B2 capability, signature/size checks | Signature/host/capability tests; real acquisition pending |
| Prepare workspace | Yes | `WorkerEngine.run`, workspace root checks, reparse-point rejection | P0 — code/unit verified, runtime pending | Root containment, cleanup in `finally` | Worker Engine tests; Windows staging pending |
| Extract ZIP/RAR package | Yes for approved formats | `resolve_project_input`, safe ZIP/RAR extraction | P0 — code/ZIP tests verified; RAR runtime pending | traversal, symlink, bomb, nested archive and size limits | ZIP/RAR contract tests; managed 7-Zip staging pending |
| Validate Blender project | Yes | `BasicPreflight`, `BlenderScenePreflight`, analyzer | P0 — code verified, real Blender pending | autoexec disabled, metadata and missing-assets checks | Unit/contract tests; real scene pending |
| Prepare/optimize project | Yes per current workflow | `BlenderSafePreparer`, `blender_optimizer.py` | P0 — code verified, real Blender pending | immutable original, protected-field projection, working-copy-only render | Unit/contract tests; real optimizer run pending |
| Launch Blender/render | Yes | `BlenderCliRenderer` | P0 — code verified, real host pending | `--disable-autoexec`, timeout, owned process tree/job object | Mocked renderer tests; real Windows/Blender run pending |
| Report progress/state | Yes | `ProductionReporter`, `ProductionRpcAdapter.transition/update_stage` | P0 — code verified, runtime pending | authenticated task/generation fencing | Contract tests; live state trace pending |
| Failure/retry safely | Yes | `NodeAgent`, `WorkerEngine` failure categories, lease fencing | P0 — unit verified, runtime pending | bounded supervisor behavior; stale attempt rejected | Unit tests; induced staging failure pending |
| Produce output | Yes | `OutputIntegrityValidator`, checkpoint pipeline | P0 — code verified, real render pending | structural output validation before upload | Unit tests; real output pending |
| Upload output canonically | Yes | `ProductionB2CheckpointStore` + backend storage capability | P0 — code verified, real B2 pending | short-lived scoped PUT, size/hash verification | Contract tests; B2 stage/verify pending |
| Report completion | Yes | `ProductionRpcAdapter.complete` | P0 — code verified, runtime pending | task/generation fencing; duplicate completion rejected | Contract tests; live lifecycle pending |
| Cleanup and return ready | Yes | `WorkerEngine` `finally`; Node Agent cleanup/state observer | P0 — code/unit verified, runtime pending | workspace root containment; no legacy fallback | Unit tests; real Windows cleanup/ACTIVE_IDLE pending |
| Legacy self-update/bootstrap | No | None; intentionally not ported | P2 — nonessential | Avoids direct B2/Supabase credential architecture | Founder decision |
| Legacy direct Supabase table/RPC access | No | None; replaced by Backend gateway | P2 — forbidden | No direct client DB privilege or service-role on Worker | Founder decision; migration 022 may break it |
| Legacy direct B2 master-key runtime | No | None; replaced by scoped capability | P2 — forbidden | Worker has no master B2 key | Credential/config tests |

## P1 gaps

- Real multi-machine failover and recovery under lease expiry.
- Runtime evidence for adaptive scheduling/long-running stage timings.
- Full production-equivalent Windows ACL/service restart evidence.
- RAR execution with the managed 7-Zip runtime on staging.

These are important but do not justify restoring legacy credentials or changing the
approved workflow.

## P0 gaps remaining

These are verification gates, not proven missing code:

1. Staging canonical Node Agent authentication and authorized claim.
2. One controlled task through input download, extraction, Blender preflight,
   optimization, render, progress, scoped B2 upload/verify, completion, cleanup,
   and `ACTIVE_IDLE`.
3. One induced retryable failure and one stale-generation/fencing rejection.
4. Evidence that the Worker process never receives Supabase service-role or B2
   master credentials.

## Smallest safe next action

Run the existing credential-gated `worker/staging_e2e.py` in a dedicated staging
environment with one harmless controlled project and approved staging credentials.
Do not use production URLs, production data, legacy launchers, or migration 022.

## Founder boundary

Founder approval is required before staging credentials/resources are provisioned,
before any production deployment or migration, and before destructive credential
rotation/revocation. This analysis authorizes none of those actions.
