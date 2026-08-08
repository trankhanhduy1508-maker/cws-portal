# CWS PRODUCTION E2E ROADMAP V2.2

> Date: 2026-08-08
> Purpose: Shortest safe path from the current repository state to one real production customer job completed end-to-end on one real physical Windows Worker.
> Status: ACTIVE execution roadmap under `CWS_ROADMAP_MVP_V1.md`.
> Review basis: Kimi independent review V2.1 (2026-08-08) + repository source-of-truth review.

---

## 0. FINAL DECISIONS

### Architecture — KEEP

Keep the current production architecture:

`Node Agent -> authenticated Backend Worker RPC -> Supabase`

Keep:

- per-worker credential
- HMAC-signed Worker RPC
- DPAPI-protected Worker credential on Windows
- scoped B2 application key
- generation fencing / resilient claim flow
- dynamic JobSpec
- existing generic Worker Engine

Do NOT:

- put Supabase `service_role` key on a Worker
- replace the current Worker auth with a shared global secret
- rewrite the Worker architecture just to simplify MVP
- reintroduce legacy `cws_worker_full.py` as the canonical production path
- add Redis/NATS/MQTT/microservices before Golden E2E

### Provisioning — SIMPLIFY

For MVP, provisioning must be one-command / one-script as far as practical.

The script may:

1. accept or derive the candidate machine identity
2. create/select a stable system-managed Worker ID
3. create a per-worker random token
4. provision the required backend/DB mapping through an authorized path
5. DPAPI-encrypt the token on that Windows machine
6. store the credential file with safe ACL guidance
7. configure or print the required `CWS_*` runtime variables
8. run a read-only preflight

Do not require `worker_identities` or `worker_leases` for Golden E2E unless current runtime code proves they are actually required.

`MAY083` is only the first physical test machine. Do not hard-code `MAY083` as a long-term architectural identity rule.

---

# P0 — PRODUCTION REALITY CHECK

**Status: DONE — 2026-08-08.** Production migration/schema/RPC state was
verified directly. Migrations 020/021/022 were already present and were not
re-applied. Migration `worker_rpc_gateway_only` closed historical direct
publishable-key Worker RPC access while preserving Backend `service_role`
execution. Evidence:
`reports/evidence/CWS_PRODUCTION_E2E_V2_2_P0_REALITY_CHECK_2026-08-08.md`.

## Goal

Establish the real production state before any mutation.

## Mandatory checks

Codex must read, in this order:

1. `CURRENT_STATUS.md`
2. `CWS_ROADMAP_MVP_V1.md`
3. `DECISIONS.md`
4. `AGENTS.md`
5. `CODEX_CONSTITUTION.md`
6. `CODEX_GLOBAL_RULES.md`
7. this file
8. code/tests/evidence relevant to Worker provisioning and production E2E

Then verify production directly wherever access exists.

### Verify, do not assume

The repository contains conflicting historical statements about migrations 020/021/022. Therefore:

- do NOT assume migration 022 is missing
- do NOT assume migrations 020/021/022 are fully applied
- inspect production schema/RPC state directly
- verify the actual existence and callable state of required Worker RPCs, including the current equivalents of:
  - `worker_ping`
  - `claim_next_resilient_task`
  - `get_claimed_task_spec`
  - heartbeat/progress reporting
  - completion/failure RPCs
- apply only genuinely missing migration(s)
- never blindly re-apply production migrations from stale documentation

## PASS condition

A short evidence report states the actual production state and identifies the first real blocker with evidence.

---

# P1 — ONE-COMMAND PHYSICAL WORKER PROVISIONING

## Goal

Provision the first real physical Worker without redesigning the security model.

## Required runtime contract

The canonical production Node Agent must retain its current model:

- `CWS_BACKEND_URL`
- stable `CWS_WORKER_ID`
- `CWS_WORKER_CREDENTIAL_FILE`
- `CWS_WORKSPACE`
- scoped `CWS_B2_*`
- optional Blender / Drive configuration only where required by the existing code path

The Worker must not contain a Supabase service-role key.

## Required implementation

Codex should create or improve one provisioning script/tool that minimizes Founder manual work.

It must fail closed and must never print or commit secrets.

If an operation truly requires Founder-owned production credentials or must execute on the physical Windows machine because of DPAPI, Codex should automate everything around that step and leave the smallest possible explicit Founder action.

## PASS condition

On MAY083 (first test machine):

- stable Worker ID selected/provisioned
- per-worker token created
- token stored through DPAPI on that same Windows machine
- required CWS runtime configuration present
- scoped B2 credential configured
- Node Agent preflight passes

---

# P2 — FIRST PRODUCTION HEARTBEAT

## Goal

Prove a real physical Worker is authenticated and visible to production.

## PASS evidence

Must show real evidence that:

- MAY083 starts canonical production Node Agent
- authenticated `worker_ping`/heartbeat succeeds
- production Worker row shows fresh `last_seen_at`
- Worker becomes eligible/online according to current scheduling rules
- no shared secret or Supabase service-role key is exposed on the Worker

