# 05 — Animation / Media Finalization Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: rendered frame sequence -> validated final animation/video deliverable.

## Primary top-tier sources

### 1. `FFmpeg/FFmpeg` — ~61.1k stars
https://github.com/FFmpeg/FFmpeg

Official GitHub mirror of FFmpeg, the dominant open-source multimedia toolkit.

CWS lessons:
- distinguish encoding, muxing, filtering, probing and container validation;
- frame rendering complete is not the same as final media complete;
- finalization needs explicit codec/container/frame-rate/pixel-format/audio semantics;
- output should be probed/validated after encoding rather than trusting exit code alone;
- CLI behavior is deterministic and well suited to bounded Worker/finalizer subprocesses when the command is sufficient.

### 2. `Zulko/moviepy` — ~14.6k stars
https://github.com/Zulko/moviepy

Python video-editing library built around media composition workflows.

CWS lessons:
- media finalization can be represented as explicit composition steps;
- Python orchestration can improve readability around higher-level media operations;
- however, the project itself asks for maintainers, so CWS should not assume it is a stronger production dependency than direct FFmpeg for simple deterministic finalization.

### 3. `PyAV-Org/PyAV` — ~3.2k stars
https://github.com/PyAV-Org/PyAV

Pythonic FFmpeg bindings. The project's own guidance is valuable: if the `ffmpeg` command already solves the job cleanly, PyAV may add complexity; use bindings when precise frame/packet/container control is truly required.

CWS takeaway:
- prefer the smallest deterministic media interface that satisfies the contract;
- do not add a heavy abstraction simply because it is Pythonic.

## CWS finalization contract

For an animation job:

`all required frame Tasks authoritative-complete`
`-> collect/verify exact frame coverage`
`-> verify no missing/duplicate/corrupt frame outputs`
`-> assemble/encode`
`-> probe final file`
`-> upload/store final output`
`-> verify stored object`
`-> FINAL_OUTPUT_READY`

A Job must not enter final-output success merely because render Tasks reached 100%.

## Frame-sequence preconditions

Before encoding:

- expected frame range comes from authoritative Job metadata;
- exact expected output frame set is derived deterministically;
- no missing frames;
- no duplicate authoritative outputs for one frame;
- image dimensions/format meet finalizer contract;
- corrupt/zero-byte outputs rejected;
- FPS comes from authoritative project metadata unless an approved product rule overrides it;
- file ordering must be numerical/frame-aware, not fragile lexicographic guessing.

## Finalization budget

The Founder-approved 45-minute internal target includes required finalization.

Scheduler projection therefore needs reserved non-render budget for:
- frame collection/validation;
- retry/straggler recovery;
- encode/assembly;
- final media verification;
- final output upload/verification.

Do not allocate the full 45 minutes to frame rendering and discover encoding time afterward.

## Deterministic failure taxonomy

Useful categories:
- missing frame(s);
- corrupt frame;
- inconsistent dimensions/format;
- encode command failure;
- codec unavailable;
- disk/resource exhaustion;
- probe/validation failure;
- output upload failure;
- stored object verification failure.

Retry policy should depend on category. Re-encoding may be valid after an encode failure; re-rendering every frame should not be the default response to a mux failure.

## Security

- construct command arguments safely; do not shell-concatenate untrusted filenames/options;
- allowlist supported container/codec/output options;
- keep finalizer working directory inside bounded job sandbox;
- never execute customer-provided scripts as part of finalization;
- validate output paths against traversal/escape;
- preserve immutable customer originals.

## What CWS should not adopt blindly

- transcoding libraries as new dependencies when FFmpeg CLI is enough;
- arbitrary customer-controlled FFmpeg command strings;
- “success = process returned 0” without final probe/integrity checks;
- re-rendering completed frames because only final packaging failed;
- variable FPS/container behavior without an explicit product contract.

## Tests suggested by these sources

- exact sequence `[S..E]` accepted;
- one missing frame blocks finalization;
- duplicate/ambiguous frame output rejected;
- scene FPS propagated to final media;
- final file probe matches expected duration/frame rate/container;
- failed encoding does not mark Job complete;
- finalization retry does not recreate valid render Tasks;
- final object verification required before locked-delivery stage.

## Activation

Load only when working on animation assembly, encoding, frame validation, media output or finalization timing. FFmpeg/library adoption is a separate implementation decision.
