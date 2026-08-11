# CWS SCALABILITY RULES

> Status: ACTIVE
> Added: 2026-08-08
> Updated: 2026-08-11
> Purpose: Mandatory architecture rules for any CWS implementation that can affect fleet growth or production operations.

---

# 1. SCALE-BY-DESIGN — MANDATORY

Every production design must be evaluated against fleet growth before it is accepted.

The target mental model is not only 1 Worker or 10 Workers. For every design, ask whether the same operating model remains viable at approximately:

- 100 Workers
- 1,000 Workers
- 1,000,000 Workers

This does NOT mean prematurely building infrastructure sized for one million machines. It means avoiding architecture whose operating cost, manual work, secret management, provisioning steps, or control-plane complexity grows linearly with every Worker when that growth can reasonably be automated or centralized.

A solution is unacceptable as the long-term canonical design if adding Workers requires the Founder/operator to repeat a manual production action per machine that cannot be safely automated.

Examples of unacceptable fleet-wide patterns:

- manually creating a storage application key for every Worker
- manually copying long-lived secrets onto every Worker
- manually creating database rows for every Worker when secure enrollment can create them
- manually advancing normal job states
- requiring AI/Codex to operate the runtime
- creating one backend/project/service/bucket per Worker
- requiring an operator to edit production configuration every time one Worker is added

---

# 2. O(1) OPERATOR EFFORT FOR NORMAL FLEET GROWTH

The intended operator experience is:

`install/enroll Worker -> authenticate securely -> receive machine identity/config -> become schedulable`

Adding Worker N+1 should require approximately the same bounded setup flow regardless of whether the fleet has 10, 100, or 100,000 Workers.

Bulk enrollment and unattended deployment should be possible without redesigning the runtime architecture.

Manual Founder action may exist for account-level bootstrap, irreversible production approval, or root-secret rotation, but must not be repeated for every normal Worker or every normal job.

---

# 3. NO LONG-LIVED STORAGE MASTER CREDENTIAL ON WORKERS

Canonical long-term storage architecture:

- long-lived Backblaze B2/account-level credentials remain server-side in trusted infrastructure
- Workers authenticate to the CWS Backend using their per-Worker identity
- for a claimed job, Backend grants only the minimum storage capability required for that job/object set
- storage authorization must be short-lived or otherwise narrowly scoped and revocable
- Worker must not require a Founder-created B2 application key per machine

Preferred behavior:

`Worker auth -> claim Job -> Backend issues job-scoped storage access -> download/render/upload -> access expires/revokes`

The exact B2 mechanism must be selected from current supported APIs and verified against production constraints. Do not invent a signed-URL feature if B2 does not support the required operation directly; use the safest supported server-mediated or temporary-authorization design.

A temporary scoped B2 key on the first test Worker may be used only as an explicitly documented bootstrap experiment if absolutely required to unblock evidence. It must not become the canonical fleet provisioning model, and P7 scale readiness cannot PASS while per-Worker manual B2 key creation remains required.

---

# 4. NO AI RUNTIME DEPENDENCY

Production jobs and fleet operations must continue when ChatGPT, Codex, Claude, Kimi, or any other AI is offline.

AI may develop, inspect, debug, or analyze the system. AI must not be a required production orchestration component.

Expected runtime actions such as claim, heartbeat, retry, render, upload, state transitions, cleanup, recovery, payment handling, and delivery must be deterministic code/state-machine behavior.

---

# 5. CENTRALIZE SECRETS, DISTRIBUTE CAPABILITIES

Prefer:

- centralized long-lived account credentials
- per-Worker identity credentials
- short-lived/job-scoped capabilities
- automatic rotation/revocation
- machine-bound secure local storage only for the Worker identity credential where appropriate

Avoid distributing account-level secrets across the fleet.

Compromise of one Worker should not expose credentials that grant broad access to other Workers, unrelated jobs, or the entire storage account.

---

