# Hostile `.blend` isolation POC — status

Date: 2026-08-05. Staging design only; no hostile file was executed.

## Minimum design

Use a per-attempt directory, Windows Sandbox, read-only mapped input, a separate constrained output directory, networking disabled, vGPU disabled, `--disable-autoexec`, bounded timeout, and process-tree cleanup. A host-side implementation should use a Windows Job Object with kill-on-close semantics; never broad name-based process termination.

## Verification labels

- CODE/UNIT VERIFIED: generic engine policy requires `--disable-autoexec`; bounded Blender timeout and owned process-tree cleanup are tested.
- REAL RUNTIME VERIFIED: harmless staging render, integrity/checkpoint, B2 staging checksum/HEAD, cleanup and ACTIVE_IDLE.
- UNVERIFIED: Windows Sandbox launch, read-only mapped-folder enforcement, network isolation, hostile-file behavior, and Job Object assignment.
- BLOCKED for production: a disposable Sandbox-capable staging host is required; no OS feature was enabled during this run.

## Alternative Job Object run

- REAL RUNTIME VERIFIED (partial): the harmless fixture was attached to a Win32 Job Object with kill-on-close, timed out, returned exit `124`, and its long-running child was gone after cleanup.
- REAL RUNTIME VERIFIED: the fixture recorded an autoexec-style harmless marker only; this is not a Blender autoexec claim. The existing staging Blender render remains the evidence for `--disable-autoexec`.
- UNVERIFIED/BLOCKED: the same-user fixture successfully wrote outside the allowed directory (`outside_write_exists=True`), proving Job Objects alone are not a filesystem boundary. The loopback connection had no listening service, so it is not evidence of network restriction.

The POC is PASS only after observing that a hostile fixture cannot write outside the attempt boundary, cannot reach the network, times out cleanly, leaves no descendant process, and cannot produce an accepted output without integrity checks.

Official references: [Windows Sandbox overview](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/), [Sandbox configuration](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file), [Sandbox samples](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-sample-configuration), [Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects).
