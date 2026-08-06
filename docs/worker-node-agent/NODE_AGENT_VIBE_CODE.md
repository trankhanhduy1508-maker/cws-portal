# CWS NODE AGENT / ACTIVE_IDLE VIBE CODE

## Remediation continuation â€” 2026-08-05

- Native SCM service PoC is **REAL RUNTIME VERIFIED** for lifecycle/heartbeat/restart; no Blender launch is attempted from Session 0.
- Job Object process-tree cleanup is **REAL RUNTIME VERIFIED** as a POC, not yet integrated.
- Production Node Agent remains **UNVERIFIED/BLOCKED** until service account, user-session GPU helper, update/rollback and real staging backend reconnect evidence exist.

## Total review â€” 2026-08-05

- Existing state loop, Full E2E and failover remain **REAL RUNTIME VERIFIED** and are not repeated here.
- Bounded retry/cleanup is present and power-management APIs are absent; synchronous remote I/O and lack of SCM/Job Object integration keep production hardening **UNVERIFIED/BLOCKED**.
- Retry backoff now supports bounded, deterministic jitter through `retry_jitter_ratio` and an injected RNG; default `0.0` preserves existing timing until a production caller opts in.

## Má»¥c tiÃªu

Má»™t Node Agent nháº¹ cháº¡y liÃªn tá»¥c trÃªn PC:

PRESENCE/HEARTBEAT â†’ ACTIVE_IDLE â†’ JOB_AVAILABLE â†’ PREPARING â†’ WORKER_START â†’ WORKER_RUNNING â†’ RECOVERY náº¿u cáº§n â†’ CLEANUP â†’ ACTIVE_IDLE.

PC luÃ´n ON. ACTIVE_IDLE khÃ´ng Ä‘Æ°á»£c gá»i Sleep, Hibernate, shutdown, logoff hoáº·c gá»­i input giáº£ láº­p.

## ACTIVE_IDLE contract

- monitor: OFF hoáº·c policy-safe low overhead;
- Blender/heavy Worker: khÃ´ng cháº¡y;
- CPU/GPU: lowest safe practical idle;
- network/control channel: váº«n online;
- Node Agent: chá»‰ heartbeat/poll nháº¹ theo interval;
- job má»›i: chuyá»ƒn state vÃ  spawn Worker nhanh;
- khÃ´ng tá»± thay Ä‘á»•i power policy trÃªn mÃ¡y hiá»‡n táº¡i.

## Node Agent responsibilities

- Ä‘Äƒng kÃ½/presence vÃ  heartbeat;
- bÃ¡o capability/health tá»‘i thiá»ƒu, khÃ´ng gá»­i dá»¯ liá»‡u cÃ¡ nhÃ¢n khÃ´ng cáº§n thiáº¿t;
- nháº­n job descriptor Ä‘Ã£ authorization;
- táº¡o job-scoped workspace;
- gá»i `worker/canonical_worker_launcher.py` sau khi manifest SHA-256 pass;
- supervise process tree, timeout vÃ  exit code;
- retry/recovery cÃ³ bounded attempts;
- cleanup rá»“i quay vá» ACTIVE_IDLE;
- giá»¯ idempotency/fencing; khÃ´ng tá»± complete/bill job ngoÃ i Backend authority.

## KhÃ´ng thuá»™c Node Agent

- khÃ´ng render thay Worker;
- khÃ´ng truy cáº­p Customer private data ngoÃ i job scope;
- khÃ´ng chá»©a service-role, B2 master key, payment secret;
- khÃ´ng tá»± chá»n giÃ¡ hoáº·c payout;
- khÃ´ng tá»± sleep/wake váº­t lÃ½;
- khÃ´ng tá»± download executable tÃ¹y Ã½ hoáº·c pip bootstrap khÃ´ng pin.

## State machine invariant

- Má»i state transition pháº£i explicit vÃ  cÃ³ reason.
- KhÃ´ng spawn duplicate Worker cho cÃ¹ng task lease.
- Worker failure chá»‰ retry khi policy cho phÃ©p.
- Cleanup lÃ  báº¯t buá»™c trÆ°á»›c ACTIVE_IDLE.
- Heartbeat lá»—i khÃ´ng Ä‘Æ°á»£c lÃ m Node Agent crash; pháº£i ghi degraded health.
- Shutdown/stop lÃ  explicit operator action, khÃ´ng pháº£i ACTIVE_IDLE behavior.

## P0 backlog â€” ordered

1. Backend lease/heartbeat adapter tháº­t, khá»›p RPC hiá»‡n hÃ nh vÃ  khÃ´ng log secret.
2. Pinned canonical Worker launcher â€” **CODE VERIFIED**, runtime launch chÆ°a verify.
3. Windows process-tree isolation, ACL/service identity vÃ  cleanup.
4. Staging runtime: 1 PC, Blender CLI, timeout/recovery, B2 checkpoint.
5. Hai node: duplicate claim/failover/stale lease.
6. Chá»‰ sau evidence tháº­t má»›i thiáº¿t káº¿ wake/power integration; hiá»‡n táº¡i khÃ´ng dÃ¹ng Sleep.

## Completed

- `worker/node_agent.py`: deterministic state machine.
- `worker/test_node_agent.py`: 6 offline tests PASS.
- `worker/canonical_worker_launcher.py`: manifest/path/checksum validation; 3 tests PASS.
- Combined offline suite: **9/9 PASS**.
- No Windows power API, Sleep/Hibernate, network call, credential or production job was touched.

## Evidence

- `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md`
- `reports/worker/CWS_WORKER_NODE_AGENT_LOOP_2026-08-05.md`
- Physical Windows/Blender/network/B2/failover remain unverified.


