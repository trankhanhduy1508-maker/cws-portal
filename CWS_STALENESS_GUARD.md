# CWS Staleness Guard

> Mandatory semantic-drift gate for every AI agent working on CWS.

## Purpose
CWS changes quickly. A document can remain syntactically valid while its product direction, status, architecture assumptions, workflow order, or implementation guidance has become obsolete. Agents must detect that drift before using the document as authority.

## Mandatory timing
Run this guard:
1. at the start of every work cycle, immediately after reading `CURRENT_STATUS.md` and before trusting `CWS_ROADMAP.md` or other governing docs;
2. whenever newer code/schema/runtime evidence conflicts with prose;
3. after any explicit Owner decision that changes product/workflow/architecture direction;
4. during Converge/Verify before a task is declared DONE.

## What counts as suspected staleness
A document is **SUSPECTED STALE** when one or more of these are true:
- it conflicts with a later explicit Founder/Owner decision;
- it conflicts with current runtime evidence, applied schema, production configuration, or verified code behavior;
- it references a roadmap/file/component that has been superseded or removed from active source of truth;
- it describes a milestone/status/blocker that newer evidence has already changed;
- it instructs an old workflow/state order that differs from the canonical workflow;
- it requires a manual/AI step that newer CWS rules made autonomous;
- it assumes a credential, scheduler, storage boundary, auth model, payment order, Worker contract, or infrastructure dependency that later decisions replaced;
- two active governing documents cannot both be true at the same time.

**File age alone is NOT proof of staleness.** A six-month-old invariant may still be correct; a one-hour-old document may already be wrong after a later decision.

## Required comparison set
For the current task, compare the relevant instruction against:
- latest explicit Owner decisions recorded in `DECISIONS.md`;
- `CURRENT_STATUS.md`;
- canonical `CWS_ROADMAP.md`;
- `CWS_MVP_WORKFLOW_FINAL.md` when customer ordering is involved;
- applied migrations/runtime schema when data contracts are involved;
- current code/tests;
- newest relevant production/runtime evidence under `reports/`;
- current architecture/security/scale docs for the affected boundary.

## Severity and behavior

### BLOCKING STALE-DOC ALERT
Use when the suspected stale instruction can materially change the current task, including product scope, customer workflow, payment, auth, security, architecture, data ownership, Worker behavior, storage, deployment, or pricing.

The agent MUST:
1. stop implementation that depends on the suspect instruction;
2. report the conflict to the Founder;
3. show the old instruction, the newer conflicting evidence/decision, and why both cannot be true;
4. propose the smallest reconciliation;
5. wait for Founder confirmation when product intent cannot be proven from existing authoritative evidence.

The agent MUST NOT silently choose whichever document is convenient.

### NON-BLOCKING STALE-DOC WARNING
Use when the mismatch is outside the current task and cannot affect its correctness/security.

The agent MUST report it in the current response/learning log, but may continue unrelated safe work. It must not silently edit product intent without authority.

## Standard Founder report format

```text
STALE-DOC ALERT — [BLOCKING | NON-BLOCKING]
Suspect file/section: <path + section>
Old instruction: <short summary>
Conflicting newer source: <decision/evidence/code/schema path>
Why it looks stale: <1-3 sentences>
Impact if followed: <what would go wrong>
Recommended reconciliation: <smallest change>
Founder decision needed: <YES/NO + exact question if YES>
```

Keep the alert concise enough that the Founder can answer with a short confirmation such as `đúng`, `sai`, or a corrected rule.

## Automatic reconciliation boundary
An agent MAY automatically reconcile purely factual/status drift when the newer state is unambiguous and evidence-backed, for example:
- a blocker is demonstrably resolved;
- a file/reference was renamed or superseded;
- CURRENT_STATUS contains historical details that belong in reports;
- a milestone label is contradicted by direct current evidence.

An agent MUST ask/report before changing ambiguous product intent, business rules, pricing policy, customer experience, security posture, or architectural direction.

## Converge/Verify staleness sweep
Before DONE, ask:
- Did this change make any roadmap item inaccurate?
- Did it change the next bottleneck?
- Did it supersede an ACTIVE decision?
- Did it change workflow order or state transitions?
- Did it make PROJECT_CONTEXT inaccurate?
- Did it invalidate an architecture/security assumption?
- Did it leave references to removed/superseded files?

If YES, sync the affected active docs in the same work cycle. Historical reports remain historical and should not be rewritten merely to look current.

## Core rule
**Never let an old document pull CWS back into an old architecture. Detect drift first, report it, reconcile the active source of truth, then continue.**