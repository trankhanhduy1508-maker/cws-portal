# CWS Security Threat Model V1

Status: architecture/security analysis only; no production mutation authorized.

## Scope
CWS accepts hostile customer files/Drive folders and executes Blender workloads on distributed partner Windows PCs. Trust boundaries: customer browser/Drive, backend ingress, quarantine, canonical B2, scheduler/PostgreSQL, Worker/Node Agent, partner Host, output/payment.

## Assets to protect
Customer project confidentiality and integrity; CWS credentials; canonical input/output; worker identity; scheduler ownership; payment state; Node Agent binaries/config; production database; security evidence.

## Primary adversaries
1. Malicious customer attempting malware/RCE/resource abuse/SSRF/cross-tenant access.
2. Compromised or curious partner Host attempting to retain/read unrelated customer data or credentials.
3. Compromised Worker attempting privilege escalation, persistence, lateral movement or stale-task reuse.
4. Supply-chain attacker through dependencies/installers/plugins/security tooling.
5. External attacker abusing auth/API/storage/payment interfaces.

## Threats and mandatory response

### T1 Arbitrary remote fetch / SSRF
Attack: crafted Drive/direct URL reaches internal/private/metadata/control-plane addresses.
Controls: provider-specific parsing, HTTPS only, redirect revalidation, DNS/IP policy, private/link-local/loopback/metadata denial, byte/time/redirect bounds.
Failure: reject submission; no quarantine promotion; no Job.

### T2 Malicious file disguised by extension/MIME
Controls: actual signature/content validation, digest, type allowlist, per-file verdict.
Failure: reject/fail closed.

### T3 Malware in `.blend`, archive or asset
Controls: quarantine first, mature malware engine, current signatures, scanner error/timeout unavailable => fail closed; Windows Defender later as defense-in-depth.
Failure: no canonical B2, no INPUT_SAFE, no Job.

### T4 ZIP/RAR traversal and device/path escape
Controls: canonical path containment, reject absolute/device/traversal paths, links/reparse escape, bounded extraction workspace.
Failure: reject archive/submission.

### T5 Decompression/resource bomb
Controls: bounds on archive size, entry count, extracted size, compression ratio, nesting, temp disk, wall clock, concurrency.
Failure: RESOURCE_LIMIT; no Job.

### T6 Multi-file Drive ambiguity
Attack: benign `.blend` plus malicious/unknown supporting files or multiple entrypoints.
Controls: authoritative Drive manifest, per-file verdict, aggregate CLEAN/SAFE, deterministic entrypoint, no optimistic partial continuation.
Failure: whole submission fail closed.

### T7 Blender active content / Python autoexec
Controls: untrusted Python autoexec OFF in real invocation; customer script/add-on execution not authorized.
Failure: Worker not eligible to render until verified.

### T8 Worker master-secret theft
Controls: no B2 master key/Supabase service role on Worker; short-lived task/object-scoped capability only; never Golden Image.
Failure: quarantine Worker, revoke credentials, incident handling.

### T9 Cross-customer/cross-job data access
Controls: server-side ownership, task-bound capability, object/prefix scope, lease/generation fencing, negative tests.
Failure: deny and security event.

### T10 Stale Worker/task capability reuse
Controls: authoritative task owner + lease + generation + TTL + terminal revocation/expiry.
Failure: deny; do not accept stale output.

### T11 Customer workload modifies Node Agent / host security
Controls: task identity separated from supervisor where practical, least privilege, protected agent/config/credential paths, Defender/tamper protection where available, no task scheduler persistence rights for job identity.
Failure: Worker QUARANTINED; no new Tasks.

### T12 Leftover process/file persistence
Controls: terminate Blender/child process tree, workspace cleanup, capability expiration, cleanup evidence before ACTIVE_IDLE.
Failure: Worker enters non-runnable containment state.

### T13 Host operator reads retained project
Controls: minimum task visibility, short-lived capability, task workspace cleanup, no broad storage list/read, later stronger sandbox/encryption if justified.
Residual risk: partner-owned physical host cannot be treated as datacenter-grade trusted hardware. Sensitive enterprise workloads may require stronger execution isolation later.

### T14 Endpoint security disabled/tampered
Controls: Defender status evidence, tamper protection where compatible, worker security eligibility gate.
Failure: RESTRICTED/QUARANTINED according to policy; no new Tasks where baseline unmet.

### T15 Supply-chain compromise
Controls: official maintained sources, pinned/controlled versions, signatures/hashes where supported, Trivy/Semgrep/dependency scanning, protected updater path.
Failure: block rollout/update until verified.

### T16 Security scanner itself becomes DoS
Controls: scan concurrency bounded, timeout, disk/RAM measurements, streaming acquisition, no silent product-size reduction.
Failure: fail closed and capacity escalation to Founder; no bypass.

### T17 Security state forged from frontend
Controls: all CLEAN/INPUT_SAFE/ownership/entrypoint authority server-side; DB/RPC authorization.
Failure: reject request.

### T18 Duplicate Job by retry/callback
Controls: idempotency keyed to authoritative submission/content/customer; unique DB enforcement.
Failure: return existing Job, never create concurrent duplicate.

### T19 Output poisoning / wrong-owner upload
Controls: task-scoped output prefix, server-side verification, generation fencing, expected output manifest.
Failure: reject output; Task not finalized.

### T20 Incident evidence leaks secrets/customer content
Controls: structured sanitized logs, no tokens/passwords/service keys/full unnecessary private content.
Failure: treat as credential/data exposure incident.

## Residual-risk decisions
CWS MVP does not claim VM-grade isolation against arbitrary native-code exploitation on partner PCs. Therefore active customer scripts/add-ons remain disabled; Worker is untrusted; defense in depth and cleanup are mandatory. New VM/container-per-job infrastructure, paid EDR, strict egress policies or project-specific encryption keys require Founder approval.

## Security Definition of Done
No security claim is complete until architecture, code/tests, integration/runtime evidence and real production E2E are separately verified. Unit tests alone never establish production security.
