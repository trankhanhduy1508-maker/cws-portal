# Plan: Production-Grade Node Engine and Render Worker

## Architecture decision

Keep the existing two-boundary architecture and refactor by responsibility,
not by creating a parallel runtime:

```text
Node Engine: config -> identity -> capabilities/readiness -> presence ->
state machine -> supervisor -> diagnostics/cleanup

Worker Engine: assignment/claim adapter -> input/download -> archive safety ->
Blender preflight -> safe prepare -> render -> validate -> checkpoint/upload ->
report -> cleanup
```

The current large modules remain compatibility entrypoints while new modules
are introduced only where an existing responsibility is independently testable.
No module may own backend lifecycle truth outside its existing contract.

## Implementation order

1. Fix repository encoding/collection hygiene without changing runtime behavior.
2. Introduce typed configuration/readiness and sanitized structured diagnostics.
3. Extract identity, capability discovery and state transition policy from the
   Node Agent while preserving current RPC/state names.
4. Extract Worker input/archive, Blender preflight/optimization, render,
   validation, reporting and cleanup adapters without changing JobSpec or
   lease/fencing ownership.
5. Add deterministic failure-injection tests for crash, retry, stale lease,
   duplicate process and cleanup recovery.
6. Verify on Windows with a harmless fixture; only then attempt production
   heartbeat/claim using an explicitly enrolled host identity.

## Safety gates

- Do not run production claim from a machine lacking valid identity/credential
  configuration.
- Do not execute the legacy `cws_worker.bat` path.
- Do not run customer `.blend` content outside the existing disabled-autoexec
  and workspace safety contract.
- Do not add hard-coded credentials; the legacy file containing embedded B2
  material is excluded from runtime and requires separate secret rotation work.
- Do not update Supabase rows manually to create readiness evidence.

## Rollback

Each extraction keeps the current entrypoint and can be reverted as one logical
commit. Runtime behavior changes require a separate commit from mechanical
module extraction. Production deployment is not part of the implementation
until CODE and Windows runtime gates pass.
