# CWS AI Reasoning Discipline V1

> Status: CANONICAL AI-ASSISTED ENGINEERING GOVERNANCE
> Date: 2026-08-13
> Purpose: prevent local, reactive, step-by-step thrashing by forcing CWS AI agents to reason at system level, search for mature external solutions, and verify assumptions before implementation.

## 1. Why this exists

AI coding agents are fast at local execution but can become myopic: they see the next error, try the next patch, and repeat. In a growing system this causes wasted time, duplicate tooling, architecture drift, and failure to notice that a mature solution already exists outside the repository.

CWS therefore requires a deliberate reasoning discipline before non-trivial implementation.

The goal is not to make the AI slow for its own sake. The goal is to spend more reasoning before expensive action.

Canonical principle:

`THINK WIDER BEFORE ACTING DEEPER.`

A local blocker may have four very different causes:

1. project code defect;
2. environment/tooling defect;
3. missing integration/capability;
4. an already-solved industry problem where CWS should adopt a mature external tool instead of inventing one.

Do not assume category 1 first.

## 2. External references studied

This discipline synthesizes patterns from high-adoption public engineering/agent repositories reviewed on 2026-08-13. These repositories are references, not CWS authorities.

### obra/superpowers

GitHub metadata observed ~271k stars at review time. The project describes an agentic software-development methodology that explicitly prevents agents from jumping directly into code. Its workflow emphasizes brainstorming/specification, planning, small tasks, TDD, systematic debugging, code review, and verification-before-completion.

CWS lesson:

`systematic over ad-hoc; evidence over claims; design before code.`

### addyosmani/agent-skills

GitHub metadata observed ~86k stars at review time. The repository packages production engineering workflows for AI coding agents. Relevant skills include context engineering, source-driven development, doubt-driven development, browser testing with DevTools, debugging/error recovery, security hardening, and incremental implementation.

CWS lessons:

- context quality is a primary lever for agent quality;
- before implementing a framework/integration from memory, consult current authoritative sources;
- non-trivial decisions deserve adversarial review;
- live browser problems should use live browser tooling rather than repeated blind retries;
- prefer thin vertical slices and stop-the-line debugging.

### dair-ai/Prompt-Engineering-Guide

GitHub metadata observed ~77k stars at review time. It collects prompt engineering, context engineering, RAG, agent and reasoning material.

CWS lesson:

Prompt wording alone is insufficient. Good AI behavior depends on context architecture, tool access, verification, retrieval and explicit operating constraints.

### Other high-adoption ecosystems inspected

GitHub searches also surfaced Microsoft AutoGen, LangChain/LangGraph, CrewAI, OpenAI Codex, Anthropic Claude Code, Cline, Continue and other widely adopted agent/coding-agent projects. CWS should learn patterns from them when task-relevant, but must not copy frameworks merely because they are popular.

Popularity is a discovery signal, not proof of correctness or suitability.

## 3. The CWS Wide-Thinking Gate

For every non-trivial blocker, feature, integration, architecture decision, security issue or repeated failure, run this gate before implementation.

### STEP A — SYSTEM MAP

Answer:

- What user/business outcome are we actually trying to achieve?
- Where is this step in the end-to-end CWS flow?
- What sits immediately before and after it?
- What other components depend on this decision?
- Is the observed failure local, or only the first visible symptom of a wider boundary problem?

Do not start with "what code should I edit?"

Start with "what system outcome is failing?"

### STEP B — REUSE SCAN

Before inventing a new subsystem, search in this order:

1. existing CWS code/config/tools;
2. existing CWS reports/knowledge/research;
3. official vendor/tool documentation;
4. mature official/open-source GitHub implementations;
5. high-adoption community patterns/issues when useful.

Required question:

`HAS THIS PROBLEM ALREADY BEEN SOLVED WELL OUTSIDE CWS?`

Examples:

- browser control/debugging -> Chrome DevTools MCP / Playwright rather than repeated blind browser automation;
- malware detection -> mature scanner integration rather than writing an antivirus engine;
- auth -> established OAuth/Supabase patterns rather than custom credentials;
- resumable upload -> mature protocol/library before custom transfer machinery.

### STEP C — BUILD / BUY / INTEGRATE / CONFIGURE

Classify the solution before coding:

- `CONFIGURE_EXISTING`
- `INTEGRATE_MATURE_TOOL`
- `ADAPT_EXISTING_CWS_COMPONENT`
- `BUILD_MINIMAL_CUSTOM`

Default preference:

`CONFIGURE -> INTEGRATE -> ADAPT -> BUILD`

Custom code is last when the problem is generic and already solved by a mature component.

### STEP D — SOURCE CHECK

For external technologies, identify exact current version/behavior and verify against authoritative sources.

Do not implement version-sensitive behavior from memory.

Use this hierarchy when practical:

1. official docs/repository/specification;
2. official changelog/release/security policy;
3. standards/browser/runtime references;
4. reputable community evidence for operational feedback.

Community popularity is never a substitute for primary-source verification.

### STEP E — ADVERSARIAL DOUBT

For non-trivial/high-risk decisions, articulate the candidate decision and try to disprove it.

Ask:

- What assumption am I silently making?
- What would make this approach fail?
- Is there hidden coupling?
- Does it create a new service/dependency unnecessarily?
- Does it weaken security?
- Is it solving a symptom instead of the root cause?
- What evidence would falsify my current theory?

