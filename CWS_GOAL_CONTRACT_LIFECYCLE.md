# CWS GOAL CONTRACT LIFECYCLE

> Status: ACTIVE / FOUNDER GOVERNANCE
> Founder decision: 2026-08-22
> Purpose: convert long Founder discussions into durable, executable Goal Contracts and keep those contracts current without turning prompts into giant specifications.

## 1. Core principle

A long conversation is raw intent, not canonical execution authority.

The AI must distill discussion into a Goal Contract that expresses:

`WHAT + WHY + DONE + HARD BOUNDARIES`

while leaving ordinary technical `HOW` to AI/Codex under `CWS_AI_GOAL_OWNERSHIP_POLICY.md`.

Canonical flow:

`FOUNDER DISCUSSION -> CLARIFY -> CHALLENGE -> CONFLICT CHECK -> GOAL CONTRACT -> FOUNDER APPROVAL -> ACTIVE GOAL POINTER -> GSTACK EXECUTION -> RUNTIME EVIDENCE -> FOUNDER RECHECK -> QA/SHIP -> LEARN/CLOSE`

## 2. Lifecycle states

Use these states when applicable:

- `DRAFT` - initial distilled goal, incomplete or not yet reviewed;
- `CLARIFYING` - material intent/success/boundary ambiguity remains;
- `READY_FOR_FOUNDER_APPROVAL` - contract is coherent enough to approve;
- `ACTIVE` - Founder approved and eligible for execution;
- `BLOCKED_HUMAN_BOUNDARY` - execution reached a true human-only boundary;
- `VERIFIED` - Definition of Done has passed required evidence gates;
- `CLOSED` - completed and learning synchronized;
- `SUPERSEDED` - replaced by a newer approved contract/decision.

Do not confuse technical progress with lifecycle state.

## 3. Discussion-to-contract behavior

When the Founder explores an idea at length, GPT/AI should not rush to generate a Codex prompt after the first few sentences.

Instead:

1. identify the real intended outcome;
2. capture why it matters;
3. identify the user/operator story;
4. extract measurable success/quality/time/cost constraints;
5. identify hard boundaries and unacceptable shortcuts;
6. identify non-goals;
7. identify assumptions that deserve challenge;
8. detect contradictions or changed opinions in the discussion;
9. distinguish current Founder decisions from brainstorming/hypotheses;
10. produce a compact Goal Contract using `goals/GOAL_CONTRACT_TEMPLATE.md`.

Discussion detail may be preserved in reports/history when useful, but Codex should not need to reread a giant chat to recover the approved goal.

## 4. Conflict and change-of-mind rule

Founder discussion may evolve.

Example:

`early: must be 100% identical`

`later: 90-95% is acceptable if the speed gain is large`

Do not keep both as equal active requirements.

Required behavior:

`DETECT CONFLICT -> IDENTIFY NEWER/EXPLICIT DECISION -> FOUNDER CHECK IF MATERIAL -> RECORD CURRENT CONTRACT`

If intent cannot be resolved from current explicit Founder statements/evidence, keep `GOAL_READY = NO` and ask the smallest clarifying question needed.

Do not ask extra questions when the current decision is already clear.

## 5. Goal readiness gate

Before a contract becomes `ACTIVE`, evaluate:

- intended outcome is clear;
- input/reference/source of truth is clear enough;
- desired output/end state is clear;
- material success/quality criteria are known;
- time/cost/resource constraints are known when they matter;
- hard boundaries are known;
- unacceptable shortcuts/non-goals are known;
- Definition of Done is unambiguous enough to prevent false PASS;
- AI technical autonomy boundary is clear.

If satisfied:

`GOAL_READY = YES`

If not:

`GOAL_READY = NO`

Continue discussion only on the missing material dimensions.

## 6. Founder approval gate

A new material Goal Contract or material change to WHAT/WHY/DONE/hard boundaries must receive explicit Founder approval before activation.

Approval may be concise, such as:

`approved`

`duyet`

or another unambiguous current instruction.

Once approved:

1. set Goal Contract status to `ACTIVE`;
2. record approval date;
3. update `CWS_ACTIVE_GOAL.md` if this becomes the current execution focus;
4. preserve project-level priority unless Founder explicitly changes it.

Routine technical implementation details do not require repeated Founder approval once the Goal Contract is active.

## 7. Active goal pointer behavior

`CWS_ACTIVE_GOAL.md` is a pointer, not a second copy of the Goal Contract.

It should contain only enough information to route a new session:

