# Tasks: Production-Grade Node Engine and Render Worker

## Analyze gate

- [x] Read canonical governance, workflow, roadmap, decisions, constitution,
      Spec Kit artifacts, worker docs and learning-log location.
- [x] Confirm production backing repo and commit from Vercel metadata.
- [x] Map launcher files to real Node Engine/Worker implementations.
- [x] Record root cause and state-name clarification.
- [x] Record current test collection failure and production heartbeat gap.

## Foundation

- [x] Repair the non-UTF-8 test module using a minimal source-only change and
      add a regression encoding check.
- [x] Add sanitized structured diagnostic/error contracts shared by Node Engine
      and Worker; never serialize secrets or customer source data.
- [x] Add explicit readiness result with reason codes and fail-closed checks.

## Node Engine

- [ ] Extract stable identity/config handling into a module while preserving
      the existing DPAPI credential and backend enrollment contract.
- [ ] Extract host capability discovery (OS, CPU, RAM, GPU/VRAM, Blender,
      disk/network) with platform-safe fallbacks and truthful UNKNOWN values.
- [ ] Extract guarded state machine preserving canonical `ACTIVE_IDLE` mapping.
- [ ] Extract single-instance supervision, bounded restart/backoff and crash-loop
      protection; prevent duplicate Worker process per lease.
- [ ] Add startup/reconnect/heartbeat/state/worker-crash tests.

## Render Worker

- [ ] Extract JobSpec/claim boundary without changing atomic backend ownership.
- [ ] Extract download and ZIP/RAR safety with size/path/symlink/nested-blend
      tests.
- [ ] Extract Blender preflight and conservative optimizer with protected
      render-quality projection tests.
- [ ] Extract renderer/output validator/checkpoint/reporting/cleanup adapters.
- [ ] Add real Blender harmless-fixture verification and interrupted recovery
      coverage where the host supports it.

## Converge

- [ ] Run full offline suite and Windows runtime suite.
- [ ] Update CURRENT_STATUS, roadmap/evidence and Engineering Learning Log in
      the canonical repo; the current checkout has no repo learning-log file.
- [ ] Commit logical stages only after tests/evidence pass.
- [ ] Production heartbeat/claim/render/B2/payment E2E remains a separate gate;
      never upgrade CODE or WINDOWS evidence to PRODUCTION evidence.
