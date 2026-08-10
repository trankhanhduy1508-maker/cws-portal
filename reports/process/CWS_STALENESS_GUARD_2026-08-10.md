# CWS Staleness Guard — 2026-08-10

## Problem
CWS documents can become semantically obsolete after multiple rapid work cycles even when filenames and prose still look valid. Agents reading top-to-bottom may obey stale instructions before reaching newer evidence.

## Root cause
There was no explicit early-read semantic drift gate requiring comparison of active docs against newer Owner decisions, code/schema/runtime evidence and current source-of-truth documents.

## Fix
- Added `CWS_STALENESS_GUARD.md`.
- Inserted it immediately after `CURRENT_STATUS.md` in `AGENTS.md` mandatory read order.
- Added blocking vs non-blocking stale-document behavior.
- Added compact `STALE-DOC ALERT` format for Founder review.
- Added mandatory Converge/Verify staleness sweep before DONE.

## What was deliberately not done
- No date-based automatic expiry rule was added because age is only a weak signal and would produce false positives.
- Historical reports/git history are preserved.
- Agents are not authorized to silently rewrite ambiguous product intent.

## Lesson / rule
Documentation freshness is a consistency problem, not a timestamp problem. Detect semantic drift against the newest authoritative evidence, then reconcile before implementation can inherit obsolete assumptions.