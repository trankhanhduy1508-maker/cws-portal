# CWS MVP SHIP PLAN

> Status: ACTIVE EXECUTION PLAN
> Founder approved: 2026-08-17
> Schedule window: 2026-08-18 through 2026-08-23
> Authority: subordinate to CWS_ROADMAP.md, DECISIONS.md, CWS_WORKER_TRACKS.md, and current runtime evidence.
> Purpose: convert the current CWS MVP effort into a small number of dated ship goals with hard WIP limits.

## 1. Operating Rule

CWS executes this plan using:

`ONE OUTCOME -> ONE BOTTLENECK -> ONE SMALL CHANGE -> REAL EVIDENCE -> SHIP -> NEXT`

Only one Ship Goal may sit on the critical path at a time.

Research, UI, Observatory, Track B, documentation, and other work may continue only when they do not block or distract from the dated Ship Goal.

A verified checkpoint is not repeated unless relevant code/input/environment changed or evidence proves it stale.

The schedule is outcome-driven. A day is not considered complete because code exists, tests pass, or a report was written. The dated acceptance evidence below must be reached.

## 2. Critical Architecture Simplification

### One canonical Worker, many Jobs

CWS MUST NOT generate a new `cws_worker_full.py` source file for every new customer Job.

The correct direction is data-driven:

`Customer input -> canonical validation -> Job -> Tasks/config -> canonical Worker claims task -> Worker renders according to Job data`

A new customer Job may create new rows/config/task payloads, but must not require source-code generation or editing the Worker implementation.

Reasons:

- one renderer implementation to test and verify;
- no per-customer code drift;
- simpler security and rollback;
- easier multi-Worker coordination;
- easier reproduction of failures;
- fewer moving parts.

The existing canonical Track A render core remains:

`cws_worker.bat -> cws_worker_full.py -> Blender/Cycles -> validated output -> B2`

Do not introduce a duplicate renderer.

## 3. Tuesday 2026-08-18 - HARD SHIP GOAL: REAL RENDER + MULTI-WORKER CORE

### Outcome

By end of Tuesday, CWS must have a verified operational render path capable of rendering the real customer workload and a bounded multi-Worker task ownership mechanism that prevents Workers from rendering the same authoritative Task at the same time.

### Sequence

#### T1 - Recover exact real-render checkpoint

Use MAY083 runtime evidence. Preserve confirmed passes such as acquisition, SHA, preflight, optimization, autoexec OFF, and Blender startup.

Identify the first current failing boundary only.

#### T2 - Make one representative customer frame pass

Current candidate is frame 288.

Required evidence:

- actual Cycles backend identified;
- memory/BVH failure resolved or precisely bypassed using an approved safe path;
- frame renders to a valid image;
- CWS output validation accepts it;
- customer original remains unchanged;
- autoexec remains OFF.

#### T3 - Prove automatic progression beyond one frame

After representative frame PASS, prove the Worker can progress to the next assigned frame/task without editing Worker source.

Do not expand into full animation assembly unless the current Job requires it for this gate.

#### T4 - Prove two Workers do not duplicate authoritative work

Use the existing CWS task ownership/control-plane mechanisms where available.

Minimum acceptance:

- Worker A and Worker B receive distinct authoritative Tasks/frames when two runnable Tasks exist;
- no two Workers own/render the same active authoritative Task simultaneously;
- completion by one Worker cannot be falsely completed by another;
- failed/expired work follows the existing approved ownership/retry semantics;
- no peer-to-peer Worker coordination is introduced.

This is a bounded two-Worker verification, not broad fleet scaling.

#### T5 - Real workload smoke

Run the smallest real workload sufficient to show:

- two Workers can make useful concurrent progress;
- outputs remain isolated by Job/task/frame;
- no duplicate frame ownership;
- failure of one Task does not corrupt the other Worker output.

### Tuesday DONE definition

Tuesday is DONE only if:

1. at least one real representative customer frame is RUNTIME VERIFIED through Track A;
2. the Worker progresses from Job/Task data without source editing;
3. two Workers are shown to receive distinct authoritative work without duplicate active ownership;
4. output validation is real, not simulated;
5. no customer original is modified;
6. no security boundary is weakened to obtain PASS.

If a material external/hardware blocker makes full completion impossible, report the exact proven blocker and preserve every passed boundary. Do not replace runtime proof with extra planning.

## 4. Wednesday 2026-08-19 - HARD SHIP GOAL: RENTED MACHINE USER PROTECTION

### Outcome

While CWS owns a rented render session, an ordinary customer/user must not be able to launch blocked game/high-interference applications that could disrupt the render.

Allowed normal system/work applications remain usable according to policy, including examples such as:

- File Explorer;
- Google Chrome;
- VS Code;
- approved Windows/system utilities;
- CWS/Blender processes required for rendering.

### Required UX

When the user attempts to launch a blocked application during RENTED_LOCK/RENDERING, show a clear popup/message equivalent to:

`Máy đang được CWS thuê. Xin quý khách vui lòng chọn máy khác. Xin cảm ơn.`

The exact wording may be polished without changing meaning.

### Constraints

- build on existing RENTED_MACHINE_GUARD_V1;
- do not invent a second lockdown system;
- block only the approved application classes/processes;
- do not block critical Windows recovery/security functionality;
- RELEASE must restore normal user behavior;
- Founder/system maintenance access required for current operation must remain possible;
- no destructive process killing beyond the approved Guard policy.

### Wednesday DONE definition

Physical Windows runtime must prove:

