# CWS production real-path audit addendum — 2026-08-07

## Scope

This addendum supersedes the runtime conclusions in the earlier real-path audit where they refer to an older deployment. It records read-only evidence from the current canonical production deployment and production Supabase.

## Current production deployment

- Canonical Vercel project: `cws-portal` (`prj_oEEqu24zYqTq1p9FJhzkUake0pEi`).
- Domain: `https://cws-portal.vercel.app`.
- Deployment: `dpl_2VPbXVDYmdZuA4HMeYg1oQbnixd8`, `READY`, production, Git source.
- Repository/branch: `trankhanhduy1508-maker/cws-portal`, `main`.
- Commit: `f9633b6fa65183c08f7578d55f53407971940b6e`.
- `GET /` returned HTTP 200.

## Production-path verification

The live JavaScript bundle contains the real backend and WebSocket URLs:

- `https://cws-portal.onrender.com`
- `wss://cws-portal.onrender.com`

It also contains the Supabase production URL and publishable key. Supabase auth is configured and development mock auth is disabled. `mockBackend` is present only as a lazy module reference behind that disabled development branch; the active upload, create-job, status, preview, approval and download functions call the real backend.

Backend source confirms `POST /jobs` persists `render_orders`, creates the internal Worker Fleet task, and does not create payment before preview approval.

## Production control-plane evidence

Read-only Supabase query at project `ynhxlxetwuiyejcjypsi` returned:

| Metric | Value |
|---|---:|
| `public.workers` | 29 |
| `public.worker_identities` | 0 |
| fresh workers (`last_seen_at` < 2 minutes) | 0 |
| `public.worker_leases` | 0 |
| open tasks (`queued`, `active`, `soft_failed`) | 247 |

The Windows host environment has none of the required production runtime configuration variables set, and the Desktop package contains the canonical Node Agent but no provisioned DPAPI credential. No production job mutation was performed during this audit.

## Conclusion

The current evidence does not support a claim that production is running a mock render path. It does support a clear runtime blocker: no authenticated physical Worker is provisioned or sending heartbeat, so a real customer job cannot be claimed and cannot reach Blender/B2 completion.

Physical E2E remains **NOT VERIFIED**: no real job ID from this audit, Worker claim, Blender PID, B2 output, backend completion, or customer download.

## Required external prerequisite

Provision one approved production Worker identity and its scoped B2 runtime configuration on the physical Windows Worker using the existing `worker/production_node_agent.py` contract. Do not use `worker.bat` or `cws_worker_full.py` as the production runtime and do not create a new infrastructure project.
