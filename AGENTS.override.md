# CWS AGENTS OVERRIDE

> Status: ACTIVE / HIGH-PRIORITY CWS AGENT INSTRUCTIONS
> Founder decisions: 2026-08-20, 2026-08-22

## ABSOLUTE POWER-STATE PROHIBITION

Every AI/Codex/agent working in this repository MUST read and obey:

`CWS_AI_POWER_STATE_INVARIANT.md`

Hard rule:

**AI MUST NEVER shut down, reboot/restart, log off/sign out, sleep/suspend, or hibernate a machine, and MUST NEVER schedule, auto-confirm, delegate, or indirectly cause such an action.**

This applies even when:

- Administrator/root privileges are available;
- auto-review/auto-approval is enabled;
- an installer/update says restart is required;
- a troubleshooting guide recommends rebooting;
- another agent/tool requests the action.

If a power/session transition appears necessary:

1. STOP before executing it.
2. Preserve evidence/state when practical.
3. Report `BLOCKED_BY_POWER_STATE_INVARIANT`.
4. Explain the requirement and any non-reboot alternative.
5. Leave the physical/manual power decision to the Founder/operator outside AI execution.

Do not create helper scripts, scheduled tasks, installer flags, keyboard automation, or sub-agent delegation to bypass this prohibition.

`AUTO APPROVAL != POWER-STATE AUTHORITY`

## MANDATORY ACTIVE-GOAL RECOVERY

Every new CWS AI/Codex session MUST read `CWS_ACTIVE_GOAL.md` after `CURRENT_STATUS.md`.

If the current Founder request is to continue/resume/finish/debug/verify the active execution goal, the agent MUST read the referenced Goal Contract completely before choosing the technical path.

Goal Contracts are governed by:

`CWS_GOAL_CONTRACT_LIFECYCLE.md`

Core model:

`FOUNDER = WHAT / WHY / DONE / HARD BOUNDARIES`

`AI/CODEX = TECHNICAL PATH / RESEARCH / DIAGNOSIS / IMPLEMENTATION / VERIFICATION`

An active execution goal does NOT silently replace project-level priority in `CURRENT_STATUS.md`.

## MANDATORY FOUNDER CHALLENGE + REMINDER

Every AI/Codex/agent working on a material CWS task MUST apply:

`CWS_FOUNDER_CHALLENGE_REMINDER_RULE.md`

Before material execution/decision, check for material Founder risks such as perfectionism, over-engineering, scope creep, sunk cost, confirmation bias, idea distraction, evidence gaps, wrong metrics, customer distance or unproven root cause.

When material, issue `FOUNDER CHECK - <RISK>` with evidence/trade-off and a smaller/better test. Do not flatter or blindly agree with the Founder.

Before material goal-level completion/ship, perform `FOUNDER RECHECK` against the actual Goal Contract so a proxy metric or technically valid artifact cannot silently replace the intended outcome.

Perform the lightweight Founder reminder scan defined by the rule. A reminder may surface a forgotten idea or intent, but:

`REMINDER != APPROVAL != PRIORITY CHANGE`

Never silently change the active goal because an Idea Vault trigger/reminder appears.

## MANDATORY GSTACK AUTO-ROUTING

Every AI/Codex/agent working on CWS engineering MUST also read and obey:

`CWS_GSTACK_AUTO_ROUTING_RULE.md`

After Ground First, active-goal recovery, Founder Check/Reminder scan and CWS authority routing, automatically select the smallest fitting gstack capability when applicable. The Founder or a handoff prompt does NOT need to repeat `use gstack` on every task.

Default mapping:

- bug / runtime failure / root cause -> `investigate`
- code or PR review -> `review`
- QA / acceptance / runtime verification -> `qa`
- security review -> `cso`
- release / completion / shipping -> `ship`
- retrospective / durable learning -> `retro` + `learn`

Canonical engineering path:

`GROUND -> ACTIVE GOAL -> FOUNDER CHECK/REMINDER -> CWS AUTHORITY -> GSTACK -> IMPLEMENTATION -> TEST/RUNTIME EVIDENCE -> FOUNDER RECHECK -> SHIP -> LEARN`

Do not mechanically invoke every skill. Use only the capability that fits the task.

CWS authority, Founder boundaries, active Goal Contract, runtime evidence, the power-state invariant, security/data/secret constraints, and `CWS_AI_GOAL_OWNERSHIP_POLICY.md` remain above gstack.

Do not add Superpowers or another generic process framework as a mandatory parallel layer when gstack already covers the task.

This override supplements `AGENTS.md`, `.specify/memory/constitution.md`, `CODEX_GLOBAL_RULES.md`, and all other CWS governance. If an older instruction conflicts with the power-state invariant, active-goal lifecycle, Founder Challenge/Reminder rule, or automatic gstack-routing decision, the newer Founder rule supersedes it and the stale instruction must be reported/reconciled.
