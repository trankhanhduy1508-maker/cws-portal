# CWS UE5 B4 / PhongNguRender6 representative-frame evidence

Date: 2026-08-21  
Source frame: 450  
UE: 5.8.1 (`56057345+++UE5+Release-5.8`)  
Blender: 5.2.0

## FACT

- The current local source is `.cws_tmp/PhongNguRender6.blend`, 125,265,271 bytes, SHA-256 `5C20076506CC787BBE2C26360B02111AAB31767B0545BA1185FA76E66D3DB70C`. It was used read-only with Blender background mode and `--disable-autoexec`; no save or overwrite occurred.
- The source scene is Cycles, frame range 432–491, representative frame 450, 1920×1080, active camera `ZNT_Camera`, and Blender color management `AgX`, look `None`, exposure 0, gamma 1. Its world is a dark constant background. The source has a rigged character, 93 materials, 114 images, and three scene lights including warm and blue Area lights.
- MAY083 provisioning evidence is present at `reports/evidence/CWS_PRODUCTION_E2E_V2_2_P1_MAY083_PROVISIONING_2026-08-08.md`: the host has an RTX 2060 SUPER 8 GB, Blender 5.2.0 works, and the CWS worker remains P1 partial because production B2 credentials were not available. This is host/provisioning evidence, not evidence of UE visual fidelity.
- Git baseline before the B4 experiment was branch `codex-light-match-indexes`, HEAD `d6330bdf7ee116cf18598e8a7fc8c92f3f65e303`, `origin/main` `bcbacd7a3433c4997b883b8e0c9afbce1356e743`; no pull, reset, or checkout was performed. Tracked worktree changes were not overwritten; B4 artifacts are under untracked `.cws_tmp/`.
- The UE project used a fresh non-World-Partition level. USD export completed, and UE imported a StageActor plus reconstructed camera/lights. Import logs contain MaterialX type/plugin errors and armature warnings.
- The UE Derived Data Cache failure is real: the `Installed` graph has no writable node and the local Zen/Common cache path is unavailable. `-DDC-ForceMemoryCache` bypassed the fatal startup condition and allowed bounded tests. This is a workaround, not a repair of the cache configuration.
- A one-frame Deferred MRQ PNG was produced at `.cws_tmp/B4_JOB/RenderDeferred/B4_Frame450_Sequence_v7.0000.png`. It is visibly far from the Blender reference: framing is wrong, the desk dominates, the character is split into detached/black parts, and materials/lighting do not match.
- A one-frame Path Tracer PNG was produced at `.cws_tmp/B4_JOB/RenderPathTracer/B4_Frame450_Sequence_v7.0000.png`. It is also far from the Blender reference: the image is severely overexposed, the camera composition is wrong, and the character remains detached/incorrect. Path Tracer therefore does not isolate a Deferred-only gap.
- The USD/MaterialX family was bounded to three materially similar camera/import/render observations: wall-only output, a visible but badly composed scene after axis correction, and the current Deferred/Path Tracer outputs with broken character/material semantics. Manual per-material tuning was not continued.
- A repeatable hybrid exporter was started for an evaluated static frame: it would bake evaluated mesh geometry plus Blender camera/light/color metadata to FBX/JSON without saving the source. After more than eight minutes of high CPU it produced no artifact and was stopped at the exact diagnostic Blender PID. No machine power/session transition was executed.
- No full 60-frame render was started.

## INFERENCE

- USD/MaterialX is not a viable high-fidelity transfer family for this scene on the tested UE 5.8.1 stack. The independent Deferred and Path Tracer results are both poor, so changing realtime renderer alone cannot solve the observed loss.
- The dominant losses are evaluated rig/armature character geometry and material/shader semantics, followed by camera/color/light convention differences. The logs and the detached character in both renderers support this causal interpretation.
- The B4 conversion cost is already disproportionate to the evidence of improvement: USD import produces a large scene with repeated plugin/material diagnostics, while a static evaluated FBX snapshot did not complete inside a reasonable bounded test.

## HYPOTHESIS

- A hybrid bundle could work only if the entire scene were exported as evaluated geometry with baked PBR maps and reconstructed from metadata, not by continuing USD MaterialX repair. The bounded evaluated export did not establish that this is practical for this source on this machine.

## UNKNOWN

- Exact V25 image pixels and a numeric image-distance score were not available in the current local evidence set; visual comparison is against `.cws_tmp/blender_ref_450.png`.
- An optimized, separately authored bake/export implementation might complete faster, but that would be a new pipeline family with substantial additional engineering and no current evidence it would preserve this rig/material set.
- UE OCIO AgX matching was not completed because the scene already failed materially in geometry/material transfer; it is not expected to repair detached geometry or missing shader semantics.

## Decision

The representative-frame success gate was not met. Based on the three failed USD/MaterialX observations, the failed Deferred and Path Tracer comparison, and the bounded hybrid-export cost, further UE5 conversion for this scene is not justified within reasonable complexity. Preserve the Blender/Cycles render as the fidelity authority; do not launch a full sequence render from this B4 UE asset.

## BFUE 4.4.8 controlled experiment (2026-08-21)

### FACT

- The Founder-provided Google Drive artifact `Blender_For_Unreal_Engine_v4.4.8.zip` was verified as a 522,104-byte ZIP. Its manifest identifies add-on `unrealengine_assets_exporter`, version `4.4.8`, Blender minimum `5.0.0`, and the upstream project `xavier150/Blender-ForUnrealEngine-Addons`.
- It was installed with Blender 5.2's `bpy.ops.extensions.package_install_files` into isolated `BLENDER_USER_RESOURCES`; the customer `.blend` was not overwritten.
- BFUE collection export completed successfully: `SM_CWS_BFUE_WHOLE_SCENE.fbx` is approximately 118 MB, with `ImportAssetScript.py`, `ImportSequencerScript.py`, `ImportAssetData.json`, and `ImportSequencerData.json`.
- UE5 Interchange imported/builds the native asset. Runtime logs report 151 payload objects, 4,439,471 vertices, 2,233,859 triangles, and a static-mesh build estimate of 7,953.7 MiB. The mesh has 81 material sections, so Nanite is disabled for this asset.
- Official command-line MRQ produced native UE PNGs at 640x360 for the BFUE asset. The first uncorrected camera test was all black; corrected axis and plugin-camera/basis tests were non-black but materially unlike Blender frame 450. No full sequence render was launched.
- BFUE's generated `ImportSequencerData.json` contains `spawnable_camera: true` and `cameras: []`; `ExportLog.txt` reports `0 Camera(s)`. Collection FBX export therefore did not provide a usable automatic camera/shot transfer for this scene.

### INFERENCE

BFUE 4.4.8 is a useful practical FBX/export accelerator, but the tested whole-scene collection route is not a visual-fidelity contract. It transfers enough geometry to build a native UE asset, while camera convention, scene orientation, light energy/color, materials and source color management remain unresolved. The 7.95 GiB build estimate also makes one giant FBX a poor default on the current RTX 2060 SUPER / approximately 16 GiB host.

### DECISION

Adopt BFUE 4.4.8 as the preferred experimental FBX family for future bounded CWS tests, with split-by-root-collection assets, explicit camera/shot metadata, simple UE-friendly PBR material conversion, and a representative-frame gate. Keep GLB/glTF and USD as fallback/diagnostic families. Do not repeat giant whole-scene FBX, camera guessing, or renderer swaps without a materially different implementation. Blender/Cycles remains the fidelity authority and canonical Track A architecture is unchanged.
