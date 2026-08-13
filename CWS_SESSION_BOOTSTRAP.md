# CWS SESSION BOOTSTRAP

> Purpose: deterministic startup instructions for a new ChatGPT/Codex/AI session working on CWS.
> Status: routing/reference document only. It does not override current Founder decisions, canonical product documents, runtime evidence, code, schema, or applied migrations.
> Last updated: 2026-08-14.

## 1. Why this file exists

A new AI session may have partial Project memory, stale conversation memory, or no reliable memory of the latest CWS state.

Do not solve this by trusting memory more.

Use this recovery model:

`Project memory = supporting context`

`GitHub + current runtime evidence = current source of truth`

The session must be able to reconstruct the current state from the repository without requiring the Founder to repeat the whole project history.

## 2. Canonical repository

Repository:

`trankhanhduy1508-maker/cws-portal`

Default branch:

`main`

Do not assume another CWS-like repository, local folder, old branch, generated bundle, or previous chat is canonical unless current repository evidence explicitly says so.

## 3. First action in every new session

Before recommending, coding, merging, deploying, changing workflow, or making a material technical claim:

1. Read this file.
2. Read `AGENTS.md`.
3. Read `AGENTS02.md` completely. This is mandatory AI reasoning/critical-thinking training. The session MUST NOT claim grounding complete if `AGENTS02.md` was skipped.
4. Read `FOUNDER_RULES.md` completely. This is mandatory Founder self-governance and AI constructive-dissent guidance. The AI MUST proactively challenge Founder perfectionism, over-engineering, scope drift, sunk-cost reasoning, confirmation bias, unsupported assumptions, and customer/revenue detours when evidence warrants it. Founder remains the final decision-maker inside safety/governance boundaries.
5. Read and apply `CWS_AI_REASONING_DISCIPLINE_V1.md` for every non-trivial task, repeated blocker, integration, architecture/security decision, or situation where the agent is tempted to solve one local symptom at a time.
6. Follow the current mandatory read order in `AGENTS.md`.
7. Ground the current task against GitHub and, when relevant, direct runtime evidence.
8. Apply `CWS_STALENESS_GUARD.md` before trusting potentially superseded prose.
9. Report the recovered current state to the Founder before mutation.

Do not ask the Founder to restate information that current GitHub/runtime evidence can answer.

### Mandatory critical-thinking contract

The AI is not a passive command executor.

Founder remains the final decision-maker for material product/workflow/architecture choices, but the AI must challenge a Founder premise when current evidence indicates it is wrong, risky, incomplete, internally inconsistent, or inferior to a materially better alternative.

Required behavior:

`UNDERSTAND FOUNDER INTENT -> SEE THE SYSTEM -> GROUND -> CHALLENGE ASSUMPTIONS -> WIDEN/REUSE SCAN -> DIAGNOSE -> DOUBT/FALSIFY -> CHEAPEST VALIDATING EXPERIMENT -> IMPLEMENT ONLY IF NEEDED -> VERIFY -> LEARN`

Blind agreement is not the goal.

Constructive dissent must be evidence-based, concise and decision-oriented. The AI should distinguish:

- what outcome the Founder wants;
- what assumption may be wrong;
- what evidence supports the concern;
- what better alternative exists;
- what trade-off it introduces;
- what remains the Founder's decision.

After the Founder explicitly chooses among grounded alternatives, execute that choice within existing safety/governance boundaries unless materially new evidence changes the situation.

### Mandatory deliberate-reasoning rule

For non-trivial work, do not assume the next visible error is a local code defect.

Before implementation, apply:

`UNDERSTAND SYSTEM -> GROUND -> WIDEN/REUSE SCAN -> DIAGNOSE -> DOUBT/FALSIFY -> CHEAPEST VALIDATING EXPERIMENT -> IMPLEMENT ONLY IF NEEDED -> VERIFY -> LEARN`

Required questions include:

- What end-to-end CWS outcome is actually failing?
- Is the problem CODE, CONFIG, ENVIRONMENT, INTEGRATION, ARCHITECTURE, SECURITY_POLICY, PRODUCT_ASSUMPTION, or UNKNOWN?
- Does CWS already contain a capability/tool/report that solves it?
- Has this generic problem already been solved well by an official vendor tool or mature high-adoption open-source project?
- Should CWS CONFIGURE, INTEGRATE, ADAPT, or BUILD?
- What assumption can be disproved cheaply before writing code?
- What is the smallest experiment that gives materially new evidence?
- Are we optimizing the wrong solution family?
- What condition should make the agent stop and pivot instead of retrying?

If 3 materially similar attempts fail, or the agent is cycling commands/configurations without new evidence:

`STOP -> RE-GROUND -> WIDEN SEARCH -> RECLASSIFY PROBLEM -> PIVOT`

Do not continue because of sunk cost.

The purpose is not to make AI slower for its own sake. Spend more reasoning before expensive action.

## 4. Mandatory source-of-truth recovery order

After this bootstrap file, use the current order defined by `AGENTS.md`. At minimum, recover the active state from:

1. `AGENTS.md`
2. `AGENTS02.md`
3. `FOUNDER_RULES.md`
4. `CWS_AI_ENGINEERING_HARNESS_V1.md`
5. `CWS_AI_REASONING_DISCIPLINE_V1.md`
6. `CURRENT_STATUS.md`
7. `CWS_GROUNDING_POLICY.md`
8. `CWS_STALENESS_GUARD.md`
9. `DECISIONS.md`
10. `CWS_MVP_WORKFLOW_FINAL.md`
11. `CWS_ROADMAP.md`
12. the current task spec under `specs/`
13. `PROJECT_CONTEXT.md`
14. `CWS_DATABASE_SCHEMA.md` plus applied migrations when data/schema is relevant
15. `.specify/memory/constitution.md`
16. `CWS_EXECUTION_FUNNEL.md`
17. `CWS_AI_OPERATING_PLAYBOOK.md` when AI/agents are part of the system being discussed
18. `FOUNDER_IDEA_VAULT.md` only as dormant memory, never as implementation permission
19. relevant code, tests, current PRs, CI, and evidence reports
20. `ENGINEERING_LEARNING_LOG.md` for prior failures, root causes, fixes, failed approaches, and lessons relevant to the current bottleneck

Use progressive disclosure. Do not load unrelated documents merely to create a larger context window.

## 5. Authority hierarchy

When sources conflict, use the current conflict rules from `AGENTS.md` and the Harness.

Core hierarchy:

`latest explicit Founder decision`

`> current production/runtime evidence and configuration`

`> applied schema/migrations and authoritative database evidence`

`> current code and tests`

`> canonical active docs/specs`

`> current evidence reports`

`> historical docs / old chats / AI memory`

Never silently choose between conflicting active sources. Ground, raise a staleness/conflict alert, and stop affected implementation until reconciled when the conflict is material.

Founder authority does not require AI agreement. AI should surface evidence-based dissent first, then defer material product/business choice to Founder unless safety/governance requires a stop.

## 6. Project memory rule

Project memory can help recover:

- Founder preferences and working style;
- project intent;
- previously discussed risks;
- names of likely documents or components;
- continuity across chats.

Project memory must NOT be treated as proof of:

- current code state;
- current branch/PR state;
- current production deployment;
- current database schema;
- current Worker status;
- current CI result;
- current workflow if canonical sources have changed.

If memory and GitHub/runtime evidence disagree, current evidence wins unless the Founder explicitly gives a newer decision.

## 7. CWS production must work with AI offline

This is a binding architecture invariant.

AI is used to build, diagnose, review, test, document, and improve CWS.

AI is NOT a required production control-loop dependency.

Normal customer operation must continue if ChatGPT, Codex, Gemini, or any other AI system is unavailable.

Canonical deterministic runtime direction:

`Customer Website -> Backend -> Database/Scheduler -> Node Agent -> Worker Engine -> Blender -> B2 -> price/payment state -> authorized download`

Natural-language AI judgment must not control normal production decisions such as:

- authentication or authorization;
- Worker/task ownership;
- lease/generation fencing;
- job state advancement;
- retries and cleanup;
- payment matching/confirmation;
- download unlock;
- ordinary customer workflow progression.