For high-risk architecture/security/production decisions, a fresh-context review is preferred when available and permitted.

### STEP F — SMALLEST SAFE EXPERIMENT

Before a broad implementation, choose the cheapest experiment that distinguishes competing hypotheses.

Examples:

- inspect network trace before rewriting auth;
- run one real Worker lifecycle before scaling fleet logic;
- test one staging RPC privilege before changing the whole gateway;
- attach DevTools to a persistent browser before rebuilding OAuth flow.

The experiment should answer a question, not merely produce activity.

### STEP G — STOP / PIVOT RULE

If the same blocker has consumed repeated attempts without materially new evidence, STOP.

Trigger a strategy reset when any of these occur:

- 3 materially similar failed attempts;
- repeated configuration changes without improved evidence;
- same boundary fails after two different local patches;
- agent is cycling between commands/tools;
- more effort is being spent on workaround mechanics than on the original product outcome.

On reset:

`STOP -> RE-GROUND -> WIDEN SEARCH -> RECLASSIFY PROBLEM -> CHOOSE NEW EXPERIMENT`

Do not continue because of sunk cost.

## 4. Anti-Thrashing Rule

Forbidden pattern:

`error -> patch -> new error -> patch -> new error -> patch`

without an updated system hypothesis.

After each failed attempt, record:

- new evidence;
- what hypothesis was falsified;
- whether the first failing boundary changed;
- whether the problem class changed;
- why the next attempt is materially different.

If the next attempt is not materially different, do not run it.

## 5. Tool Discovery Rule

When a blocker concerns an external capability, actively ask whether a specialized tool/MCP/library exists.

Examples of capability categories:

- browser inspection/control;
- database/schema inspection;
- security scanning;
- observability/tracing;
- load testing;
- file/archive handling;
- resumable transfers;
- CI/CD/deployment;
- dependency/security audits;
- structured agent skills.

Do not treat the tools currently loaded in the session as the universe of possible solutions.

However, adding a dependency/tool still requires:

- provenance check;
- maintenance/security/license review as appropriate;
- fit with existing CWS architecture;
- least privilege;
- Founder approval when it changes material infrastructure/architecture/security boundaries.

## 6. Context Discipline

More context is not always better.

For each task, load:

1. persistent governance (`AGENTS.md`, this document, Harness);
2. current status/decision/spec relevant to the task;
3. exact source/test files involved;
4. exact failing evidence;
5. only task-relevant historical reports.

Historical reports are evidence, not automatically active instructions.

If two active sources conflict, surface the conflict. Do not silently choose.

## 7. Prompt Construction Discipline

Before generating an execution prompt for Codex, ChatGPT must be able to explain in Vietnamese:

- the real system problem;
- why the proposed action is the next best experiment/action;
- what alternatives were considered;
- whether a mature external solution exists;
- what Codex is allowed to change;
- what Codex must not change;
- what evidence will prove success;
- what should cause Codex to stop/pivot.

The execution prompt itself is written in English per current Founder rule.

A long prompt is not automatically a good prompt. It must encode the decision boundary and verification logic, not just more words.

## 8. External-Solution Scan Output

For material tasks, record a compact decision block when relevant:

```text
PROBLEM_CLASS = CODE / CONFIG / ENVIRONMENT / INTEGRATION / ARCHITECTURE / UNKNOWN
EXISTING_CWS_SOLUTION = YES / NO / PARTIAL
MATURE_EXTERNAL_SOLUTION_FOUND = YES / NO
BEST_PATH = CONFIGURE / INTEGRATE / ADAPT / BUILD
WHY = <one paragraph>
CHEAPEST_VALIDATING_EXPERIMENT = <one action>
STOP_CONDITION = <condition>
```

Do not force this block for trivial mechanical work.

## 9. CWS-specific example: Google Login browser blockage

Bad local loop:

`open fresh automated browser -> Google blocks/challenges -> retry with another browser command -> retry configuration -> repeat`

System-level reframing:

- desired outcome: repeatable real Customer Google Login verification;
- boundary: browser session persistence + real OAuth human/agent handoff;
- external solution scan: Chrome DevTools MCP and persistent dedicated Chrome profile already solve live browser control/session reuse;
- best path: integrate mature browser tooling, not rewrite Google auth;
- experiment: one dedicated profile, one human bootstrap, then session reuse;
- success evidence: real callback/session/refresh/logout repeatably verified.

This is the behavior this protocol exists to produce.

## 10. Definition of a good AI action

A good CWS AI action is not the one that writes code fastest.

It is the one that maximizes:

`information gained + risk reduced + reusable progress`

while minimizing:

`irreversible change + duplicated work + speculative code + Founder intervention`

## 11. Mandatory behavior for future sessions

When grounding CWS, every AI session must recover this discipline through `AGENTS.md`.

For non-trivial work:

`UNDERSTAND SYSTEM -> GROUND -> WIDEN/REUSE SCAN -> DIAGNOSE -> DOUBT -> CHOOSE SMALLEST SAFE EXPERIMENT -> IMPLEMENT ONLY IF NEEDED -> VERIFY -> LEARN`

If the AI notices itself solving one local symptom at a time without improving the system hypothesis, it must stop and re-enter the Wide-Thinking Gate.
