# CWS GitHub → Vercel Deployment Evidence — 2026-08-07

## Verified configuration

- Repository: `trankhanhduy1508-maker/cws-portal`
- Branch: `main`
- Vercel project: `cws-portal`
- Production alias: `https://cws-portal.vercel.app`
- Deployment source: GitHub

## Current evidence

- Local `HEAD == origin/main == 8fc9d08` after the valid evidence commit.
- Vercel project lookup identifies the linked project and `main` branch alias.
- Latest observed production deployment is `READY`, but its Git SHA is
  `fd34ebd00a1ba2641f1f06c5cca3748bf15abffc`.
- GitHub combined status for `1e42a81` reports Vercel `build-rate-limit`; no
  deployment for `8fc9d08` was visible after the push.
- Production web read-only smoke remains HTTP 200; this does not prove the
  current HEAD is deployed.

## Decision

This is `NEEDS_VERIFICATION`, not production PASS. The GitHub push was
successful, but the existing integration did not create a deployment during
the verification window. The remaining blocker is the observed Vercel
build-rate-limit; no CLI device authorization was used.
