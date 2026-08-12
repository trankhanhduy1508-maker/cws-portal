# 06 — Security / AppSec Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: OAuth/authz, Worker trust boundary, uploads/archives, secrets, API security, SAST, verification.

## Primary top-tier sources

### 1. `aquasecurity/trivy` — ~35.2k stars
https://github.com/aquasecurity/trivy

Trivy scans repositories/filesystems/images for vulnerabilities, misconfiguration, secrets, licenses and SBOM data.

What CWS should learn:
- security scanning is multi-dimensional: CVEs alone are not enough;
- secret scanning, dependency inventory/SBOM and misconfiguration checks complement code review;
- security automation should produce evidence that can gate CI/release decisions;
- scanner results require triage rather than blind pass/fail by severity label alone.

**Important 2026 safety evidence:** Trivy disclosed a critical supply-chain compromise in March 2026 and published incident/remediation material. Therefore CWS must never use “security tool + many stars” as proof that its binaries/install scripts are automatically safe. If Trivy is ever adopted, pin and verify a post-remediation release/provenance according to current official guidance.

### 2. `OWASP/CheatSheetSeries` — ~32.1k stars
https://github.com/OWASP/CheatSheetSeries

Official OWASP concise security-practice collection.

Highest-value areas for CWS:
- authentication/OAuth/session management;
- authorization and object ownership;
- REST/API security;
- file upload security;
- path traversal prevention;
- input validation;
- secrets management;
- logging/error handling;
- SSRF and outbound-request controls;
- webhook verification.

This is a design/review reference, not executable code.

### 3. `semgrep/semgrep` — ~15.3k stars
https://github.com/semgrep/semgrep

Fast static-analysis engine supporting many languages and code-pattern rules.

CWS lessons:
- encode repeatable dangerous patterns as machine-checkable rules;
- use static analysis as one layer of evidence, not a substitute for authorization/business-logic tests;
- custom rules can prevent known CWS regressions after a real incident teaches a pattern.

Do not overclaim open-source SAST completeness; cross-file/business-logic/security coverage depends on tool/rule capability and must be validated.

## Verification-standard supplement

`OWASP/ASVS` — ~3.5k stars
https://github.com/OWASP/ASVS

ASVS 5.0 provides structured requirements for verifying web apps/services. It has fewer stars than the tools above but is especially authoritative for turning “secure” into checkable requirements. For high-risk CWS gates, authority matters more than popularity.

## CWS security model distilled

### 1. Authentication != authorization

A valid Google/Supabase JWT proves identity/session; it does not prove the user owns a file/Job/output.

For every object operation:

`identity -> server-side ownership/role check -> permitted action`

### 2. Worker is a separate trust class

Workers:
- authenticate to Backend gateway;
- never receive Supabase service-role credentials;
- never receive long-lived B2 master credentials;
- receive only task-scoped capabilities;
- may mutate task state only with authoritative task/worker/generation fencing.

### 3. Uploads are hostile until validated

`.blend/.zip/.rar` and external links are untrusted data.

Required concepts:
- extension + signature/content validation;
- bounded size/resource limits;
- archive path traversal/sandbox escape prevention;
- decompression-bomb limits;
- deterministic blend selection;
- Blender Python autoexec disabled for untrusted customer files;
- immutable original input;
- malware/security scanning can be considered as an additional layer but must not replace structural validation.

### 4. Fail closed on security uncertainty

Missing/invalid:
- identity;
- ownership;
- capability;
- generation;
- webhook signature/verification;
- payment match;
- output authorization;

=> reject rather than silently downgrade to demo/anonymous/shared-secret behavior.

### 5. Secrets

Long-lived secrets must not appear in:
- frontend bundles;
- Golden Images;
- repository files;
- prompts/reports/screenshots;
- general Worker config/logs.

Use the narrowest capability and shortest practical lifetime.

### 6. Security-sensitive external requests

Drive/materialization/webhook/download URLs need:
- allowlisted/validated provider semantics;
- SSRF-aware outbound request design;
- bounded redirects/timeouts/size;
- no trust in user-supplied response metadata without server validation.

### 7. Integrate mature security tools; do not build an antivirus engine

For malware scanning, quarantine, endpoint containment and remediation, CWS should first evaluate established maintained tools/plugins/packages rather than implement signature detection or virus-removal logic from scratch.

Required adoption discipline:
- prefer official upstream repositories/packages and supported interfaces;
- review current maintenance status, advisories, license and release provenance before adoption;
- pin/verify versions when appropriate;
- integrate the narrowest supported scanner/quarantine/remediation API or CLI;
- keep CWS-owned code focused on orchestration, policy, evidence, access control, audit and failure handling;
- do not recreate malware signature databases, detection engines, quarantine engines or eradication engines in CWS application code.

Canonical response model:

`untrusted input -> scan -> suspicious/infected -> QUARANTINE`

Quarantine is the first containment action. It prevents promotion to trusted/canonical storage and blocks Worker/Job access.

If evidence indicates malware has executed, escaped quarantine, modified a host or is actively intruding into CWS infrastructure, invoke the approved security product's supported containment/remediation/eradication workflow. Do not weaken the gate just to keep the Job running.

Repairing/disinfecting a customer project and then rendering it is a separate risk: only continue if the chosen mature tool and CWS validation can prove the project remains format-safe and semantically acceptable. Otherwise retain quarantine and require a clean resubmission.

## Security review order for CWS changes

1. identity/authentication;
2. object/role authorization;
3. data integrity;
4. task ownership/concurrency/fencing;
5. secrets/capabilities;
6. untrusted file/input handling;
7. retries/idempotency;
8. logging without secret leakage;
9. dependency/supply-chain exposure;
10. abuse/resource exhaustion.

## Supply-chain adoption checklist

Before adding any external executable/dependency:
- official repository/organization confirmed;
- current maintenance status confirmed;
- current security advisories reviewed;
- license reviewed;
- release/tag provenance checked;
- exact version pinned when appropriate;
- hashes/signatures/provenance verified when supported;
- transitive dependencies scanned;
- install script inspected rather than piped blindly from the network;
- bounded test before production;
- architecture/security boundary changes approved by Founder.

## CWS-specific deterministic checks worth considering later

- reject secrets committed to repo;
- detect frontend use of service-role/master storage credentials;
- flag Worker direct privileged Supabase access;
- flag unparameterized shell construction around customer paths;
- flag `autoexec=True` on untrusted Blender input;
- verify privileged Worker RPCs require worker/task/generation proof;
- verify paid/download state transitions are server-controlled;
- check archive extraction path containment.

## What security tools cannot prove alone

A clean scanner result does not prove:
- Customer A cannot access Customer B's Job;
- stale Worker cannot commit a Task;
- SePay payment matches exact Job/amount/reference;
- task ranges do not overlap;
- final output is correct.

Those need domain-specific tests/invariants.

## Activation

Load for security/auth/file handling/secrets/Worker gateway/payment authorization work. If a security reference conflicts with an active CWS security decision, stop and reconcile rather than silently changing the boundary.
