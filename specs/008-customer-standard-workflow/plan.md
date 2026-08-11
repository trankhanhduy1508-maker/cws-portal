# Plan 008 — Standard Customer Workflow

## Execution funnel
Reality -> Root cause -> Current bottleneck -> Constitution -> Specify -> Plan -> Tasks -> Analyze -> Implement -> Converge.

## Root cause
The Customer Portal evolved through several product decisions without a single screen/state contract being enforced in code. As a result, old assumptions remain in UI comments, render-profile constants and job status labels even after the canonical business workflow changed.

## Current bottleneck
The first production E2E bottleneck is no longer Admin. It is that the Customer Portal does not yet express one trustworthy workflow from login through download.

## Implementation strategy

### Phase A — Authentication gate
Refactor `CustomerPortalApp` so the operational flow begins only after `useAuth()` confirms an authenticated customer session.

Expected UX:
- unauthenticated: customer login gate/marketing + Continue with Google;
- authenticated: New Render Job input screen;
- restored session: skip login gate.

Remove the need to preserve a Drive link across an OAuth redirect because Drive input is no longer accepted before login. Delete pending-input/sessionStorage logic when tests prove it is unused.

### Phase B — Input state
Make Upload/Drive a distinct authenticated step.

- Upload `.blend/.zip/.rar` or supported Google Drive only.
- Continue only after a real canonical input reference is returned.
- Do not fall through with raw `driveLink` when `fileRef` is absent.
- Show actual upload/resolve/materialize/validate state and errors.

### Phase C — Render mode
Keep the customer choice about service/speed, not hardware.

Converge public options to:
- Economy
- Balanced/Standard
- Priority

If backend/API currently uses `standard`, retain it as the machine identifier while displaying “Balanced” if needed. Remove `turbo` unless an active backend/product contract proves it must remain; do not silently break existing stored jobs.

### Phase D — Job lifecycle labels
Reconcile frontend status mapping with actual backend statuses.

Public customer states should communicate:
`Queued -> Finding machine -> Preparing -> Rendering -> Validating output -> Awaiting payment -> Paid/Completed`.

Remove stale customer-approval language. If backend retains `REVIEW_READY`, map it to a non-interactive preview/output-preparation state or skip it in public step sequencing. Do not add an Approve button.

If backend retains `PACKAGING`, ensure it does not represent post-payment generation of the deliverable. The full output must already be uploaded/locked before payment.

### Phase E — Result/payment screen
At `AWAITING_PAYMENT`, show one consolidated customer screen containing:
- real watermarked previews;
- final price;
- MB QR;
- exact transfer content/reference;
- real payment waiting state.

No preview-approval action.

After backend `PAID/FINISHED`, expose authorized download only.

### Phase F — History/recovery
- Refresh/reopen running job must reattach using real job ID.
- History cannot create a duplicate job.
- History must be customer-owned and backend authorized.

### Phase G — Tests and production evidence
Add/adjust tests covering:
1. unauthenticated customer cannot reach operational Upload/Drive;
2. login success reveals input step;
3. input readiness precedes render mode;
4. job creation happens once and only after canonical input ready;
5. no preview approval CTA exists;
6. payment UI appears only after rendered output/previews/final price backend state;
7. refresh/History reattach same job;
8. paid state produces authorized download path;
9. stale `turbo`, OneDrive/Dropbox/direct-link public claims are absent unless explicitly preserved for compatibility and not exposed.

Run frontend build/test/lint and backend build/test/lint. Then deploy existing Customer Portal project only and gather browser + backend/Worker/payment evidence.

## Files likely involved
- `src/App.jsx`
- `src/pages/LandingScreen.jsx`
- `src/pages/UploadScreen.jsx`
- `src/pages/RenderProfileScreen.jsx`
- `src/pages/ReviewScreen.jsx`
- `src/pages/PaymentScreen.jsx`
- `src/pages/ProgressScreen.jsx`
- `src/pages/HistoryScreen.jsx`
- `src/constants/renderConstants.js`
- auth/input/job hooks/services and their tests
- `CURRENT_STATUS.md`
- `CWS_ROADMAP.md`
- engineering learning log/report

Codex must inspect backend job/status contracts before deleting or renaming machine-level states.
