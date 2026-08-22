# PhongNgu Full-HD Under-15-Minute Render Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified 1920x1080, 24 fps, 60-frame MP4 from the real `PhongNguRender6.blend` in under 15 minutes end-to-end.

**Architecture:** Benchmark a materially different native Blender Eevee path first so the original camera, evaluated rig, animation, materials and color settings remain authoritative. Use representative-frame comparison and a full-sequence timing gate; reject the path if it cannot meet the under-15-minute budget or produces materially wrong imagery.

**Tech Stack:** Blender 5.2, Eevee Next, local FFmpeg/ffprobe, PowerShell, PIL/image inspection.

**Spec:** User request in the active CWS session; source scene is 1920x1080, frame range 432-491, 24 fps.

## Global Constraints

- Never shut down, reboot, log off, sleep, suspend or hibernate the host.
- Start from the immutable real `.cws_tmp/PhongNguRender6.blend`; do not overwrite it.
- Final delivery must be 1920x1080, 24 fps, 60 frames, approximately 2.5 seconds.
- True `.blend -> preparation/render -> encode` wall time must be under 15 minutes.
- Use representative frames before any full render.

### Task 1: Ground source and existing MP4

**Files:**
- Read: `reports/evidence/CWS_UE5_RENDER_B4_PHONGNGU6_2026-08-21.md`
- Read: `knowledge/render/ue5/CWS_UE5_RENDER_KNOWLEDGE_V1.md`
- Verify: retained MP4 with `ffprobe` and decoded frame differences.

- [ ] Verify source resolution, frame range, FPS and existing MP4 frame count/motion.
- [ ] Preserve evidence before changing the route.

### Task 2: Eevee representative gate

**Files:**
- Create: `.cws_tmp/render_blender_eevee_probe.py`
- Create: `.cws_tmp/B4_JOB/BlenderEeveeProbe/frame_0462.png`

- [ ] Load the source read-only, set Eevee only in memory, render frame 450 at 1920x1080, and record elapsed time.
- [ ] Inspect the result against Blender/Cycles reference for camera, character, materials, lighting and color.
- [ ] Reject the path if the representative image is black, compositionally wrong, or materially below the practical target.

### Task 3: Full Eevee render and encode

**Files:**
- Create: `.cws_tmp/render_blender_eevee_sequence.py`
- Create: `.cws_tmp/B4_JOB/BlenderEeveeFrames/`
- Create: `.cws_tmp/B4_JOB/CWS_B4_BlenderEevee_FullHD.mp4`

- [ ] Render frames 432-491 at 1920x1080 with the tested Eevee settings.
- [ ] Measure Blender startup, preparation, render, encode and total elapsed time.
- [ ] Stop promotion if total time is 15 minutes or more.

### Task 4: Final verification and durable evidence

**Files:**
- Modify: `knowledge/render/ue5/CWS_UE5_RENDER_KNOWLEDGE_V1.md`
- Create or modify: `reports/evidence/CWS_B4_FULLHD_UNDER_15M_2026-08-22.md`

- [ ] Verify MP4 codec, resolution, FPS, duration, decoded frame count and start/middle/end motion.
- [ ] Visually inspect decoded representative frames and open the final MP4.
- [ ] Sync only durable evidence/knowledge to canonical GitHub `main`.
