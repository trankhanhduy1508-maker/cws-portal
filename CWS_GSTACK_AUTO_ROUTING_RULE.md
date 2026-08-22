# CWS GSTACK AUTO-ROUTING RULE

> Status: ACTIVE / FOUNDER GOVERNANCE
> Founder decision: 2026-08-22
> Purpose: make gstack execution automatic for CWS engineering so new ChatGPT/Codex sessions and handoff prompts do not need to remember to restate `use gstack`.

## Core invariant

For CWS engineering work, after Ground First and authority routing, the AI/Codex agent MUST automatically select and use the smallest fitting gstack capability when one applies.

Canonical path:

`GROUND CWS -> APPLY CWS AUTHORITY -> AUTO-ROUTE GSTACK -> IMPLEMENT/INVESTIGATE -> VERIFY WITH REAL EVIDENCE -> SHIP -> SYNC LEARNING`

The Founder or a new-chat prompt does NOT need to explicitly say `use gstack` on every task.

Failure to mention gstack in a handoff prompt is NOT permission to skip gstack routing.

## Default automatic mapping

- bug / failure / unexpected runtime / root-cause work -> `investigate`
- code review / PR review / implementation review -> `review`
- QA / acceptance / browser/runtime verification -> `qa`
- security review / threat/risk work -> `cso`
- release / completion / shipping -> `ship`
- retrospective / durable engineering learning -> `retro` + `learn`

Use only the capability or capabilities that materially help the current task. Do not invoke every gstack skill mechanically.

## New-session behavior

A new ChatGPT/Codex/AI session that grounds CWS must recover this rule from repository authority and automatically apply it.

When generating a Codex execution prompt, ChatGPT should normally include the relevant gstack capability when it materially improves execution, but prompt omission must not disable this repository-level rule.

Examples:

- Render output is black -> Ground -> `gstack investigate` -> root cause -> minimal test -> verify.
- A candidate render appears correct -> `gstack qa` before declaring the visual gate passed.
- Final MP4 and evidence are complete -> `gstack ship` before reporting goal-level completion.

## Precedence

CWS authority is always above gstack.

`FOUNDER DECISIONS / HARD GOVERNANCE / DOMAIN AUTHORITY / RUNTIME EVIDENCE > GSTACK`

gstack does not grant permission to cross Founder approval boundaries, power-state prohibitions, destructive-data boundaries, security/secret boundaries, payment/money boundaries, or other human-only boundaries.

`CWS_AI_GOAL_OWNERSHIP_POLICY.md` remains authoritative for technical autonomy: routine blockers are AI-owned and should not be returned to the Founder merely because a gstack step encounters an ordinary engineering failure.

## No competing process stack

Do not add Superpowers or another generic engineering framework as a mandatory parallel process layer when gstack already provides the needed capability.

GitHub Spec Kit remains for material specification work only.

The intended execution model is one simple stack:

`CWS AUTHORITY -> GSTACK -> IMPLEMENTATION -> TEST/RUNTIME EVIDENCE -> SHIP`

## Verification rule

Using a gstack skill is not itself evidence of success.

Completion claims must still match the evidence level actually reached. In particular:

`CODE != TEST != INTEGRATION != RUNTIME != PRODUCTION != GOLDEN E2E`

For visual/render tasks, a technically valid file is not sufficient when the goal includes visual fidelity.
