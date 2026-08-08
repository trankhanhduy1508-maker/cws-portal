 the Worker identity contract.
- Evidence: `reports/evidence/CWS_PRODUCTION_WORKER_AUTO_BIND_AUDIT_2026-08-07.md`.

## Legacy/production parity audit — 2026-08-07

- **CODE/UNIT VERIFIED**: legacy capability inventory is reconciled against
  Node Agent → dynamic JobSpec → generic Worker Engine without restoring unsafe
  auto-install, autoexec, remote shutdown or remote update behavior.
- **CODE/UNIT VERIFIED**: pinned Blender bootstrap, scene asset preflight and
  redacted host telemetry are wired into the generic path.
- **BLOCKED/NOT VERIFIED**: physical Windows/Blender/B2/backend E2E remains
  required before Worker DONE.
- Evidence: `FEATURE_PARITY_LEGACY_VS_PRODUCTION.md`.

## Official Blender fixture gate — 2026-08-07

- **CODE/TEST VERIFIED**: downloader rejects HTML/error payloads and validates
  Blender/ZIP signatures before execution.
- **INPUT VERIFIED**: official `color_vortex.blend` fixture and SHA-256 are
  recorded in the worker evidence report.
- **BLOCKED**: physical Worker/B2/backend E2E remains unverified.

## Production provisioning gate progress — 2026-08-07

- **RUNTIME VERIFIED**: migrations 020/021/022 are applied and the production
  claim/spec/fencing RPCs verify present.
- **LOCAL PACKAGE VERIFIED**: current canonical Node Agent runtime is copied
  to the existing Desktop Worker package and compiles.
- **BLOCKED**: explicit Worker identity/credential and scoped B2 configuration
  are still required; no offline Worker ID was reused.

## Windows host readiness — 2026-08-07

- **REAL LOCAL RUNTIME VERIFIED**: official Blender 5.2.0 portable runtime
  opened and rendered the verified fixture on this Windows host.
- **BLOCKED**: authenticated production Node Agent, Worker identity, B2 and
  backend lease/completion are absent from the host.

## Production Node Agent / generic Worker audit — 2026-08-07

- **CODE VERIFIED**: canonical package is Node Agent → dynamic JobSpec/TaskSpec
  → `worker/worker_engine.py`; legacy worker files are not production runtime.
- **FIXED**: package launcher validation now matches the real `worker/` layout
  and pinned SHA-256 manifest.
- **CODE VERIFIED**: Google Drive folder resolver safely maps exactly one
  supported `.blend`/`.zip` child to a canonical file link.
- **BLOCKED/NOT VERIFIED**: production Node Agent adapter, physical Worker,
  B2 input/output, real Blender process and backend status callbacks are still
  absent from runtime evidence.
- Evidence: `reports/worker/CWS_PRODUCTION_NODE_AGENT_GENERIC_WORKER_AUDIT_2026-08-07.md`.

## Eevee stress benchmark — 2026-08-06

- **CODE/UNIT VERIFIED**: bounded unoptimized architectural Eevee scene
  generator, heavy-single/heavy-animation profiles, timeout runner and local
  metrics/report output are prepared.
- **REAL RUNTIME VERIFIED locally**: Blender 5.2.0 Eevee rendered heavy-single
  and 48-frame heavy-animation profiles. **UNVERIFIED/BLOCKED**: Worker A/B
  flow and failover stress still require authenticated staging hosts.
- Evidence: `reports/worker/CWS_BLENDER_UNOPTIMIZED_EEVEE_STRESS_TEST_2026-08-06.md`.

## Eevee stress WorkerEngine rehearsal — 2026-08-06

- **REAL RUNTIME VERIFIED locally**: same 48-frame scene completed Worker A
  checkpoint interruption and Worker B frame-level recovery with integrity
  checks and one local completion.
- **BLOCKED/UNVERIFIED**: authenticated Scheduler reassign, stale RPC fencing,
  B2 finalize, Admin state and Customer recovery require isolated staging.
