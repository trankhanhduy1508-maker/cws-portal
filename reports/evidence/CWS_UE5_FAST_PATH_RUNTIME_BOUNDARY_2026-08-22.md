# CWS UE5 fast-path runtime boundary — 2026-08-22

## Decision

Do not make a full Blender/Cycles native-2K sequence a prerequisite for the fast UE5 experiment. It changes the job from a minutes-scale UE5 plate render into a traditional offline render and violates the practical one-hour boundary.

The preferred fast route is:

`existing Blender/Cycles beauty plate -> UE5 raster plate -> SM5 direct-child MRQ -> fast H.264 encode -> optional 2K delivery upscale`

The Blender source remains the visual authority, but it is not re-rendered at native 2K for this bounded UE5 speed experiment.

## Runtime evidence

- Earlier UE5 baseline: 60 frames at 640x360; direct-child MRQ duration `00:00:09.876`; direct MP4 executor duration `00:00:10.354`.
- Best fast sharpness candidate: UE5 SM5, `sg.TextureQuality=4`, `r.TextureStreaming=0`, `r.ForceLOD=0`, `r.ScreenPercentage=100`, `r.AntiAliasingMethod=0`, `r.TemporalAA.Upsampling=0`, `r.TSR.History.ScreenPercentage=100`.
- No-AA candidate: 60/60 non-black UE5 PNGs at 640x360; MRQ log reports `Movie Pipeline completed. Duration: +00:00:17.434`.
- Existing 2K delivery encode: `CWS_B4_UE5_NoAA640_Upscaled2K.mp4`; 60 frames, 24 fps, 2.5 seconds, 2560x1440; encode log reports approximately `5.37s` elapsed.
- Total measured fast-path render-plus-encode budget is therefore tens of seconds on this host, excluding normal process startup/cache variance, not hours.
- Motion is real: the no-AA PNG sequence contains 60 distinct frames; frame 0 to frame 1 mean absolute RGB difference is `4.63897`, and frame 0 to frame 59 is `25.89385`.

## Quality evidence

At the matched representative frame 0030 / Blender frame 0462:

| candidate | RGB MAE | RGB RMSE | edge energy |
|---|---:|---:|---:|
| retained UE5 baseline | 73.2551 | 79.3891 | 382.9710 |
| nearest/no-mipmap | 73.1226 | 79.2566 | 410.6342 |
| no-AA/no-temporal-upsample | 72.7127 | 78.9129 | 1206.9361 |

The no-AA candidate is visibly clearer around hair, glasses/eyes, face outline, hand and clothing seams. Generic post-sharpening and scalar gain probes were rejected. The no-AA run is a render-time reconstruction change, not a post-sharpen filter.

The 2K output is a delivery upscale from a 640x360 UE5 render. It is not native 2K scene detail recovery; that distinction is intentional under the speed boundary.

## Root cause and research alignment

The time explosion came from the Blender/Cycles native-2K upstream stage: the scene took roughly 2+ minutes per frame even after switching to OptiX, so 60 frames alone approached or exceeded the one-hour budget before UE5 import, MRQ and encode.

Epic's UE5.8 documentation states that temporal upscalers reconstruct from current and previous frames, that screen percentage controls the internal render resolution, and that temporal reconstruction can blur fine details in motion. The successful no-AA candidate is consistent with that boundary. Epic also documents MRQ as a batch rendering/automation path and the separate spatial upscale quality controls.

Official references:

- https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine
- https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-upscalers-in-unreal-engine
- https://dev.epicgames.com/documentation/en-us/unreal-engine/screen-percentage-with-temporal-upscale-in-unreal-engine?lang=en-US
- https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-rendering-image-quality-settings-in-unreal-engine?lang=en-US
- https://docs.blender.org/manual/en/5.2/render/color_management/index.html

## Artifacts

- Workspace: `.cws_tmp/B4_JOB/CWS_B4_UE5_NoAA640.mp4`
- Workspace 2K: `.cws_tmp/B4_JOB/CWS_B4_UE5_NoAA640_Upscaled2K.mp4`
- Desktop deliverable: `C:\Users\Administrator\Desktop\CWS_B4_UE5_FastSharp_NoAA_2K.mp4`
- GlobalVideo output: `C:\Users\Administrator\Desktop\GlobalVideo_Output\CWS_B4_UE5_FastSharp_NoAA_2K.mp4`
- Existing native-2K benchmark and earlier baseline remain preserved.

Status: `FAST_PATH_QUALITY_IMPROVEMENT_VERIFIED`; native 2K semantic scene reconstruction remains out of scope for this speed-bounded experiment.
