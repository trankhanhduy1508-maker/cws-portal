# CWS MINIMUM RELEASE PROCESS V1

> Status: ACTIVE — Founder approved
> Effective: 2026-08-17
> Exit condition: first verified paid/customer revenue render
> Purpose: minimize lead time from code change to real customer/runtime evidence without weakening P0 security, data integrity, or Founder-controlled boundaries.

## 1. North Star

Until first revenue, CWS optimizes for:

`TIME TO FIRST PAID RENDER`

Engineering optimizes for:

`LEAD TIME: CHANGE -> REAL RUNTIME EVIDENCE`

Activity is not progress. Documents, prompts, branches, commits, test counts, research hours, and agent runtime do not count as product progress by themselves.

## 2. Critical Path

Only these may occupy or interrupt the critical path before first revenue:

1. Track A real-render/customer-job work required for the current Ship Goal.
2. Proven Security P0, data-loss P0, false-success P0, or task-ownership/duplicate-render P0.
3. Minimum release automation directly required to verify or ship items 1–2 reliably.

Everything else is PARKED unless Founder explicitly promotes it.

## 3. Parking Lot

Default PARK before first revenue:

- UI polish not required for the first usable customer flow;
- Development Observatory V2/polish;
- Track B/fleet-scale architecture;
- new skills/frameworks without a current P0 decision they can change;
- broad research unrelated to the first failing boundary;
- speculative scalability work;
- opportunistic refactors;
- documentation/report creation when an existing canonical owner can absorb the fact;
- new infrastructure not required by the current Ship Goal.

PARK means preserve, do not delete, but do not spend critical-path engineering time on it.

## 4. WIP Limit

`MAX ACTIVE P0 SHIP GOALS = 1`

A proven Security/Data Integrity P0 may preempt the current Track A blocker. When the interrupting P0 is closed, immediately return to the previous Track A checkpoint.

Do not switch to easier work merely because the current blocker is difficult.

## 5. Minimum Daily Release Loop

`SHIP GOAL -> NEAREST VERIFIED CHECKPOINT -> FIRST FAILING BOUNDARY -> ONE HYPOTHESIS -> ONE SMALL REVERSIBLE CHANGE -> TARGETED TEST -> CI -> MAY083 CONTROLLED REAL RUN -> VALIDATE -> PASS/TAG -> NEXT`

Rules:

- Preserve every verified boundary.
- Do not repeat unchanged expensive checkpoints.
- Do not stack speculative fixes.
- Do not perform unrelated refactors.
- Do not broaden scope after a PASS; close the milestone and choose the next boundary.

## 6. Definition of Done Before First Revenue

The pre-revenue MVP is DONE only when a customer-like job is runtime verified through the minimum revenue path:

`INPUT -> JOB/TASKS -> AUTHORITATIVE WORKER OWNERSHIP -> REAL BLENDER RENDER -> OUTPUT VALIDATION -> DURABLE OUTPUT STORAGE`

Additional requirements:

- no false success;
- no duplicate authoritative Task completion;
- untrusted `.blend` autoexec remains disabled;
- customer original remains unchanged when optimization/working copies are used;
- secrets are not stored in tracked source/bundles;
- failures are observable enough to identify the first failing boundary;
- the known-good path can be reproduced on the controlled Worker environment.

Payment/customer-commercial completion remains governed by current canonical product/payment decisions. This document does not silently redefine those contracts.

## 7. Change Classes

### S — Small / Reversible

Use:

`RELEVANT GROUND -> REPRODUCE -> FIX -> TARGETED TEST -> RELEVANT RUNTIME VERIFY -> PR/SHIP`

No new Spec Kit artifact or research report solely because code changed.

### M — Material / Bounded

Reuse an existing spec/decision where possible. Add only the minimum short specification needed to remove ambiguity, then implement and independently verify.

### X — Founder Boundary

Founder approval remains mandatory before changing:

- workflow/workflow order;
- architecture;
- scheduler/task-ownership semantics;
- database architecture;
- production security/trust boundary;
- payment/pricing flow;
- authentication/authorization flow;
- render workflow semantics;
- multi-machine assignment architecture;
- destructive/irreversible data or infrastructure behavior.

Minimum process is not permission to move a Founder-controlled boundary.

## 8. Minimum CI / Release Machine

Repeated checks belong in deterministic automation rather than Founder memory.

For a changed subsystem, run only the relevant deterministic gates plus required cross-cutting P0 gates.

Target release path:

