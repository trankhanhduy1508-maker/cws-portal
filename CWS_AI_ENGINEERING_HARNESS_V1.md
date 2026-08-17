# CWS AI ENGINEERING HARNESS V1

> **Status:** ACTIVE — Founder approved
> **Version:** 1.4
> **Date:** 2026-08-17
> **Owner:** Founder / Project Owner
> **Purpose:** Give AI enough freedom to ship small verified increments quickly while preventing silent changes to product intent, workflow, architecture, security, infrastructure, data, and business rules.

## 1. Core Principle

> **AI may choose implementation details inside an approved boundary. AI may not move the boundary itself.**

CWS optimizes for verified customer/runtime outcomes, not engineering ceremony.

Default daily execution loop:

`SEE -> FIX -> PROVE -> SHIP`

Expanded form:

`ONE OUTCOME -> ONE BOTTLENECK -> ONE SMALL CHANGE -> REAL EVIDENCE -> SHIP -> NEXT`

For ordinary bounded work, use the smallest process that safely produces new evidence. Full governance remains mandatory only when risk or Founder-controlled boundaries require it.

### Simplest Effective Method Rule

Prefer the simplest method that satisfies all current requirements, preserves verified behavior, and produces sufficient evidence.

Simple does not mean careless. Simplicity means fewer moving parts, fewer duplicated paths, fewer manual steps, fewer sources of truth, and easier rollback/debugging.

When two approaches are both safe and satisfy the same requirement, prefer the one with:

1. fewer components;
2. fewer runtime dependencies;
3. fewer manual operations;
4. fewer code paths;
5. less state to synchronize;
6. easier verification;
7. easier rollback;
8. lower long-term maintenance cost.

Do not add complexity for hypothetical future scale before current evidence requires it.

## 2. CWS Ship Loop

Every active P0 should move through:

1. OUTCOME — define one customer/runtime result.
2. REPRODUCE — recover the nearest verified checkpoint and first failing boundary.
3. FIX — make the smallest reversible change that tests the current hypothesis.
4. VERIFY — run targeted automated verification and the highest relevant runtime boundary available.
5. SHIP SMALL — commit/PR/deploy/controlled-run only the bounded change appropriate to its risk class.
6. OBSERVE — collect actual evidence; do not infer success from code/tests alone.
7. LEARN / NEXT — record only durable lessons, preserve passed checkpoints, choose the next bottleneck.

A later failure never erases earlier verified boundaries.

Do not repeat an unchanged verified checkpoint unless relevant code/input/environment changed or evidence shows the checkpoint is stale.

## 3. One Ship Goal / WIP Limit

At any moment CWS has one primary Ship Goal on the critical path.

Research, UI, observability, documentation, and independent work may proceed in parallel only when they do not block or distract from the Ship Goal.

Name one first blocking link. Do not redesign unrelated downstream systems because they are nearby.

For current Track A work, the operational goal remains the smallest real customer render outcome required by current canonical status/evidence. Ground CURRENT_STATUS.md and runtime evidence before naming the exact failing boundary.

## 4. Roles and Authority

### Founder

Founder owns product intent and priorities, customer workflow/public behavior, business/pricing/payment rules, major architecture direction, security/trust boundaries, infrastructure approval, irreversible/destructive decisions, and major tradeoffs.

Founder does not need to decide ordinary implementation details that preserve approved behavior.

### ChatGPT — Intent Compiler / Technical Coordinator

Ground current evidence, identify the Ship Goal and first failing boundary, detect Founder-approval boundaries, convert intent into concise execution prompts, and prevent stale governance or chat history from becoming product policy.

When actionable evidence is already sufficient, provide the next execution action without forcing Founder to ask again.

### Codex / Coding Agent — Engineering Executor

Codex may inspect, diagnose, test, implement, refactor locally, and verify inside approved scope. It should execute rather than repeatedly plan once grounding and the boundary are clear.

Codex must stop before independently redefining product workflow, pricing/payment order, authentication/authorization policy, scheduler ownership semantics, storage/security boundaries, infrastructure topology, or destructive migration/data policy.

### Deterministic Production Software