- Evidence: `reports/worker/CWS_WORKER_EEVEE_STRESS_FLOW_2026-08-06.md`.

## Authenticated staging Eevee gate — 2026-08-06

- **IN_PROGRESS; CODE/UNIT VERIFIED**: exact scene manifest, read-only preflight,
  migration order and A/B authenticated runtime matrix.
- **BLOCKED**: staging Supabase/B2 configuration and two physical Worker
  identities are absent; no RPC, Admin or Customer runtime PASS is claimed.
- Evidence: `reports/worker/CWS_STAGING_EEVEE_AUTHENTICATED_RUNTIME_PREP_2026-08-06.md`.

## Staging identity/failover gate — 2026-08-06

- **BLOCKED** at staging DB preflight: no Supabase CLI/psql/MCP/endpoint or
  credential is available in this session.
- Ready order and exact command file:
  `reports/worker/CWS_STAGING_IDENTITY_FAILOVER_PREFLIGHT_BLOCKER_2026-08-06.md`.
- Offline simulation and automated tests are complete; physical two-Worker
  smoke remains pending staging access.

## Failover automation preparation — 2026-08-06

- Preflight: `worker_migrations/020_021_preflight_check.sql` (read-only).
- Rollback: `worker_migrations/020_021_rollback_runbook.md`.
- Provisioning: DPAPI helper plus explicit Windows least-privilege ACL wrapper.
- Offline simulator covers stale heartbeat, crash/reconnect, retry budget,
  fencing, duplicate completion, unhealthy replacement, no-capable-Worker and
  Idle Saver recovery. Evidence is code/unit only until physical staging.

## Worker identity and bounded failover — 2026-08-06

- Identity default is per-Worker DPAPI plus backend hash/HMAC/nonce
  verification; no Worker id credential and no shared fleet secret.
- Migration `021_production_failover_reassign_contract.sql` is prepared but
  not applied to production. It adds canonical resilient claim and bounded
  stale-lease reassign with `tasks.generation` fencing and `task_attempts`
  history.
- Staging provisioning/smoke procedure:
  `reports/worker/CWS_WORKER_PROVISIONING_FAILOVER_2026-08-06.md`.
- Production enablement remains gated on Founder approval, migration,
  per-Worker credential provisioning, Windows service/ACL setup and real
  staging/runtime verification.

## Remediation continuation — 2026-08-05

- P0 security: explicit CORS and staging RPC privilege hardening are verified; production Worker node authentication, secret rotation and Nest dependency canary remain gates.
- P0 host: SCM Node Agent and Job Object POCs have real runtime evidence; production integration and Session 0/user-session GPU split remain gates.
- P1 optimization: analyzer → working-copy plan/apply exists; ArchViz profiles are policy data only and require benchmark evidence before customer use.
- Remaining P0 gates: Owner secret rotation, production RPC change approval, Admin AAL2 runtime, and Nest 11 canary. No new Blender tradeoff optimization is in scope.
- 2026-08-06: Node Agent heartbeat remote I/O is **CODE/UNIT VERIFIED** with bounded single-flight dispatch; staging launchers opt in. Generic Worker Job Object ownership is **CODE/UNIT VERIFIED** behind an explicit flag. Live Windows renderer, hostile sandbox, SCM deployment and rollback remain gates. Evidence: `reports/worker/CWS_NODE_AGENT_NONBLOCKING_IO_JOB_OBJECT_2026-08-06.md`.
- 2026-08-06 full security audit: staging project downloads now require HTTPS, an explicit host allowlist, and no redirects; Worker offline suite is 38/38 PASS. Production Worker identity/RPC authentication, hostile Blend isolation, and physical Windows/GPU verification remain NO-GO gates. Evidence: `reports/security/CWS_FULL_WORKER_NODE_AGENT_SECURITY_AUDIT_2026-08-06.md`.
- 2026-08-06: production Worker identity contract prepared: per-worker
  credential hash + HMAC proof, timestamp/nonce replay cache, DPAPI storage,
  backend allowlisted RPC gateway and negative tests. Code/unit verified;
  migration 020, provisioning, Windows ACL/DPAPI and live RPC remain gates.
  Evidence: `reports/security/CWS_WORKER_PRODUCTION_IDENTITY_RPC_CONTRACT_2026-08-06.md`.

