# Tasks: Worker Resilience Hardening

**Input**: `specs/003-worker-resilience-hardening/spec.md` and `plan.md`

## Phase 1: Analyze gate

- [x] T001 Read the ordered CWS source-of-truth documents and current worker/backend/test tree.
- [x] T002 Research official OmniRoute patterns and document the production boundary rejection.
- [x] T003 Produce `reports/process/CWS_WORKER_RESILIENCE_ANALYZE_2026-08-08.md` answering the ten required audit questions with file/function/test evidence.
- [x] T004 Record that no Founder clarification is required because current docs define the architecture and retry boundary.

## Phase 2: Foundational policy

- [x] T005 [P] Add `worker/resilience_policy.py` with taxonomy, disposition and bounded exponential deterministic-jitter helpers.
- [x] T006 [P] Add focused tests for taxonomy/disposition/backoff and preserve existing `NodeAgent` timing behavior.
- [x] T007 Add additive `worker_migrations/027_worker_resilience_policy.sql` for fenced failure reporting, incident/health thresholds and probe transitions with service-role-only execution.
- [x] T008 Extend the authenticated Backend Worker RPC allowlist/validation for failure taxonomy and probe operations.

## Phase 3: Worker failure handling (P1)

- [x] T009 [US1] Attach taxonomy to `WorkerEngineError` and observable download/preflight/render/storage/security failures without changing render quality.
- [x] T010 [US1] Route production failure reporting through the fenced backend contract; keep `max_retries=0` as Worker-attempt policy and backend as task retry authority.
- [x] T011 [US1] Add backend and Worker tests proving customer/transient/capability failures do not poison Worker health and security fails closed.

## Phase 4: Probing and recovery (P1)

- [x] T012 [US2] Add authenticated lightweight probe lifecycle to `ProductionRpcAdapter` and production Node Agent startup/recovery paths.
- [x] T013 [US2] Add probe contract tests for `PROBING -> OK`, probe failure, security quarantine and claim exclusion.

## Phase 5: Herd resistance and verification (P1)

- [x] T014 [US3] Reuse shared backoff in poll/operation retry paths and ensure deterministic startup/reconnect jitter remains bounded.
- [x] T015 [US3] Run 10/25/50/100 Worker targeted simulations for startup, claims, outages, crashes, stale generations, probing recovery and simultaneous failures.
- [x] T016 Run existing backend, Worker, claim, fencing, storage and build suites; run Spec Kit checklist/converge verification.

## Phase 6: Documentation and delivery

- [x] T017 Update `CURRENT_STATUS.md`, `CWS_ROADMAP_MVP_V1.md`, `CWS_WORKER_ROADMAP.md`, `DECISIONS.md` if the additive contract is an architecture decision, and the active V2.4 roadmap.
- [x] T018 Write evidence under `reports/` distinguishing CODE VERIFIED, SIMULATION VERIFIED and PRODUCTION RUNTIME VERIFIED.
- [x] T019 Commit only the focused change (preserving unrelated dirty worktree files), push `main`, and record the commit SHA (`b68aa08`).

## Dependencies

T005-T008 are prerequisites for T009-T014. T015-T16 require implementation.
T017-T19 require verified results and must not claim production runtime PASS
from simulation alone.
