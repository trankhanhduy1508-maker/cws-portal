# RENTED_MACHINE_GUARD_V1

Status: IMPLEMENTED AS LOCAL TRACK A V1 BOUNDARY  
Date: 2026-08-14

## Scope

The Guard is attached only after Track A has claimed a task and prepared its
working copy/context. It is not active for an idle Worker, an installed
Blender, or a queued task. The current lifecycle is:

`task accepted -> context prepared -> RENTED_LOCK -> RENDERING -> FINALIZING -> RELEASE`

Unexpected Worker termination leaves a local lease record. The next Worker
startup treats a record whose owning PID is no longer alive as stale and
recovers it before acquiring a new lease. The normal `atexit` path also
releases the active lease.

## V1 controls

- A local JSON lease records lease ID, job ID, Worker PID, Blender PID, state,
  start time and last-seen time. It is stored under `CWS_DIR` and is not a
  repository artifact.
- A best-effort always-on-top full-screen Windows Forms notice shows only a
  generic CWS render message, safe job ID, state and elapsed time. Closing the
  notice does not release the lease.
- `SetThreadExecutionState` keeps the system awake while the Guard thread is
  alive and clears the request on release.
- `ShutdownBlockReasonCreate/Destroy` is used against the Worker console when
  Windows exposes a console window. It is an accidental-shutdown deterrent,
  not a force-shutdown guarantee.
- A small explicit local process policy is checked every two seconds. The
  initial policy contains only the Founder-provided example launchers and can
  be changed per partner without changing Worker code. Exact-name matching,
  protected-process exclusions and PID/tree termination bound the action.
- All Guard operations are best-effort around the render core; a failed Guard
  acquisition prevents that task from rendering and returns it as transient.

## Boundary and limitations

This is not kiosk mode, BIOS lock, Ctrl+Alt+Del suppression, a kernel driver,
an anti-cheat system, a Windows service, Node Agent, Worker Engine, scheduler,
or a guarantee against privileged/forced shutdown. The process list must be
validated against the actual partner environment before wider rollout.

The current Track A deployment must include `worker/rented_machine_guard.py`
and `worker/rented_machine_guard_policy.json` beside the Worker source. The
existing B2 self-update path currently replaces only `cws_worker_full.py`; it
does not yet package these two companion files. Therefore runtime Guard
verification on a separately updated render host is NOT VERIFIED until that
packaging boundary is exercised and confirmed.

No Python/Blender runtime or production Worker was run during this change.
