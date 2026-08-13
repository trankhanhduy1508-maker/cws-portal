# CWS Security Master Index

Status: complete MVP security design package on PR #40 branch. Production implementation is separately gated.

Read in order:
1. `CWS_SECURITY_ARCHITECTURE_V1.md` — Zero Trust baseline.
2. `CWS_SECURITY_ARCHITECTURE_V1_1_RENDER_FARM_HARDENED.md` — mature render-farm/host/worker hardening.
3. `CWS_SECURITY_ARCHITECTURE_V1_2_DRIVE_MANIFEST_HARDENING.md` — Google Drive multi-file/per-file verdict model.
4. `CWS_SECURITY_THREAT_MODEL_V1.md` — concrete attacker/threat model.
5. `CWS_SECURITY_CONTROL_MATRIX_V1.md` — threat-to-control/tool/fail-closed mapping.
6. `CWS_SECURITY_ABUSE_AND_TEST_PLAN_V1.md` — negative/security test specification.
7. `CWS_SECURITY_INCIDENT_RESPONSE_V1.md` — containment/recovery policy.
8. `CWS_SECURITY_PRODUCTION_CHECKLIST_V1.md` — production release gates.
9. `CWS_SECURITY_IMPLEMENTATION_PACKAGE_V1.md` — ordered engineering slices and Definition of Done.

## Design status
SECURITY_DESIGN_COMPLETE = YES
PRODUCTION_SECURITY_COMPLETE = NO

The remaining work is implementation/runtime verification, not missing security architecture.

## Non-negotiable invariants
- hostile until proven safe;
- quarantine before canonical B2;
- per-file/aggregate verdict for Drive submissions;
- scanner/unknown/error/timeout fails closed;
- no Worker master/service credentials;
- task-scoped data access;
- partner Host is a trust boundary;
- Blender untrusted Python autoexec OFF;
- cleanup is a security gate;
- cross-customer/task access denied;
- no AI/Founder/Admin dependency in normal runtime;
- no new infrastructure or product-boundary changes without Founder approval.
