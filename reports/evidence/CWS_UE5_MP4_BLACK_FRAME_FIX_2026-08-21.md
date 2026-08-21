# CWS UE5 MP4 black-frame fix

Date: 2026-08-21  
Scene: `PhongNguRender6.blend`  
Route: UE5 raster/plate reconstruction + Movie Render Queue MP4 encoder

## Root cause

The first Desktop MP4 was a valid H.264 container, but the UE5 source sequence had only frame `0000` visible. Frames `0001`–`0059` were black because all 60 raster plane actors were saved with `HiddenInGame=true`; the Sequencer visibility keys could not reliably promote the later actors in the command-line MRQ child process.

## Fix and evidence

- Cleared the default hidden state for all `CWS_Raster_Frame_0000`–`0059` actors while preserving the Sequencer visibility keys.
- UE5 MRQ rerendered 60/60 PNGs at `640x360`; frames `0001`, `0030`, and `0059` were visibly non-black and showed the expected animated source imagery.
- UE5 Movie Render Pipeline used the NVIDIA H.264 encoder and finalized the MP4.
- Final source: `.cws_tmp/B4_JOB/UE5_MP4_FIXED/CWS_B4_UE5_Final_Fixed.mp4`.
- Final Desktop output: `C:/Users/Administrator/Desktop/CWS_B4_UE5_Final.mp4`.
- Container probe: H.264 `avc1`, 60 video samples, 24 fps, 2.50 seconds, `ftyp`/`moov`/`mdat` present; Desktop SHA-256 `74EA26A5B65D3303875DFC29C3FF6A6144353EE0CB21D5E5CABE368E4BB19117`.

This fixes the black-video runtime defect. It remains the UE5 raster/plate route and is not evidence that native Blender/Cycles visual parity has been achieved.
