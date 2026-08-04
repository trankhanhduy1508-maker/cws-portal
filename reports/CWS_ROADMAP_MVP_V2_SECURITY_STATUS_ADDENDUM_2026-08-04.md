# CWS MVP V2 Security Status Addendum — 2026-08-04

This addendum supplements CWS_ROADMAP_MVP_V2.md without replacing it.

- Migration 021: Admin SECURITY DEFINER RPCs, remote_commands, and reconciliation view privilege hardening applied and verified.
- Migration 022: realtime access-ticket RPC explicit grants revoked from anon/authenticated; service_role-only execution verified directly.
- Migrations 019/020: support ticket and realtime access-ticket tables applied with RLS enabled.
- Worker operational SECURITY DEFINER RPC warnings remain intentionally unresolved until a replacement least-privilege Worker authentication mechanism is provisioned and rolled out; this is an OWNER/runtime blocker, not a PASS.
- Current credential source files require environment injection. Rotation/revocation of credentials that existed in Git history remains OWNER TODO.
- CI #293 passed after the previous security follow-up; the newest docs-only head must still be checked by CI.
