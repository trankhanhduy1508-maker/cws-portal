# CWS UE5 Fast Sharpness Probe

Date: 2026-08-22  
Host identity observed by runtime: `MAY084` / `may084\administrator`  
Host named by existing CWS evidence: `MAY083`  
Status: BLOCKED before UE runtime promotion; baseline preserved

## Scope

This is a continuation of the existing B4 raster/plate route. It does not replace Track A Blender/Cycles, repeat the failed GLB/USD route, or render the full sequence.

## Existing visual evidence

The retained representative images were inspected directly:

- Blender reference: `.cws_tmp/B4_JOB/BlenderPlateFrames/frame_0462.png`
- UE baseline: `.cws_tmp/B4_JOB/RenderUE5RasterFixed/B4_Raster_Fixed.0030.png`
- UE sRGB-false probe: `.cws_tmp/B4_JOB/QualityProbe_sRGBFalse/B4_sRGBFalse.0030.png`

FACT: composition and subject survive the plate route. FACT: the UE baseline is visibly brighter and softer than the Blender frame, especially around hair strands, glasses/eyes, skin edges and clothing seams.

Existing baseline metrics are unchanged:

- RGB MAE: `73.2551`
- RGB RMSE: `79.3891`
- mean RGB: `[164.9052, 128.2543, 127.5059]`
- baseline edge energy from the repeatable local probe: `382.9710`

The earlier scalar gain probe remains rejected: MAE improved only `73.2551 -> 73.1048`, while RMSE worsened `79.3891 -> 81.8974`.

## Official guidance used

Epic's UE 5.8 texture documentation states that mip generation has explicit `NoMipMaps` and sharpening modes, and that texture LOD/filter settings affect image quality. The source plate is `640x360`, a non-power-of-two image; Epic documents that non-power-of-two textures do not generate mips by default. Epic's TSR documentation also states that screen percentage controls the rendering resolution and affects available detail. MRQ documentation distinguishes spatial and temporal sampling and warns that TAA/temporal accumulation must be matched to the chosen sample count.

References:

- https://dev.epicgames.com/documentation/unreal-engine/texture-asset-editor-in-unreal-engine?lang=en-US
- https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/TextureMipGenSettings?lang=en-US
- https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine
- https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-rendering-image-quality-settings-in-unreal-engine?lang=en-US

## Controlled runtime attempt

A derived frame-0030 texture/material probe was prepared to change only the plate texture policy while retaining source pixels, sRGB, `PlateGain=0.52`, camera, resolution and direct-child MRQ:

- `NeverStream=true`
- `LOD Bias=0`
- `TMGS_NoMipmaps`
- `TC_EditorIcon`

The preparation was attempted three ways. The existing no-cache path stalled at engine shader maps. A documented local DDC override then produced:

`LogDerivedDataCache: Local: Using data cache path .../.cws_tmp/B4_JOB/LocalDDC: Writable`

but UE still stopped/crashed before the Python report was written. CrashReportClient and ShaderCompileWorker processes were observed; no probe PNG or `quality_probe_texture_quality_report.json` exists. Therefore this texture policy is **not runtime verified and was not promoted**.

## Offline post-sharpen falsification

Using the retained UE baseline only, a temporary Pillow unsharp probe was run to test whether simple sharpening alone could close the gap:

| Candidate | MAE | RMSE | Edge energy |
|---|---:|---:|---:|
| Baseline | 73.2551 | 79.3891 | 382.9710 |
| r0.6 / 80% | 73.2539 | 79.4242 | 456.0160 |
| r0.8 / 100% | 73.2637 | 79.4965 | 559.2215 |
| r1.0 / 120% | 73.3850 | 79.6774 | 674.6324 |

Decision: **REJECT**. The lightest candidate raises edge energy but worsens RMSE; stronger sharpening worsens both error and visual-risk profile. This falsifies “add generic post-sharpening” as a sufficient quality fix.

## Classification and next safe step

- FACT: the visual softness/color gap is present in the retained baseline.
- FACT: scalar gain and generic post-sharpening do not pass the representative metric gate.
- FACT: the proposed UE texture-policy change was not runtime verified because UE failed before the preparation script completed.
- INFERENCE: the current largest visible gap remains transfer/presentation plus an unisolated plate sampling/compression boundary; no exact softness root cause is promoted yet.
- BLOCKER: UE 5.8.1 shader/bootstrap/CrashReportClient path prevents a fresh representative MRQ test on this runtime. The local DDC path is now proven writable but did not eliminate the crash/stall.

