# CWS Blender Render Optimization Research — 2026-08-05

## Rule

No customer scene is mutated by this work. Optimization is a per-job proposal with `ORIGINAL → PROPOSED → EXPECTED SPEEDUP → QUALITY RISK → REVERSIBILITY` and an explicit tier.

## Analyzer

`worker/blender_scene_analyzer.py` is a read-only Blender-background analyzer. It reports engine, resolution, object/mesh/light counts, geometry, texture footprint, missing assets, subdivision, volumes, Cycles sampling/light-path settings, and recommendations. It was run with Blender 5.2 and `--disable-autoexec` against the harmless staging scene: clean exit and valid JSON were observed. This is **REAL RUNTIME VERIFIED for the analyzer only**, not a customer render benchmark.

## Optimization tiers

| Tier | Candidate | Application rule |
|---|---|---|
| SAFE | Persistent Data for repeated animation frames; instance reuse; missing/unused asset detection; bounded texture diagnostics | Apply only when the scene/engine supports it and memory headroom is proven. Persistent Data trades memory for speed. |
| CONDITIONAL | Adaptive sampling/noise threshold, denoising device, light threshold, bounce limits, texture down-resolution, subdivision/display settings | Analyzer must record before/after settings and a representative image-difference/quality check. |
| QUALITY-TRADEOFF | Lower samples, aggressive denoise, clamp, disabling caustics/volumes/transparency, lower resolution percentage, lower bounce caps | Proposal only unless customer/tier explicitly permits it. |

Official Blender guidance confirms adaptive sampling, denoising, light thresholds, bounce limits, Persistent Data, and CPU/GPU device selection are performance/quality tradeoffs. Community reports about portals, `.tx` textures, and interior noise are treated as hypotheses until staging benchmarks confirm them.

Sources: [Cycles performance](https://docs.blender.org/manual/en/4.5/render/cycles/render_settings/performance.html), [Cycles sampling](https://docs.blender.org/manual/de/4.0/render/cycles/render_settings/sampling.html), [Cycles light paths](https://docs.blender.org/manual/nb/4.5/render/cycles/render_settings/light_paths.html), [GPU rendering](https://docs.blender.org/manual/fr/5.0/render/cycles/gpu_rendering.html), and [command-line rendering](https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html).

## Benchmark plan

Use only harmless staging scenes: baseline render, one isolated change, same camera/output/color management, render time, peak memory/VRAM where available, checksum, and image-difference threshold. Keep ARCHVIZ_SAFE, ARCHVIZ_BALANCED, and ARCHVIZ_MAX_QUALITY as policy proposals until benchmark evidence exists.
