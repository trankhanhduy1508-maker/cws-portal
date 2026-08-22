# CWS SESSION BOOTSTRAP

> Purpose: deterministic startup instructions for a new ChatGPT/Codex/AI session working on CWS.
> Status: canonical session entrypoint and routing document only. It does not override current Founder decisions, runtime evidence, code, schema, applied migrations, or domain authorities.
> Last updated: 2026-08-22.

## 1. Why this file exists

A new AI session may have partial Project memory, stale conversation memory, or no reliable memory of the latest CWS state.

Do not solve this by trusting memory more or by rereading the entire repository.

Use this recovery model:

`Project memory = supporting context`

`GitHub + current runtime evidence = current source of truth`

`CWS_KNOWLEDGE_ROUTER.yaml = catalog for finding the smallest correct source set`

`CWS_ACTIVE_GOAL.md = small pointer to the currently approved execution focus when one exists`

The session must reconstruct the current state from the repository without requiring the Founder to repeat project history and without loading unrelated historical material into context.

## 2. Canonical repository

Repository:

`trankhanhduy1508-maker/cws-portal`

Default branch:

`main`

Do not assume another CWS-like repository, local folder, old branch, generated bundle, old report, or previous chat is canonical unless current repository/runtime evidence explicitly proves it.

For any Git branch, pull request, reconciliation, or repository-cleanup task, read and apply `CWS_BRANCH_HYGIENE_POLICY.md` before creating a new branch or deciding that an old branch is still active knowledge.

Default branch behavior:

`REUSE EXISTING ACTIVE BRANCH > UPDATE EXISTING PR > CREATE NEW BRANCH`

`main` owns canonical knowledge after merge; merged/closed/superseded branches are cold history unless a task explicitly requires them.

## 3. Mandatory fast-grounding sequence

Before recommending, coding, merging, deploying, changing workflow, or making a material technical claim:

1. Read this file completely.
2. Read `CWS_KNOWLEDGE_ROUTER.yaml` completely.
3. Read `CURRENT_STATUS.md` completely.
4. Read `CWS_ACTIVE_GOAL.md` completely.
5. If the current Founder request continues/resumes/finishes/debugs/verifies the active execution goal, read the referenced Goal Contract completely.
6. Classify the current task by domain/topic.
7. Follow the router to the minimum authoritative/current sources required for that task.
8. Apply `CWS_FOUNDER_CHALLENGE_REMINDER_RULE.md`: perform the material Founder Check and lightweight reminder/intention-drift scan.
9. Inspect exact current code/tests/schema/runtime evidence when the claim depends on implementation or production state.
10. Apply grounding/staleness/Founder-boundary rules before mutation.
11. Auto-route the smallest fitting gstack capability under `CWS_GSTACK_AUTO_ROUTING_RULE.md` when applicable.
12. Expand into historical/research/legacy material only when current sources conflict, remain insufficient, or root-cause/regression archaeology requires it.
13. Report the recovered current state to the Founder before the first mutation of a new session.

Canonical startup sequence:

`BOOTSTRAP -> ROUTER -> CURRENT STATUS -> ACTIVE GOAL -> GOAL CONTRACT WHEN APPLICABLE -> CLASSIFY -> FOUNDER CHECK/REMINDER -> FILTER/RANK -> READ MINIMUM -> GSTACK -> EXECUTE/VERIFY -> EXPAND ONLY IF NEEDED`

Do **not** begin a normal task by reading the entire repository.

An active execution goal does not silently replace project-level priority in `CURRENT_STATUS.md`.

## 4. Governance that always applies

The following governance remains binding even when its full text is not loaded into the initial context window:

- `AGENTS.override.md`
- `AGENTS.md`
- `AGENTS02.md`
- `FOUNDER_RULES.md`
- `CWS_ACTIVE_GOAL.md`
- `CWS_GOAL_CONTRACT_LIFECYCLE.md`
- `CWS_FOUNDER_CHALLENGE_REMINDER_RULE.md`
- `CWS_GSTACK_AUTO_ROUTING_RULE.md`
- `CWS_AI_GOAL_OWNERSHIP_POLICY.md`
- `CWS_AI_ENGINEERING_HARNESS_V1.md`
- `CWS_AI_REASONING_DISCIPLINE_V1.md`
- `CWS_GROUNDING_POLICY.md`
- `CWS_STALENESS_GUARD.md`
- `CWS_BRANCH_HYGIENE_POLICY.md` for Git branch/PR/repository-hygiene tasks
- `.specify/memory/constitution.md`
- `CWS_EXECUTION_FUNNEL.md`

