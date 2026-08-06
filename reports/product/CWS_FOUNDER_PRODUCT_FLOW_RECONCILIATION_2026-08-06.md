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
- Backend tests: 133/133 PASS.
- Backend build: PASS.
- Fleet mapping tests already cover fresh idle online, stale offline, preparing,
  busy and recovery mappings.

## Runtime status

- CODE/UNIT VERIFIED only for this scope change.
- Production Admin runtime remains blocked: Render `/staff/mfa-status` still
  returns 404 and no real staff AAL2 session/fleet response has been captured.
- Fresh read-only deployment evidence after commit
  `83fdff7d0e4bac3d5b9a082bacd8df865dbcf7db`: GitHub `main` and `origin/main`
  agree at that commit, but the latest Vercel READY production deployment
  observed is `dpl_4qKLiPHdub6vPb93seejXPDYCCYf` for commit
  `33dc578919a6d6fa013575ab593e8d4accc6e404`. The public bundle still contains
  the old `Tiếp tục thanh toán` Render Profile CTA, so the new UI is not
  production-verified or claimed live.
- Render read-only probes: `/health` HTTP 200; `/staff/mfa-status` HTTP 404.
- Full physical Worker → render → preview → live payment → download remains
  NEEDS_VERIFICATION; no production PASS is claimed.
