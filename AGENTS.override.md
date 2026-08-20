# CWS AGENTS OVERRIDE

> Status: ACTIVE / HIGH-PRIORITY CWS AGENT INSTRUCTIONS
> Founder decision: 2026-08-20

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

This override supplements `AGENTS.md`, `.specify/memory/constitution.md`, `CODEX_GLOBAL_RULES.md`, and all other CWS governance. If an older instruction appears to permit an AI-triggered power-state action, this newer Founder hard invariant supersedes it and the stale instruction must be reported/reconciled.
