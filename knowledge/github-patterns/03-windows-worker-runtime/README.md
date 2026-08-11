# 03 — Windows Worker / Node Agent Runtime Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: resident Node Agent, Windows Service lifecycle, Python Windows APIs, failure recovery.

## Primary top-tier sources

### 1. `winsw/winsw` — ~14k stars
https://github.com/winsw/winsw

WinSW wraps executables as Windows services and documents service installation, logging and self-restarting patterns.

CWS lessons:
- one explicit startup owner is easier to reason about than multiple Startup Folder/Scheduled Task/service paths;
- service lifecycle, process lifecycle and application lifecycle are distinct;
- log rotation and crash recovery are production requirements;
- configuration should be deterministic and inspectable;
- service startup should not create duplicate resident agents.

CWS does **not** need to replace its existing service mechanism merely because WinSW exists.

### 2. `mhammond/pywin32` — ~5.6k stars
https://github.com/mhammond/pywin32

Long-running Python bindings for Windows APIs including service-related functionality.

CWS lessons:
- Windows service context differs from interactive user context;
- LocalSystem/privileged service environments may have different PATH, DLL and filesystem access than a terminal session;
- explicit environment/path handling is safer than assuming the interactive shell configuration;
- pin versions and test supported Python/Windows combinations.

### 3. `microsoft/Windows-classic-samples` — official Microsoft source
https://github.com/microsoft/Windows-classic-samples

Why trusted:
- Microsoft-owned repository with Microsoft security-reporting policy;
- useful primary examples for native Windows process/service/system APIs.

CWS lesson: when Windows behavior is unclear, prefer Microsoft API semantics over folklore from random scripts.

## Permanent Founder safety rule — NO REBOOT

**AI/ChatGPT/Codex must never reboot, shutdown or restart the Windows PC for testing.**

Forbidden test actions include:
- `Restart-Computer`;
- `Stop-Computer`;
- `shutdown.exe` reboot/shutdown;
- physical reboot requests;
- BootROM reboot tests initiated by the AI.

If a property can only be proven by reboot, report:

`NOT VERIFIED / DEFERRED`

This rule does not change the product requirement that the Node Agent should survive a **natural future boot/reboot** at a partner site. It only forbids AI-triggered reboot as a test method.

Do not restart a Windows Service merely to create evidence unless the current approved test scope explicitly requires that service restart. Prefer unit/process-level verification first.

## CWS process model

Canonical shape remains:

`Windows boot -> Node Agent resident service -> authenticate/heartbeat -> ACTIVE_IDLE -> claim -> launch task-scoped Worker Engine -> Blender/render/upload/verify -> Worker exits -> cleanup -> ACTIVE_IDLE`

Key principles learned from mature service software:

### 1. One resident supervisor

Node Agent is the resident owner. Worker Engine is not a second permanent service.

### 2. Child crash must not kill supervisor

Blender/Worker failure should be contained, reported and cleaned up while Node Agent remains capable of returning to idle.

### 3. Network loss is a state, not process death

Backend outages use bounded retry/backoff/jitter. Do not terminate the resident agent simply because the network is temporarily unavailable.

### 4. Duplicate-instance prevention

Two Node Agents on one machine can produce duplicate heartbeats/claims. Production startup needs one canonical ownership mechanism and duplicate-instance protection.

### 5. Environment must be explicit

Service process should know:
- executable/runtime paths;
- workspace/sandbox paths;
- log paths;
- configuration source;
- machine identity location;
- Blender path/version;
- child-process environment.

Do not rely on a manually opened Administrator shell having configured PATH.

### 6. Golden Image != shared identity

Shared image may contain code/runtime/dependencies, but each PC must retain distinct machine identity/credential through appropriate persistent/writeback state.

## What CWS must not copy blindly

- generic service wrappers without understanding existing canonical installer;
- service restart loops with no bounded backoff;
- LocalSystem privileges for code that does not need them;
- secrets embedded in service config/Golden Image;
- multiple competing auto-start mechanisms;
- example code that assumes desktop/interactivity;
- any reboot-based test workflow.

## Tests to borrow conceptually

- only one Node Agent instance becomes authoritative;
- child process crash is contained;
- network failure backs off and recovers;
- job task starts only after authoritative claim;
- Worker exits after task completion/failure cleanup;
- Node Agent returns to idle without needing a reboot;
- environment/path resolution works without interactive shell assumptions;
- credentials are per-machine, not cloned.

## Activation

Load for Node Agent, Worker launch, Windows Service, process lifecycle, machine identity or Windows environment issues. Never use this note as permission to reboot a test PC.
