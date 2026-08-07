# CWS Vercel project consolidation audit — 2026-08-07

## Live read-only evidence

- Canonical production project: `cws-portal`, project ID
  `prj_oEEqu24zYqTq1p9FJhzkUake0pEi`.
- Canonical alias: `https://cws-portal.vercel.app`.
- Latest observed canonical deployment: `dpl_9PgkD5KW9zVeHZG3XAhUGrfn2ed7`,
  `READY`, target `production`, source `git`, branch `main`, GitHub repo
  `trankhanhduy1508-maker/cws-portal`, commit `a1ee326`.
- Public smoke: HTTP 200, Server `Vercel`, title `cws-portal`.

Six additional CWS-named projects exist: `cws-portal-azen`,
`cws-portal-janb`, `cws-portal-project`, `cws-portal-s9o5`,
`cws-portal-google-login-fix`, and `cws-portal-project-1`. Each has its own
`.vercel.app` domain and no observed canonical alias.

## Root cause and responsibility

Repository evidence is decisive: no `vercel.json`, no committed
`.vercel/project.json`, no Vercel command in package/backend scripts, and no
Vercel deploy step in `.github/workflows`. Git history contains no project-
creation automation. Live deployment metadata shows duplicate projects
receiving GitHub deployments from the same repository and `main` branch,
created by the Vercel account `nulyai825-7736`. Creation timestamps span
2026-07-26 through 2026-08-04.

The most specific supported root cause is repeated Vercel Dashboard
import/Git Integration setup of the same repository. This is not a CWS runtime
or GitHub Actions loop. No direct Codex project-creation evidence exists in
Git history; the evidence identifies the Vercel account, not the human who
performed each Dashboard action.

## Cleanup status

No project was deleted or disconnected. The connected tools available here are
read-only for projects/deployments; the Vercel CLI timed out at authentication
and no `VERCEL_TOKEN` exists in process/user/machine environment. Environment
comparison and destructive cleanup were therefore not safely executable.

## Permanent rule

`cws-portal` is the canonical CWS production project. Never create or import a
new Vercel project for a normal CWS deployment. Push `main` and let the one
canonical Git Integration deploy.

## Remaining external operation

An authorized Vercel operator must compare environment variables and Git
settings for the six non-canonical projects, then disconnect/delete only those
confirmed unused.
