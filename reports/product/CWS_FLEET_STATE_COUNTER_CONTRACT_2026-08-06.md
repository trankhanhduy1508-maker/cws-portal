# Fleet state counter contract — 2026-08-06

- Backend `deriveWorkerFleetState()` remains the canonical state mapping:
  stale heartbeat → `OFFLINE`, `ACTIVE_IDLE` → Idle Saver, `BUSY` → Đang
  Render, with `PREPARING` and `RECOVERY` preserved.
- Frontend `summarizeWorkers()` only counts backend `online` and `nodeState`
  values; it does not invent or infer production states.
- Idle Saver therefore means online + `ACTIVE_IDLE`; heartbeat freshness and
  safety behavior remain owned by the Worker/Node Agent contract.

Verification: `fleetMetrics.test.js` PASS and existing backend fleet-state
tests PASS. Production endpoint `/fleet/workers` returns HTTP 401 without
credentials; a real fleet payload still requires Admin AAL2.
