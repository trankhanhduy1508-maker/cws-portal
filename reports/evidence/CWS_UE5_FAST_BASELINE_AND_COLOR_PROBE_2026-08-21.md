# CWS UE5 fast baseline and representative quality probe

Date: 2026-08-21  
Status: CURRENT EVIDENCE / QUALITY IMPROVEMENT NOT YET PROMOTED  
Source: `PhongNguRender6.blend`  
Host: `MAY083`

## Founder-provided milestone

**FACT — FOUNDER-PROVIDED:** the same video previously required approximately seven machine-hours with Blender and rendered through the current UE5 path in approximately five minutes. The Founder currently assesses the UE5 result at approximately 80% of the Blender reference quality.

The exact five-minute video, frame manifest, command log and complete settings bundle have not yet been located in the local repository/runtime evidence. This milestone is therefore preserved as a Founder fact and is not generalized as a universal per-scene runtime claim until the exact artifact is linked.

## Local fast-path runtime evidence

**FACT — LOCAL RUNTIME:** the working local acceleration route is:

`Blender/Cycles beauty plate PNG sequence -> UE5 raster/plate map -> direct child Movie Render Queue -> PNG/MP4`

- UE: `5.8.1` (`56057345+++UE5+Release-5.8`); executable `C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe`.
- UE map: `/Game/CWSRaster/B4_Raster_Reconstruction_v4`.
- UE sequence: `/Game/CWSRaster/B4_Raster_Sequence_v4`.
- Current local plate sequence: 60 frames, 24 fps, 640x360.
- Baseline PNG direct-child run: `.cws_tmp/B4_JOB/render_raster_fixed_ue_2.log`; executor duration `00:00:09.876`, log start `2026.08.21-14.04.35` UTC.
- Baseline MP4 direct-child run: `.cws_tmp/B4_JOB/render_ue5_mp4_fixed_ue_2.log`; executor duration `00:00:10.354`, log start `2026.08.21-14.11.00` UTC. NVIDIA H.264 encoder `nvEncMFTH264x.dll` was selected.
- Existing local output: `C:\Users\Administrator\Desktop\CWS_B4_UE5_Final.mp4`; 60 video samples, 24 fps, 2.5 seconds, H.264/NVENC, SHA-256 `74EA26A5B65D3303875DFC29C3FF6A6144353EE0CB21D5E5CABE368E4BB19117`.
- The current UE5 command requires `-DDC-ForceMemoryCache` because the Installed DDC graph has no writable node. This is a verified workaround, not a DDC repair.

The baseline command also applies high scalability groups (`sg.*Quality=4`), texture streaming off, high view/shadow scales, and the UE5.8 TSR defaults observed in the log, including `r.TSR.History.ScreenPercentage=200`, `r.TSR.History.UpdateQuality=3`, `r.TSR.ShadingRejection.Flickering=1`, `r.TSR.RejectionAntiAliasingQuality=2`, `r.TSR.ReprojectionField=1`, `r.TSR.Resurrection=1`, and `r.TemporalAA.Quality=2`.

## Representative-frame gate

**FACT — LOCAL RUNTIME:** baseline UE frame 30 (`.cws_tmp/B4_JOB/RenderUE5RasterFixed/B4_Raster_Fixed.0030.png`) was compared with the matching Blender plate frame 462 (`.cws_tmp/B4_JOB/BlenderPlateFrames/frame_0462.png`). Both are 640x360 and non-black.

- Blender mean RGB: `[83.1843, 59.3170, 58.4770]`.
- UE baseline mean RGB: `[164.9052, 128.2543, 127.5059]`.
- Baseline RGB MAE: `73.2551`.
- Baseline RGB RMSE: `79.3891`.
- Baseline channel mean ratio: approximately `[1.9824, 2.1622, 2.1804]`.

This confirms that the current raster route preserves the composition/subject but has a substantial color/luminance mismatch. It is not evidence of 80% pixel parity; the 80% assessment is the Founder’s overall visual assessment of the newer fast-path video.

## Controlled probe: scalar plate gain

**FACT — TESTED / NOT PROMOTED:** one variable was changed on only frame 30. A temporary UE `MaterialInstanceConstant` changed `PlateGain` from baseline `0.52` to `0.26`; map, camera, sequence, resolution, direct-child MRQ path and other render settings were held constant. The probe output was `.cws_tmp/B4_JOB/QualityProbe_Gain026/B4_Gain026.0030.png`, and the direct log was `.cws_tmp/B4_JOB/quality_probe_gain026_direct.log`.

- Probe executor duration: `00:00:08.950`; process exit status `0`.
- Probe mean RGB: `[161.5130, 121.7511, 128.1621]`.
- Probe RGB MAE: `73.1048`.
- Probe RGB RMSE: `81.8974`.
- Probe channel mean ratio: approximately `[1.9416, 2.0525, 2.1917]`.

The MAE reduction was only about 0.2%, while RMSE became worse and the image remained materially brighter than the Blender reference. **Decision:** do not promote scalar gain/exposure as the quality fix. The baseline map/material was restored by `.cws_tmp/B4_JOB/restore_raster_baseline.py`; its report says `restored: true` and `errors: []` in `.cws_tmp/B4_JOB/restore_raster_baseline_report.json`.

The restore process returned a non-zero startup exit code despite the clean restore report; this is recorded as runtime evidence and is not treated as a new quality result.

