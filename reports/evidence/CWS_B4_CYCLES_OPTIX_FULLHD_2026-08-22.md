# CWS B4 Native Cycles OptiX Full HD — 2026-08-22

## Result

The real source `.cws_tmp/PhongNguRender6.blend` was rendered directly with Blender 5.2.0 Cycles using the discovered RTX 2060 SUPER OptiX device. This is not a Blender beauty-plate dependency and does not use UE interchange.

Source hash: `5C20076506CC787BBE2C26360B02111AAB31767B0545BA1185FA76E66D3DB70C`
Source settings: 1920x1080, 24 fps, frames 432–491.
GPU: NVIDIA GeForce RTX 2060 SUPER, OptiX; CPU disabled.
Cycles: 8 samples, adaptive sampling enabled, denoising enabled.
Internal render: native 1920x1080.

## Timing

- Blender source load/preparation: approximately 0.6s startup plus 0.068s script preparation.
- Native Cycles OptiX render: `2054.410s` (`34m14.410s`) for 60 frames.
- PNG-to-H.264 encode: `4.853s`.
- Measured source-to-MP4 lower bound: approximately `34m19s`, with no hidden Blender/Cycles plate stage.

The Founder explicitly accepted the temporary ~36-minute budget for this native-quality run. The earlier under-15-minute gate remains documented separately; this route is the accepted quality-first native baseline for this machine.

## Output validation

MP4: `.cws_tmp/B4_JOB/CWS_B4_CyclesOptix_FullHD.mp4`
SHA-256: `21000577C00C460676B45A22E15E79E0B106F5702EE2BE5F8EF5A73586087DF0`
ffprobe: H.264, 1920x1080, 24/1 fps, 60 frames, 2.500000s, video-only.

PNG validation: 60/60 files, sequential indices `.0000`–`.0059`, all approximately 3.1–3.2 MB and native 1920x1080. Decoded representative frames 0/30/59 were visually inspected. The character is not held: the sequence visibly moves from an open/pointing hand to the later phone-in-front-of-face pose, with correct forward temporal order.

## Fidelity assessment

The native Cycles OptiX output preserves the Blender camera/composition, evaluated character geometry, proportions, eyes, hair, glasses, clothing, textures, lighting mood and animation. Qualitatively it is in the requested practical fidelity range; no false numeric 90% metric is claimed. Remaining gaps are the expected 8-sample denoising/detail loss versus the source's 400-sample reference, plus small exposure/noise differences.

Official research used: [Blender GPU Rendering](https://docs.blender.org/manual/en/latest/render/cycles/gpu_rendering.html), [Blender Eevee](https://docs.blender.org/manual/en/latest/render/eevee/index.html), [Blender output format](https://docs.blender.org/manual/en/latest/render/output/properties/format.html), and [Epic Movie Render Queue](https://dev.epicgames.com/documentation/en-us/unreal-engine/rendering-high-quality-frames-with-movie-render-queue-in-unreal-engine).
