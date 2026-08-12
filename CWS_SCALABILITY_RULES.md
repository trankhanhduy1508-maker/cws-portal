# CWS SCALABILITY RULES

> Status: ACTIVE
> Added: 2026-08-08
> Updated: 2026-08-12
> Purpose: Mandatory architecture rules for any CWS implementation that can affect fleet growth or production operations.

---

# 1. SCALE-BY-DESIGN — MANDATORY

Every production design must be evaluated against fleet growth before it is accepted.

For every design, ask whether the same operating model remains viable at approximately:

- 100 Workers
- 1,000 Workers
- 10,000 Workers
- 1,000,000 Workers

This does NOT mean prematurely building infrastructure sized for one million machines. It means avoiding architecture whose operating cost, manual work, secret management, provisioning steps, identity collision risk, or control-plane complexity grows badly with fleet size.

A long-term canonical solution is unacceptable if adding Workers requires the Founder/operator to repeat a manual production action per machine **or per normal batch at an already-approved site/fleet** when that action can be safely automated.

Unacceptable patterns include:

- manually creating a storage application key for every Worker
- manually copying long-lived secrets onto every Worker
- manually creating database rows for every Worker
- manually choosing/typing Worker IDs
- creating a separate PCID namespace that must be reconciled with Worker IDs
- deriving canonical Worker IDs from hostname, MachineGuid, GPU, serial number, or sequential PC numbering
- manually issuing/copying one enrollment ticket per normal Worker
- requiring Founder/Admin to approve every normal new PC batch at a site already approved by CWS
- manually advancing normal job states
- requiring AI/Codex to operate the runtime
- creating one backend/project/service/bucket per Worker
- requiring production config edits every time one Worker is added

---

# 2. O(1) OPERATOR EFFORT FOR NORMAL FLEET GROWTH

The intended lifecycle is:

`approve site/fleet once -> persist durable site trust -> provision Workers unattended -> Backend generates canonical identities -> Workers authenticate securely -> become schedulable`

For an already-approved site/fleet:

`new batch starts -> approved site controller/backend automatically obtains or rotates bounded provisioning capability -> PCs provision unattended`

Adding Worker N+1 or batch N+1 should not require another Founder/Admin approval while the site remains approved and within server-side policy.

Manual Founder action may exist for:

- first site/fleet trust onboarding
- explicit site suspension/revocation
- ownership/site transfer
- root trust reset or irreversible secret rotation
- major policy/capacity change
- exceptional security recovery

Manual Founder action must not exist for:

- each normal Worker
- each normal PC batch at an approved site
- each customer Job
- normal reboot/reconnect
- ordinary short-lived capability renewal/rotation

---

# 3. NO LONG-LIVED STORAGE MASTER CREDENTIAL ON WORKERS

Canonical storage architecture:

- long-lived Backblaze B2/account-level credentials remain server-side
- Workers authenticate to the CWS Backend using per-Worker identity
- Backend grants only minimum job/object-scoped storage capability
- Worker must not require a Founder-created B2 application key per machine

Preferred behavior:

`Worker auth -> claim Job -> Backend issues job-scoped storage access -> download/render/upload -> access expires/revokes`

Compromise of one Worker must not expose broad credentials for other Workers/jobs/storage.

---

# 4. NO AI RUNTIME DEPENDENCY

Production jobs and fleet operations must continue when ChatGPT, Codex, Claude, Kimi, or any other AI is offline.

AI may develop, inspect, debug, test, document, and improve CWS. It is not a required production orchestration component.

Claim, heartbeat, retry, render, upload, state transitions, cleanup, recovery, payment handling, and delivery must be deterministic code/state-machine behavior.

---

# 5. CENTRALIZE SECRETS, DISTRIBUTE CAPABILITIES

Prefer:

- centralized long-lived account credentials
- durable approved-site trust state
- site-controller identity/trust material held in its own secure boundary
- per-Worker identity credentials
- short-lived/job- or provisioning-scoped capabilities
- automatic rotation/revocation
- machine-bound secure local storage for Worker identity credentials

Avoid distributing account-level secrets across the fleet.

