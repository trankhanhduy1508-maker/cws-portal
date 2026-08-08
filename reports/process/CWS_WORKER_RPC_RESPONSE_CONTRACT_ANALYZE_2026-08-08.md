# Analyze — Production Worker RPC Response Contract Fix

## Evidence

The authenticated MAY083 request to the canonical endpoint
`POST https://cws-portal.onrender.com/worker/rpc/report_worker_probe` returned:

- HTTP `201`
- body `healthy`

The current `worker/worker_rpc_auth.py:WorkerRpcClient.call_path()` reads the
successful body and unconditionally executes `json.loads(raw.decode("utf-8"))`.
This produced a real `JSONDecodeError` and left production
`workers.health_state=PROBING`.

## Cross-check

- Requirement missing: successful plain-text RPC bodies are not represented in
  the client contract.
- Contradiction: Backend returns a valid successful string body while Worker
  assumes every successful body is JSON.
- Architecture conflict: none; the fix is confined to response decoding.
- Security: non-2xx handling remains unchanged; no credential/logging change.
- Scale: no new request, retry, dependency, or scheduler behavior.
- Fake/demo risk: none; the failing response is from a real authenticated
  production Worker request.
- Regression risk: JSON RPC responses must remain unchanged; focused tests are
  required.

## Decision

Implement the smallest additive parser: JSON first, then UTF-8 text for a
non-empty successful response, with empty body as `None`. Do not change the
backend response, schema, or Worker RPC authentication boundary.