No full sequence was rendered. The existing UE baseline and Blender/Cycles authority remain unchanged.

## Follow-up source and bootstrap isolation (2026-08-22)

The retained Blender source frame `.cws_tmp/B4_JOB/Content/Movies/MediaSequence/image_0030.png` is `640x360` and is byte-for-byte pixel-identical to `.cws_tmp/B4_JOB/BlenderPlateFrames/frame_0462.png`. This rules out a source/reference frame mismatch as the cause of the observed softness. The matching UE frame remains `640x360`; its edge energy is `6.6120` versus `9.0082` for the source/reference, with the previously recorded RGB MAE/RMSE unchanged.

Epic's UE 5.8 screen-percentage documentation explains that primary screen percentage renders at a different internal resolution and then scales to the output. A materially different native-resolution probe was therefore prepared using the unchanged baseline map, sequence, textures, material and MRQ settings, with both the parent and requested output at `640x360`. The probe script was `.cws_tmp/render_raster_native640.py`.

The native-resolution probe did not reach the Python/MRQ boundary. Two clean invocations ended after UE startup at the same first failing boundary:

- missing cached `WorldGridMaterial` shader map in `PCD3D_SM6`;
- ShaderCompileWorker processes and `Saved/ShaderDebugInfo/PCD3D_SM6/WorldGridMaterial_*` were created;
- CrashReportClient started;
- no native-resolution report or PNG was written.

A second invocation set `r.ShaderCompiler.JobCache=1` and `-NumShaderCompilingThreads=1`; it produced the same boundary and still launched five ShaderCompileWorker processes. This is not evidence against native resolution; it is evidence that the current UE 5.8.1 Installed/DDC bootstrap cannot safely execute a fresh MRQ probe on this workspace. The native-resolution candidate was not promoted, and no full sequence was rendered.

Supporting references: Epic's UE 5.8 [TSR](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine), [screen-percentage](https://dev.epicgames.com/documentation/en-us/unreal-engine/screen-percentage-with-temporal-upscale-in-unreal-engine?lang=en-US), [command-line/rendering paths](https://dev.epicgames.com/documentation/en-us/unreal-engine/graphics-programming-overview-for-unreal-engine), and the Epic issue/forum evidence on missing cached shader maps and ShaderCompileWorker failures: [UE-239035](https://issues.unrealengine.com/issue/UE-239035), [missing WorldGridMaterial shader map](https://forums.unrealengine.com/t/missing-cached-shadermap-for-worldgridmaterial-in-metal/1766382).

Current decision: preserve the proven UE baseline and do not promote unverified texture/import, native-resolution, or shader-setting changes. The next quality-changing UE test requires a repaired/version-matched DDC/shader bootstrap or a human-approved alternate UE installation/runtime; repeated retries on this failing boundary are not evidence-backed.

## Follow-up bootstrap isolation and texture sampling probe (2026-08-22)

The exact current logs confirm that `-DDC-ForceMemoryCache` was active in the failed SM6 probes. It did not supply the missing engine shader map: the local cache was writable, the read-only engine `Compressed.ddp` was only a seed, and UE still had to compile `WorldGridMaterial` and other engine materials. Therefore the first SM6 failure was not “the flag was omitted”; it was a missing `PCD3D_SM6` shader map followed by shader/bootstrap failure. The command line and log evidence are retained in `.cws_tmp/B4_JOB/quality_probe_texture_quality_prepare.log` and `.cws_tmp/B4_JOB/quality_probe_texture_quality_prepare_localddc.log`.

 A materially different runtime path was then tested: `-dx11 -sm5` with the real script/local paths, `-DDC-ForceMemoryCache`, and no JobCache/worker-limit changes. The log `.cws_tmp/B4_JOB/render_raster_native640_sm5_fixed_ue.log` proves `PCD3D_SM5`, compiles the missing SM5 engine maps, reaches the Python/MRQ boundary, and writes all 60 `RenderUE5Native640` PNGs. This classifies the prior blocker as an installed UE 5.8.1 SM6 shader/DDC bootstrap failure, not an inherent MRQ or source-resolution failure. The SM5 native candidate was a runtime control, not a promoted quality change: frame 0030 was effectively unchanged from baseline (edge energy `383.2153` vs `382.9710`, RMSE `79.3510` vs `79.3891`).

