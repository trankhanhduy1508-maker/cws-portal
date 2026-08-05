# CWS Node Agent → Supabase → Admin fleet visibility evidence

Ngày: 2026-08-05

## Implemented

- Added backend state derivation in `backend/src/jobs/worker-fleet-state.ts`.
- Heartbeat freshness is authoritative for PC online/offline:
  - fresh heartbeat + Worker stopped/idle = `ONLINE` / `ACTIVE_IDLE`;
  - stale heartbeat (>180 seconds) = `OFFLINE`, regardless of stale Worker status.
- Observed lifecycle mapping:
  - PREPARING/BOOTING/HEALTH_CHECK/WORKER_START → PREPARING;
  - RENDERING/MERGING/UPLOADING/VERIFYING/WORKER_RUNNING → BUSY;
  - RECOVERY/DEGRADED/ERROR/QUARANTINED → RECOVERY.
- `GET /fleet/workers` now exposes `online`, `nodeState`, `workerState`, `healthState`, `currentTaskId`, and stale policy.
- Admin worker table shows PC/Node state, Worker state, current Job, last seen and health.
- Production SPA route support added:
  - `vercel.json` rewrites `/admin` to `index.html`;
  - `src/App.jsx` accepts pathname `/admin` and preserves `#admin`.

## Tests

- Backend targeted state tests: 3/3 PASS.
- Backend build: PASS.
- Frontend build: PASS.
- Frontend lint: PASS.
- Frontend tests: 6/6 PASS.
- Backend full suite: 143/144 PASS in the current local checkout. The one failure is the pre-existing credential hygiene test because that checkout lacks `cws_worker_full.py`; this is a checkout/artifact mismatch, not a state-mapping failure.

## Production verification status

The previous read-only request to `https://cws-portal.vercel.app/admin` returned Vercel `NOT_FOUND` before this routing change. A live production deploy/browser-auth verification is therefore **UNVERIFIED** until Vercel builds this main revision and an Admin account completes Supabase MFA.

No production job, payment, database migration, power state, or credential was changed.


## Vercel runtime check — 2026-08-05

- Project giữ: cws-portal, domain cws-portal.vercel.app.
- Latest READY production deployment observed: dpl_5tPsq54K6fAwjksjCN3yBxcsE6AU, commit 13cf7ed (state helper commit).
- This deployment metadata does not include the later route/Admin commits; production GET /admin still returned 404 at check time.
- Therefore production Admin route and live fleet data are **NOT YET VERIFIED**. Do not report production PASS until a deployment containing the route/state commits is READY and an Admin AAL2 session can load GET /fleet/workers.


## Staging process check — 2026-08-05

- Read-only process inspection found no running Node Agent/cws_worker/Blender process on the current Windows session. Only unrelated Node processes and Parsec were present.
- Therefore no real heartbeat was emitted and no Supabase row was changed. Real Node Agent → Supabase → Admin E2E remains **BLOCKED/UNVERIFIED**, correctly not simulated.
- Required next physical step: start the pinned Node Agent on the designated staging PC with its scoped environment and capture heartbeat/last_seen before opening Admin AAL2 session.
