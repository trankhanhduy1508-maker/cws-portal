# CWS Worker Tracks — Active

> Status: ACTIVE
> Founder decision: 2026-08-14
> Purpose: define the current roles of the two CWS Worker tracks without silently merging their architectures.

## Track A — Operational / Revenue Worker — CURRENT PRIORITY

The current Founder-priority Worker path is:

`cws_worker.bat -> cws_worker_full.py -> Blender/render/output handling`

These files are no longer classified as legacy/reference-only for current CWS work. They are the **Founder-controlled operational/revenue Worker track** to be used and improved for real rendering while CWS learns from real work.

Current priority is functional reliability:

- start reliably on the Founder-controlled Windows machine;
- obtain the intended render input under the approved manual/controlled trust decision;
- prepare a safe working copy/workspace;
- invoke the intended Blender executable and render correctly;
- detect success/failure accurately;
- validate expected output;
- upload/deliver output only after validation when B2 is used;
- retry/recover from bounded failures;
- clean temporary/job-scoped files without damaging the customer original;
- produce useful logs/evidence for diagnosis.

### Operational safety floor

Track A is intentionally simpler and more Founder-controlled than the future automated multi-tenant system, but SECURITY IS NOT OFF.

Minimum non-negotiable safety:

- no secrets or broad production credentials committed in tracked `.bat`/`.py` files;
- no destructive modification of the customer original;
- no unnecessary Supabase service-role/B2 master credential on the render PC;
- no accidental execution of untrusted embedded Blender Python merely because a file is rendered;
- no silent success before render/output/upload verification;
- no unsafe automatic self-update or dependency mutation without explicit bounded design;
- failures must be visible and diagnosable.

Historical behavior inside these files is not automatically approved merely because Track A is now active. Each unsafe/stale behavior must still be audited and corrected.

## Track B — Node Agent / Worker Engine Auto-E2E Research — SANDBOX / LATER

The Node Agent + Worker Engine architecture is retained as the **automated E2E / scale / unattended-worker research track**.

Current conceptual direction remains useful for future automation:

`Windows boot -> Node Agent -> authenticated presence -> claim/lease/fencing -> task-scoped Worker Engine -> Blender -> verified output -> cleanup`

However, this track is **not the current execution blocker for today's operational/revenue work** and is not the default Worker implementation target unless the Founder explicitly switches priority back to automated E2E.

For now:

- preserve code/spec/tests/evidence;
- treat runtime experiments as sandbox/staging research;
- do not delete the track;
- do not force Track A to adopt the whole Track B architecture;
- do not report Track B code/tests as current operational runtime evidence;
- do not make Track B provisioning/heartbeat gates block Track A real-render experiments.

## Relationship between the tracks

Track A and Track B serve different current purposes:

- Track A optimizes for **real render capability, revenue evidence, learn-from-doing, and Founder-controlled operation now**.
- Track B optimizes for **future unattended automation, scale, stronger multi-tenant isolation, authenticated lifecycle control, and Golden E2E later**.

Do not silently merge the two architectures.

Useful capabilities may be transferred only when they solve a demonstrated Track A problem with acceptable complexity and do not reintroduce stale/unsafe assumptions.

Likewise, Track A success does not prove Track B Golden E2E.

`TRACK_A_REAL_RENDER_PASS != TRACK_B_GOLDEN_E2E_PASS`

## Current engineering priority

Until the Founder changes priority again:

1. audit `cws_worker_full.py` and `cws_worker.bat` as active operational files;
2. reproduce and fix real functional defects;
3. strengthen the minimum safety floor needed for controlled real work;
4. verify a real Founder-controlled Blender render and output path;
5. learn from real customer/render evidence;
6. keep Node Agent/Worker Engine research preserved but secondary.
