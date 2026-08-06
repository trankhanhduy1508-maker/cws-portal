# CWS Node Agent Production Hardening — 2026-08-05

## Follow-up runtime evidence

The native pywin32 SCM PoC was installed and started as `CWSNodeAgentStaging`, emitted real `ACTIVE_IDLE` heartbeat events, was stopped, restarted, and removed. Recovery actions were configured with `sc failure`. Blender was intentionally not launched from Session 0; the service host exposes a user-session helper boundary instead.

## Result

The state machine and staging runtime remain **REAL RUNTIME VERIFIED** by the existing Full E2E and multi-node evidence. This review did not rerun those flows. Production hardening is **UNVERIFIED/BLOCKED** at the host-supervision layer.

## CODE / UNIT VERIFIED

- Explicit states include `ACTIVE_IDLE`, `PREPARING`, `WORKER_START`, `WORKER_RUNNING`, `RECOVERY`, and `CLEANUP`.
- Duplicate Worker launch is rejected; retry budget and cleanup transitions are bounded.
- Heartbeat exceptions do not kill the Agent, and no code calls Windows power APIs.
- Worker timeout cleanup uses process-tree termination. B2 staging adapter now uses 10s connect, 30s read, and bounded standard retries.
- Existing tests/builds passed before this report; the adapter change requires the focused Python test rerun below.

## REAL RUNTIME VERIFIED

- Node Agent → Generic Worker → Blender → Supabase/B2 staging completion.
- Two-node assignment/fencing/takeover and cleanup evidence already exists in `CWS_MULTI_NODE_FAILOVER_REAL_RUNTIME_VERIFIED_2026-08-05.md`.

## BLOCKED / UNVERIFIED

- The Agent is not yet a Windows Service managed by SCM. Service recovery, crash-loop reset, startup ordering, and rollback are therefore deployment gates, not proven runtime properties.
- `tick()` invokes heartbeat synchronously. A 20-second Supabase timeout can delay the loop; it is caught, but not non-blocking.
- Retry backoff jitter is now available as a bounded opt-in ratio with injectable randomness; the default remains unchanged. The focused Node Agent suite covers the calculation and validation.
- The Job Object POC verifies timeout/process-tree cleanup but is not wired into the production Worker launcher. A Job Object is supervision, not a complete filesystem/network sandbox.
- Disk/RAM/VRAM quotas, log rotation, update hash verification, duplicate machine identity, and rollback compatibility need host-level tests.

## Recommended gate sequence

1. Wrap the current launcher in a Windows Service only after a staging canary; configure SCM recovery actions and reset period.
2. Put each Worker process tree in a Job Object with kill-on-close and no breakaway; test nested children and graceful shutdown.
3. Move network/storage calls behind bounded worker threads or an async adapter so heartbeat timing is independent of remote latency.
4. Add bounded log rotation, disk preflight, version/capability reporting, and rollback manifest checks.
5. Run a staging soak/chaos matrix without rebooting the host.

Official basis: [Windows Service Control Manager](https://learn.microsoft.com/en-us/windows/win32/services/about-services), [service recovery guidance](https://learn.microsoft.com/en-us/windows/win32/rstmgr/guidelines-for-services), and [Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects).
