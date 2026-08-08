# CWS Production E2E Roadmap V2.4 — 2026-08-08

## Status

Implementation is in progress. Code/unit/build gates pass for the V2.4
workflow, but Golden Production E2E is **NOT PASS** until the exact production
Drive job is claimed by the canonical physical Worker and the real B2/SePay
delivery chain is evidenced.

## Canonical order

1. Authenticated customer uses `https://cws-portal.vercel.app/`.
2. Exact Drive input is verified by Backend and materialized into B2 input.
3. Backend creates the durable job/task; only the canonical production Node
   Agent claims it using a job-scoped storage capability.
4. Worker downloads the B2 input, safely extracts `.zip`/`.rar` if needed, and
   requires exactly one `.blend`.
5. Worker runs Blender preflight, then immutable original → analyzer → working
   copy → safe optimizer → validation. Customer original is never modified.
6. Worker renders through Blender CLI/background with `--disable-autoexec`,
   reports real progress, validates each real output, and checkpoints to B2.
7. Backend packages and uploads the FULL OUTPUT under `final/` before payment,
   keeps it locked, generates 3–5 CWS-watermarked previews, then calculates
   final runtime price and creates payment record/code/QR.
8. SePay webhook verifies canonical payment reference/content, exact amount and
   idempotent transaction identity. Only PAID transitions delivery to unlocked.
9. Customer receives an authorized signed B2 download; no rerender/reupload is
   performed after PAID. Temporary Worker workspace is cleaned and the Worker
   returns idle.

## Gates

| Gate | Current state | Evidence/remaining proof |
|---|---|---|
| `.blend`/`.zip`/`.rar` validation and safe extraction | CODE/UNIT VERIFIED | Physical managed 7-Zip RAR runtime still required |
| Immutable safe Blend optimization | CODE/UNIT VERIFIED | Physical customer Blend analyzer/optimizer/render trace required |
| Autoexec-off Blender CLI | CODE/UNIT VERIFIED | Physical production Worker trace required |
| Real durable claim/heartbeat/progress | CODE/UNIT VERIFIED | Canonical Worker credentials and live task required |
| Full output B2 lock before payment | CODE/UNIT VERIFIED | Real B2 object and private/authorized download proof required |
| 3–5 watermark previews | CODE/UNIT VERIFIED | Real render frame objects and customer API trace required |
| Final price + canonical MB QR | CODE/UNIT VERIFIED | Deployed MB account env and real payment record required |
| SePay exact match/idempotency | CODE/UNIT VERIFIED | SePay sandbox/test event against this job required |
| PAID-only authorized download | CODE/UNIT VERIFIED | Real webhook → signed download trace required |
| Exact Drive Golden chain | BLOCKED pending external capability | Authenticated customer, Drive capability, B2, Worker and SePay runtime |

## Forbidden shortcuts

No fixture substitution, fake progress, direct database PAID mutation, new
Vercel/Supabase/B2/render project, legacy Worker, service-role/broad B2
credential on Worker, invented QR account, customer-original mutation, or
quality-reducing optimization without approved benchmark/policy.
