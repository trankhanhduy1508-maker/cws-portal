# CWS Legacy vs Production Worker Feature Parity

Audit date: 2026-08-07. The legacy `cws_worker_full.py` and `worker_full.py`
are reference material only. Production is Node Agent → authenticated dynamic
JobSpec → `worker/worker_engine.py`.

Status meanings: **IMPLEMENTED** means the production path exists;
**TESTED** means code/unit/local evidence exists; **PHYSICAL-E2E-VERIFIED**
requires a real Windows Worker, Blender, backend lease and B2 evidence.

| Capability | Status | Production path/evidence |
|---|---|---|
| Dependency/bootstrap | TESTED | Pinned fail-closed `blender_bootstrap.py`; no auto-pip |
| Blender detection/portable install | TESTED | Explicit executable or official HTTPS archive + SHA-256 |
| Worker auth/identity | TESTED | Per-worker DPAPI credential and authenticated HMAC RPC |
| Heartbeat/presence | TESTED | Authenticated ping/heartbeat and lease guard |
| Pull/atomic claim | TESTED | Backend resilient claim RPC with generation |
| Dynamic JobSpec/TaskSpec | TESTED | Authenticated migration-022 spec bridge |
| Google Drive/B2 download | TESTED | HTTPS allowlist and configured B2 bucket |
| Checksum | TESTED | SHA-256 input/output and B2 metadata checks |
| `.blend`/`.zip` safe extract | TESTED | Bounded entries/bytes/ratio; traversal and symlink rejection |
| Preflight | TESTED | Capability check plus read-only Blender scene analysis |
| Linked assets | IMPLEMENTED | Missing linked assets are rejected; physical asset-pack gate remains |
| Textures/materials/lights/cameras | TESTED | Scene analyzer inventories them; Blender remains renderer |
| Animation/frame range | TESTED | Dynamic frame fields and verified frame checkpoints |
| Add-on dependency | IMPLEMENTED | No remote installation; unsupported/preflight failure is fail-closed |
| Optimization profiles | TESTED | Analyzer and working-copy proposal/apply; no blind mutation |
| Prepare | TESTED | Isolated per-attempt workspace and input preparation |
| Headless Blender | TESTED | `--background --disable-autoexec` with exit-code checking |
| PID/progress/log monitoring | TESTED | Real PID, bounded output capture, process-tree containment |
| GPU/CPU/RAM monitoring | IMPLEMENTED | Redacted best-effort JSONL telemetry; diagnostic only |
| Checkpoint/resume | TESTED | Verified frames are skipped and stale attempts fenced |
| Timeout/retry/fencing | TESTED | Bounded timeout, backend retry policy, generation guard |
| Output validation | TESTED | Size/PNG structure/prefix validation |
| B2 multipart/resume upload | TESTED | boto3 managed upload; provider resume needs physical runtime evidence |
| Checksum verification | TESTED | Uploaded metadata is compared with local output |
| Completion reporting | TESTED | Authenticated stage/progress/complete/fail RPCs |
| Cleanup/cache wipe | TESTED | Finally cleanup and attempt isolation |
| Return to IDLE_SAVER | TESTED | Agent clears assignment and returns to polling state |

## Deliberate legacy exclusions

Legacy unpinned `pip install`, unpinned Blender download, `--enable-autoexec`,
remote shutdown and remote update are not restored. They expand the attack
surface or can interrupt unrelated host work. The production equivalents are
pinned bootstrap, disabled autoexec, authenticated RPC, bounded process
containment and fail-closed configuration.

## Verification boundary

No capability is marked physical E2E verified yet. Worker tests and local
Blender/Eevee evidence do not prove production. Worker DONE requires a real
production task claim, real `Blender.exe` PID, verified B2 output, backend
completion and customer result. The remaining gate is production credentials
and physical Worker access; no fake completion is recorded.
