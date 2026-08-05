# CWS staging assignment RPC implementation — 2026-08-05

## Scope

P0 only: make the staging assignment return a complete dynamic `JobSpec`.
No production project, production RPC, production job, or credential was used.

## Implementation

- Added `worker_migrations/016_staging_job_assignment_contract.sql`.
- Added additive `jobs` staging fields and `tasks.required_ram_mb`.
- Added `claim_next_staging_job(worker_id, vram_mb)`.
- The RPC claims only `jobs.staging_enabled = true` rows with a complete,
  non-autoexec assignment, creates a `task_attempts` row, updates the worker,
  and returns all twelve `JobSpec` fields.
- Legacy `claim_next_generic_task()` is unchanged.
- Public execution is revoked; only `anon` and `authenticated` receive the
  staging RPC grant in the isolated staging project.
- The Python staging adapter now calls `claim_next_staging_job`.

## Verification

- Python compile: PASS for adapter, tests, and generic engine.
- Staging adapter contract tests: **5/5 PASS**.
- `git diff --check`: PASS.
- SQL runtime execution and Supabase advisors: **NOT RUN** because no staging
  project/credential is available. This migration is not claimed as runtime
  verified until Owner applies it to the isolated staging project.

## Owner action

Apply the worker migrations, including `016_staging_job_assignment_contract.sql`,
to the isolated staging project only. Then provide only the required staging
configuration through local secret storage/environment; never provide secrets in
chat or Git.
