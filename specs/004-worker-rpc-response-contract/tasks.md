# Tasks — Production Worker RPC Response Contract Fix

- [x] T001 Record the real HTTP 201/plain-text `healthy` evidence and source
  contract mismatch.
- [x] T002 Implement compatible successful-response parsing in
  `worker/worker_rpc_auth.py`.
- [x] T003 Add JSON/plain-text/empty/error response tests.
- [x] T004 Run Worker and backend regression tests.
- [x] T005 Deploy/restart through the existing canonical Worker path and run real MAY083
  probe, heartbeat and B2-only claim verification.
- [x] T006 Update production evidence, CURRENT_STATUS and active roadmaps;
  commit and push main.
