# CWS Security Decisions Addendum — 2026-08-04

1. Admin database RPCs remain server-side only. anon/authenticated execution is denied; service_role is the only backend grant.
2. Realtime access tickets are one-time, short-lived, hashed in storage, and consumed only by service_role. Explicit anon/authenticated EXECUTE grants are denied.
3. Internal remote_commands remains inaccessible to browser roles.
4. Worker operational RPCs are not relabeled PASS while they still use the existing publishable Worker credential. A dedicated least-privilege Worker authentication rollout is required before further privilege revocation.
5. Secrets previously present in Git history require Owner-approved rotation/revocation after replacement credentials are provisioned. Codex must not rotate production credentials autonomously.
6. No live payment, reboot, shutdown, or logoff is part of autonomous verification.
