# Plan — Production Worker RPC Response Contract Fix

## Implementation

Change only `worker/worker_rpc_auth.py`: decode a successful response as JSON
when possible and return the decoded value; if the body is non-empty but not
JSON, return UTF-8 text. Preserve HTTP status validation and existing exception
behavior.

Add focused tests in `worker/test_worker_rpc_auth.py` using the existing
standard-library test style. No production schema or dependency changes.

## Verification

- run the focused Worker RPC tests and full Worker suite;
- run backend Worker RPC tests/build as regression checks;
- deploy the existing canonical backend/Worker source through the existing
  repository path only;
- run the real MAY083 probe and heartbeat;
- run the real B2-only claim request and verify no assignment/no mutation.

## Rollback

Revert the focused Worker client commit and restart the existing Node Agent.
No database rollback is required.
