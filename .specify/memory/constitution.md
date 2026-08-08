<!--
Sync Impact Report
- Version: template -> 1.0.0
- Added: CWS source-of-truth hierarchy, evidence gates, production E2E, AI-off
  operation, scalable worker identity, security/isolation/idempotency,
  simplicity, rollback/failure handling, documentation sync, and mandatory
  Spec Kit workflow.
- Removed: Spec Kit template placeholders.
- Compatibility: This constitution is an execution framework above the
  existing CWS documents; it does not replace or duplicate their authority.
-->

# CWS Constitution

This constitution governs every CWS change made by Codex or another coding
agent. It is an execution framework above the existing CWS product, workflow,
architecture, database, roadmap, decision, and evidence documents.

## Core Principles

### I. Documents Before Code

Agents MUST read the applicable CWS source of truth before changing code or
production configuration. At minimum, the task entry path is `AGENTS.md`,
`PROJECT_CONTEXT.md`, `CURRENT_STATUS.md`, `DECISIONS.md`, the current roadmap,
the relevant workflow/architecture documents, and the relevant code/tests.
The repository, deployed configuration evidence, and runtime evidence are
authoritative over guesses or stale chat context. When documents conflict,
follow the hierarchy recorded in `AGENTS.md` and the more recent explicit
decision; reconcile the documents before implementation continues.

### II. Specify Before Implementation

Every CWS change, including product ideas, feature work, workflow-affecting
bug fixes, architecture, database, Worker, payment, storage, security, UI,
deployment, automation, and roadmap changes MUST pass through this workflow:

`Constitution -> Specify -> Clarify (when needed) -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

Spec Kit artifacts MUST reference the existing CWS source of truth and MUST
not become a conflicting second product specification. An idea is an input to
analysis, not an accepted requirement: agents MUST record its goal,
assumptions, risks, alternatives, and system impact before committing to a
specification. Clarification questions are limited to decisions that cannot
be answered from the repository or existing principles.

### III. Evidence Over Assumption

Agents MUST NOT infer technical state from intent, a green build, a heartbeat,
a deployment-ready label, a unit test mock, or historical data. Agents MUST
not report DONE without the tests, runtime evidence, and source-of-truth sync
required by the applicable CWS definition of done. Production E2E claims MUST
use real customer-owned input, durable IDs, real progress, real Blender/B2
artifacts, real payment matching, and a traceable evidence report. Mock,
demo, fake progress, fake payment, edited database state, and reused
historical jobs are not acceptance evidence.

### IV. Production Must Operate Without AI

Normal CWS runtime transitions MUST be deterministic and autonomous when
Codex, ChatGPT, or any other AI is offline. This includes scheduling, Worker
claim/heartbeat, rendering, progress, retries, storage, payment matching,
delivery, cleanup, and recovery. AI may inspect, implement, and verify the
system but MUST NOT be a runtime dependency or a normal state-transition
operator.

### V. Secure Boundaries and Auditable State

Every change MUST consider authentication, authorization, isolation,
idempotency, replay/fencing, secret scope, auditability, and failure handling.
Untrusted customer input MUST be isolated and validated before execution;
Workers MUST receive only the narrow capabilities needed for their current
assignment; broad storage credentials, service-role credentials, and secrets
MUST remain server-side. Payment and delivery state MUST fail closed, be
idempotent, and be auditable. Customer originals MUST remain immutable.

### VI. Scale by Design, MVP First

Agents MUST choose the smallest solution that completes the MVP without
creating a scale-dead-end. Normal fleet growth MUST NOT require manual
per-Worker database edits, long-lived storage keys, service configuration
copied by hand, or AI intervention. Workers use stable, system-managed
identities and job-scoped capabilities. Agents MUST consider the 100, 1,000,
and 1,000,000-Worker operating model for architecture changes, but MUST NOT
add brokers, services, projects, or complexity without measured need.

### VII. Existing Infrastructure Only

Agents MUST use the canonical CWS Vercel, Render, Supabase, Backblaze B2,
GitHub, Worker, and payment resources already documented in the repository.
Agents MUST NOT create a new repository, Vercel project, Render service,
Supabase project, B2 bucket, payment project, or parallel infrastructure
unless the Project Owner explicitly approves that exact creation.

### VIII. Verification, Rollback, and Failure Handling

After implementation, agents MUST run the tests and checks appropriate to the
change, run real production E2E when the production workflow is affected, and
run Spec Kit analysis/convergence verification. If implementation does not
match the artifacts, the agent MUST continue correcting it or report a true
external blocker with concrete request/response/config evidence. Production
changes MUST have a bounded rollback, fail-closed behavior, or an explicit
recovery path appropriate to their risk before deployment.

### IX. Source-of-Truth Synchronization

Completed work MUST update `CURRENT_STATUS.md`, `DECISIONS.md` when a decision
changes, the current roadmap, and the relevant workflow/API/architecture
documents, plus evidence under `reports/`. Spec Kit artifacts record intent
and execution traceability; they do not replace those CWS documents. All
changes MUST be committed with a focused conventional commit, and pushed when
the task includes deployment or repository publication.

## CWS Source-of-Truth Boundary

The existing CWS documents remain authoritative for their domains:

- product scope and status: `CWS_ROADMAP_MVP_V1.md`, `CURRENT_STATUS.md`;
- customer business workflow: `CWS_MVP_WORKFLOW_FINAL.md`;
- data model: `CWS_DATABASE_SCHEMA.md` and applied migrations;
- architecture and scale: `CWS_SYSTEM_ARCHITECTURE_V1.md`,
  `CWS_SCALABILITY_RULES.md`, and the current roadmap;
- decisions: `DECISIONS.md`;
- agent operation: `AGENTS.md` and `CODEX_GLOBAL_RULES.md`;
- runtime proof: the relevant evidence report under `reports/`.

The current CWS V2.4 render-before-payment order remains binding:

`render -> validate -> full B2 output locked -> watermark previews -> final price + QR -> SePay -> PAID -> authorized download`.

## Mandatory Workflow Gates

1. **Constitution** — load this constitution and reconcile any governing
   principle change explicitly.
2. **Specify** — capture user value, scope, stories, requirements, success
   criteria, assumptions, edge cases, and references to CWS source of truth.
3. **Clarify** — ask only unresolved decisions that materially change scope,
   security, UX, or architecture; otherwise record a repository-backed
   assumption.
4. **Plan** — choose the minimum compatible architecture and identify data,
   contracts, files, tests, deployment, rollback, and evidence.
5. **Tasks** — create ordered, traceable, testable tasks with file paths and
   requirement/story coverage.
6. **Analyze** — read-only cross-check for missing requirements,
   contradictions, uncovered tasks, architecture/security/scale conflicts,
   fake paths, and regression risk.
7. **Implement** — change only the approved scope and keep artifacts in sync.
8. **Converge/Verify** — run tests, production checks where applicable, and
   assess code against spec/plan/tasks; continue until converged or document a
   true external blocker.

## Governance

This constitution is normative for all CWS agents. `AGENTS.md`, current CWS
workflow/architecture decisions, and explicit Owner decisions remain the
domain-specific source of truth; a conflict MUST be surfaced and resolved,
not silently overridden. Amendments require a dated Sync Impact Report,
semantic version increment, review of dependent Spec Kit templates, and
updates to any affected CWS rules/docs. A constitution amendment does not
authorize feature implementation by itself; the affected change still needs
the full workflow above.

**Version**: 1.0.0 | **Ratified**: 2026-08-08 | **Last Amended**: 2026-08-08
