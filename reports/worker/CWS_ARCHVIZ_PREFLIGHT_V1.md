# ARCHVIZ_PREFLIGHT_V1

Status: implemented as a read-only extension of `worker/blender_scene_analyzer.py`.

## Boundary

Track A invokes the analyzer before rendering. It opens a working `.blend` in
Blender background mode with `--disable-autoexec`, writes JSON, and exits. It
does not render, save the source, enable scene scripts, change settings, call
Supabase/B2/Drive, or claim an exact render-time estimate. The report is a
risk-oriented observation, not an optimizer and not an `INPUT_SAFE` decision.

Command contract:

```text
blender --background --disable-autoexec scene.blend --python worker/blender_scene_analyzer.py
```

The caller sets `CWS_ANALYZER_OUTPUT`. Missing or unavailable Blender values
are `null` or `UNKNOWN`.

## Report contract

`cws.archviz-preflight.v1` contains project/profile, render and Cycles
sampling/light-path settings, geometry complexity, instances, Geometry Nodes,
subdivision/displacement indicators, glass/transparency/volume materials,
lights/world, packed/external/missing assets, linked libraries, cache/VDB
references, enabled add-ons, memory-risk indicators, and deterministic risk
flags. The existing worker-compatible top-level fields remain intact.

Profile classification is heuristic only: `ARCHVIZ_INTERIOR`,
`ARCHVIZ_EXTERIOR`, `ARCHVIZ_GIS`, `BLENDER_GENERAL`,
`BLENDER_ANIMATION`, `VOLUME_VFX`. It never changes render settings.

## Research conclusions

- Adaptive sampling and Noise Threshold trade samples/noise; Min Samples is
  the floor before adaptive termination. Denoising is a quality/performance
  tradeoff, not a universal safe switch.
- Bounce caps, transmission/glass, transparency, volumes and caustics explain
  potential path cost/noise but do not prove a time estimate. Clamping can
  reduce fireflies while changing bright contributions.
- Persistent Data can accelerate repeated animation renders while increasing
  memory use. GPU selection is a host/device concern and VRAM limits can make
  complex scenes fail or fall back; the preflight therefore reports the scene
  device and leaves backend capability as `UNKNOWN`.
- Texture dimensions/decoded footprint, missing external files, linked
  libraries, VDB/cache references, subdivision, displacement, instances and
  Geometry Nodes are dependency or memory-risk signals. Base mesh counts are
  not evaluated-final counts.
- Blender's command-line `--disable-autoexec` is required for untrusted
  customer files. No preflight result authorizes execution of scene scripts.

Primary references:

- Blender Manual — [Cycles Sampling](https://docs.blender.org/manual/en/latest/render/cycles/render_settings/sampling.html), [Light Paths](https://docs.blender.org/manual/en/latest/render/cycles/render_settings/light_paths.html), [Performance](https://docs.blender.org/manual/en/latest/render/cycles/render_settings/performance.html), [GPU Rendering](https://docs.blender.org/manual/en/latest/render/cycles/gpu_rendering.html), [Command Line](https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html), [Scripting Security](https://docs.blender.org/manual/en/latest/advanced/scripting/security.html), [Packed Data](https://docs.blender.org/manual/en/latest/files/blend/packed_data.html).
- Blender API — [`bpy.ops.wm.open_mainfile`](https://docs.blender.org/api/current/bpy.ops.wm.html) and [`bpy.data`](https://docs.blender.org/api/current/bpy.data.html).

## GitHub research and reuse boundary

| Project | Adoption signal / license | CWS lesson | Do not copy |
|---|---|---|---|
| [blender/blender](https://github.com/blender/blender) | Official upstream mirror; GPL-2.0-or-later | Prefer Blender's public data/API and version-tolerant `getattr` probing | Blender internals or a fork |
| [blender/cycles](https://github.com/blender/cycles) | Official Cycles mirror; 595 stars shown during research; Apache-2.0 | Treat sampling, light paths and device as renderer-owned observations | A standalone renderer or custom kernel |
| [nortikin/sverchok](https://github.com/nortikin/sverchok) | 2.5k stars shown during research; GPL-3.0 | Geometry Nodes/procedural scenes make base counts insufficient | Add-on framework or procedural graph execution |
| [yuki-koyama/blender-cli-rendering](https://github.com/yuki-koyama/blender-cli-rendering) | 820 stars shown during research; GPL-3.0 | Headless CLI plus explicit scripts is a useful operational shape | Its examples, scene generation, or render policy |

BlenderGIS and similar GIS/add-on projects remain research references only;
V1 detects hints and dependencies but does not install or execute add-ons.

## Risk language

`HIGH`, `MEDIUM`, and `INFO` flags identify what Founder/Worker should inspect.
They are not a render-time prediction, automatic optimization recommendation,
or backend admission decision. Any later optimizer must use a separate working
copy, preserve the original, benchmark before/after, and keep quality-risk
approval explicit.

## Verification status

Static contract checks are included in
`tests/worker/test_archviz_preflight_contract.py`. Their execution and Blender
runtime verification both require an installed Python/Blender executable and a
harmless staging `.blend`; no customer scene or production service is used.
On the current setup host, neither executable was discoverable, so execution
is recorded as NOT VERIFIED; source-level safety checks PASS.