`CHANGE -> TARGETED TESTS -> CI -> PACKAGE/INTEGRITY WHEN APPLICABLE -> MAY083 CONTROLLED RUN -> REAL INPUT -> OUTPUT VALIDATION -> KNOWN-GOOD CHECKPOINT`

CI should progressively absorb repeatable tasks such as:

- Python compile/syntax;
- Worker regression tests;
- frontend/backend build/tests when affected;
- secret scanning / tracked-credential prevention;
- package/manifest integrity where applicable;
- deterministic contract tests for task ownership/claim semantics.

Missing generated dependencies such as `node_modules` are environment/setup conditions, not automatically product defects. Restore them through the repository lockfile/package-manager contract.

## 9. Branch / PR Discipline

Before first revenue:

- prefer one small active PR serving the current P0;
- reuse an appropriate existing active branch/PR before creating another;
- do not create duplicate PRs;
- do not mix PARKED work into the P0 PR;
- close/supersede stale work only after confirming it is no longer needed;
- do not auto-merge without Founder approval where current governance requires approval.

Main should stay as close to known-good/shippable as practical.

## 10. Research Rule

Research is allowed only when its answer can change the next P0 decision or falsify the current hypothesis.

Classify useful findings:

- USE NOW
- TEST FIRST
- PARK
- REJECT

Stop research when enough evidence exists to run the next safe experiment.

## 11. Skill / Framework Rule

Before first revenue:

`NO NEW SKILL OR FRAMEWORK BY DEFAULT`

A new skill/framework is justified only if:

1. the current P0 cannot be efficiently solved with native/installed capability, existing CWS, existing approved skills, official CLI/API/SDK, or mature existing tooling; and
2. its expected benefit applies to the current blocker, not hypothetical future work.

Installing or studying a tool is not progress unless it shortens the current evidence loop.

## 12. Security P0 Interrupt Policy

Security work may interrupt Track A only when evidence shows a current P0 such as:

- tracked/exposed live credential;
- untrusted customer code execution;
- authorization/ownership bypass;
- false-success that can release invalid output/state;
- customer data corruption/loss risk;
- duplicate authoritative task ownership/completion.

Fix the smallest safe security boundary, verify it, then return to Track A.

## 13. Current Pre-Revenue Sequence

The canonical runtime evidence decides exact checkpoints, but the intended small-batch sequence is:

1. one representative real customer frame renders and validates through Track A;
2. close any proven Security P0 that blocks safe operation;
3. prove two Workers cannot authoritatively own/complete the same Task and can process distinct eligible Tasks;
4. prove durable output storage on the minimal path;
5. prove data-driven Google Drive/input -> Job -> Tasks -> Worker without editing Worker source per customer;
6. run one small customer-like closed-loop Job;
7. freeze/tag a known-good pre-revenue MVP baseline;
8. execute the first paid/customer revenue render under the approved commercial flow.

Do not generate a new `cws_worker_full.py` per customer/job. Maintain one canonical Worker implementation; Jobs/Tasks/config carry per-job data.

## 14. Evidence Rules

Keep evidence levels distinct:

- CODE VERIFIED
- CONTRACT VERIFIED
- SIMULATED VERIFIED
- RUNTIME VERIFIED
- PRODUCTION RUNTIME VERIFIED
- GOLDEN E2E

Tests do not prove a real render. Device enumeration does not prove actual GPU rendering. Storage code does not prove upload. A later failure does not erase an earlier verified boundary.

## 15. Minimal Reporting

Normal execution reports should answer only:

- SHIP GOAL
- NEAREST VERIFIED CHECKPOINT
- FIRST FAILING BOUNDARY
- ONE ACTION TAKEN
- RESULT
- EVIDENCE LEVEL
- NEXT SMALLEST SAFE ACTION
- FOUNDER APPROVAL REQUIRED

Add detail only when it changes a decision.

## 16. Metrics

Primary business metric:

`TIME TO FIRST PAID RENDER`

Primary engineering metric:

`LEAD TIME TO REAL EVIDENCE`

Supporting metrics:

- blocker age;
- rework ratio;
- change failure rate;
- recovery time.

Metrics exist to reduce delay, not create reporting work.

## 17. Exit From Pre-Revenue Freeze

This temporary operating mode ends only after the first paid/customer revenue render is verified or Founder explicitly ends it.

After exit, PARKED work is reconsidered by revenue/customer value and risk. It does not automatically become active.

## 18. Final Rule

> `ONE P0 -> ONE FIRST FAILURE -> ONE SMALL CHANGE -> REAL EVIDENCE -> SHIP -> NEXT`

When process and shipping conflict, keep the safety/Founder boundary and remove the ceremony.
