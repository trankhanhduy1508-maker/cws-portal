# CWS Node Agent retry jitter hardening — 2026-08-06

## Scope

P1 reliability hardening only. No Supabase/B2 calls, production jobs, Windows
power APIs, staging deployment, or previously verified runtime flow was used.

## Change

- `worker/node_agent.py` accepts a bounded `retry_jitter_ratio` in `[0, 1]`.
- Jitter is additive to the existing exponential backoff and is calculated as
  `base_delay * ratio * random_value`.
- The default ratio is `0.0`, preserving the current timing contract until a
  production caller opts in. Randomness is injectable for deterministic tests.
- Lease generation, retry count, cleanup, and state transitions are unchanged.

## Evidence

- Python 3.12.7 portable runtime: PASS.
- Worker offline suite: **32/32 PASS**.
- The focused tests verify deterministic bounded jitter (`10s + 25% * 0.5 =
  11.25s`) and reject ratios outside `[0, 1]`.
- No production or staging mutation was performed.

## Remaining gates

This does not close the separate production blockers: synchronous remote I/O,
SCM/Job Object production integration, hostile `.blend` filesystem/network
isolation, credential rotation, Admin AAL2 enrollment, or production RPC
authentication.
