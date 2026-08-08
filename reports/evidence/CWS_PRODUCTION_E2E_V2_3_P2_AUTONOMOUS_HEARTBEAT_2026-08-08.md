# CWS Production E2E V2.3 P2 — autonomous heartbeat evidence

Date: 2026-08-08

## Result

P2 autonomous heartbeat is **RUNTIME VERIFIED** on physical Windows Worker
MAY083. This is not a P3 claim/render PASS.

## Runtime evidence

- Worker ID: `CWS-BAE2782D20525D46`
- Canonical process: `worker/production_node_agent.py --heartbeat-only`
- Windows PID: `3208`
- First production read: `last_seen_at=2026-08-08 04:10:26.544626+00`
- Later read after more than one heartbeat cycle:
  `last_seen_at=2026-08-08 04:11:29.66472+00`
- Both reads: `status=idle`, `observed_state=ACTIVE_IDLE`,
  `state_reason=heartbeat_only`, `current_task_id=null`.
- Process remained alive during the interval. No Codex loop issued the repeated
  pings; the Node Agent process performed them.

## Safety

`--heartbeat-only` is an explicit maintenance/readiness mode and cannot claim a
task. It exists because production currently has legacy Drive tasks that must
not be claimed blindly while preparing a controlled B2 Golden job. Normal
production rendering remains the existing `run_forever` path.

No B2 credential or Supabase service-role exists on MAY083. Its only runtime
secret is the per-Worker DPAPI-protected HMAC identity.

## P3 gate

Production currently has no `render_orders.uploaded_file_b2_key` row. The seven
currently claimable queued tasks all reference historical Google Drive inputs;
four correspond to cancelled customer orders. A controlled authenticated B2
upload/customer job is required before switching MAY083 from maintenance
heartbeat to normal claim mode. No backlog task was claimed or mutated for this
P2 proof.
