# CURRENT_STATUS

## Current Phase
Customer MVP workflow convergence before Golden Production E2E.

## Founder Priority — 2026-08-11
Stop the current Admin refinement loop. The separate Admin site already exists; interactive Admin OAuth/MFA polish is deferred.

The current product priority is the **Customer Portal from Customer Google Login onward**.

## Current Task
`specs/008-customer-standard-workflow/`

Make the Customer Portal follow one canonical production journey:

`Google Login -> Submit input -> materialize/validate -> choose Economy/Balanced(Standard)/Priority -> Start render -> prepare/optimize -> real render/progress -> B2 locked output -> 3–5 watermarked previews -> final price + MB QR -> SePay exact verification -> PAID -> authorized download -> History`

## Verified Mismatch Driving This Task
Current source still contains stale/contradictory behavior:
- Landing + Upload are currently visible together before customer authentication.
- OAuth is currently deferred until the customer presses Render, creating pending-Drive/sessionStorage recovery complexity.
- status copy still includes preview approval language although no customer approval gate is allowed.
- public render profile constants still include `turbo` despite the current three-tier product direction.
- public link comments still mention OneDrive/Dropbox/direct links although the canonical MVP input contract is `.blend/.zip/.rar` + approved Google Drive.

## Required Convergence
1. Google customer login becomes the first operational gate.
2. Upload/Drive is authenticated-only.
3. Canonical materialized/validated input must exist before mode selection/job creation.
4. Customer chooses service/speed preference only, never GPU/CPU.
5. Exactly one Job is created after input readiness.
6. Real Worker/Blender/progress only.
7. Full output is validated/uploaded/locked before payment.
8. Preview + final price + exact transfer content + MB QR appear without an approval gate.
9. SePay exact/idempotent match produces `PAID`.
10. Authorized download and History remain tied to the same real Job.

## Deferred
- Admin UI refinement.
- Admin MFA UX polish beyond the already-deployed separate Admin application.
- New infrastructure/resources.

## Golden Production E2E
Still **NOT PROVEN**. Do not claim PASS from build/test/deployment state alone.

The next implementation must follow the Spec Kit/Ray Dalio funnel, run frontend + backend CI, deploy only the existing `cws-portal` project, and gather real customer/Worker/B2/SePay evidence.

## Last Updated
2026-08-11 — Founder redirected priority from Admin back to standard Customer workflow.