# 6. ZERO ADMIN APPROVAL IN NORMAL CUSTOMER RUNTIME

Founder decision (2026-08-11): normal Customer jobs must be fully automatic after Google login and submission.

Canonical Customer runtime:

`Google Login -> Upload/Drive -> Validate -> Queue -> Scheduler -> Worker -> Render -> B2 -> Preview/Pricing/QR -> SePay verify -> Unlock -> Download -> Cleanup`

The normal runtime MUST NOT require Founder/Admin approval, manual state advancement, manual Worker assignment, manual payment confirmation, or AI intervention.

Admin exists for observability, security exceptions, incident handling, configuration, and explicit operational overrides only. Admin is not a mandatory hop in the Customer E2E workflow.

---

# 7. ZERO PER-WORKER FOUNDER APPROVAL IN NORMAL PROVISIONING

Founder decision (2026-08-11): normal Worker enrollment/restart must not require the Founder/Admin to approve each machine individually.

The current bounded enrollment ticket mechanism may remain as a security primitive, but its long-term canonical use MUST be automated by the provisioning/onboarding system rather than requiring a manual Admin Google OAuth + TOTP/AAL2 action for every Worker.

Allowed human interaction:

- one-time fleet/site onboarding bootstrap
- security incident review
- irreversible/root-secret rotation
- explicit exceptional operations

Not allowed as the canonical normal path:

- Founder approves each Worker
- Admin issues one ticket manually per Worker
- Founder edits Supabase rows per Worker
- Founder copies credentials/secrets to each Worker
- Admin intervention on normal Worker restart/reconnect

Target fleet behavior:

`fleet/site onboard once -> unattended/bulk provisioning -> Worker receives or redeems authorized bootstrap material -> creates its own identity credential -> stores machine-bound credential -> heartbeat -> schedulable`

Adding the 101st/1,001st Worker must not create a new manual Founder approval step.

---

# 8. SCALE REVIEW REQUIRED FOR ARCHITECTURE CHANGES

Before accepting any new production architecture or provisioning design, Codex/agents must answer:

1. What manual action is required per Worker?
2. What manual action is required per job?
3. What secret exists on each Worker?
4. What happens if one Worker is compromised?
5. Does adding the 101st or 1,001st Worker require a new manual process?
6. What component becomes a bottleneck as fleet size increases?
7. Can the design be automated without changing the public/runtime contract?
8. Does the design create one infrastructure resource per Worker unnecessarily?
9. Does the normal Customer workflow require any Admin approval?
10. Does the normal Worker lifecycle require per-machine Founder/Admin approval?

If a design obviously creates a linear manual-operations bottleneck, agents must reject or mark it temporary and propose the scalable replacement before calling the architecture complete.

---

# 9. MVP FIRST DOES NOT MEAN SCALE-DEAD-END

CWS still follows MVP-first and no-over-engineering rules.

Therefore:

- do not build million-node infrastructure before demand exists
- do not add brokers, microservices, or complex distributed systems without evidence
- DO choose interfaces, credential boundaries, enrollment flow, storage authorization, and state machines that do not force a rewrite simply because the fleet grows

The correct target is: **minimum implementation now, scalable boundary by design.**

---

# 10. DEFINITION OF SCALE-READY PROVISIONING

A Worker provisioning design is scale-ready only when:

- no Founder-created B2 key is required per Worker
- no Supabase service-role or account-level storage credential is placed on a Worker
- Worker identity enrollment is securely automatable
- normal restart/recovery does not require human or AI intervention
- adding many Workers does not require creating duplicate Vercel/Supabase/B2/Render infrastructure
- revoking one Worker does not require rotating credentials for the entire fleet
- the same logical workflow can be bulk-deployed to 100+ Workers without per-machine secret hand-editing
- normal Customer jobs require zero Admin approval
- normal Worker enrollment/restart requires zero per-machine Founder/Admin approval

These are architecture acceptance criteria, not optional future improvements.
