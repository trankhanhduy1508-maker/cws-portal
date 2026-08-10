# Plan 005 — CWS Staleness Guard

1. Create a single governance file `CWS_STALENESS_GUARD.md` defining semantic drift checks, severity, stop/report behavior and alert format.
2. Insert the guard into `AGENTS.md` immediately after `CURRENT_STATUS.md` and before `CWS_ROADMAP.md`.
3. Add the guard to source-of-truth sync/converge rules.
4. Preserve historical `reports/` and git history; do not use age alone as a stale signal.
5. Verify branch diff is documentation/governance only, then fast-forward main.