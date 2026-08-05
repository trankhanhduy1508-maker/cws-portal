# CWS Node Agent State Machine — Evidence — 2026-08-05

## Scope

Implemented the first P0 Node Agent loop on `main`:

`ACTIVE_IDLE → PREPARING → WORKER_START → WORKER_RUNNING → RECOVERY/CLEANUP → ACTIVE_IDLE`

The module is intentionally side-effect-free. Heartbeat, job polling, preparation, Worker launch, inspection and cleanup are injected callbacks so production adapters can be added without hiding power or credential side effects.

## Verification

Command executed on the Windows workstation:

```text
G:\CWS_Render\PythonEmbed\python.exe -m unittest discover -s worker -p "test_*.py" -v
Ran 6 tests ... OK
```

Covered:

- idle node does not spawn a Worker;
- completed job returns to `ACTIVE_IDLE`;
- running Worker is not launched twice;
- retryable failure has bounded retries and cleanup;
- non-retryable failure is not retried;
- heartbeat error records degraded state without crashing the agent.

## Safety verification

- No reboot, shutdown, logoff or sleep was executed.
- No Windows power API is called by the state machine.
- No network, B2, Supabase, payment or production job was touched.
- No secret is read or embedded.
- This is **UNIT VERIFIED**, not physical Worker/Fleet production verification.

## Next P0

Implement the injected adapters against the canonical Worker artifact and Backend lease/heartbeat contract. Before claiming production readiness, run the staging procedure with real Blender, safe `.blend`, `--disable-autoexec`, B2 sandbox checkpoint, timeout/retry and cleanup on a physical Windows node.
