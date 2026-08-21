# CWS Blender -> UE5 Fidelity Reroute

Date: 2026-08-21  
Status: evidence-backed experimental direction; Track A unchanged  
Source scene: `PhongNguRender6.blend`  
Source SHA-256: `5C20076506CC787BBE2C26360B02111AAB31767B0545BA1185FA76E66D3DB70C`

## Founder outcome

The research target is not “UE5 accepts an interchange file.” It is:

`customer Blender file -> automatic conversion/translation -> UE5 render -> visual quality equivalent to or better than the original Blender render`

The acceptance unit is therefore a representative rendered frame/shot compared with the Blender source, not import success, actor count, PNG count, or FFmpeg exit code.

This research does not change the canonical Track A path:

`cws_worker.bat -> cws_worker_full.py -> Blender/Cycles -> validated output -> B2`

## Grounded runtime evidence

- UE 5.8.1 commandlet/MRQ base operation is proven by the native control scene and by non-black UE output. The Installed DDC graph on this host has no writable node; `-DDC-ForceMemoryCache` permits bounded experiments but is only a workaround.
- The earlier GLB/P2 run completed transport-level checks and produced 60/60 PNGs plus an FFmpeg exit code of 0, but the retained PNGs and decoded MP4 samples were exactly black. Load-only inspection found imported package failures under the GLB asset paths. This is a persistence/import boundary, not evidence of visual parity.
- The B4 USD + MaterialX import completed into a fresh non-World-Partition level but emitted armature/MaterialX diagnostics. Deferred and Path Tracer frames were both materially unlike the Blender frame; changing the renderer did not repair missing geometry/material semantics.
- A repeatable evaluated-static FBX + JSON exporter attempt ran for more than eight minutes without producing an artifact and was stopped at the diagnostic process. This establishes a practical cost warning for the current scene/toolchain, not a theorem that every exporter is impossible.
- A deterministic UE5 plate stage imported `blender_ref_450.png`, created an unlit material and a non-World-Partition map/LevelSequence, and rendered a visible `640x360` PNG at `RenderPlateV3/B4_Plate_Frame450_Sequence_v3.0000.png`. The character, wall, floor and framing are visibly preserved. Source mean RGB was `(80.17, 56.73, 57.20)`; UE plate mean RGB was `(159.58, 122.50, 124.75)`. Sampled RGB MAE was `71.04`; RMSE was `77.91`. It is a visual-preservation proof of concept, not a parity pass.
- A second probe correctly created a texture with `sRGB=False`, material and map, but its headless `MoviePipelineNewProcessExecutor` parent reported only `QUEUE_STARTED` and produced no output directory. The executor path is therefore not yet a validated automation contract.

Detailed B4 evidence remains in `reports/evidence/CWS_UE5_RENDER_B4_PHONGNGU6_2026-08-21.md`.

## Research result

No tested interchange format is a general Blender/Cycles semantic-preservation format:

- Epic documents FBX as the main geometry/animation path, with static/skeletal/morph support and version/import-option constraints: <https://dev.epicgames.com/documentation/en-us/unreal-engine/fbx-content-pipeline>
- Epic documents Alembic as baked, application-independent geometry; UE consumes static frames or Geometry Cache vertex-varying animation, with topology and feature constraints: <https://dev.epicgames.com/documentation/en-us/unreal-engine/alembic-file-importer-in-unreal-engine>
- Epic’s 5.8 release notes state that USD Interchange is production-ready for asset import but experimental for level import: <https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-8-release-notes>
- Blender’s glTF exporter intentionally maps a supported subset of meshes, Principled-style materials, textures, cameras, lights and animation; arbitrary Blender node semantics are not preserved: <https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html>
- Blender’s USD documentation warns that material conversion can be lossy: <https://docs.blender.org/manual/en/4.3/files/import_export/usd.html>
- Datasmith’s supported-software list does not include Blender as a first-party exporter path: <https://dev.epicgames.com/documentation/unreal-engine/datasmith-supported-software-and-file-types>

Community bridges are useful accelerators for an eligible subset, not parity guarantees:

- Epic’s BlenderTools / Send to Unreal: <https://github.com/EpicGames/BlenderTools>
- Blender For Unreal Engine addon with batch export, cameras, Sequencer and Alembic support: <https://github.com/xavier150/Blender-For-UnrealEngine-Addons>
- Community Blender Datasmith bridge with scene hierarchy, materials, lights/cameras and animation claims: <https://github.com/botero-dev/bl_datasmith>

