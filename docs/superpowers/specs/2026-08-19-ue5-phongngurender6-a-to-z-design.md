# UE5 PhongNguRender6 A-to-Z Design

Status: EXPERIMENTAL / FOUNDER-CONTROLLED TRACK A RENDER POC
Date: 2026-08-19

## Goal

Build one PowerShell-driven, headless proof pipeline for a real Blender scene matching `C:\Users\Administrator\Downloads\PhongNguRender6*.blend`:

`customer .blend -> Blender 5.2 headless export -> GLB + metadata -> Unreal Engine 5.8 Interchange import -> validate imported scene -> LevelSequence + Camera Cut -> MRQ -> complete PNG sequence -> FFmpeg -> MP4`

PNG frames remain durable evidence and are not discarded after MP4 creation.

## Founder correction: FFmpeg is required for assembled video output

The previous non-goal that excluded FFmpeg/video assembly was wrong for the intended A-to-Z deliverable.

For an animation job whose requested deliverable is a video, finalization is:

`validated PNG frame set -> FFmpeg encode -> validate MP4 -> preserve both frame set and MP4`

FFmpeg is therefore part of P1. It must run only after MRQ has produced a validated non-empty frame set. A failed MP4 encode must never erase or invalidate successfully rendered PNG frames.

## Current evidence boundary

Runtime evidence from the controlled Windows host has already shown that:

- `UnrealEditor-Cmd.exe` launches headlessly;
- a native UE control level with `StaticMeshActor + CineCameraActor + lights` renders a real PNG through MRQ;
- therefore the current unknown is primarily the Blender-to-Unreal scene conversion/import boundary, not basic MRQ viability.

This POC must not be reported as canonical Golden E2E.

## Input and immutability

- Search only under `C:\Users\Administrator\Downloads` for `PhongNguRender6*.blend` unless explicit `-BlendPath` is supplied.
- If zero matches exist, fail.
- If more than one match exists, fail and print candidate paths instead of guessing.
- Never overwrite, save, modify, rename, move, or delete the customer `.blend`.
- Open the `.blend` with Blender `--background --disable-autoexec`.
- All generated files live in a new job-scoped directory under `Downloads\CWS_UE_JOBS\JOB_<timestamp>`.

## Toolchain

Required executables:

- Blender 5.2: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`
- Unreal Engine 5.8 command line: `C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe`
- Existing UE project: `C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\CWS_UE_LIGHT_TEST.uproject`
- FFmpeg: prefer existing `ffmpeg.exe` under `C:\Users\Administrator\Downloads\CWS_UE_TOOLS\ffmpeg`; otherwise use an explicit `-FfmpegExe` or PATH. Do not download a replacement silently in P1.

The script may accept explicit overrides but must verify every executable/project path before work begins.

## Stage 1: Blender inspection and export

Blender runs headlessly and writes:

- `scene.glb`
- `blender_scene_manifest.json`
- Blender stdout/stderr logs

Manifest requirements:

- source blend path;
- Blender scene frame start/end;
- inclusive source frame count;
- FPS and FPS base;
- active render engine;
- source width/height/percentage;
- active camera name, if present;
- camera count;
- object count;
- mesh object count;
- armature count;
- light inventory with name/type/energy/color/transform;
- world/background summary when readable;
- export result;
- GLB byte size.

GLB export requirements:

- GLB container;
- cameras enabled;
- lights enabled where glTF supports them;
- animations enabled;
- scene animation/frame range exported;
- forced sampling/baking enabled for animation reliability;
- materials/textures exported;
- skins and morph animation enabled.

If Blender export fails or GLB is absent/zero bytes, stop before Unreal starts.

## Stage 2: Fresh Unreal job namespace

Each run receives a unique namespace:

- map: `/Game/CWS_AUTO/<JOB>/Scene`
- imported assets: `/Game/CWS_AUTO/<JOB>/Imported`
- MRQ config: `/Game/CWS_AUTO/<JOB>/MRQ_Default`

Do not reuse an old job's assets and do not mutate existing customer/import experiments.

## Stage 3: Interchange scene import

Use UE 5.8 Interchange scene import in a newly created level with current level supplied as `ImportAssetParameters.import_level`.

The intended operation is equivalent to UE `Import Into Level`: imported assets and actor transforms are both required.

The script must not proceed merely because `import_scene()` returns true.

## Stage 4: Fail-closed imported-scene validation

Immediately after import and level save, verify actual runtime asset references.

Required checks:

1. `CineCameraActor` count >= 1.
2. `StaticMeshActor` and/or `SkeletalMeshActor` count > 0.
3. Resolve every `StaticMeshComponent` and read its actual StaticMesh reference through a UE 5.8-supported accessor/property.
4. Resolve every `SkeletalMeshComponent` and read its actual skeletal mesh asset reference.
5. Require at least one non-null mesh asset reference overall.
6. Require at least one visible mesh component included in the main pass.
7. Record missing-reference and accessor-error counts instead of swallowing exceptions.
8. Enumerate imported LevelSequence assets under the job import path.
9. If source Blender frame count > 1, require a non-empty imported LevelSequence. Do not fabricate a static animation and call it success.

If mesh actors exist but all mesh references are null, classify `INTERCHANGE_SCENE_IMPORT_INVALID` and stop before MRQ.

## Stage 5: Camera Cut validation/repair

Use the longest imported LevelSequence when animation exists.

Camera Cut rules:

- prefer the unique binding whose possessed/resolved object is a CineCameraActor;
- compare GUID values with `Guid.to_string()`, never `str(Guid)`;
- ensure an active Camera Cut section covers the render range;
- bind the section to the intended CineCamera binding using `MovieSceneObjectBindingID`;
- verify saved Camera Cut GUID maps to a valid sequence binding;
- fail if final Camera Cut binding cannot be proven valid.

For a genuinely single-frame/static source with no imported animation sequence, create a minimal one-frame LevelSequence bound to the imported CineCameraActor.

## Stage 6: Lighting boundary

- Point/spot/directional lights imported through GLB are preserved when available.
- Blender Area lights and Blender World node lighting are recorded in `blender_scene_manifest.json` because GLB cannot be assumed to reproduce them faithfully.
- P1 does not silently invent complex visual-parity restoration.
- If imported level has zero effective lights, add only a clearly labeled diagnostic fallback light and mark `LIGHTING_FALLBACK_USED=true`.
- Output produced with fallback lighting is diagnostic evidence, not visual-parity proof.

## Stage 7: MRQ configuration

Create a fresh `MoviePipelinePrimaryConfig` in the job namespace.

Required settings:

- Deferred main pass enabled;
- PNG output enabled;
- output directory is job `frames`;
- width/height derived from Blender source render settings unless explicitly overridden;
- frame-number filenames;
- custom output frame rate equal to Blender source FPS;
- one spatial and one temporal sample for the functional POC;
- bounded engine warmup;
- no FXAA override;
- source LevelSequence playback range remains authoritative unless runtime evidence proves a conversion is required.

## Stage 8: Full headless MRQ render

Invoke:

`UnrealEditor-Cmd.exe <uproject> <map> -game -LevelSequence=<sequence> -MoviePipelineConfig=<config> -RenderOffScreen ...`

Monitor:

- first PNG latency;
- total render time;
- peak process RAM;
- optional NVIDIA GPU memory if `nvidia-smi` exists;
- produced PNG count.

A stuck Unreal shutdown may be terminated only after expected output evidence exists and a grace period expires.

## Stage 9: Frame validation

Before FFmpeg:

- require at least one PNG;
- require every PNG to be non-zero bytes;
- record actual versus Blender expected frame count;
- preserve frames even if count mismatches;
- frame-count mismatch must be explicit in report and final classification.

## Stage 10: FFmpeg finalization

When the source has more than one frame, encode the sorted PNG sequence to MP4 using source FPS.

P1 requirements:

- FFmpeg runs only after frame validation;
- H.264/libx264, `yuv420p`, `+faststart` for broad playback compatibility;
- do not intentionally duplicate the final frame;
- use a deterministic concat manifest when frame numbering is not guaranteed contiguous;
- validate FFmpeg exit code;
- require output MP4 exists and has non-zero bytes;
- preserve PNG frames regardless of MP4 success;
- copy MP4 to Desktop for immediate inspection when successful.

For a true one-frame source, MP4 assembly is not required unless explicitly requested.

## Job report

Write `CWS_UE_PHONGNGU6_REPORT.json` containing:

- input path and immutable-input statement;
- tool paths including FFmpeg;
- GLB path and byte size;
- Blender metadata;
- Unreal map/import/sequence/config paths;
- actor counts;
- mesh-reference counts and accessor errors;
- camera binding verification result;
- lighting fallback flag;
- expected versus rendered frame count;
- timing/memory observations;
- frame output directory;
- MP4 output path/bytes and FFmpeg exit code;
- final classification.

Possible final classifications include:

- `PASS_VIDEO_AND_FRAMES_COMPLETE`
- `PASS_VIDEO_FRAMES_COUNT_MISMATCH`
- `PASS_SINGLE_FRAME`
- `BLENDER_EXPORT_FAILED`
- `INTERCHANGE_IMPORT_FAILED`
- `INTERCHANGE_SCENE_IMPORT_INVALID`
- `CAMERA_BINDING_INVALID`
- `MRQ_NO_OUTPUT`
- `RENDER_TIMEOUT`
- `FFMPEG_NOT_FOUND`
- `FFMPEG_ENCODE_FAILED`

## Non-goals

P1 does not:

- integrate UE into canonical `cws_worker_full.py`;
- replace Track A's canonical Blender/Cycles renderer;
- modify the customer original;
- discard rendered PNGs after video creation;
- claim visual parity between Blender and UE;
- solve every unsupported Blender shader/light/world feature;
- claim Golden Production E2E.

## Success criterion

For an animated `PhongNguRender6*.blend`, technical success means one PowerShell command takes the immutable source through headless Blender export, validated UE import, validated camera sequence, MRQ full-frame rendering, frame validation, FFmpeg MP4 assembly, and final artifact validation.

Visual inspection of representative PNGs and the MP4 remains required before calling the UE path suitable for customer-facing rendering.
