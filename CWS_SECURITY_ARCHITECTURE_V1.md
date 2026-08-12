# CWS Security Architecture V1

> Status: Founder-approved architecture baseline for Codex implementation planning.  
> Date: 2026-08-12  
> Scope: Customer input security, quarantine, canonicalization, Worker execution boundary, storage/auth/secrets, observability and incident containment.  
> Authority: subordinate to latest explicit Founder decisions, current runtime evidence, `DECISIONS.md`, canonical workflow, Spec Kit constitution and CWS AI Engineering Harness.

## 1. Security objective

CWS accepts hostile customer-controlled Blender projects and archives and eventually executes rendering work on distributed partner PCs. Security therefore uses **Zero Trust + defense in depth + fail closed**. No single CLEAN malware verdict is treated as proof that an input is safe.

Core invariant:

`UNTRUSTED -> QUARANTINE -> VALIDATE/SCAN -> CLEAN+SAFE -> CANONICAL B2 -> INPUT_SAFE -> JOB -> TASK -> WORKER -> SANDBOXED RENDER -> VALIDATED OUTPUT`

Normal customer execution is automatic. Founder/Admin is not an approval step for normal submissions, Job creation, Worker assignment or security verdicts.

## 2. Trust zones

### Z0 — Public / hostile
Browser input, Google Drive URLs, filenames, MIME claims, archives, `.blend` contents, metadata and customer-controlled embedded data are untrusted.

### Z1 — Authenticated ingress
Supabase Google OAuth establishes customer identity, not file trust. Backend binds submission ownership server-side. Frontend claims are never authoritative for CLEAN, ownership or `INPUT_SAFE`.

### Z2 — Temporary quarantine/staging
First landing zone for bytes. It is outside canonical B2 input storage and must use existing approved infrastructure unless Founder approves new infrastructure. Objects are bounded, non-executable and inaccessible to Workers.

### Z3 — Canonical validated input
Only submissions that pass every mandatory gate are promoted/uploaded to canonical B2, integrity/ownership verified and marked `INPUT_SAFE`. Customer original is immutable after canonicalization.

### Z4 — Scheduler/control plane
Backend/PostgreSQL owns Job/Task state, authorization, leases and generation fencing. Workers never receive Supabase service-role credentials or broad storage credentials.

### Z5 — Worker execution
Node Agent is resident supervisor; Worker Engine is task-scoped. Worker receives only narrow task/object-scoped capability. Customer project executes with Blender Python autoexec disabled. OS endpoint protection is defense-in-depth, not a substitute for ingress security.

### Z6 — Output
Worker uploads only through bounded authorized capability. Backend verifies expected output ownership/integrity before lifecycle advancement. Full output remains locked until deterministic payment verification.

## 3. Customer input security pipeline

Canonical pre-Job sequence:

1. Valid authenticated customer session.
2. Server-side submission/ownership binding.
3. For Drive: allow only approved Google Drive form/provider; apply SSRF-aware URL parsing, redirect allowlisting, bounded redirects, connect/read timeout and byte limits.
4. Stream input into temporary quarantine; do not require whole-file buffering in application RAM.
5. Compute cryptographic digest while ingesting when practical; record size and provenance evidence.
6. Enforce supported public formats: `.blend`, `.zip`, `.rar`, approved Google Drive file links.
7. Validate actual signature/content against claimed format; extension/MIME alone is insufficient.
8. Anti-malware scan with a mature maintained engine integrated through its supported interface. Scanner failure, unavailable signatures, timeout or unknown verdict => fail closed.
9. Archive structural gate before unsafe extraction: reject path traversal/absolute/device paths, excessive entry count, excessive compressed/uncompressed size, excessive nesting/compression ratio and other decompression-bomb/resource violations.
10. Extraction, where required, occurs only inside a bounded temporary sandbox/work directory with deterministic `.blend` selection and cleanup.
11. Perform required post-extraction structural/content checks. Archive CLEAN does not automatically make extracted members trusted.
12. Blender safety checks; untrusted Python autoexec remains OFF.
13. Only `CLEAN + every required structural/security gate PASS` may be uploaded/promoted to canonical B2.
14. Verify canonical B2 object integrity and customer ownership.
15. Authoritatively transition to `INPUT_SAFE`.
16. Backend idempotently creates exactly one customer-owned Job.

Any `INFECTED`, `SUSPICIOUS`, malformed, unsupported, scanner-error, timeout, resource-limit violation or unknown state produces **no canonical B2 input and no Job**.

## 4. Large-file architecture

CWS customer file capability must not be silently reduced to the current scanner/runtime capacity. A scanner's safe MVP bound is an **internal operational bound**, not automatically a public product limit.

Design principles:

