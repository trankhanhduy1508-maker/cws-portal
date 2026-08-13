# CWS Security Control Matrix V1

Status: security design/control baseline. Implementation evidence must be verified separately.

| Layer | Threat | Preventive control | Detective control | Fail-closed action | MVP tool/direction |
|---|---|---|---|---|---|
| Auth | anonymous operational submission | Google OAuth + server auth gate | auth logs | reject | Supabase Auth |
| Ownership | cross-customer access | server-side owner binding/RLS | negative tests/audit | deny | PostgreSQL/RLS |
| Drive | SSRF/arbitrary fetch | provider parser, HTTPS, redirect/IP/size/time bounds | fetch audit | reject | backend policy |
| Manifest | hidden/multi-file risk | enumerate server-side manifest | file-count/hash evidence | reject incomplete | Drive manifest model |
| Type | extension spoofing | signature/content detection | mismatch log | reject | maintained libraries |
| Malware | hostile file | quarantine + scanner | scan result/version/signature evidence | no B2/Job | ClamAV candidate |
| Scanner health | unavailable/stale/error | startup/runtime readiness checks | scanner health metrics | fail closed | freshclam + scanner health |
| Archives | traversal/path escape | bounded parser/path containment | rejection reason | reject archive | proven ZIP/RAR tooling |
| Archives | decompression bomb | entry/size/ratio/nesting/disk/time limits | resource telemetry | RESOURCE_LIMIT | bounded parser/tool |
| Blender | Python autoexec | autoexec OFF | invocation evidence | Worker not eligible | Blender flag/config |
| Canonicalization | untrusted input reaches B2 | promote only after aggregate CLEAN/SAFE | object/hash verification | no INPUT_SAFE | backend orchestration |
| Job | duplicate creation | idempotency + unique DB protection | duplicate count | return existing Job | PostgreSQL |
| Scheduler | unsafe Worker claims Task | Worker eligibility gate | posture/containment audit | no claim | PostgreSQL claim predicate |
| Identity | fake/reused Worker | canonical backend worker_id + credential | heartbeat/auth evidence | deny | backend/DPAPI |
| Credential | Worker broad storage key | object/task-scoped temporary capability | access audit | deny/revoke | backend/B2 scoped mechanism |
| Fencing | stale Worker writes output | lease + generation fencing | stale-generation events | reject | PostgreSQL |
| OS privilege | customer code modifies agent | supervisor/task identity separation, protected agent files | Defender/event audit | quarantine Worker | Windows ACLs/service model |
| Endpoint | malware escape | Defender real-time protection | Defender alerts/status | quarantine/contain | Microsoft Defender |
| Tampering | security disabled | tamper protection where supported/compatible | status checks | restrict/quarantine | Windows Security/Defender |
| Persistence | leftover process/task | kill task process tree | process cleanup evidence | no ACTIVE_IDLE | Node Agent cleanup |
| Data remnants | leftover customer files | task workspace cleanup | cleanup verification | no ACTIVE_IDLE | Worker Engine/Node Agent |
| Network | task reaches secrets/control plane | no secrets in task env, protect hosts/DNS/routing, least egress | unexpected outbound events | contain | OS/network policy |
| Supply chain | poisoned package/installer | official sources, version control, signature/hash | Trivy/Semgrep/advisory review | block rollout | existing scanners |
| Logs | secret/customer leakage | structured sanitization | log review | incident/rotate if exposed | app logging |
| Output | wrong/malicious output | scoped upload + expected output verification | object manifest/hash | reject | B2/backend |
| Payment | unlock without exact payment | exact reference + amount verification | payment audit | stay locked | SePay/backend |

## Control ownership

GPT/Founder security design: threat model, policy, security acceptance criteria, tool selection, architecture boundaries.
Codex engineering: only when instructed for code/migration/tests/integration evidence.
Production runtime: must remain independent of GPT/Codex/Founder availability.

## Mandatory evidence classes

Every control must be labelled separately as one of:
- DESIGN ONLY
- CODE VERIFIED
- TEST VERIFIED
- INTEGRATION VERIFIED
- PRODUCTION RUNTIME VERIFIED

Never collapse these into a single PASS.

## High-priority controls before real Customer-to-Worker claim

P0: quarantine before canonical B2; malware scan fail-closed; Drive manifest/per-file verdict; archive safety; server-side INPUT_SAFE; exactly-one Job; Blender autoexec OFF; no Worker master secrets; task-scoped capability; cleanup process/files/capability.

P1 before multi-Worker expansion: Worker security eligibility; Defender posture; cleanup failure containment; cross-customer negative tests; Node Agent protection; patch/version inventory.

P2 before enterprise-sensitive workloads: stronger sandboxing/isolation, measured egress controls, formal vulnerability/penetration test cadence, enhanced retention/key isolation where justified.
