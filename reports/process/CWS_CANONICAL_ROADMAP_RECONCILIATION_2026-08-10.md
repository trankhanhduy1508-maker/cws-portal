# CWS Canonical Roadmap Reconciliation — 2026-08-10

## Scope
Documentation/source-of-truth reconciliation only. No frontend/backend/Worker/database/payment/deployment/infrastructure implementation.

## Problem / Incident
CWS accumulated multiple active-looking roadmap files (`MVP V1`, Production E2E `V2.2`, `V2.3`, `V2.4`) while `AGENTS.md` still elevated the oldest roadmap. `CURRENT_STATUS.md` also accumulated historical snapshots rather than representing only current state.

## Root Cause
Versioned roadmap files were added incrementally without a single replacement contract. Agent governance referenced filenames instead of a canonical-roadmap invariant, so newer workflow decisions could coexist with older instructions.

## Owner Decisions Applied
- Merge current roadmap direction into one canonical roadmap.
- Remove obsolete roadmap authority/files.
- Customer approval before payment is wrong and removed from canonical rules.
- `CURRENT_STATUS.md` must be current-only.
- `PROJECT_CONTEXT.md` must represent current CWS.
- Correct order: `Google Login -> Upload/Drive -> materialize/validate -> create Job`.
- Keep customer pricing multiplier at `2.5x`; no new base rate invented.

## What Was Completed
- Added `CWS_ROADMAP.md` as the single canonical roadmap.
- Rewrote `CURRENT_STATUS.md` to current-only format.
- Rewrote `PROJECT_CONTEXT.md` to current architecture/product context.
- Corrected `CWS_MVP_WORKFLOW_FINAL.md` input/job ordering and removed approval-gate ambiguity.
- Updated `AGENTS.md` source-of-truth hierarchy and canonical product invariants.
- Amended constitution from 1.1.0 to 1.2.0 for canonical roadmap and corrected workflow ordering.
- Reconciled `DECISIONS.md` to current active decisions.
- Removed obsolete roadmap files from active branch: `CWS_ROADMAP_MVP_V1.md`, `CWS_PRODUCTION_E2E_ROADMAP_V2_2.md`, `CWS_PRODUCTION_E2E_ROADMAP_V2_3.md`, `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`.
- Preserved historical evidence in `reports/` and all deleted content in git history.

## What Did Not Work / Friction
- An initial `CURRENT_STATUS.md` update used a stale blob SHA and GitHub correctly rejected it with HTTP 409. The file was re-fetched on the working branch and updated using the current SHA.
- Repeated branch-creation calls correctly returned `Reference already exists`; no duplicate branch/resource was created.

## Lessons / Durable Rules
1. **Roadmap identity must be stable.** Use `CWS_ROADMAP.md`; do not encode roadmap generations in the authoritative filename.
2. Historical roadmaps belong in git history/evidence, not as concurrent active source-of-truth files.
3. `CURRENT_STATUS.md` is an entry point, not a changelog.
4. Product ordering belongs in one canonical workflow and must be repeated only as invariants in governance docs.
5. When pricing is partially confirmed, preserve the confirmed multiplier and do not infer an unconfirmed base rate.
6. Documentation reconciliation should be handled as a real Spec Kit change because stale instructions can cause incorrect code later.

## Remaining Risk
Historical reports/directives may mention old roadmap filenames or old intermediate workflow states. These references are acceptable when clearly historical evidence, but future active governance files must not depend on them.

## Next Verified Bottleneck
After source-of-truth convergence, resume Golden Production E2E at the first current real runtime bottleneck from `CURRENT_STATUS.md`: authenticated customer input -> materialize/validate -> create customer-owned Job, then continue until the next real failure is evidenced.
