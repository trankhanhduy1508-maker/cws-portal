# CWS Track A Supervisor V1 — Audit and Design

Status: DESIGN REVIEWED / CODE VERIFIED. No Track A runtime or production claim.

## Goal

Reduce Founder per-file operational work for a Founder-controlled PC while
keeping the current render core stable:

`cws_worker.bat -> cws_worker_full.py -> Blender/Cycles -> validated output -> B2`

The V1 target is multiple queued customer jobs, automatic next-job selection,
per-job isolation, and no Worker source edit for each new file.

## Grounding and first failing boundary

Evidence reviewed:

- `CURRENT_STATUS.md` and `CWS_WORKER_TRACKS.md` (Track A is current priority).
- `cws_worker_full.py` current `main` implementation.
- `cws_worker.bat` current launcher/supervisor.
- `backend/src/jobs/jobs.service.ts` and `worker-fleet.gateway.ts`.
- Worker queue migrations and current JobSpec/Worker Engine references.

Claim: the active Track A renderer requires a source edit for every new job.

Status: **CONTRADICTED by current code for queue selection**.

`claim_next_task()` calls the Supabase RPC without a job ID. It selects from the
whole task queue, returns the claimed job ID, and `_load_job_context(job_id)`
then reads that job's `blend_link` and `blend_file`. The old `JOB_ID` constant is
now historical/commentary in the file, not the active claim input.

The real first failing boundary is **job intake / task seeding and deliverable
policy**, not the Blender render loop. A new job must already exist in the
Worker Fleet `jobs`/`tasks` data path before the current worker can claim it.

## Current coupling map

| Item | Current owner | Classification | Finding |
|---|---|---|---|
| Google Drive/B2 input URI | `jobs.blend_link`, read by `_load_job_context()` | PER-JOB DATA | Dynamic after the job/task exists; not Worker source config. |
| Input filename | `jobs.blend_file` | PER-JOB DATA | Dynamic; used for job-scoped local cache path. |
| `job_id` | `claim_next_task()` result / Supabase task row | RUNTIME STATE + PER-JOB IDENTITY | No active hardcoded claim dependency. |
| `task_id` | `claim_next_task()` result | RUNTIME STATE | Controls lease, heartbeat, checkpoint and completion. |
| `customer_id` | Customer/RenderOrder domain | PER-JOB DATA | Not carried by the legacy render core; must remain outside its credentials/input boundary. |
| frame range | `tasks.frame_start/frame_end` | PER-TASK DATA | Claimed dynamically; probe/task expansion is upstream. |
| output type | legacy worker effectively renders PNG frames | STABLE WORKER BEHAVIOR | No per-job image/video deliverable contract in this core. This is a real V1 gap. |
| B2 output destination | `renders/{job_id}/task_{task_id}/{file}` | PER-JOB DATA derived by Worker | Job/task isolation exists for frame uploads. Final assembly/deliverable policy is outside this core. |
| Supabase claim/status | RPCs in `cws_worker_full.py` | RUNTIME CONTROL STATE | Existing claim, heartbeat, fail/requeue and complete behavior is already the queue control path. |
| launcher path and restart | `cws_worker.bat` | STABLE WORKER / PER-MACHINE CONFIG | `CWS_DIR`, Python portable path and restart loop are machine setup. |
| Blender path/cache | `CWS_DIR` plus `Blender/`, `work/` | PER-MACHINE CONFIG + JOB-SCOPED WORKSPACE | The worker caches by filename under one shared `work` root; collision/cleanup policy needs V1 hardening. |
| B2/Supabase credentials | environment in Python; embedded update credentials in BAT | SECRET | Environment-based render credentials are separate from the launcher's tracked update credential material. Rotation/removal is a P0 safety action. |
| retry/completion | task RPCs plus `.bat` process restart | RUNTIME STATE | Bounded task requeue and per-frame checkpointing exist; process restart is broad and does not create a local job state record. |

## Why the old manual loop still happens