Read any of these completely when:

- the router selects it;
- the task is governance/AI-engineering related;
- the active Goal Contract or Founder Check requires its exact wording;
- a Founder approval boundary is unclear;
- an architecture/security/payment/data/product decision may change;
- a conflict or staleness decision requires the exact rule;
- implementation is about to cross a Founder-controlled boundary;
- the task creates, reuses, reconciles, closes, or cleans Git branches/PRs.

The goal is not to weaken governance. The goal is to stop repeatedly loading the same large governance corpus when its detailed wording is unrelated to the current task.

### Goal Contract operating model

Long Founder discussion is raw intent, not canonical execution authority.

For material goals, use `CWS_GOAL_CONTRACT_LIFECYCLE.md` and the template at `goals/GOAL_CONTRACT_TEMPLATE.md`.

Core split:

`FOUNDER = WHAT / WHY / DONE / HARD BOUNDARIES`

`AI/CODEX = TECHNICAL PATH / RESEARCH / DIAGNOSIS / IMPLEMENTATION / VERIFICATION`

Once a Goal Contract is approved and active, prompts should cue the contract rather than restating the whole discussion. Routine blockers remain AI-owned under `CWS_AI_GOAL_OWNERSHIP_POLICY.md`.

### Founder Challenge + Reminder operating model

For material work, AI must actively check whether the Founder premise shows meaningful perfectionism, over-engineering, scope creep, sunk-cost reasoning, confirmation bias, idea distraction, evidence gaps, wrong metrics, customer distance or unproven root cause.

When material, report `FOUNDER CHECK - <RISK>` with the trade-off/evidence and a smaller or better test. When no material issue exists, use `FOUNDER_CHECK = NONE` when the status is being reported.

Before goal-level ship/completion, perform `FOUNDER RECHECK` against the actual Goal Contract.

Perform only a lightweight reminder scan. A relevant forgotten idea or due activation trigger may be surfaced, but:

`REMINDER != APPROVAL != PRIORITY CHANGE`

Do not let reminders hijack the active execution goal.

### Canonical AI engineering execution workflow - gstack

For normal CWS engineering execution, use this official workflow:

`CWS AUTHORITY -> GSTACK SKILL FIT FOR THE TASK -> IMPLEMENTATION -> TEST/RUNTIME EVIDENCE -> SHIP`

Default gstack capability mapping:

- bug / root-cause investigation -> `investigate`
- code review -> `review`
- QA -> `qa`
- security review -> `cso`
- release / shipping -> `ship`
- learning / retrospective -> `retro` + `learn`

GitHub Spec Kit remains available for **material specification work only**. It is not a mandatory ceremony for ordinary bounded bugs, diagnostics, reviews, QA, or small implementation work.

Superpowers is not a mandatory CWS execution layer. Do not add it back into normal routing when gstack already provides the required capability.

The purpose is to reduce competing process layers, not add gstack as another layer. Prefer one appropriate gstack capability over reimplementing an equivalent generic engineering workflow in CWS documentation or prompts.

CWS-specific authority always remains above gstack. Founder decisions, active Goal Contracts, domain authorities, security boundaries, immutable customer-original rules, evidence levels, runtime truth, and explicit approval boundaries cannot be overridden by a gstack skill.

The engineering execution path should therefore stay simple:

`GROUND CWS -> ACTIVE GOAL -> FOUNDER CHECK/REMINDER -> APPLY CWS AUTHORITY -> USE THE SMALLEST FITTING GSTACK SKILL -> IMPLEMENT MINIMUM -> VERIFY WITH REAL EVIDENCE -> FOUNDER RECHECK -> SHIP -> SYNC DURABLE LEARNING`

Default tool-first order:

