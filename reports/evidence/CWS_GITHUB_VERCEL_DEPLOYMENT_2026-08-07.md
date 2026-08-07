# CWS GitHub → Vercel Deployment Evidence — 2026-08-07

## Verified configuration

- Repository: `trankhanhduy1508-maker/cws-portal`
- Branch: `main`
- Vercel project: `cws-portal`
- Production alias: `https://cws-portal.vercel.app`
- Deployment source: GitHub

## Current evidence

- Local `HEAD == origin/main == 1e42a8168db85febfd97f3fb34e12bcf55d3ee98`.
- Vercel project lookup identifies the linked project and `main` branch alias.
- Latest observed production deployment is `READY`, but its Git SHA is
  `fd34ebd00a1ba2641f1f06c5cca3748bf15abffc`.
- GitHub combined status for `1e42a81` reports Vercel `build-rate-limit`.
- Production web read-only smoke remains HTTP 200; this does not prove the
  current HEAD is deployed.

## Decision

This is `NEEDS_VERIFICATION`, not production PASS. A subsequent valid GitHub
commit carrying this evidence will allow the existing Git integration to retry
the build for the current branch without using Vercel CLI device authorization.