Anything that can be deterministic should remain deterministic, including auth, authorization, payment matching, task ownership, lease/generation fencing, file validation, state transitions, retries, cleanup, and accounting. Normal production control loops must not depend on natural-language AI judgment.

## 5. Risk Classes — Process Must Match Risk

### S — Small / Reversible

Examples: bounded bug fix, diagnostics/logging, targeted test, UI copy, safe internal helper/refactor preserving behavior.

Default path:

`GROUND RELEVANT SCOPE -> REPRODUCE -> SMALLEST FIX -> TARGETED TEST -> RELEVANT RUNTIME VERIFY -> PR/SHIP`

No new Spec Kit artifact, research report, roadmap update, or Founder approval is required solely because code changes, unless the change crosses a controlled boundary.

### M — Material / Bounded

Examples: meaningful Worker/Guard behavior, storage/auth implementation that preserves an approved contract, significant internal feature.

Default path:

`GROUND -> DIAGNOSE -> EXISTING SPEC OR SHORT SPEC -> PLAN ONLY AS NEEDED -> IMPLEMENT -> INDEPENDENT VERIFY -> PR -> CONTROLLED ROLLOUT`

Reuse existing specs and PRs before creating new ones.

### X — Founder / Architecture Boundary

Examples: customer journey/order, payment/pricing, supported input contract, scheduler semantics/ownership, database architecture, authentication/authorization boundary, Worker trust model, production security boundary, new production infrastructure, multi-machine assignment architecture, destructive data behavior.

Path:

`GROUND -> DIAGNOSE -> FOUNDER DECISION -> CANONICAL DECISION/SPEC -> PLAN -> IMPLEMENT -> REVIEW -> VERIFY -> CONTROLLED ROLLOUT`

Founder approval is mandatory before moving the boundary.

### Critical / Irreversible Execution

Explicit Founder approval immediately before execution remains mandatory.

## 6. Mandatory Gates

### Ground Reality

Ground only the smallest authoritative context required by the task. Use runtime/code/current canonical evidence over memory. UNKNOWN is not FACT.

### Diagnose Before Fix

Use:

`Observed reality -> Expected vs actual -> First failing boundary -> One falsifiable hypothesis -> Minimum safe experiment/fix`

No shotgun debugging and no three identical retries.

### Existing Capability First

Before custom implementation:

`NATIVE/INSTALLED -> EXISTING CWS -> EXISTING SKILL -> OFFICIAL CLI/API/SDK -> MATURE OPEN SOURCE -> CUSTOM LAST`

### Founder Boundary

If the smallest fix crosses a Class X boundary, stop and obtain Founder approval.

## 7. Spec Kit Role

GitHub Spec Kit remains the lifecycle controller for material feature/contract/architecture work where a specification is needed.

It is not mandatory ceremony for every Class S bug fix or diagnostic change.

Do not create a new spec when an active canonical spec already owns the requirement. Do not create documentation merely to prove that process happened.

## 8. Evidence-Driven Next Action

Evidence level must control the next action.

Verification ladder:

- V0 DESIGN REVIEWED
- V1 CODE VERIFIED
- V2 INTEGRATION VERIFIED
- V3 RUNTIME VERIFIED
- V4 PRODUCTION RUNTIME VERIFIED
- V5 GOLDEN E2E VERIFIED

If a boundary is already V3 and relevant inputs/code/environment are unchanged, continue from the next unresolved boundary instead of replaying it.

Unit tests are not real render proof. Device enumeration is not GPU-render proof. Schema/code is not runtime task-claim proof. AI saying PASS is never evidence.

## 9. Shipping and Branch Discipline

Prefer:

`REUSE ACTIVE BRANCH/PR -> SMALL CHANGE -> VERIFY -> MERGE/CLOSE -> MAIN OWNS KNOWLEDGE`

Avoid long-lived divergent branches and duplicate PRs. Keep unrelated changes separate. Do not opportunistically refactor stable behavior while fixing a local blocker.

Main should remain as close to shippable as practical.

## 10. Automation as Release Memory

Repeated release/build/test/package checks should live in deterministic automation rather than Founder memory.

Where appropriate, CI/pipeline should automatically perform relevant lint/build/tests/package/integrity checks and expose clear pass/fail evidence.

Founder should not have to remember a long sequence of terminal commands for normal engineering delivery.