## Total review gates — 2026-08-05

- Security: staging admin RPC hardening is verified; production privilege migration, secret rotation, dependency upgrade and explicit CORS remain gates.
- Node Agent: staging runtime is verified; non-blocking heartbeat and Job Object ownership are code/unit verified, while SCM deployment, live Windows renderer, hostile isolation, quotas, update verification and rollback need evidence.
- Blender/ArchViz: read-only analyzer is verified on harmless staging input; optimization profiles are proposals until benchmarked.
- Production rollout remains **NO-GO** until security, Admin AAL2, isolation, observability, rollback and canary gates pass.

**Tên tài liệu:** `CWS_WORKER_ROADMAP.md`  
**Dự án:** Computer Workspace — CWS  
**Mục tiêu:** Hoàn thiện kiến trúc Worker sau khi MVP hoàn tất, bảo đảm tương thích cao với hệ thống hiện tại, có khả năng quan sát, phục hồi, điều phối lại công việc và thống kê thời gian thuê chính xác.

## Production Node Agent adapter preparation - 2026-08-07

## Golden E2E V2.4 worker contract - 2026-08-08

- **CODE/UNIT VERIFIED**: canonical `production_node_agent.py` accepts
  `.blend`, `.zip`, and `.rar`; RAR inspection/extraction uses managed 7-Zip
  argument vectors only, bounded declared/actual sizes and ratios, and rejects
  traversal, links, duplicate paths and nested archives.
- **CODE/UNIT VERIFIED**: customer Blend preparation is immutable original →
  read-only Blender analyzer → working copy → safe optimizer → analyzer
  validation → render. The original SHA-256 is checked before and after; no
  quality or render-engine tradeoff is applied without policy/benchmark.
- **CODE/UNIT VERIFIED**: customer Blender commands use background mode and
  `--disable-autoexec`; Worker has no B2 account key or Supabase service role,
  only job-scoped storage capabilities.
- **PRODUCTION GATE**: physical canonical Worker, managed 7-Zip, real B2
  capability, Blender process, progress/checkpoint/output and cleanup still
  require the exact Drive Golden task. Do not mark this roadmap PASS from unit
  tests or a heartbeat.

- **CODE/UNIT VERIFIED**: `worker/production_node_agent.py` is the canonical
  authenticated loop for dynamic JobSpec claim, Drive/B2 download, generic
  Engine execution, Blender Job Object containment, progress, checkpoint and
  fenced completion. Legacy Worker scripts and staging adapters are excluded.
- **PREPARED/NOT APPLIED**: migration
  `worker_migrations/022_production_dynamic_task_spec_rpc.sql` exposes the
  complete spec only for the current worker/generation lease.
- **NEEDS_VERIFICATION**: production migration, per-worker DPAPI provisioning,
  physical Blender runtime and real B2/Drive evidence.
- Evidence: `reports/worker/CWS_PRODUCTION_NODE_AGENT_ADAPTER_2026-08-07.md`.

---



> **Architecture correction 2026-08-05:** Job mới là dữ liệu JobSpec/TaskSpec. Canonical impw����G����ƭy�ost_id
- task_id
- attempt_id
- from_state
- to_state
- reason
- created_at

## `worker_incidents`

- worker_id
- host_id
- task_id
- attempt_id
- event_type
- severity
- error_code
- summary
- details
- timestamps
- occurrence_count
- resolution

## `task_attempts`

- task_id
- worker_id
- lease_generation
- fencing_token_hash
- assigned_at
- startup_started_at
- worker_ready_at
- billable_started_at
- render_started_at
- render_completed_at
- merge_completed_at
- upload_completed_at
- verification_completed_at
- billable_ended_at
- status
- failure_reason

