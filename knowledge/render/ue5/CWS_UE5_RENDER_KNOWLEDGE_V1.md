# CWS UE5 RENDER KNOWLEDGE V1

> Status: CURRENT_SUPPORTING / EXPERIMENTAL
> Date: 2026-08-21
> Scope: Blender -> fidelity-gated UE5 transfer/plate -> Movie Render Queue -> PNG -> FFmpeg/MP4
> Canonical repository: `trankhanhduy1508-maker/cws-portal`
> Current physical test host: `MAY083`
> Purpose: preserve verified UE5 render lessons, failed approaches, API/version traps, crash evidence, and the exact continuation point so future AI sessions do not repeat the same mistakes.

## 0. Authority and boundary

This document is a focused UE5 render knowledge base. It is NOT a replacement for CWS canonical product or Worker authority.

Before using this document, a new AI session must still follow:

1. `CWS_SESSION_BOOTSTRAP.md`
2. `CWS_KNOWLEDGE_ROUTER.yaml`
3. `CURRENT_STATUS.md`
4. `CWS_WORKER_TRACKS.md`
5. `DECISIONS.md`
6. `FOUNDER_RULES.md` when debugging or changing architecture/governance

Current CWS authority remains:

- Track A Operational / Revenue Worker is the current operational priority.
- Canonical current Track A render core remains `cws_worker.bat -> cws_worker_full.py -> Blender/Cycles -> validated output -> B2`.
- UE5 work is an experimental render acceleration / alternate render research path.
- Do NOT silently replace the canonical Blender/Cycles render core with UE5.
- A UE5 experimental render PASS is NOT Golden Production E2E.
- No runtime evidence means no runtime PASS claim.

Founder technical-debugging rule applies:

`RUNTIME EVIDENCE -> OFFICIAL DOCS -> RELEVANT COMMUNITY CASES -> COMPARE -> FALSIFIABLE HYPOTHESIS -> MINIMAL TEST -> FIX -> VERIFY`

Always distinguish:

- `FACT`
- `INFERENCE`
- `HYPOTHESIS`
- `UNKNOWN`

## 1. Why UE5 is being tested

The Founder is testing whether Unreal Engine 5 can become a much faster render path for suitable Blender/archviz jobs.

Historical GLB baseline (bounded/diagnostic, not the default fidelity route):

`customer .blend -> Blender headless export -> scene.glb -> UE5 Interchange scene import -> non-World-Partition level -> LevelSequence/camera -> MRQ -> PNG frames -> FFmpeg -> MP4`

### BFUE 4.4.8 evidence and current direction (2026-08-21)

The Founder-provided `Blender_For_Unreal_Engine_v4.4.8.zip` was installed as an isolated Blender 5.2 extension and exercised against `PhongNguRender6.blend`. Its practical path is:

`customer .blend -> Blender For Unreal Engine 4.4.8 -> FBX/static mesh + JSON/scripts -> UE5 Interchange -> native level -> command-line MRQ -> PNG/MP4`

This is now the preferred experimental FBX family for future bounded tests; GLB/glTF and USD remain fallback/diagnostic families, not the CWS fidelity contract. The plugin manifest requires Blender `>=5.0.0`, exports a valid 118 MB whole-scene FBX and import scripts, and UE5 successfully builds a native StaticMesh from it. The generated whole-scene mesh is not a practical default on this host: UE estimates `7953.7 MiB` to build it, reports `81` material sections (Nanite disabled), and the native representative frames remain materially unlike Blender after plugin-authored and full-basis camera tests.

The plugin's own `ImportSequencerData.json` recorded `spawnable_camera: true` but `cameras: []`; the corresponding export log reported `0 Camera(s)`. Camera/shot export must therefore be treated as an explicit separate contract and must not be assumed to accompany a collection FBX export. A future BFUE implementation should split by root collection/asset, use bounded camera/shot metadata, convert materials to a simple UE PBR subset, and pass the representative-frame gate before full rendering. Do not repeat the one giant FBX as the default.

### Fast UE5 baseline and quality direction (2026-08-21)

**FACT — FOUNDER-PROVIDED:** the current UE5 path rendered a video in approximately five minutes that previously required approximately seven machine-hours in Blender. The Founder’s current overall visual assessment is approximately 80% of the Blender reference. The exact five-minute artifact/settings bundle is not yet linked in the local runtime evidence, so this is preserved as a Founder milestone rather than a universal runtime guarantee.

**FACT — LOCAL RUNTIME:** the reproducible local fast baseline is the raster/plate route:

`Blender/Cycles beauty PNG sequence -> /Game/CWSRaster/B4_Raster_Reconstruction_v4 -> /Game/CWSRaster/B4_Raster_Sequence_v4 -> direct-child UE5 MRQ -> PNG/MP4`

It uses UE `5.8.1` (`56057345+++UE5+Release-5.8`), 60 frames at 24 fps and 640x360 in the current B4 fixture. The local baseline direct-child executor durations are `00:00:09.876` for PNG and `00:00:10.354` for H.264/NVENC MP4. `-DDC-ForceMemoryCache` is required because the Installed DDC graph has no writable node. The observed quality/scalability settings and TSR defaults are recorded in `reports/evidence/CWS_UE5_FAST_BASELINE_AND_COLOR_PROBE_2026-08-21.md`.

**FACT — CONTROLLED NEGATIVE:** a one-frame temporary `PlateGain` change from `0.52` to `0.26` did not improve the representative gate. MAE changed `73.2551 -> 73.1048` while RMSE changed `79.3891 -> 81.8974`; the baseline material/map was restored with `errors: []` and `restored: true`.

**INFERENCE:** the largest current raster gap is color-management/transfer handling between Blender 5.2 AgX/OCIO/output semantics and the UE texture/material/output path. Scalar exposure cannot reproduce the tone curve. The next bounded experiment is explicit color-space/OCIO or LUT/transfer matching, then sharpness/AA, texture/material richness, lighting/shadows and exposure/color. Preserve the fast baseline and do not full-render until a representative frame improves both visually and by metric.

