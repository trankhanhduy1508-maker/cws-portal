# CWS Worker/Fleet test matrix — 1.18.0

| Area | Test | Current status |
|---|---|---|
| Manifest | Tamper/missing artifact fails closed | Offline PASS |
| Blender | Harmless scene + --disable-autoexec | OWNER staging |
| B2 | Checkpoint and checksum | OWNER staging sandbox |
| Recovery | Restart after checkpoint | OWNER staging |
| Timeout | Timeout/requeue/no orphan | OWNER staging |
| Cleanup | Output removed after outcome | Code/static PASS; staging pending |
| Isolation | Package RX/data Modify | Script parse/plan; ACL pending |
| Fleet | Two workers claim/fence/failover | RPC evidence; runtime pending |
| Power | Pure state transitions | Offline PASS |
| Wake | Physical sleep/wake | OWNER hardware test |

Static tests do not establish Blender/B2/ACL/multi-node production readiness.
