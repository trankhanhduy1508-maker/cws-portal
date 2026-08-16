# CWS Stable Change Discipline Design

Date: 2026-08-16
Status: Founder-approved design, pending governance implementation
Scope: AI-assisted engineering behavior in AGENTS.md

## Purpose

Prevent AI/Codex from breaking known-good CWS behavior through unnecessary refactors, aesthetic rewrites, opportunistic cleanup, or broad changes while performing a narrow task.

## Design

Add a mandatory Stable Change Discipline to AGENTS.md based on mature engineering practices adapted for CWS.

### Core rule

If current behavior is verified and the current task does not require changing it, do not change it.

### Required behavior

1. Stable behavior first. Treat verified working behavior as an asset, not an invitation to rewrite.
2. Minimum change surface. Modify only the smallest boundary required by the grounded task/root cause.
3. Data is not code. Per-job/customer/runtime data changes must not require source-code edits when a stable data/config/job interface can represent them.
4. No opportunistic refactor. Do not combine a functional fix with unrelated cleanup, renaming, formatting, dependency replacement, architecture changes, or modernization.
5. Verified reason before refactor/migration. Refactor only to solve a demonstrated defect, measured constraint, material security/reliability risk, or proven maintainability problem.
6. Preserve known-good behavior with regression verification. If a stable path must change, rerun the relevant previously verified behaviors before promoting PASS.
7. Risk-based rollout. Prefer harmless/local/controlled verification before broader runtime or production exposure.
8. Rollback before risky rollout. For material changes, identify a safe known-good rollback/recovery path before increasing exposure.
9. Observe before concluding. Logs, exit status, outputs, tests, runtime evidence, and other direct observations outrank AI confidence or aesthetic preference.
10. Avoid speculative architecture. Do not add services, brokers, abstractions, frameworks, or migrations for unmeasured future problems.
11. Preserve compatibility during migration where practical. Change internal implementation without unnecessarily breaking stable consumers/contracts.
12. AI task scope is a contract. A narrow task is not permission to beautify or restructure unrelated code.

## Compact execution heuristic

STABLE FIRST -> CHANGE MINIMUM -> VERIFY REALITY -> ROLLOUT GRADUALLY -> OBSERVE -> EXPAND ONLY WHEN PROVEN

Combined with existing tool-first governance:

EXISTING TOOL FIRST -> STABLE CODE FIRST -> MINIMUM CHANGE -> VERIFY REGRESSION -> CUSTOM/REWRITE LAST

## CWS-specific example

If Job 1 is runtime verified and Job 2 differs only by Google Drive URL/job metadata, do not rewrite cws_worker_full.py merely to process Job 2. Prefer a stable job-data/config/API boundary. Worker code changes require an actual Worker defect/capability reason.

## Non-goals

- This rule does not freeze defective or unsafe code forever.
- It does not block a necessary refactor when evidence demonstrates the need.
- It does not weaken security, tests, Founder approval boundaries, grounding, or Spec Kit requirements.
- It does not redefine CWS workflow or architecture.

## Placement

Add the mandatory rule to AGENTS.md near Core engineering rules or before it, so every AI/Codex session recovering AGENTS.md sees it as general engineering governance.

No product workflow, runtime architecture, payment, authentication, storage, security boundary, or infrastructure behavior is changed by this governance update.