The first valid texture-domain probe temporarily replaced only frame 0030's material with a new asset using the Epic-documented texture controls: `Texture2D.filter=TF_NEAREST`, `NeverStream=true`, `LOD Bias=0`, `TMGS_NO_MIPMAPS`, `SamplerSource=SSM_FROM_TEXTURE_ASSET`, and `automatic_view_mip_bias=false`. It rendered successfully through the same SM5 direct-child MRQ route. Candidate output:

`.cws_tmp/B4_JOB/RenderUE5NearestCurrent/B4_Raster_NearestCurrent.0030.png`

with no leading space in the actual path. Against the pixel-identical Blender reference, baseline -> candidate was:

| metric | baseline | nearest/no-mipmap candidate |
|---|---:|---:|
| RGB MAE | 73.2551 | 73.1226 |
| RGB RMSE | 79.3891 | 79.2566 |
| edge energy | 382.9710 | 410.6342 |
| edge mean absolute | 6.6120 | 7.0109 |

The candidate is visibly crisper around hair, glasses and clothing edges than the retained UE baseline and remains compositionally aligned with Blender. The original map was restored by `.cws_tmp/restore_raster_baseline.py`; its report is `restored: true, errors: []`. This is a bounded representative-frame improvement, not a full-sequence promotion yet.

A separate `r.AntiAliasingMethod=0` / `r.TemporalAA.Upsampling=0` probe was rejected because the child MRQ produced no PNG and crashed during initialization. Do not promote that branch or repeat it without a new version-matched diagnosis.

## Full plate verification (2026-08-22)

After the representative gate passed, the same policy was applied to all 60 existing plate textures/materials using the UE 5.8 `MaterialEditingLibrary.get_material_expressions()` API. The full candidate rendered through SM5 direct-child MRQ to `.cws_tmp/B4_JOB/RenderUE5NearestAll640` with 60/60 PNGs, and `render_raster_nearest_all640_ue_2.log` records `Movie Pipeline completed` with total resolution `640x360`.

The full candidate quality report is `.cws_tmp/B4_JOB/nearest_all_quality_report.json`. All 60 candidate frames were non-black. Mean comparison to the matching Blender/Cycles frames:

| metric | retained baseline | nearest/no-mipmap full candidate |
|---|---:|---:|
| RGB MAE | 73.1745 | 73.0047 |
| RGB RMSE | 79.2269 | 79.1068 |
| edge energy | 460.4020 | 629.6338 |
| non-black mean | 0.9998 | 0.9998 |

The candidate improved both MAE and RMSE on the full 60-frame mean, increased edge energy, and passed the no-black gate. Sampled frames 0, 29 and 59 were visually inspected; composition remained stable while hair, glasses, hand/clothing boundaries and wall texture were crisper. The original texture/material policy was restored after the render: `restore_nearest_all_report.json` records 60 textures, 60 materials and `errors: 0`; the original map/material baseline therefore remains the rollback authority.

Decision: the nearest/no-mipmap policy is now a verified full-plate quality improvement and the best local UE5 candidate. Keep `RenderUE5RasterFixed` and the current published artifact unchanged until the candidate is encoded/validated as a separate deliverable; do not delete the baseline.

## 2K delivery encode (2026-08-22)

Official guidance was checked before delivery: Epic documents TSR as a temporal upscaler for high-resolution output and documents screen percentage/upscale quality; Epic's MRQ documentation identifies output resolution as an explicit render setting. FFmpeg's official scaler documentation identifies Lanczos as a sinc-windowed resampling algorithm and supports accurate rounding/full-chroma interpolation. Because the retained plate source is 640x360, this is a high-quality 2K delivery upscale, not native 2K detail recovery.

The verified full candidate was upscaled with the local FFmpeg runtime using `scale=2560:1440:flags=lanczos`, `lanczos+accurate_rnd+full_chroma_int`, H.264 `libx264`, CRF 16, yuv420p, 24 fps. FFprobe verified the output as H.264, `2560x1440`, `24/1`, 60 frames, 2.5 seconds. Output: `.cws_tmp/B4_JOB/CWS_B4_UE5_NearestAll640_Upscaled2K.mp4`. The MP4 has video only; no audio track was added to this UE5 image-render experiment.

