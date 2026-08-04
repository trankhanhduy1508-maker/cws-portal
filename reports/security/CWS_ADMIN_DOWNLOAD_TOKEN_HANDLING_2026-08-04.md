# CWS — Admin Download Secret Handling Evidence

Date: 2026-08-04

## Finding and fix

The Admin UI previously built a download URL containing the staff Bearer token in a query parameter. That exposed the token to URL history and potentially request/access logs.

The UI now calls the existing download endpoint with an Authorization header, receives the redirect response as a blob, creates a short-lived browser object URL, and revokes it after 60 seconds. The token is not placed in the URL.

Backend ownership, signed URL issuance, Admin RoleGuard, and MFA checks remain unchanged.

## Verification boundary

This is code-level security evidence. Browser network inspection and production Admin MFA download remain unverified. No credentials or production data were used.
