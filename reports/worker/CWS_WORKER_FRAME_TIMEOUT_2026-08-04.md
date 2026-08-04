# CWS Worker Frame Timeout Evidence — 2026-08-04

## GAP

The Worker previously called Blender with blocking subprocess.run() and no active per-frame timeout. A hung Blender process could therefore hold a Worker indefinitely.

## FIX

- cws_worker_full.py defines CWS_FRAME_TIMEOUT_SEC with a default of 3600 seconds and a minimum of 60 seconds.
- render_single_frame() passes timeout=FRAME_TIMEOUT_SEC to subprocess.run().
- subprocess.TimeoutExpired returns a transient failure and removes partial frame_* outputs from that frame directory.
- No customer .blend script is executed by this timeout code; existing autoexec gating remains unchanged.

## STATUS

Code/static scope: PASS.

Runtime Worker/Fleet retry and recovery: NOT VERIFIED; requires a real Worker and Blender job, which is an Owner/runtime blocker. No machine reboot/shutdown/logoff was performed.
