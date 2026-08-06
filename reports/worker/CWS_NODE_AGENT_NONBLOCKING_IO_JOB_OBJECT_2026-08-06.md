# CWS Node Agent non-blocking I/O and Job Object hardening — 2026-08-06

## Scope

Focused P0/P1 hardening only. No production mutation, credential use, staging
RPC mutation, or repeat of the previously verified Full E2E/multi-node flows.

## Changes

- `NodeAgent` now has an explicit `non_blocking_heartbeat=True` mode. It uses
  one daemon worker and a single-flight queue, so a slow remote heartbeat never
  blocks `tick()` or creates unbounded concurrent requests. Remote errors are
  surfaced on a later tick.
- The local and credential-gated staging parents opt into that mode. The
  default remains synchronous for compatibility with existing callers until a
  deployment explicitly opts in.
- Added `worker/job_object.py`, a small Windows Job Object wrapper with
  kill-on-close process-tree ownership. `BlenderCliRenderer` accepts the
  explicit `use_job_object=True` flag; both staging launchers enable it.
- The Job Object is supervision only; it is not claimed as filesystem/network
  sandboxing, and SCM Session 0 does not launch Blender.

## Verification

- Python 3.12.7 `py_compile`: PASS.
- Worker offline suite: **35/35 PASS**.
- Focused tests prove heartbeat `tick()` remains bounded while the callback is
  held, only one heartbeat is in flight, delayed errors are reported, and the
  renderer attaches/closes its owned Job Object.
- `git diff --check`: PASS.
- No production or staging mutation was performed. Windows Job Object live
  execution and SCM deployment remain unverified on this change.

## Remaining gates

Owner/deployment work remains required for service identity, user-session GPU
helper, service recovery/update/rollback, hostile `.blend` isolation,
observability, credentials, Admin AAL2, and production RPC authentication.
