# RENTED_MACHINE_GUARD_V1

Status: CODE VERIFIED; PHYSICAL WINDOWS RUNTIME VERIFICATION REQUIRED
Date: 2026-08-16

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

The Track A deployment must include `worker/rented_machine_guard.py` and
`worker/rented_machine_guard_policy.json` beside the Worker source.

## 2026-08-16 self-update convergence

Current-code inspection confirmed that the B2 self-update path still replaced
only `cws_worker_full.py`. That was the first current Guard bottleneck.

The release path now uses one `cws_worker_bundle.zip` containing the Worker,
both Guard companions and `worker_bundle_manifest.json`. The manifest pins the
Worker version and SHA-256 of every required runtime file. The launcher:

1. validates bundle version, required files and every hash before mutation;
2. backs up all currently installed targets;
3. installs the three runtime files and manifest as one bounded transaction;
4. restores the previous targets if any replacement fails;
5. updates `worker_version.txt` only after the transaction succeeds;
6. re-downloads the bundle when an installed same-version manifest is missing
   or mismatched; and
7. refuses to start the Worker when either Guard companion is absent.

`tools/package_track_a_worker.py` is the canonical small release-packaging
command. It derives `WORKER_VERSION` from the Worker source and emits the
required paths plus integrity manifest without embedding credentials.

### Cloud verification evidence

- Guard contract and bundle/manifest contract tests: `CODE VERIFIED`.
- Python compilation and generated ZIP integrity: `CODE VERIFIED`.
- Existing relevant Track A Worker tests: `CODE VERIFIED`.
- PowerShell transaction on Windows: `NEEDS PHYSICAL WINDOWS VERIFICATION`
  because this Cloud container has neither Windows nor PowerShell.
- Real popup, process termination, Blender protection, RELEASE restoration,
  render/GPU behavior and B2 delivery: not promoted beyond available evidence.

### Minimal physical Windows verification

Use a controlled non-customer task and a harmless copied executable renamed to
a temporary blocked-policy name; do not require a game installation.

1. Run `python tools\package_track_a_worker.py --output cws_worker_bundle.zip`,
   upload that exact bundle to `worker-releases/cws_worker_bundle.zip`, and set
   `worker_config.latest_version` to the manifest/Worker version only after the
   upload is verified.
2. Start `cws_worker.bat` on the physical Track A host and confirm the update
   installs `cws_worker_full.py`, both `worker\rented_machine_guard*` files and
   `worker_bundle_manifest.json` with matching hashes.
3. Accept one controlled task and confirm the lease enters `RENTED_LOCK`, then
   `RENDERING`, and the real full-screen rented notice is visible.
4. Start the harmless blocked process repeatedly inside four seconds. Confirm
   it is terminated, only one customer popup appears during the cooldown, and
   a later attempt after cooldown can show a new popup.
5. Confirm `blender.exe`, the CWS Python/console processes, `code.exe` (VS
   Code/Codex surface), and Windows critical processes remain alive.
6. Let the task enter `FINALIZING`, then complete/release it. Confirm the lease
   file and notice disappear and the shutdown/power requests are cleared.
7. Remove the harmless name from the temporary blocked test setup (or launch a
   normal harmless application) and confirm it starts normally after RELEASE.
8. Review `rented_machine_guard.log` and Task Manager to confirm no unrelated
   process was affected.

This procedure can establish `RUNTIME VERIFIED` for the controlled host. It is
not by itself a Golden E2E or broad production-fleet claim.