`NATIVE OS / INSTALLED TOOL -> EXISTING REPO TOOL -> EXISTING GSTACK SKILL -> OFFICIAL CLI/API -> MATURE OPEN-SOURCE TOOL -> CUSTOM IMPLEMENTATION LAST`

For system administration, security, dependency setup, debugging, diagnostics, automation, and similar tasks, explicitly check native/installed capabilities before creating custom scripts. On Windows this includes relevant built-in or installed mechanisms such as Microsoft Defender/Windows Security, Event Logs, Task Scheduler, package managers, vendor utilities, and existing CWS bootstrap tooling when applicable.

### Prompt transport safety rule

When ChatGPT/AI generates an execution prompt that the Founder may copy through a phone, remote-control app, remote desktop session, clipboard bridge, or VS Code/Codex input box, optimize the prompt for transport reliability rather than visual decoration.

Rules:

- Prefer plain ASCII text for structural formatting.
- Use short headings such as `PHASE 1 - GROUND`, `PHASE 2 - EXECUTE`, `PHASE 3 - VERIFY`.
- Do not use long decorative separator runs such as repeated `=`, `-`, `_`, box-drawing characters, ornamental Unicode, or other visually decorative filler.
- Avoid unnecessary special symbols when ordinary text communicates the same instruction.
- Preserve exact technical strings when required, including file paths, hashes, commands, identifiers, URLs, and code.
- Keep prompts directly copy/pasteable into VS Code/Codex without requiring the Founder to clean formatting manually.
- If malformed input appears after copy/paste, treat transport/clipboard/remote-input corruption as a competing hypothesis before attributing the input to malware, automation, or another actor.

Prompt quality is measured by reliable execution, not decorative formatting.

### Mandatory critical-thinking contract

The AI is not a passive command executor.

Founder remains final decision-maker for material product/workflow/architecture/business choices inside mandatory safety/governance boundaries. The AI must challenge a premise when current evidence indicates perfectionism, over-engineering, scope drift, sunk-cost reasoning, confirmation bias, unsupported assumptions, premature scaling, or customer/revenue detours.

Required reasoning shape:

`UNDERSTAND INTENT -> SEE SYSTEM -> GROUND -> ACTIVE GOAL -> CHALLENGE -> REUSE/WIDEN SCAN -> DIAGNOSE -> FALSIFY CHEAPLY -> SMALLEST EXPERIMENT -> IMPLEMENT ONLY IF NEEDED -> VERIFY -> FOUNDER RECHECK -> LEARN`

If 3 materially similar attempts fail or activity is cycling without new evidence:

`STOP -> RE-GROUND -> WIDEN SEARCH -> RECLASSIFY -> PIVOT`

## 5. Knowledge routing and authority

Use `CWS_KNOWLEDGE_ROUTER.yaml` to classify:

- domain;
- authority rank;
- lifecycle;
- mandatory sources;
- task-local search targets;
- cold-memory expansion conditions.

The router is a **catalog**, not an encyclopedia and not a competing product authority.

Core authority behavior:

`direct current runtime/config/DB/applied-migration evidence`

`> current explicit Founder decision / applicable canonical domain authority`

`> approved active Goal Contract for intent and Definition of Done`

`> active task/spec`

`> current supporting reference/evidence`

`> research/hypothesis`

`> historical/legacy/superseded material`

For product/business/workflow/architecture intent, current explicit Founder decisions and the applicable canonical domain authority remain binding under CWS governance.

A Goal Contract must not override a newer explicit Founder decision or a higher-level domain authority outside its approved scope.

Never silently choose between materially conflicting active sources. Apply `CWS_GROUNDING_POLICY.md` and `CWS_STALENESS_GUARD.md`, report the conflict, and obtain Founder clarification where product intent cannot be proven from current authority/evidence.

## 6. Current-source routing examples

Use the router instead of a universal fixed read-all list.

Examples:

- Continue an approved active goal -> read `CWS_ACTIVE_GOAL.md` -> referenced Goal Contract -> current domain route/evidence -> Founder Check/Reminder -> gstack.
- Customer/input issue -> Customer route -> current workflow + Spec 008 + exact input/backend tests/runtime evidence.
- Worker/provisioning issue -> Worker route -> Spec 009 + exact Node Agent/Worker/backend/runtime evidence.
- Security issue -> Security route -> `CWS_SECURITY_MASTER_INDEX.md` then only the specialist security files required.
- Payment issue -> Payment route -> current payment decisions/workflow + exact code/schema/runtime evidence.
- Database issue -> Database route -> applied migrations/DB evidence + schema/code relevant to the exact contract.
- Business/Revenue Bridge issue -> Business or Revenue Bridge route -> Founder Rules + relevant business/legacy/security evidence.
- Legacy audit -> current canonical comparator + exact legacy material; legacy does not become canonical merely because it is being read.
- Git/branch/PR task -> `CWS_BRANCH_HYGIENE_POLICY.md` + current `main` + only task-relevant open PRs/active branches; do not treat every remote branch as current work.

Historical reports, old/completed specs, changelogs, experiments, old directives and legacy runtime material are **search-only by default** unless the active task explicitly requires them.

## 7. Repository-inventory rule

A system-level recovery/audit task may inventory the repository structure first, but inventory is for routing/classification, not for dumping every file into context.

Required pattern:

`REPOSITORY INVENTORY -> AUTHORITY/LIFECYCLE CLASSIFICATION -> ROUTING MAP -> MANDATORY FULL READS -> TASK-RELEVANT DEEP READS`

When the task is narrow, skip broad inventory and follow the router directly.

## 8. Project memory rule

Project/chat memory can help recover Founder preferences, continuity, likely document names and previous hypotheses.

It must NOT be treated as proof of current:

- code state;
- branch/PR state;
- production deployment;
- database schema;
- Worker status;
- CI result;
- product workflow;
- security posture.

Long discussion should be distilled into the approved Goal Contract when it contains durable execution intent. The chat itself remains supporting context, not canonical runtime truth.

If memory and GitHub/runtime evidence disagree, current evidence wins unless the Founder explicitly provides a newer decision.

## 9. Production must work with AI offline

AI may build, diagnose, review, test, research and document CWS. It is not a normal production control-loop dependency.

Canonical deterministic direction remains:

`Customer -> Backend -> Database/Scheduler -> Node Agent -> Worker Engine -> Blender -> B2 -> price/payment state -> authorized delivery`

Natural-language AI judgement must not be authoritative for authentication/authorization, task ownership, lease/generation fencing, payment confirmation, download unlock, deterministic lifecycle transitions, retries or cleanup.

## 10. Founder approval boundary

AI may choose ordinary implementation details only inside an already approved boundary.

Stop and obtain Founder approval before independently changing material items including:

- customer journey/public behavior;
- workflow ordering;
- pricing/payment/public SLA;
- authentication/authorization/security/trust boundaries;
- scheduler ownership semantics;
- storage/secret boundaries;
- destructive/incompatible data behavior;
- infrastructure topology/new production resources;
- governance/routing behavior that materially changes enforced CWS policy;
- material Goal Contract WHAT/WHY/DONE/hard-boundary changes;
- replacing the active execution goal with another Founder initiative.

When the Founder approves a material decision, synchronize the appropriate canonical source before dependent implementation proceeds.

A new idea/reminder never counts as this approval.

## 11. Verification language

Never collapse these into the same claim:

- code exists;
- code compiles;
- tests pass;
- CI passes;
- integration verified;
- deployment ready;
- production runtime verified;
- Golden E2E verified.

No current runtime evidence = no production-runtime claim.

Material claims should remain distinguishable as:

- `FACT`
- `INFERENCE`
- `HYPOTHESIS`
- `UNKNOWN`

Manual Revenue Bridge success must never be reported as canonical Golden E2E success.

A Goal Contract Definition of Done may require visual/customer/operator evidence beyond technical validity. Meet the actual contract rather than a proxy.

## 12. Cold-memory rule

Retain historical knowledge but do not load it by default.

Cold/search-only categories include:

- historical reports/status snapshots;
- completed/old specs;
- closed/superseded Goal Contracts when not relevant;
- changelogs;
- research notes and startup case studies;
- experimental/sandbox material unrelated to the active task;
- legacy Worker/launcher material;
- old session/directive files;
- historical Engineering Learning Log entries;
- merged/closed/superseded Git branches when the task does not explicitly require them.

