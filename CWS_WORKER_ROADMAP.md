# CWS WORKER ROADMAP

**Tên tài liệu:** `CWS_WORKER_ROADMAP.md`  
**Dự án:** Computer Workspace — CWS  
**Mục tiêu:** Hoàn thiện kiến trúc Worker sau khi MVP hoàn tất, bảo đảm tương thích cao với hệ thống hiện tại, có khả năng quan sát, phục hồi, điều phối lại công việc và thống kê thời gian thuê chính xác.

---

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
5. Ưu tiên số một là tính tương thích với Worker hiện tại.
6. Không được nhầm vai trò của:
   - `cws_worker.bat`
   - `cws_worker_full.py`
   - `cws_auto_ghep_video.bat`
7. Không thêm supervisor mới nếu `cws_worker.bat` đã tự restart Worker.
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
