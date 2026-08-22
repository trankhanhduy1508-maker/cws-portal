# CWS ACTIVE GOAL

> Status: ACTIVE / FOUNDER GOVERNANCE
> Founder decision: 2026-08-22
> Purpose: provide a small, deterministic pointer to the current execution goal without replacing project-level priority in `CURRENT_STATUS.md`.

## Core rule

`CURRENT_STATUS.md` owns project-level priority.

`CWS_ACTIVE_GOAL.md` owns the currently approved execution focus for an AI/Codex session when the Founder is actively pursuing a specific goal.

An active execution goal MUST NOT silently replace or reprioritize the canonical project roadmap, Worker track, customer workflow, architecture, security boundary, or other project authority.

## Current execution focus

`ACTIVE_EXECUTION_GOAL: goals/BLENDER_UE5_FAST_FIDELITY.md`

`GOAL_STATUS: ACTIVE_EXPERIMENTAL_SECONDARY`

`GOAL_READY: YES`

`FOUNDER_APPROVED: 2026-08-22`

`PROJECT_LEVEL_PRIORITY_CHANGED: NO`

Project-level priority remains whatever `CURRENT_STATUS.md` currently proves.

## Goal ownership

`FOUNDER = WHAT / WHY / DONE / HARD BOUNDARIES`

`AI/CODEX = TECHNICAL PATH / RESEARCH / DIAGNOSIS / IMPLEMENTATION / VERIFICATION`

AI technical autonomy is governed by `CWS_AI_GOAL_OWNERSHIP_POLICY.md` and remains subordinate to hard governance and human-only boundaries.

## Startup behavior

Every new CWS AI/Codex session must read this file after `CURRENT_STATUS.md`.

If the current Founder request is to continue, resume, finish, debug, verify, or otherwise work on the active execution goal, read the referenced Goal Contract completely before choosing the technical path.

If the Founder request is clearly about another domain, do not force the active execution goal onto that task. Route the requested domain normally through `CWS_KNOWLEDGE_ROUTER.yaml`.

## Runtime truth rule

This pointer and its Goal Contract define intent and Definition of Done. They do NOT prove current runtime state.

Before implementation or completion claims:

`GOAL INTENT + CURRENT RUNTIME/GITHUB EVIDENCE -> CURRENT EXECUTION STATE`

Runtime evidence outranks stale progress text.

## Change rule

Changing `ACTIVE_EXECUTION_GOAL`, materially changing an approved Goal Contract, or replacing the execution focus with another Founder initiative requires an explicit current Founder decision.

Routine technical pivots inside the same approved goal do not require changing this pointer.
