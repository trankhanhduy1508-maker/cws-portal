# CWS BFUE runtime binding / spawnable gate — 2026-08-22

## Result

The first failing boundary was narrowed from “MRQ black” to runtime scene binding and probe contamination:

- Earlier native MRQ PNGs were 1920x1080 but RGBA `(0,0,0,0)` for every pixel and sampled frame.
- A visible `BasicShapes/Cube` probe rendered in the same map/queue, proving MRQ, camera cut, world and output alpha could produce visible pixels.
- Runtime inspection showed the skeletal actor visible, not hidden in game, with mesh `Circle_013`, Single Node animation mode and five imported UE material slots.
- A possessable camera/character sequence remained transparent after probe cleanup.
- A materially different spawnable camera + spawnable skeletal actor sequence produced visible character geometry in all 60 native 1920x1080 frames. Possessable actor identity/binding was therefore a real failure boundary.

## Representative native results

- Spawnable V1: `.cws_tmp/B4_JOB/BFUE_CharacterSpawnableRender/0030.png`; character signal appeared but the probe cube contaminated the center.
- Probe cleanup: `.cws_tmp/B4_JOB/bfue_probe_cleanup_report.json`; one `/Engine/BasicShapes/Cube.Cube` actor was destroyed from the scratch map.
- Spawnable V2: `.cws_tmp/B4_JOB/BFUE_CharacterSpawnableV2Render/0030.png`; cube absent, character geometry visible, but target `(0,0,0)` framed the lower body only.
- Spawnable V3: `.cws_tmp/B4_JOB/BFUE_CharacterSpawnableV3Render/0030.png`; target `(0,0,60)`, reduced lights, native 1920x1080, head and torso visible without the central probe. Hair/eyes/glasses/clothing texture semantics were not preserved and full-body framing remained incomplete.
- `.cws_tmp/B4_JOB/bfue_spawnable_render_report.json` records 60 frames, 24 fps, 1920x1080 and no MRQ script errors for the spawnable gate.

## Professional/API evidence

Epic documents possessable bindings as actors already in the Level and spawnable bindings as actors that exist only while the Sequence plays. UE5.8 source exposes `AddSpawnableFromInstance`, `AddSpawnableFromClass`, `ConvertToSpawnable`, and spawnable camera creation in `LevelSequenceEditorSubsystem`. The CWS test used this supported sequence-level route and materially changed runtime behavior.

Official references:

- https://dev.epicgames.com/documentation/en-us/unreal-engine/python-scripting-in-sequencer-in-unreal-engine
- https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-camera-cut-track-in-unreal-engine
- https://dev.epicgames.com/documentation/en-us/unreal-engine/using-command-line-rendering-with-move-render-queue-in-unreal-engine
- https://github.com/xavier150/Blender-ForUnrealEngine-Addons

## Benchmark boundary

UE editor startup/new-process MRQ repeatedly cost about 2–3 minutes before a 12–14 second native 60-frame MRQ job. This is not a complete `.blend -> MP4` benchmark because export/import/preparation and H.264 encoding were not included. The gate does not prove the <=10 minute or <15 minute production target.

## Decision

Do not report goal achieved. Preserve spawnable camera + spawnable skeletal actor as the next implementation base. Remaining blockers are complete-character asset coverage, exact camera framing, room/environment transfer, color/exposure matching and a true end-to-end benchmark. The 34-minute native Cycles MP4 remains the quality authority but is outside the requested speed budget and is not a UE production dependency.
