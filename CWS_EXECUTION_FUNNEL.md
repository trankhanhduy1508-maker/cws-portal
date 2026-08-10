# CWS Execution Funnel

> Status: ACTIVE
> Owner decision: 2026-08-08
> Updated: 2026-08-10
> Purpose: Mandatory pre-code decision funnel for every CWS implementation change.

## Why this exists

CWS must reach a real MVP quickly without accumulating complexity from symptom-driven fixes, speculative features, unsupported AI conclusions, or architecture work that does not unblock the production E2E path.

This funnel adapts the core problem-solving pattern associated with Ray Dalio: define the goal, identify the problem, diagnose the root cause, design the minimum solution, then execute and verify. It is a CWS operating rule, not a runtime dependency and not a replacement for GitHub Spec Kit.

## Golden rule

An idea, bug report, screenshot, request, architecture proposal, optimization, or AI suggestion is a hypothesis to investigate — not authorization to code and not evidence by itself.

No CWS code or production configuration change may begin until it passes every applicable gate below.

## Mandatory funnel

`REALITY -> GROUNDING -> DIAGNOSIS -> ROOT CAUSE -> ONE BOTTLENECK -> SPEC KIT -> MINIMUM IMPLEMENTATION -> REAL EVIDENCE -> LEARN/CONVERGE`

### Gate 1 — REALITY / OBSERVE

Establish what is actually happening before proposing a fix.

Required:
- Read `CURRENT_STATUS.md`, current roadmap, `DECISIONS.md`, applicable workflow/architecture docs, and relevant code/tests/evidence.
- Prefer current code/config/runtime evidence over chat memory or intent.
- Mark unknowns as `NOT VERIFIED`; never fill gaps by guessing.
- For E2E problems, trace the real production path from customer input toward customer output.

Output:
- Observation.
- Evidence.
- Expected result versus actual result.

### Gate 2 — GROUNDING / VERIFY THE CLAIM

Every material AI conclusion about CWS must be grounded in current, inspectable evidence before it is used for architecture, implementation, production decisions, status reporting, or claims of success.

The AI must not treat model memory, prior chat summaries, plans, roadmap intent, mocks, screenshots without corroboration, or its own previous statements as authoritative evidence.

#### Allowed grounding sources

Use the strongest available source for the claim:

1. Current repository code/configuration on the target branch.
2. Current CWS source-of-truth documents and Spec Kit artifacts.
3. Database schema/query result or authoritative persisted state.
4. Runtime logs from the actual component involved.
5. Real HTTP/API response from the deployed environment.
6. Vercel/Supabase/B2/worker state from the real environment.
7. Automated test output, with the verification level stated explicitly.
8. Real production E2E evidence tied to a concrete job/run when production behavior is being claimed.

When two sources conflict, prefer the source closest to actual runtime behavior and reconcile the stale source instead of silently choosing the convenient answer.

#### Mandatory claim status

Every material claim must be classifiable as one of:

- `VERIFIED` — supported by current inspectable evidence appropriate to the claim.
- `PARTIALLY VERIFIED` — some evidence exists, but an important layer is still unconfirmed.
- `UNVERIFIED` — plausible but not proven.
- `CONTRADICTED` — current evidence shows the claim is false.

`UNVERIFIED` and `PARTIALLY VERIFIED` claims may guide investigation, but must not be presented as production facts or used to mark work `DONE`.

#### Claim-to-evidence rule

For every important conclusion, the working report/spec must be able to answer:

```text
CLAIM:
STATUS: VERIFIED | PARTIALLY VERIFIED | UNVERIFIED | CONTRADICTED
SOURCE:
EVIDENCE:
FRESHNESS / RUN ID:
WHAT WOULD FALSIFY IT:
```

Examples:

```text
CLAIM: Google Drive input reaches a real Blender worker and produces a B2 output.
STATUS: VERIFIED
SOURCE: production runtime
EVIDENCE: job_id + worker log + Blender exit/result + B2 object + API/job state
FRESHNESS / RUN ID: <timestamp/job_id>
WHAT WOULD FALSIFY IT: missing worker execution, failed Blender result, or missing B2 object
```

```text
CLAIM: Payment unlock works in production.
STATUS: UNVERIFIED
SOURCE: unit tests only
EVIDENCE: mocked webhook tests pass
FRESHNESS / RUN ID: <test run>
WHAT WOULD FALSIFY IT: real SePay webhook fails to produce PAID and authorized download
```

#### No unsupported certainty

If evidence is insufficient, the correct output is `UNVERIFIED`, `NOT VERIFIED`, or `INSUFFICIENT EVIDENCE` — not a confident guess.

For high-impact boundaries such as payment, authentication, authorization, storage access, deletion, security, customer-visible state, and production E2E completion, require independent verification at the relevant boundary instead of relying on a single AI interpretation.

### Gate 3 — DIAGNOSIS

Separate symptoms from causes.

For every non-trivial implementation change, record:
- Problem statement.
- Proximate cause: the immediate mechanism that failed.
- Root-cause hypothesis: the deeper condition that allowed the failure.
- Assumptions and competing explanations.
- What evidence would falsify the root-cause hypothesis.

Do not design the solution while diagnosis is still materially uncertain.

### Gate 4 — ROOT CAUSE

Prefer a fix that removes the class of failure instead of hiding one occurrence.

Before proceeding, answer:
1. Why did this happen?
2. Why was the system able to enter this state?
3. Which missing invariant, contract, validation, ownership boundary, test, or operating rule allowed it?
4. Can the same class of failure recur elsewhere?
5. What is the smallest durable correction?

