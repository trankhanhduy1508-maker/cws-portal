# CWS GOAL CONTRACT TEMPLATE

> Purpose: turn a long Founder discussion into a compact, durable statement of intent that a new AI/Codex session can execute without guessing.
> Rule: Goal Contracts define WHAT / WHY / DONE. They must not unnecessarily lock the AI into HOW.

## Metadata

- `GOAL_ID:`
- `STATUS: DRAFT | CLARIFYING | READY_FOR_FOUNDER_APPROVAL | ACTIVE | BLOCKED_HUMAN_BOUNDARY | VERIFIED | CLOSED | SUPERSEDED`
- `GOAL_READY: YES | NO`
- `FOUNDER_APPROVED:`
- `LAST_INTENT_REVIEW:`
- `DOMAIN:`
- `PROJECT_PRIORITY_CHANGE: YES | NO`

## 1. Founder Intent

What the Founder is actually trying to accomplish, in plain language.

## 2. Why This Matters

Business/customer/operational reason the goal is worth solving.

## 3. Customer / Operator Story

Describe what the user/operator experiences from input to result.

## 4. Desired End State

Describe the end result as concretely as possible.

## 5. Source of Truth

Identify the reference input/output/evidence that defines correctness or quality.

## 6. Success Conditions

Measurable conditions that must all be true for success.

## 7. Quality Bar

Define practical quality expectations, including visual/semantic/user-experience criteria when applicable.

## 8. Speed / Cost / Resource Budget

State target, ceiling, machine/resource constraints and what must be included in measurement.

## 9. Hard Boundaries

List actions or outcomes that are not permitted, including CWS governance/human-only boundaries that matter to this goal.

## 10. Acceptable Trade-offs

State what the Founder is willing to sacrifice to optimize what matters more.

## 11. Unacceptable Shortcuts

List ways a candidate could technically appear successful while violating the actual intent.

## 12. Non-goals

Explicitly say what this goal is not trying to solve.

## 13. Known Good Evidence / Baselines

Point to current evidence or artifacts worth preserving. Do not copy large runtime reports here.

## 14. Known Failed Solution Families

Summarize materially failed families only when avoiding repeated dead ends matters. Detailed evidence belongs in reports/knowledge.

## 15. Current Unknowns

List material unknowns that still need investigation. Unknowns are not facts.

## 16. Definition of Done

The smallest unambiguous goal-level completion gate. A technical artifact existing is not enough unless the Goal Contract says so.

## 17. Founder Assumptions AI Must Challenge

List important assumptions or likely failure modes where AI must actively challenge the Founder rather than optimize blindly.

## 18. Evidence Required Before Completion

Specify required runtime/QA/customer/visual evidence level. Preserve `CODE != TEST != INTEGRATION != RUNTIME != PRODUCTION != GOLDEN E2E`.

## 19. Founder Overrides

Record only explicit overrides where the Founder knowingly accepts a material trade-off after an AI challenge.

Format:

- date
- decision
- trade-off accepted
- scope of override

An override does not waive safety, power-state, destructive-data, money, authentication, security/secret, or other hard governance boundaries.

## Goal readiness gate

`GOAL_READY = YES` only when the AI can state with reasonable clarity:

- intended outcome;
- input/source of truth;
- required output/end state;
- success/quality conditions;
- material time/cost/resource constraints;
- hard boundaries;
- non-goals/unacceptable shortcuts;
- Definition of Done;
- AI technical autonomy boundary.

If these are already clear, do not keep asking questions merely to make the document more elaborate.

## Anti-pattern

Do not turn the Goal Contract into an implementation plan.

Bad:

`Must use FBX, then script X, then command Y.`

Better:

`Preserve character, animation, camera, material and visual fidelity; AI may choose the evidence-backed interchange/automation path that best meets the goal.`