A short-lived site provisioning token expiring must not force Founder/Admin re-approval if the site itself is still approved. The approved site controller/Backend should renew/exchange bounded capability automatically.

The site-controller secret/trust anchor must not be cloned into a shared Golden Image.

---

# 6. ZERO ADMIN APPROVAL IN NORMAL CUSTOMER RUNTIME

Founder decision: normal Customer jobs are fully automatic after Google login and valid submission.

Canonical Customer runtime:

`Google Login -> Upload/Drive -> Validate -> Queue -> Scheduler -> Worker -> Render -> B2 -> Preview/Pricing/QR -> SePay verify -> Unlock -> Download -> Cleanup`

Normal runtime MUST NOT require Founder/Admin approval, manual state advancement, manual Worker assignment, manual payment confirmation, or AI intervention.

---

# 7. AUTOMATIC WORKER IDENTITY + ONE CANONICAL PCID/WORKER ID

Founder decision: normal Worker provisioning must not require the Founder/Admin to choose a Worker ID, issue/copy an enrollment ticket manually for each machine, approve each machine, approve each normal batch at an already-approved site, or repeat enrollment action per Job.

Canonical identity:

`1 physical PC = 1 canonical PCID/Worker ID`

`PCID` and `Worker ID` are aliases of the same canonical `worker_id` value.

Canonical generation:

- Backend generates 128 bits of cryptographically secure random entropy.
- Preferred representation: `cwsw_` + 32 lowercase hex characters.
- Database `PRIMARY KEY`/`UNIQUE` protection is authoritative.
- Collision is rejected and retried with a fresh random ID; never overwrite/merge another Worker.
- Do not derive ID from hostname, GPU, MachineGuid, fingerprint, motherboard/BIOS serial, site number, Job, customer, or sequential PC number.
- Fingerprint is enrollment/recovery evidence only.

Internal one-time enrollment tickets may remain as security primitives, but humans do not create/copy them in the normal path.

Target behavior:

`site approved once -> durable site trust -> unattended batch provisioning -> Backend generates canonical Worker IDs -> bounded enrollment material auto-issued/redeemed -> per-Worker credential -> DPAPI -> Node Agent -> heartbeat`

Adding the 101st, 1,001st, 10,001st Worker — or a new batch of those Workers at the same approved site — must not create a new Founder approval/ticket-copy/ID-entry process.

If implementation still requires an Admin AAL2 `/site-bootstrap` call before every normal batch, that is a **scale-blocking implementation gap**.

---

# 8. APPROVED SITE/FLEET AUTONOMY

This is a binding scale rule.

A site/fleet approval and a short-lived provisioning token are different things.

### Durable site approval

- Established once through an authenticated privileged onboarding boundary.
- Stored server-side as durable APPROVED trust state.
- Remains valid until explicit suspension/revocation, ownership transfer, trust reset, or other exceptional policy event.

### Site controller

- Authenticates the already-approved site/fleet.
- Has provisioning-only scope.
- Is not a Worker credential and not a Supabase service-role credential.
- Cannot claim Tasks, render, access payments, or hold B2 master authority.
- Cannot act for another site/fleet.
- Is revocable/auditable.
- Its secret/trust anchor is not embedded in the shared Golden Image.

### Short-lived provisioning capability

- May expire frequently.
- May be exchanged/renewed/rotated automatically while durable site approval remains valid and server policy permits.
- Expiry alone is not a reason to ask Founder/Admin to approve the site again.

### Human boundary

Founder/Admin may be required for first onboarding or exceptional trust/security events only.

Founder/Admin must **not** be required when:

- batch 2, batch 3, or batch N is introduced at an approved site;
- a normal PC is added within approved policy/capacity;
- a short-lived provisioning token expires;
- a normal Worker reconnects/reboots.

---

# 9. PARTNER GOLDEN IMAGE + PER-MACHINE STATE

For approved net-cafe/office partners, CWS runtime components should be baked into the canonical Windows/BootROM Golden Image.

The shared image may contain:

- Node Agent code
- Worker Engine code
- Blender/runtime dependencies
- canonical startup wrapper/service
- non-secret Backend/site identifiers/configuration

It MUST NOT contain:

- one shared Worker credential
- Supabase service-role key
- B2 master credential
- site-controller root/trust secret

Worker identity and credential remain unique per physical PC and live in supported per-machine persistent/writeback state where available.

Normal reboot:

`boot shared image -> load existing Worker ID + DPAPI credential -> Node Agent -> heartbeat -> ACTIVE_IDLE`

Normal reboot does not re-enroll.

---

# 10. ONE RESIDENT NODE AGENT; EPHEMERAL WORKER ENGINE

Canonical Windows runtime:

`Windows boot -> Node Agent service -> authenticate/heartbeat -> ACTIVE_IDLE -> claim task -> launch Worker Engine -> Blender/render/upload/verify -> Worker Engine exits -> cleanup -> ACTIVE_IDLE`

Rules:

- Node Agent is the only resident startup owner.
- Prefer delayed/jittered service startup for large fleets.
- Worker Engine is task-scoped, not a second permanent service.
- Duplicate Node Agent instances are forbidden.
- Network outages use bounded retry/backoff.
- Worker/Blender failure must not permanently kill Node Agent.
- Legacy `cws_worker_full.py` is not the canonical auto-start production runtime.

---

# 11. SCALE REVIEW REQUIRED FOR ARCHITECTURE CHANGES

Before accepting production architecture/provisioning design, agents must answer:

1. What manual action is required per Worker?
2. What manual action is required per batch at an already-approved site?
3. What manual action is required per Job?
4. What secret exists on each Worker?
5. What secret/trust material exists at site-controller level?
6. What happens if one Worker is compromised?
7. What happens if one site controller is compromised?
8. Does adding the 101st/1,001st/10,001st/1,000,001st Worker require a new manual process?
9. Does adding batch N+1 at an approved site require Founder/Admin login/action?
10. Can short-lived capability renewal be automated without widening scope?
11. What component becomes the bottleneck as fleet size increases?
12. Does the design create one infrastructure resource per Worker unnecessarily?
13. Does normal Customer workflow require Admin approval?
14. Does normal Worker lifecycle require per-machine or per-batch Founder/Admin approval?
15. Is canonical Worker ID system-generated with 128-bit CSPRNG + DB uniqueness?
16. Is there one machine identity namespace?
17. Does normal reboot reuse existing per-machine identity?
18. Is there exactly one canonical production startup owner?

Reject designs that create linear manual-operation bottlenecks or repeated site approval work.

---

# 12. MVP FIRST DOES NOT MEAN SCALE-DEAD-END

Do not build million-node infrastructure before demand exists.

Do not add brokers/microservices/complex distributed systems without evidence.

Do choose interfaces, trust boundaries, identity generation, enrollment flow, storage authorization, and state machines that do not force a rewrite as fleet size grows.

Target: **minimum implementation now, scalable boundary by design.**

---

# 13. DEFINITION OF SCALE-READY PROVISIONING

A Worker provisioning design is scale-ready only when:

- no Founder-created B2 key is required per Worker
- no Supabase service-role or account-level storage credential is placed on Worker/site controller
- one physical PC has one canonical PCID/Worker ID
- Worker ID is Backend-generated with 128-bit CSPRNG entropy
- DB uniqueness prevents accepted duplicate IDs
- bounded collision retry cannot overwrite/merge another Worker
- Worker ID remains stable across normal reboot/reconnect/Jobs
- normal provisioning does not require Admin to manually issue/copy one ticket per Worker
- no enrollment/ticket action is required per customer Job
- an already-approved site/fleet requires zero Founder/Admin action per normal batch
- short-lived site provisioning capability can renew/exchange automatically while durable site approval remains valid
- site revocation/suspension blocks new provisioning immediately
- site-controller trust is isolated and not cloned into Golden Images
- normal restart/recovery does not require human/AI intervention
- adding many Workers does not require duplicate Vercel/Supabase/B2/Render infrastructure
- revoking one Worker does not require rotating the entire fleet
- revoking one site does not affect unrelated sites
- normal Customer jobs require zero Admin approval
- there is one canonical Node Agent startup path and Worker Engine remains task-scoped

These are mandatory architecture acceptance criteria.
