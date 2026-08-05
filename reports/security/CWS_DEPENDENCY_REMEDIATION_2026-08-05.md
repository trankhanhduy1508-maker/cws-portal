# CWS Dependency Remediation — 2026-08-05

## Result

- Root npm audit: previously clean; frontend lint/build/tests pass.
- Backend clean-install `npm audit --omit=dev`: **17 total, 5 High, 0 Critical, 12 Moderate**.
- `npm audit fix` non-force was retained where lockfile-safe. An override experiment for nested packages was rejected because it produced invalid dependency ranges and was removed.
- Python runtime packages were compile/test verified; no unpinned install was added to the Worker runtime.

## Classification

- Patch/minor: lockfile-safe transitive remediation retained where npm could resolve it without changing the Nest major architecture.
- Major: remaining fixes require Nest 11 family upgrades (`@nestjs/core`, platform-express/ws, config, schedule, swagger) and Express 5 migration review. No unattended major upgrade was merged.

Official migration basis: [NestJS 10→11 migration guide](https://docs.nestjs.com/migration-guide). The guide calls out Node 20+, Express 5 route matching changes, and lifecycle/module-resolution changes. These require a staging canary and runtime regression evidence.

Status: **BLOCKED** for production until a separate Nest 11 canary passes build, tests, API/preflight checks, Admin auth, and staging runtime evidence.
