# UE5 PhongNguRender6 A-to-Z Design

Status: EXPERIMENTAL / FOUNDER-CONTROLLED TRACK A RENDER POC
Date: 2026-08-19

## Goal

Build one PowerShell-driven, headless proof pipeline for a real Blender scene matching `C:\Users\Administrator\Downloads\PhongNguRender6*.blend`:

`customer .blend -> Blender 5.2 headless export -> GLB + metadata -> Unreal Engine 5.8 Interchange import -> validate imported scene -> LevelSequence + Camera Cut -> MRQ -> complete PNG sequence`

No FFmpeg/video assembly is part of this experiment. Frame PNGs are the requested durable output for this step.

## Current evidence boundary

Runtime evidence from the controlled Windows host has already shown that:

- `UnrealEditor-Cmd.exe` launches headlessly;
- a native UE control level with `StaticMeshActor + CineCameraActor + lights` renders a real PNG through MRQ;
- therefore the current unknown is primarily the Blender-to-Unreal scene conversion/import boundary, not FFmpeg or basic MRQ viability.

This POC must not be reported as canonical Golden E2E.

## Input and immutability

- Search only under `C:\Users\Administrator\Downloads` for `PhongNguRender6*.blend` unless an explicit `-BlendPath` is supplied.
- If zero matches exist, fail.
- If more than one match exists, fail and print the candidate paths instead of guessing.
- Never overwrite, save, modify, rename, move, or delete the customer `.blend`.
- Open the `.blend` with Blender `--background --disable-autoexec`.
- All generated files live in a new job-scoped directory under `Downloads\CWS_UE_JOBS\JOB_<timestamp>`.

## Toolchain

Required executables:

