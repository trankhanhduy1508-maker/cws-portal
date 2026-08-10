# Engineering Learning Log

## 2026-08-10 — Node Engine/Worker grounding and readiness foundation

- **What changed:** Confirmed the production-backed repository and commit;
  documented the launcher-versus-engine distinction; repaired two stray
  trailing bytes in `worker/test_worker_rpc_auth.py`; added
  `worker/node_engine/` capability discovery and fail-closed readiness modules;
  connected readiness diagnostics to the production Node Agent health probe;
  added two readiness tests.
- **Symptom:** The desktop launcher appeared to be approximately 1 KB, and
  the worker test suite could not be collected.
- **Root cause:** The small files are intentionally wrappers/manifests; the
  actual engines are large canonical modules. The test file contained two
  non-UTF-8 trailing bytes. Production readiness was distributed across
  configuration, DPAPI identity, Blender, backend RPC and runtime evidence
  without one explicit local readiness result.
- **Decision:** Preserve the existing `ACTIVE_IDLE`/RPC/lease/generation
  contracts. Add capability/readiness as a deterministic local admission and
  diagnostics layer; do not invent hardware values or alter backend state.
- **Verification:** Worker suite `98/98` PASS; `python -m compileall -q worker`
  PASS. This is `CODE VERIFIED` only.
- **Not implemented:** Windows service installation, production identity
  enrollment, live heartbeat/claim, real Blender/B2 production evidence,
  update/rollback fleet rollout, payment and Golden E2E.
- **Unresolved risks:** Production worker credentials/configuration are absent
  on this host; all observed production workers remain offline. Legacy
  `cws_worker.bat` contains embedded B2 credential material and remains
  excluded from runtime pending security remediation/rotation.
- **Next highest-priority action:** Verify the new readiness contract on a
  real Windows worker with an enrolled identity and fresh production heartbeat;
  do not mutate Supabase state manually.
