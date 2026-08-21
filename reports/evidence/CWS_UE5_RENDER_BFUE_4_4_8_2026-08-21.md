# CWS BFUE 4.4.8 Runtime Evidence

Date: 2026-08-21  
Scene: `PhongNguRender6.blend`  
Status: experimental; representative-frame gate FAILED; Track A unchanged

## Result

The provided `Blender_For_Unreal_Engine_v4.4.8.zip` was installed in isolated Blender 5.2 resources and executed successfully. BFUE exported a native whole-scene FBX and UE5 Interchange built a native StaticMesh. Command-line Movie Render Queue also produced non-black PNGs. Visual equivalence to Blender was not achieved.

## Evidence

- Plugin ZIP: Google Drive file `Blender_For_Unreal_Engine_v4.4.8.zip`, 522,104 bytes.
- Manifest: add-on `unrealengine_assets_exporter`, version `4.4.8`, Blender minimum `5.0.0`.
- Blender export: `.cws_tmp/B4_JOB/BFUE_4_4_8_export/StaticMesh/SM_CWS_BFUE_WHOLE_SCENE.fbx`, about 118 MB; import scripts and JSON metadata are in `Other/`.
- UE import: 151 objects, 4,439,471 vertices, 2,233,859 triangles; build estimate `7953.736 MiB`; 81 material sections, Nanite disabled.
- Native MRQ gate: `BFUE_Gate_Render/BFUE_Representative_Sequence_AxisFix.0000.png`, `...PluginCamera.0000.png`, and `...BasisFix.0000.png` were produced. The first uncorrected gate was black; the corrected gates were visible but showed wrong composition/orientation/lighting/material appearance versus `BlenderPlateFrames/frame_0450.png`.
- BFUE Sequencer metadata: `spawnable_camera: true`, `cameras: []`; export log: `0 Camera(s)`. The collection export did not provide a verified automatic shot transfer.
- UE startup required `-DDC-ForceMemoryCache` because the host's Installed DDC graph has no writable nodes. This is a bounded runtime workaround, not a host power/session action or cache repair.

## Decision

Use BFUE 4.4.8 as the preferred experimental FBX family for future bounded tests, but split by root collection/asset, use explicit camera/shot metadata, convert materials to a simple UE-friendly PBR subset, and require a representative-frame gate before any full render. Do not use one giant whole-scene FBX as the default. Stop repeating GLB/USD/renderer swaps for this scene without a materially different implementation. Blender/Cycles remains the fidelity authority and canonical Track A architecture is unchanged.
