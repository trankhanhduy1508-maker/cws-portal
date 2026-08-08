# CWS WORKER ROADMAP

## Input validation correction — 2026-08-08

- **FIXED**: production Node Agent accepts Blender-native Zstandard-compressed
  `.blend` files (`28 b5 2f fd`) in the B2-only validation/detection path, in
  addition to the ASCII `BLENDER` and gzip forms. The exact Owner input was
  observed in this form after canonical Drive materialization.
- This does not enable Worker-side Drive downloads; production Workers still
  claim only canonical B2 input capabilities. Legacy `cws_worker_full.py` was
  not changed.
- Runtime trace is blocked before task creation by missing real customer
  Supabase authentication, not by the Worker path:
  `reports/evidence/CWS_FULL_PRODUCTION_INTEGRATION_TRACE_2026-08-08.md`.

## Production auto-provision gate — 2026-08-07

- **READ-ONLY VERIFIED**: Supabase production has 29 Worker registry rows, 0
  identities, 0 leases, and 0 fresh heartbeats; the current registry cannot
  securely map `MAY083` by hostname or device fingerprint.
- **CODE VERIFIED**: the canonical Node Agent requires explicit per-worker
  identity and DPAPI credential. Do not restore legacy caller-supplied
  `register_worker`, infer a Worker ID, or introduce a shared fleet secret.
- **BLOCKED**: automatic first-run registration requires an approved bootstrap
  trust anchor before it can issue a per-worker credential. B2 provisioning and
  physical E2E remain downstream gates.
- Evidence: `CWS_PROVISIONING_AUTO_BIND_GATE_2026-08-07.md`.

## Worker/Node Agent production-path hardening — 2026-08-07

- **FIXED/CODE VERIFIED**: extension-neutral Drive input detection supports
  extensionless `.blend`/`.zip` links and fails closed on invalid payloads.
- **FIXED/CODE VERIFIED**: B2 checkpoint resume and verification hash the actual
  remote bytes; metadata alone is not accepted.
- **FIXED/CODE VERIFIED**: canonical Node Agent reports observed fleet states
  through authenticated RPC, mapping internal launch/run states to the Admin
  contract without power-management side effects.
- **VERIFIED**: Worker 69/69, backend 178/178 and backend build PASS; local
  Blender/WorkerEngine runtime evidence is recorded.
- **BLOCKED/NOT VERIFIED**: production identity, real Supabase lease/heartbeat,
  B2 upload and physical Worker E2E remain external gates.
- Evidence: `reports/worker/CWS_WORKER_NODE_AGENT_PRODUCTION_PATH_HARDENING_2026-08-07.md`.

## Production Worker auto-bind audit — 2026-08-07

- **READ-ONLY VERIFIED**: production `workers` has 29 offline rows, while
  `worker_identities` and `worker_leases` are empty. The current schema has no
  hostname or device-fingerprint field and no row maps verifiably to `MAY083`.
- **CODE VERIFIED**: canonical Node Agent startup requires
  `CWS_WORKER_ID` + DPAPI credential; its authenticated heartbeat does not
  register or derive a Worker identity. Legacy `register_worker` only trusted
  an explicit caller-supplied ID and is not restored.
- **BLOCKED**: automatic binding cannot be safely restored from current data.
  An approved bootstrap identity contract is required; reusing an offline ID
  by guess would violate the Worker identity contract.
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



> **Architecture correction 2026-08-05:** Job mới là dữ liệu JobSpec/TaskSpec. Canonical implementation direction là `worker/worker_engine.py` + `worker-engine.bat` + manifest. Các đoạn lịch sử nhắc artifact legacy không phải hướng dẫn triển khai mới.

# 1. NGUYÊN TẮC BẮT BUỘC

1. Chỉ triển khai roadmap Worker sau khi MVP hiện tại đã hoàn thành, build ổn định và các luồng chính đã được kiểm thử.
2. Không viết lại toàn bộ Worker từ đầu.
3. Không tạo repository hoặc worktree mới trên Windows.
4. Mọi thay đổi phải bám:
   - `AGENTS.md`
   - `CWS_ROADMAP_MVP_V1.md`
   - `CWS_MVP_WORKFLOW_FINAL.md`
   - `CWS_DATABASE_SCHEMA.md`
   - roadmap chính thức mới nhất nếu tồn tại
