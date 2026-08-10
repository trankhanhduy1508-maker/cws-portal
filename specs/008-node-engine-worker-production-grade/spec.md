# Feature Specification: Production-Grade Node Engine and Render Worker

**Feature**: 008-node-engine-worker-production-grade  
**Status**: Specify/Analyze complete; implementation gated on explicit tasks  
**Scope**: Existing Windows Node Agent + generic Worker Engine only

## Grounding

- Production is backed by `trankhanhduy1508-maker/cws-portal`, commit
  `67b9369b015e7806da072128501cbb35e231c5b8`.
- The small files are launchers/manifests: `worker/node-agent-production.bat`
  (224 bytes) and root `worker-engine.bat` (152 bytes).
- The actual implementations are `worker/production_node_agent.py`
  (39,561 bytes), `worker/node_agent.py` (9,069 bytes), and
  `worker/worker_engine.py` (40,102 bytes).
- Existing worker docs explicitly designate the generic engine as canonical and
  the legacy `cws_worker_full.py` path as non-runtime.
- Existing tests: 89 tests discovered; collection currently fails on
  `worker/test_worker_rpc_auth.py` because the checked-out file contains a
  non-UTF-8 byte without a Python encoding declaration.
- Production Supabase evidence currently shows all known workers offline; no
  fresh heartbeat or real claim is proven.

## Root cause

The apparent “1 KB engine” is a launcher-vs-implementation misunderstanding.
The actionable technical debt is that the real implementation is concentrated
in large modules and several production capabilities are only CODE/STAGING
VERIFIED: Windows service/session boundary, hardware discovery, update/rollback,
production identity enrollment, B2 capability path, and live heartbeat/claim.

Why chain:

1. Why does the component look empty? The desktop entrypoint is only a wrapper.
2. Why is that confusing? Naming and folder layout do not expose the module
   boundary or runtime contract clearly.
3. Why is production still offline? The agent requires explicit identity,
   credential store, backend configuration, Blender and a valid Windows runtime;
   none is installed/configured on this machine.
4. Why is this not caught earlier? Tests and staging evidence are not connected
   to a production readiness gate with required evidence fields.
5. Root cause: runtime contracts, readiness/configuration, and verification are
   distributed across code/docs/scripts without one fail-closed production
   readiness boundary.

## Clarifications resolved from canonical docs

- Preserve externally visible backend states `ACTIVE_IDLE`, `PREPARING`,
  `RENDERING`, `RECOVERY`, and `CLEANUP`. `IDLE_SAVER` is an internal
  conceptual label only; no Sleep/Hibernate/power API is introduced.
- Backend/Postgres remains the authority for claim, lease, generation, retry,
  payment and lifecycle truth.
- Node Engine supervises one generic Worker attempt; it does not bill, unlock,
  or execute arbitrary commands.
- No new service, broker, project, database, bucket or provider is introduced.
- AI is not a runtime dependency.

## Functional requirements

1. Node Engine must have explicit modules/contracts for config, stable identity,
   host capabilities/readiness, authenticated presence, state transitions,
   supervision, bounded restart/backoff, structured diagnostics and cleanup.
2. Worker Engine must have explicit modules/contracts for JobSpec validation,
   download, safe ZIP/RAR extraction, Blender preflight, conservative working
   copy optimization, real Blender CLI execution, output validation,
   task-scoped checkpoint/upload, reporting, error taxonomy and cleanup.
3. No secret may be hard-coded, logged, or placed in customer/job artifacts.
4. No production state may be asserted from local/unit/simulation evidence.
5. Duplicate worker instances, stale generations, path traversal, unsafe
   archives, incomplete output and invalid capabilities must fail closed.
6. Readiness must be explicit and include backend reachability, identity,
   credential validity, workspace/disk, Blender usability and declared
   capability data.

## Non-goals

- Rewriting the backend scheduler or payment flow.
- Adding power-management behavior.
- Reusing the legacy `cws_worker_full.py` runtime.
- Making a production claim without a real Windows host and current Supabase/
  Render evidence.
- Broad refactoring unrelated to the first verified E2E bottleneck.

## Verification levels

- CODE VERIFIED: imports, unit/contract tests and static safety checks.
- WINDOWS RUNTIME VERIFIED: real service/process, Blender and cleanup on this
  host without production mutation.
- PRODUCTION RUNTIME VERIFIED: authenticated fresh heartbeat, real claim,
  render/output/B2 artifacts and backend evidence.
- GOLDEN E2E VERIFIED: payment match and authorized download after real payment.

## Acceptance criteria

- Launcher files remain thin and point to documented canonical modules.
- Node Engine state transitions are explicit, guarded, observable and return to
  `ACTIVE_IDLE` after cleanup.
- Worker runs only a validated, fenced JobSpec and reports deterministic error
  categories with retryability and stage.
- ZIP/RAR extraction, Blender preflight, safe optimization and output checks
  have tests covering hostile/invalid cases.
- A production readiness report can prove every required local and production
  field without manual SQL state edits.
- Existing production architecture and external state are not changed by unit
  or local tests.
