# Plan 004 — Canonical Roadmap Reconciliation

## Approach
1. Introduce `CWS_ROADMAP.md` as the only canonical roadmap.
2. Fold current V2.4 production flow, current architecture boundaries, and scale direction into that roadmap without carrying obsolete milestone history.
3. Update source-of-truth hierarchy in `AGENTS.md` and `.specify/memory/constitution.md`.
4. Correct `CWS_MVP_WORKFLOW_FINAL.md` input/job ordering.
5. Reduce `CURRENT_STATUS.md` to current state only.
6. Refresh `PROJECT_CONTEXT.md` to current product/architecture.
7. Record Owner decisions in `DECISIONS.md`.
8. Remove obsolete roadmap files after their still-valid direction has been folded into `CWS_ROADMAP.md`.
9. Add a documentation learning-log entry under `reports/process/`.

## Files
- create: `CWS_ROADMAP.md`
- update: `AGENTS.md`
- update: `.specify/memory/constitution.md`
- update: `CWS_MVP_WORKFLOW_FINAL.md`
- update: `CURRENT_STATUS.md`
- update: `PROJECT_CONTEXT.md`
- update: `DECISIONS.md`
- delete after reconciliation: `CWS_ROADMAP_MVP_V1.md`, `CWS_PRODUCTION_E2E_ROADMAP_V2_2.md`, `CWS_PRODUCTION_E2E_ROADMAP_V2_3.md`, `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`
- retain: `CWS_SCALING_ROADMAP.md` only as a specialist supporting document, subordinate to `CWS_ROADMAP.md`
- create: `reports/process/CWS_CANONICAL_ROADMAP_RECONCILIATION_2026-08-10.md`

## Safety
- Documentation-only branch.
- No runtime/config changes.
- Git history retains deleted roadmap versions.
- Historical evidence remains unchanged.

## Verification
- Search for old roadmap filenames in active governance docs.
- Search for `approve`/`approval` payment-gate wording.
- Search source-of-truth references.
- Compare branch to main before merge.
