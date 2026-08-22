# CWS UE5 MAY083 current-session evidence — 2026-08-22

## Outcome

No new direct semantic-transfer route passed the representative gate. The best practical retained artifact remains:

`C:\Users\Administrator\Desktop\CWS_B4_UE5_FastSharp_NoAA_2K.mp4`

It is a valid H.264 MP4 at 2560x1440, 24 fps, 60 frames and 2.5 seconds. It preserves the subject, composition and real temporal motion. The 2K output is a delivery upscale from UE5 640x360, not native scene-detail recovery.

## Evidence

- Blender reference: `.cws_tmp/B4_JOB/BlenderPlateFrames/frame_0462.png`
- UE5 representative after: `.cws_tmp/B4_JOB/RenderUE5NoAA640/B4_Raster_NoAA640.0030.png`
- Direct character rejection: `.cws_tmp/B4_JOB/DirectFBX/CharacterRenderV11/Character_Gate_V11_Sequence.0000.png`
- Direct-transfer timing: BFUE export `14.642s`, UE import/build approximately `5m22s`, MRQ approximately `3m55s`; representative quality failed.
- Fast downstream timing: UE5 MRQ `17.434s`, encode approximately `5.37s`; this excludes the upstream plate stage and is not a `.blend -> UE5` end-to-end claim.
- Existing plate generation lower bound: at least `20m39s`; therefore the plate route is a benchmark/fallback, not an accepted production dependency for the requested goal.

## Classification

- FACT: the MP4 is valid and visually inspectable; motion and subject are preserved.
- FACT: DirectFBX/Alembic character transfer is incomplete and rejected.
- INFERENCE: semantic transfer remains the dominant fidelity bottleneck.
- UNKNOWN: whether a complete evaluated character bake with explicit PBR textures can finish within the minutes-scale budget on this machine.

## Decision

Do not report the requested 90–95% `.blend -> UE5` fidelity target as achieved. Keep the retained MP4 as the best practical artifact and preserve Blender/Cycles as the fidelity authority. Do not repeat the failed solution families without a materially different, bounded complete-character bake.
