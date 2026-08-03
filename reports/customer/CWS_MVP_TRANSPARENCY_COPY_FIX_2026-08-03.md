# CWS MVP Transparency Copy Fix — 2026-08-03

## Scope

Safe customer-facing copy fix from the customer research priority list. No production data, credentials, payment, or runtime behavior was changed.

## Change

- Removed the Landing claim that files are deleted after download; the repository has no verified deletion policy or delete route.
- Upload step now states the actual MVP limit (`.blend`, maximum 2GB) and the real order: render first, then customer approval and payment.

## Verification

- `npm run build` — PASS.
- `npm run lint` — PASS.

## Remaining

Deletion policy remains a product/Owner decision and is not implied by this copy fix.
