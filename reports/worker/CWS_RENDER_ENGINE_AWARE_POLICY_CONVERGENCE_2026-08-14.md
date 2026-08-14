# Track A engine-aware optimization policy convergence

## Current active path

`cws_worker_full.py` claims a task, loads the job `.blend`, runs the canonical
read-only `worker/blender_scene_analyzer.py` with Blender background mode and
`--disable-autoexec`, then constructs the existing per-frame render command.
The analyzer reads `scene.render.engine`; filenames, customer labels and job
metadata are never used for engine inference.

Normalization:

| Blender scene value | CWS value |
|---|---|
| `CYCLES` | `CYCLES` |
| `BLENDER_EEVEE` | `EEVEE_LEGACY` |
| `BLENDER_EEVEE_NEXT` | `EEVEE_NEXT` |
| anything else / unavailable | `UNKNOWN` |

The analyzer also emits deterministic workload/profile hints and scene
characteristics. Characteristics are diagnostics, not AI decisions and do not
override scene settings.

## Effective policy

The active policy is diagnostics-only:

- safe operational: detect engine/version, inspect assets/dependencies,
  collect device/backend and scene-risk signals, preserve paths/settings,
  collect timing/output evidence;
- benchmark-only: adaptive sampling, noise threshold, samples, denoising,
  light paths, bounces, caustics, clamp, volume quality, texture/geometry
  changes;
- do-not-auto-change: materials, lights, camera, resolution, texture contents,
  particle density, subdivision/displacement, scene lighting, and customer
  artistic intent.

The old mutation builder remains only as cold-history code for comparison; the
active `_load_job_context()` path no longer calls it. The active policy does
not set Persistent Data because Track A launches a fresh Blender process for
each frame. Enabling it in that lifecycle would not provide ordinary
cross-frame reuse and could increase memory retention.

Unknown engine or unavailable diagnostics produces no optimization mutation;
the worker preserves customer settings and continues the existing render/error
path.

## Canonical research applied

The policy uses `worker/archviz_profiles.json`,
`worker/render/BLENDER_CYCLES_OPTIMIZATION_KNOWLEDGE.md`, the Archviz
preflight report, and the recorded EEVEE stress evidence. The requested files
`worker/render/EEVEE_OPTIMIZATION_KNOWLEDGE_V1.md` and
`reports/worker/CWS_RENDER_OPTIMIZATION_POLICY_CONVERGENCE_2026-08-14.md`
were not present in the grounded canonical checkout; the existing EEVEE stress
flow and Archviz render research were used instead, without inventing a
duplicate policy document.

No backend, Supabase, B2, scheduler, Worker lifecycle, or render output
contract is changed by this slice.
