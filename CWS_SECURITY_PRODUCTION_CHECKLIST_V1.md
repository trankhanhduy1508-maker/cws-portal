# CWS Production Security Checklist V1

Status: release gate checklist. A checked design item is not equivalent to runtime verification.

## A. Customer ingress
- [ ] Customer Google auth required before operational submission.
- [ ] Direct upload and Drive both converge on quarantine-before-B2.
- [ ] Drive URL parsing/provider restrictions/SSRF bounds verified.
- [ ] Download/upload streaming or bounded-memory behavior verified.
- [ ] Manifest enumeration bounded for Drive folders.
- [ ] Per-file hash/type/size/provenance recorded.
- [ ] Unsupported/active content fails closed.

## B. Malware / archive
- [ ] Mature scanner installed from trusted source.
- [ ] Signature update/readiness strategy verified.
- [ ] Scanner exit/error/timeout mapping tested.
- [ ] Scanner unavailable => no promotion/Job.
- [ ] ZIP traversal and path escape tests pass.
- [ ] Decompression-bomb/resource limits pass.
- [ ] RAR fails closed until equivalent bounded parser behavior verified.
- [ ] No public customer-file malware upload service is used.

## C. Canonical trust
- [ ] Aggregate CLEAN/SAFE required for canonical B2.
- [ ] Canonical B2 object integrity/ownership verified.
- [ ] Frontend cannot set security state.
- [ ] INPUT_SAFE is server-authoritative.
- [ ] Exactly-one Job idempotency under retry/concurrency verified.

## D. Worker / Host
- [ ] One physical PC = one canonical backend worker_id.
- [ ] No B2 master/Supabase service-role/shared Golden Image credential.
- [ ] Task/object-scoped temporary data authority verified.
- [ ] Lease + generation fencing enforced.
- [ ] Security eligibility blocks QUARANTINED Workers from claim.
- [ ] Node Agent/task privilege boundary reviewed.
- [ ] Node Agent/config/credential paths protected from task writes.
- [ ] Blender untrusted Python autoexec OFF in real invocation.
- [ ] Microsoft Defender/approved endpoint protection status verified.
- [ ] Tamper-protection posture evaluated for compatibility.
- [ ] Task process tree terminated before reuse.
- [ ] Task workspace/temp cleanup verified.
- [ ] Capability expiry/revocation verified.
- [ ] Cleanup failure prevents ACTIVE_IDLE.

## E. Cross-tenant confidentiality
- [ ] Customer A cannot read/list Customer B data.
- [ ] Worker/task A cannot access unrelated Job B objects.
- [ ] Host has no reusable broad storage credential.
- [ ] Logs do not expose tokens/secrets/unnecessary project content.

## F. Supply chain
- [ ] Security tools/packages come from official/maintained channels.
- [ ] Critical versions controlled/pinned per project policy.
- [ ] Installer/binary provenance/hash/signature checked where supported.
- [ ] Trivy/Semgrep/dependency checks reviewed.
- [ ] Worker updater cannot silently downgrade protected components.

## G. Runtime capacity
- [ ] Actual Render plan/RAM/CPU/temp disk verified.
- [ ] Scanner peak RAM/disk/time measured.
- [ ] Scan concurrency bounded.
- [ ] Internal safety limits documented separately from customer public limits.
- [ ] Large-file path does not require whole-file application RAM buffering.

## H. Incident readiness
- [ ] Worker QUARANTINED/containment behavior exists.
- [ ] Credential revocation path tested.
- [ ] Scanner outage fail-closed behavior tested.
- [ ] Compromised Worker recovery criteria documented/tested.
- [ ] Security evidence sanitization verified.
- [ ] Engineering Learning Log update rule followed.

## I. Release proof ladder
For each critical control, record one of: DESIGN ONLY / CODE VERIFIED / TEST VERIFIED / INTEGRATION VERIFIED / PRODUCTION RUNTIME VERIFIED.

A CWS MVP security release cannot be declared complete until all P0 controls are at least INTEGRATION VERIFIED and the critical end-to-end chain has real PRODUCTION RUNTIME VERIFIED evidence.

## J. Final one-Worker gate
Real customer test must prove: Google auth -> Drive/upload -> quarantine -> per-file scan/structural verdict -> aggregate CLEAN/SAFE -> canonical B2 -> INPUT_SAFE -> exactly-one Job -> Task -> one security-eligible Worker -> autoexec OFF -> render/upload verify -> process/file/capability cleanup -> ACTIVE_IDLE.

Only after Founder review of this one-Worker gate may security testing expand to 2–3 Workers and then 10 Workers.
