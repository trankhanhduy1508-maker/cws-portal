# CWS Dependency Audit — 2026-08-06

## Evidence

Executed from `backend/`:

```text
npm audit --omit=dev --json
```

Result: **17 vulnerabilities** — 0 Critical, 5 High, 12 Moderate.

High packages: `@nestjs/platform-express`, `multer`, `ws`, `lodash`, `js-yaml`.
Moderate packages include `@nestjs/common`, `@nestjs/core`, `@nestjs/config`, `@nestjs/platform-ws`, `@nestjs/schedule`, `@nestjs/swagger`, `@nestjs/websockets`, `body-parser`, `express`, `file-type`, `qs`, and `uuid`.

## Upgrade decision

`npm audit fix --dry-run --json` and `npm dedupe --dry-run --json` were run without modifying the repository. The audit's complete remediation upgrades the Nest dependency family to 11.x and changes the Express/runtime boundary. The existing canary plan therefore remains required; no major or force upgrade was applied.

The dry-run only proposed lockfile reshuffling/downgrades for unrelated packages and did not provide a safe non-breaking remediation for the vulnerable Nest 10 dependency tree. A nested-package override was previously tested and rejected because it produced invalid dependency ranges.

The direct `multer` and `ws` dependencies are already newer than the vulnerable nested copies used by Nest 10's platform packages; upgrading the direct copies alone would not remove the reachable nested findings and would add no meaningful security evidence.

## Verification

- Backend tests: 28 suites / 161 tests PASS after the current code hardening.
- Backend build: PASS.
- Root audit: 0 vulnerabilities.
- No `npm audit fix --force` was run.

## Next safe dependency task

Run the documented isolated Nest 11 canary with Node 20+, then compare API routes, uploads, WebSocket, auth/AAL2, Worker RPC, and staging runtime before promotion. This cannot be safely merged as an unattended MVP patch.
