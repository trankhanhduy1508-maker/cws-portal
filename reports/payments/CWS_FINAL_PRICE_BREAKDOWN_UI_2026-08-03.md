# Final price breakdown — 2026-08-03

## Finding

Customer research C2.2 requires a transparent final-price breakdown. The
backend already computes the final amount from real summed Worker runtime and
the distinct Worker count, but the payment UI previously showed only the total
amount.

## Change

`PricingService.computeFinalPriceVnd()` now returns `workerCount` alongside
`workerRuntimeSeconds` and `finalPriceVnd`. The approve response exposes the
verified billing inputs:

- Worker count;
- summed Worker runtime in hours;
- 6,000 VND per Worker-hour;
- billing multiplier 2.

`PaymentScreen` displays these values only when the backend response contains
all of them. It does not invent a price cap, ETA, or Worker assignment. Mock
payment data carries the same shape for local demo parity.

## Verification

- Backend Jest: **117/117 PASS**, 16 suites.
- Backend Nest build: **PASS**.
- Frontend Vite build: **PASS** (existing chunk-size warning only).
- Frontend oxlint: **PASS**.

This proves code/build behavior only. A real paid customer job is still
required to verify the displayed values against live Worker/B2/payment flow.
