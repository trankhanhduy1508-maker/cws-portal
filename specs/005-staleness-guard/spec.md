# Spec 005 — CWS Staleness Guard

## Goal
Prevent Codex/ChatGPT/other agents from following stale roadmap, workflow, decision, architecture or status instructions after later code/evidence/Owner decisions have made those instructions obsolete.

## Reality / Diagnosis / Root Cause
- CWS changes rapidly across multiple work cycles.
- Even with one canonical roadmap, surrounding documents can drift after later implementation/evidence/Owner decisions.
- Agents often read documents from top to bottom and may obey stale prose before noticing newer evidence.
- Root cause: there is no mandatory semantic staleness gate that explicitly requires agents to compare governing docs against newer evidence and report suspected drift to the Founder before using it.

## Requirements
1. Add `CWS_STALENESS_GUARD.md` as a mandatory early-read governance file.
2. Staleness detection must be semantic, not based on file age alone.
3. Agents must compare roadmap/workflow/decisions/context/status/architecture against current code, schema, tests, runtime evidence and later explicit Owner decisions.
4. Suspected staleness affecting the current task must block implementation until reconciliation or Founder confirmation.
5. Suspected staleness unrelated to the current task must be reported but may not block unrelated safe work.
6. Agents must not silently reinterpret product intent when evidence cannot prove the intended new behavior; they must ask/report to Founder.
7. At Converge/Verify, agents must run a staleness pass and sync affected source-of-truth documents.
8. The guard must define a compact standard alert format so Founder can confirm/reject quickly.

## Non-goals
- Do not treat every old date as stale.
- Do not delete historical evidence/reports.
- Do not create a second roadmap.
- Do not allow an AI to override explicit Founder product decisions based only on inference.

## Success criteria
An agent reading `AGENTS.md` encounters the staleness guard before the canonical roadmap and is required to raise a clear `STALE-DOC ALERT` when a material mismatch is detected rather than implementing from suspected obsolete instructions.