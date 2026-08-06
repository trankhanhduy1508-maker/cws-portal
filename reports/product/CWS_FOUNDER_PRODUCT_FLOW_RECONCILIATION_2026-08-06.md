# Founder product scope reconciliation — 2026-08-06

## Source of truth

Reviewed `AGENTS.md`, `LOOP.md`, `CURRENT_STATUS.md`,
`CWS_ROADMAP_MVP_V1.md`, `DECISIONS.md`, `CWS_MVP_WORKFLOW_FINAL.md`,
`CWS_DATABASE_SCHEMA.md`, Worker/Node VIBE docs, current frontend/backend code,
and the latest customer/payment/fleet evidence.

## Admin (`/#admin`)

- Before this change, `AdminScreen.jsx` loaded customer jobs, customers,
  incidents, host usage, payment devices, payment anomalies, search, preview,
  download and worker actions.
- Founder scope now requires fleet-only status. The screen now calls only
  `GET /fleet/workers` with the existing staff AAL2 token.
- Metrics are derived from backend response data, never hard-coded:
  `workers.length`, `online`, `!online`, and `nodeState === ACTIVE_IDLE`.
- `ACTIVE_IDLE` is the existing Node Agent state and is displayed as
  `Đang chờ / Idle Saver`; no new state or power-management behavior was added.
- Backend `deriveWorkerFleetState()` remains the source of the mapping:
  fresh heartbeat ≤180s is online, stale heartbeat is offline, and idle
  Worker/Node state maps to `ACTIVE_IDLE`.

## Customer (`/`)

- The product docs and backend state machine already enforce:
  `REVIEW_READY → approve() → runtime pricing → payment intent /
  AWAITING_PAYMENT → webhook PAID → PACKAGING → FINISHED/download`.
- `JobsService.approve()` rejects all non-`REVIEW_READY` states before pricing or
  payment creation; existing tests cover `RENDERING` rejection and use runtime
  pricing rather than the pre-render estimate.
- The UI mismatch was in `RenderProfileScreen`/`RenderProfileCard`: it showed a
  pre-render `Giá` value and a `Tiếp tục thanh toán` button. These are removed.
  The screen now shows profile/ETA information and `Bắt đầu render`; payment
  appears only after preview approval with backend-created payment data.
- No backend payment state machine or already-verified payment/download logic
  was rewritten.

## Verification

- Frontend tests: 8/8 PASS.
- Frontend lint: PASS.
- Frontend build: PASS; existing large chunk warning only.
- Backend tests: 132/132 PASS.
- Backend build: PASS.
- Fleet mapping tests already cover fresh idle online, stale offline, preparing,
  busy and recovery mappings.

## Runtime status

- CODE/UNIT VERIFIED only for this scope change.
- Production Admin runtime remains blocked: Render `/staff/mfa-status` still
  returns 404 and no real staff AAL2 session/fleet response has been captured.
- Full physical Worker → render → preview → live payment → download remains
  NEEDS_VERIFICATION; no production PASS is claimed.
