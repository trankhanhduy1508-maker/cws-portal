# CWS production Node Agent / generic Worker audit — 2026-08-07

## Source-of-truth result

`cws_worker_full.py` and any `cws_worker.bat` legacy references are excluded
from this audit and are not production evidence. The intended package is:

`Node Agent → dynamic JobSpec/TaskSpec → worker/worker_engine.py → Blender CLI`

## Package audit

The Desktop package was inspected read-only:

- `worker-engine.bat`: 152 bytes. It is only a thin launcher; it selects
  `CWS_PYTHON_EXE` or `python`, then invokes `worker/worker_engine.py` with
  forwarded arguments. It does not claim jobs, authenticate, download files,
  upload B2, or launch Blender by itself.
- `worker-engine-manifest.json`: version `0.1.0`; it is intended to pin the
  generic engine and launcher by SHA-256.
- `worker/worker_engine.py`: ~25 KB generic, dynamic-data-driven engine. Its
  CLI only validates a JobSpec; runtime adapters must be supplied by a Node
  Agent. It can run Blender through `BlenderCliRenderer`, validate output,
  checkpoint frames and fence attempts when real adapters are injected.
- The downloaded package's manifest hashes did not match the checked-in
  package files and the launcher validator expected the entrypoint at the
  wrong path. This made the package fail safe validation before launch.

The repository fix changes the manifest to `worker/worker_engine.py`, permits
that bounded package-relative path, and updates the pinned hashes. This does
not make a staging/local adapter production-ready by itself.

## Backend/queue trace

- Customer frontend calls the Render backend, not a browser mock.
- Backend creates a dynamic job/task and the scheduler/lease RPCs are guarded
  by worker identity and generation fencing.
- `/worker/rpc/:operation` authenticates per-worker requests, but the repository
  contains no production long-running Node Agent loop that loads the DPAPI
  credential, polls `claim_next_resilient_task`, builds the complete JobSpec,
  downloads Google Drive/B2 input, injects real B2 checkpoint/report adapters,
  and launches the generic engine.
- `windows_service_host.py` is explicitly a staging PoC and only emits a
  service heartbeat/helper boundary; it does not launch Blender implicitly.
- `worker_engine.py` has no backend or B2 implementation at its CLI boundary.
  Therefore no production evidence exists for claim → Blender → B2 → status.

## Google Drive folder test input

The supplied folder was listed through the authenticated Drive connector. It
contains exactly one supported project (`cube_diorama.blend`) plus a text sidecar
(`blender_assets.cats.txt`). The folder itself is not a render input.

Before this change, production `POST /drive/resolve` with the folder URL returned
HTTP 400 because folders were rejected. The backend now safely queries direct
children through the Google Drive API, allowlists only `.blend`/`.zip`, requires
exactly one candidate, and returns its canonical file link. Zero or multiple
candidates are rejected; the folder ID is not hard-coded.

## Verification

- Backend: 34 suites / 176 tests PASS; build PASS.
- New folder resolver tests cover one supported project and ambiguity rejection.
- Worker: 53 tests PASS; canonical launcher tests PASS; Python compile PASS.
- Frontend: 11 tests PASS; lint/build PASS.
- Production read-only health/auth evidence remains valid from the prior report.
- Render now returns the new folder-resolver message, proving the backend
  deployment reached production; it returns HTTP 400 because
  `GOOGLE_DRIVE_API_KEY` is not configured. No secret value was read or printed.

## E2E status

**NOT PASS / BLOCKED.** No real `jobId`, `taskId`, attempt, worker claim,
Blender PID/log, B2 object or customer status transition was generated in this
session. Creating a fake job or using legacy/staging code would not prove the
requested path.

The single external gate is production Worker execution/provisioning: a
physical Windows host with Blender, the refreshed canonical package, per-worker
credential and required backend/B2 runtime configuration. The current machine
has no Blender installation and no Worker runtime credential. The supplied
folder additionally requires production-only `GOOGLE_DRIVE_API_KEY`; it is not
present in this session.
