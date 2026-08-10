# CWS Grounding Policy

> Mandatory evidence-grounding gate for every AI agent working on CWS.

## Purpose
CWS decisions must be based on verifiable current evidence, not memory, plausible language, stale chat context, or unsupported inference.

## Mandatory timing
Run this grounding gate:
1. immediately after `CURRENT_STATUS.md` and before trusting roadmap/workflow/decisions;
2. before Diagnosis/Root Cause/Specify;
3. before any architecture/security/payment/product recommendation;
4. before implementation that depends on a factual assumption;
5. during Converge/Verify before any DONE or production claim.

## Evidence hierarchy
Use the strongest applicable evidence first:
1. explicit current Founder/Owner decision;
2. direct production/runtime evidence and production configuration;
3. applied schema/migrations and authoritative database state;
4. current code + relevant tests;
5. canonical active documents (`CWS_ROADMAP.md`, workflow, decisions, architecture);
6. current evidence reports under `reports/`;
7. external primary/official documentation when repository evidence is insufficient;
8. inference/hypothesis only when clearly labeled.

A lower tier must not override a contradictory higher tier without an explicit reconciliation.

## Claim labels
Every material claim used to drive implementation should be mentally classified as one of:
- `FACT` — directly supported by current evidence;
- `INFERENCE` — reasoned conclusion from cited facts, not directly observed;
- `HYPOTHESIS` — falsifiable explanation requiring verification;
- `UNKNOWN` — insufficient evidence.

Do not write UNKNOWN as FACT. Do not promote INFERENCE or HYPOTHESIS into a production claim.

## Production truth rule
`CODE VERIFIED`, `SIMULATION VERIFIED`, and `PRODUCTION RUNTIME VERIFIED` are different evidence levels.

A build, unit test, simulation, deployment-ready status, heartbeat, or historical success cannot prove a current production E2E state. Production claims require current traceable production evidence for the affected stage.

## Grounding packet for material changes
Before implementation, establish a compact grounding packet:
- Claim/decision being relied on;
- Evidence path/source;
- Evidence level;
- Freshness/relevance to the current task;
- Any conflicting evidence;
- Result: FACT / INFERENCE / HYPOTHESIS / UNKNOWN.

This may live in the Spec Kit artifact/report rather than a separate file.

## Conflict behavior
When sources conflict:
1. do not average them;
2. do not silently pick the source that makes implementation easier;
3. apply the evidence hierarchy and Staleness Guard;
4. if product intent/business/security direction remains ambiguous, issue a BLOCKING Founder question;
5. if factual runtime state is resolvable from direct evidence, reconcile automatically and record the evidence.

## External research
When CWS needs facts outside the repository:
- prefer official/primary sources for technical/security/API behavior;
- record the relevant conclusion and source in the spec/report;
- do not let external guidance silently override CWS product decisions;
- turn accepted external learning into an explicit repository rule/decision before it becomes an implementation dependency.

## Pre-DONE Grounding Sweep
Before DONE, verify:
- Are all material status claims supported by the correct evidence level?
- Did we accidentally convert a hypothesis into a fact?
- Is the current bottleneck directly observed or merely guessed?
- Does any claimed runtime state rely only on code/tests/simulation?
- Did a newer Founder decision or runtime result invalidate an assumption?
- Are UNKNOWN items labeled NEEDS_VERIFICATION/BLOCKED instead of DONE?

If any answer fails, do not declare DONE; reconcile or downgrade the claim.

## Relationship to Staleness Guard
Grounding asks: **"What evidence proves this claim now?"**
Staleness Guard asks: **"Does an active document still match that evidence?"**

Both are mandatory. Ground first, then use the grounded comparison to detect semantic drift.

## Core rule
**No evidence, no certainty. No current runtime evidence, no production claim.**
