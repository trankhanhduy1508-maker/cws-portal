# Implementation Plan: Mandatory GitHub Spec Kit Governance for CWS

**Branch**: `001-spec-kit-integration` | **Date**: 2026-08-08 | **Spec**:
[spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-spec-kit-integration/spec.md`

## Summary

Integrate the official GitHub Spec Kit Codex workflow into the existing CWS
repository, ratify a CWS constitution above the current documents, and make
`AGENTS.md` enforce the sequence for future work. This is a documentation and
agent-execution integration only: it does not refactor CWS runtime code or
create infrastructure.

## Technical Context

**Language/Version**: Markdown, PowerShell scripts supplied by Spec Kit; no
application language change

**Primary Dependencies**: GitHub Spec Kit 0.16.1 templates/scripts and Codex
skill integration; existing CWS toolchain remains unchanged

**Storage**: Repository files only; no database or bucket change

**Testing**: Spec Kit prerequisite script, artifact/placeholder validation,
`git diff --check`, and existing frontend lint/build smoke checks

**Target Platform**: Existing Windows Codex repository workflow and future
Codex sessions

**Project Type**: Existing web application plus Python Worker; this change is
repository governance

**Performance Goals**: No runtime performance impact; workflow lookup and
artifact discovery are deterministic

**Constraints**: No new project/service/resource, no secret, no runtime AI
dependency, preserve CWS document authority, preserve unrelated worktree edits

**Scale/Scope**: Applies to all future CWS changes; baseline integration only

## Constitution Check

All gates pass:

- Documents Before Code: the required CWS source order and relevant workflow,
  schema, architecture, roadmap, status, decisions, code, and evidence were
  read before creating artifacts.
- Specify Before Implementation: this spec, plan, tasks, analysis, and
  convergence checks govern the integration.
- Evidence/production/AI/security/scale rules: retained in the constitution;
  this change has no runtime path and does not weaken them.
- Existing Infrastructure Only: no external project, service, bucket, or
  deployment resource is created.
- Verification and rollback: repository checks are defined; reverting the
  focused commit removes the integration without a production migration.

## Project Structure

### Documentation (this feature)

```text
specs/001-spec-kit-integration/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/requirements.md
```

### Repository integration

```text
.specify/
├── memory/constitution.md
├── templates/
├── scripts/powershell/
├── workflows/speckit/
└── integration*.json

.agents/skills/speckit-*/SKILL.md
AGENTS.md
CURRENT_STATUS.md
DECISIONS.md
CWS_PRODUCTION_E2E_ROADMAP_V2_4.md
reports/process/CWS_SPECKIT_INTEGRATION_2026-08-08.md
```

Existing application paths (`src/`, `backend/`, `worker/`) are intentionally
unchanged.

**Structure Decision**: Use the official Spec Kit repository layout in the
existing repository. Keep CWS documents at their current paths and add only
the minimum governance artifacts and rules needed for discoverability,
traceability, validation, and future execution.

## Implementation Phases

1. Audit the source-of-truth documents and confirm Spec Kit was absent.
2. Initialize the official Codex integration and replace only the constitution
   template with the CWS constitution.
3. Add the mandatory workflow rule to `AGENTS.md` and synchronize status,
   decisions, roadmap, and process evidence.
4. Validate artifact discovery, placeholders, document integrity, and existing
   application smoke checks.
5. Run Converge/Verify and commit only the focused integration files.

## Rollback and Failure Handling

Rollback is a revert of the focused governance commit. If validation fails,
the change remains incomplete and must not be reported DONE. If a future
production change is blocked, the required evidence is recorded at the first
broken gate and no state is fabricated.

## Complexity Tracking

No constitution violations. No new runtime component, service, project,
database, bucket, credential, or abstraction is introduced.