## Current interpretation and next bounded experiment

**INFERENCE:** the dominant remaining plate gap is a color-management/transfer-curve mismatch between Blender 5.2 AgX/output semantics and how the UE texture/material/output path interprets the plate. A scalar gain cannot reproduce a tone curve, highlight roll-off, saturation behavior or display transform.

**HYPOTHESIS:** a controlled color pipeline test should compare source/output color-space handling and an explicit Blender-compatible transform (OCIO or a pre-baked LUT/transform) before changing lighting, renderer or geometry. This must remain one-variable-at-a-time and must use the same representative frame.

**NEXT GATE:** test color-management/transfer handling on one representative frame; only promote a setting if it improves both image metrics and visual inspection without materially damaging the fast baseline. Do not launch the full sequence until the representative gate improves.

**UNKNOWN:** the exact Founder five-minute run’s source resolution, output frame set, MRQ settings and color pipeline are not yet present in the local evidence bundle.

## Version-matched references

- [Epic Games — Temporal Super Resolution in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine)
- [Epic Games — Rendering High-Quality Frames with Movie Render Queue](https://dev.epicgames.com/documentation/en-us/unreal-engine/rendering-high-quality-frames-with-movie-render-queue-in-unreal-engine)
- [Epic Games — Cinematic Rendering Image Quality Settings](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-rendering-image-quality-settings-in-unreal-engine?lang=en-US)
- [Epic Games — Unreal Engine 5.8 MaterialEditingLibrary Python API](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/MaterialEditingLibrary)
- [Blender 5.2 Manual — Color Management](https://docs.blender.org/manual/en/5.2/render/color_management/index.html)
- [Blender 5.2 Manual — Color Spaces](https://docs.blender.org/manual/en/5.2/render/color_management/color_spaces.html)

## VERIFIED QUALITY-GATED OUTPUT — 2026-08-22

**FACT — LOCAL RUNTIME:** the fixed direct-child UE5 render completed all 60 frames after restoring raster actor visibility (`HiddenInGame=false`). The candidate sequence is `.cws_tmp/B4_JOB/RenderUE5RasterPerFrameLUTFixed`; executor log is `.cws_tmp/B4_JOB/per_frame_lut_fixed_render.log`; UE process exit was `0`, and the Movie Pipeline completed in approximately `8.5 s`.

**FACT — FAIL-CLOSED GATE:** each per-frame LUT candidate was accepted only when it was at least 98% non-black and strictly improved both RGB MAE and RGB RMSE against the matching Blender plate. Three frames were accepted from the LUT candidate and 57 remained the original UE baseline. The quality-gated sequence is `.cws_tmp/B4_JOB/RenderUE5RasterQualityGateFixed` and the decision report is `.cws_tmp/B4_JOB/ue5_quality_gate_fixed_report.json`.

- Baseline mean over 60 frames: MAE `73.1745`, RMSE `79.2269`.
- Selected gate mean over 60 frames: MAE `73.1649`, RMSE `79.1026`.
- The improvement is numerically small; this is a safe quality gate, not evidence of a material parity breakthrough.
- The rejected global LUT overfit the representative frame and regressed the opening frame. The earlier pixel-only gate was invalidated because it could select black frames; non-black validation is now mandatory.

**FACT — PLAYABLE FINAL:** the final video was encoded from the UE5-rendered quality-gated PNG sequence with local FFmpeg `libx264` at CRF 16, native `640x360`, `24 fps`, `60` frames, `2.5 s`, H.264, `595,943` bytes. The UE5 direct MP4 path was not used for this final because its earlier quality-gate artifact decoded black after the first sample; the PNG output is the authoritative UE5 render evidence.

- Workspace artifact: `.cws_tmp/B4_JOB/CWS_B4_UE5_HighQuality_QualityGated.mp4`.
- Desktop artifact: `C:\Users\Administrator\Desktop\CWS_B4_UE5_HighQuality_QualityGated.mp4`.
- Desktop SHA-256: `3C883539321FFD569B8A0A2DD6A7D71DE92415FDF7615CF1E552C624F2A5C5CD`.
- FFprobe validation: H.264, `640x360`, `24/1`, `60` decoded frames, duration `2.500000 s`.
- Extracted MP4 samples at frames 0, 29 and 59 were non-black and visually contained the expected character/composition.

**FACT — RESTORE:** after the quality render, `/Game/CWSRaster/B4_Raster_Reconstruction_v4` was restored to all 60 original `/Game/CWSRaster/Materials/M_B4_Raster_v4_%04d` materials with all raster actors visible for the verified direct-child path. `.cws_tmp/B4_JOB/verify_raster_baseline_report.json` reports `verified: true`, zero mismatches and zero errors. Track A Blender/Cycles files were not changed.

**BOUNDARY:** the current practical path is a fast UE5 plate reconstruction plus robust encoding, not a demonstrated editable 3D semantic conversion with Blender-equivalent shading. Color transfer and source plate resolution remain the dominant fidelity limits. Future quality work must preserve this valid 60/60 baseline, test one representative frame first, and fail closed on black frames or metric regressions.

## Boundary and safety

- This result does not change canonical Track A Blender/Cycles architecture.
- No GLB/USD rerun or renderer swap was used for this quality probe.
- No full UE5 render was started after the failed probe.
- No shutdown, reboot, logoff, sleep, hibernate or other power/session transition was executed.