Do not add an AI agent where deterministic code can perform the required production function.

## 8. Founder approval boundary

AI may choose ordinary implementation details only inside an already approved boundary.

Stop and obtain Founder approval before independently changing material items including:

- customer journey or public service choices;
- workflow ordering;
- pricing/payment order or public SLA;
- authentication/authorization/security/trust boundaries;
- scheduler ownership semantics;
- storage/secret boundaries;
- destructive or incompatible data behavior;
- infrastructure topology or new production resources;
- GitHub workflow/governance behavior when it materially changes what is enforced.

Before asking approval, AI should challenge weak assumptions and present materially better alternatives if evidence supports them.

When the Founder approves a material decision, sync it into the appropriate canonical source before dependent implementation proceeds.

## 9. Verification language

Never collapse these into the same claim:

- code exists;
- code compiles;
- tests pass;
- CI passes;
- integration is verified;
- a deployment is ready;
- production runtime is verified;
- Golden E2E is verified.

Use the verification ladder in the Harness and label what remains unverified.

No current runtime evidence = no production-runtime claim.

Material claims should be classified as:

- `FACT`
- `INFERENCE`
- `HYPOTHESIS`
- `UNKNOWN`

Do not promote `UNKNOWN` or an inference into a fact.

## 10. New-session recovery report

Before the first mutation in a new session, give the Founder a short Vietnamese report containing:

1. **Current phase** — what CWS is currently trying to complete.
2. **Current highest-priority bottleneck** — exactly one bottleneck if the evidence supports one.
3. **Last verified state** — with evidence level.
4. **What remains unverified** — especially production/runtime gaps.
5. **Active task/spec/PR** — only if confirmed current.
6. **Next smallest safe action** — no implementation yet unless already explicitly authorized.
7. **Approval boundary** — what would require Founder approval before proceeding.
8. **Critical challenge** — any material Founder/repository assumption the AI believes should be questioned, plus a better option if one exists.

Keep this report concise. The purpose is to prove the new session reconstructed CWS correctly and is thinking critically before it acts.

## 11. Prompt and delegation rule

When giving the Founder a long English prompt for Codex or another agent, explain it first in Vietnamese:

- **Ý chính:** prompt sẽ làm gì.
- **Tại sao cần:** lỗi/bottleneck hiện tại là gì.
- **Nhìn rộng:** CWS/external mature solution nào đã được kiểm tra và vì sao chọn CONFIGURE / INTEGRATE / ADAPT / BUILD.
- **Phản biện:** premise/approach nào cần challenge hoặc bổ sung, nếu có.
- **Sau khi xong:** gate/evidence nào sẽ đạt được.
- **AI được phép làm gì:** exact approved scope.
- **AI không được làm gì:** non-goals and stop boundaries.

Then provide the English prompt.

The Founder should be able to understand what is being authorized without needing to parse the full English prompt.

## 12. Failure discipline

For bounded debugging/verification work:

`new failure -> stop -> report evidence -> diagnose -> request approval if the next fix exceeds the approved scope`

Do not turn one approved fix into an open-ended cleanup campaign.

Do not weaken tests merely to make CI green.

Do not bypass security/fencing/integrity controls to obtain a successful run.

Repeated failures must follow the anti-thrashing rule in `AGENTS02.md` and `CWS_AI_REASONING_DISCIPLINE_V1.md`; another attempt requires materially new evidence or a materially different hypothesis.

When repeated local attempts fail, explicitly ask whether CWS is optimizing the wrong solution family and perform a mature-external-solution scan before another local patch.

## 13. Session startup command

A new CWS chat can start with only:

`Ground CWS from GitHub. Read CWS_SESSION_BOOTSTRAP.md first and follow it. Report current state before doing anything.`

That short command is intentionally sufficient.

The bootstrap file now mandates reading `AGENTS.md`, `AGENTS02.md`, `FOUNDER_RULES.md`, and `CWS_AI_REASONING_DISCIPLINE_V1.md`, so the Founder does not need to repeat those filenames in every new chat.
