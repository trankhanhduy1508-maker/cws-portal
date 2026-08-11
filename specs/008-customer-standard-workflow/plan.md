# Plan 008 — Standard Customer Workflow

## Execution funnel
Reality -> Root cause -> Current bottleneck -> Constitution -> Specify -> Plan -> Tasks -> Analyze -> Implement -> Converge.

## Root cause
The Customer Portal evolved through several product decisions without one enforced screen/state contract. Legacy customer-choice logic, comments and lifecycle labels survived after the canonical business workflow changed.

## Current bottleneck
Customer Golden E2E remains the implementation priority. Admin/Host stays important but is not the current non-blocking UX focus.

## Implementation strategy

### Phase A — Authentication gate
Operational Customer flow begins only after `useAuth()` confirms an authenticated Google customer session.

Expected UX:
- unauthenticated: login gate + Continue with Google;
- authenticated: input screen;
- restored session: continue from authenticated state.

### Phase B — Input state
Upload/Drive is an authenticated step.

- Accept `.blend/.zip/.rar` or approved Google Drive file links.
- Continue only after a real canonical input reference is returned.
- Do not create a Job from an unresolved raw input.
- Show real upload/resolve/materialize/validate state and errors.

### Phase C — Automatic scheduling boundary
There is **no customer render speed/tier selection and no customer hardware/Worker-count selection**.

After canonical input is ready:
- create exactly one customer-owned Job;
- dispatch through the existing durable Worker/Scheduler boundary;
- Scheduler determines task graph, eligible capacity and later adaptive scale from authoritative metadata/runtime/fleet evidence;
- no compatibility code may resurrect a customer choice screen, tier identifier, tier-specific estimate endpoint or tier-specific persistence field.

Historical rows/migrations may document prior behavior, but active runtime/API/UI must not depend on it.

### Phase D — Job lifecycle labels
Reconcile frontend state mapping with actual backend lifecycle.

Public customer states should communicate the real progression without implying a removed customer decision gate.

If backend retains transitional machine states such as `REVIEW_READY` or `PACKAGING`, map them to truthful non-interactive customer states. Full output must already be validated/uploaded/locked before payment.

### Phase E — Result/payment screen
At the payment boundary show:
- real watermarked previews;
- final price from verified runtime/cost evidence;
- MB QR;
- exact transfer content/reference;
- real payment waiting state.

No customer render-tier choice and no preview-approval prerequisite.

After PAID/FINISHED, expose authorized download only.

### Phase F — History/recovery
- Refresh/reopen running Job reattaches by real Job ID.
- History cannot create a duplicate Job.
- History remains customer-owned and backend authorized.
- History must not display removed tier/profile metadata.

### Phase G — Tests and production evidence
Coverage must include:
1. unauthenticated customer cannot reach operational input;
2. login success reveals input;
3. canonical input readiness precedes Job creation;
4. Job creation happens once;
5. Customer payload/API/public JSON contain no removed tier/profile contract;
6. no removed selection screen/constants/components remain in active runtime;
7. payment UI appears only after rendered output/previews/final price backend state;
8. refresh/History reattach same Job;
9. paid state produces authorized download path.

Run frontend build/test/lint and backend build/test/lint. Deploy only existing approved CWS resources and gather runtime evidence separately.

## Files likely involved
- `src/App.jsx`
- `src/pages/UploadScreen.jsx`
- `src/pages/ReviewScreen.jsx`
- `src/pages/PaymentScreen.jsx`
- `src/pages/ProgressScreen.jsx`
- `src/pages/HistoryScreen.jsx`
- `src/constants/renderConstants.js`
- `src/services/RenderService.js`
- backend Job DTO/domain/controller/service/repository/presenter
- relevant migration/tests
- active source-of-truth docs

Codex must preserve Scheduler ownership, atomic claim, lease/generation fencing, payment, Admin and Worker security boundaries unless separately approved.
