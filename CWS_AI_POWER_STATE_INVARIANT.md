# CWS AI POWER-STATE INVARIANT

> Status: ACTIVE / HARD GOVERNANCE
> Founder decision: 2026-08-20
> Scope: every ChatGPT, Codex, coding agent, sub-agent, automation agent, local AI session, and AI-generated operator script used for CWS development, debugging, testing, rendering, deployment, maintenance, or administration.

## Absolute rule

AI MUST NEVER initiate, schedule, auto-confirm, or indirectly cause a machine power/session transition.

Forbidden actions include, but are not limited to:

- shutdown / power off;
- reboot / restart;
- logoff / sign out;
- sleep / suspend;
- hibernate;
- forced restart after installation/update;
- firmware/driver/update flows that automatically reboot;
- scheduled shutdown/restart tasks;
- commands or scripts whose effect is to perform any of the above.

Examples of forbidden execution include `shutdown.exe`, `Restart-Computer`, `Stop-Computer`, `logoff`, suspend/hibernate APIs, installer flags that auto-restart, and equivalent native/API/vendor commands.

This prohibition applies even when:

- a tool says reboot is recommended or required;
- an installer offers `Restart now`;
- a package manager can automatically restart;
- a diagnostic or recovery guide suggests rebooting;
- the AI believes rebooting would fix the problem faster;
- auto-approval is enabled;
- a command is running with Administrator privileges.

## Required behavior when a reboot/power transition appears necessary

AI MUST:

1. STOP before the power/session transition.
2. Preserve current logs, artifacts, and task state when practical.
3. Report `BLOCKED_BY_POWER_STATE_INVARIANT`.
4. Explain exactly why the external tool/system believes a reboot or power transition is needed.
5. Offer a non-reboot alternative when one exists.
6. Leave the final physical/manual power decision to the Founder/operator outside AI execution.

AI MUST NOT bypass this rule by asking another agent, spawning a helper process, creating a scheduled task, writing a script for later execution, clicking an installer confirmation, or using keyboard/mouse automation.

## Script/code generation boundary

AI must not generate or modify an operator/bootstrap/maintenance script so that running the script can automatically shut down, restart, log off, sleep, or hibernate a machine.

If CWS product architecture later intentionally requires deterministic machine power-management behavior, that is a separate Founder-controlled architecture decision. It must be explicitly specified, reviewed, and isolated from AI operator authority. This file does not silently redesign the production Worker lifecycle.

## Auto-approval boundary

`auto_review`, auto-approval, IDE approval settings, terminal wrappers, or other convenience mechanisms NEVER grant permission for a power-state action.

`AUTO APPROVAL != POWER-STATE AUTHORITY`

## Verification language

If no power-state action was executed, report that fact directly.

If evidence suggests a machine powered off/restarted unexpectedly, do not guess which actor caused it. Collect runtime/event evidence first and classify the cause as FACT / INFERENCE / HYPOTHESIS / UNKNOWN.

## Core invariant

`AI MAY DIAGNOSE A REBOOT REQUIREMENT -> AI MAY NOT EXECUTE THE REBOOT`

`AI MAY REPORT -> FOUNDER/OPERATOR DECIDES PHYSICALLY`
