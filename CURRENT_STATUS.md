# CURRENT_STATUS

## Current Phase
Customer MVP workflow convergence before Golden Production E2E.

## Founder Priority — 2026-08-11
Customer is the **current highest-priority product bottleneck**. Continue the Customer Portal from Customer Google Login through real render/payment/download before spending another long cycle on non-blocking Admin polish.

Admin/Host is **not abandoned and not de-scoped**. It remains a core CWS operational product surface and will continue to be developed after the Customer workflow reaches its next production gate. The separate Admin site and its security requirements remain active.

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

## Sequenced After Current Customer Gate
- Continue Admin UI refinement.
- Continue Admin OAuth/MFA UX verification and polish.
- Further Admin operational features according to the roadmap.

This sequencing does not make Admin optional. Admin remains part of the active CWS architecture and must continue to pass shared build/security regressions while Customer work proceeds.

## Golden Production E2E
Still **NOT PROVEN**. Do not claim PASS from build/test/deployment state alone.

The next implementation must follow the Spec Kit/Ray Dalio funnel, run frontend + backend CI, deploy only the existing `cws-portal` project for this Customer change, and gather real customer/Worker/B2/SePay evidence.

## Last Updated
2026-08-11 — Founder clarified sequencing: Customer first now; Admin remains important and continues afterward.
