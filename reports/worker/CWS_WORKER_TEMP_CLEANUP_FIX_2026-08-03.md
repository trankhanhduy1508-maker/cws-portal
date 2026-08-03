# Worker Temporary Output Cleanup — 2026-08-03

## Scope

Closed the local Worker cleanup gap identified in `CWS_WORKER_READINESS_AUDIT_2026-08-02.md`. No Supabase, B2, credential, or production object was touched.

## Change

- Added `cleanup_task_output_dir()` to remove only `WORK_DIR/output_task_<id>`.
- Added strict parent/name guards so the helper refuses the Worker root, `.blend` cache, and unrelated paths.
- Called cleanup after completed, partial, and failed task paths. Mid-task update exit intentionally keeps local files for recovery and process restart.
- Extended the existing offline function test with safe-delete and unsafe-path cases.

## Verification

- Static diff review: PASS; all call sites are after task outcome handling.
- Python runtime test: BLOCKED in this environment because `python`, `python3`, and `py` are unavailable. Run the existing `worker_offline_function_tests.py` on the prepared Worker runtime when available.

## Safety

The helper can only delete a local directory directly under the configured Worker `WORK_DIR`; it never calls B2/Supabase delete APIs.
