<!--
Sync Impact Report
- Version: 1.1.0 -> 1.2.0
- Canonical roadmap changed to `CWS_ROADMAP.md`.
- Canonical customer flow corrected to Upload/Drive -> materialize/validate -> create Job.
- Removed authority of versioned roadmap files.
- Confirmed no customer-approval gate before payment and retained 2.5x pricing multiplier.
- Compatibility: documentation/governance change only; no runtime dependency or infrastructure change.
-->

# CWS Constitution

This constitution governs every CWS change made by Codex or another coding agent. It sits above product/workflow/architecture/database/roadmap/decision/evidence documents as an execution framework, not as a competing product specification.

## I. Documents Before Code
Agents MUST read the applicable CWS source of truth before changing code or production configuration. The mandatory entry path is:

`CURRENT_STATUS.md -> CWS_ROADMAP.md -> CWS_MVP_WORKFLOW_FINAL.md -> DECISIONS.md -> PROJECT_CONTEXT.md -> relevant schema/architecture -> CWS_EXECUTION_FUNNEL.md -> code/tests/evidence`

`CWS_ROADMAP.md` is the only active roadmap. Old versioned roadmaps are historical and MUST NOT be used or recreated as competing source-of-truth files.

When active documents conflict, use current runtime/code/schema evidence and the more recent explicit Owner decision, then reconcile documents before implementation continues.

## II. Diagnose Before Specify, Specify Before Implement
Every CWS product, workflow, architecture, database, Worker, payment, storage, security, UI, deployment, automation, roadmap or code change MUST first pass:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck`

Then:

`Constitution -> Specify -> Clarify (when needed) -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

Before implementation, the working spec/report MUST establish observation/evidence, expected vs actual, proximate cause, root cause or falsifiable root-cause hypothesis, first verified bottleneck, minimum fix, non-goals, risks and success evidence.

## III. Root Cause Over Symptom
Fix the system invariant, ownership boundary, validation, contract, state transition, test or operating rule that allowed the failure class. Workarounds must be explicitly temporary and never represented as root-cause resolution.

## IV. One Current Bottleneck, E2E First
Until the MVP path is repeatably real, the first verified failing or externally blocked stage in the customer path is the default one current bottleneck. Do not open unrelated optimization, scale, router, scheduler, dashboard or infrastructure work except for security/data-loss containment or explicit Owner reprioritization.

Canonical MVP path:

`Google Login -> Upload/Drive -> materialize/validate -> create Job -> Task -> Worker claim -> extract/discover -> preflight -> immutable-original working copy -> safe optimize -> real Blender render -> validate -> B2 locked output -> 3–5 watermark previews -> final price + QR -> SePay exact match -> PAID -> authorized download -> cleanup`

## V. Evidence Over Assumption
Do not infer technical state from intent, green build, heartbeat, deployment READY, unit mocks or historical jobs. Keep verification levels distinct:
- `CODE VERIFIED`
- `SIMULATION VERIFIED`
- `PRODUCTION RUNTIME VERIFIED`

Production E2E claims require real current customer-owned input, durable IDs, real Worker/Blender/B2 artifacts, real payment matching and traceable evidence.

## VI. Production Must Operate Without AI
Scheduling, Worker claim/heartbeat, rendering, progress, retries, storage, payment matching, delivery, cleanup and recovery MUST operate deterministically when ChatGPT/Codex/other AI is offline.

## VII. Secure Boundaries and Auditable State
Every change considers authentication, authorization, isolation, idempotency, replay/fencing, secret scope, auditability and failure handling. Untrusted customer input is isolated/validated. Customer originals remain immutable. Workers receive only narrow assignment-scoped capabilities. Broad storage/service-role credentials remain server-side. Payment/delivery fail closed and are idempotent/auditable.

## VIII. Binding Product Invariants
- Customer Google Login is required for MVP.
- Upload/Drive ingestion, canonical materialization and validation happen **before Job creation**.
- Supported input: `.blend`, `.zip`, `.rar`, approved Google Drive file links.
- No customer-approval gate before payment.
- Payment only after real render, validated full B2 output locked, and real watermarked previews.
- Final customer pricing retains the approved **2.5x multiplier** over verified cost basis; this constitution does not invent a base rate.
- PAID unlocks the already-uploaded output; do not rerender/repackage/reupload solely for delivery.
- Production has no fake/mock render, progress, payment or result path.

## IX. Scale by Design, MVP First
Normal fleet growth must not require manual per-Worker DB edits, copied long-lived storage keys, manual per-job actions or AI intervention. Workers use stable system-managed identities and task-scoped capabilities. Consider 100/1,000/1,000,000-Worker operation for architecture decisions, but add no broker/service/project without measured need.

## X. Existing Infrastructure Only
Use the existing canonical Vercel, Render, Supabase, Backblaze B2, GitHub, Worker and payment resources. Do not create parallel resources unless the Owner explicitly approves that exact creation.

## XI. Verification, Rollback and Failure Handling
After implementation, run appropriate tests/checks and production E2E where applicable. Production changes require bounded rollback/fail-closed/recovery behavior. Continue along the real E2E path until the next genuine bottleneck is exposed; do not guess it in advance.

## XII. Source-of-Truth Synchronization
Completed work updates, as applicable:
- `CURRENT_STATUS.md`
- `CWS_ROADMAP.md`
- `DECISIONS.md`
- `PROJECT_CONTEXT.md`
- relevant workflow/API/architecture docs
- evidence under `reports/`
- engineering learning log/report.

`CURRENT_STATUS.md` remains current-only. Historical details belong in `reports/` and git history.

## Source-of-Truth Boundary
- roadmap/product milestones: `CWS_ROADMAP.md`
- present execution state: `CURRENT_STATUS.md`
- customer business flow: `CWS_MVP_WORKFLOW_FINAL.md`
- explicit decisions: `DECISIONS.md`
- compact product/architecture context: `PROJECT_CONTEXT.md`
- data model: `CWS_DATABASE_SCHEMA.md` + applied migrations
- architecture/scale: relevant current architecture docs + `CWS_SCALING_ROADMAP.md`, subordinate to `CWS_ROADMAP.md`
- execution: `AGENTS.md`, `CWS_EXECUTION_FUNNEL.md`, this constitution, Spec Kit artifacts
- runtime proof: current code/config plus evidence under `reports/`

## Governance
Amendments require a dated Sync Impact Report, semantic version increment and reconciliation of dependent CWS rules/docs. A constitution amendment does not bypass the diagnostic funnel or Spec Kit workflow.

**Version**: 1.2.0 | **Ratified**: 2026-08-08 | **Last Amended**: 2026-08-10
