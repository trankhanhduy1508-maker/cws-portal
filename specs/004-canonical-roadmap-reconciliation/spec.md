# Spec 004 — Canonical Roadmap Reconciliation

## Reality
CWS currently has multiple roadmap/version files and overlapping source-of-truth instructions. `AGENTS.md` still elevates `CWS_ROADMAP_MVP_V1.md`, while newer production behavior is described in V2.4, `CWS_MVP_WORKFLOW_FINAL.md`, `DECISIONS.md`, and runtime evidence. `CURRENT_STATUS.md` contains historical snapshots instead of only current state.

## Diagnosis
The repository has source-of-truth fragmentation. Later agents can legitimately read an older roadmap first and follow superseded workflow or status text.

## Root Cause
Versioned roadmap files were accumulated without a single canonical replacement contract and without removing old roadmap authority from agent instructions.

## One Current Bottleneck
Documentation ambiguity can send Codex toward obsolete product behavior before any implementation begins.

## Owner Decisions — 2026-08-10
1. Merge roadmap-related direction into one new canonical roadmap and remove obsolete roadmap material.
2. Customer approval before payment is incorrect and must not exist in the canonical workflow.
3. `CURRENT_STATUS.md` must contain only current status.
4. `PROJECT_CONTEXT.md` must reflect the current CWS product and architecture.
5. Canonical customer input order is: `Google Login -> Upload/Drive -> materialize/validate -> create Job`.
6. Pricing retains the `2.5x` customer multiplier. Do not invent a new base rate in this reconciliation.

## Requirements
- Create one canonical `CWS_ROADMAP.md` for current product scope, production E2E, architecture direction, scale gates, and current milestone ordering.
- Remove roadmap authority from obsolete versioned roadmap files.
- Update `AGENTS.md` and constitution source-of-truth references to use `CWS_ROADMAP.md`.
- Correct `CWS_MVP_WORKFLOW_FINAL.md` to the Owner-approved input/job order.
- Keep render-before-payment and no customer-approval gate.
- Keep runtime pricing multiplier at 2.5x; base cost/rate remains configuration/decision-driven and must not be newly hard-coded here.
- Rewrite `CURRENT_STATUS.md` as a short present-state entry point only.
- Rewrite `PROJECT_CONTEXT.md` to match the current CWS architecture and workflow.
- Update `DECISIONS.md` with the canonical roadmap and input-order decision.
- Preserve historical evidence under `reports/` and git history; do not rewrite evidence reports to pretend history did not happen.
- No application/runtime code changes.

## Non-goals
- No Worker, backend, frontend, database, payment, deployment, or infrastructure implementation.
- No new Vercel/Render/Supabase/B2 resource.
- No change to 2.5x multiplier.
- No production E2E claim.

## Success Evidence
- Repository source-of-truth documents point to one roadmap.
- Old roadmap files no longer compete as active instructions.
- Current workflow contains `Google Login -> Upload/Drive -> materialize/validate -> create Job`.
- `CURRENT_STATUS.md` is short and contains only current phase/task/next/last verified/last updated.
- Cross-document search shows no active instruction requiring customer approval before payment.
