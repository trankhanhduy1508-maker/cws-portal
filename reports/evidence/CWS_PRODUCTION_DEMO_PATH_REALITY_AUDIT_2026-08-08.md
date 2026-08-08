# CWS Production Demo-Path Reality Audit — 2026-08-08

## Scope

Audit the canonical production path after Founder reported that the portal
appeared to behave like a demo. This report records only read-only runtime
evidence and code/build verification; it does not claim a render.

## Verified production wiring

- Canonical Vercel project: `cws-portal` (`prj_oEEqu24zYqTq1p9FJhzkUake0pEi`).
- Canonical domain: `https://cws-portal.vercel.app`.
- At audit time, production deployment was
  `dpl_qp1rkkohBG5TYeWjWHZEFYnsuvZa`, `READY`, Git `main` commit
  `136a241ca7e71965ddc87fa82bc930aba7689651`.
- Served bundle contains the canonical backend URL
  `https://cws-portal.onrender.com`.
- `GET https://cws-portal.onrender.com/health` returned HTTP 200 with
  `{"status":"ok","service":"cws-backend"}`.
- Supabase Auth settings report Google provider enabled.

## Reality findings

1. Supabase `input_uploads` has no rows and `render_orders` has no rows from
   the preceding seven days. Existing orders/tasks are historical Drive-backed
   records, not evidence of the current customer flow.
2. MAY083 (`CWS-BAE2782D20525D46`) has a fresh authenticated heartbeat and
   `ACTIVE_IDLE`, but no `current_task_id`. This proves presence only.
3. Historical queued Drive tasks are deliberately excluded from the B2-only
   Worker claim contract. They cannot be used as evidence for the new E2E
   path, and the audit did not mutate or requeue them.
4. The prior app source retained a dev-only dynamic import of `mockBackend`.
   Although the compile-time production condition was false, Vite emitted that
   code as a production asset. This was removed: the auth service now only uses
   Supabase OAuth or fails closed; `mockBackend.js` was removed; no generated
   build asset or source runtime reference remains.
5. The UI already withheld QR/payment until `AWAITING_PAYMENT`, but profile
   copy incorrectly described a pre-render estimate as a cost comparison. It
   now states that final price is shown only after real render completion.

## Verification performed

- Frontend: `npm test` — 6 files / 12 tests PASS.
- Frontend: `npm run lint` — PASS.
- Frontend: `npm run build` — PASS.
- Searched generated `dist/` for `mockBackend`, `mock-token-demo`,
  `mock-customer-demo`, and `VITE_ENABLE_MOCK_AUTH`: no runtime reference.

## Not verified / not claimed

- authenticated customer upload;
- new production job and task row;
- Worker claim/lease/attempt;
- Blender PID and output;
- B2 capability transfer/checkpoint/finalization;
- review, runtime price, payment, PAID, or customer download.

## Single external gate

An authenticated Google customer session is required to submit one actual
`.blend` or `.zip` through the portal. The agent has no customer Bearer token
and does not read browser session secrets. No database/API bypass, synthetic
job, or historical Drive task was used to manufacture E2E evidence.
