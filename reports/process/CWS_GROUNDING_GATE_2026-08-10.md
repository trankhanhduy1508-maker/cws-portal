# CWS Grounding Gate — 2026-08-10

## Problem
CWS already had source-of-truth and staleness rules, but an AI could still form plausible unsupported conclusions from memory, partial documents, code-only evidence, or inferred runtime state.

## Root cause
The governance stack lacked an explicit evidence-classification gate before diagnosis and implementation.

## Change
- Added `CWS_GROUNDING_POLICY.md`.
- Added mandatory FACT / INFERENCE / HYPOTHESIS / UNKNOWN classification for material claims.
- Added evidence hierarchy and production-truth rule.
- Integrated grounding before staleness detection and before DONE.
- Updated `AGENTS.md` execution funnel and Definition of Done.
- Updated `CWS_STALENESS_GUARD.md` so semantic drift must be based on grounded evidence.

## Result
Grounding and staleness now form a pair:
1. prove what is true now;
2. compare active documents against that truth;
3. reconcile drift before implementation;
4. downgrade unsupported claims instead of guessing.

## Learning rule
No evidence, no certainty. Code/test/simulation evidence cannot be promoted into current production runtime truth by inference.
