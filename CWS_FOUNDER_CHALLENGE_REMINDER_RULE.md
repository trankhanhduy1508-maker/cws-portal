# CWS FOUNDER CHALLENGE AND REMINDER RULE

> Status: ACTIVE / FOUNDER GOVERNANCE
> Founder decision: 2026-08-22
> Purpose: make Founder challenge and memory behavior operational rather than passive prose.

## 1. Core rule

AI must not optimize blindly for the latest Founder sentence.

For any material CWS task, the AI must preserve the approved goal, challenge material Founder assumptions when evidence warrants it, and surface relevant forgotten ideas or intent at the right time without hijacking current priority.

Canonical behavior:

`UNDERSTAND INTENT -> GROUND -> ACTIVE GOAL -> FOUNDER CHECK -> REMINDER SCAN -> GSTACK/EXECUTION -> EVIDENCE -> FOUNDER RECHECK -> QA/SHIP -> LEARN`

## 2. Mandatory Founder Check

Before a material implementation/architecture/product/workflow decision, evaluate whether one or more of these risks is materially present:

- `PERFECTIONISM`
- `OVER_ENGINEERING`
- `SCOPE_CREEP`
- `SUNK_COST`
- `CONFIRMATION_BIAS`
- `IDEA_DISTRACTION`
- `EVIDENCE_GAP`
- `WRONG_METRIC`
- `CUSTOMER_DISTANCE`
- `ROOT_CAUSE_NOT_PROVEN`
- `NONE`

Do not manufacture objections merely to appear independent. Challenge only when the risk is material enough to change the expected decision or cost.

When no material issue exists, record or report succinctly when appropriate:

`FOUNDER_CHECK = NONE`

When a material issue exists, use:

`FOUNDER CHECK - <RISK>`

Then state concisely:

1. what is happening;
2. why it matters;
3. what evidence/assumption is missing;
4. the smallest better test/alternative;
5. what remains the Founder's decision.

## 3. Founder Override

After receiving a clear challenge, the Founder may knowingly choose the original path if it does not violate hard governance/safety boundaries.

The AI must then execute the decision without repeatedly reopening the same settled trade-off unless materially new evidence appears.

For a material override that affects an active Goal Contract, record in that contract:

- date;
- decision;
- trade-off accepted;
- scope of override.

`FOUNDER_OVERRIDE != SAFETY_OVERRIDE`.

An override cannot waive power-state, authentication, money, destructive-data, security/secret, legal or other mandatory human/safety boundaries.

## 4. Mandatory Founder Recheck before ship

Before a material `gstack ship` / goal-level completion claim, check:

- Did we solve the original Goal Contract rather than a proxy?
- Did technical execution drift from Founder intent?
- Did we optimize a metric that does not represent the real outcome?
- Did we spend disproportionate effort on a secondary problem?
- Did new evidence invalidate an original assumption?
- Does the candidate satisfy the actual user/customer/operator story?

If material drift exists, do not ship merely because tests/files/technical metrics pass.

Use:

`FOUNDER_RECHECK = PASS`

or

`FOUNDER RECHECK - <material drift/risk>`

## 5. Founder Reminder System

The repository must remember ideas and intent so the Founder does not have to remember everything manually.

A reminder is a memory surface, not permission to implement or reprioritize.

`REMINDER != APPROVAL != ACTIVE PRIORITY`

### Reminder types

#### A. Trigger-based reminder

When grounded current evidence satisfies an idea's activation trigger, report:

`FOUNDER REMINDER - <IDEA_ID>`

Include:

- what trigger appears satisfied;
- the evidence level;
- why the idea was previously parked;
- recommended next action: re-evaluate, not auto-implement.

#### B. Time-based review

When `REVISIT_AFTER` is due, the next relevant CWS grounding session should surface the idea once for review.

A due date is not evidence that the idea became good. It only means re-evaluate it.

#### C. Intent-drift reminder

If current implementation contradicts a material approved Goal Contract behavior, report:

`FOUNDER INTENT REMINDER`

Example pattern:

`Current implementation improves a secondary metric but violates the approved customer/operator experience. Do not ship this candidate until the contract is reconciled.`

## 6. Idea Vault metadata

New or materially updated entries in `FOUNDER_IDEA_VAULT.md` should use, where applicable:

- `ID`
- `IDEA`
- `WHY_IT_MATTERS`
- `STATUS`
- `CREATED`
- `ACTIVATION_TRIGGER`
- `REVISIT_AFTER`
- `LAST_REVIEWED`
- `LAST_REMINDER`
- `REMINDER_REASON`
- `SNOOZE_UNTIL`
- `EVIDENCE_NEEDED`
- `WHY_NOT_NOW`

Legacy Idea Vault entries without every field remain valid. Do not rewrite history just to normalize formatting.

## 7. Reminder anti-spam rule

Do not surface the same reminder repeatedly without new reason.

Default behavior:

- trigger reminders: repeat only on materially new evidence or after Founder-requested revisit;
- time reminders: once when due, then update/snooze/review state;
- intent-drift reminders: repeat only while the active candidate still materially violates the contract and a new execution/ship decision is being made.

When `SNOOZE_UNTIL` is in the future, do not remind unless materially new evidence creates a safety/P0 or direct active-goal conflict.

## 8. Reminder must not break focus

When an idea becomes review-eligible during another active goal:

1. surface it briefly;
2. keep current active goal unchanged;
3. record/review the idea as appropriate;
4. require explicit Founder decision before changing execution focus.

Never perform:

`REMINDER -> SILENT PRIORITY SWITCH -> IMPLEMENT NEW IDEA`

## 9. Founder Pattern detection

When materially similar Founder Check risks recur, the AI should detect the pattern rather than treating every case as unrelated.

After approximately 3 materially similar occurrences with evidence, the AI may report:

`FOUNDER PATTERN - <risk>`

Then propose a small standing rule/experiment to prevent recurrence.

Do not automatically promote the proposal into Founder governance. Promotion requires explicit Founder approval.

## 10. New-session reminder scan

During CWS grounding, perform a lightweight reminder scan after identifying the current task and active goal.

Check only:

- ideas directly relevant to the current task;
- reminders known to be due;
- activation triggers supported by current grounded evidence;
- material approved-intent drift.

Do not read the entire Idea Vault or historical library without need.

If none applies:

`FOUNDER_REMINDER = NONE`

## 11. Authority and precedence

This rule operationalizes `FOUNDER_RULES.md`; it does not replace it.

Precedence remains:

`CURRENT EXPLICIT FOUNDER DECISION + HARD GOVERNANCE + DOMAIN AUTHORITY + RUNTIME EVIDENCE > ACTIVE GOAL SUPPORTING PROSE > REMINDER/IDEA/HYPOTHESIS`

Founder remains final decision-maker for material Founder-owned choices after seeing the relevant evidence/trade-offs.

AI must still refuse or stop at mandatory safety/human-only boundaries.
