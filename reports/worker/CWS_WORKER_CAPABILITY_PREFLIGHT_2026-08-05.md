# CWS Worker Capability Preflight Evidence — 2026-08-05

## Capability

JobSpec can carry dynamic minimum `required_vram_mb` and `required_ram_mb` requirements. The generic Worker Engine's filesystem-only preflight rejects a node whose injected capability profile is insufficient before Blender starts.

- Scheduler remains responsible for node selection.
- Worker preflight is a final execution safety guard.
- No GPU discovery or customer code execution is performed by this guard.
- No job/customer/credential is hard-coded.

## Verification

Windows staging Python:

`G:\CWS_Render\PythonEmbed\python.exe`

```text
python -m py_compile worker\worker_engine.py worker\test_worker_engine.py
python -m unittest discover -s worker -p 'test_*.py' -v
```

Result: **24/24 PASS**.

Failure test: 8 GB VRAM requirement on a 4 GB capability profile is rejected as permanent preflight failure.
Success test: 4 GB VRAM / 16 GB RAM requirement on an 8 GB / 32 GB profile is accepted.

## Classification

- CODE/UNIT VERIFIED: dynamic JobSpec requirements and preflight decision.
- REAL RUNTIME VERIFIED: compile and full suite executed with Windows staging Python.
- UNVERIFIED: actual NVML/Windows capability discovery and real Blender job admission.
- BLOCKED: no isolated staging fleet credential/endpoint was used.

## Safety

No production data, B2 objects, credentials, power state, reboot, shutdown, sleep, or logoff changed.
