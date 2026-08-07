# CWS production E2E pricing gate - 2026-08-07

## Scope

This audit covers the final amount calculation that runs after `REVIEW_READY`
and customer approval. It does not claim a production render, payment, or
download because no authenticated Worker/B2/payment runtime was available.

## Finding and fix

`backend/src/jobs/services/pricing.service.ts` was using a customer multiplier
of `2`, while the approved business rule is:

`customer_price = actual_host_compute_cost * 2.5`

The implementation now uses the 2.5 multiplier and the existing 6,000
VND/worker-hour baseline. It still accounts for recorded task runtime and one
startup allowance per distinct Worker, following the existing repository
policy. If there is no claimed execution, no runtime heartbeat, or invalid
timestamps, pricing throws a server-side validation error instead of creating
a fallback/demo amount.

## Evidence

- Pricing regression: `backend/src/jobs/services/pricing.service.spec.ts` —
  6/6 PASS, including no-runtime rejection, missing-heartbeat rejection,
  separate-task accounting, and the 2.5 multiplier.
- Backend build: PASS (`npm run build`).
- No production job ID, task/attempt, Worker claim, Blender process, B2 object,
  QR payment, webhook, or final download was generated in this session.
- The supplied Drive folder was previously verified through the Drive
  connector to contain one supported project (`cube_diorama.blend`); the
  production resolver currently returns 400 when its required
  `GOOGLE_DRIVE_API_KEY` is absent.

## Status

**CODE/UNIT VERIFIED. REAL PRODUCTION E2E NOT VERIFIED.** The remaining gate
is a real authenticated runtime: production Drive configuration, physical
Windows Worker with Blender and canonical Node Agent bridge, B2 access, and a
real payment/webhook verification.