5. Ưu tiên số một là tương thích với generic Worker Engine và Node Agent contract hiện tại.
6. Legacy `cws_worker_full.py`/`cws_worker.bat` chỉ là knowledge/evidence đã salvage; không restore, copy hoặc dùng làm dependency.
7. Không tạo Worker source mới cho từng JobSpec. Generic Engine được cài một lần; Node Agent là supervisor duy nhất.
8. `cws_auto_ghep_video.bat` chỉ là legacy evidence; output merge mới phải là capability/adapter của Engine khi có correctness evidence.
8. Không triển khai Sleep, Hibernate, Wake-on-LAN, MQTT, GPU power limit hoặc viết lại Worker bằng Go/Rust trong giai đoạn này.
9. Mọi thay đổi phải có feature flag, test, rollback, log và migration tương thích nếu có thay đổi database.
10. Không được lưu secret thật trong source hoặc báo cáo.

---

# 2. BA FILE WORKER BẮT BUỘC PHẢI ĐỌC

## 2.1. `cws_worker_full.py`

Phải xác định:

- entrypoint
- main loop
- registration
- heartbeat
- polling
- claim task
- generation, lease hoặc stale protection
- download
- scene analysis
- optimization
- Blender execution
- checkpoint frame
- video merge
- upload
- verify
- complete/fail task
- auto-update
- remote command
- remote shutdown
- error recovery
- logging
- credential
- quan hệ với các file `.bat`

## 2.2. `cws_worker.bat`

Phải xác định:

- có phải entrypoint production hay không
- có gọi portable Python hay không
- có vòng lặp restart hay không
- có xử lý exit code hay không
- có ghi log hay không
- có thiết lập environment/path hay không
- có chống chạy nhiều instance hay không
- có đang đóng vai trò supervisor hay không

## 2.3. `cws_auto_ghep_video.bat`

Phải xác định:

- công cụ ghép video
- input/output
- frame order
- FPS
- codec
- audio
- cách xử lý file trung gian
- exit code
- timeout
- lỗi
- điều kiện thành công
- cleanup

---

# 3. PHASE 0 — HOÀN THÀNH MVP TRƯỚC

## Mục tiêu

Xác minh MVP đã hoàn thành thực sự, không chỉ dựa trên tên file hoặc commit.

## Việc cần làm

- Đọc roadmap và tài liệu chính thức.
- Kiểm tra frontend, backend, database, upload, payment, notification, scheduler và dashboard.
- Chạy build.
- Chạy test liên quan.
- Kiểm tra luồng nghiệp vụ chính.
- Liệt kê phần MVP còn thiếu.
- Hoàn thành MVP trước khi sửa Worker.

## Điều kiện qua phase

- Build pass.
- Luồng MVP chính hoạt động.
- Không còn hạng mục MVP P0/P1 đang dang dở.
- Có báo cáo xác nhận MVP hoàn tất.

---

# 4. PHASE 1 — AUDIT TOÀN BỘ HỆ SINH THÁI WORKER

## Mục tiêu

Hiểu đầy đủ Worker hiện tại trước khi sửa.

## Phạm vi tìm kiếm

- worker registration
- heartbeat
- `worker_ping`
- scheduler
- queue
- RPC
- generation
- lease
- stale task
- requeue
- checkpoint
- upload
- storage
- auto-update
- remote command
- remote shutdown
- admin dashboard
- host dashboard
- billing
- incident
- migration
- Edge Function
- cron
- cleanup
- notification

## Báo cáo bắt buộc trước commit đầu tiên

1. Trạng thái MVP.
2. Vai trò của ba file Worker.
3. Entry point production.
4. Supervisor hiện tại.
5. Call graph.
6. Dependency map.
7. Luồng nhận job đến hoàn thành.
8. Luồng heartbeat.
9. Luồng generation/requeue.
10. Luồng ghép video.
11. Database và RPC liên quan.
12. File sẽ sửa.
13. File có thể bị ảnh hưởng.
14. Rủi ro tương thích.
15. Kế hoạch rollback.

---

# 5. PHASE 2 — TÍCH HỢP GHÉP VIDEO

## Mục tiêu

