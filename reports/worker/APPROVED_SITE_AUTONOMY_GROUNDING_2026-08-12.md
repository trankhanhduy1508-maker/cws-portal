# Approved-site autonomy grounding

- Symptom: the merged automatic Worker flow still required Admin AAL2 to issue a short-lived site bootstrap capability before a normal batch.
- Root cause: migrations 030-032 had expiring capability rows but no durable approved site-controller trust or renewal contract.
- Fix: add an additive controller trust table, Admin-only approval/status routes, a service-role-only bounded renewal RPC, and fleet-plus-fingerprint binding lookup for idempotent capability rotation.
- Security: only hashes of controller/capability material are stored. Controller authority is site-scoped provisioning-only and is not a Worker credential, service-role key, payment authority, or B2 master credential.
- Evidence: targeted enrollment tests 13/13 PASS; Backend build PASS; full Backend 38 suites/213 tests PASS; Worker 114 tests PASS; PowerShell parse PASS.
- Remaining risk: migration 033 has not been applied, production deployment has not been verified, and no physical Worker provisioning or heartbeat was performed in this cycle.
