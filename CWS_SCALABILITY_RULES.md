# CWS SCALABILITY RULES

> Status: ACTIVE
> Added: 2026-08-08
> Updated: 2026-08-12
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
- manually choosing/typing Worker IDs for every machine
- manually issuing/copying one enrollment ticket per normal Worker
- manually advancing normal job states
- requiring AI/Codex to operate the runtime
- creating one backend/project/service/bucket per Worker
- requiring an operator to edit production configuration every time one Worker is added

---

# 2. O(1) OPERATOR EFFORT FOR NORMAL FLEET GROWTH

The intended operator experience is:

`authorize fleet/site once -> provision Worker unattended -> system generates identity -> authenticate securely -> become schedulable`

Adding Worker N+1 should require approximately the same bounded automated setup flow regardless of whether the fleet has 10, 100, or 100,000 Workers.

Bulk enrollment and unattended deployment must be possible without redesigning the runtime architecture.

Manual Founder action may exist for account/site-level bootstrap, irreversible production approval, or root-secret rotation, but must not be repeated for every normal Worker or every normal job.

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

# 7. AUTOMATIC WORKER IDENTITY + ZERO PER-WORKER FOUNDER APPROVAL

Founder decision (2026-08-12): normal Worker provisioning must not require the Founder/Admin to choose a Worker ID, issue/copy an enrollment ticket manually for each machine, approve each machine individually, or repeat any enrollment action per job.

Worker identity is system-generated. On first authorized provisioning of a physical PC, the provisioning/enrollment system must automatically create a unique stable Worker ID and obtain/store the machine-bound credential through the authenticated Backend boundary.

The current bounded enrollment-ticket mechanism may remain as an internal security primitive, but its normal use MUST be automated by the provisioning/onboarding system. A human must not need to copy a ticket or type a Worker ID into every PC.

Allowed human interaction:

- one-time fleet/site onboarding or trust bootstrap
- security incident review
- irreversible/root-secret rotation
- credential revocation/recovery or other explicit exceptional operations

Not allowed as the canonical normal path:

- Founder chooses or types each Worker ID
- Founder approves each Worker
- Admin issues one ticket manually per normal Worker
- Founder edits Supabase rows per Worker
- Founder copies credentials/secrets to each Worker
- Admin intervention on normal Worker restart/reconnect
- any enrollment/ticket action triggered by each customer Job

Target fleet behavior:

`fleet/site authorize once -> unattended PC provisioning -> system generates unique stable Worker ID -> authorized bootstrap material is issued/redeemed automatically -> machine-bound credential stored -> Node Agent authenticates -> heartbeat -> schedulable`

Worker identity is per physical Worker, not per Job. Adding the 101st/1,001st Worker must not create a new manual Founder approval or ticket-copy step.

If the current implementation still requires a manually entered Worker ID or manually issued ticket for the single-PC MVP test, that is a **provisioning implementation gap**, not the accepted target workflow.

---

# 8. PARTNER GOLDEN IMAGE + PER-MACHINE STATE

Founder decision (2026-08-11): for approved net-cafe/office partners, CWS runtime components should be installed in the partner's canonical Windows/BootROM Golden Image so reboot/reset does not remove the CWS software stack.

The Golden Image may contain shared non-secret runtime components such as Node Agent code, Worker Engine code, Blender/runtime dependencies, the canonical startup wrapper/service, and shared non-secret Backend/site configuration.

The Golden Image MUST NOT contain one copied Worker credential used by all machines. Worker identity and authentication credential remain unique per physical PC and should live in the partner's supported per-machine persistent/writeback state when available.

Normal reboot behavior:

`boot shared image -> load existing per-machine Worker identity/credential -> Node Agent auto-start -> heartbeat -> ACTIVE_IDLE`

Normal reboot must not trigger re-enrollment. Enrollment/re-enrollment is limited to first enrollment, credential loss/corruption, reprovisioning/hardware replacement, or explicit revocation recovery.

If a specific BootROM product cannot persist per-machine state, bounded unattended re-enrollment is allowed as a fallback only; it must not become the default reboot path for all partners.

---

# 9. ONE RESIDENT NODE AGENT; EPHEMERAL WORKER ENGINE

Founder decision (2026-08-11): the canonical Windows runtime has one always-resident supervisor, the Node Agent.

Required process model:

`Windows boot -> Node Agent service -> authenticate/heartbeat -> ACTIVE_IDLE -> claim task -> launch Worker Engine -> Blender/render/upload/verify -> Worker Engine exits -> cleanup -> ACTIVE_IDLE`

Rules:

- Node Agent auto-starts with Windows through one canonical production startup mechanism.
- Prefer a Windows Service with automatic/delayed start plus startup jitter/backoff suitable for fleets booting together.
- Worker Engine is not a second permanent service and should not stay alive while no job is assigned.
- Node Agent remains alive across jobs and owns lifecycle/state supervision.
- Duplicate Node Agent instances are forbidden; competing Startup Folder/Scheduled Task/.bat/service production startup paths must be removed or disabled.
- Temporary Backend/network outages must use bounded retry/backoff; they must not require Admin/AI restart.
- Worker Engine or Blender failure must not permanently kill the resident Node Agent.
- Legacy `cws_worker_full.py` is not the canonical auto-start production runtime.

This process boundary reduces idle process load, duplicate claims and fleet startup ambiguity while preserving one clear owner for recovery.

---

# 10. SCALE REVIEW REQUIRED FOR ARCHITECTURE CHANGES

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
11. Is Worker ID system-generated rather than Founder-entered?
12. Does normal provisioning avoid manual per-Worker ticket handling?
13. Does a normal partner PC reboot reuse its existing per-machine identity without re-enrollment?
14. Is there exactly one canonical production startup owner for the Worker host?

If a design obviously creates a linear manual-operations bottleneck, agents must reject or mark it temporary and propose the scalable replacement before calling the architecture complete.

---

# 11. MVP FIRST DOES NOT MEAN SCALE-DEAD-END

CWS still follows MVP-first and no-over-engineering rules.

Therefore:

- do not build million-node infrastructure before demand exists
- do not add brokers, microservices, or complex distributed systems without evidence
- DO choose interfaces, credential boundaries, enrollment flow, storage authorization, and state machines that do not force a rewrite simply because the fleet grows

The correct target is: **minimum implementation now, scalable boundary by design.**

---

# 12. DEFINITION OF SCALE-READY PROVISIONING

A Worker provisioning design is scale-ready only when:

- no Founder-created B2 key is required per Worker
- no Supabase service-role or account-level storage credential is placed on a Worker
- Worker ID is generated automatically by the system and remains stable for that physical Worker
- Worker identity enrollment is securely automatable
- normal provisioning does not require Admin to manually issue/copy one enrollment ticket per Worker
- no enrollment/ticket action is required per customer Job
- normal restart/recovery does not require human or AI intervention
- partner Golden Image deployment does not clone one Worker credential across machines
- normal reboot reuses existing per-machine identity when persistent state is available
- adding many Workers does not require creating duplicate Vercel/Supabase/B2/Render infrastructure
- revoking one Worker does not require rotating credentials for the entire fleet
- the same logical workflow can be bulk-deployed to 100+ Workers without per-machine secret hand-editing
- normal Customer jobs require zero Admin approval
- normal Worker enrollment/restart requires zero per-machine Founder/Admin approval
- there is one canonical Node Agent auto-start path and Worker Engine remains task-scoped/ephemeral

These are architecture acceptance criteria, not optional future improvements.
