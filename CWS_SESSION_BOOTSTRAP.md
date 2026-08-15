# CWS SESSION BOOTSTRAP

> Purpose: deterministic startup instructions for a new ChatGPT/Codex/AI session working on CWS.
> Status: canonical session entrypoint and routing document only. It does not override current Founder decisions, runtime evidence, code, schema, applied migrations, or domain authorities.
> Last updated: 2026-08-15.

## 1. Why this file exists

A new AI session may have partial Project memory, stale conversation memory, or no reliable memory of the latest CWS state.

Do not solve this by trusting memory more or by rereading the entire repository.

Use this recovery model:

`Project memory = supporting context`

`GitHub + current runtime evidence = current source of truth`

`CWS_KNOWLEDGE_ROUTER.yaml = catalog for finding the smallest correct source set`

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
4. Classify the current task by domain/topic.
5. Follow the router to the minimum authoritative/current sources required for that task.
6. Inspect exact current code/tests/schema/runtime evidence when the claim depends on implementation or production state.
7. Apply grounding/staleness/Founder-boundary rules before mutation.
8. Expand into historical/research/legacy material only when current sources conflict, remain insufficient, or root-cause/regression archaeology requires it.
9. Report the recovered current state to the Founder before the first mutation of a new session.

Canonical startup sequence:

`BOOTSTRAP -> ROUTER -> CURRENT STATUS -> CLASSIFY -> FILTER -> RANK -> READ MINIMUM -> EXPAND ONLY IF NEEDED`

Do **not** begin a normal task by reading the entire repository.

## 4. Governance that always applies

The following governance remains binding even when its full text is not loaded into the initial context window:

- `AGENTS.md`
- `AGENTS02.md`
- `FOUNDER_RULES.md`
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
- a Founder approval boundary is unclear;
- an architecture/security/payment/data/product decision may change;
- a conflict or staleness decision requires the exact rule;
- implementation is about to cross a Founder-controlled boundary;
- the task creates, reuses, reconciles, closes, or cleans Git branches/PRs.

The goal is not to weaken governance. The goal is to stop repeatedly loading the same large governance corpus when its detailed wording is unrelated to the current task.

### External AI engineering skill source — Superpowers

For AI-assisted engineering, debugging, planning, verification, parallel-agent work, Git worktrees, or repeated development operations, treat the upstream repository below as an approved external skill source to inspect when relevant:

`https://github.com/obra/superpowers`

The purpose is not to copy the repository into CWS. The purpose is to let future ChatGPT/Codex/AI sessions discover and use mature existing skills instead of repeatedly inventing equivalent workflows from scratch.

When an applicable skill or existing tool is available, prefer actual invocation/execution of that capability over merely reading, summarizing, or reimplementing its contents.

Default tool-first order:

`NATIVE OS / INSTALLED TOOL -> EXISTING REPO TOOL -> EXISTING SKILL -> OFFICIAL CLI/API -> MATURE OPEN-SOURCE TOOL -> CUSTOM IMPLEMENTATION LAST`

For system administration, security, dependency setup, debugging, diagnostics, automation, and similar tasks, explicitly check native/installed capabilities before creating custom scripts. On Windows this includes relevant built-in or installed mechanisms such as Microsoft Defender/Windows Security, Event Logs, Task Scheduler, package managers, vendor utilities, and existing CWS bootstrap tooling when applicable.

External skills never override CWS governance. `FOUNDER_RULES.md`, `AGENTS.md`, security boundaries, canonical workflow/architecture authorities, runtime evidence, and explicit Founder decisions remain higher authority.

### Mandatory critical-thinking contract

The AI is not a passive command executor.

Founder remains final decision-maker for material product/workflow/architecture/business choices inside mandatory safety/governance boundaries. The AI must challenge a premise when current evidence indicates perfectionism, over-engineering, scope drift, sunk-cost reasoning, confirmation bias, unsupported assumptions, premature scaling, or customer/revenue detours.

Required reasoning shape:

`UNDERSTAND INTENT -> SEE SYSTEM -> GROUND -> CHALLENGE -> REUSE/WIDEN SCAN -> DIAGNOSE -> FALSIFY CHEAPLY -> SMALLEST EXPERIMENT -> IMPLEMENT ONLY IF NEEDED -> VERIFY -> LEARN`

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

`> canonical active authority for the affected domain`

`> active task/spec`

`> current supporting reference/evidence`

`> research/hypothesis`

`> historical/legacy/superseded material`

For product/business/workflow/architecture intent, current explicit Founder decisions and the applicable canonical domain authority remain binding under CWS governance.

Never silently choose between materially conflicting active sources. Apply `CWS_GROUNDING_POLICY.md` and `CWS_STALENESS_GUARD.md`, report the conflict, and obtain Founder clarification where product intent cannot be proven from current authority/evidence.

## 6. Current-source routing examples

Use the router instead of a universal fixed read-all list.

Examples:

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
- governance/routing behavior that materially changes enforced CWS policy.

When the Founder approves a material decision, synchronize the appropriate canonical source before dependent implementation proceeds.

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

## 12. Cold-memory rule

Retain historical knowledge but do not load it by default.

Cold/search-only categories include:

- historical reports/status snapshots;
- completed/old specs;
- changelogs;
- research notes and startup case studies;
- experimental/sandbox material;
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

## 14. Implementation funnel

Routing completion is not implementation permission.

Material implementation still follows the applicable CWS process:

`GROUND -> DIAGNOSE -> ONE BOTTLENECK -> FOUNDER BOUNDARY -> SPEC KIT WHEN REQUIRED -> IMPLEMENT MINIMUM -> VERIFY -> SYNC -> LEARN`

Do not weaken tests/security/fencing/integrity controls merely to obtain a successful run.

## 15. New-session recovery report

Before the first mutation in a new session, give the Founder a concise Vietnamese report containing, as applicable:

1. Current phase.
2. Current highest-priority bottleneck/business question.
3. Last verified state + evidence level.
4. What remains unverified.
5. Active task/spec/PR when confirmed.
6. Material conflict/staleness discovered.
7. Next smallest safe action.
8. Founder approval boundary.
9. `FOUNDER CHECK` when constructive dissent is warranted.

The report proves that the session found the right books; it does not prove the session read the whole library.

## 16. Grounding stop condition

Grounding is sufficient when the AI can state, with evidence:

- current task/domain;
- applicable authoritative sources;
- relevant current state;
- material conflicts/staleness;
- what remains unknown;
- next smallest safe action.

Do not continue reading unrelated material merely to increase context size.

## 17. New-chat command

A new CWS chat can start with:

`Ground CWS from GitHub. Read CWS_SESSION_BOOTSTRAP.md first and follow it. Report current state before doing anything.`

That command is intentionally sufficient.

## 18. Core principle

CWS should scale by improving retrieval, not by forcing every new AI session to remember more.

`DO NOT READ THE LIBRARY. READ THE CATALOG, THEN THE RIGHT BOOKS.`
