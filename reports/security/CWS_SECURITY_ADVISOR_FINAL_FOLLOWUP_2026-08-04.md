# Final Security Advisor Follow-up — 2026-08-04

- Found a PostgreSQL explicit-grant issue on consume_realtime_access_ticket.
- Revoke PUBLIC alone did not remove explicit anon/authenticated EXECUTE grants.
- Added and applied migration 022.
- Direct verification: anon=false, authenticated=false, service_role=true.
- Security Advisor no longer reports the realtime access-ticket RPC.
- Remaining SECURITY DEFINER warnings are Worker operational RPCs that still depend on the existing publishable Worker credential. Locking them requires a new Worker authentication/credential rollout and physical Worker verification; this remains OWNER TODO.
