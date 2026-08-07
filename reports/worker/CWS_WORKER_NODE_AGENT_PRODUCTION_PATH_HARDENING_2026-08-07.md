# CWS Worker/Node Agent production-path hardening — 2026-08-07

## Scope

The canonical path remains `production_node_agent.py` → authenticated Worker
RPC → dynamic `JobSpec` → `worker_engine.py`. Legacy
`cws_worker_full.py`/`cws_worker.bat` were used only as reference; neither is
imported or launched by the new path.

## Implemented

- Drive/Google API downloads now stage as an extension-neutral temporary file
  and detect `.blend` versus `.zip` from the file signature. A Drive file URL
  without a filename extension can therefore carry a ZIP safely; HTML/error
  payloads still fail before Blender.
- B2 frame resume no longer trusts metadata alone. `is_verified()` now checks
  identity/size metadata and streams the actual B2 object to recompute its
  SHA-256. `verify()` also compares local bytes, remote bytes and the recorded
  digest. The object carries `bytes`, job/task/attempt/generation and hash
  metadata.
- Production Node Agent state transitions are now reported through the
  existing authenticated `report_worker_state_transition` RPC. Internal
  `WORKER_START` maps to `PREPARING` and `WORKER_RUNNING` maps to `RENDERING`;
  `ACTIVE_IDLE`, `RECOVERY` and `CLEANUP` remain canonical. Report failures
  are logged without killing the supervisor.
- `CWS_RENDER_TIMEOUT_SECONDS` must be positive; zero no longer creates an
  immediate accidental timeout.

## Verification

- Worker/Node Agent Python suite: **69/69 PASS**.
- Python compile: **PASS**.
- Backend Jest: **178/178 PASS**, 34 suites.
- Backend Nest build: **PASS**.
- Real local Blender CLI: Blender 5.2.0 LTS, EEVEE, harmless
  `worker/staging_assets/staging_safe.blend`, frame 1, exit code 0, PNG
  output 3,351 bytes, SHA-256
  `734619EA1E536BF5B228400F795938E47CADD61D43A811DE97553A8AD8FA301A`.
- Real local WorkerEngine path: one frame completed through the generic Engine,
  output integrity, filesystem checkpoint and cleanup. Output 3,400 bytes,
  SHA-256 `ee9871a1ed876fe683efb7caa512907cfcb8ad700f21c198437a999d19ca8fb8`.

## Not claimed

Production Supabase heartbeat/claim, production B2 upload, a physical
authenticated Worker identity, customer job completion and payment/download
remain **NOT VERIFIED/BLOCKED**. Local Blender/Worker evidence is not a
production E2E claim.
