# CWS production Node Agent adapter - 2026-08-07

## Implemented

- `worker/production_node_agent.py` loads a per-worker credential from the
  Windows DPAPI store and rejects missing/unsafe production configuration.
- The loop calls only the authenticated backend RPC gateway. It claims with
  `claim_next_resilient_task`, then obtains the complete dynamic JobSpec with
  `get_claimed_task_spec(task_id, generation)`. The backend injects the
  authenticated worker identity; caller-supplied worker IDs are not trusted.
- `worker_migrations/022_production_dynamic_task_spec_rpc.sql` prepares the
  fenced read-only spec RPC. It derives the existing customer `blend_link`,
  frame range and a deterministic `renders/{job_id}` output prefix; it does
  not require a per-job Worker artifact or hard-coded customer ID.
- Drive input is downloaded over HTTPS using a file ID resolved from the
  canonical Drive link. B2 input uses `b2://bucket/key`. Both paths stream to
  an attempt-local file and reject unsafe input schemes/keys.
- B2 output is uploaded per frame with job/task/attempt/generation/frame and
  SHA-256 metadata. Existing verified frames are reused; stale fencing is
  checked before upload and immediately before final completion.
- JobSpec output prefixes are now validated as bounded relative object paths;
  the production downloader only permits Google Drive/Google API HTTPS hosts
  or the configured B2 bucket, preventing arbitrary HTTPS fetches and path
  injection from becoming a Worker SSRF/storage escape.
- Blender is launched by `worker_engine.py` through the existing
  `BlenderCliRenderer` with auto-execution disabled and optional Windows Job
  Object containment. The launcher is `node-agent-production.bat`; legacy
  `cws_worker_full.py` and `cws_worker.bat` are not used.

## Verification

- Worker suite: **59/59 PASS**; Python compile PASS.
- Backend Worker RPC test: **6/6 PASS**; backend build PASS.
- New tests cover missing production configuration, authenticated worker
  identity override protection, dynamic JobSpec mapping, Drive ID parsing,
  assignment validation and no plaintext-token output.
- No cloud credentials were available in this session. No migration was
  applied and no production job/payment/output was created.

## Remaining runtime gates

1. Apply the reviewed 020/021 contract and migration 022 to the intended
   production Supabase project.
2. Provision one physical Windows Worker with Blender, DPAPI credential,
   B2 least-privilege key and the production environment variables.
3. Set the production Google Drive API key required to resolve the supplied
   folder, then run one authenticated job and collect task/attempt/Blender/B2
   evidence.

**Status: CODE/UNIT VERIFIED; REAL PRODUCTION E2E NOT VERIFIED.**