Expand into cold memory only when:

- current sources conflict;
- a required fact remains `UNKNOWN`;
- root-cause investigation needs historical evidence;
- regression archaeology is needed;
- an active source explicitly routes there.

Do not delete history merely to reduce context. Route around it.

## 13. Engineering Learning Log

`ENGINEERING_LEARNING_LOG.md` is a historical learning database, not a universal mandatory full-read at session start.

Read/search relevant entries when investigating recurring failures, previous attempts, regressions or root causes.

Repeated durable lessons should be promoted into current rules/governance so future sessions do not need to reread the entire historical log to recover the same lesson.

Repeated materially similar Founder Check patterns may be proposed as `FOUNDER PATTERN` standing rules under `CWS_FOUNDER_CHALLENGE_REMINDER_RULE.md`, but governance promotion still requires Founder approval.

## 14. Implementation funnel

Routing completion is not implementation permission.

Normal bounded engineering execution follows:

`GROUND -> ACTIVE GOAL WHEN APPLICABLE -> FOUNDER CHECK/REMINDER -> CWS AUTHORITY -> GSTACK SKILL -> IMPLEMENT MINIMUM -> TEST/RUNTIME EVIDENCE -> FOUNDER RECHECK -> SHIP -> SYNC/LEARN`

When the change is material specification work, insert Spec Kit before implementation:

`GROUND -> ACTIVE GOAL -> FOUNDER CHECK -> CWS AUTHORITY -> SPEC KIT -> GSTACK EXECUTION AS NEEDED -> IMPLEMENT -> VERIFY -> FOUNDER RECHECK -> SHIP -> SYNC/LEARN`

Do not weaken tests/security/fencing/integrity controls merely to obtain a successful run.

## 15. New-session recovery report

Before the first mutation in a new session, give the Founder a concise Vietnamese report containing, as applicable:

1. Current phase/project-level priority.
2. Active execution goal + `GOAL_READY` when applicable.
3. Current highest-priority bottleneck/business question for the requested task.
4. Last verified state + evidence level.
5. What remains unverified.
6. Active task/spec/PR when confirmed.
7. Material conflict/staleness discovered.
8. `FOUNDER CHECK` result.
9. Relevant `FOUNDER REMINDER` / intent-drift result, or `NONE` when useful.
10. Selected gstack capability when applicable.
11. Next smallest safe action.
12. Founder approval/human boundary.

The report proves that the session found the right books; it does not prove the session read the whole library.

## 16. Grounding stop condition

Grounding is sufficient when the AI can state, with evidence:

- current task/domain;
- applicable authoritative sources;
- active execution goal/Definition of Done when relevant;
- relevant current state;
- material conflicts/staleness;
- what remains unknown;
- Founder Check/Reminder status when material;
- next smallest safe action.

Do not continue reading unrelated material merely to increase context size.

## 17. New-chat command

A new CWS chat can still start with:

`Ground CWS from GitHub. Read CWS_SESSION_BOOTSTRAP.md first and follow it. Report current state before doing anything.`

That command is intentionally sufficient.

The Founder does not need to restate the Goal Contract, Founder Challenge/Reminder rules, or `use gstack` in every new prompt. The repository startup flow must recover them automatically.

For a compact Codex execution handoff after grounding, the default form is:

```text
Ground current CWS GitHub + local runtime evidence.
Read CWS_ACTIVE_GOAL.md and the referenced Goal Contract if applicable.
Apply CWS authority, Founder Challenge/Reminder rules and automatic gstack routing.
Own the technical path until the Goal Contract Definition of Done is verified or a true human boundary is reached.
```

## 18. Core principle

CWS should scale by improving retrieval, not by forcing every new AI session to remember more.

`DISCUSS DEEPLY -> DISTILL CLEARLY -> APPROVE ONCE -> EXECUTE AUTONOMOUSLY -> VERIFY AGAINST THE REAL GOAL -> LEARN`

`DO NOT READ THE LIBRARY. READ THE CATALOG, THEN THE ACTIVE GOAL AND THE RIGHT BOOKS.`