- Blender 5.2: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`
- Unreal Engine 5.8 command line: `C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe`
- Existing UE project: `C:\Users\Administrator\Downloads\CWS_UE_LIGHT_TEST\CWS_UE_LIGHT_TEST.uproject`

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
- render width/height and percentage;
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

If Blender export fails or the GLB is absent/zero bytes, stop before Unreal starts.

## Stage 2: Fresh Unreal job namespace

Each run receives a unique namespace:

- map: `/Game/CWS_AUTO/<JOB>/Scene`
- imported assets: `/Game/CWS_AUTO/<JOB>/Imported`
- MRQ config: `/Game/CWS_AUTO/<JOB>/MRQ_Default`

Do not reuse an old job's assets and do not mutate existing customer/import experiments.

## Stage 3: Interchange scene import

Use the UE 5.8 Interchange scene-import API in a newly created level and pass the current level through `ImportAssetParameters.import_level`.

The intended operation is equivalent to UE's `Import Into Level` scene flow, so imported assets and actor transforms are both required.

The script must not proceed merely because `import_scene()` returns true.

## Stage 4: Fail-closed imported-scene validation

Immediately after import and level save, verify real asset references using runtime-supported accessors.

Required checks:

1. `CineCameraActor` count >= 1.
2. `StaticMeshActor` and/or `SkeletalMeshActor` count > 0.
3. For each `StaticMeshActor`, resolve its `StaticMeshComponent` and read its actual `StaticMesh` reference through a supported runtime/property accessor.
4. For each `SkeletalMeshActor`, resolve its `SkeletalMeshComponent` and read the actual skeletal mesh asset reference.
5. Require at least one non-null mesh asset reference overall.
6. Require at least one render-visible mesh component in the main pass.
7. Record missing-reference counts rather than swallowing exceptions.
8. Enumerate imported LevelSequence assets under the job import path.
9. If the source Blender frame count > 1, require a non-empty imported LevelSequence. Do not fabricate a static animation and call it success.

If mesh actors exist but all mesh references are null, classify the boundary as `INTERCHANGE_SCENE_IMPORT_INVALID` and stop before MRQ.

## Stage 5: Camera Cut validation/repair

Use the longest imported LevelSequence when animation exists.

Camera Cut rules:

- prefer the unique binding whose possessed object class is `CineCameraActor`;
- compare GUID values using `Guid.to_string()`, never `str(Guid)`;
- ensure exactly one active Camera Cut section for the selected render range;
- bind that section to the intended CineCamera binding using `MovieSceneObjectBindingID`;
- verify the saved Camera Cut GUID exists in the sequence with `find_binding_by_id()`;
- fail if the final Camera Cut GUID cannot be proven to match the camera binding GUID.

For a genuinely single-frame/static source with no imported animation sequence, create a minimal one-frame LevelSequence bound to the imported CineCameraActor instead of pretending an animation exists.

## Stage 6: Lighting boundary

The pipeline must distinguish source lighting from glTF transport limitations.

- Point/spot/directional lights that Interchange imports are preserved.
- Blender Area lights and Blender World node lighting are recorded in `blender_scene_manifest.json` because GLB cannot be assumed to reproduce them faithfully.
- V1 does not silently invent complex lighting restoration that cannot be verified.
- If the imported level has zero effective lights, add only a clearly labeled diagnostic fallback light and mark the job report `LIGHTING_FALLBACK_USED=true`.
- If fallback lighting is used, the output is diagnostic evidence, not visual-parity proof.

## Stage 7: MRQ configuration

Create a fresh `MoviePipelinePrimaryConfig` in the job namespace.

Required settings:

- Deferred main pass enabled;
- PNG output enabled;
- output directory is the job `frames` directory;
- width/height derived from Blender source render settings unless explicitly overridden;
- frame-number filenames;
- no FFmpeg/video assembly;
- custom output frame rate equal to Blender source FPS;
- one spatial sample and one temporal sample for this functional POC;
- bounded engine warmup;
- no FXAA override;
- source LevelSequence playback range remains authoritative unless a later verified fix proves a conversion is needed.

## Stage 8: Full headless render

Invoke:

`UnrealEditor-Cmd.exe <uproject> <map> -game -LevelSequence=<sequence> -MoviePipelineConfig=<config> -RenderOffScreen ...`

Monitor:

- first PNG latency;
- total render time;
- peak process RAM;
- optional NVIDIA GPU memory if `nvidia-smi` exists;
- produced PNG count.

A stuck Unreal shutdown may be terminated only after expected output evidence exists and a grace period expires.

## Stage 9: Output validation

Success requires all of the following:

- at least one PNG exists;
- every PNG is non-zero bytes;
- imported scene validation passed before render;
- Camera Cut validation passed;
- render process did not only produce a success marker without files;
- job report records actual rendered frame count versus Blender source frame count.

Frame-count mismatch is not silently treated as PASS. Report it explicitly and preserve frames for diagnosis.

The script copies a representative first PNG to the Desktop for immediate visual inspection.

## Job report

Write `CWS_UE_PHONGNGU6_REPORT.json` containing:

- input path and immutable-input statement;
- tool paths;
- GLB path and byte size;
- Blender metadata;
- Unreal map/import/sequence/config paths;
- actor counts;
- mesh-reference counts;
- camera binding GUID verification result;
- lighting fallback flag;
- expected versus rendered frame count;
- timing/memory observations;
- output directory;
- final classification.

Possible final classifications include:

- `PASS_FRAMES_COMPLETE`
- `PASS_FRAMES_PRESENT_COUNT_MISMATCH`
- `BLENDER_EXPORT_FAILED`
- `INTERCHANGE_IMPORT_FAILED`
- `INTERCHANGE_SCENE_IMPORT_INVALID`
- `CAMERA_BINDING_INVALID`
- `MRQ_NO_OUTPUT`
- `RENDER_TIMEOUT`

## Non-goals

V1 does not:

- integrate UE into canonical `cws_worker_full.py`;
- alter Track A's canonical Blender/Cycles renderer;
- modify the customer original;
- create or require FFmpeg;
- assemble MP4;
- claim visual parity between Blender and UE;
- solve every unsupported Blender shader/light/world feature;
- claim Golden Production E2E.

## Success criterion for this experiment

The experiment succeeds technically when one PowerShell command takes the selected `PhongNguRender6*.blend` through headless Blender export, validated UE import, validated camera sequence, and MRQ rendering to a complete non-empty PNG sequence without modifying the source `.blend`.

Visual inspection remains required before calling the UE path suitable for customer-facing rendering.