## `host_usage_sessions`

- host_id
- worker_id
- task_id
- attempt_id
- startup_seconds
- startup_grace_seconds
- waiting_seconds
- render_seconds
- merge_seconds
- upload_seconds
- verification_seconds
- billable_seconds
- non_billable_seconds
- hourly_rate
- estimated_amount
- final_amount
- status

## Yêu cầu migration

- backward-compatible
- có index
- không mất dữ liệu
- có rollback
- timestamp server-side
- Worker không ghi số tiền cuối cùng

---

# 13. SECURITY

- Không commit Supabase key, B2 key, token hoặc password.
- Chuyển secret sang environment/config an toàn.
- Tạo `.env.example` chỉ có placeholder.
- Không log secret.
- Ghi chú rotate secret từng xuất hiện trong Git.
- Complete/fail/upload phải kiểm tra attempt, generation và fencing token.
- Worker không có quyền quyết định thanh toán cuối cùng.

---

# 14. FEATURE FLAGS

```env
CWS_ENABLE_NODE_STATE_MACHINE=true
CWS_ENABLE_POWER_MANAGER=true
CWS_ENABLE_INTEGRATED_VIDEO_MERGE=true
CWS_ENABLE_LEGACY_VIDEO_MERGE_FALLBACK=true
CWS_ENABLE_ADMIN_WORKER_DASHBOARD=true
CWS_ENABLE_HOST_USAGE_DASHBOARD=true
CWS_ENABLE_AUTO_REQUEUE=true
CWS_ENABLE_NODE_AGENT=false
CWS_ENABLE_PROCESS_GUARDIAN=false
CWS_ENABLE_AUTO_SLEEP=false
CWS_ENABLE_GPU_POWER_CONTROL=false
CWS_ENABLE_POWER_PLAN_SWITCH=false
```

---

# 15. THỨ TỰ COMMIT ĐỀ XUẤT

1. `docs(worker): audit current worker architecture`
2. `refactor(worker): isolate video merge lifecycle`
3. `feat(worker): integrate video merge with legacy fallback`
4. `feat(worker): add explicit worker state machine`
5. `feat(database): add worker lease and state event schema`
6. `feat(admin): add worker fleet and incident dashboard`
7. `feat(scheduler): add safe task requeue after lease expiry`
8. `feat(worker): reject stale attempts with fencing checks`
9. `feat(billing): add host usage sessions excluding startup grace`
10. `feat(host): add worker rental time dashboard`
11. `security(worker): move runtime secrets to environment`
12. `refactor(agent): add disabled process guardian skeleton`

Sau mỗi commit:

- chạy test liên quan
- syntax/import check
- lint/type check nếu có
- build phần bị ảnh hưởng
- kiểm tra migration
- ghi kết quả ngắn

Chạy full test trước khi kết thúc.

---

# 16. TIÊU CHÍ HOÀN THÀNH

- MVP hoàn tất trước Worker.
- Đọc đầy đủ ba file Worker.
- Phân biệt đúng launcher, supervisor và Worker logic.
- Ghép video tích hợp và còn fallback.
- Không double-spawn.
- Heartbeat sống khi render/merge/upload.
- Admin thấy trạng thái máy và sự cố.
- Mất heartbeat được requeue an toàn.
- Worker cũ không complete attempt mới.
- Host thấy thời gian thuê.
- 420 giây startup không tính billable.
- Không tính trùng giữa attempt.
- Không có secret thật trong diff.
- Test pass.
- Build pass.
- Migration có rollback.
- Có commit hash, branch và trạng thái push/PR.

---

# 17. PROMPT TIẾT KIỆM TOKEN DÙNG CHO CLAUDE CODE

> Luôn dùng prompt này khi giao nhiệm vụ từ roadmap. Không dán lại toàn bộ roadmap nếu Claude đã có file này trong repository.

