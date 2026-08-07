# Production provisioning gate final blocker — 2026-08-07

## Host and registry comparison

- Windows host: `MAY083`.
- GPU: `NVIDIA GeForce RTX 2060 SUPER`.
- Production `workers` registry contains 29 offline IDs and VRAM values, but
  has no hostname, serial number, machine fingerprint or current boot/session
  mapping. Reusing any offline ID would be an unverified impersonation.
- No `CWS_WORKER_ID`, DPAPI credential file, backend URL, B2 endpoint/bucket/
  key, output prefix or Drive API key exists in process/user/machine env.

## Completed before blocker

- Production migrations 020/021/022 applied and RPC/table verification PASS.
- Canonical Node Agent package copied to the existing Desktop Worker package.
- Blender 5.2.0 portable runtime installed and archive hash verified.
- Launcher direct-execution/import issue fixed and fail-fast config validation
  verified.

## Single external blocker

An authorized operator must map this physical host to a specific production
Worker ID and provide the scoped B2 runtime credential/configuration. Codex
cannot infer this mapping from the current schema and must not generate or
reuse a credential without that explicit binding.

No production job, B2 mutation, completion or customer download was attempted.
