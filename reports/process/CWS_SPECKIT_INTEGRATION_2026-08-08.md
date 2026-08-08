# CWS GitHub Spec Kit Integration Evidence — 2026-08-08

## Result

**IMPLEMENTED / VERIFIED**. This report records the audit and implementation
of the repository execution framework. It is not production Golden E2E
evidence and does not claim a runtime workflow PASS.

## Scope

Integrated GitHub Spec Kit into the existing `cws-portal` repository only. No
Vercel, Render, Supabase, B2, payment, Worker, or repository project was
created. No application runtime file was changed by this integration.

## Source Audit

Read before implementation:

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `CURRENT_STATUS.md`
- `DECISIONS.md`
- `CWS_ROADMAP_MVP_V1.md`
- `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`
- `CWS_MVP_WORKFLOW_FINAL.md`
- `CWS_DATABASE_SCHEMA.md`
- `CWS_SCALABILITY_RULES.md`
- `CODEX_GLOBAL_RULES.md`
- relevant frontend/backend/Worker structure and existing reports

Before this work the repository had no `.specify/`, `specs/`, Spec Kit
constitution, Spec Kit scripts, or Codex Spec Kit skills. The older
`AGENTS.md` references `CODEX_CONSTITUTION.md` and
`reports/CODEX_X_CHECKLIST.md`, but those files are absent in this checkout;
they were not invented or recreated as duplicate sources.

## Integration Map

| Area | Evidence | State |
|---|---|---|
| Constitution | `.specify/memory/constitution.md` | IMPLEMENTED |
| Codex skills | `.agents/skills/speckit-*/SKILL.md` | IMPLEMENTED |
| Templates/scripts | `.specify/templates/`, `.specify/scripts/` | IMPLEMENTED |
| Workflow metadata | `.specify/workflows/speckit/`, `.specify/integration*.json` | IMPLEMENTED |
| Feature trace | `specs/001-spec-kit-integration/` | IMPLEMENTED |
| Session discovery | `AGENTS.md` mandatory workflow section | IMPLEMENTED |
| CWS source sync | `CURRENT_STATUS.md`, `DECISIONS.md`, V2.4 roadmap | IMPLEMENTED |

## Analyze Result

Read-only cross-check found and resolved the following before verification:

- Missing constitution: resolved by replacing the official template with the
  CWS constitution.
- Missing future-session rule: resolved in `AGENTS.md`.
- Risk of duplicate source of truth: resolved by an explicit boundary in the
  constitution, spec, plan, and decision.
- Risk of incomplete workflow: resolved by requiring Clarify, Analyze, and
  Converge/Verify, not only Specify/Plan/Tasks.
- Risk of fake production completion: preserved the existing real-E2E and
  evidence gates; this docs-only change makes no runtime claim.
- Risk of scope expansion: plan and constitution prohibit new infrastructure
  and runtime refactoring for this integration.

## Verification Evidence

Commands and results are appended below as they run:

```text
specify version: PASS (0.16.1)
specify check: PASS (Specify CLI ready; Codex CLI available)
specify integration list: PASS (codex installed/default)
check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks: PASS
  FEATURE_DIR=specs/001-spec-kit-integration
  AVAILABLE_DOCS=[tasks.md]
active artifact existence/placeholder validation: PASS
npm run lint: PASS (oxlint)
npm run build: PASS (Vite production build; existing chunk-size warning only)
git diff --cached --check: PASS (focused staged files)
Spec Kit Converge/Verify: PASS (all baseline tasks/requirements covered;
  no runtime code convergence work required)
```

Application backend tests and production Golden E2E were not rerun for this
docs-only governance change. The current production Golden E2E state remains
the separate external authentication blocker recorded at the top of
`CURRENT_STATUS.md`; this integration does not fabricate or alter that state.

## Focused Commit Boundary

Only the Spec Kit integration files, CWS agent rules, synchronized status /
decision / roadmap entries, baseline artifacts, and this report are in the
focused commit. Pre-existing modified files under `backend/src/` remain
unstaged and untouched by this change.

## Rollback

Revert the focused Spec Kit governance commit. This removes only repository
rules/artifacts and has no production resource migration to undo.

## References

- Official project: https://github.com/github/spec-kit
- Official workflow reference: https://github.github.com/spec-kit/reference/agentic-sdd.html
