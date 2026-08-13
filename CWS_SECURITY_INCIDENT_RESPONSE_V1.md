# CWS Security Incident Response V1

Status: operational security policy design. Production automation may require later implementation approval.

## Severity
SEV-1: confirmed host compromise, credential/master-secret exposure, cross-customer data disclosure, active malware execution, control-plane compromise.
SEV-2: suspicious endpoint behavior, repeated malicious submissions, scanner/signature outage affecting trust decisions, failed cleanup leaving persistent process/data.
SEV-3: blocked malicious input, isolated policy violation, non-exploited security test finding.

## Universal principles
- Fail closed.
- Contain before remediation.
- Preserve sanitized evidence.
- Do not silently disinfect customer projects and continue rendering.
- Do not blindly retry failed migrations/scans/security operations.
- Revoke/narrow credentials when exposure is plausible.
- AI is not required for runtime containment.

## Pre-execution malware detection
`DETECTED/SUSPICIOUS -> keep in quarantine -> no canonical B2 -> no INPUT_SAFE -> no Job -> record verdict -> apply approved retention/deletion policy`.

## Worker host compromise/escape
`security signal -> stop new task assignment -> Worker QUARANTINED -> terminate affected task/process tree where safe -> revoke/expire task capabilities -> preserve logs/evidence -> Defender/approved endpoint remediation -> verify Node Agent/runtime integrity -> cleanup/rebuild if required -> explicit evidence-based return to eligible state`.

Do not reuse a Worker merely because malware was removed if supervisor binaries, credential stores or OS integrity remain uncertain.

## Credential exposure
1. Identify credential scope and affected identities.
2. Revoke/rotate exposed credential/capability.
3. Search sanitized audit evidence for misuse.
4. Quarantine affected Worker/service if compromise is plausible.
5. Verify no master/service credentials existed on Worker/Golden Image.
6. Record root cause and preventive rule in engineering learning log.

## Cross-customer data exposure
Immediate SEV-1. Stop affected path, deny further access, identify exact objects/customers/tasks, preserve access evidence, rotate affected access material, verify ownership/RLS/capability boundary before resuming. Founder must be informed before broad workflow/security boundary changes.

## Scanner/signature outage
No bypass. New untrusted inputs remain quarantined and do not reach INPUT_SAFE. Existing previously verified canonical inputs are not automatically reclassified unless policy/evidence requires it. Restore scanner/signature readiness, validate with safe test fixtures, then resume.

## Archive/resource attack
Terminate bounded operation, cleanup temporary artifacts, mark submission RESOURCE_LIMIT/REJECTED, do not retry with relaxed limits automatically.

## Cleanup failure
Worker does not return ACTIVE_IDLE. Enter containment/non-runnable state, retry only bounded deterministic cleanup if policy permits; otherwise require recovery evidence.

## Security tool tampering
If Defender/security settings or Node Agent protection is unexpectedly disabled/modified: restrict/quarantine Worker, preserve evidence, restore through trusted admin/update path; customer task process must never be trusted to repair supervisor security.

## Evidence minimum
Timestamp, customer/submission/job/task/worker references, security state transitions, hashes/types/sizes, scanner/version/signature readiness, endpoint alert identifiers, capability generation/TTL, cleanup result, relevant sanitized logs. Never store plaintext secrets.

## Recovery criteria
Return to service only when root cause is understood sufficiently to prevent immediate recurrence, affected credentials/capabilities are safe, Worker/control-plane integrity is verified, mandatory security controls are healthy, and negative verification passes.

## Learning loop
Every SEV-1/SEV-2 produces an Engineering Learning Log entry: symptom, root cause, containment, remediation, failed attempts, rule learned, regression/security test to add.
