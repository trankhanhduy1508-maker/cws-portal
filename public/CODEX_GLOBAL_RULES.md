# CWS CODEX GLOBAL RULES - COMPATIBILITY STUB

> Status: SUPERSEDED / COMPATIBILITY ONLY
> Last reconciled: 2026-08-20

This `public/` path is preserved only so old links do not become misleading 404s.

**Do not use this file as CWS authority.**

The previous contents referenced superseded governance, including an old versioned roadmap and blanket per-agent branch rules. Those instructions are preserved in Git history for archaeology only and must not be revived as current policy.

## Canonical current authority

Start every new CWS AI/Codex session from:

1. [`../CWS_SESSION_BOOTSTRAP.md`](../CWS_SESSION_BOOTSTRAP.md)
2. [`../CWS_KNOWLEDGE_ROUTER.yaml`](../CWS_KNOWLEDGE_ROUTER.yaml)
3. [`../CURRENT_STATUS.md`](../CURRENT_STATUS.md)
4. Follow the router to the task-specific current authority.

Current Codex/AI execution rules are owned by:

- [`../AGENTS.md`](../AGENTS.md)
- [`../AGENTS02.md`](../AGENTS02.md)
- [`../CODEX_GLOBAL_RULES.md`](../CODEX_GLOBAL_RULES.md)
- [`../FOUNDER_RULES.md`](../FOUNDER_RULES.md)
- [`../CWS_AI_ENGINEERING_HARNESS_V1.md`](../CWS_AI_ENGINEERING_HARNESS_V1.md)
- [`../CWS_BRANCH_HYGIENE_POLICY.md`](../CWS_BRANCH_HYGIENE_POLICY.md)
- [`../CWS_STALENESS_GUARD.md`](../CWS_STALENESS_GUARD.md)
- [`../.specify/memory/constitution.md`](../.specify/memory/constitution.md)

## Important current rules

- `main` owns canonical knowledge after merge; do not treat every old branch as current work.
- Use `CWS_BRANCH_HYGIENE_POLICY.md` before creating/reusing branches or PRs.
- Do not use an old versioned roadmap as source of truth; `CWS_ROADMAP.md` is the active roadmap authority when the router selects roadmap material.
- GitHub + current runtime evidence outrank stale prose for current-state claims.
- Historical specs/reports that still reference this `public/` file remain historical evidence only.

If an AI reaches this file during grounding, it must immediately leave this compatibility stub and continue from `CWS_SESSION_BOOTSTRAP.md`.