A workaround is permitted only when explicitly identified as a temporary containment and when the real root-cause work is recorded.

### Gate 5 — ONE CURRENT BOTTLENECK

For MVP execution, CWS works on the first verified blocker in the real production path unless the Owner explicitly changes priority.

Canonical customer path:

`submit/input -> ingest/download -> extract -> discover/prepare -> optimize -> Worker claim -> Blender render -> validate -> B2 locked output -> watermark previews -> final price -> QR -> SePay match -> PAID -> authorized download`

Rules:
- Find the first `FAIL` or externally `BLOCKED` stage.
- The blocker itself must be grounded in evidence from Gates 1–2.
- That stage becomes `ONE CURRENT BOTTLENECK`.
- Do not open unrelated optimization, scale, refactor, router, scheduler, dashboard, or infrastructure work while the bottleneck remains unresolved.
- Work outside the bottleneck is allowed only for security containment, data-loss prevention, or an explicit Owner decision.

This rule does not remove long-term roadmap items; it prevents them from stealing execution priority from MVP E2E.

### Gate 6 — GITHUB SPEC KIT

Only after Reality + Grounding + Diagnosis + Root Cause + Bottleneck are established may the change enter GitHub Spec Kit.

Required sequence:

`Constitution -> Specify -> Clarify (only when repository/evidence cannot resolve it) -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

Spec Kit artifacts must include or reference the diagnosis and grounding record produced by Gates 1–5.

The `spec.md` must state:
- goal;
- verified problem;
- grounding evidence and claim status;
- root-cause hypothesis or confirmed root cause;
- current bottleneck;
- scope and non-goals;
- success evidence.

The `plan.md` must choose the smallest compatible solution. The `tasks.md` must not include unrelated improvements.

`Analyze` must reject implementation when diagnosis and plan do not connect causally or when a key premise is still being treated as verified without evidence.

### Gate 7 — MINIMUM IMPLEMENTATION

Implementation is allowed only after the preceding gates pass.

Rules:
- Make the smallest change that can remove the diagnosed bottleneck.
- Reuse existing CWS infrastructure and contracts.
- No new service/project/dependency merely because it is architecturally attractive.
- No speculative scale work unless the current design creates a demonstrated scale dead-end.
- Preserve security, isolation, idempotency, rollback/recovery, and source-of-truth rules.

### Gate 8 — REAL EVIDENCE

A code change is not success by itself, and an AI statement that something works is never sufficient evidence.

Verification levels must remain distinct:
- `CODE VERIFIED`
- `SIMULATION VERIFIED`
- `PRODUCTION RUNTIME VERIFIED`

Never promote one level into another without its own evidence.

For workflow-affecting changes, verification must continue through the real E2E path until the next genuine bottleneck is exposed.

Mocks, demos, fake progress, manually edited success state, historical artifacts, or unsupported AI summaries cannot establish production success.

For every `DONE` claim, retain enough evidence for another agent or human to independently reproduce or inspect why it was marked done.

### Gate 9 — LEARN / CONVERGE

Every meaningful failure should improve the machine.

After verification:
- If the failure revealed a missing invariant, add the invariant/test/rule at the correct boundary.
- Add regression coverage when practical.
- Update the relevant source-of-truth documents and evidence report.
- Record a durable decision in `DECISIONS.md` when behavior/policy changed.
- Record errors, root causes, unsuccessful attempts, fixes, completed work, lessons/rules, and follow-up risks in the engineering learning log for the work session.
- Move `ONE CURRENT BOTTLENECK` to the next first failing stage only after the previous one is verified.
- Converge instead of opening new scope.

## Required diagnostic record

Before implementation, the working spec/report must be able to answer this compact template:

```text
GOAL:
OBSERVATION:
CLAIM STATUS:
GROUNDING SOURCE:
EVIDENCE:
FRESHNESS / RUN ID:
EXPECTED:
ACTUAL:
PROXIMATE CAUSE:
ROOT CAUSE / HYPOTHESIS:
FALSIFYING EVIDENCE:
ONE CURRENT BOTTLENECK:
MINIMUM FIX:
NON-GOALS:
SUCCESS EVIDENCE:
```

If these fields cannot yet be answered, the agent remains in investigation and must not code.

## Dalio-style five-step mapping for CWS

1. **Goal** — What customer or system outcome must exist?
2. **Problem** — What verified gap prevents that outcome?
3. **Diagnosis** — What root mechanism created the gap?
4. **Design** — What is the smallest durable change that removes it?
5. **Do to completion** — Implement, test, obtain real evidence, synchronize docs, and continue until converged or genuinely blocked.

Do not collapse steps 2–4 into “see problem -> code solution”.

## MVP priority rule

Progress is measured primarily by distance from real customer input to real customer output, not by number of commits, tests, abstractions, roadmap items, simulations, architecture components, or confident AI explanations.

Until the production E2E path is repeatably real, prefer removing the first verified blocker over increasing sophistication elsewhere.

## Relationship to other CWS rules

This file is an execution gate layered above implementation and directly before GitHub Spec Kit.

Order:

`CWS source of truth + runtime reality -> Grounding/Verification -> CWS Execution Funnel -> GitHub Spec Kit -> code/config change -> independent evidence -> source-of-truth sync`

The Constitution remains normative. GitHub Spec Kit remains mandatory. Existing security, scalability, infrastructure, evidence, and engineering learning log rules remain binding.

When rules conflict, surface the conflict and reconcile it before implementation; never silently bypass this funnel.
