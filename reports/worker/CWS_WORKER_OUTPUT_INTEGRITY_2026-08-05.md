# CWS Worker Output Integrity Evidence — 2026-08-05

## Capability

Generic Worker Engine validates render output before checkpoint/upload.

- PNG: minimum size, PNG signature, IHDR chunk, width/height > 0.
- Other formats: conservative minimum-size validation remains in force.
- No customer code is executed by the validator.
- No filename alone or Blender exit code alone is treated as proof of valid output.

## Implementation

- `worker/worker_engine.py`
- `OutputIntegrityValidator`
- generic JobSpec-driven engine; no job/customer/credential hard-coding.

## Verification

Windows Python runtime:

`G:\CWS_Render\PythonEmbed\python.exe`

Commands:

```text
python -m py_compile worker\worker_engine.py
python -m unittest discover -s worker -p 'test_*.py' -v
```

Result: **21/21 PASS**.

Negative test: truncated PNG bytes rejected as retryable output failure.
Positive test: structurally valid PNG header with non-zero dimensions accepted.

## Classification

- CODE/UNIT VERIFIED: output integrity rules and failure behavior.
- REAL RUNTIME VERIFIED: validator executed on the Windows staging Python runtime.
- UNVERIFIED: full production render/output path and B2 upload verification.
- BLOCKED: production/staging B2 adapter credentials and real customer-job integration are not used in this test.

## Safety

No production data, B2 objects, credentials, power state, reboot, shutdown, logoff, or sleep were changed.
