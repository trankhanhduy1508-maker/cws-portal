# CWS B4 Full HD / Under-15-Minute Gate — 2026-08-22

## Scope

Source: `.cws_tmp/PhongNguRender6.blend`  
Source hash: `5C20076506CC787BBE2C26360B02111AAB31767B0545BA1185FA76E66D3DB70C`  
Source scene settings: `1920x1080`, 24 fps, frames `432–491` (60 frames). Blender source resolution is not 640x360.

## Existing MP4 motion verification

The retained UE5 MP4 was checked with ffprobe: H.264, 2560x1440, 24 fps, 60 frames, 2.5 seconds. Decoded frame hashes at start/middle/end were different, and visual inspection showed changed hand/pose positions. It is not a held/still character.

## New representative tests

- Native Blender Eevee at 1920x1080, exposure +1.0: 82.632s for frame 462. Camera, evaluated character, hair, glasses, eyes and clothing transferred correctly because Blender rendered the source directly, but lighting was materially darker than the Cycles reference.
- Eevee at 640x360, same process: frames 432/462/491 took 74.981s, 20.946s and 49.543s; total 145.517s. A low-profile attempt disabling ray tracing/fast GI and reducing TAA samples took 155.371s for one frame. Full 60 frames cannot meet the 15-minute gate.
- Blender Workbench at 1920x1080: 47.895s for one frame. It preserved broad geometry/camera but visibly diverged in lighting, materials and texture appearance; it is not a 90–95% route.

## Usable Full HD artifact

`C:\Users\Administrator\cws-portal-canonical-main\.cws_tmp\B4_JOB\CWS_B4_UE5_FastSharp_NoAA_FullHD_1920x1080.mp4`

Validation: H.264, `1920x1080`, `24/1`, 60 frames, 2.5 seconds, video-only. SHA-256: `8B60C9959C9DB317140B9B4E1C52BA1EB3B969F1DF08E53927B5853F3F089D4C`.

It was encoded in 4.04s from the already-rendered 60-frame UE5 no-AA plate sequence. The real upstream plate stage was already measured at ≥20m39s, plus UE5 MRQ 17.434s, so the honest `.blend -> MP4` lower bound remains about 21 minutes. This artifact is therefore usable and animated, but does not pass the requested under-15-minute end-to-end gate.

## Decision

Do not report GOAL ACHIEVED. Direct skeletal/FBX, USD/MaterialX, native Eevee, low-profile Eevee and Workbench each fail either semantic fidelity, speed, or both. The next materially different path would require a faster GPU-capable native renderer or an explicitly accepted precomputed plate/cache boundary; neither is available as a verified under-15-minute source-to-MP4 route on this host.

References: [Blender output format](https://docs.blender.org/manual/en/latest/render/output/properties/format.html), [Blender Eevee](https://docs.blender.org/manual/en/latest/render/eevee/index.html), [Epic Movie Render Queue](https://dev.epicgames.com/documentation/en-us/unreal-engine/rendering-high-quality-frames-with-movie-render-queue-in-unreal-engine).
