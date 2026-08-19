# Research-Build-Verify Governance Design

## Purpose

Convert a recurring CWS AI failure mode into durable governance: coding agents often invent a custom technical path too early instead of checking whether the operating system, current CWS repository, official platform tooling, installed skills, or mature open-source projects already solve the problem better.

The Founder approved a workflow that amplifies AI strengths (speed, technical breadth, parallelism) while reducing three recurring weaknesses: reinventing existing solutions, scope creep, and self-verification bias.

## Core loop

The canonical engineering learning loop is:

`RESEARCH -> DECIDE -> BUILD -> VERIFY -> LEARN`

This supplements, and does not replace, the existing CWS Harness, grounding, Founder approval, Stable Change Discipline, Spec Kit, and evidence ladder.

## Research-first trigger

Research is mandatory before custom implementation when any of the following is true:

- the problem is generic or common across software/systems;
- more than one credible implementation family exists;
- the agent is about to invent a new tool, queue, installer, scanner, orchestrator, remote-control mechanism, updater, scheduler, or infrastructure component;
- the same problem has already consumed multiple unsuccessful attempts;
- the agent is unsure whether the OS, vendor, framework, dependency, current CWS repository, installed skill, or mature open-source project already provides the capability;
- a custom solution is proposed unusually quickly for a common engineering problem.

Research is not required for a narrow, already-grounded defect where the root cause and minimal correction are proven.

## Mandatory solution scan

Before custom-building a non-trivial generic capability, inspect in this order:

1. Native OS or installed tool.
2. Existing CWS capability, script, config, test, report, or bootstrap.
3. Existing installed skill/plugin.
4. Official CLI, API, SDK, or vendor-supported mechanism.
5. Mature open-source project with relevant operational evidence.
6. Custom implementation only when the prior options are unsuitable.

The agent must classify the selected approach as:

`CONFIGURE | INTEGRATE | ADAPT | BUILD`

Default preference:

`CONFIGURE -> INTEGRATE -> ADAPT -> BUILD`

## Specialist ownership

CWS development may use specialist Codex sessions with non-overlapping primary ownership:

- `WORKER`: Track A render pipeline, Blender execution, Worker bundle/update, render/output/B2 behavior.
- `GUARD`: RENTED_MACHINE_GUARD_V1, rented-machine lifecycle, process policy, notice/cooldown, lease and RELEASE behavior.
- `VERIFIER`: independent review, tests, evidence classification, regression and scope-creep detection. Default mode is read/test/review, not feature implementation.
- `RESEARCH`: external solution scan, existing-tool discovery, technical comparison, recommendation/specification. Default mode is research/recommendation, not runtime mutation.

One change has one primary owner. A second specialist may review the work but should not concurrently modify the same responsibility unless the Founder explicitly assigns joint ownership.

## Escalation behavior

When a Builder encounters an unclear solution family, it must not silently improvise a broad custom architecture. It should report:

`BLOCKED: SOLUTION FAMILY UNCLEAR -> ROUTE TO RESEARCH`

Research returns evidence and a recommended solution family. Founder-controlled material architecture/workflow/security decisions still require Founder approval before implementation.

## Verification separation

The producing agent must not be the only evidence source for a material change. A separate verifier is preferred for high-risk, security, updater, workflow, architecture, or broad Worker changes.

Verifier checks both code correctness and method quality:

- Did the Builder reuse an existing capability where appropriate?
- Was a mature solution ignored without evidence?
- Was unrelated code changed?
- Do tests prove the claimed behavior rather than only test a mock reimplementation?
- Are evidence levels correctly separated?

## Learning loop

Reusable discoveries must become durable project knowledge instead of disappearing in chat history.

When a recurring failure or useful solution is discovered, record a compact learning using:

- `PROBLEM`
- `BAD DEFAULT`
- `BETTER PATTERN`
- `WHEN TO USE`
- `EVIDENCE`

Prefer updating the existing Engineering Learning Log or existing governance source over creating duplicate files.

## Anti-patterns

Do not:

- write custom antivirus logic before checking Windows Security/Defender or the approved scanner path;
- create a new installer before checking CWS bootstrap and package-manager mechanisms;
- build a custom code graph before testing an approved mature tool such as CodeGraph when available;
- invent a queue before inspecting existing database/scheduler/claim primitives;
- add a new service merely because an agent can design one;
- let Research mutate production runtime by default;
- let Verifier quietly fix the Builder's code while also claiming independent review;
- treat repository stars as proof of trust or suitability.

## Success criteria

This governance is effective when future agents:

1. inspect reusable capabilities before writing custom code;
2. route unclear solution-family problems to Research;
3. keep specialist ownership non-overlapping;
4. use independent verification for material changes;
5. preserve stable behavior and minimum diffs;
6. record reusable lessons after verified work;
7. keep production deterministic and operable with AI offline.
