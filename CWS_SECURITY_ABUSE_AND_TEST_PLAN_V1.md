# CWS Security Abuse Cases & Test Plan V1

Status: test specification. No production mutation authorized by this document.

## Ingress abuse cases

1. Anonymous user submits Drive/upload -> must reject before acquisition.
2. Authenticated Customer A references Customer B input -> deny.
3. Google Drive URL redirects to private/loopback/link-local/metadata host -> reject.
4. Redirect chain exceeds bound -> reject.
5. Download exceeds byte/time budget -> stop and fail closed.
6. `.blend` extension with non-Blender content -> TYPE_MISMATCH.
7. Known malware/EICAR-equivalent safe test fixture -> INFECTED; no canonical B2/INPUT_SAFE/Job.
8. Scanner unavailable -> SCAN_ERROR; no promotion.
9. Scanner timeout -> TIMEOUT; no promotion.
10. Signature database not ready under required policy -> fail closed.
11. Folder contains one clean `.blend` and one infected required asset -> whole submission fails.
12. Folder contains multiple `.blend` entrypoints with no deterministic resolution -> fail closed.
13. Unexpected executable/script/native library -> reject/quarantine per policy.
14. Drive manifest changes after acquisition -> canonical job remains bound to acquired hashes; never re-fetch mutable Drive content at Worker.

## Archive abuse cases

15. ZIP `../escape.blend` -> reject.
16. absolute/device path -> reject.
17. symlink/reparse/path escape -> reject where parser exposes it.
18. excessive entry count -> RESOURCE_LIMIT.
19. high compression ratio -> RESOURCE_LIMIT.
20. extracted-size overflow -> RESOURCE_LIMIT.
21. excessive nesting -> RESOURCE_LIMIT.
22. extraction timeout -> fail closed.
23. RAR parser cannot enforce equivalent bounds -> reject RAR, not bypass.
24. clean outer archive with infected extracted member -> fail submission.

## Blender execution abuse cases

25. `.blend` attempts Python autoexec -> Python autoexec remains disabled.
26. customer content attempts to write Node Agent files -> denied by OS ACL/privilege boundary.
27. customer content attempts scheduled persistence -> denied/alerted where worker policy supports it.
28. task tries to read unrelated task/customer path -> deny.
29. task tries to access service-role/master credential -> credential absent.
30. stale task generation attempts upload -> reject.

## Worker/Host abuse cases

31. Worker security state QUARANTINED tries claim -> no task assignment.
32. Worker misses required endpoint-protection posture -> restricted/quarantined according to policy.
33. Blender leaves child process after task -> cleanup kills; no ACTIVE_IDLE until clear.
34. workspace deletion fails -> Worker stays non-runnable/contained.
35. task capability remains usable after terminal state -> test must fail; capability must expire/revoke.
36. Worker attempts list/read unrelated B2 objects -> deny.
37. cloned Golden Image starts with shared credential -> must not exist.
38. worker_id collision/reuse attempt -> backend authoritative uniqueness, no overwrite.

## API/database abuse cases

39. frontend sends `INPUT_SAFE=true` -> ignored/rejected; only backend authoritative transition.
40. duplicate Drive callback/retry -> exactly one Job.
41. concurrent Job creation calls -> unique/idempotent exactly one Job.
42. stale lease tries finalize Task -> reject.
43. Customer A queries Customer B job/output -> deny.
44. malformed payment callback/reference -> output remains locked.

## Supply-chain/operations tests

45. security binary/package downloaded from untrusted source -> rollout blocked.
46. scanner version/signature evidence missing -> security readiness not claimed.
47. secrets accidentally appear in logs -> test sanitizer; rotate if real exposure.
48. security control unavailable at startup -> service must not silently claim secure readiness.
49. patch/update attempts to downgrade agent security boundary -> reject or require signed/approved release path.

## Required test tiers

### Unit
Parser/type/verdict/state transition/idempotency/path validation/limit logic.

### Integration
Drive acquisition mocks/controlled fixtures, scanner exit-code mapping, archive parser, B2 scoped access, DB RLS/idempotency, Worker cleanup simulation.

### Security negative
Every unsafe/unknown path proves `NO canonical B2 -> NO INPUT_SAFE -> NO Job` where applicable.

### Runtime one-Worker
Real authenticated Customer submission; quarantine/scanner evidence; canonicalization; exactly-one Job; one security-eligible Worker; Blender autoexec OFF; output; cleanup; return ACTIVE_IDLE.

### Multi-Worker
Only after Founder review of one-Worker gate. Verify no duplicate ownership, cross-task data access or stale generation acceptance.

## Security acceptance rule
A feature is not production-security VERIFIED unless the relevant negative test fails closed under real deployed runtime evidence. Passing happy-path tests is insufficient.
