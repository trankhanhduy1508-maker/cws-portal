# CWS Customer MVP Completion Report

**Date:** 2026-08-04  
**Branch:** `agent/secure-payment-ownership`

## Result

Customer requirements completeness audit: **6/29 active MVP MUST HAVE requirements PASS**.

| Status | Count |
|---|---:|
| PASS | 6 |
| PARTIAL | 2 |
| CODED_NOT_VERIFIED | 4 |
| MISSING | 14 |
| HUMAN_BLOCKER | 3 |

Video preview is excluded from the MVP denominator because the official
workflow explicitly specifies 3–5 watermarked still frames instead.

## Completed in this audit

- Added the full requirement matrix for Customer Research C1–C10 and the
  official end-to-end workflow.
- Added public FAQ/trust copy covering the partner Worker model, supported
  `.blend`/2GB MVP limits, preview-before-payment order, and queue variability.
- Clarified Google is used for authentication and no Drive scope is requested.
- Corrected download expiry copy from “3 days” to the implemented 5-minute
  signed URL TTL and explained reissuing a link.
- Clarified why login is required and that the job is attached to account history.

## Verification

- Frontend build: PASS.
- Frontend lint: PASS.
- Frontend tests: 5/5 PASS.
- Backend targeted payment/job tests: 39/39 PASS.

## Remaining highest-priority gaps

Price cap/breakdown, resumable upload, early `.blend` validation, edit-request
timeline, retention/deletion policy, per-frame timeout, queue warning, download
confirmation/count, support/ticket channel, full customer E2E, live payment,
Fleet/B2 runtime, and Admin MFA runtime verification.

## Owner actions

1. Verify the new least-privilege B2 key on Fleet before revoking any old key.
2. Run one real customer job through Worker claim → render → B2 upload.
3. Create a staff account, enroll MFA, and verify Admin login in a real browser.
4. Decide/publish support channel, retention policy, price cap, and SLA.
5. Verify SePay/MB Bank LIVE without performing an unapproved payment.

Detailed matrix: `reports/customer/CWS_CUSTOMER_REQUIREMENTS_COMPLETENESS_AUDIT_2026-08-03.md`.