```md
Đọc `CWS_WORKER_ROADMAP.md` và thực hiện đúng phase được giao.

Quy tắc:
- Báo cáo bằng tiếng Việt; code dùng tiếng Anh.
- Không tạo repo/worktree/thư mục dự án mới.
- Chỉ đọc file liên quan bằng search/grep, không đọc lại toàn repo.
- Không in toàn bộ code dài trong phản hồi.
- Ưu tiên tương thích với `cws_worker.bat`, `cws_worker_full.py` và `cws_auto_ghep_video.bat`.
- Không tạo supervisor mới nếu `cws_worker.bat` đã restart Worker.
- Không chuyển MQTT, Sleep/Hibernate, Wake-on-LAN, GPU power control hoặc viết lại Go/Rust.
- Chia commit nhỏ, test sau mỗi commit.
- Không đoán schema hoặc luồng; phải tìm code/RPC/migration liên quan.
- Nếu phase phụ thuộc MVP chưa hoàn tất thì hoàn thành MVP trước.
- Cuối nhiệm vụ chỉ báo:
  1. việc đã làm
  2. file/migration đã sửa
  3. test/build và kết quả
  4. rủi ro còn lại
  5. việc chưa làm
  6. commit hash, branch, push/PR

Nhiệm vụ hiện tại:
[CHỈ GHI PHASE HOẶC CÔNG VIỆC CỤ THỂ Ở ĐÂY]
```

---

# 18. CÁCH CHỌN MODEL ĐỂ TIẾT KIỆM CHI PHÍ

- Dùng model code tầm trung cho:
  - audit
  - search code
  - refactor module
  - UI dashboard
  - migration đơn giản
  - test
  - documentation
- Chỉ dùng model mạnh hơn khi gặp:
  - race condition khó
  - split-brain
  - fencing token
  - migration production phức tạp
  - lỗi lặp lại sau hai lần sửa
  - thay đổi ảnh hưởng nhiều module

Nên chia thành các phiên:

1. Audit Worker.
2. Tích hợp video merge.
3. State machine và database.
4. Dashboard admin.
5. Requeue và fencing.
6. Host usage.
7. Security và review cuối.

Không giao toàn bộ roadmap trong một phiên nếu không cần thiết.


---

# Node Agent / ACTIVE_IDLE — 2026-08-05

- `worker/node_agent.py` implements the first side-effect-free state machine: `ACTIVE_IDLE → PREPARING → WORKER_START → WORKER_RUNNING → RECOVERY/CLEANUP → ACTIVE_IDLE`.
- `worker/test_node_agent.py` verifies 6 offline contracts on Windows; evidence: `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md`.
- This is UNIT VERIFIED only. It does not claim real Backend lease/heartbeat, Blender, B2, Windows isolation, physical multi-node failover or power management.
- ACTIVE_IDLE explicitly does not call Sleep/Hibernate/shutdown/logoff; the PC remains online. Production adapters must be injected and tested against the canonical Worker artifact before enabling them.


# 19. Worker + Node Agent VIBE loop — 2026-08-05

- Canonical source trên main: `cws_worker_full.py` + `cws_worker.bat`; không dùng tên artifact cũ nếu không có ref tương ứng.
- `worker/canonical_worker_launcher.py` validate manifest version, direct-child paths và SHA-256 rồi mới gọi `cws_worker.bat`; không thêm supervisor, pip bootstrap hoặc power API.
- Node Agent state machine + pinned launcher offline suite: **9/9 PASS**, py_compile PASS. Evidence: `reports/worker/CWS_WORKER_NODE_AGENT_LOOP_2026-08-05.md`.
- Staging procedure: `reports/worker/CWS_WORKER_STAGING_PROCEDURE_1_18_0.md`.
- Chưa gọi PASS: Blender/B2 runtime, real claim/heartbeat, Windows ACL/service identity/Defender/process isolation, timeout/crash/retry runtime và multi-node failover.
- P0 tiếp theo: Owner chạy staging procedure trên Windows staging với B2 staging credential scoped và scene vô hại; sau đó mới xem xét rollout/failover.


# 20. Node Agent → Supabase → Admin visibility — 2026-08-05