Đưa chức năng của `cws_auto_ghep_video.bat` vào `cws_worker_full.py` hoặc module Python riêng.

## Yêu cầu

- Không sao chép mù lệnh BAT.
- Giữ output tương thích.
- Có timeout.
- Có kiểm tra exit code.
- Có stdout/stderr log.
- Có xác minh input/output.
- Có retry phù hợp.
- Không complete task khi merge thất bại.
- Chỉ merge với job cần merge.
- Giữ BAT làm fallback trong giai đoạn chuyển tiếp.

## Luồng

```text
RENDERING
→ MERGING nếu cần
→ UPLOADING
→ VERIFYING
→ COMPLETE
```

## Feature flags

```env
CWS_ENABLE_INTEGRATED_VIDEO_MERGE=true
CWS_ENABLE_LEGACY_VIDEO_MERGE_FALLBACK=true
```

## Test tối thiểu

- merge thành công
- thiếu frame
- sai thứ tự frame
- thiếu công cụ merge
- timeout
- exit code lỗi
- output rỗng
- fallback BAT
- job không cần merge

---

# 6. PHASE 3 — STATE MACHINE WORKER

## Mục tiêu

Chuẩn hóa trạng thái Worker và tránh race condition.

## Nguyên tắc

Tách:

- `desired_state`: backend/scheduler yêu cầu
- `observed_state`: Worker/Agent báo thực tế

Không để hai bên tranh ghi một cột `status`.

## Trạng thái chính

```text
OFFLINE
BOOTING
HEALTH_CHECK
IDLE_WAITING_JOB
RESERVED
PREPARING
RENDERING
MERGING
UPLOADING
VERIFYING
COOLDOWN
DRAINING
MAINTENANCE
DEGRADED
QUARANTINED
ERROR
```

## Dữ liệu transition

- worker_id
- host_id
- task_id
- attempt_id
- generation
- from_state
- to_state
- timestamp server-side
- reason
- error_code

## Luồng chuẩn

```text
BOOTING
→ HEALTH_CHECK
→ IDLE_WAITING_JOB
→ RESERVED
→ PREPARING
→ RENDERING
→ MERGING nếu cần
→ UPLOADING
→ VERIFYING
→ COOLDOWN
→ IDLE_WAITING_JOB
```

---

# 7. PHASE 4 — ACTIVE IDLE POWER MANAGEMENT

## Khi máy rảnh

- dừng Blender và tiến trình nặng
- tắt màn hình một lần
- tiếp tục heartbeat
- tiếp tục nhận job
- để Windows và GPU tự idle
- không gọi tắt màn hình lặp lại trong mỗi vòng poll

## Khi có job

- ngăn Windows sleep
- không bắt buộc bật màn hình
- giữ heartbeat xuyên suốt
- không thay GPU clock
- không thay GPU voltage
- không thay GPU power limit
- không cưỡng chế Ultimate Performance

## Chưa làm

- Sleep
- Hibernate
- Wake-on-LAN
- Wake-on-Wi-Fi
- MQTT
- EMQX
- Redis
- vô hiệu hóa Windows Update

---

# 8. PHASE 5 — ADMIN DASHBOARD CHO WORKER

## Dữ liệu máy

- worker ID
- host/quán net
- tên máy
- khu vực
- CPU
- GPU
- VRAM
- RAM
- disk trống
- Agent version
- Worker version
- Blender version
- observed state
- desired state
- health state
- task hiện tại
- heartbeat cuối
- state transition cuối
- task thành công/thất bại
- crash count
- lý do DEGRADED/QUARANTINED

## Trạng thái hiển thị

```text
ONLINE_AVAILABLE
IDLE_WAITING_JOB
RESERVED
PREPARING
RENDERING
MERGING
UPLOADING
VERIFYING
OFFLINE
POWER_LOSS_SUSPECTED
NETWORK_DISCONNECTED
WORKER_CRASHED
BLENDER_CRASHED
GPU_ERROR
DISK_FULL
DEGRADED
QUARANTINED
MAINTENANCE
```

## Nguyên tắc cập nhật

- database là nguồn sự thật
- realtime chỉ là tín hiệu
- polling là fallback
- heartbeat phải nhẹ
- telemetry nặng gửi chậm hơn hoặc khi có thay đổi/lỗi
- không tạo log DB cho từng heartbeat