Do not add infrastructure merely to automate a rare step; automate high-frequency/repeatable work first.

## 11. Progressive Exposure

Prefer small controlled runtime exposure over large unverified releases.

Use the smallest blast radius appropriate to CWS scale: local/controlled host, staging, one Worker, one representative real frame/job, then broader scope only after evidence passes.

Rollback/recovery must be easier than a big-bang change.

Do not scale to Worker 2 or broader fleet behavior merely because code tests pass; require the current one-Worker/runtime gate first when applicable.

## 12. Flow Metrics

CWS engineering success is not measured by number of prompts, documents, branches, commits, tests, or hours an agent runs.

Track or make observable where practical:

1. Lead Time to Evidence — time from hypothesis/start to new meaningful runtime/integration evidence.
2. Blocker Age — how long the current P0 first failing boundary remains unresolved.
3. Rework Ratio — repeated work/checks that do not create new evidence.
4. Change Failure Rate — changes that regress previously verified behavior.
5. Recovery Time — time to restore known-good behavior after a regression.

Use metrics to reduce delay, not to create reporting ceremony.

## 13. Development Observatory Boundary

Development Observatory is useful when it exposes flow, but it is out-of-band and non-blocking.

V1 should prioritize five questions:

- What is the current Ship Goal?
- Which boundaries have passed?
- What is the first failing boundary?
- Who/what owns it?
- How old is the blocker / what is the next action?

Worker, Guard, render, Supabase runtime, B2 runtime, and customer portal must never depend on Observatory availability.

Do not let Observatory V2 polish block Track A real rendering.

## 14. Native and Interactive Path First

Before scripts, terminal plumbing, tokens, custom installers, or manual shell instructions:

1. already authenticated/installed capability;
2. native product UI or installed integration;
3. official interactive OAuth/browser/device flow;
4. existing CWS automation;
5. official CLI/API/SDK;
6. mature open source;
7. custom implementation.

Do not instruct Founder to manually type commands the agent can execute. Never print or commit secrets.

## 15. Systematic Debugging

Preferred loop:

`FIRST FAILURE -> ONE HYPOTHESIS -> ONE TEST -> SMALLEST SAFE CORRECTION -> RETEST FROM NEAREST SAFE CHECKPOINT`

Preserve passed evidence. Stop repeating unchanged checks. Resolve, escalate, or use an already-approved independent path.

## 16. Review Order

Review intent correctness, security/P0 safety, data integrity, state invariants, failure/retry behavior, concurrency, API compatibility, tests, performance, then style.

## 17. Stable Change Discipline

`STABLE FIRST -> CHANGE MINIMUM -> VERIFY REALITY -> NO OPPORTUNISTIC REFACTOR`

Do not modify verified stable behavior unless the current task requires it.

## 18. Candidate-Before-Canonical Experiment Rule

> **Canonical production code is not a laboratory.**

For material experimental behavior, especially Worker/render/security/runtime changes, test outside the canonical implementation first whenever practical.

Default pattern:

`CANONICAL -> TEMPORARY CANDIDATE/SHADOW PATH -> TEST -> REAL RUNTIME EVIDENCE -> PROMOTE MINIMAL PROVEN DIFF -> CANONICAL`

Rules:

1. Keep the current canonical implementation unchanged while the experiment is unproven.
2. Candidate/shadow implementations are temporary and must not become a second permanent product path.
3. Prefer moving experimental logic into small reusable modules rather than copying large canonical files.
4. If a full candidate copy is temporarily necessary, keep its scope narrow and time-bounded.
5. Compare candidate versus canonical behavior, complexity, dependencies, regressions, and runtime evidence.
6. Promotion requires relevant automated verification plus the highest practical runtime evidence for the changed boundary.
7. Promote only the smallest proven diff or reusable module. Do not blindly replace canonical code with the entire experiment.
8. If the candidate fails to justify itself, discard/reset it instead of contaminating canonical code.
9. After successful promotion, remove or reset the temporary candidate path so CWS does not accumulate parallel implementations.
10. Experimental work must preserve Founder boundaries, customer originals, security invariants, and previously verified behavior.

