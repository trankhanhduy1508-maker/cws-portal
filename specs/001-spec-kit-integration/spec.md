# Feature Specification: Mandatory GitHub Spec Kit Governance for CWS

**Feature Branch**: `001-spec-kit-integration`

**Created**: 2026-08-08

**Status**: Implemented

**Input**: Founder requirement to make GitHub Spec Kit the mandatory execution
framework for all CWS changes without replacing the existing CWS documents or
creating new infrastructure.

## Source-of-Truth References

This governance change is constrained by and must remain compatible with:

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
- the current frontend, backend, Worker, tests, deployment configuration, and
  runtime evidence under `reports/`

The repository audit found no existing `.specify/`, `specs/`, or Spec Kit
constitution before this integration. The legacy `CODEX_CONSTITUTION.md` and
`reports/CODEX_X_CHECKLIST.md` paths referenced by older `AGENTS.md` text were
also absent; this integration uses the checked-in Spec Kit constitution and
actual evidence files without creating a duplicate legacy source.

## User Scenarios & Testing

### User Story 1 - A new agent follows one governed change path (Priority: P1)

As a Founder or coding agent, I need every CWS change to pass through the same
documented workflow so that implementation does not start from an unverified
chat assumption.

**Why this priority**: This is the control that prevents workflow regressions,
fake production claims, and undocumented architecture changes.

**Independent Test**: In a fresh Codex session, the agent can discover the
checked-in instructions, constitution, templates, and workflow skills and can
identify the required artifact sequence before editing application code.

**Acceptance Scenarios**:

1. **Given** a new CWS request, **when** the agent reads `AGENTS.md`, **then**
   it finds the mandatory Spec Kit sequence and the CWS source-of-truth order.
2. **Given** a change without a spec/plan/tasks set, **when** the agent reaches
   implementation, **then** the repository rules require it to stop and create
   those artifacts first.

### User Story 2 - A change is traceable from requirement to verification (Priority: P1)

As a reviewer, I need a spec, plan, ordered tasks, analysis, implementation
evidence, and convergence result tied to the existing CWS documents.

**Why this priority**: Traceability is necessary for production-impacting
workflow, storage, Worker, Blender, and payment changes.

**Independent Test**: The baseline integration artifacts identify their CWS
references, task-to-requirement coverage, analysis checks, and verification
commands without relying on unstated chat context.

**Acceptance Scenarios**:

1. **Given** the baseline integration, **when** a reviewer opens `spec.md`,
   `plan.md`, and `tasks.md`, **then** the intent, design, ordered work, and
   verification gates are consistent.
2. **Given** an implementation check, **when** the Spec Kit prerequisite and
   repository validation commands run, **then** missing required artifacts fail
   visibly instead of being treated as complete.

### User Story 3 - CWS documents remain the product authority (Priority: P1)

As the Project Owner, I need Spec Kit to organize execution while the existing
CWS roadmap, workflow, decisions, schema, architecture, and runtime evidence
remain authoritative for their domains.

**Why this priority**: A second conflicting specification would increase risk
instead of reducing it.

**Independent Test**: The constitution, rules, plan, and report explicitly
state the source-of-truth boundary and do not introduce a new runtime service,
project, database, bucket, or deployment.

**Acceptance Scenarios**:

1. **Given** a CWS domain decision, **when** Spec Kit artifacts are reviewed,
   **then** they reference the existing CWS decision rather than redefining it.
2. **Given** a production-affecting change, **when** convergence completes,
   **then** `CURRENT_STATUS.md`, the roadmap, `DECISIONS.md` when needed, and
   relevant evidence are synchronized.

## Edge Cases

- If the repository answers a decision, the agent records the answer as an
  assumption instead of asking the Founder again.
- If a material decision is not answerable from the repository, Clarify asks
  only that decision before Plan; it does not use clarification to bypass the
  source audit.
- If code, deployment state, or evidence contradicts the spec, Converge adds
  or reopens work; it must not report DONE.
- If a production dependency is unavailable, the agent records the exact
  request/response/config evidence and classifies the first true external
  blocker without fabricating state.
- If the workflow would require a new project or broad credential, the change
  fails the constitution gate unless the Owner explicitly approves that exact
  resource.

## Requirements

### Functional Requirements

- **FR-001**: The repository MUST contain a checked-in CWS constitution at
  `.specify/memory/constitution.md` with the inherited CWS principles and
  mandatory workflow gates.
- **FR-002**: Repository agent instructions MUST require
  `Constitution -> Specify -> Clarify -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`
  for every CWS change, with Clarify conditional on unresolved decisions.
- **FR-003**: Spec Kit artifacts MUST reference CWS source-of-truth documents
  and MUST state that they do not replace those documents.
- **FR-004**: The Spec Kit integration MUST include the official Codex-facing
  skills, templates, scripts, and workflow metadata in `.agents/` and
  `.specify/`.
- **FR-005**: The workflow MUST require analysis of missing requirements,
  contradictions, task coverage, architecture, security, scalability,
  fake/demo paths, and regression risk before implementation.
- **FR-006**: The workflow MUST require tests/checks, production E2E evidence
  for production workflow changes, convergence, and source-of-truth sync
  before a change can be reported DONE.
- **FR-007**: The integration MUST preserve the current CWS render-before-
  payment order and all existing security, isolation, idempotency, AI-off,
  stable Worker identity, and no-new-infrastructure decisions.
- **FR-008**: The integration MUST add no runtime dependency on AI and MUST
  change no application runtime behavior by itself.
- **FR-009**: The repository MUST retain a focused, auditable baseline
  spec/plan/tasks set proving the framework was applied to this integration.
- **FR-010**: The integration MUST be reversible by reverting its focused
  docs/framework commit; no production resource migration is introduced.

### Key Entities

- **CWS source-of-truth document**: An existing repository document that owns a
  product, workflow, schema, architecture, decision, status, or evidence
  domain.
- **Spec Kit artifact set**: `spec.md`, `plan.md`, `tasks.md`, and analysis /
  convergence evidence for one requested change.
- **Workflow gate**: A required stage that must be completed and evidenced
  before the next stage is allowed.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A fresh agent can locate the constitution, mandatory sequence,
  source-of-truth boundary, and official Codex skills from the repository in
  one documented lookup path.
- **SC-002**: The baseline feature passes Spec Kit prerequisite checks with
  `spec.md`, `plan.md`, and `tasks.md` discoverable from `.specify/feature.json`.
- **SC-003**: Repository validation reports zero unresolved template
  placeholders in the active constitution, baseline spec, plan, or tasks.
- **SC-004**: The integration changes no application runtime code and creates
  no Vercel, Render, Supabase, B2, payment, or repository resource.
- **SC-005**: The committed report identifies the audit inputs, integration
  files, checks run, limitations, and rollback path.

## Assumptions

- The existing CWS documents and deployed resources remain the authority for
  product behavior and production configuration.
- Codex sessions load repository guidance from `AGENTS.md` and can use the
  checked-in `.agents/skills/speckit-*` files.
- Spec Kit is an execution framework only; application implementation remains
  in the existing frontend, backend, Worker, and deployment code.
- The current worktree may contain unrelated user changes; this integration
  must stage and commit only its own files.