The Worker is already capable of selecting multiple jobs, but the Founder's
operational intake does not yet expose a safe local queue that creates the
corresponding internal Worker Fleet job/task records. The existing backend
`WorkerFleetGateway.createInternalJobWithProbeTask()` is the established bridge
from a RenderOrder to `jobs`/`tasks`, and `JobsService` supplies the input link
and filename. It is not a local Founder queue UI/CLI and it must not be bypassed
with direct Supabase writes or a copied service credential.

Therefore changing `JOB_ID` or regenerating `cws_worker_full.py` is the wrong
fix family. It would reintroduce coupling that the current Worker already
removed.

## Smallest safe Supervisor V1 design

### Decision

Do not add a second permanent renderer supervisor around `cws_worker.bat`.
`cws_worker.bat` already owns process restart, while `cws_worker_full.py` already
owns queue polling/claim/retry. A second loop would create duplicate restart
and ownership behavior.

V1 should be a **local intake queue/manifest**, not a replacement scheduler:

1. Founder adds one job manifest per customer file to a local SQLite database.
2. The manifest stores only job data and desired output, never credentials.
3. A narrow bridge submits each queued manifest through an approved authenticated
   backend operation that creates the RenderOrder/internal Worker job and probe
   task. It must be idempotent by `job_id`/idempotency key.
4. Existing Track A worker claims the resulting task globally and automatically
   proceeds to the next queued job.
5. The local queue observes the backend job/task/output state and records
   `QUEUED`, `SUBMITTED`, `RUNNING`, `DONE`, or `FAILED` with a bounded error
   summary. It never fabricates completion from process exit alone.

SQLite is preferred over JSONL for V1 because two customers and retries need
atomic state transitions and uniqueness. It is still local, deterministic and
requires no new service. The database belongs outside the repository or in a
machine-local CWS workspace and must not be committed.

### Minimum manifest contract

Required:

- `local_job_id` — founder-created stable idempotency key;
- `customer_id` or Founder contact label — operational metadata only;
- `input_type` — `GOOGLE_DRIVE` or approved `B2` reference;
- `input_location` — URI/reference, not a secret;
- `input_file_name`;
- `frame_start`, `frame_end` when already authoritative; otherwise `PENDING_METADATA`;
- `deliverable_type` — at minimum `FRSLIAI`, `VIDEO`, `IMAGE_SEQUENCE`, `ZIP`;
- `output_prefix` — derived/validated under the job namespace;
- `status`, timestamps, retry count, and bounded `last_error`.

The bridge must not accept a customer-forged `INPUT_SAFE`, service-role key,
B2 master credential, or arbitrary output prefix. For Drive input, the existing
authenticated security/materialization path remains authoritative.

### V1 state transitions

`LOCAL_QUEUED -> SUBMITTING -> SUBMITTED -> RUNNING -> DONE`

Failures are explicit:

`SUBMITTING -> FAILED` (safe retry only when idempotency is known)

`RUNNING -> FAILED` (backend/Worker evidence required)

No local state transition to `DONE` is allowed from “process exited” or “PNG
exists”; it requires the existing backend/Worker completion plus validated
output evidence.

## Non-goals and stop conditions

- no Node Agent, Worker Engine, Windows service, Redis/NATS/Kafka or new cloud;
- no direct writes to Supabase `jobs`/`tasks` from a local script;
- no second worker restart loop;
- no modification of `cws_worker_full.py` per customer/job;
- no automatic video assembly for an image-only deliverable;
- no secrets in the queue, repository or Telegram report;
- no claim of Golden Production E2E.

## Required next implementation slice

Before coding the bridge, one approved authenticated backend intake operation
must be identified or exposed for Founder-controlled manifests. Current code
has the server-side bridge method but no dedicated local Founder queue contract.
The next smallest implementation is therefore a **local SQLite manifest schema
plus a dry-run/validation command**, followed by a separate authenticated
submission adapter only after its exact auth boundary is confirmed.

That sequence preserves the current render core and prevents a local tool from
silently becoming an untrusted Supabase control plane.

## Evidence level

`CODE VERIFIED` for the coupling map and design constraints. No local queue was
implemented in this audit slice, and no real Track A render or B2 delivery was
claimed.
