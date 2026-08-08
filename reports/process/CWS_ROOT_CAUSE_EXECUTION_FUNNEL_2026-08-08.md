# CWS Root-Cause Execution Funnel — Adoption Report

Date: 2026-08-08
Status: ACTIVE
Scope: Agent/process governance only; no application/runtime code changed.

## Owner decision

Before coding, CWS changes must pass through a decision funnel that combines evidence-first/root-cause diagnosis inspired by Ray Dalio's problem-solving model with the existing mandatory GitHub Spec Kit workflow.

## Adopted order

`SOURCE OF TRUTH + RUNTIME REALITY`
`-> REALITY / OBSERVE`
`-> DIAGNOSIS`
`-> ROOT CAUSE`
`-> ONE CURRENT BOTTLENECK`
`-> GITHUB SPEC KIT`
`-> MINIMUM IMPLEMENTATION`
`-> REAL EVIDENCE`
`-> LEARN / CONVERGE`

GitHub Spec Kit remains mandatory and is not replaced. The new funnel sits directly before it.

## Normative changes

1. Added `CWS_EXECUTION_FUNNEL.md` as the detailed operating rule.
2. Amended `.specify/memory/constitution.md` from `1.0.0` to `1.1.0`.
3. Updated `.specify/templates/spec-template.md` so every future spec contains a mandatory diagnostic gate before requirements.

## Core rules

- Ideas and AI suggestions are hypotheses, not implementation authorization.
- Evidence and repository/runtime reality come before solution design.
- Separate proximate cause from root cause.
- Use the first verified E2E failure as `ONE CURRENT BOTTLENECK`.
- Do not open unrelated optimization/scale/refactor work while the current MVP bottleneck remains unresolved, except security/data-loss containment or explicit Owner reprioritization.
- Spec Kit may begin only after diagnosis is sufficiently grounded.
- Implementation must be the smallest durable correction that addresses the diagnosed cause.
- `CODE VERIFIED`, `SIMULATION VERIFIED`, and `PRODUCTION RUNTIME VERIFIED` remain separate evidence levels.
- Meaningful failures should create a durable invariant, regression test, contract, or rule where appropriate.
- MVP progress is measured primarily by real customer input-to-output distance.

## Required pre-code diagnostic record

Every non-trivial implementation spec/report must answer:

- GOAL
- OBSERVATION
- EVIDENCE
- EXPECTED
- ACTUAL
- PROXIMATE CAUSE
- ROOT CAUSE / HYPOTHESIS
- FALSIFYING EVIDENCE
- ONE CURRENT BOTTLENECK
- MINIMUM FIX
- NON-GOALS
- SUCCESS EVIDENCE

If the evidence is insufficient, the agent remains in investigation and must not code.

## Runtime impact

None. This decision adds no AI runtime dependency, service, project, broker, database migration, credential, scheduler, or production infrastructure.

## Commits

- `82908548e60942cd028f70e3ca3c916d66ee5896` — add root-cause execution funnel.
- `c835875839fb6cbec346b44ead6ffc7fc029f8b8` — amend Constitution to require funnel before Spec Kit.
- `6300b43c654573f6570eb1b4f80d7be1b12e49f3` — enforce diagnostic gate in Spec Kit template.

## Result

Future CWS implementation work is governed by:

`Reality -> Diagnose -> Root Cause -> One Bottleneck -> Spec Kit -> Code -> Real Evidence -> Converge`

No direct jump from idea/problem to code is permitted.