---

# 9. PHASE 6 — INCIDENT VÀ LỖI

## Dữ liệu incident

```text
event_id
worker_id
host_id
task_id
attempt_id
event_type
severity
error_code
summary
details
first_seen_at
last_seen_at
occurrence_count
resolved_at
resolution
```

## Lỗi tối thiểu

- Worker crash
- mất heartbeat
- Blender crash
- Blender treo
- GPU driver reset
- GPU quá nhiệt
- CPU quá nhiệt
- thiếu RAM
- disk full
- download fail
- upload fail
- merge fail
- verify fail
- network disconnect
- power loss suspected
- stale generation
- lease expired
- duplicate Worker
- auto-update fail
- config thiếu
- file khách hàng lỗi
- thiếu renderer/plugin

## Admin dashboard cần

- lọc theo host
- lọc theo Worker
- lọc theo task
- lọc theo severity
- lọc theo thời gian
- số lỗi chưa xử lý
- lần xảy ra gần nhất
- hành động retry/requeue/quarantine/drain
- audit log hành động admin

---

# 10. PHASE 7 — MẤT ĐIỆN VÀ TỰ ĐIỀU PHỐI

## Luồng phát hiện

```text
RENDERING
→ mất heartbeat
→ SUSPECTED_OFFLINE
→ hết grace/lease
→ OFFLINE_UNRESPONSIVE hoặc POWER_LOSS_SUSPECTED
→ fencing attempt cũ
→ requeue phần chưa hoàn thành
→ chọn máy khác
```

## Thứ tự ưu tiên máy thay thế

1. `IDLE_WAITING_JOB`
2. `ONLINE_AVAILABLE`
3. đúng GPU/RAM/VRAM/software/plugin
4. đủ disk
5. không DEGRADED/QUARANTINED
6. cùng khu vực hoặc mạng phù hợp
7. có thể resume từ checkpoint

## Chống zombie/split-brain

```text
task_id
attempt_id
lease_generation
fencing_token
lease_expires_at
worker_id
```

Khi requeue:

- tăng generation
- token cũ không được complete
- output cũ bị từ chối hoặc cách ly
- không tính tiền hai lần
- chỉ dùng checkpoint đã xác minh trên storage

Không kết luận chắc chắn cúp điện ngay khi mất heartbeat; có thể là mất mạng.

---

# 11. PHASE 8 — THỐNG KÊ THỜI GIAN THUÊ HOST

## Mốc thời gian cần lưu

```text
reservation_started_at
startup_started_at
worker_ready_at
billable_started_at
render_started_at
render_completed_at
merge_completed_at
upload_completed_at
verification_completed_at
billable_ended_at
```

## Quy tắc 7 phút

```text
startup_grace_seconds = 420
```

Bảy phút khởi động:

- được lưu để thống kê
- không tính billable
- không tính doanh thu host
- không tính chi phí khách hàng

Nếu máy đã `IDLE_WAITING_JOB`, không tạo thêm 7 phút startup.

Nếu máy vừa khởi động cho job, loại trừ tối đa 420 giây đầu.

Phần khởi động vượt quá 7 phút:

- chưa tự động tính tiền
- đánh dấu `DECISION_REQUIRED` nếu roadmap chưa quy định

## Dashboard host

- máy
- task/order
- startup time
- 7 phút miễn tính
- waiting time
- render time
- merge time
- upload time
- verify time
- billable time
- non-billable time
- interruption/requeue
- đơn giá
- doanh thu dự kiến
- doanh thu cuối
- trạng thái thanh toán

Backend tính thời gian và số tiền; Worker không được tự quyết định billing.

---

# 12. DATABASE DỰ KIẾN

Kiểm tra schema hiện tại trước khi tạo mới.

## `workers`

- id
- host_id
- machine_name
- desired_state
- observed_state
- health_state
- current_task_id
- current_attempt_id
- current_generation
- boot_id
- session_id
- agent_version
- worker_version
- last_seen_at
- last_transition_at
- state_reason
- timestamps

## `worker_leases`

- worker_id
- boot_id
- session_id
- sequence_number
- renewed_at
- expires_at

## `worker_state_events`

- worker_id
- host_id
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
