# CWS Security Implementation Package V1

Status: complete MVP security implementation handoff package. GPT owns security design; Codex is only invoked for scoped engineering work when Founder decides.

## 1. Canonical security chain
`Google Auth -> Drive/upload -> temporary quarantine -> manifest/per-file hash/type -> malware scan -> archive/resource checks -> Blender safety -> aggregate CLEAN/SAFE -> canonical B2 verify -> INPUT_SAFE -> exactly-one Job -> durable Task -> security-eligible Worker -> task-scoped capability -> Blender autoexec OFF -> Defender defense-in-depth -> render/output verify -> terminate process tree -> cleanup workspace -> expire/revoke capability -> ACTIVE_IDLE`.

## 2. Engineering slices, ordered by dependency

### S0 Canonicalize security docs
Merge Security Architecture V1/V1.1/V1.2 + threat model/control matrix/test plan/incident/checklist after review. No runtime effect.

### S1 Ingress runtime capacity and scanner readiness
Verify existing Render plan/RAM/CPU/temp disk. Implement mature scanner integration only within measured capacity, with current signatures, bounded timeout/concurrency and fail-closed mapping. Do not make internal scanner bounds public product limits.

### S2 Drive manifest + per-file verdict
Add additive authoritative manifest/per-file security persistence; deterministic entrypoint; aggregate CLEAN/SAFE. Preserve direct-upload parity. Any schema migration requires separate production preflight and Founder approval.

### S3 Archive hardening
Bounded ZIP parser/extraction; traversal/path/link/device protection; size/entry/ratio/nesting/time/disk limits. RAR remains fail-closed until equivalent proven tooling exists.

### S4 Canonical B2 / INPUT_SAFE enforcement
No untrusted input enters canonical B2. Verify object/hash/owner, then server-only INPUT_SAFE. Exactly-one Job creation remains idempotent.

### S5 Worker eligibility/containment
Add the smallest additive worker security posture/containment policy compatible with current worker_id. QUARANTINED receives no new Task. Do not create a second identity or customer-facing security tier.

### S6 Task-scoped storage/data authority
Ground current B2/backend paths. Ensure Worker has no master/service credential. Issue/mediate only task/object-scoped temporary read-input/write-output capability bound to authoritative ownership, TTL, lease/generation.

### S7 Worker privilege and endpoint protection
Verify Node Agent supervisor vs task/Blender privilege separation; protect agent/config/credentials from task writes; verify Blender autoexec OFF; verify Defender baseline/status. Stronger ASR/tamper/egress restrictions require compatibility testing before enforcement.

### S8 Terminal cleanup security gate
Kill Blender + child process tree, remove task workspace/temp, expire/revoke capability, record evidence. Cleanup failure -> containment/non-runnable state, not ACTIVE_IDLE.

### S9 Cross-tenant/security negatives
Prove Customer/Task/Worker cannot access unrelated objects/jobs; stale lease/generation cannot finalize/upload; frontend cannot forge security state.

### S10 Real production one-Worker E2E
Use one authenticated real Customer submission. Verify every critical state/evidence end to end. STOP for Founder review before Worker #2.

### S11 Multi-Worker security scale
After Founder review: 2–3 Workers, then 10. Verify no duplicate task ownership, stale capability reuse, cross-worker data exposure or cleanup leakage.

## 3. Explicit non-goals without Founder approval
No new Render service, B2 bucket/storage provider, database/project, Redis/NATS/Kafka/RabbitMQ, VM/container-per-job fleet, paid EDR/XDR, public malware-upload service, customer-facing security tier, product file-size reduction, customer Python/add-on execution, strict outbound allowlist that may break render workloads, project-specific key architecture.

## 4. Security tool policy
Ingress malware: ClamAV candidate after measured capacity verification; alternative mature scanner may replace it if evidence shows materially better fit without violating infra/privacy boundaries.
Windows endpoint: Microsoft Defender baseline; Defender for Endpoint/CrowdStrike/SentinelOne later only if justified and approved.
Code/dependency: existing Trivy/Semgrep direction.
Archive: proven bounded parser/tool, not custom decompressor security logic.
Blender: untrusted Python autoexec OFF.

## 5. Definition of MVP Security Complete
MVP security is complete only when all are true:
- architecture docs merged and authoritative;
- P0 controls implemented;
- schema/migrations applied with verified compatibility where required;
- scanner/runtime capacity and signatures verified;
- Drive multi-file manifest/per-file verdict works;
- unsafe/unknown paths fail closed;
- no untrusted canonical B2 promotion;
- server-only INPUT_SAFE and exactly-one Job verified;
- no Worker master secrets;
- task-scoped capability verified;
- security eligibility/containment verified;
- Blender autoexec OFF verified in real Worker;
- Defender/endpoint baseline verified;
- cleanup process/files/capability verified;
- cross-customer/task negatives pass;
- real one-Worker production E2E passes;
- incident/recovery path is operationally defined;
- Founder reviews one-Worker gate before scale.

Until then the correct status is SECURITY_DESIGN_COMPLETE or SECURITY_IMPLEMENTATION_PARTIAL, never PRODUCTION_SECURITY_COMPLETE.

## 6. GPT/Codex division
GPT continues to own threat/security design, control selection, acceptance criteria, review and risk decisions. Codex is called only when a concrete engineering slice requires repository code, migration, tests or runtime integration. Each Codex task must be narrowly scoped and stop before crossing Founder-controlled production/architecture boundaries unless explicitly approved.
