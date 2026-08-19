# UE5 PhongNguRender6 A-to-Z P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one PowerShell script that takes `PhongNguRender6*.blend` through Blender headless export, validated UE 5.8 Interchange import, MRQ PNG rendering, and FFmpeg MP4 assembly without modifying the source `.blend`.

**Architecture:** Reuse the already exercised `CWS_UE_RENDER_FULL_ANIMATION_V2.ps1` structure instead of creating a second unrelated launcher. Add fail-closed mesh-reference validation at the Interchange boundary, safer camera-cut verification, automatic unique `PhongNguRender6*.blend` discovery, source render metadata, and FFmpeg finalization that preserves PNG frames and does not duplicate the last frame.

**Tech Stack:** Windows PowerShell 5.1, Blender 5.2 Python, Unreal Engine 5.8 Python/Interchange/Movie Render Queue, FFmpeg.

**Spec:** `docs/superpowers/specs/2026-08-19-ue5-phongngurender6-a-to-z-design.md`

## Global Constraints

- Customer `.blend` is immutable and opened with `--background --disable-autoexec`.
- Use `C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe` unless explicitly overridden.
- Default input discovery is exactly one `C:\Users\Administrator\Downloads\PhongNguRender6*.blend`; zero or multiple matches fail rather than guess.
- All UE assets use a fresh `/Game/CWS_AUTO/JOB_<timestamp>` namespace.
- Interchange success is not enough: at least one real non-null mesh asset reference and one visible/main-pass mesh component are required before MRQ.
- PNG frames remain durable output even when MP4 assembly fails.
- FFmpeg is required for animated-video finalization and is searched under `Downloads\CWS_UE_TOOLS\ffmpeg`, explicit `-FfmpegExe`, then PATH.
- Do not report this experiment as Golden Production E2E.

---

### Task 1: P1 launcher contract and source discovery

**Files:**
- Create: `tools/ue5/CWS_UE_RENDER_PHONGNGU6_A_TO_Z_P1.ps1`
- Test: `tests/tools/test_ue5_phongngurender6_p1_contract.py`

**Interfaces:**
- Consumes: optional `-BlendPath`, `-ProjectPath`, `-BlenderExe`, `-UnrealCmd`, `-FfmpegExe`, `-TimeoutMinutes`.
- Produces: unique job directory, discovered immutable source path, verified tool paths.

- [ ] Write a failing contract test requiring P1 markers, unique `PhongNguRender6*.blend` discovery, immutable source marker, UnrealEditor-Cmd path, and FFmpeg finalization markers.
- [ ] Run the contract test and verify it fails because P1 does not exist.
- [ ] Build P1 from the known V2 launcher structure, changing mandatory `BlendPath` into safe unique discovery when omitted.
- [ ] Run the contract test and verify it passes.

### Task 2: Blender manifest and GLB export

**Files:** same launcher and contract test.

**Interfaces:**
- Produces: `scene.glb`, `blender_scene_manifest.json`, source FPS/frame range/resolution/camera/light/world metadata.

- [ ] Extend the failing test to require frame metadata, camera inventory, light/world manifest, cameras/lights/animation/material GLB export flags.
- [ ] Verify RED.
- [ ] Implement only the required Blender helper additions while preserving `--disable-autoexec` and source immutability.
- [ ] Verify GREEN and embedded Python syntax.

### Task 3: Interchange import validation

**Files:** same launcher and contract test.

**Interfaces:**
- Consumes: GLB and fresh UE namespace.
- Produces: validated map/import assets, mesh-reference counts, visible-main-pass count, sequence candidates.

- [ ] Add failing checks requiring runtime StaticMesh/SkeletalMesh reference accessors and explicit accessor-error counters.
- [ ] Verify RED.
- [ ] Import with `ImportAssetParameters(import_level=current_level)` and fail if all mesh references are null or visible/main-pass count is zero.
- [ ] Verify GREEN and embedded UE Python syntax.

### Task 4: Sequence, Camera Cut, MRQ

**Files:** same launcher and contract test.

**Interfaces:**
- Produces: verified selected LevelSequence, camera-cut binding evidence, fresh MRQ config.

- [ ] Add failing contract checks for `Guid.to_string()`, valid camera cut, Deferred pass, PNG output, source FPS, source dimensions, and one-spatial/one-temporal sample POC settings.
- [ ] Verify RED.
- [ ] Implement minimum camera-cut validation/repair and fresh MRQ config without reusing old job assets.
- [ ] Verify GREEN and embedded Python syntax.

### Task 5: Full render, output validation, FFmpeg finalization

**Files:** same launcher and contract test.

**Interfaces:**
- Produces: validated PNG frame set, `CWS_UE_PHONGNGU6_P1.mp4`, report JSON, representative Desktop PNG and Desktop MP4.

- [ ] Add failing checks that FFmpeg is invoked only after PNG validation, concat duration is source FPS-based, last frame is not duplicated, `libx264/yuv420p/+faststart` are used, and PNGs are not deleted after finalization.
- [ ] Verify RED.
- [ ] Implement render monitoring, non-zero PNG validation, deterministic concat, FFmpeg exit/output validation, Desktop copies, and final JSON classification.
- [ ] Run the complete contract/syntax verification fresh.
- [ ] Preserve runtime status as `NOT_YET_VERIFIED_ON_MAY083` until Founder runs it on the physical host.
