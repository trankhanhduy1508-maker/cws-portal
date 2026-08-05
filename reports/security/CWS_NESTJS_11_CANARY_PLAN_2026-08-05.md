# CWS NestJS 11 Canary Plan — 2026-08-05

Status: **BLOCKED** pending an approved canary; no major upgrade was applied.

Official migration requirements: Nest 11 requires Node.js 20+, uses Express 5 by default, and includes route/lifecycle/module-resolution breaking changes. Source: https://docs.nestjs.com/migration-guide

## Safe sequence

1. Create an isolated canary branch/worktree outside the production deployment path; keep `main` on Nest 10 until evidence exists.
2. Upgrade the Nest packages as a coherent major set, without `--force`; update CLI/schematics/testing packages together.
3. Audit wildcard routes, middleware exclusions, WebSocket adapters, file upload handling, Swagger, and lifecycle hooks for Express 5 behavior.
4. Run clean install, build, lint, all unit tests, integration tests, and staging HTTP smoke tests. Do not run customer or production jobs.
5. Compare error status, CORS, auth/RBAC/AAL2, upload/download authorization, Worker RPC calls, and WebSocket behavior against the current baseline.
6. Promote only after the canary has deployment rollback evidence and no MVP regression.

Current decision: defer. The existing backend audit still reports five production-relevant High findings in the Nest 10 dependency chain; no unsafe override or forced major upgrade was retained.
