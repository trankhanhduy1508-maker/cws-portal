# Spec 006 — Grounding Gate

## Goal
Make grounding mandatory for every CWS analysis, recommendation, implementation decision and status claim.

## Problem
AI agents can still produce plausible but weakly-supported conclusions even when the repository has source-of-truth and staleness rules. This can cause implementation from memory, stale assumptions, inferred runtime state, or unsupported architecture claims.

## Grounding invariant
A material claim must be traceable to one or more current sources: explicit Founder decision, canonical active document, current code/test, applied schema/migration, production configuration, or runtime evidence.

## Requirements
1. Add `CWS_GROUNDING_POLICY.md` as a mandatory early-read governance file.
2. Grounding must occur before diagnosis/specification and again before DONE.
3. Separate FACT, INFERENCE, HYPOTHESIS, and UNKNOWN.
4. Runtime/production claims require runtime/production evidence; code/tests cannot be promoted by inference.
5. When evidence conflicts, surface the conflict; do not average or silently choose.
6. Claims without enough evidence must be labeled UNKNOWN/NEEDS_VERIFICATION rather than guessed.
7. External technical research, when needed, should prefer primary/official sources and be converted into a repository decision/spec before implementation.
8. Add grounding to `AGENTS.md` and integrate it with `CWS_STALENESS_GUARD.md`.

## Success criteria
An agent starting from `AGENTS.md` is forced to identify evidence for material claims, distinguish inference from fact, and refuse unsupported certainty before it can implement or declare DONE.
