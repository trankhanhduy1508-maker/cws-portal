# Track A Self-Bootstrap V1

Date: 2026-08-14  
Scope: legacy `cws_worker.bat` -> `cws_worker_full.py` path only

## Contract

The launcher follows `DETECT -> INSTALL/RECOVER IF MISSING -> VERIFY -> CACHE -> CONTINUE`:

| Dependency | Detect/reuse | Recovery source | Verification and cache |
|---|---|---|---|
| Python 3.12.7 embeddable | `CWS_DIR\PythonEmbed\python.exe` | Official `python.org` embeddable ZIP | SHA-256 pin, extraction check, `python.exe --version`; retained in `PythonEmbed` |
| pip bootstrap | `get-pip.py` only during Python recovery | Official `bootstrap.pypa.io` | SHA-256 pin, Python exit-code check, temporary script removed |
| requests, boto3, Pillow | Import check in current Worker | Official PyPI simple index, binary wheels only | Installed only when import is missing; narrow version constraints; import is retried by the Worker |
| Blender 5.2.0 portable | `CWS_DIR\Blender\...\blender.exe` | Official `download.blender.org` ZIP | bounded download, ZIP/path/size/member checks, executable check; retained in `Blender` |
| ZIP/archive support | Python standard library `zipfile` | none | no extra package is installed; RAR/7-Zip is not part of this legacy Track A contract |

Python 3.12.7 is retained as the existing Worker compatibility pin. The official release page identifies newer 3.12 maintenance releases; changing this pin requires a separate compatibility and runtime-evidence task. See the [official Python 3.12.7 release](https://www.python.org/downloads/release/python-3127/).

## Safety boundary

- No winget, Microsoft Store, arbitrary mirror, remote script execution, or broad package upgrade is used by the Worker launcher.
- Python and `get-pip.py` artifacts are hash-checked before use.
- Blender is fetched only from the official Blender host. No repository-approved Blender SHA pin was present, so the implementation performs bounded download and structural archive validation, then caches the verified executable.
- Existing healthy runtimes are reused; the launcher does not redownload them per job.
- The Worker architecture, claim flow, render policy, customer settings, Supabase/B2 contract, and restart loop remain unchanged.

## Verification status

Static contract checks and `git diff --check` are the verification available on this host. Python and Blender are not installed here, so no production Worker launch or full render was run. Running `cws_worker.bat` was intentionally avoided because its normal path performs update checks and enters the production Worker loop.

The normal launcher now also supports `cws_worker.bat --bootstrap-only`. This
path verifies Python packages and the cached Blender executable, then exits
before update checks, Supabase/B2 calls, task claiming or rendering. It is the
smallest safe runtime gate before the full customer render.

Next smallest safe action: run the bootstrap-only path once on a
Founder-controlled machine with a durable `CWS_DIR`, then capture runtime
evidence before measuring the full customer project render.

## Current runtime evidence

- Bootstrap-only first run: PASS after fixing the embeddable-Python script-path
  import boundary.
- Bootstrap-only rerun: PASS; cached Python 3.12.7, package imports and Blender
  5.2.0 were reused without redownload.
- Google Drive metadata: expected file name confirmed, stored size 929,022,719
  bytes.
- Google Drive raw connector fetch: refused by the connector's 100 MiB limit.
- Existing Track A HTTP download: redirected to Google sign-in and therefore
  stopped with an explicit authenticated-session error. No customer `.blend`
  bytes were uploaded or sent to a third-party scanner.
- Full project render: BLOCKED until an authenticated, approved transfer path
  can materialize the original working copy locally.