- `worker-fleet-state.ts` is the backend mapping boundary for PC state. Heartbeat freshness, not Worker process existence, determines ONLINE/OFFLINE.
- Fresh heartbeat with Worker STOPPED/idle maps to ACTIVE_IDLE; stale heartbeat over 180 seconds maps to OFFLINE.
- `GET /fleet/workers` and Admin table expose Node state, Worker state, current task, last seen and health.
- Production route `/admin` now has SPA rewrite and pathname entry; runtime deploy/MFA verification remains UNVERIFIED.
- Evidence: `reports/worker/CWS_NODE_AGENT_ADMIN_FLEET_VISIBILITY_2026-08-05.md`.


# 20A. Node Agent lifecycle hardening — 2026-08-05

- `worker/node_agent.py` now has explicit transition reasons, injected runtime policy, bounded non-blocking exponential retry backoff and retry reset after cleanup.
- `worker/node_agent_runtime_policy.py` emits monitor-off/on boundary hooks once; it does not call power APIs or sleep the PC.
- Verification: py_compile PASS; offline suite **11/11 PASS**.
- Evidence: `reports/worker/CWS_NODE_AGENT_LIFECYCLE_HARDENING_2026-08-05.md`.
- Runtime process supervision, Blender/B2 staging, real heartbeat/lease, Windows isolation, failover and production deployment remain UNVERIFIED/BLOCKED.

# 20B. Windows staging verification — 2026-08-05

- Python 3.12.7 and Blender 5.2.0 LTS safe CLI render with disable-autoexec: REAL RUNTIME VERIFIED.
- Supabase connectivity only: REAL RUNTIME VERIFIED at HTTP reachability; authenticated staging heartbeat not attempted.
- Canonical Worker 1.18.0 spawn: BLOCKED because current Windows checkout lacks cws_worker_full.py and manifest is not canonical.
- B2 read-only: BLOCKED with HTTP 401; no write/delete.
- Node Agent → heartbeat → Worker → B2 → cleanup remains BLOCKED/UNVERIFIED.
- Evidence: reports/worker/CWS_WINDOWS_STAGING_VERIFICATION_2026-08-05.md.


# 20C. Generic Worker Engine correction — 2026-08-05

- Legacy cws_worker_full.py đã được đọc để salvage knowledge; không restore/copy và không còn là kiến trúc đích.
- Added worker/worker_engine.py và worker/test_worker_engine.py.
- Job mới chỉ truyền JobSpec/TaskSpec động; không hard-code job/customer/frame/B2 object.
- Node Agent owns PC lifecycle/supervision; Backend owns assignment/lease/priority/retry/billing; Worker owns one execution attempt.
- Engine test: 4/4 PASS; CODE/UNIT VERIFIED.
- Legacy salvage matrix: reports/worker/CWS_WORKER_LEGACY_SALVAGE_MATRIX_2026-08-05.md.


## P0 status update — 2026-08-05

Output integrity is implemented in the generic Worker Engine. PNG outputs are structurally checked before checkpoint/upload; tests are 22/22 PASS. Full B2/production runtime verification remains blocked by staging integration credentials/endpoints.


## P0 status update — timeout cleanup (2026-08-05)

Blender subprocess timeout now cleans up the owned process tree on Windows and preserves retry classification. Compile + combined suite 22/22 PASS; live timed-out Blender verification remains unverified.


## P0 status update — capability preflight (2026-08-05)

Generic Worker preflight now enforces dynamic minimum VRAM/RAM requirements from JobSpec against the Node-provided capability profile. Tests: 24/24 PASS; physical capability discovery remains unverified.


## Runtime integration status — 2026-08-05

Windows safe staging has verified the local Node Agent → Generic Worker → Blender → validation → checkpoint → cleanup → ACTIVE_IDLE loop, including crash recovery and timeout cleanup. Supabase/B2 integration remains blocked by absent staging-safe credentials/endpoints. Evidence: `reports/worker/CWS_WORKER_WINDOWS_RUNTIME_INTEGRATION_2026-08-05.md`.


