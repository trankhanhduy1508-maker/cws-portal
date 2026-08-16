# CWS CODEX OVERRIDE - Research Build Verify Loop

> Status: MANDATORY CODEX PROJECT INSTRUCTION
> Scope: AI-assisted engineering behavior only
> Approved by Founder: 2026-08-17

This file supplements existing CWS governance. It does NOT replace or weaken:

- AGENTS.md
- AGENTS02.md
- FOUNDER_RULES.md
- CWS_AI_ENGINEERING_HARNESS_V1.md
- CWS_AI_REASONING_DISCIPLINE_V1.md
- CWS_GROUNDING_POLICY.md
- CWS_STALENESS_GUARD.md
- Founder approval boundaries
- Stable Change Discipline
- current source-of-truth and runtime evidence

When this file conflicts with a higher-authority current Founder decision or canonical CWS authority, follow the higher-authority source and report the conflict.

## 1. Default AI engineering loop

Use this loop for non-trivial CWS engineering:

`RESEARCH -> DECIDE -> BUILD -> VERIFY -> LEARN`

Do not collapse all five roles into one impulsive coding step.

Research narrows the solution space.
Decision selects the smallest justified approach.
Build implements only the approved scope.
Verify independently checks behavior and evidence.
Learn preserves reusable discoveries in canonical project knowledge.

## 2. Mandatory solution scan before custom code

Before custom-building a non-trivial generic capability, check in this order:

1. Native OS or installed capability.
2. Existing CWS code, script, config, test, bootstrap, report, or dependency capability.
3. Existing installed skill or approved plugin.
4. Official CLI, API, SDK, vendor-supported mechanism, or platform feature.
5. Mature open-source implementation with relevant operational evidence.
6. Custom implementation last.

Compact rule:

`NATIVE/INSTALLED -> EXISTING CWS -> EXISTING SKILL -> OFFICIAL CLI/API/SDK -> MATURE OPEN SOURCE -> CUSTOM LAST`

Classify the selected solution as:

`CONFIGURE | INTEGRATE | ADAPT | BUILD`

Default preference:

`CONFIGURE -> INTEGRATE -> ADAPT -> BUILD`

Popularity or GitHub stars are discovery signals, not trust proof.

## 3. Research-first trigger

Route to Research before custom implementation when any of these is true:

- the problem is generic/common;
- several credible solution families exist;
- a new queue, installer, scanner, updater, orchestrator, remote-control mechanism, scheduler, service, or infrastructure component is being invented;
- repeated attempts have not moved the failing boundary;
- the agent is unsure whether an existing/native/official/mature capability already solves the problem;
- a custom solution appears unusually quickly for a common engineering problem.

A narrow defect with a proven root cause and a minimal fix does not need a broad research detour.

If a Builder cannot justify the solution family, report:

`BLOCKED: SOLUTION FAMILY UNCLEAR -> ROUTE TO RESEARCH`

Do not silently improvise a broad custom architecture.

## 4. Specialist Codex ownership

When CWS uses specialist Codex sessions, use non-overlapping primary ownership:

### WORKER
Owns:

- Track A render pipeline
- cws_worker_full.py and Worker launcher/update behavior
- Blender execution
- render task execution
- output handling
- Worker bundle/release behavior
- B2 render/output behavior

WORKER does not independently redesign Guard policy, customer workflow, scheduler architecture, or unrelated security boundaries.

### GUARD
Owns:

- RENTED_MACHINE_GUARD_V1
- rented-machine lifecycle
- process blocking/protection policy
- customer notice and cooldown
- lease/stale lease handling
- RELEASE restoration

GUARD does not independently redesign Blender/render logic or broader Worker architecture.

### VERIFIER
Default mode:

`READ + TEST + REVIEW`

Owns:

- independent diff/PR review
- regression checks
- evidence classification
- scope-creep detection
- checking whether tests prove the claimed contract
- merge recommendation

VERIFIER must not quietly become the Builder while claiming independent review. If a defect exists, report exact evidence and the smallest correction unless Founder explicitly assigns implementation.

### RESEARCH
Owns:

- native/existing capability discovery
- official documentation/tool discovery
- mature open-source research
- solution-family comparison
- recommendation/specification
- tool-first experiments when safe and supported

RESEARCH does not mutate stable production runtime by default.

## 5. One primary owner per change

One material change has one primary implementing owner.

A second specialist may review, research, or advise, but agents should not concurrently modify the same responsibility unless Founder explicitly assigns joint ownership.

If a task crosses ownership boundaries:

1. identify the primary owner;
2. identify the dependency;
3. route research/review to the other specialist;
4. avoid parallel overlapping edits.

## 6. Verifier checks method quality, not only green tests

For material changes, especially Worker updater, Guard, security, workflow, architecture, payment, or broad runtime changes, independent verification should ask:

- Was an existing/native/official capability ignored without evidence?
- Did the Builder reinvent a solved problem?
- Was unrelated stable code modified?
- Did scope expand beyond the approved task?
- Do tests exercise the real contract or merely prove a mock/reimplementation?
- Are rollback/failure cases covered where material?
- Are evidence levels correctly separated?
- Is the change safe to merge based on direct evidence?

The producing agent's confidence is not verification evidence.

## 7. Stable code remains an asset

Research-first does not authorize modernization for its own sake.

If current behavior is verified and the task does not require changing it:

`DO NOT CHANGE IT.`

Use existing Stable Change Discipline:

`STABLE FIRST -> CHANGE MINIMUM -> VERIFY REALITY -> ROLLOUT GRADUALLY -> OBSERVE -> EXPAND ONLY WHEN PROVEN`

Research should reduce unnecessary custom work, not create reasons to rewrite working code.

## 8. Learning loop

When a verified task produces a reusable engineering lesson, preserve it in existing canonical learning/governance rather than leaving it only in chat history.

Use this compact structure when useful:

`PROBLEM`
`BAD DEFAULT`
`BETTER PATTERN`
`WHEN TO USE`
`EVIDENCE`

Prefer updating ENGINEERING_LEARNING_LOG.md or an existing authoritative governance/reference file over creating duplicate documents.

Repeated AI failure should improve the rule, skill, eval, or harness, not only the one prompt.

## 9. Examples

Before writing custom antivirus/security scanning logic:
check native Windows Security/Defender and the approved scanner path first.

Before writing a new installer/bootstrap:
check existing CWS bootstrap/dev-setup and package-manager mechanisms first.

Before building a custom code graph:
try the approved mature CodeGraph path when the environment supports it.

Before inventing a task queue or worker claim protocol:
inspect existing database, scheduler, lease, atomic-claim, and generation-fencing capabilities first.

Before adding a new service:
prove that the current architecture cannot meet the grounded requirement without it.

## 10. Production boundary

AI may research, build, test, review, diagnose, and document CWS.

Normal production CWS operation must remain deterministic and operable with AI offline.

Do not put natural-language AI judgment into payment, authorization, job/worker state, lifecycle transitions, retries, cleanup, delivery unlock, or other deterministic production control-loop decisions.

## 11. Design authority

Detailed approved rationale:

`docs/superpowers/specs/2026-08-17-research-build-verify-governance-design.md`

Implementation plan:

`docs/superpowers/plans/2026-08-17-research-build-verify-governance.md`
