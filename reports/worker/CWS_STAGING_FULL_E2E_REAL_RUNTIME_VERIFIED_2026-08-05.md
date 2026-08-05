# CWS staging FULL E2E — REAL RUNTIME VERIFIED

Date: 2026-08-05
Environment: Windows new machine, Supabase project `cws-staging` only
Worker: `cws-staging-worker-01`
Fleet: `1`
Job: `staging-safe-20260805-01`

## Evidence

- All 9 `CWS_STAGING_*` variables were present in User scope; values were not printed.
- Supabase staging RPC connectivity: PASS (`worker_ping`).
- B2 staging bucket connectivity: PASS (`HeadBucket`).
- The staging assignment RPC claimed task `1` with lease generation `3` and worker `cws-staging-worker-01`.
- Node Agent spawned the child process from `staging_e2e.py`; no `cws_worker_full.py` runtime was used.
- Blender 5.2.0 rendered frame 1 from the staging-safe `.blend` with autoexec disabled.
- Output integrity and checkpoint verification completed in the Generic Worker Engine.
- B2 HEAD verification passed for `<CWS_STAGING_B2_PREFIX>/1/frame_0001.png`; metadata matched job/task/frame, SHA-256 metadata was present, and object size was positive.
- Supabase task completion was accepted: task status `done`; worker state returned to `ACTIVE_IDLE` with reason `cleanup_complete`.
- No Blender/Python worker processes remained after completion.

## Runtime fixes made during this run

- Windows `file:///C:/...` URI parsing was corrected in `worker/staging_e2e.py`.
- The harmless staging `.blend` was completed with a camera and light after Blender correctly rejected the original camera-less scene.

This is a real staging runtime verification, not a mock, unit-only, or local-only result. Production was not used or mutated.
