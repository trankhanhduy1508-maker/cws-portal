# CWS Node Engine / Worker Foundation Evidence — 2026-08-10

## Scope

This report covers the first implementation slice after the Spec Kit gate. It
does not claim Windows or production runtime readiness.

## Evidence

- Production Vercel metadata points to `trankhanhduy1508-maker/cws-portal`,
  `main`, commit `67b9369b015e7806da072128501cbb35e231c5b8`.
- Launcher sizes: `node-agent-production.bat` 224 bytes and
  `worker-engine.bat` 152 bytes.
- Implementation sizes: `production_node_agent.py` 39,561 bytes,
  `node_agent.py` 9,069 bytes, `worker_engine.py` 40,102 bytes.
- Before repair, test collection failed on two trailing bytes in
  `worker/test_worker_rpc_auth.py`.
- After the minimal repair and readiness additions: `98/98` worker tests PASS;
  Python compileall PASS.
- Running `python worker/production_node_agent.py --once` without configuration
  fails closed at `CWS_BACKEND_URL`; no network call or database mutation is
  attempted.

## Implemented foundation

- `worker/node_engine/capabilities.py` discovers non-secret OS, CPU, RAM, disk,
  NVIDIA/VRAM/driver/CUDA and Blender metadata with truthful unknown values.
- `worker/node_engine/readiness.py` evaluates HTTPS backend, stable ID,
  credential-file presence, workspace, disk and Blender readiness fail-closed.
- `production_node_agent.py` records sanitized readiness/capability diagnostics
  during the authenticated health probe; it does not alter scheduler, claim,
  payment or database authority.

## Verification level

`CODE VERIFIED`. No production worker was started and no Supabase mutation was
performed by this change.

## Remaining gate

Windows service/identity/configuration and fresh production heartbeat remain
unverified. Production E2E remains blocked until those external runtime
prerequisites are available.
