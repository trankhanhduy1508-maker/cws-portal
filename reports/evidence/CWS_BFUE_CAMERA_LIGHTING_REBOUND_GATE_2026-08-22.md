# CWS BFUE camera/lighting/rebound gate — 2026-08-22

## Outcome

This was a bounded native 1920x1080 UE5.8 diagnostic, not a production success. BFUE V2 imported the skeletal mesh and animation, and MRQ produced 60 PNG frames, but the representative output was black and all three sampled frames were byte-identical. No MP4 was promoted.

## Ground truth

- Source: `.cws_tmp/PhongNguRender6.blend`
- Source delivery metadata: 1920x1080, 24 fps, frames 432–491
- Current BFUE skeletal asset: `/Game/CWS/BFUE_SkeletalSetup/Circle_013`
- Current animation: `/Game/CWS/BFUE_SkeletalSetup/Anim/Anim_rigAction`
- Native output directory: `.cws_tmp/B4_JOB/BFUE_CharacterNativeRender`
- Output: 60 PNG frames, each 1920x1080 according to MRQ log
- Frame 0000 / 0030 / 0059: 36,314 bytes each, same SHA-256 `593ABE957795AF4129D2D1E579954C4DB309330C278B989155F62C0E88BCF8EC`

## Findings

1. BFUE source confirms camera transform mapping is `Pitch=rotation_y`, `Yaw=rotation_z`; positional `unreal.Rotator(...)` is unsafe because the Python binding reordered values in the saved actor. A keyword-based Rotator or explicit look-at is required.
2. Skeletal actor bounds in UE were origin `(52.3165, 23.0680, 60.8221)`, extent `(76.4714, 33.1631, 63.2477)`. The exported camera location was `(-74.5393, 91.9500, 43.1504)`. A look-at diagnostic produced `Pitch=6.9795, Yaw=-28.5017, Roll≈0`.
3. The first character-only stage had no lights; adding a directional key and point fill did not change the black output. Missing lights were real but not the only blocker.
4. A separate commandlet successfully created and saved `BFUE_CharacterRebound_V1_Sequence` rebinding the current camera, skeletal actor, and animation. The rebound render still produced 60 identical black frames.
5. MRQ itself is operational: logs show 1920x1080 tile resolution, camera cut initialization, animation compression, and completion. The failure is scene signal/semantic setup, not encode or frame-count handling.

## Timing evidence

- Python commandlet startup/import overhead on this host: approximately 20–30 seconds per isolated commandlet after the current project cache state.
- MRQ render child observed previously for the same 60-frame 1920x1080 character stage: approximately 8.3 seconds after map load.
- Full customer-scene BFUE import/build remains dominated by the previously recorded approximately 9m16s UE import/build and is not under the current 10-minute target when added to source analysis and encode.
- No valid end-to-end MP4 was produced by this gate; do not report target success.

## Decision

Stop the camera/character-only repair family after materially different camera mapping, bounds look-at, lighting, and sequence-rebinding tests. Do not repeat these same fixes without new scene-signal evidence. The next materially different path must inspect render-target alpha/world state and/or use a fully automated map built from a saved sequence with explicit camera component binding and a known-good unlit diagnostic material before attempting fidelity work.

## Sources

- Epic MRQ command-line documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/using-command-line-rendering-with-move-render-queue-in-unreal-engine
- Epic MRQ documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/movie-render-pipeline-in-unreal-engine?lang=en-US
- BFUE source and camera/Sequencer workflow: https://github.com/xavier150/Blender-ForUnrealEngine-Addons
