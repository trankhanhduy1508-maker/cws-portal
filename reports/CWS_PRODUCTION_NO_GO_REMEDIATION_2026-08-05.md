# CWS Production NO-GO Remediation — 2026-08-05

Continuation from `a9653cf`; verified Full E2E and multi-node evidence was not rerun.

| ITEM | BEFORE | ACTION | EVIDENCE | STATUS | REMAINING RISK |
|---|---|---|---|---|---|
| CORS | Wildcard fallback | Explicit canonical production allowlist; local-only defaults; wildcard rejected | `cors-origin.util.spec.ts`, backend build/tests | CODE/UNIT VERIFIED | Owner must set `CORS_ORIGINS=https://cws-portal.vercel.app` on Render |
| RPC privilege | Legacy/internal SECURITY DEFINER RPCs public in production metadata | Idempotent migration 019; applied to staging and verified | `worker_migrations/019_rpc_privilege_hardening.sql`, staging metadata query | CODE/UNIT VERIFIED | Do not apply production without change approval; Worker publishable RPC identity remains weak |
| Windows Service | No SCM host | Native pywin32 ServiceFramework PoC, install/start/heartbeat/stop/restart/remove and SCM recovery config | `worker/windows_service_host.py`, installer, ProgramData event evidence | REAL RUNTIME VERIFIED | Worker GPU/UI helper split and production service account policy remain unverified |
| Job Object | Separate POC only | Re-ran child fixture timeout/process-tree containment | `worker/isolation_poc_job_object.py` | REAL RUNTIME VERIFIED | Not yet integrated into Generic Worker launcher |
| Path boundary | Workspace traversal defense only | Reject symlink/reparse components before job directory creation | `worker/path_boundary.py`, 30/30 Python tests | CODE/UNIT VERIFIED | Junction behavior needs a dedicated disposable-host test |
| Blender optimizer | Analyzer/plan absent | Working-copy-only plan/apply harness; only multi-frame Cycles Persistent Data may auto-apply | `worker/blender_optimizer.py`, harmless EEVEE plan runtime | REAL RUNTIME VERIFIED | No speedup claim; benchmark scenes are still needed |
| ArchViz profiles | Research only | Added SAFE/BALANCED/MAX_QUALITY policy data; no blind quality changes | `worker/archviz_profiles.json` | CODE/UNIT VERIFIED | VRAM/time estimates and quality thresholds unverified |
| Dependencies | 9 High / 0 Critical production audit | Confirmed safe non-major fixes; rejected invalid overrides; Nest 11 remains major canary | backend npm audit and official Nest migration guide | BLOCKED | 5 High remain in Nest 10 dependency chain; major upgrade required |

## Owner actions

1. Set Render production `CORS_ORIGINS` to the canonical Vercel origin; do not use `*`.
2. Approve/review migration 019 before any production apply.
3. Rotate every historical Supabase/B2/backend secret listed in the prior security reports, then update hosting envs without posting values.
4. Create a staging Admin Auth user, enroll TOTP, add `staff_roles` and `staff_worker_access`, then run the real Admin UI verification.
5. Approve a Nest 11 canary only after migration-note review and staging regression evidence.

## Decision

**PRODUCTION NO-GO.** No production destructive mutation or production RPC migration was performed in this continuation.