## Admin fleet visibility â€” 2026-08-05

- Backend boundary: `backend/src/jobs/worker-fleet-state.ts`.
- Fresh Node Agent heartbeat + Worker STOPPED/idle = ONLINE + ACTIVE_IDLE; stale heartbeat >180s = OFFLINE.
- Admin endpoint `GET /fleet/workers` exposes Node state, Worker state, health, current task and stale policy.
- Production URL support: `/admin` SPA rewrite + pathname guard. Live deploy/MFA/real heartbeat remains UNVERIFIED.
- Evidence: `reports/worker/CWS_NODE_AGENT_ADMIN_FLEET_VISIBILITY_2026-08-05.md`.


## Lifecycle hardening â€” 2026-08-05

- Added explicit transition reasons and injected `RuntimePolicy` in `worker/node_agent.py`.
- Added non-blocking exponential retry backoff via `retry_ready_at`; attempts remain bounded and cleanup resets retry state.
- Added `worker/node_agent_runtime_policy.py`: monitor-off/on hooks are emitted once per state boundary only; no Sleep/Hibernate/shutdown/logoff/power API.
- Verification: Python py_compile PASS; combined offline suite **11/11 PASS**.
- Evidence: `reports/worker/CWS_NODE_AGENT_LIFECYCLE_HARDENING_2026-08-05.md`.
- Runtime Windows, real Blender/B2, Supabase heartbeat, ACL/isolation, failover and production Admin remain UNVERIFIED/BLOCKED; no fake heartbeat or deployment workaround was used.


## Windows staging verification â€” 2026-08-05

- Python 3.12.7 runtime: REAL RUNTIME VERIFIED.
- Blender 5.2.0 LTS CLI: REAL RUNTIME VERIFIED with harmless factory-startup .blend, disable-autoexec, exit 0, non-empty PNG and SHA-256 verification.
- Supabase endpoint connectivity: REAL RUNTIME VERIFIED only at unauthenticated HTTP reachability (401); no RPC/heartbeat mutation was sent.
- Canonical Worker spawn: BLOCKED because the current Windows checkout lacks cws_worker_full.py and local manifest is an older artifact schema.
- B2 read-only: BLOCKED; configured User-scope credentials returned 401. No upload/download/delete.
- Node Agent real heartbeat, canonical Worker, B2 checkpoint, cleanup and production Admin remain BLOCKED/UNVERIFIED.
- Evidence: reports/worker/CWS_WINDOWS_STAGING_VERIFICATION_2026-08-05.md.


## Integration phase â€” Windows staging runtime (2026-08-05)

- Node Agent spawned the generic Worker Engine as a real child process and returned to ACTIVE_IDLE after Blender completion.
- Crash-once recovery and timeout cleanup were observed in the real local process loop.
- Supabase presence/lease and Admin fleet visibility remain BLOCKED pending staging-safe endpoint/credential.
- Evidence: `reports/worker/CWS_WORKER_WINDOWS_RUNTIME_INTEGRATION_2026-08-05.md`.


## Staging integration contract â€” 2026-08-05

- Node Agent can be wired to staging RPC adapters for register/ping/claim/heartbeat/state/complete/fail without production fallback.
- Required identity/config is isolated under `CWS_STAGING_*`.
- The staging environment template is `worker/staging.env.example`; it contains placeholders only.
- Full E2E remains blocked until staging assignment returns a complete JobSpec and staging credentials are installed.
- Contract: `reports/worker/CWS_STAGING_E2E_CONTRACT_2026-08-05.md`.

## Staging blocker audit â€” 2026-08-05

- No staging endpoint/credential is present on this machine; the only connector-visible Supabase project is not treated as staging.
- Node Agent remains ready for injected register/ping/claim/heartbeat/state/complete/fail adapters, but no assignment is fabricated when the RPC lacks a complete JobSpec.
- Evidence: `reports/worker/CWS_STAGING_BLOCKER_AUDIT_2026-08-05.md`.

## FULL staging E2E â€” REAL RUNTIME VERIFIED â€” 2026-08-05

- Node Agent claimed the staging assignment, spawned the Generic Worker child, observed the real Blender/render/upload/verify path, completed cleanup, and recorded `ACTIVE_IDLE` with `cleanup_complete`.
- Evidence: `reports/worker/CWS_STAGING_FULL_E2E_REAL_RUNTIME_VERIFIED_2026-08-05.md`.

## Multi-node recovery â€” 2026-08-05

- Two independent Node Agent processes ran on staging; separate task claims and state-event streams were observed.
- Crash/stale-heartbeat requeue and generation fencing were verified with a real takeover; both nodes returned to `ACTIVE_IDLE`.
- Admin UI remains **BLOCKED/UNVERIFIED** by the missing staging staff-role/AAL2 boundary. Isolation and production rollout remain **UNVERIFIED/NO-GO**.

## Admin Auth / isolation follow-up â€” 2026-08-05

- `staff_roles`/`staff_worker_access` staging schema is applied with RLS and no client policies.
- Real Admin visibility is **BLOCKED/UNVERIFIED** until Owner creates the staging MFA identity and server-only backend configuration.
- Job Object timeout and process-tree cleanup are **REAL RUNTIME VERIFIED**; host filesystem/network boundary remains **UNVERIFIED**.
# Remediation continuation â€” 2026-08-05

- Native SCM PoC remains **REAL RUNTIME VERIFIED** for lifecycle and heartbeat. The service now bounds its JSONL event log with one explicit rotated file; user-session Worker/Blender launching remains a separate boundary.
- Do not claim production service readiness until service-account policy, update/rollback, GPU session behavior, and real Admin AAL2 fleet evidence are complete.