Official guidance used for this direction: [UE5 TSR](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine), [UE5 Movie Render Queue quality](https://dev.epicgames.com/documentation/en-us/unreal-engine/rendering-high-quality-frames-with-movie-render-queue-in-unreal-engine), [UE5 cinematic image quality settings](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-rendering-image-quality-settings-in-unreal-engine?lang=en-US), [UE5.8 MaterialEditingLibrary](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/MaterialEditingLibrary), and the [Blender 5.2 color-management manual](https://docs.blender.org/manual/en/5.2/render/color_management/index.html).

Full evidence: `reports/evidence/CWS_UE5_FAST_BASELINE_AND_COLOR_PROBE_2026-08-21.md`.

### Sharpness refinement handoff (2026-08-22)

**FACT — LOCAL RUNTIME:** direct inspection of the retained B4 images confirms that the fast plate route preserves composition and subject but is visibly brighter and softer than the Blender reference around hair, glasses/eyes, skin edges and clothing seams. Existing baseline metrics remain RGB MAE `73.2551`, RMSE `79.3891`, and mean RGB `[164.9052, 128.2543, 127.5059]`.

**FACT — CONTROLLED NEGATIVE:** a temporary Pillow unsharp probe increased edge energy from `382.9710` to `456.0160` at the lightest setting, but RMSE worsened from `79.3891` to `79.4242`; stronger settings worsened further. Generic post-sharpening is therefore not a sufficient fix and was not promoted.

**FACT — RUNTIME BLOCKER:** a derived texture-policy probe was prepared to change only plate import quality (`NeverStream=true`, `LOD Bias=0`, `TMGS_NoMipmaps`, `TC_EditorIcon`) while preserving source pixels, sRGB, gain, camera and MRQ. UE 5.8.1 stopped/crashed before the Python report or probe PNG was written. A documented `-LocalDataCachePath` override made the workspace DDC explicitly writable, but the process still failed at engine shader/bootstrap and CrashReportClient/ShaderCompileWorker evidence was observed. The texture policy is not runtime verified and is not promoted.

Durable evidence: `reports/evidence/CWS_UE5_FAST_SHARPNESS_PROBE_2026-08-22.md`.

**FACT — SOURCE RESOLUTION IS NOT THE MISMATCH:** the B4 source plate `image_0030.png` is `640x360` and pixel-identical to the matched Blender reference `frame_0462.png`. The retained UE baseline is also `640x360`, but edge energy is `6.6120` versus `9.0082` for the source/reference. The visible softness is therefore introduced at or after the UE plate sampling/render boundary, not by selecting the wrong Blender frame.

**FACT — NATIVE OUTPUT PROBE BLOCKED:** a new probe kept the baseline map, sequence, textures, material and MRQ settings unchanged while requesting native `640x360` parent/output resolution to test the documented screen-percentage/upscale hypothesis. UE 5.8.1 did not reach Python/MRQ: it stopped at missing `WorldGridMaterial` `PCD3D_SM6` shader maps, launched ShaderCompileWorker/CrashReportClient, and wrote no report or PNG. A follow-up with `r.ShaderCompiler.JobCache=1` and one requested shader worker reached the same boundary and still launched five workers.

**DECISION:** do not promote native-resolution, texture import policy, mip/filter, or shader-setting changes without a successful real UE5 representative frame. The next quality probe requires a repaired/version-matched DDC/shader bootstrap or a human-approved alternate UE runtime. Preserve the current fast baseline and Blender/Cycles as authority; do not repeat the same bootstrap retries or render the full sequence.

### Shader bootstrap isolation and first sharpness improvement (2026-08-22)

The exact UE 5.8.1 logs establish that `-DDC-ForceMemoryCache` was present in the failed SM6 probes. It only supplied an in-memory fallback after the Installed graph had no writable node; it did not provide the missing engine shader map. The read-only engine `Compressed.ddp` was a seed, while `WorldGridMaterial`, `DefaultDeferredDecalMaterial`, `DefaultLightFunctionMaterial`, and `DefaultPostProcessMaterial` still needed compilation for `PCD3D_SM6`. The first failure is therefore an installed-runtime SM6 shader/DDC bootstrap failure, not an omitted workaround flag and not evidence that MRQ itself is broken.

A materially different `-dx11 -sm5` route with real paths, `-DDC-ForceMemoryCache`, and unchanged JobCache/worker settings reached the Python/MRQ boundary and rendered all 60 native 640x360 PNGs. This proves the fast plate route can proceed through an alternate supported rendering path on this UE 5.8.1 installation. The SM5 control frame did not materially improve quality, so SM5 is a bootstrap/runtime fallback, not the quality fix.

The first valid quality improvement is an explicit plate-texture sampling policy. For a representative frame, a temporary material sampled the pixel-identical 640x360 source with `Texture2D.filter=TF_NEAREST`, `NeverStream=true`, `LOD Bias=0`, `TMGS_NO_MIPMAPS`, `SamplerSource=SSM_FROM_TEXTURE_ASSET`, and `automatic_view_mip_bias=false`. It rendered through SM5 direct-child MRQ and improved frame 0030 against the Blender reference:

- RGB MAE: `73.2551 -> 73.1226`;
- RGB RMSE: `79.3891 -> 79.2566`;
- edge energy: `382.9710 -> 410.6342` (`+7.2%`);
- edge mean absolute: `6.6120 -> 7.0109`.

Visual inspection confirms a crisper result around hair, glasses and clothing edges while composition remains aligned. This is now the preferred next plate-material policy, but it must be applied and re-verified on the full plate before replacing the retained baseline artifact. The original map was restored with `restored: true` and `errors: []`; baseline assets remain the rollback authority. A separate no-AA/temporal-upsampling probe produced no output and was rejected.

The policy was then applied to all 60 existing plate textures/materials and a separate full candidate was rendered to `.cws_tmp/B4_JOB/RenderUE5NearestAll640`. It produced 60/60 PNGs and passed the no-black gate. Mean comparison to the matching Blender/Cycles frames was:

- RGB MAE: `73.1745 -> 73.0047`;
- RGB RMSE: `79.2269 -> 79.1068`;
- edge energy: `460.4020 -> 629.6338`;
- mean non-black coverage: `0.9998 -> 0.9998`.

Frames 0, 29 and 59 were visually inspected; composition remained stable and hair, glasses, hand/clothing boundaries and wall texture were crisper. The original policy was restored for all 60 textures/materials with `errors: 0`, so `RenderUE5RasterFixed` remains the rollback authority. The full candidate is now the best verified local UE5 quality result, but it is retained as a separate artifact until its MP4 is independently encoded and validated.

Durable evidence: `reports/evidence/CWS_UE5_FAST_SHARPNESS_PROBE_2026-08-22.md`. Official API references: [UE Texture2D](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/Texture2D?application_version=5.1), [UE TextureFilter](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/TextureFilter?lang=en-US), and [UE TextureSample SamplerSource](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Materials/UMaterialExpressionTextureSample/SamplerSource?application_version=5.5).

### 2K delivery upscale (2026-08-22)

The 640x360 full candidate was delivered as a separate 2K MP4 after checking official Epic and FFmpeg guidance. Epic's TSR and screen-percentage documentation support high-resolution temporal/spatial upscaling, while FFmpeg's official scaler documentation identifies Lanczos as a high-quality windowed-sinc resampler. Since the source plate is 640x360, this improves delivery resolution and encoding quality but cannot recover native 2K scene detail.

The local FFmpeg runtime used `scale=2560:1440:flags=lanczos`, `lanczos+accurate_rnd+full_chroma_int`, H.264 `libx264`, CRF 16, yuv420p, 24 fps. FFprobe verified H.264, `2560x1440`, 60 frames and 2.5 seconds. Artifact: `.cws_tmp/B4_JOB/CWS_B4_UE5_NearestAll640_Upscaled2K.mp4`. This UE5 image-render delivery has no audio track.

References: [Epic TSR](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine), [Epic screen percentage](https://dev.epicgames.com/documentation/en-us/unreal-engine/screen-percentage-with-temporal-upscale-in-unreal-engine?lang=en-US), [Epic cinematic render settings](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-render-settings-and-formats-in-unreal-engine), [FFmpeg scaler](https://ffmpeg.org/ffmpeg-scaler.html).

### Quality-gated UE5 video artifact (2026-08-22)

The next bounded experiments were completed without replacing the fast route. An explicit per-frame inverse-LUT candidate rendered successfully through UE5.8.1 direct-child MRQ for all 60 frames after the raster actors were restored to `HiddenInGame=false`. A fail-closed gate accepted only candidates that were at least 98% non-black and strictly improved both RGB MAE and RGB RMSE; it selected 3 candidate frames and 57 baseline frames. The selected sequence mean was MAE `73.1649`, RMSE `79.1026`, versus baseline MAE `73.1745`, RMSE `79.2269`. This is a small safe improvement, not parity.

The global LUT was rejected because it overfit the representative frame and regressed the opening frame. The earlier pixel-only gate was invalid because black frames can produce misleading error scores. Every future automated promotion must include non-black coverage and representative visual inspection.

The playable final artifact is `C:\Users\Administrator\Desktop\CWS_B4_UE5_HighQuality_QualityGated.mp4`, encoded from UE5-rendered PNGs with local FFmpeg `libx264`, CRF 16, native 640x360, 24 fps. FFprobe verified H.264, 60 decoded frames and 2.5 seconds; extracted frames 0, 29 and 59 were non-black and compositionally valid. Desktop SHA-256 is `3C883539321FFD569B8A0A2DD6A7D71DE92415FDF7615CF1E552C624F2A5C5CD`.

The current practical boundary remains a fast UE5 plate reconstruction plus video encoding, not a proven editable 3D Blender semantic transfer with equivalent shading. Preserve this working baseline and the ~8.5-second UE5 frame render evidence while pursuing future color/texture fidelity work one representative frame at a time. Full details: `reports/evidence/CWS_UE5_FAST_BASELINE_AND_COLOR_PROBE_2026-08-21.md`.

The current representative source is:

`C:\Users\Administrator\Downloads\PhongNguRender6.blend`

The historical intermediate format for the original B4 test was:

`GLB / glTF Binary`

Reason it was initially tested:

- carries scene geometry;
- materials/textures to the extent supported by glTF;
- cameras;
- animation;
- one compact binary artifact;
- UE5 Interchange supports glTF scene import.

Do not assume visual parity with Blender merely because GLB import succeeds. Blender shading, World lighting, Area lights, Cycles-specific nodes, procedural data, modifiers, constraints and other Blender semantics may not transfer 1:1.

## 2. Current test machine and paths

Host:

`MAY083`

Hardware observed during this work:

- Windows 10 Pro 22H2
- Intel Core i3-12100F
- NVIDIA RTX 2060 SUPER 8 GB
- about 16 GB system RAM

Blender:

`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`

Unreal Engine:

`C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe`

UE sandbox project that previously rendered successfully:

`C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\CWS_UE_LIGHT_TEST.uproject`

A manually created/tested UE project involved in the later World Partition crash:

`C:\Users\Administrator\Downloads\P6\P6.uproject`

Portable FFmpeg already exists under:

`C:\Users\Administrator\Downloads\CWS_UE_TOOLS\ffmpeg\extracted\ffmpeg-9.0.1-essentials_build\bin\`

UE job workspace pattern:

`C:\Users\Administrator\Downloads\CWS_UE_JOBS\JOB_<timestamp>\`

Founder prefers PowerShell automation and headless UE operation instead of repetitive manual UI work.

## 3. Verified pipeline evidence

### 3.1 UE command-line + MRQ control scene works

A native UE control scene was created and rendered with:

- native UE StaticMeshActor cube;
- CineCameraActor;
- light;
- fresh LevelSequence;
- Movie Render Queue;
- PNG output.

Result:

`CWS_CONTROL_PREP_DONE=True`
`CWS_CONTROL_PNG_COUNT=1`
`CWS_CONTROL_RENDER_DONE`

The Founder visually opened:

`C:\Users\Administrator\Desktop\CWS_CONTROL_CUBE.png`

and the cube was visible.

This proves on MAY083:

`UnrealEditor-Cmd + MRQ + native UE geometry + camera + light + PNG`

can produce a visible output.

Therefore, when imported customer content renders black, do NOT immediately blame MRQ, UnrealEditor-Cmd, GPU, or PNG output. The failure can be upstream in imported content, camera state, material/light transfer, LevelSequence or scene conversion.

### 3.2 Customer-map A/B control also rendered

A later A/B diagnostic cloned the customer-derived UE map and placed the already proven native UE cube + light in front of the customer camera.

The fresh one-frame sequence rendered successfully.

This further narrowed black customer output toward imported Blender/Interchange content rather than the base UE render stack.

### 3.3 Camera binding was eventually verified correctly

Early camera-binding diagnosis was wrong because:

`str(unreal.Guid)`

does NOT print the useful GUID value. It prints a struct representation.

Correct approach:

`Guid.to_string()`

After fixing this, the CineCamera binding GUID and Camera Cut binding GUID matched.

Evidence classification:

`CAMERA BINDING VERIFIED`

Lesson:

Never diagnose a UE GUID mismatch using Python `str(Guid)`.

### 3.4 MRQ render pass was verified

A diagnostic confirmed:

- Deferred rendering pass enabled;
- PNG output enabled;
- output setting enabled.

Classification:

`CWS_MRQ_RENDER_PASS_DIAG_PASS=True`

Therefore black output was not explained by accidentally having no MRQ image pass.

### 3.5 Anti-aliasing was not the proven black-output cause

A diagnostic showed:

- AA override was false;
- project/default path used TSR;
- it was not the known FXAA + PNG configuration suspected earlier.

Classification:

`CWS_AA_DIAG_PASS=True`

Lesson:

Do not keep changing AA after this evidence unless new runtime evidence points back to it.

## 4. PhongNguRender6 A-to-Z P1 evidence

P1 script:

`CWS_UE_RENDER_PHONGNGU6_A_TO_Z_P1.ps1`

Its design:

1. discover exactly one `PhongNguRender6*.blend`;
2. open Blender headless with `--disable-autoexec`;
3. never overwrite/save customer original;
4. export `scene.glb`;
5. write Blender scene manifest;
6. find existing FFmpeg;
7. UE5 Interchange import into a fresh level;
8. validate mesh references;
9. validate/fix camera cut binding;
10. create fresh MRQ config;
11. render full sequence to PNG;
12. validate PNG count;
13. FFmpeg assemble PNG frames to MP4;
14. retain PNGs.

Observed P1 runtime on Render6:

`CWS_FIRST_PNG_SECONDS=20.325`
`CWS_PNG_VALIDATION_PASS=True`
`CWS_RENDERED_FRAMES=60`
`CWS_EXPECTED_FRAMES=60`
`CWS_FRAME_COUNT_MATCH=True`
`CWS_FFMPEG_EXIT_CODE=0`
`CWS_VIDEO_VALIDATION_PASS=True`
`CWS_FINAL_CLASSIFICATION=PASS_VIDEO_AND_FRAMES_COMPLETE`
`CWS_A_TO_Z_DONE`

This proves transport/execution/frame-count/encode completion.

It does NOT prove:

- visual parity with Blender;
- correct lighting/materials;
- correct camera direction;
- correct animation semantics;
- customer-acceptable output;
- Golden E2E.

The generated MP4 was only about 6.8 KB in one observed run, which is suspiciously small for 1920x1080 animation and supports checking visual output rather than trusting file existence alone.

## 5. Black-video evidence

A video uploaded into the ChatGPT conversation was programmatically inspected:

- 60 decoded frames;
- 24 fps;
- 1920x1080;
- 2.5 seconds;
- sampled and decoded frame pixels were all zero;
- mean/min/max pixel values were all 0.

Classification:

`FACT: that uploaded MP4 is fully black.`

But it is `UNKNOWN` whether that uploaded MP4 was exactly the same local P1 artifact the Founder was visually discussing at the time.

Important lesson:

`PNG_COUNT_MATCH + FFMPEG_EXIT_0 + MP4_EXISTS != VISUAL_RENDER_PASS`

Future pipeline validation must include visual/non-black checks where appropriate.

## 6. Animation appears reversed

Founder observation for local Render6 result:

The animation/video appeared to run backward compared with the original Blender animation.

Official behavior researched:

- UE Sequencer supports reverse playback.
- Negative play rate reverses a sequence.
- animation sections can expose Reverse / Play Rate behavior.
- FFmpeg concat demuxer reads `file` directives in listed order and does not spontaneously reverse the list.

P1 FFmpeg behavior:

- PNG files are sorted by name ascending;
- `frames.ffconcat` is created from that ascending list;
- P1 does not use FFmpeg `reverse`.

Inference:

If `frames.ffconcat` first/last entries match ascending PNG order, the likely reverse is already present in UE-rendered temporal content or imported LevelSequence semantics, not created by FFmpeg.

Do NOT blindly apply an FFmpeg reverse filter to hide an upstream timeline bug.

### Current P2 workaround

P2 script:

`CWS_UE_RENDER_PHONGNGU6_A_TO_Z_P2.ps1`

P2 currently defaults:

`ReverseImportedAnimation = True`

and mirrors scriptable LevelSequence key times around the observed key range.

This is a controlled workaround driven by the Founder's observed reverse output.

Classification:

- `FACT`: P2 contains the workaround.
- `UNKNOWN`: whether UE Interchange is the true root cause of reversal.
- `P2 RUNTIME EXECUTION PASS`: P2 completed on MAY083 in job `JOB_20260819_214145`.
- `P2 VISUAL FAIL`: all 60 retained UE PNGs are exactly black; decoded MP4 representative frames are also exactly black.
- `P2 TEMPORAL DIRECTION UNKNOWN`: black frames do not establish Blender-to-UE temporal direction.

If P2 visually fixes direction, record that as experimental evidence, not proof of the root cause.

## 7. Frame-count bug and FFmpeg lesson

Earlier experiments produced extra encoded frames:

- one run produced 43 frames when 42 were expected;
- another earlier run produced 53 vs 42.

One cause was logic that repeated/appended the final PNG during FFmpeg assembly.

P1 removed duplicate-last behavior.

P1 later achieved:

`60 rendered == 60 expected`

Lesson:

Do not append/repeat the last frame unless the requested duration contract explicitly requires it.

FFmpeg must assemble the validated sequence exactly once in deterministic order.

## 8. Major Unreal Python/API mistakes that must NOT be repeated

### 8.1 Wrong current-level API

Wrong:

`world.get_current_level()`

This API does not exist for this use in UE 5.8 Python.

Use:

`unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).get_current_level()`

### 8.2 Wrong Interchange synchronous API assumption

Wrong:

`ImportAssetParameters.run_synchronous`

This does not exist.

Use the actual UE Interchange manager scene import interface, such as:

`InterchangeManager.import_scene(...)`

with the intended import parameters and level.

Do not invent Python APIs from memory.

### 8.3 Wrong GUID string conversion

Wrong:

`str(Guid)`

Correct:

`Guid.to_string()`

### 8.4 Deprecated bound-object API

`SequencerTools.get_bound_objects`

is deprecated in UE 5.8.

Do not build new diagnostics around deprecated SequencerTools behavior when direct binding APIs are available.

Prefer current LevelSequence binding APIs and verify with actual GUID values.

### 8.5 Wrong light component attribute access

Direct assumptions such as:

`actor.directional_light_component`

or similar failed in UE 5.8 Python.

Use:

`actor.get_component_by_class(unreal.DirectionalLightComponent)`

or:

`actor.get_component_by_class(unreal.PointLightComponent)`

as applicable.

### 8.6 Headless asset spawning trap

`spawn_actor_from_object(cube_asset)`

returned `None` in the headless control test.

Working approach:

1. spawn `unreal.StaticMeshActor`;
2. get its StaticMeshComponent;
3. set the desired StaticMesh asset explicitly.

Lesson:

For deterministic headless tests, prefer explicit actor class + component assignment over convenience spawning helpers that are not proven in command-line editor mode.

## 9. Diagnostics that produced misleading conclusions

### 9.1 False "no renderable actors" conclusion

One diagnostic used bounds-related results that were zero/error-prone and concluded there were no renderable actors.

This was not trustworthy.

Later evidence showed the map contained many actors/components and native control geometry could render in the same environment.

Lesson:

A diagnostic is not truth merely because it prints `PASS/FAIL`.

Validate that the diagnostic itself is using the correct UE API and measuring the intended property.

### 9.2 False static/skeletal asset absence

Another diagnostic reported roughly:

`STATIC_ASSET_PRESENT=0`
`STATIC_ASSET_MISSING=138`
`SKELETAL_ASSET_PRESENT=0`

This was suspected to be caused by incorrect asset accessor usage.

Do not reuse these numbers as current scene truth.

Current fail-closed validation should prefer:

Static mesh:
`component.get_editor_property('static_mesh')`

with an optional proven getter if exposed.

Skeletal mesh:
`component.get_skeletal_mesh_asset()`

with a property fallback only when verified.

## 10. Blender -> glTF transfer limitations

Render5 Blender source evidence included:

- 2 AREA lights;
- 1 POINT light;
- World nodes enabled.

glTF does not preserve all Blender lighting/shading semantics.

Especially important:

- Blender World lighting is not equivalent to a UE world/sky setup.
- Blender Area lights may not transfer with equivalent appearance.
- Cycles materials and procedural nodes may not translate 1:1.

Therefore:

`GLB IMPORT SUCCESS != LIGHTING PARITY`

Current UE preparation may add a clearly marked diagnostic fallback light when no effective light is present.

Any fallback light must be recorded in the manifest/report, because it changes scene semantics.

## 11. World Partition crash in project P6

The Founder manually rendered/imported in project:

`C:\Users\Administrator\Downloads\P6\P6.uproject`

UE5 then showed Crash Reporter.

Crash evidence was collected from:

`C:\Users\Administrator\Downloads\P6\Saved\Crashes\UECC-Windows-49B9803441732B6A1E259E8D0167BEE3_0000`

Confirmed:

- Unreal Engine 5.8.1;
- crash type: Assert;
- project: `UE-P6`;
- minidump exists.

Exact assertion:

`Assertion failed: !EditorBounds.IsValid || OldLevel == HashLevels.Num() - 1`

Source:

`Engine\Source\Runtime\Engine\Private\WorldPartition\WorldPartitionEditorSpatialHash.cpp`

Line:

`83`

This is a World Partition editor spatial hash invariant failure.

### What V4 established

Immediately before crash, UE ran content validation for:

`324 assets (365 associated objects such as actors)`

The WorldPartitionChangelistValidator count was:

`0`

Then roughly 0.05 seconds later the WorldPartitionEditorSpatialHash assertion fired.

V4 did NOT find convincing numeric:

- NaN bounds;
- invalid bounds;
- numeric INF bounds.

The apparent `INF` text matches were false positives caused by asset names such as `FullGrain`.

Therefore:

- `FACT`: crash boundary is WorldPartitionEditorSpatialHash.
- `UNKNOWN`: which actor, if any, caused the invalid hash state.
- `NOT PROVEN`: GPU OOM.
- `NOT PROVEN`: a specific imported mesh has NaN/INF bounds.
- `NOT PROVEN`: FFmpeg or MRQ caused the assert.

### Current architecture decision for this experiment

For a small bedroom/archviz render experiment, do not keep fighting P6 World Partition without evidence that World Partition is required.

Use a fresh non-partitioned level:

`LevelEditorSubsystem.new_level(map_path, False)`

This matches the earlier successful headless pipeline and avoids unnecessary large-world spatial hashing for a small room scene.

This is an experimental UE render-path decision. It does not change canonical CWS Worker architecture.

## 12. Crash-collector lessons

Crash collector V1 only checked the CWS UE sandbox project and missed the actual P6 crash.

V2 added common `%LOCALAPPDATA%` locations but still did not initially discover the true project-specific P6 path.

CrashReportClient log finally exposed:

`C:\Users\Administrator\Downloads\P6\Saved\Crashes\...`

V3 targeted P6 directly and obtained:

- `CrashContext.runtime-xml`;
- `P6.log`;
- `UEMinidump.dmp`.

Lesson:

When Crash Reporter launches, read CrashReportClient's own log and use the path it reports. Do not assume the crashed project is the project you were debugging earlier.

## 13. PowerShell and remote-control reliability lessons

The Founder often operates MAY083 through remote desktop from a phone.

Do NOT send enormous fragile one-line PowerShell commands.

Prefer:

1. create a `.ps1`;
2. put it on Desktop;
3. give one short execution line.

Example:

`powershell -ExecutionPolicy Bypass -File "C:\Users\Administrator\Desktop\<SCRIPT>.ps1"`

Prompts and commands should be ASCII-oriented and transport-safe.

Do not confuse clipboard corruption with malware or system behavior without evidence.

## 14. Source-file immutability

Customer Blender original must remain immutable.

Headless Blender preparation uses:

`--background --disable-autoexec`

and exports to a job-scoped working artifact.

Do NOT call Blender save/save-as on the customer original during diagnostic conversion.

Safe model:

`customer original -> read-only/open -> export working GLB -> UE experiment`

not:

`customer original -> mutate/save -> test`

## 15. Current P2 design

Current continuation artifact:

`CWS_UE_RENDER_PHONGNGU6_A_TO_Z_P2.ps1`

Key P2 changes:

1. still discovers `PhongNguRender6*.blend`;
2. Blender headless export to job-scoped `scene.glb`;
3. copies a human-visible copy to:
   `C:\Users\Administrator\Downloads\PhongNguRender6_UE.glb`
4. uses UE sandbox project:
   `CWS_UE_LIGHT_TEST.uproject`
5. creates a fresh level with:
   `new_level(map_path, False)`
6. checks World Partition when the exposed API permits it;
7. imports with Interchange;
8. fail-closed validates renderable mesh references;
9. selects/repairs camera binding;
10. applies current experimental LevelSequence key-time reversal when:
    `ReverseImportedAnimation=True`
11. creates fresh MRQ config;
12. renders full PNG sequence;
13. validates frame count/non-zero files;
14. FFmpeg assembles validated PNGs in ascending order;
15. retains PNGs;
16. copies final MP4 to Desktop;
17. writes a P2 report.

Expected visible artifacts include:

`C:\Users\Administrator\Downloads\PhongNguRender6_UE.glb`

`C:\Users\Administrator\Desktop\CWS_PHONGNGU6_FIRST_FRAME.png`

`C:\Users\Administrator\Desktop\CWS_PHONGNGU6_P2.mp4`

Runtime evidence now exists for job `JOB_20260819_214145`:

- `P2 RUNTIME EXECUTION PASS`: first PNG 13.268 s, 60/60 PNGs, FFmpeg exit 0, video validation completed.
- `P2 VISUAL FAIL`: `CWS_000432.png`, `CWS_000461.png`, and `CWS_000491.png` are 1920x1080 with mean RGB/luminance 0, min 0, max 0, non-zero ratio 0, completely black.
- `P2 TEMPORAL DIRECTION UNKNOWN`: the UE PNGs contain no visual signal for start/end comparison.
- Render-time UE logs contain 296 dependent-package `LoadErrors` (148 unique dependencies: 134 static-mesh and 14 skeletal-mesh paths), despite the earlier preparation-time reference counts passing.

Load-only map-reload diagnostic on MAY083 then reproduced the persistence boundary without import or render:

- Saved map: `/Game/CWS_AUTO/JOB_20260819_214145/Scene`
- UE project: `C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\CWS_UE_LIGHT_TEST.uproject`
- Diagnostic script: `C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\Saved\CWS_P2_LOAD_ONLY_DIAGNOSTIC.py`
- Diagnostic report: `C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\Saved\CWS_P2_LOAD_ONLY_DIAGNOSTIC.json`
- UE load log: `C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\Saved\Logs\CWS_UE_LIGHT_TEST.log`
- Reload enumerated 228 actors, 139 StaticMeshComponents and 14 SkeletalMeshComponents.
- After reload: Static references present/missing `0/139`; Skeletal references present/missing `0/14`.
- Because every component reference was missing, component-level `asset_loadable` and `asset_unloadable` were both `0`; direct package-load evidence is the authoritative failure classification here.
- Direct UE log parsing: `296` LoadErrors, `148` unique failed packages: `134` `/StaticMeshes/` and `14` `/SkeletalMeshes/`.
- All 148 failed packages are under `/Game/CWS_AUTO/JOB_20260819_214145/Imported/scene/` and had no corresponding `.uasset`/`.umap` or directory under `C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\Content`.
- UE's `FPackageName` explanation states that the mount point is valid but each package does not exist on disk or in iostore.

Classification:

- `FACT`: the saved map reload reproduces missing mesh references and direct missing-package LoadErrors.
- `INFERENCE`: the 134 static and 14 skeletal dependency failures materially correspond to the imported GLB mesh package set; the five-component static-count difference is consistent with repeated component references, but an exact component-to-package mapping is unavailable after references become null.
- `HYPOTHESIS SUPPORTED`: the saved P2 map does not preserve or resolve imported mesh dependencies across a fresh UE process/map reload.
- `UNKNOWN`: whether the first cause is an unsaved import package, cleanup/deletion, package staging, or another pre-reload persistence step. The first proven failing boundary is package availability during map reload, not camera, animation, FFmpeg, or MRQ.

Evidence report:

`C:\Users\Administrator\Downloads\CWS_UE_JOBS\JOB_20260819_214145\CWS_UE_PHONGNGU6_REPORT_P2.json`

Do not report this as visual success or Golden Production E2E.

## 16. Next smallest safe action

Do not rerun P2 before diagnosing the completed job. First verify the existing artifacts in this order:

1. GLB/report and preparation evidence.
2. render-time UE load errors after map reload.
3. FIRST/MIDDLE/LAST PNG pixel values.
4. MP4 decoded representative pixel values.
5. `frames.ffconcat` order.
6. only then classify direction/black-output result.

If failure occurs:

- save exact PowerShell output;
- save generated report/log;
- read runtime evidence first;
- do not stack speculative patches.

## 17. If a completed P2 job renders black

Do not immediately change lighting, AA, FFmpeg and camera at the same time.

Use one-variable falsification.

Preferred next test:

1. Blender headless renders or captures source reference at frame_start and frame_end.
2. UE P2 keeps first and last PNG.
3. Compare source start/end camera composition with UE first/last.
4. Determine separately:
   - geometry visible?
   - camera points at scene?
   - lighting visible?
   - temporal direction correct?

If UE first/last are both black while native UE control cube remains visible:

Focus on imported GLB scene content, transforms, materials/lights and camera relationship.

If UE first corresponds to Blender end and UE last corresponds to Blender start:

Focus on LevelSequence/imported animation temporal mapping.

If UE first/last order is correct but MP4 appears reversed:

Inspect `frames.ffconcat` and FFmpeg input order before touching UE.

## 18. If P2 crashes

First classify the project and crash path.

Do not assume another World Partition crash.

Collect:

- exact project path;
- `Saved\Logs`;
- `Saved\Crashes`;
- CrashReportClient log;
- `CrashContext.runtime-xml`;
- minidump path;
- assertion/fatal error;
- 100-300 lines before crash.

If the same `WorldPartitionEditorSpatialHash.cpp:83` assertion appears despite `new_level(..., False)`, the non-partition assumption has failed and must be verified from runtime instead of trusted from code.

## 19. What NOT to do

Do not:

- claim syntax PASS means UE runtime PASS;
- claim MP4 existence means visual render PASS;
- claim frame-count match means customer-quality PASS;
- use `str(Guid)` for camera-binding diagnosis;
- reuse deprecated Sequencer bound-object APIs without need;
- invent UE Python methods from memory;
- treat a diagnostic script as authoritative when its API assumptions are unverified;
- reverse the final MP4 in FFmpeg merely to hide a suspected upstream timeline issue;
- keep World Partition for a small room just because a template created it;
- overwrite the customer `.blend`;
- change multiple variables during one diagnostic test;
- silently replace CWS canonical Track A Blender/Cycles with this UE5 experiment.

## 20. Durable engineering method learned from this session

The most useful technique in this entire UE5 investigation was a control scene.

When customer output was black, instead of continuing to tweak customer assets indefinitely:

`same UE binary + same command-line mode + same MRQ + native cube + known camera + known light`

produced a visible PNG.

That single control test cut the problem space sharply.

Use this general pattern:

`SYSTEM CONTROL -> COMPONENT A/B -> CUSTOMER INPUT`

not:

`CUSTOMER INPUT -> RANDOM PATCH -> RANDOM PATCH -> RANDOM PATCH`

When three similar attempts fail:

`STOP -> RE-GROUND -> WIDEN SEARCH -> RECLASSIFY -> PIVOT`

## 21. External references used during this investigation

Official Epic:

- Crash Reporting:
  `https://dev.epicgames.com/documentation/unreal-engine/crash-reporting-in-unreal-engine`
- World Partition:
  `https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine`
- UWorldPartitionEditorSpatialHash:
  `https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UWorldPartitionEditorSpatialHash`
- LevelEditorSubsystem NewLevel:
  `https://dev.epicgames.com/documentation/unreal-engine/API/Editor/LevelEditor/ULevelEditorSubsystem/NewLevel`
- Interchange import:
  `https://dev.epicgames.com/documentation/unreal-engine/importing-assets-using-interchange-in-unreal-engine`
- glTF import:
  `https://dev.epicgames.com/documentation/unreal-engine/importing-gltf-files-into-unreal-engine`
- Sequencer Set Play Rate:
  `https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Sequencer/Player/SetPlayRate`
- Cinematic Animation Track:
  `https://dev.epicgames.com/documentation/unreal-engine/cinematic-animation-track-in-unreal-engine`

Official Blender / Khronos:

- Blender glTF 2.0 exporter documentation:
  `https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html`
- glTF-Blender-IO:
  `https://github.com/KhronosGroup/glTF-Blender-IO`
- animation/export issue #2610:
  `https://github.com/KhronosGroup/glTF-Blender-IO/issues/2610`
- animation/NLA issue #2519:
  `https://github.com/KhronosGroup/glTF-Blender-IO/issues/2519`
- historical camera path issue #1666:
  `https://github.com/KhronosGroup/glTF-Blender-IO/issues/1666`

FFmpeg:

- FFmpeg documentation / concat demuxer:
  `https://ffmpeg.org/ffmpeg-all.html`

Community evidence is supporting evidence only. It does not override runtime evidence or official version-specific behavior.

## 22. NEW CHAT BOOTSTRAP PROMPT

Copy the block below into a new ChatGPT/Codex chat.

```text
You are continuing my CWS project and the current UE5 render experiment.

CANONICAL REPOSITORY
trankhanhduy1508-maker/cws-portal

PHASE 1 - GROUND

Before making any technical claim or modifying anything:

1. Ground the current canonical GitHub repository.
2. Read CWS_SESSION_BOOTSTRAP.md completely and follow it.
3. Read CWS_KNOWLEDGE_ROUTER.yaml.
4. Read CURRENT_STATUS.md.
5. Classify this task under Worker/rendering.
6. Read CWS_WORKER_TRACKS.md and DECISIONS.md.
7. Read FOUNDER_RULES.md, especially the rule:
   RUNTIME EVIDENCE -> OFFICIAL DOCS -> RELEVANT COMMUNITY CASES -> COMPARE -> FALSIFIABLE HYPOTHESIS -> MINIMAL TEST -> FIX -> VERIFY
8. Read:
   knowledge/render/ue5/CWS_UE5_RENDER_KNOWLEDGE_V1.md
9. GitHub + current runtime evidence are source of truth. This prompt is handoff context only.
10. Report current state before the first mutation.

IMPORTANT ARCHITECTURE BOUNDARY

Current canonical CWS Track A render core remains:
cws_worker.bat -> cws_worker_full.py -> Blender/Cycles -> validated output -> B2

UE5 is currently an experimental alternate/acceleration render path.
Do not silently replace Track A with UE5.
UE5 experimental success is not Golden Production E2E.

CURRENT UE5 GOAL

Reroute research around the actual outcome:

`customer Blender file -> automatic conversion/translation -> UE5 render -> visual quality equivalent to or better than the original Blender render`

The acceptance unit is a representative rendered frame/shot compared with the Blender source. Import success, actor count, PNG count, FFmpeg exit code, or a non-black image cannot promote a route.

The current candidate architecture is the CWS UE Fidelity Gateway:

1. Analyze/classify the Blender scene and create an immutable transfer manifest.
2. Try a fidelity-gated native route: FBX for ordinary static/skeletal data, Alembic Geometry Cache for acceptable evaluated vertex animation, explicit camera/shot/material-map metadata, and a fresh non-World-Partition UE level.
3. Try a bounded baked-scene route only when evaluated geometry/material baking completes within budget.
4. Otherwise use a visual-lock UE5 plate route: Blender/Cycles beauty frames -> image-sequence/EXR-or-PNG bundle -> UE5 unlit MediaTexture/plate -> MRQ. This preserves final-image intent but does not accelerate the Blender render or create editable 3D geometry.
5. Fail closed to Blender/Cycles when the representative-frame gate fails.

GLB/glTF is now an optional narrow route, not the default fidelity contract. USD is optional/experimental for level reconstruction. Do not repeat interchange-format or renderer swaps for the B4 scene without a materially different pre-baked implementation and bounded cost.

CURRENT MACHINE

Host:
MAY083

Blender:
C:\Program Files\Blender Foundation\Blender 5.2\blender.exe

UnrealEditor-Cmd:
C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe

UE sandbox project:
C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\CWS_UE_LIGHT_TEST.uproject

Source:
C:\Users\Administrator\Downloads\PhongNguRender6.blend

FFmpeg exists under:
C:\Users\Administrator\Downloads\CWS_UE_TOOLS\ffmpeg\extracted\ffmpeg-9.0.1-essentials_build\bin\

CURRENT CONTINUATION ARTIFACT

CWS_UE_RENDER_PHONGNGU6_A_TO_Z_P2.ps1

P2 intent:

- immutable Blender source
- --background --disable-autoexec
- export GLB
- copy visible GLB to:
  C:\Users\Administrator\Downloads\PhongNguRender6_UE.glb
- use non-partition level:
  new_level(map_path, False)
- Interchange scene import
- fail-closed mesh reference validation
- correct Guid.to_string() binding checks
- fresh camera cut
- current experimental key-time reversal because Founder observed P1 animation running backward
- fresh MRQ
- exact PNG-count validation
- FFmpeg concat in ascending PNG order
- retain PNGs
- final MP4

P2 static/embedded Python checks passed.
P2 runtime execution completed on MAY083 in job `JOB_20260819_214145`, but visual output failed: all retained PNGs and decoded MP4 samples are exactly black. Temporal direction remains unknown.

KNOWN VERIFIED LESSONS

- Native UE cube + camera + light + MRQ rendered a visible PNG on MAY083.
- Same customer-derived environment with a native control cube also rendered.
- Therefore UnrealEditor-Cmd/MRQ base stack works.
- str(unreal.Guid) is misleading. Use Guid.to_string().
- world.get_current_level() was wrong. Use LevelEditorSubsystem.get_current_level().
- ImportAssetParameters.run_synchronous does not exist.
- SequencerTools.get_bound_objects is deprecated in UE 5.8.
- Use actor.get_component_by_class(...) for light components.
- spawn_actor_from_object(static_mesh_asset) returned None headlessly. Spawn StaticMeshActor and set its mesh component explicitly.
- Previous static/skeletal asset absence diagnostics were unreliable because of wrong accessors.
- MRQ Deferred + PNG passes were verified.
- AA was not proven to be the black-output cause.
- GLB does not guarantee Blender lighting/material parity.
- FFmpeg concat does not intentionally reverse the sequence in P1.
- P1 achieved 60/60 PNG frames and FFmpeg exit 0, but file existence does not prove visual correctness.
- A video uploaded to the old chat was fully black, but it is unknown whether it was exactly the same local P1 artifact.
- Founder visually reported local P1 animation appeared reversed.
- Do not hide upstream reversal by blindly reversing final MP4 in FFmpeg.

WORLD PARTITION CRASH LESSON

Manual project:
C:\Users\Administrator\Downloads\P6\P6.uproject

Confirmed UE 5.8.1 assert:

Assertion failed:
!EditorBounds.IsValid || OldLevel == HashLevels.Num() - 1

File:
WorldPartitionEditorSpatialHash.cpp
Line 83

Crash evidence was in:
C:\Users\Administrator\Downloads\P6\Saved\Crashes\UECC-Windows-49B9803441732B6A1E259E8D0167BEE3_0000

V4 showed UE validated 324 assets / 365 associated objects, WorldPartitionChangelistValidator reported 0, then the spatial-hash assertion fired shortly after.
No convincing NaN/invalid numeric bounds were found.
The apparent INF matches were false positives from names such as FullGrain.

For the bedroom experiment, use a fresh non-World-Partition level instead of trying to repair P6 World Partition unless new evidence proves World Partition is required.

## VERIFIED CWS B4 EVIDENCE — 2026-08-21

Source and host:

- `PhongNguRender6.blend` was kept immutable and read with Blender 5.2.0 background `--disable-autoexec`; SHA-256 was `5C20076506CC787BBE2C26360B02111AAB31767B0545BA1185FA76E66D3DB70C`.
- MAY083 provisioning evidence confirms an RTX 2060 SUPER 8 GB and a working Blender 5.2.0 installation, but P1 remains partial because production B2 credentials were absent. Provisioning status is not a visual-render pass.

DDC:

- UE 5.8.1 fails when the `Installed` DDC graph has no writable node. `-DDC-ForceMemoryCache` is verified to bypass startup and permit a bounded commandlet/MRQ run. It does not repair the Installed graph and must remain documented as a workaround.

Transfer evidence:

- Blender source truth at frame 450: Cycles, AgX/None/0/1, dark constant World, active `ZNT_Camera`, a rigged character, and warm/white/blue light metadata.
- USD + MaterialX imported into a fresh non-World-Partition UE level but emitted armature and MaterialX diagnostics. Three materially similar observations remained poor after bounded camera convention checks: wall-only, visible-but-misframed, and broken character/material output.
- Deferred and Path Tracer each produced one PNG and both were far from the Blender reference. Path Tracer was not close, so the problem is not only a Deferred realtime-renderer gap.
- A repeatable evaluated-static hybrid exporter (FBX plus JSON metadata) was attempted without saving the source. It ran over eight minutes without producing an artifact and was stopped at its exact diagnostic process. This is evidence of impractical conversion cost for the current scene, not a claim that every possible exporter is impossible.

Classification:

- FACT: source hash, Blender scene metadata, DDC fatal/workaround, UE version, fresh non-World-Partition level, two renderer PNGs, import diagnostics, and no full-sequence render are recorded in `reports/evidence/CWS_UE5_RENDER_B4_PHONGNGU6_2026-08-21.md`.
- INFERENCE: USD/MaterialX does not preserve this scene's rigged character and shader semantics sufficiently on the tested UE 5.8.1 stack; renderer switching cannot correct the observed geometry/material loss.
- HYPOTHESIS: a fully baked evaluated geometry/PBR/metadata bundle might work, but the first bounded evaluated export did not show practical completion cost.
- UNKNOWN: exact V25 pixel baseline, whether a separately engineered bake/export tool would be fast enough, and whether OCIO AgX matching would improve any residual color difference after geometry/material transfer.

Decision: the B4 representative-frame gate was not met. Do not full-render this UE conversion. For this scene and current hardware/toolchain, preserve Blender/Cycles as the fidelity authority unless a new, materially different and pre-baked transfer implementation is supplied.

## VERIFIED FIDELITY REROUTE — 2026-08-21

The durable decision and external source links are recorded in:

`reports/evidence/CWS_UE5_RENDER_REROUTE_2026-08-21.md`

Controlled plate evidence:

- `B4_Plate_Frame450_v3` imported the Blender reference image, created a non-World-Partition map and LevelSequence, and produced a visible UE5 `640x360` PNG at `.cws_tmp/B4_JOB/RenderPlateV3/B4_Plate_Frame450_Sequence_v3.0000.png` with the same composition and subject.
- Source mean RGB `(80.17, 56.73, 57.20)` versus UE output `(159.58, 122.50, 124.75)`; sampled RGB MAE `71.04`, RMSE `77.91`. Treat this as plate-stage proof, not visual parity.
- A color-handling probe created the `sRGB=False` texture/material/map successfully. Its headless NewProcess MRQ run reported `QUEUE_STARTED` but produced no output directory, so that executor path is not yet a validated automation contract.

Current boundary:

- A generic editable 3D Blender/Cycles-to-UE5 conversion with equivalent visual quality is not demonstrated and is not a practical default for arbitrary scenes on this host/toolchain.
- The limiting boundary is semantic transfer and bake cost (rigs, evaluated geometry, Blender shader graphs, and color management), not the UE5 renderer or FFmpeg.
- Native/baked UE5 acceleration is allowed only for scenes that pass representative-frame comparison. A visual-lock plate can preserve the final image, but the source Blender render remains the quality authority and the route does not claim 3D conversion.

Do not change canonical Track A Blender/Cycles architecture as part of this research.

SUPERSEDED HISTORICAL NEXT ACTION

First inspect current GitHub state and the UE5 knowledge file.

Then, if no newer runtime evidence supersedes this handoff, inspect the completed P2 artifacts before any rerun:

Do not rerun Blender or UE5 before classifying the existing job. Classify the exact evidence already collected:

FACT
INFERENCE
HYPOTHESIS
UNKNOWN

Check:

1. GLB created.
2. Non-partition intent/verification.
3. Interchange validation.
4. camera binding.
5. reversed key/channel count.
6. PNG count.
7. first PNG visually.
8. last PNG visually.
9. final MP4 visually.
10. exact logs/report.

Do not say runtime PASS based only on code syntax/static checks.

If something fails, do not guess. Read runtime evidence, research official UE5.8/Blender docs and relevant community cases, form one falsifiable hypothesis, run one minimal test, then fix.

When reporting back to me, use Vietnamese and keep the next PowerShell action short and directly executable.
```

