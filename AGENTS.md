# CWS AGENTS

> Version: 3.1 — mandatory staleness guard 2026-08-10.

## Model Policy
Before selecting/delegating a model, read `MODEL_POLICY.md`. It is the model-routing source of truth.

## Source of Truth — mandatory read order
1. `CURRENT_STATUS.md` — current phase, current task, next verified bottleneck.
2. `CWS_STALENESS_GUARD.md` — **mandatory semantic-drift check before trusting roadmap or other governing prose**.
3. `CWS_ROADMAP.md` — **single canonical roadmap** for product/production direction and milestone status.
4. `CWS_MVP_WORKFLOW_FINAL.md` — customer business workflow.
5. `DECISIONS.md` — active product/architecture/security/payment decisions.
6. `PROJECT_CONTEXT.md` — compact current product/architecture context.
7. `CWS_DATABASE_SCHEMA.md` + applied migrations — data model/runtime schema truth.
8. `.specify/memory/constitution.md` — governing execution principles.
9. `CWS_EXECUTION_FUNNEL.md` — Reality/Diagnosis/Root Cause/One Bottleneck gate.
10. Relevant architecture/scale docs, code, tests and current evidence under `reports/`.

### Staleness gate — mandatory
Before using any roadmap/workflow/decision/context/architecture instruction for implementation, apply `CWS_STALENESS_GUARD.md`.

If a material instruction appears obsolete because of newer Owner decisions, code/schema/runtime evidence, or another active source of truth:
- do not silently follow the old instruction;
- issue the standard `STALE-DOC ALERT`;
- if the conflict affects the current task, stop implementation that depends on it until reconciled or Founder-confirmed;
- if unrelated to the current task, report it as non-blocking and continue only unrelated safe work.

File age alone is not proof that a document is stale.

### Conflict rules
- Current real runtime/code/schema evidence overrides assumptions and stale historical prose.
- More recent explicit Owner decision overrides older conflicting decisions.
- `CWS_ROADMAP.md` is the only active roadmap; versioned roadmap files are historical and must not be recreated as competing sources.
- `CWS_MVP_WORKFLOW_FINAL.md` owns customer business ordering.
- `DECISIONS.md` owns explicit active decisions.
- When active documents conflict, invoke `CWS_STALENESS_GUARD.md`, stop affected implementation, report, and reconcile first.

## Mandatory execution funnel
Every CWS idea/change must pass:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify (when needed) -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

Do not jump directly from idea/screenshot/bug report to code.

### Before Specify
Record:
- observed reality/evidence;
- expected vs actual;
- proximate cause;
- root cause or falsifiable root-cause hypothesis;
- one first verified bottleneck;
- minimum fix;
- risks/non-goals;
- success evidence.

Clarify only when repository/evidence cannot resolve a material product/security/architecture decision.

## Core engineering rules
- MVP first; one current E2E bottleneck at a time.
- Root cause over symptom.
- Simplicity / no over-engineering.
- Security fail-closed; no secret commits.
- Existing infrastructure only unless Owner explicitly approves a new resource.
- Production runtime must work with AI offline.
- Customer originals are immutable.
- No fake/demo production render/progress/payment/output.
- No manual per-Worker/per-job operations as normal scale path.
- Architecture must avoid scale dead-ends while not adding unmeasured brokers/services.
- Small focused commits; relevant tests/evidence before DONE.

## Canonical product invariants
Customer MVP flow:

`Google Login -> Upload/Drive -> materialize/validate -> create Job -> Worker claim -> prepare/optimize -> real Blender render -> validate -> B2 full output LOCKED -> 3–5 watermarked previews -> final price + MB QR -> SePay exact match -> PAID -> authorized download -> cleanup`

Binding rules:
- upload/materialize/validate occurs before Job creation;
- no customer-approval gate before payment;
- payment occurs only after real render, locked full output and previews;
- final customer pricing keeps the approved 2.5x multiplier over verified cost basis;
- no rerender/repackage/reupload after PAID merely to deliver an existing output.

## Definition of Done
A change is DONE only with:

`Implementation + Tests + Evidence + Source-of-Truth Sync + Staleness Sweep + Commit`

For production-workflow claims, distinguish:
- `CODE VERIFIED`
- `SIMULATION VERIFIED`
- `PRODUCTION RUNTIME VERIFIED`

Never promote one level to another by inference.

## Source-of-Truth Sync
After completed work update, as applicable:
- `CURRENT_STATUS.md`
- `CWS_ROADMAP.md`
- `DECISIONS.md`
- `PROJECT_CONTEXT.md`
- relevant workflow/architecture/API docs
- evidence/report under `reports/`
- engineering learning log/report with problems, root causes, fixes, failed approaches, completed work, lessons/rules, remaining risks and next verified bottleneck.

Before DONE, run the Converge/Verify staleness sweep from `CWS_STALENESS_GUARD.md`. If the completed change made an active document inaccurate, sync it in the same cycle or issue a Founder alert when product intent is ambiguous.

`CURRENT_STATUS.md` must stay short and current-only:
- Current Phase
- Last Verified
- Current Task
- Next
- Last Updated + evidence links

Do not turn `CURRENT_STATUS.md` into a changelog. Historical detail belongs in `reports/` and git history.

## Roadmap status labels
Use only:
- `TODO`
- `IN_PROGRESS`
- `NEEDS_VERIFICATION`
- `DONE`
- `BLOCKED`
- `SUPERSEDED`

`CWS_ROADMAP.md` records current state, not a long historical changelog.

## Repository hygiene
- Do not create a new repository/project/service/bucket/database/payment project without explicit Owner approval.
- Do not recreate deleted versioned roadmaps as active instructions.
- Historical evidence may refer to old roadmap names; that is acceptable because evidence is immutable history, not current direction.
