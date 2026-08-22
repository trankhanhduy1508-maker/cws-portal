# CWS UE5 Native 2K Gate — 2026-08-22

## Scope

The Founder gate is now genuine native `2560x1440`, not a `640x360` upscale.
The existing Lanczos MP4 remains a benchmark artifact only.

## Verified source authority

- Blender 5.2.0 LTS portable executable: `C:\Users\Administrator\cws-portal-canonical-main\.cws_tmp\Blender520\blender-5.2.0-windows-x64\blender.exe`.
- Source `.blend`: `.cws_tmp\PhongNguRender6.blend`; it was read with `--background --disable-autoexec` and not modified.
- Representative Blender/Cycles output: `.cws_tmp\B4_JOB\BlenderReferenceNative2K\frame_0462_native2K.png`.
- `ffprobe` verified the Blender PNG as `2560x1440`, `rgb24`; file size is `6,414,656` bytes.

FACT: Blender can produce a real native 2K representative frame from the current source.

## Official guidance used

- Blender Format documentation defines Resolution X/Y as the output pixel dimensions and Percentage as the scaling control; native output requires 100%: <https://docs.blender.org/manual/en/latest/render/output/properties/format.html>.
- Epic's UE 5.8 MRQ documentation defines Output Resolution and High Resolution/tiled rendering for larger output: <https://dev.epicgames.com/documentation/en-us/unreal-engine/rendering-high-quality-frames-with-movie-render-queue-in-unreal-engine>.
- Epic's UE 5.8 Python API documents `MoviePipelineOutputSetting.output_resolution`, `use_custom_playback_range`, `custom_start_frame`, and `custom_end_frame`: <https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/MoviePipelineOutputSetting>.

## UE5 representative attempt

Disposable script: `.cws_tmp\probe_raster_native2k.py`.

The test used a new disposable map and a native 2K Blender frame as a `2560x1440` texture, with no mipmaps, no streaming and a one-frame MRQ range at frame 0030. It used the already verified `-dx11 -sm5 -DDC-ForceMemoryCache` runtime path. The original baseline map and assets were not replaced.

First attempt log: `.cws_tmp\B4_JOB\probe_raster_native2k_sm5.log`.
Second attempt log: `.cws_tmp\B4_JOB\probe_raster_native2k_v2_sm5.log`.

## First failing boundary and root cause

FACT: UE5 SM5 passed engine startup and began loading the baseline map; the missing shader maps were compiled through the known DDC memory-cache workaround.

FACT: the script then duplicated the baseline map and called `LevelEditorSubsystem.load_level()` on the duplicate. UE loaded the duplicate world during the duplicate/load transition, retained it as a standalone world, and aborted before the Python/MRQ queue configuration with:

`World Memory Leaks: 2 leaks objects and packages`

The v2 attempt removed the Python duplicate return reference, but the same duplicate-then-load transition still produced the same UE 5.8.1 world cleanup failure. Therefore this is a script/UE editor world-transition boundary, not evidence that native 2K output is impossible.

This first duplicate-map attempt is historical failure evidence only. It is not the final native-2K result.

## Decision and next safe action

Keep all existing 640 outputs and the 2560x1440 Lanczos benchmark unchanged. Do not delete the failed logs. The next minimal test must avoid duplicate-map loading in the same editor process: use a fresh process with a pre-authored disposable map, or load the duplicate as the startup map and do not call `load_level()` on it.

## Verified native 2K UE5 path

The blocker was bypassed with a materially different disposable path: a fresh UE map and Level Sequence were authored together, so the plane/camera possessable bindings were valid. The map was loaded as the startup map; no duplicate-map `load_level()` transition was used.

- Prep report: `.cws_tmp\B4_JOB\prepare_native2k_single_report.json`.
- Representative UE PNG: `.cws_tmp\B4_JOB\RenderUE5Native2KSingleProbe_v1\B4_Raster_Native2K_Single.0000.png`.
- Representative validation: `2560x1440`, `Format32bppArgb`, center alpha `255`, file size `7,060,683` bytes; SHA-256 `256AE6CC4E722323FF7A710DEC64B0BE40251A227E24B8917FCE05ADF5574057`.
- Visual comparison against the native Blender frame showed the same composition and retained native face, eyes, glasses, hair, clothing and wall-texture detail. UE is brighter/less dark than Blender because of the output color/exposure path; this is a color-pipeline difference, not an upscale artifact.

## Verified native 2K short sequence and MP4

Blender 5.2.0 LTS rendered native source frames 461–463 from the unchanged `.blend` at `2560x1440`, `100%`, Cycles, 16 samples. UE imported those three native PNGs into a new map/sequence with fresh visibility and camera bindings, then MRQ rendered three native PNGs. All three decoded as `2560x1440` with center alpha `255`; sizes were `7,080,785`, `6,923,140`, and `6,643,474` bytes.

The three-frame MP4 was encoded from those UE PNGs with Blender's bundled FFmpeg H.264 MPEG-4 output at `2560x1440`, 24 fps, no scale filter and no audio:

- Artifact: `.cws_tmp\B4_JOB\CWS_B4_UE5_Native2K_Short_v1.mp4`.
- Encode report: `.cws_tmp\B4_JOB\encode_native2k_short_report.json`.
- Size: `502,758` bytes; SHA-256 `89BE139CBC983873BB45B63DC9C1CF92C15284A29D46F2A894A091494E93D5E1`.

Classification: native 2K pixel output is now proven end-to-end for the current fast UE plate architecture. This does not yet prove editable semantic UE geometry/material reconstruction at native 2K; that remains a separate fidelity track.

## Duration correction

The first MP4 contained only the three source frames at 24 fps (`0.125` seconds). The corrected deliverable holds each verified native frame for 20 output frames, producing 60 frames at 24 fps (`2.5` seconds) without scaling or re-rendering a low-resolution source.

- Corrected artifact: `.cws_tmp\B4_JOB\CWS_B4_UE5_Native2K_Short_v2.mp4`.
- Encode report: `.cws_tmp\B4_JOB\encode_native2k_duration_fix_report.json`.
- Resolution: `2560x1440`; frame count: `60`; fps: `24`; duration: `2.5` seconds; audio: none.
- SHA-256: `AC182EA8AB9455558C9BAB051FD8944D329A9F27AE39486BE092B1D206BCCE7D`.
