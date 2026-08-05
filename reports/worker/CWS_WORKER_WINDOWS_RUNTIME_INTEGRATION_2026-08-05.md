# CWS Worker/Node Agent Windows Runtime Integration — 2026-08-05

## Scope

Safe local staging only. No Supabase claim, no B2 access, no production/customer job.

Package under test:

- Node Agent: `worker/node_agent.py`
- Generic Worker Engine: `worker/worker_engine.py`
- Staging harness: `worker/staging_runtime.py`
- Dynamic spec: `worker/staging_job_spec.json`

## Environment

- Python: `G:\CWS_Render\PythonEmbed\Python.exe` (Windows staging runtime)
- Blender: `G:\CWS_Render\Blender\blender-5.2.0-windows-x64\blender.exe`
- Blender: 5.2.0 LTS
- Input: `C:\Users\Administrator\CWS_Staging_20260805\safe_scene.blend`
- Hardware: NVIDIA GeForce RTX 2060 SUPER, 8192 MiB, driver 576.88
- System RAM reported by Windows: 17,009,356,800 bytes

## Real runtime results

### Happy path

Command used the dynamic JobSpec and local harmless .blend.

Observed:

`PREPARING → WORKER_START → WORKER_RUNNING → CLEANUP → ACTIVE_IDLE`

Worker events:

`DOWNLOADING → PREFLIGHT → PREPARING → RENDERING → UPLOADING → VERIFYING → progress frame 1/1 → complete`

Result:

- child Worker exit code 0;
- PNG output was rendered by Blender and passed `OutputIntegrityValidator`;
- filesystem checkpoint and SHA-256 sidecar were written and verified;
- local job workspace was cleaned;
- Node Agent returned to `ACTIVE_IDLE`.

Classification: **REAL RUNTIME VERIFIED** for local Node Agent → child Generic Worker → Blender → validation → checkpoint → cleanup → ACTIVE_IDLE.

### Crash recovery

A staging-only crash-once child exited 17 before render. Node Agent observed:

`WORKER_RUNNING → RECOVERY → PREPARING → WORKER_START → WORKER_RUNNING → CLEANUP → ACTIVE_IDLE`

The retry then ran Blender successfully and completed.

Classification: **REAL RUNTIME VERIFIED** for local bounded recovery path.

### Timeout/process cleanup

With a one-second Blender timeout:

- Blender render raised `RetryableWorkerError: Blender render timed out`;
- Node Agent observed `WORKER_RUNNING → RECOVERY → CLEANUP → ACTIVE_IDLE`;
- harness exited with no result artifact;
- no Blender process remained after the test;
- the first run exposed a harness cleanup hang; it was fixed by bounding `taskkill` and force-stopping the owned direct child. The timeout test was rerun successfully.

Classification: **REAL RUNTIME VERIFIED** for timeout classification and local cleanup path.

## Capability preflight

Actual hardware discovery:

- `nvidia-smi`: RTX 2060 SUPER, 8192 MiB, driver 576.88.
- Windows RAM: approximately 16 GiB.

The staging JobSpec supplied dynamic requirements and the Worker admitted the node using the injected profile.

Classification: **REAL RUNTIME VERIFIED** for hardware observation and preflight admission; the production capability-reporting adapter remains **UNVERIFIED**.

## Supabase

No usable staging-safe Supabase credential/endpoint was present in the current environment. No claim, lease, heartbeat RPC, or production mutation was attempted.

Classification: **BLOCKED** — needs isolated staging project/credential or explicit safe test procedure.

## B2

No staging-safe B2 credential was present. No production bucket/object was touched. Local filesystem checkpoint only.

Classification: **BLOCKED** — needs isolated staging bucket/prefix and least-privilege credential.

## Safety

No reboot, shutdown, sleep, hibernate, logoff, production data mutation, live payment, credential rotation, or production Worker launch occurred.
