# CODEX ARCHITECTURE DIRECTIVE — 2026-08-08

Status: ACTIVE Owner directive.

Before further Production E2E implementation, read in this order:

1. `CURRENT_STATUS.md`
2. `CWS_ROADMAP_MVP_V1.md`
3. `DECISIONS.md`
4. `AGENTS.md`
5. `CWS_SYSTEM_ARCHITECTURE_V1.md`
6. `CWS_SCALABILITY_RULES.md`
7. `CWS_PRODUCTION_E2E_ROADMAP_V2_3.md`
8. current Worker/backend/storage code + latest runtime evidence

## Owner decision

Architecture is now locked around the first stable **100-Worker** target.

Do not continue coding from a one-machine-only assumption.
Do not over-engineer for one million machines.
Do not weaken security to make E2E pass.

Required design rule:

**minimum infrastructure now + secure 100-Worker operation + scalable boundaries later.**

## Mandatory implementation priorities

1. Reconcile current code/docs with `CWS_SYSTEM_ARCHITECTURE_V1.md`.
2. Replace the canonical per-Worker long-lived B2 credential dependency with the smallest verified server-side/task-scoped storage authorization design supported by real Backblaze B2 capabilities.
3. Preserve per-Worker identity, authenticated Backend gateway, least privilege, lease/generation fencing and deterministic recovery.
4. Ensure customer `.blend`/`.zip` is treated as hostile input and Blender arbitrary Python auto-execution is not enabled for normal customer jobs.
5. Complete autonomous heartbeat -> claim -> storage authorization -> download -> real Blender -> upload -> completion -> cleanup.
6. Complete customer UI -> Worker -> review -> SePay sandbox -> delivery.
7. Run AI-OFF Golden E2E.
8. Then run targeted 100-Worker simulations/load tests for heartbeat, concurrent claims, duplicate-claim prevention, worker loss/failover and backend restart durability.

## Security acceptance

Assume one Worker is fully compromised.
The attacker must not gain:

- Supabase service_role
- broad B2/account credential
- unrelated customer objects
- another Worker's credential
- Admin API access
- fleet-wide control

If current implementation violates this, treat it as a blocker/defect before calling architecture complete.

## Simplicity constraints

For the 100-Worker target, prefer existing Backend + Supabase/Postgres + HTTPS Worker API + B2.

Do not add Kafka, Kubernetes, Redis Cluster, NATS, MQTT, service mesh, event sourcing, complex DAG infrastructure or AI scheduling without measured evidence that the current architecture cannot meet the target.

## Manual work rule

No normal production design may require Founder/AI manual action per Job or per Worker.

Adding Worker 2 through Worker 100 must use the same bounded enrollment contract and must not require manual creation of a B2 key per machine.

## Execution mode

Do as much as possible without asking Founder to perform actions Codex can perform.
Only stop for a real external blocker such as missing permission/account access, physical Windows action that cannot be automated remotely, or irreversible Owner decision.

After each verified milestone:

- update `CWS_ROADMAP_MVP_V1.md`
- update `CURRENT_STATUS.md`
- update `DECISIONS.md` for architecture decisions, including superseding obsolete per-Worker B2 credential decisions
- write real evidence under `reports/`
- test
- commit and push `main`

Do not mark runtime work DONE from mocks/unit tests alone.