For Track A Worker experimentation, `cws_worker_full.py` remains canonical. A temporary candidate such as `cws_worker_full_candidate.py` may be used for bounded testing, but it must not become an independently maintained Worker.

Canonical shorthand:

`EXPERIMENT OFF CANONICAL -> PROVE -> PROMOTE MINIMAL DIFF`

## 19. Infrastructure and Security Defaults

Existing infrastructure first. New production infrastructure requires Founder approval.

Production fails closed at real auth/authorization/ownership/security boundaries. Never silently fall back to demo mode, anonymous authorization, guessed identity, or shared long-lived secret.

Track-specific proportional-security decisions remain owned by current canonical Worker/security documents; this Harness does not silently redefine them.

## 20. Learning Without Document Inflation

For meaningful failures record only durable reusable learning: symptom/evidence, root cause, fix, failed approach if useful, verification ceiling, remaining risk, next bottleneck.

Do not create a new report when an existing canonical log/status/spec can absorb the information cleanly.

`ONE FACT -> ONE CANONICAL OWNER`

### Action-Value Filter

Before any research, planning, documentation, audit, or repeated verification step, ask:

`Will this step create a new decision, necessary code change, or meaningful evidence?`

If the answer is NO, skip the step unless it is required by safety, compliance, or a Founder-controlled approval boundary.

Canonical rule:

> **If a step does not create a new decision, necessary code change, or meaningful evidence, remove it from the normal engineering path.**

This rule exists to reduce ceremony, duplicated grounding, repeated reports, and activity that looks productive but does not move the current Ship Goal.

## 21. Research Stop Rule

Research is a tool for changing a decision, selecting an implementation, or explaining a failure. Research is not progress by itself.

Before starting research, define:

- the decision it may change;
- the unknown it must resolve;
- the stop condition.

Stop research when enough evidence exists to make the next safe decision.

Do not continue broad research merely because more information exists.

Prefer:

`KNOWN ENOUGH TO ACT SAFELY -> EXECUTE -> MEASURE -> LEARN`

rather than:

`RESEARCH UNTIL NOTHING REMAINS UNKNOWN`.

## 22. Source-of-Truth and Routing

Read `CWS_SESSION_BOOTSTRAP.md` first and follow `CWS_KNOWLEDGE_ROUTER.yaml`.

Use progressive disclosure: load governance/source-of-truth entry layer, then only task-relevant detail. Do not ground the entire repository repeatedly without staleness or a task-specific need.

Current Founder decisions override stale handoffs, but material decisions must be synchronized into their canonical owner.

## 23. CWS-Specific Binding

Track A operational/revenue work remains focused on real rendering and revenue evidence according to current `CURRENT_STATUS.md`, `CWS_WORKER_TRACKS.md`, `DECISIONS.md`, and runtime evidence.

Do not allow Track B fleet/provisioning architecture, Development Observatory, UI polish, or unrelated research to become a prerequisite for the current Track A Ship Goal unless current evidence proves it is necessary.

`TRACK_A_REAL_RENDER_PASS != GOLDEN_E2E_PASS`

## 24. Anti-Patterns

Reject:

- coding before understanding the current failing boundary;
- planning after sufficient evidence already permits execution;
- full Spec Kit ceremony for every small reversible fix;
- repeated full-repo grounding without staleness;
- repeating already-verified checkpoints;
- multiple simultaneous P0 goals;
- long-lived divergent branches/duplicate PRs;
- research without a decision it can change;
- research that continues after the next safe action is already known;
- documentation created only to demonstrate activity;
- architecture rewrites to fix local defects;
- mocks/tests presented as runtime proof;
- terminal-first auth when official authenticated/UI paths exist;
- asking Founder to perform commands the agent can execute;
- adding infrastructure before measuring the current bottleneck;
- creating duplicate implementations when one configurable canonical implementation can serve multiple Jobs;
- optimizing for hypothetical future scale while current real-customer runtime still fails;
- experimenting directly inside canonical production code when a bounded candidate/shadow path can prove the change safely;
- allowing a temporary candidate to become a second permanent Worker implementation.

## 25. Final Rule

> **Move fast inside a narrow evidence-backed box. Use the simplest effective method. Ship the smallest verified customer/runtime outcome. Stop only at the edge of Founder authority or a real external/safety boundary.**
