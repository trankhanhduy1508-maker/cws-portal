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

## MANDATORY GSTACK AUTO-ROUTING

Every AI/Codex/agent working on CWS engineering MUST also read and obey:

`CWS_GSTACK_AUTO_ROUTING_RULE.md`

After Ground First and CWS authority routing, automatically select the smallest fitting gstack capability when applicable. The Founder or a handoff prompt does NOT need to repeat `use gstack` on every task.

Default mapping:

- bug / runtime failure / root cause -> `investigate`
- code or PR review -> `review`
- QA / acceptance / runtime verification -> `qa`
- security review -> `cso`
- release / completion / shipping -> `ship`
- retrospective / durable learning -> `retro` + `learn`

Canonical engineering path:

`CWS AUTHORITY -> GSTACK -> IMPLEMENTATION -> TEST/RUNTIME EVIDENCE -> SHIP`

Do not mechanically invoke every skill. Use only the capability that fits the task.

CWS authority, Founder boundaries, runtime evidence, the power-state invariant, security/data/secret constraints, and `CWS_AI_GOAL_OWNERSHIP_POLICY.md` remain above gstack.

Do not add Superpowers or another generic process framework as a mandatory parallel layer when gstack already covers the task.

This override supplements `AGENTS.md`, `.specify/memory/constitution.md`, `CODEX_GLOBAL_RULES.md`, and all other CWS governance. If an older instruction conflicts with the power-state invariant or this automatic gstack-routing decision, the newer Founder rule supersedes it and the stale instruction must be reported/reconciled.
