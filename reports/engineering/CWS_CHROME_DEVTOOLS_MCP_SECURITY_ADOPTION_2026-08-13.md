# CWS Chrome DevTools MCP Security + Adoption Review — 2026-08-13

Status: **ADOPT FOR LOCAL CUSTOMER BROWSER TESTING WITH HARDENING**

## Executive decision

CWS should adopt the official Google/Chrome `ChromeDevTools/chrome-devtools-mcp` project as a **local developer/browser-control tool** for Codex and other MCP-capable coding agents.

It is NOT a production runtime dependency and must not become part of the customer control loop.

Recommended CWS model:

`Chrome DevTools MCP + dedicated CWS Chrome profile` for live browser inspection/control and session reuse

plus

`Playwright` for deterministic scripted regression assertions where repeatability is preferable.

This is complementary, not a replacement of one by the other.

## Provenance and supply-chain review

Evidence reviewed from the official upstream sources:

- Official repository: `ChromeDevTools/chrome-devtools-mcp`.
- Repository metadata and package identify the author as Google LLC.
- Official Chrome for Developers documentation publishes the MCP setup instructions.
- MCP server metadata maps package `chrome-devtools-mcp` to the official repository and npm registry.
- Current upstream server metadata reviewed on 2026-08-13 reports version `1.6.0`.
- The project has an explicit security policy and Chromium security-reporting path.
- Upstream releases include GitHub-verified signed release commits.
- Apache-2.0 license.
- Published package metadata does not expose an `install` or `postinstall` script in the reviewed package manifest; build/prepare scripts belong to upstream development/release flow.

No evidence of malware or a malicious supply-chain event was found in the reviewed official sources.

This is NOT equivalent to proving that any future package version can never be compromised. CWS must pin/review versions instead of blindly trusting `@latest` for security-sensitive local tooling.

## Important security reality

The largest risk is not "virus-like behavior"; it is the tool's intentionally powerful browser authority.

Upstream explicitly warns that the MCP client can inspect, debug and modify browser data and effectively act on behalf of a user when connected to an authenticated browser session.

Additional upstream security notes:

- Browser/web content can contain prompt injection; the calling agent must treat page content as untrusted data.
- Some tools can write files such as screenshots/downloads.
- URL allow/block patterns are guardrails, not a complete network sandbox.
- Full filesystem/network isolation requires OS/VM-level controls if needed.
- Remote debugging exposes a browser-control surface; a dedicated non-default user-data directory is required/recommended by modern Chrome security behavior.

## Community feedback / maturity

The project has substantial adoption and active issue/discussion traffic.

Observed recurring community issues are mostly integration/operational, not malware reports:

- startup timeouts in some MCP clients;
- client-specific MCP integration failures;
- Windows Chrome discovery/path issues;
- persistent/headed browser connection edge cases;
- browser hangs when many tabs are open;
- remote-debugging/auto-connect behavior changes in newer Chrome versions;
- agent misuse of selectors/tool semantics in some evals.

Community reports also confirm a useful pattern for CWS: connect to a **separate Chrome instance/profile** using remote debugging rather than attaching to the user's normal browser profile.

## CWS-specific adoption rules

### 1. Dedicated CWS test profile only

Never connect Codex/Chrome DevTools MCP to the Founder's normal daily Chrome profile.

Create/use a dedicated local CWS Customer test browser profile containing only the minimum authenticated CWS/Google state needed for testing.

### 2. Human Google login bootstrap, agent session reuse

Canonical testing model:

`Founder performs Google auth manually when required -> CWS/Supabase session established -> dedicated profile persists locally -> Codex reuses that profile/session for later CWS steps`

Do not automate Google password, 2FA, recovery codes or CAPTCHA/security challenges.

### 3. Session/profile is secret-equivalent

The dedicated Chrome user-data directory, cookies, tokens and screenshots containing account information must be:

- local only;
- gitignored;
- excluded from CI and artifacts;
- never pasted into reports/logs;
- never committed.

### 4. Restrict browsing scope

For the CWS harness, configure upstream URL allow/block controls where practical so the agent primarily reaches:

- approved CWS local/production portal origin;
- CWS Supabase auth origin;
- Google OAuth endpoints only for the explicit login bootstrap stage.

Do not treat those patterns as a full network sandbox.

### 5. Disable unnecessary telemetry in CWS test mode

Use upstream-supported flags/environment controls to disable usage statistics and CrUX performance lookup when they are not required for the test:

- `--no-usage-statistics`
- `--no-performance-crux`

This reduces unnecessary metadata egress during auth-focused testing.

### 6. Pin version

Do not use `chrome-devtools-mcp@latest` in the canonical CWS setup.

Pin the reviewed version initially and upgrade only through a small dependency/security review.

At this review point the upstream MCP server metadata reports `1.6.0`.

### 7. Local debugging endpoint protection

If using `--browser-url` / Chrome remote debugging:

- use a dedicated non-default user-data directory;
- do not browse unrelated sensitive sites in that Chrome instance;
- keep the debugging endpoint local-only;
- close the dedicated browser/MCP when testing is complete;
- never expose the DevTools endpoint publicly.

## Playwright vs Chrome DevTools MCP

Use Chrome DevTools MCP for:

- live interaction with the actual browser Codex can see;
- DOM/network/console inspection;
- debugging real OAuth redirects/callbacks;
- reusing a dedicated authenticated browser profile;
- manual-human + agent handoff.

Use Playwright for:

- deterministic regression scripts;
- CI-safe unauthenticated/mock-auth tests;
- repeatable assertions that should not rely on a live human Google session.

Real Google OAuth PASS must not be simulated by mock auth.

## Immediate CWS application

The next Customer browser slice should use Chrome DevTools MCP as the primary live-browser interface for the Google Login gate, with Playwright retained for deterministic regression coverage.

First gate:

`logged out -> click Google Login -> Supabase authorize -> Google -> human auth if required -> callback -> CWS session -> refresh/session restore -> logout -> bootstrap reusable dedicated CWS browser session`

Stop before Upload/Drive until this gate is repeatably verified.

## Non-goals

- No production dependency on MCP.
- No AI requirement in the CWS production runtime.
- No Google anti-automation bypass.
- No use of the Founder's normal browser profile.
- No browser-session upload to GitHub/CI.
- No exposure of DevTools remote-debugging port to the network.
- No replacement of server-side authorization/security with browser checks.

## Verdict

`MALWARE_EVIDENCE_FOUND = NO`

`ABSOLUTE_MALWARE_FREE_GUARANTEE = IMPOSSIBLE`

`UPSTREAM_PROVENANCE = STRONG / OFFICIAL GOOGLE-CHROME`

`CAPABILITY_RISK = HIGH BY DESIGN`

`CWS_ADOPTION = APPROVED WITH LOCAL ISOLATION + VERSION PINNING + SESSION-SECRECY + URL/TELEMETRY HARDENING`

## Next smallest safe action

Have Codex integrate the pinned Chrome DevTools MCP into the local CWS engineering/browser-testing setup, create the dedicated ignored CWS test profile workflow, and verify **Google Login only** before proceeding to Upload/Drive.
