# CWS ArchViz Render Optimization — 2026-08-05

## Workload risks

Interior scenes commonly concentrate cost in high-resolution textures, displacement/subdivision, glass/transmission, many area lights, HDRI reflections, vegetation, volumes, linked libraries, and simulation caches. These are analyzer inputs, not permission to change a customer scene.

## Preflight contract

Before assignment, report missing/absolute asset paths, linked libraries, packed/unpacked files, addons/fonts, texture dimensions and estimated footprint, geometry and subdivision, engine/device compatibility, VRAM/RAM estimate, frame dependencies, and simulation-cache availability. A missing dependency is a permanent/preflight error, not a render retry.

## Profiles (proposal only)

- `ARCHVIZ_SAFE`: preserve samples, color management, light paths, materials, and resolution; only flag missing assets, reuse instances, and produce diagnostics.
- `ARCHVIZ_BALANCED`: conditional adaptive sampling/denoise/texture and bounce proposals, requiring recorded quality comparison and customer-tier permission.
- `ARCHVIZ_MAX_QUALITY`: no automatic quality reduction; allow longer render and stronger preflight/timeout budgeting.

Customers do not select CPU/GPU directly and the existing pricing/time-tier architecture is unchanged. Profiles are policy data, not a new runtime feature in this milestone.

## Status

**CODE VERIFIED:** analyzer exists and is read-only. **REAL RUNTIME VERIFIED:** analyzer ran on the harmless staging scene. **UNVERIFIED:** profile benchmarks, VRAM estimator accuracy, asset packaging for arbitrary customer libraries, and quality-difference thresholds.

Official references are maintained in `CWS_BLENDER_RENDER_OPTIMIZATION_RESEARCH_2026-08-05.md`; community/forum guidance remains advisory until staging measurements support it.
