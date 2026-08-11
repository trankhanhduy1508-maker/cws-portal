# Spec 008 — Standard Customer Workflow

## Goal
Make the Customer Portal follow one unambiguous production workflow beginning with customer Google authentication and ending with authorized result download. Admin/Host work is deferred.

## Founder decision
Approved 2026-08-11: stop spending the current implementation cycle on Admin UX. Return to the Customer MVP and make the customer workflow canonical, starting from Customer Login.

## Reality / current mismatch
Current production/source has several contradictory assumptions:

1. `LandingScreen.jsx` currently advertises that Google login is optional until the customer presses Render.
2. `App.jsx` currently renders Landing + Upload together for unauthenticated visitors and includes sessionStorage recovery logic because OAuth can happen after Drive input selection.
3. `renderConstants.js` still contains stale copy for `REVIEW_READY` / `STAGE_SEQUENCE` such as “Chờ bạn duyệt bản xem trước”, even though the active workflow explicitly has no customer preview-approval gate.
4. `renderConstants.js` exposes four render profiles including `turbo`, while current product direction is Economy / Balanced(Standard) / Priority unless a separate active decision approves another mode.
5. Comments/constants still mention OneDrive/Dropbox/direct arbitrary links even though the current canonical customer input contract is `.blend/.zip/.rar` + approved Google Drive.
6. `PACKAGING`/status copy risks implying output creation occurs after payment, conflicting with the active rule that the full output is uploaded and locked before payment.

These contradictions are workflow debt and make UI, backend state interpretation, tests and E2E evidence harder to reason about.

## Canonical customer journey
`Google Login -> Submit input -> materialize/validate -> choose Economy/Balanced(Standard)/Priority -> Start render -> prepare/optimize -> real render/progress -> validate + B2 locked output -> 3–5 watermarked previews -> final price + payment reference + MB QR -> SePay exact verification -> PAID -> authorized download -> History`

## Scope
- Customer Portal only.
- Login becomes the first operational gate.
- Upload/Drive controls are usable only after authenticated customer session.
- Remove the “upload first, OAuth later” behavioral dependency and related pending-input workaround if no longer needed.
- Keep Google OAuth session restore so already-authenticated customers skip the login gate.
- Require canonical materialized/validated input before moving to render-mode selection/job creation.
- Customer selects service/speed preference only; never GPU/CPU hardware.
- Converge public modes to Economy / Balanced(Standard) / Priority unless code/backend contract requires a compatibility alias.
- Remove stale preview-approval language/actions.
- Preserve output-before-payment order: render -> validate -> B2 full output locked -> previews -> final price/QR -> SePay -> download.
- Keep History/reattach behavior tied to the same real Job ID.
- Add regression/E2E coverage for the full screen/state ordering.
- Update source-of-truth docs and engineering learning log.

## Non-goals
- Do not redesign Admin/Host in this change.
- Do not create new Vercel/Render/Supabase/B2 resources.
- Do not change payment method away from MB Bank QR + SePay.
- Do not invent a new pricing base rate.
- Do not add OneDrive/Dropbox/direct-link ingestion.
- Do not add customer GPU/CPU selection.

## Security / data invariants
- Customer identity and input ownership are server-side enforced.
- File extension alone is not trusted.
- Drive URL is an ingestion source, not a durable Worker dependency.
- Original customer input stays immutable.
- Untrusted Blender Python autoexec stays disabled.
- Full result remains locked until server-side `PAID`.
- Frontend local state never authorizes payment/download.

## Definition of Done
A real production customer can complete, in order:

1. Google login.
2. Authenticated Upload/Drive input.
3. Real canonical materialization/validation.
4. Approved render-mode selection.
5. One Job creation after input readiness.
6. Real Worker/Blender execution with real progress.
7. B2 full output locked before payment.
8. Real 3–5 watermarked previews.
9. Final price + exact payment content + MB QR.
10. Exact/idempotent SePay verification.
11. PAID.
12. Authorized download.
13. Same Job visible in History.

No mock/demo substitute counts as production evidence.
