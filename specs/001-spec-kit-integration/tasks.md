---
description: "Completed task list for mandatory CWS GitHub Spec Kit governance"
---

# Tasks: Mandatory GitHub Spec Kit Governance for CWS

**Input**: Design documents from `/specs/001-spec-kit-integration/`

**Prerequisites**: `spec.md`, `plan.md`, CWS source-of-truth documents, and
the current repository structure.

**Tests**: Repository/document validation and existing application smoke checks
are required because this change affects agent execution and release hygiene,
but it does not change application runtime code.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Source Audit and Setup

- [x] T001 [P] [US1] Read the CWS source-of-truth order in `AGENTS.md`, then
  read `PROJECT_CONTEXT.md`, `CURRENT_STATUS.md`, `DECISIONS.md`, the active
  roadmap, workflow/architecture/schema documents, code structure, and reports.
- [x] T002 [P] [US1] Check for existing Spec Kit directories, constitution,
  templates, scripts, skills, and feature artifacts before initialization.
- [x] T003 [US1] Initialize official Spec Kit Codex integration in the current
  repository with `.specify/` and `.agents/skills/speckit-*`.

## Phase 2: Constitution and Repository Rules

- [x] T004 [US1] Replace the Spec Kit constitution template with the CWS
  constitution in `.specify/memory/constitution.md` and remove all template
  placeholders.
- [x] T005 [US1] Add the mandatory workflow, source boundary, clarification
  rule, analysis gate, and convergence rule to `AGENTS.md`.
- [x] T006 [US3] Preserve the existing CWS source-of-truth hierarchy and
  explicitly prohibit new infrastructure, runtime AI dependency, and duplicate
  legacy source files.

## Phase 3: Traceability Artifacts

- [x] T007 [US2] Create the baseline requirement specification in
  `specs/001-spec-kit-integration/spec.md` with stories, requirements,
  assumptions, risks/edge cases, and measurable outcomes.
- [x] T008 [US2] Create `specs/001-spec-kit-integration/plan.md` with
  constitution gates, repository structure, implementation phases, and rollback.
- [x] T009 [US2] Create `specs/001-spec-kit-integration/tasks.md` with ordered,
  path-specific tasks and requirement/story traceability.
- [x] T010 [US2] Create the generated requirements checklist at
  `specs/001-spec-kit-integration/checklists/requirements.md`.

## Phase 4: Source-of-Truth Synchronization

- [x] T011 [US3] Record the mandatory Spec Kit governance decision in
  `DECISIONS.md` without changing product/runtime decisions.
- [x] T012 [US3] Add the integration state and non-runtime scope to
  `CURRENT_STATUS.md` and the active V2.4 roadmap.
- [x] T013 [US2] Record audit inputs, generated integration files, checks,
  limitations, and rollback in `reports/process/CWS_SPECKIT_INTEGRATION_2026-08-08.md`.

## Phase 5: Analyze, Implement, and Converge/Verify

- [x] T014 [US2] Run a read-only Analyze cross-check for missing requirements,
  contradictions, task coverage, architecture/security/scale conflicts,
  fake/demo paths, and regression risk; record results in the process report.
- [x] T015 [US1] Run Spec Kit prerequisite/discovery checks and verify the
  constitution and baseline artifacts contain no unresolved placeholders.
- [x] T016 [US3] Run `git diff --check` and existing frontend lint/build smoke
  checks without staging unrelated user changes.
- [x] T017 [US2] Run Converge/Verify, confirm all baseline tasks and requirements
  are covered, and commit only this focused governance integration.

## Dependencies and Execution Order

- Phase 1 precedes every other phase.
- Phase 2 precedes artifact authoring and implementation.
- Phase 3 precedes Analyze and Converge.
- Phase 4 is required before the change can be reported complete.
- Phase 5 is the final gate; a failed check leaves the integration incomplete.

## Completion Strategy

This baseline is complete only when the checked-in artifacts are discoverable,
the repository rules are visible to future Codex sessions, all validation
commands pass, and the focused commit contains no unrelated application edits.