- stream downloads/uploads instead of buffering the entire project in RAM;
- disk/quarantine capacity and scanner capabilities are explicit bounded resources;
- enforce limits before and during transfer, not only after completion;
- scan the raw submitted object before trusting or promoting it;
- do not blindly decompress large archives merely to obtain a malware verdict;
- archive metadata/structure is inspected with strict bounds before extraction;
- extracted content remains untrusted and receives required checks before canonicalization;
- temporary artifacts are cleaned deterministically after terminal verdicts;
- concurrency starts bounded (normally one scan per constrained runtime) until measured production capacity supports more.

The previously discussed `128 MiB` value is not a Founder-approved public CWS upload limit. Codex must measure/verify current Render RAM/CPU/temp-disk and scanner behavior before proposing any operational limit. Product-supported file-size changes require Founder approval.

## 5. Malware engine policy

CWS does not build a custom antivirus engine.

For the current existing-infrastructure path, ClamAV may be integrated only after capacity and deployment compatibility are verified. Prefer the smallest safe supported operating mode for measured capacity. If daemon residency is unsafe for current RAM, bounded `clamscan` is acceptable for MVP even if slower.

Requirements:

- current signatures at deployment/runtime according to an explicit update strategy;
- scanner provenance from official/maintained distribution channels;
- bounded scan timeout;
- bounded scan concurrency;
- explicit mapping of engine exit/error states to CWS verdicts;
- engine unavailable/error/timeout => fail closed;
- no automatic repair-and-trust of customer projects;
- no upload of private customer projects to public VirusTotal-style services without separate Founder approval.

## 6. Archive and decompression-bomb policy

ZIP/RAR are hostile containers.

Before extraction enforce configurable internal limits for:

- archive byte size;
- entry count;
- total declared/uncompressed size;
- per-entry size;
- nesting depth;
- compression ratio;
- extraction wall-clock timeout;
- temporary disk budget;
- canonicalized output path containment.

Reject traversal (`../`), absolute paths, device paths, path escaping through links/reparse behavior, or any extraction target outside the assigned temporary directory. RAR remains fail-closed until the selected parser/tool can enforce equivalent bounded structural protections.

Limits are security/resource controls. Changing public customer support semantics remains a Founder decision.

## 7. Blender execution boundary

A malware CLEAN verdict does not make `.blend` safe to execute without restrictions.

Mandatory baseline:

- Blender Python autoexec OFF for untrusted customer content;
- original canonical B2 object immutable;
- analysis/read operations must not mutate original;
- optimization occurs on a working copy;
- deterministic validation after optimization;
- task-scoped working directory;
- least-privilege process and credentials;
- bounded CPU/RAM/disk/time where the platform permits;
- cleanup in terminal success/failure paths;
- never expose backend master/service credentials to Blender or Worker subprocesses.

Any future requirement to execute customer scripts/add-ons is a new high-risk trust-boundary decision requiring Founder approval and a separate sandbox architecture.

## 8. Windows Worker defense in depth

Windows Defender/approved endpoint protection is an **additional containment layer**, not the ingress trust authority.

Roles:

- real-time protection on Worker host;
- detect/block malicious artifacts/process behavior that escaped upstream checks;
- isolate/remediate host artifacts according to trusted endpoint-protection behavior;
- raise security/incident evidence to CWS where integration is available;
- prevent an affected Worker from continuing normal work when host integrity is uncertain.

A Worker-side Defender CLEAN result does not replace pre-B2 malware scanning, archive safety, Blender controls or server-side `INPUT_SAFE` authorization.

Evidence or strong indication of execution/escape/host modification triggers containment: stop assigning new work, isolate affected task/host according to supported controls, preserve relevant audit evidence and require verified recovery before returning the Worker to service.

## 9. Worker identity, credentials and storage

- One physical PC has one canonical opaque `worker_id`/PCID.
- Worker credentials are per-Worker, revocable and stored using supported Windows protected storage (e.g. DPAPI direction).
- Golden Image contains no shared Worker credential, Supabase service-role, B2 master credential or site root/trust secret.
- Worker talks through authenticated Backend gateway.
- Long-lived B2/account credentials remain server-side.
- Worker receives only narrow task/object-scoped storage capability with bounded lifetime/scope.
- Customer A input cannot be claimed/read/rendered through Customer B ownership.
- Lease + generation fencing prevents stale Worker authority.

## 10. Authentication and authorization

Customer: Google OAuth via Supabase; authenticated identity is required before operational Upload/Drive submission.

Admin/Host: separate Google OAuth + required TOTP/AAL2 + explicit staff role authorization.

Admin AAL2 does not belong in normal customer input/job/Worker lifecycle.

Authorization is server-side and deny-by-default. Authentication proves identity; it does not prove file safety or resource ownership.

## 11. Secrets

- no secrets committed to Git;
- no service-role/master storage credentials in frontend, Golden Image or customer-visible logs;
- least privilege and narrow scopes;
- rotate/revoke on suspected exposure;
- secrets never become part of customer-controlled command lines/files when avoidable;
- sanitize logs/evidence before sharing with AI or external systems.

## 12. Network / SSRF boundary

Backend acquisition of remote Drive content must not become an arbitrary URL fetcher.