1. RENTED_LOCK engages;
2. representative blocked game/app cannot remain running or launch according to approved policy;
3. popup/notice is visible;
4. Chrome/File Explorer/VS Code or other explicitly allowed maintenance/system tools still work;
5. Blender/CWS render path continues unaffected;
6. RELEASE restores normal behavior;
7. reboot/recovery/security paths remain safe.

Code tests alone do not close Wednesday.

## 5. Thursday 2026-08-20 - HARD SHIP GOAL: SIMPLIFY THE MVP SYSTEM

### Outcome

Remove unnecessary operational complexity from the current Founder-controlled MVP path while preserving already-verified behavior and canonical contracts.

### Required direction

Prefer the shortest deterministic operational path.

Do not delete future Track B research merely to make the repository smaller. Simplify the active runtime path first.

Target conceptual runtime:

`Customer Google/Drive input -> validation/security gate -> Job/Tasks -> canonical Worker -> Blender -> validate output -> B2`

Everything on the active path must justify its existence.

### Thursday work

1. inventory only active runtime components on the MVP path;
2. identify duplicate/unused/legacy runtime hops;
3. classify each as KEEP, BYPASS FOR TRACK A, DEFER TRACK B, or REMOVE SAFE;
4. remove/bypass only items proven unnecessary and reversible;
5. preserve stable verified code;
6. re-run the smallest relevant E2E slice after each material simplification.

### Thursday DONE definition

- one documented active runtime path;
- no new Job requires Worker source editing;
- no duplicate renderer implementation;
- fewer manual Founder steps than Tuesday baseline;
- no regression of Tuesday/Wednesday verified behavior;
- exact remaining external services/components are known and justified.

## 6. Friday 2026-08-21 - HARD SHIP GOAL: GOOGLE DRIVE TO DATA-DRIVEN JOB

### Outcome

Founder/customer supplies a supported Google Drive link and CWS creates/updates the Job/Task data required by the canonical Worker without changing Worker source code.

### Required path

`Drive link -> validate/materialize according to approved security path -> canonical input state -> Job -> Tasks/config -> Worker claim`

### Acceptance

- a second test Job can be introduced without editing `cws_worker_full.py`;
- Worker receives the intended input/task from data/control plane;
- Job A and Job B remain isolated;
- task/output paths do not collide;
- retries do not create duplicate authoritative Jobs/Tasks where idempotency applies.

## 7. Saturday 2026-08-22 - HARD SHIP GOAL: SMALL CLOSED LOOP

### Outcome

Run the smallest practical closed-loop customer-like render slice using the simplified path.

Minimum:

`input -> Job/Tasks -> Worker(s) -> real render -> output validation -> durable output`

Do not require payment/admin/fleet-scale features for this gate unless they are already necessary to the chosen slice.

Acceptance:

- one complete real Job slice finishes without source editing;
- two-Worker ownership remains correct when concurrency is enabled;
- output is attributable to the correct Job;
- failure is visible and does not become false success.

## 8. Sunday 2026-08-23 - HARD SHIP GOAL: MVP FREEZE + NEXT REVENUE STEP

### Outcome

Freeze the smallest known-good operational MVP baseline and identify only the next revenue-critical gap.

Required:

- known-good commit/tag/branch state identified;
- runtime dependencies listed;
- one command/path to start the operational Worker flow where practical;
- verified vs unverified boundaries clearly separated;
- open PRs classified;
- no unrelated refactor;
- one next P0 chosen from actual customer/revenue evidence.

## 9. Daily Operating Cadence

At the start of each workday:

1. state today's Ship Goal;
2. state nearest verified checkpoint;
3. state first failing boundary;
4. assign one primary owner/agent;
5. execute until new runtime evidence exists.

During the day:

- no more than one critical-path blocker at a time;
- parallel agents may research/test independent surfaces but must not create conflicting edits;
- every failed hypothesis must produce new evidence;
- after three materially similar failed attempts: STOP, re-ground the boundary, widen diagnosis, and pivot.

At day end:

- DONE only on acceptance evidence;
- if not done, preserve passed boundaries and carry exactly one first blocker forward;
- do not compensate for missing runtime progress with new documents.

## 10. Founder Efficiency Rule

Founder time is a constrained resource.

AI/agents must not turn Founder into a terminal operator when the agent can execute the action.

Prefer:

`existing authenticated/native capability -> existing CWS -> official UI/OAuth/CLI/API -> mature open source -> custom last`

Founder interaction is reserved for:

- material product/workflow/architecture/security decisions;
- unavoidable human authorization such as MFA/OAuth/CAPTCHA;
- irreversible/high-risk execution approval;
- business/customer choices that cannot be inferred from engineering evidence.

## 11. Anti-Drift Rules

Until this plan is completed or Founder explicitly reprioritizes:

- no new speculative infrastructure;
- no Worker 3+ scaling before two-Worker correctness is proven;
- no per-Job Worker source generation;
- no new renderer implementation;
- no Observatory expansion on the critical path;
- no UI polish on the critical path;
- no large refactor merely for architectural purity;
- no repeated full-repo grounding;
- no repeated passed runtime checks;
- no reports whose only purpose is to show activity.

## 12. Success Definition

This execution window succeeds when CWS has moved from a collection of partially verified components to a small, reproducible operational path that:

- accepts Job data without Worker source edits;
- renders real customer work;
- can use two Workers without duplicate authoritative work;
- protects the rented machine during rendering;
- preserves a small understandable runtime path;
- produces real evidence quickly enough to support the next customer/revenue step.
