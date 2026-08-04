# CWS — HTTP Download and WebSocket Token Boundary Evidence

Date: 2026-08-04
Branch: agent/roadmap-mvp-v2

## Fixes

- Customer and Admin download calls now send the Supabase Bearer token only in the Authorization header, receive the response as a temporary blob URL, and revoke the object URL after use.
- Backend HTTP owner resolution rejects bearer tokens in query strings.
- WebSocket job subscriptions no longer place the Supabase bearer token in the URL. The customer first obtains a one-time opaque ticket through POST /jobs/:id/realtime-ticket; the ticket is stored hashed, expires after 60 seconds, and is consumed atomically once by the WebSocket server.
- Realtime now denies missing-owner jobs, wrong-owner tickets, expired tickets, reused tickets, and missing jobs before opening a Supabase channel.
- Customer UI now states the verified signed-download TTL of 5 minutes instead of the previous incorrect 3-day text.

## Verification

- GitHub Actions #266 PASS on code head 72f087f: backend build/tests and frontend build/lint.
- Realtime unit tests cover owner match, wrong owner, missing/expired ticket, anonymous/unowned job, and missing job.
- P0 contract tests cover absence of query bearer tokens and one-time ticket migration.
- Production migration application, browser network inspection, and real two-account download/realtime tests remain unverified.
- No production data, credentials, secrets, reboot, shutdown, or logoff was used.
