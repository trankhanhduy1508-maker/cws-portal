# CWS BFUE 4.4.8 skeletal setup V2 — 2026-08-22

Status: experimental evidence; not production success and not under-15-minute success.

Starting from the real `.cws_tmp/PhongNguRender6.blend`, BFUE 4.4.8 used a materially different export contract: armature `rig` set to recursive export, camera `ZNT_Camera` set to self-only export, seven environment roots split into collection FBXs, one skeletal FBX, one baked `rigAction` animation FBX, and explicit camera metadata. Blender export/preparation was about 24 seconds. ExportLog confirmed one skeletal mesh, seven collection static meshes, one camera and one action animation. Metadata records 1920x1080, 24 fps and frames 432–491. Source SHA: `5C20076506CC787BBE2C26360B02111AAB31767B0545BA1185FA76E66D3DB70C`.

UE5.8 Interchange imported environment assets, skeletal mesh and animation. UE renamed the skeletal asset from `SKM_rig.fbx` to `Circle_013`; the imported animation targets `SK_rig_Skeleton` and `Circle_013`. The first import command took approximately 9m16s including startup, shader/DDC setup and static/skeletal builds. Invalid bind poses were rebased to time zero. `-DDC-ForceMemoryCache` was required because Installed DDC had no writable nodes.

BFUE generated sequence import failed under UE5.8 because it attempted `set_display_rate` on a string after sequence factory creation. A native UE Python script successfully created a character-only map and LevelSequence with BFUE camera metadata, `Circle_013`, `Anim_rigAction`, 24 fps and a 60-frame range.

The full environment map caused repeated static-mesh rebuild/compile on load, including `SM_ghe` at 4.7M triangles, and stalled before stage creation. The native MRQ NewProcess test generated a QueueManifest but the child exited before writing frames. No production MP4 was promoted and no goal-achieved claim is valid.

Decision: retain the skeletal export contract as a future bounded semantic-transfer building block; stop using BFUE generated Sequencer import as-is on UE5.8 and stop full-environment rebuilds on this host until a fresh isolated project has writable DDC and proves true end-to-end `<15 min`.