UE’s Movie Render Queue is a valid output stage, and OCIO v2 is the relevant color-management mechanism, but neither can restore source semantics lost during transfer:

- MRQ: <https://dev.epicgames.com/documentation/en-us/unreal-engine/movie-render-pipeline-in-unreal-engine>
- OCIO in UE: <https://dev.epicgames.com/documentation/en-us/unreal-engine/color-management-with-opencolorio-in-unreal-engine>
- UE texture sRGB behavior: <https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-properties?application_version=4.27>

## Chosen architecture: CWS UE Fidelity Gateway

This is a candidate/shadow pipeline. It must never silently replace Track A.

### 1. Analyze and classify

Blender headless produces an immutable source manifest containing scene hash, frame/shot range, camera, resolution, color/view settings, lights, material/texture features, rig/animation features and estimated transfer risk. The classifier chooses a route before expensive rendering.

### 2. Fidelity-gated native route

For scenes in a proven subset, use a bundle rather than GLB as the contract:

- FBX for ordinary static/skeletal geometry and animation;
- Alembic Geometry Cache for evaluated vertex animation/cloth/hair where the baked cost is acceptable;
- explicit camera/shot metadata and texture/material maps;
- BlenderTools or a similarly maintained bridge only as an implementation accelerator;
- fresh non-World-Partition UE level, then MRQ/Path Tracer only after the representative-frame gate.

glTF/GLB remains an optional narrow interchange route, not the default fidelity contract. USD remains optional and experimental for level reconstruction. Native promotion requires automated comparison against Blender output on representative frames; import success cannot promote it.

### 3. Baked-scene route

For scenes that cannot use native semantics, export evaluated geometry and explicit baked maps/materials plus camera metadata. This route is allowed only if a bounded implementation completes inside the job’s cost budget and passes the same representative-frame gate. The B4 result means this must not be pursued as another open-ended generic exporter experiment.

### 4. Visual-lock route

When the objective is final-image fidelity rather than editable UE geometry, render Blender/Cycles beauty frames with the source’s approved settings, package them as an image-sequence/EXR-or-PNG bundle with a manifest, and render them through a UE5 unlit MediaTexture/plate stage and MRQ. Apply explicit OCIO/color transforms and validate pixels before encoding video. Use individual frames or ImgMedia/MediaPlate semantics; the failed atlas probe is not the default animation contract.

This route preserves artistic intent but does not accelerate the Blender render and does not claim a 3D scene conversion. It is the current generic fallback capable of meeting the visual-quality requirement if the UE color-management gate is solved.

### 5. Fail closed

If native or baked output misses the fidelity gate, CWS keeps the Blender/Cycles result authoritative. It must not spend the full sequence on a visibly invalid UE scene merely because import, MRQ, PNG count or FFmpeg succeeded.

## Acceptance gate

For each candidate route, automatically require:

1. source and transfer manifests agree on frame/shot/camera/resolution;
2. output is non-empty and non-black, with expected frame count and dimensions;
3. representative frames are compared with source using deterministic image metrics (RMSE/SSIM and a color-difference metric where available) plus a human-visible review artifact;
4. no missing imported package, material, skeleton, camera or animation diagnostic remains unexplained;
5. only a passing route may render the full requested sequence or encode the final deliverable.

Thresholds must be calibrated from a small set of approved Blender reference scenes; this report does not invent a universal threshold from one diagnostic frame.

## Boundary / stop rule

For arbitrary Blender/Cycles scenes on the current host/toolchain, a fully automatic, editable UE5 3D translation with Blender-equivalent visual quality is not demonstrated and is presently not a practical default. The limiting boundary is semantic transfer and bake cost—especially rigged characters, Blender shader graphs, evaluated geometry and color management—not UE5’s final renderer or FFmpeg.

The practical product boundary is:

- native/baked UE5 acceleration only for scenes that pass the representative-frame gate;
- visual-lock UE5 output when final-image preservation is acceptable and Blender rendering remains the source step;
- Blender/Cycles authoritative output when neither route passes.

Do not repeat GLB-vs-USD-vs-renderer swaps for this scene without a materially different pre-baked implementation and a bounded completion budget.

