# CWS Frontend WebSocket Base URL Fix — 2026-08-03

## Finding

The deployed Portal bundle was configured with the production API URL
`https://cws-portal.onrender.com`, while `VITE_CWS_WS_BASE_URL` was empty.
`RenderService.subscribeToJobUpdatesReal()` then constructed a WebSocket URL
from an empty base, producing a relative `/ws/jobs/:id` URL instead of an
absolute `wss://` endpoint.

Evidence collected before the fix:

- `https://cws-portal.vercel.app/` served a production bundle containing
  `BASE_URL: https://cws-portal.onrender.com` and an empty `WS_BASE_URL`.
- `https://cws-portal.onrender.com/health` returned HTTP 200 with
  `{"status":"ok","service":"cws-backend"}`.
- Local `src/services/RenderService.js` uses `new WebSocket(wsUrl)` for the
  real-time job subscription.

## Fix

`src/services/apiConfig.js` now derives `WS_BASE_URL` from the API URL when the
separate WebSocket environment variable is absent. An explicitly configured
`VITE_CWS_WS_BASE_URL` still takes precedence.

## Verification

- Frontend `npm ci`: PASS.
- Frontend `npm run build`: PASS (existing chunk-size warning only).
- Frontend `npm run lint`: PASS.
- Production-shaped build with `VITE_CWS_API_BASE_URL=https://cws-portal.onrender.com`
  embedded the fallback expression that converts `https:` to `wss:`.
- Backend `npm test -- --runInBand`: 16 suites, 117/117 tests PASS.
- Backend `npm run build`: PASS.
- Backend lint was not auto-fixed: the repository's existing CRLF/Prettier
  mismatch reports errors across unrelated files; applying `--fix` would
  reformat files outside this task.

## Remaining

This is a code/config fix, not full customer-flow E2E evidence. A real logged-in
customer job is still required to verify the complete WebSocket → Worker →
Render → Preview chain.