No simulated PASS.

---

# P3 — REAL CLAIM -> BLENDER -> B2 -> COMPLETION

## Goal

Prove the core render pipeline on one real production task.

## Required path

1. one controlled production test job/task exists
2. MAY083 claims it through the canonical resilient claim path
3. dynamic JobSpec is fetched
4. input is downloaded safely
5. Blender launches as a real process
6. render output is produced
7. output integrity/checkpoint logic runs
8. output is uploaded to scoped B2 path
9. progress/heartbeat is reported
10. task/job reaches the correct review/completion state
11. Worker cleanup runs and returns to idle state

## PASS evidence

Evidence must include at minimum:

- real task/job ID
- real Worker ID
- real Blender PID/process evidence
- real B2 object evidence
- real backend/Supabase completion state

---

# P4 — CUSTOMER UI -> REAL WORKER

## Goal

Connect the existing customer production UI to the proven Worker path.

## PASS path

Customer UI -> backend -> durable job/task -> MAY083 -> Blender -> B2 -> realtime status/progress -> `REVIEW_READY` (or current canonical equivalent).

No fake progress, browser-only mock completion, or demo-only render path is allowed.

Support both currently approved input types only where repository code already defines them (for example `.blend` / approved `.zip` flow). Do not add unrelated formats.

---

# P5 — PAYMENT SANDBOX -> DELIVERY

## Goal

Verify the post-render commercial flow before live bank payment.

## Required order

Render/review must complete before payable flow becomes available.

Use the existing approved SePay sandbox/test flow first.

## PASS path

`REVIEW_READY -> approve/final amount -> QR/payment code -> SePay sandbox webhook -> PAID -> authorized/signed B2 final download`

Verify that payment amount uses the current approved pricing/runtime evidence in the repository.

Do not switch to live payment merely to satisfy this phase.

---

# P6 — GOLDEN PRODUCTION E2E

## Goal

One real customer-facing flow through the entire production chain.

## GOLDEN PASS

A single traceable job must prove:

1. customer opens canonical production Vercel site
2. authenticates if current production workflow requires it
3. uploads/adds an approved project input
4. real backend creates job/task
5. real production scheduler exposes task
6. real MAY083 Node Agent authenticates
7. MAY083 claims task
8. dynamic JobSpec is received
9. project input downloads successfully
10. real Blender process runs
11. progress is reported
12. output is created
13. output reaches B2
14. backend marks review-ready state
15. customer sees real progress/result state
16. approved payment amount is created
17. SePay sandbox confirms payment
18. payment becomes PAID
19. authorized final download is generated
20. customer downloads final result

Golden E2E is not DONE without runtime evidence across the entire chain.

---

# P7 — FAILURE / FAILOVER / SCALE

Start only after P6 Golden E2E passes.

Then verify, in priority order:

1. Worker crash recovery
2. stale heartbeat / task recovery
3. retry budget
4. generation fencing
5. two-Worker failover
6. provisioning second/third machine using the same stable identity process
7. measured production/staging capacity
8. scale work only where evidence shows an actual bottleneck

Do not add new brokers or distributed infrastructure without measured need.

---

# BLOCKER POLICY FOR THIS ROADMAP

Codex may stop only for a real external blocker such as:

- missing permission
- missing production secret/credential
- missing account/API access
- a step that must physically execute on MAY083 under the correct Windows account (for example DPAPI)
- an irreversible production action requiring Owner decision

Codex must NOT stop merely because:

- there are multiple implementation choices
- documentation is messy
- a refactor would be cleaner
- it wants to redesign architecture
- it cannot obtain perfect certainty before doing safe read-only verification

When blocked:

1. complete every safe task that does not require the missing dependency
2. produce exact evidence of the blocker
3. reduce the Founder action to the minimum possible step
4. state the exact next command/action and expected PASS signal

---

# DOCUMENTS-BEFORE-CODE / SOURCE-OF-TRUTH SYNC

Follow `AGENTS.md`.

After each verified milestone:

- update `CWS_ROADMAP_MVP_V1.md` status where applicable
- update `CURRENT_STATUS.md`
- update `DECISIONS.md` only if a real decision changed
- write evidence under `reports/`
- commit with a small scoped commit

Do not mark runtime work DONE from unit tests alone.

If docs conflict with newer code/tests/runtime evidence, reconcile the docs before moving on.

---

# CODEX EXECUTION MODE

Codex must work from P0 forward continuously.

Priority:

`Golden E2E > minimum safe provisioning > real runtime evidence > refactor/cleanup`

Do as much as possible without asking the Founder to perform steps Codex can do itself.

Do not create new Vercel projects, Supabase projects, B2 buckets, Render services, or parallel CWS infrastructure unless the Owner explicitly orders it.

Canonical deployment resources already exist; inspect and reuse them.

---

# NEXT MILESTONE

**First authenticated heartbeat from MAY083 into production using the canonical Node Agent.**

After that, immediately continue to one real claim/render/B2 completion unless a real blocker appears.
