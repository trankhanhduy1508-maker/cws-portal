# CWS Worker Timeout Cleanup Evidence — 2026-08-05

## Capability

`BlenderCliRenderer` now owns the spawned Blender PID for each render attempt.

- Uses `Popen` + `communicate(timeout=...)`.
- Windows timeout invokes `taskkill /PID <owned-pid> /T /F` to terminate only that render process tree.
- Non-Windows fallback kills the owned process.
- A timeout remains `RetryableWorkerError`; retry policy remains Backend/Node Agent authority.
- No power-management action is performed.

## Verification

Windows staging Python:

`G:\CWS_Render\PythonEmbed\python.exe`

```text
python -m py_compile worker\worker_engine.py
python -m unittest discover -s worker -p 'test_*.py' -v
```

Result: **22/22 PASS**.

## Classification

- CODE/UNIT VERIFIED: timeout ownership and cleanup implementation compiles and does not regress the full suite.
- REAL RUNTIME VERIFIED: compile and test suite executed with the Windows staging Python runtime.
- UNVERIFIED: actual timed-out Blender child-process tree on the staging PC.
- BLOCKED: no destructive/long-running timeout test was run against a live customer or production render.

## Safety

No reboot, shutdown, sleep, logoff, production mutation, credential change, or external process was terminated by this evidence run.