- active execution goal path;
- status/readiness;
- whether project priority changed;
- ownership split;
- startup rule.

Do not duplicate full requirements there.

## 8. Execution behavior

Once active:

`GROUND -> ACTIVE GOAL -> DOMAIN AUTHORITY -> FOUNDER CHECK -> REMINDER SCAN -> GSTACK -> EXECUTE -> VERIFY`

AI/Codex owns routine technical path decisions and routine blockers.

Do not return to the Founder for every command, dependency, failed test, render defect or local implementation choice.

If 3 materially similar attempts fail:

`STOP -> RE-GROUND -> WIDEN RESEARCH -> RECLASSIFY -> PIVOT`

Escalate only at true boundaries defined by CWS governance.

## 9. Goal change behavior during execution

When the Founder adds a new thought while a goal is active, classify it before editing the contract:

### A. Clarification

It makes existing intent more precise without materially changing outcome/boundary.

Action: update Goal Contract, record `LAST_INTENT_REVIEW`.

### B. Ordinary implementation preference

It suggests HOW but does not change required outcome.

Action: treat as input to AI technical choice, not automatically as a hard contract requirement.

### C. Material goal change

It changes WHAT/WHY/DONE, quality/time budget, customer behavior, architecture/product boundary or a hard constraint.

Action:

`FOUNDER CHECK -> explicit approval -> update contract -> update active pointer if needed`

### D. New unrelated idea

Action: place/route it to `FOUNDER_IDEA_VAULT.md`; do not silently inject it into current goal.

## 10. Founder intent preservation

During execution, compare candidate behavior to the Goal Contract, not merely to the latest technical metric.

If a technical optimization violates approved user/operator behavior, issue:

`FOUNDER INTENT REMINDER`

Do not ship until the candidate is fixed or the Founder explicitly changes the contract.

## 11. Pre-ship gate

Before goal-level completion:

1. run the applicable `gstack qa` / verification;
2. perform `FOUNDER RECHECK` under `CWS_FOUNDER_CHALLENGE_REMINDER_RULE.md`;
3. compare evidence directly against the Goal Contract Definition of Done;
4. distinguish evidence level accurately;
5. reject technical PASS when the actual goal/user outcome fails.

Only then may `gstack ship` / `GOAL_ACHIEVED` be reported.

## 12. Close and learn

When Definition of Done is verified:

1. set Goal Contract to `VERIFIED`;
2. synchronize durable root causes, benchmarks and reusable knowledge to the correct authority/knowledge files;
3. use `retro` + `learn` when materially useful;
4. promote repeated durable lessons into rules when appropriate;
5. review relevant Idea Vault triggers/reminders;
6. set status `CLOSED` when no further goal work remains;
7. update/remove the active execution pointer only with the correct Founder/current-priority decision.

Do not delete the Goal Contract merely because it is complete. It becomes concise historical intent/evidence routing context.

## 13. Supersession rule

If the Founder materially changes the goal so much that the old contract would become misleading, prefer a new Goal Contract rather than repeatedly rewriting history.

Mark the old contract:

`STATUS: SUPERSEDED`

and point to the replacement.

## 14. Prompt compression rule

Once an approved Goal Contract exists, execution prompts should become short cues rather than restating the whole discussion.

Recommended Codex handoff:

```text
Ground current CWS GitHub + local runtime evidence.
Read CWS_ACTIVE_GOAL.md and the referenced Goal Contract completely.
Apply CWS authority, Founder Challenge/Reminder rules and automatic gstack routing.
Own the technical path until the Goal Contract Definition of Done is verified or a true human boundary is reached.
```

Prompt omission of details already in the Goal Contract does not waive those requirements.

## 15. Anti-patterns

Avoid:

`LONG CHAT -> GIANT PROMPT -> CODEX GUESSES WHICH SENTENCE IS CURRENT`

`DISCUSSION HISTORY = CANONICAL AUTHORITY`

`GOAL CONTRACT = TECHNICAL MICRO-MANAGEMENT`

`NEW IDEA -> SILENTLY EXPAND CURRENT GOAL`

`TECHNICAL ARTIFACT EXISTS -> GOAL ACHIEVED`

`FOUNDER SAID IT -> AI MUST AGREE`

Preferred model:

`DISCUSS DEEPLY -> DISTILL CLEARLY -> APPROVE ONCE -> EXECUTE AUTONOMOUSLY -> VERIFY AGAINST THE REAL GOAL -> LEARN`
