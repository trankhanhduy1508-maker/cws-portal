# CWS — Payment Confirmation Boundary Evidence

Date: 2026-08-04

## Finding

The legacy POST /payments/:id/confirm route was public and did not have an authentication guard. The current QR provider rejected direct confirmation, but the route was unnecessary attack surface and conflicted with the MVP rule that only verified bank webhooks may confirm payment.

## Fix

Removed the direct controller route. Payment confirmation remains through guarded webhook routes (generic webhook, SePay, and the separately guarded notification listener), all of which use the existing matching/idempotency logic before setting PAID.

## Test

Added a P0 contract test asserting that the direct route is absent and the generic webhook retains WebhookSecretGuard.

GitHub Actions #230 on the code head 46e5c1c PASS: backend build/tests and frontend build/lint. Runtime live payment remains Owner-blocked. No production payment, data, credential, reboot, shutdown, or logoff was used.
