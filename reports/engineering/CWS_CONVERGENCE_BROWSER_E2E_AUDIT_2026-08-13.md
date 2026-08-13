# CWS Convergence + Browser E2E Audit — 2026-08-13

Status: **REPOSITORY/REPORT AUDIT; NO PRODUCTION MUTATION**

## Founder verification priority

Latest Founder direction: verify the Customer flow step-by-step beginning with **Google Login**. Do not skip forward and call later stages healthy while the first operational gate remains hard to reproduce reliably.

This is consistent with `DECISIONS.md`, which already defines Customer Google login as the first operational gate. `CURRENT_STATUS.md` still names the one-physical-Worker provisioning/runtime gate as the immediate runtime bottleneck; this is not a product-workflow contradiction, but it is now a sequencing/staleness issue for the active verification task. Before implementation work continues, current-state docs should distinguish:

- **Current Customer verification task:** Google Login first, then each Customer step in order.
- **Current Worker runtime bottleneck:** one physical Worker autonomous provisioning -> authenticated heartbeat -> ACTIVE_IDLE, to be resumed when the Customer verification sequence reaches the Worker boundary or Founder reprioritizes.

## Repository-wide convergence findings

The repository contains a large amount of valuable evidence, but historical reports preserve older decisions. They must not compete with canonical active docs.

### 1. Login/auth material is duplicated across active code and historical reports

Current code uses Supabase Google OAuth through `src/services/AuthService.js` and does not implement Google credential entry inside CWS.

Historical auth evidence includes:

- `reports/AUTH_GOOGLE_MIGRATION_REPORT.md`
- `reports/evidence/CWS_CUSTOMER_GOOGLE_LOGIN_REGRESSION_2026-08-04.md`
- older MVP/current-status reports referencing earlier login/upload ordering.

These reports are useful evidence but contain historical workflow descriptions that are no longer authoritative.

### 2. Historical `Start render` flow remains in reports/design material

Current canonical workflow is:

`Google Login -> authenticated Upload/Drive -> temporary quarantine -> security validation -> canonical B2 -> INPUT_SAFE -> exactly-one automatic Job`

There is no mandatory post-validation `Start render` confirmation.

Older reports and design documents still mention a visible `Start render`/`Bắt đầu render` gate or pre-login upload behavior. These are historical evidence, not current workflow instructions.

### 3. B2-first quarantine direction is superseded

Current active decision requires pre-B2 temporary quarantine/security validation. Older material may describe upload/materialize into canonical B2 before scanning. Those references are stale for implementation.

### 4. Worker documents contain multiple generations

Legacy Worker material, worker hardening branches/reports, production Node Agent/Worker Engine, provisioning specs, and staging reports coexist. Historical Worker reports should be treated as evidence/reference only. Canonical runtime and current specs must own implementation direction.

### 5. Verification language is inconsistent across historical reports

Some older reports use phrases such as verified/production test while later evidence correctly distinguishes code, browser redirect, authenticated callback, production runtime, and Golden E2E. The verification ladder in the Harness must be used for new work.

## Browser testing finding

The repository has browser-testing evidence, but no canonical persistent browser E2E harness on `main`.

Historical auth work used **one-off Playwright**, installed temporarily and removed afterward. It successfully verified UI and OAuth redirect initiation, but an automated agent intentionally stopped at Google's credential-entry screen.

This explains repeated friction: every new Codex run tends to start from a fresh/automation browser context, so Google can challenge or block repeated sign-ins and Codex cannot safely enter/retain a human Google credential session.

## Recommended browser environment

Create one canonical **local-only Customer Browser E2E Harness** for Codex with two different modes:

### Mode A — REAL_GOOGLE_BOOTSTRAP (human-in-the-loop, rare)

Purpose: verify the real Google OAuth boundary itself.

- Launch installed stable Chrome/Chromium in headed mode with a dedicated local CWS test profile.
- Founder performs Google login manually when Google requires human authentication/consent.
- After Supabase redirects back to CWS and the real customer session is verified, persist browser auth/session state locally.
- Never automate typing the Google password/2FA.
- Never commit the profile, cookies, tokens, Playwright storage state, or screenshots containing sensitive account data.

This should be required only when the Google/Supabase auth boundary itself changes or the stored session expires.

### Mode B — AUTHENTICATED_CUSTOMER_REUSE (default Codex mode)

Purpose: test Customer steps after login without repeatedly visiting Google.

- Reuse a local authenticated Chrome profile or encrypted/local Playwright `storageState` created by Mode A.
- Start directly on the CWS portal with the existing Supabase customer session.
- Verify session restoration and server-side identity before continuing.
- If the session is expired, stop and request one human bootstrap rather than repeatedly hammering Google OAuth.

## Security rules for the browser harness

- Browser auth state is a secret-equivalent local artifact.
- Must be gitignored and never uploaded to GitHub/CI/artifacts.
- Do not store Google passwords, recovery codes, TOTP secrets, or OAuth client secrets.
- Prefer a dedicated CWS test Google account rather than the Founder's primary account.
- Do not bypass Google anti-automation controls.
- Mock auth remains acceptable for deterministic UI unit/component tests, but it cannot prove the real Google OAuth gate.
- Real OAuth PASS requires evidence of redirect -> callback -> Supabase session -> customer identity/session restore.

## Proposed first browser verification ladder

1. Production/local page loads.
2. Logged-out state is real and controls respect current workflow.
3. Click `Đăng nhập với Google`.
4. Verify Supabase authorize -> Google provider redirect.
5. Human completes Google auth only when required.
6. Verify callback returns to correct CWS origin.
7. Verify Supabase session exists.
8. Verify customer identity/profile ownership server-side.
9. Refresh and verify session restore.
10. Logout and verify session is removed.
11. Re-bootstrap once, persist local auth state, then use authenticated reuse for the next Customer step.

## Implementation recommendation

Do not invent another app/project/service. Add a focused local browser testing harness to the existing repository, preferably Playwright because the repository already has historical Playwright evidence and the task requires real browser state control.

The harness should include:

- a dedicated local-only auth-state directory under a clearly named path and `.gitignore` protection;
- a headed auth-bootstrap command;
- a default authenticated-reuse command;
- production/local target URL controlled by explicit environment variable;
- safeguards that refuse to run authenticated tests if auth-state files are tracked or missing;
- evidence output that redacts tokens/cookies/URLs carrying sensitive query parameters;
- no automatic Google credential entry;
- no change to production authentication design.

## Next smallest safe action

Use Spec 008 / normal engineering funnel to implement the smallest browser-harness slice and test **Google Login only** first. Do not continue to Upload/Drive until the login gate is runtime-verified and repeatable.

After the login gate passes, continue the Customer E2E one step at a time in canonical workflow order.