References: [Epic TSR](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine), [Epic screen percentage/upscale quality](https://dev.epicgames.com/documentation/en-us/unreal-engine/screen-percentage-with-temporal-upscale-in-unreal-engine?lang=en-US), [Epic MRQ render settings](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-render-settings-and-formats-in-unreal-engine), [FFmpeg scaler](https://ffmpeg.org/ffmpeg-scaler.html).

Decision: promote the explicit nearest/no-mipmap texture policy as the next bounded quality path for the raster plate, keep the original baseline as the rollback authority, and require a fresh representative comparison after applying it to the whole plate before any full 60-frame output is replaced. Official references used: [Epic UE 5.8 Texture2D filter](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/Texture2D?application_version=5.1), [Epic TextureFilter API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/TextureFilter?lang=en-US), [Epic TextureSample sampler source](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Materials/UMaterialExpressionTextureSample/SamplerSource?application_version=5.5), and [Epic DDC documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-derived-data-cache-in-unreal-engine).

## Temporal reconstruction softness probe and verified short-sequence artifact (2026-08-22)

The retained baseline, nearest/no-mipmap candidate and a completed no-AA run were compared at the matched frame 0030 / Blender frame 0462. The no-AA run was a real UE 5.8.1 direct-child SM5 MRQ execution, not an offline filter. Its command line recorded the following bounded render policy:

`sg.TextureQuality=4,r.TextureStreaming=0,r.ForceLOD=0,r.ScreenPercentage=100,r.AntiAliasingMethod=0,r.TemporalAA.Upsampling=0,r.TSR.History.ScreenPercentage=100`

The representative metrics were:

| candidate | RGB MAE | RGB RMSE | edge energy |
|---|---:|---:|---:|
| UE baseline 640x360 | 73.2551 | 79.3891 | 382.9710 |
| nearest/no-mipmap 640x360 | 73.1226 | 79.2566 | 410.6342 |
| no-AA / no-temporal-upsample 640x360 | 72.7127 | 78.9129 | 1206.9361 |

FACT: the no-AA frame is visibly crisper at the hair strands, glasses/eyes, face outline, hand and clothing seams, and is closer to the Blender reference than the retained baseline. FACT: the existing full run produced 60/60 non-black PNG frames in `RenderUE5NoAA640`; the UE log ends with `Movie Pipeline completed` and exit status 0. The source texture log reports `640x360 x1x1x1`, so this large improvement is not explained by recovering a hidden higher-resolution mip.

ROOT-CAUSE CLASSIFICATION: the current practical softness boundary is the temporal AA/temporal-upsample reconstruction applied to an exact-size 640x360 plate. The successful probe disabled that reconstruction and set the cinematic texture-quality ceiling. Because the probe changed several console variables together, the individual contribution of `r.AntiAliasingMethod=0` versus the texture-streaming/quality ceiling is not separately isolated; do not claim a single-CVar proof. The evidence does reject generic post-sharpening and Lanczos as the primary solution family. Epic's UE 5.8 documentation explains that TSR and temporal upscalers reconstruct from current/previous frames and that MRQ temporal/spatial sampling must be matched to the AA method; the Epic TSR feedback thread provides supporting reports of softness when temporal reconstruction is active.

The no-AA PNG sequence was encoded separately, preserving all earlier artifacts:

- `CWS_B4_UE5_NoAA640.mp4`: H.264, 640x360, 24 fps, 60 frames, 2.5 seconds, SHA-256 `2481E76449564950F60A0A6FFB2E3521FF143712C4CAD49D26A97E3887324B2A`.
- `CWS_B4_UE5_NoAA640_Upscaled2K.mp4`: H.264, 2560x1440, 24 fps, 60 frames, 2.5 seconds, SHA-256 `57F60EDB5A6E5304C34D9DCB534FA9CCFC48B9F24489C22FE6615AE1D556D22C`.
- Existing Lanczos benchmark preserved unchanged: `CWS_B4_UE5_NearestAll640_Upscaled2K.mp4`, SHA-256 `CF8A108DAC95DD17E96241571FA87E07F7974F5B7D9BCF56EFC35ABCA9071CE7`.

The 2560x1440 no-AA file remains a delivery upscale from a 640x360 UE render; it is not native 2K detail recovery. Both new MP4s are video-only and contain no audio track. Official references: [Epic TSR](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine), [Epic temporal upscalers](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-upscalers-in-unreal-engine), [Epic MRQ image quality](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-rendering-image-quality-settings-in-unreal-engine), [Epic texture streaming configuration](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-streaming-configuration), and supporting [Epic TSR feedback](https://forums.unrealengine.com/t/tsr-feedback-thread/883977).