Use provider-specific parsing and allowlisting, HTTPS, bounded redirects, DNS/IP validation appropriate to the runtime, timeouts and byte budgets. Deny private/link-local/loopback/metadata/control-plane destinations and unexpected schemes/ports. Revalidate redirect targets. OneDrive/Dropbox/arbitrary direct links remain outside canonical public MVP unless Founder approves them.

## 13. State machine and fail-closed contract

Suggested conceptual security states (exact schema naming may differ and must follow current applied schema/spec):

`RECEIVED -> QUARANTINED -> SCANNING -> STRUCTURAL_VALIDATION -> CLEAN_SAFE -> CANONICALIZING -> INPUT_SAFE`

Terminal/containment examples:

`INFECTED | SUSPICIOUS | REJECTED | SCAN_ERROR | RESOURCE_LIMIT | UNSUPPORTED`

Rules:

- only authoritative backend transition to `INPUT_SAFE` can unlock Job creation;
- frontend state cannot advance security state;
- retries are idempotent;
- ambiguous state never becomes CLEAN by default;
- security checks cannot be bypassed to preserve customer workflow success.

## 14. Observability and audit

Record enough sanitized evidence to reconstruct each security decision without storing secrets unnecessarily:

- submission/customer ownership reference;
- source/provider classification;
- byte size + digest where available;
- scanner engine/version/signature freshness evidence;
- scan start/end/result/error category;
- structural validation result and violated bound;
- canonical B2 verification result;
- `INPUT_SAFE` transition;
- Job idempotency key/result;
- Worker/task identity and generation;
- containment/security incident events.

Security logs must distinguish `CODE VERIFIED`, integration/runtime verification and actual production evidence. Never claim production security from unit tests alone.

## 15. Supply-chain baseline

For security-sensitive dependencies/tools:

1. prefer official maintained upstream/distribution;
2. verify maintenance/advisories/license;
3. pin or otherwise control versions according to project dependency policy;
4. verify provenance/signatures/hashes where supported;
5. minimize dependency surface;
6. do not execute unknown GitHub security scripts merely because they are popular;
7. test failure modes and fail-closed behavior.

## 16. Incident containment

When malware is detected before execution:

`quarantine -> block canonicalization -> block Job -> record verdict -> retain/delete only according to approved retention policy`.

When there is evidence of host execution/escape/compromise:

`stop new assignments -> isolate affected Worker/task -> revoke/narrow affected credentials/capabilities as appropriate -> preserve sanitized evidence -> trusted endpoint remediation/rebuild/recovery -> verify integrity -> explicit safe return to service`.

Do not create a custom malware-removal engine. Do not automatically modify a customer project and continue rendering unless format preservation and safety are independently proven.

## 17. Infrastructure boundary

V1 must prefer existing canonical infrastructure: Customer Vercel, existing Render backend, production Supabase, existing B2 resources, SePay and existing Worker/Node Agent topology.

Not authorized by this document:

- new B2 quarantine bucket;
- new storage provider;
- new Render service;
- Redis/NATS/Kafka/RabbitMQ/new control plane;
- public malware-upload service;
- new sandbox/VM/container fleet;
- customer-script execution capability.

Any of these requires evidence of need plus explicit Founder approval.

## 18. Implementation gates

This document is architecture authorization, not proof of implementation.

Before production rollout Codex must follow Harness + Grounding + Staleness + Spec Kit and verify, at minimum:

1. current Render service plan/RAM/CPU/temp-disk and deployment model;
2. safe scanner installation/update/start behavior;
3. actual scanner RAM/disk/time on representative bounded inputs;
4. streaming acquisition without whole-file RAM buffering;
5. archive parser/tool supports required ZIP/RAR fail-closed protections;
6. DB/migration compatibility and idempotent exactly-one Job creation;
7. security state cannot be forged from frontend;
8. no canonical B2 promotion or Job on every scanner/error/timeout/unsafe path;
9. Blender autoexec disabled in real Worker invocation;
10. narrow Worker storage credentials/capabilities;
11. cleanup and containment behavior;
12. production E2E evidence before declaring production security verified.

If current Render capacity cannot safely perform the required quarantine/scan workflow for CWS-supported workloads, STOP. Report measured evidence and propose the smallest architecture change for Founder approval; do not silently reduce customer product capability or create infrastructure.

## 19. V1 success criteria

V1 is correctly implemented when a normal authenticated customer submission can automatically traverse the security pipeline, safe input alone reaches canonical B2/`INPUT_SAFE`, exactly one owned Job is created, unsafe/unknown input fails closed, Workers execute only authorized canonical input with defense-in-depth protections, and all material decisions are auditable — with no per-job Founder approval and no AI runtime dependency.

## 20. Non-goals

V1 does not claim perfect malware detection, VM-grade hostile-code isolation, support for customer Python scripts, arbitrary cloud-drive providers, new infrastructure, or unlimited file size. It defines a fail-closed architecture and the measurement/approval gates required before extending those boundaries.
