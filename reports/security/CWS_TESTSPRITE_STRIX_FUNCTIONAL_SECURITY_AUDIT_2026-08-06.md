# CWS TestSprite + Strix Audit Evidence — 2026-08-06

## Scope

Canonical repository: `trankhanhduy1508-maker/cws-portal`, `main`.
Local HEAD and `origin/main` were both `c42cd9553f48fbff7f2a167e3e50e869f703a613` at audit start.
No production mutation, staging credential, payment, or physical Worker was used.

## TestSprite — attempted, not runnable without Owner credential

The official CLI was executed from the repository:

```text
npx --yes @testsprite/testsprite-cli --help
```

Result: CLI `0.5.0` started successfully and exposed `setup`, `doctor`, `project`, and `test` commands.

The real environment check was then executed:

```text
npx --yes @testsprite/testsprite-cli doctor --output json
```

Observed result:

```text
CLI version: ok (0.5.0)
Node.js: ok (v24.19.0)
Profile: ok (default)
API endpoint: ok (https://api.testsprite.com)
Credentials: fail — no API key found; run `testsprite setup` or set TESTSPRITE_API_KEY
Connectivity: warn — skipped; no API key
Verify skill: warn — not installed
exit code: 1
```

No TestSprite cloud functional/E2E result is claimed. `setup`/`test` requires the Owner's API credential and configured target; no credential was created or guessed.

## Strix — blocked by local prerequisites

The official Strix requirements were checked against this machine:

```text
docker -> NOT_FOUND
bash   -> NOT_FOUND
python -> NOT_FOUND
pip    -> NOT_FOUND
```

No `STRIX_*`, `LLM_*`, or `OPENAI_API_KEY` environment variable name was present. Strix was not run, so no severity count is invented. A future run needs Docker plus an approved LLM credential.

Official references:

- TestSprite CLI: https://www.npmjs.com/package/@testsprite/testsprite-cli
- TestSprite Web Portal: https://docs.testsprite.com/web-portal/getting-started/overview
- Strix repository and prerequisites: https://github.com/usestrix/strix

## Repository functional verification actually run

| Check | Evidence |
|---|---:|
| Frontend Vitest | 4 files, 9 tests PASS |
| Frontend lint | PASS |
| Frontend build | PASS; Vite emitted only a bundle-size warning |
| Backend Jest | 28 suites, 160 tests PASS |
| Backend E2E | 1 suite, 1 test PASS (`GET /health`) |
| Backend build | PASS |
| Worker Python suite | 48 tests PASS |
| Backend packaging runtime smoke | PASS; dynamic ESM `ZipArchive` created a 149-byte ZIP and verified upload contract |
| Root `npm audit` | 0 vulnerabilities |
| Backend production `npm audit --omit=dev --audit-level=high` | 17 vulnerabilities: 12 moderate, 5 high |

## Bugs fixed during this audit

1. `backend/test/app.e2e-spec.ts` used a namespace `supertest` import as a callable function. Changed to the compatible default import.
2. The E2E test asserted the removed `GET /` Hello World route. It now verifies the canonical `/health` response and closes the Nest app after each test.
3. Added `backend/test/setup-env.ts` with non-secret test-only placeholders so app boot E2E does not require Supabase/B2 credentials or contact external services.
4. `archiver` is ESM in the current dependency tree while the Nest backend emits CommonJS. Packaging now loads the named `ZipArchive` export dynamically, avoiding a module-load crash.

## Security checks and remaining findings

- Tracked environment files are `.env.example` and `.env.production`; the latter contains only Vite public Supabase URL/publishable-key configuration by documented intent. No private-key, AWS access-key, live payment-key, service-role value, or webhook secret pattern was found by the repository scan.
- Backend audit findings are dependency findings. The suggested automatic resolution requires breaking Nest 11-family upgrades; `npm audit fix --force` was not run. The existing dependency remediation report remains the upgrade plan.
- Auth/RBAC, upload bounds/cleanup, CORS, webhook guards, storage authorization, Worker RPC, payment ordering/idempotency, and CRM privacy remain covered by existing repository tests/reports. This local audit does not replace authenticated production or hostile-file runtime verification.

## Blockers

1. TestSprite API key and target configuration are required for the real TestSprite run.
2. Strix requires Docker and an approved LLM credential in this environment.
3. Production Admin Google + TOTP/AAL2, physical Worker, B2 staging, and real payment remain runtime gates already recorded in `CURRENT_STATUS.md`.

## Conclusion

Local functional/security-adjacent checks are green after the fixes above. TestSprite and Strix are **NOT RUN to completion** because their external credentials/runtime prerequisites are absent. No third-party tool PASS is claimed.