## Staging E2E integration update — 2026-08-05

Credential-gated Supabase/B2 adapters are prepared with no production fallback or destructive capability. Full E2E remains blocked by missing staging credentials and complete assignment JobSpec contract.

## Staging blocker audit — 2026-08-05

Machine-safe env inspection found no staging values. Supabase connector exposes no separate staging project; the existing claim RPC contract is incomplete for a dynamic JobSpec. B2 staging endpoint/bucket/key are also absent. Owner inputs and exact assignment alternatives: `reports/worker/CWS_STAGING_BLOCKER_AUDIT_2026-08-05.md`.

## FULL staging E2E — REAL RUNTIME VERIFIED — 2026-08-05

The isolated staging path is now verified end-to-end: assignment/fencing generation → Node Agent child Generic Worker → real Blender render → integrity/checkpoint → B2 staging HEAD+SHA-256 verification → Supabase completion → cleanup → `ACTIVE_IDLE`. Evidence: `reports/worker/CWS_STAGING_FULL_E2E_REAL_RUNTIME_VERIFIED_2026-08-05.md`.
## P0 follow-up — 2026-08-05

- Multi-node/failover: **REAL RUNTIME VERIFIED** in staging, including stale takeover and generation fencing. Evidence: `reports/worker/CWS_MULTI_NODE_FAILOVER_REAL_RUNTIME_VERIFIED_2026-08-05.md`.
- Admin Fleet real runtime: **BLOCKED/UNVERIFIED** pending staging staff-role/AAL2 setup and deployed route verification.
- Hostile `.blend` isolation: **UNVERIFIED/BLOCKED** pending a disposable Windows Sandbox-capable host. Evidence: `reports/worker/CWS_HOSTILE_BLEND_ISOLATION_POC_2026-08-05.md`.
- Production rollout readiness: **NO-GO**. Evidence/checklist: `reports/worker/CWS_PRODUCTION_ROLLOUT_READINESS_2026-08-05.md`.
- Admin RBAC staging schema is applied and verified; real Admin UI remains **BLOCKED/UNVERIFIED** pending Owner Auth/MFA setup. Evidence: `reports/worker/CWS_ADMIN_FLEET_STAGING_AUTH_BLOCKER_2026-08-05.md`.
- Isolation POC has partial Job Object runtime evidence, but filesystem/network boundary is **UNVERIFIED/BLOCKED**; production remains **NO-GO**.

## P1 reliability follow-up — 2026-08-06

- Node Agent retry backoff now supports bounded opt-in jitter with deterministic tests; default timing is unchanged. Evidence: `reports/worker/CWS_NODE_AGENT_JITTER_HARDENING_2026-08-06.md`.
- Synchronous remote I/O, production SCM/Job Object integration, isolation, observability, rollback, and production authentication remain open gates.

## Capacity/concurrency follow-up — 2026-08-06

- Worker pull-claim remains database-serialized with `FOR UPDATE SKIP LOCKED`, capability checks, bounded retry, and generation fencing.
- Local scale simulation covers heartbeat/failure bursts only; Supabase/B2, physical Worker, and production capacity remain unverified.
- Next Worker scale gate is isolated staging load with 100/1,000 synthetic identities before any 1,000/10,000 redesign.
- Synthetic heartbeat jitter, reconnect storm and bounded failover simulation are included in `tests/scaling/cws_capacity_simulation.py`; no Supabase write capacity is claimed.

## Generic Worker hardening follow-up - 2026-08-06

- `worker_engine.py` streams filesystem checkpoint copies in bounded chunks and removes temporary files on interrupted writes.
- Attempt fencing is checked immediately before checkpoint storage writes, in addition to the post-checkpoint verification guard.
- Verification: `python -m unittest discover -s worker -p 'test_*.py'` - **49/49 PASS**.
- Remaining gate: authenticated staging/physical Worker runtime with real lease revocation and B2 behavior.
