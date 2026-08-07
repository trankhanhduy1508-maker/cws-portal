# CWS_SCALING_ROADMAP.md

## Scope

Scale safely from the MVP control plane. PostgreSQL/Supabase remains the
durable source of truth; no Redis/broker is added until isolated measurements
prove a real presence, lock or progress bottleneck.

## P0 status — 2026-08-07

- `DONE (CODE/UNIT VERIFIED)`: POST `/jobs` durable idempotency and request
  fingerprint; same-key retries return one Job and mismatched payloads reject.
- `DONE (CODE/UNIT VERIFIED)`: payment intent uniqueness migration is additive
  and fails closed when historical duplicates exist. Applying it to staging or
  production still requires the database owner/runbook.
- `DONE (CODE/UNIT VERIFIED)`: uploads are disk-streamed with bounded body/file
  limits, abort cleanup and B2 failure cleanup.
- `DONE (CODE/UNIT VERIFIED)`: scheduler tick single-flight, one presence
  snapshot and batched task reads prevent avoidable amplification.
- `DONE (CODE/UNIT VERIFIED)`: Worker claim generation/fencing prevents
  duplicate claim/finalize and stale completion.
- `SIMULATED_LOAD_VERIFIED`: real Nest loopback harness passes 10/25/50/100
  customer scenarios with independent test proxy IPs.
- `NEEDS_VERIFICATION`: Supabase/RLS connection limits, B2 bandwidth, physical
  Worker throughput, realtime fanout and payment provider capacity.

## Next gate

Run the isolated staging ramp 10 → 25 → 50 → 100 with real Supabase/RLS, B2,
at least one authenticated Worker and payment sandbox before making any
production capacity claim. Keep Render → Preview → Payment → Download order.
