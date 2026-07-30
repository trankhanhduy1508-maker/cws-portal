# Worker Fleet Audit — CWS_WORKER_ROADMAP.md

Tài liệu theo dõi tiến độ thực hiện `CWS_WORKER_ROADMAP.md`, tương tự cách
`docs/MVP_GAP_REPORT.md` theo dõi domain MVP. Cập nhật lần cuối: 2026-07-31.

---

## ⚠️ RỦI RO TỔNG QUÁT CẦN ĐỌC TRƯỚC: chưa test bất kỳ thay đổi Worker nào bằng máy thật

Toàn bộ Phase 2/3/4 (video merge, state machine, power management —
commit `c6d64f3`, `a728763`, `487aee3`, `f313e93`, `a1aadbd`) mới chỉ
được kiểm tra TĨNH (đọc lại thủ công, cân bằng ngoặc, không còn lỗi
f-string) do môi trường làm việc này KHÔNG có Python/Blender/ffmpeg để
chạy thử thật. Phase 4 đặc biệt dùng trực tiếp Windows API qua `ctypes`
(`SetThreadExecutionState`, `SendMessageW`) — đây là lần ĐẦU TIÊN trong
toàn phiên có code động vào hệ điều hành thật của máy Worker. **Bắt buộc
xác nhận trên ít nhất 1 máy Worker Windows thật trước khi coi bất kỳ
phần nào trong số này là sẵn sàng production** — đặc biệt kiểm tra
không có lỗi cú pháp ẩn nào khiến `cws_worker_full.py` không chạy được
(nếu vậy, `cws_worker.bat` sẽ cứ restart liên tục, không có cách nào
biết từ xa).

---

## Phase 0 — Xác nhận MVP hoàn tất

Đã xác nhận đủ điều kiện mở khóa Worker (theo yêu cầu trực tiếp của người
dùng, xem `docs/MVP_GAP_REPORT.md` để biết chi tiết đầy đủ):
- Build/test backend PASS (37/37 test tại thời điểm audit).
- Build/lint frontend PASS.
- Không còn hạng mục MVP P0/P1 dang dở về code.
- Điểm duy nhất chưa đạt 100%: chưa test UI bằng mắt trên trình duyệt thật
  (không có công cụ browser trong môi trường làm việc) — người dùng xác
  nhận bỏ qua điểm này để mở khóa Worker.

---

## Phase 1 — Audit hệ sinh thái Worker (HOÀN THÀNH)

### Vai trò 3 file

- **`cws_worker_full.py`** — TOÀN BỘ logic Worker thật (không phải
  launcher). Tự cài Blender/thư viện Python, tải file .blend, phân
  tích/tối ưu scene, render từng frame, validate ảnh, upload B2, gọi RPC
  Supabase (claim/heartbeat/complete/fail).
- **`cws_worker.bat`** — launcher + bootstrap Python portable + supervisor
  tự restart (vòng lặp `:check_update` → `:launch_python` → cooldown 15s
  → lặp lại) + auto-update (so sánh `worker_config.latest_version`). CHỦ
  Ý giữ đơn giản (dựa theo triết lý `condor_master` của HTCondor) — KHÔNG
  chứa logic render nào. KHÔNG có cơ chế chống double-spawn.
- **`cws_auto_ghep_video.bat`** — công cụ ghép video độc lập, chạy tay,
  KHÔNG được `cws_worker_full.py` gọi. Dùng RPC `get_job_render_summary`
  (CSV) + `aws s3 sync` + đếm đủ frame + `ffmpeg -framerate ... -crf 18`.

### Entry point / Supervisor

`cws_worker.bat` là entry point production (double-click) và supervisor
duy nhất (tự restart Python nếu crash). KHÔNG cần thêm supervisor mới.

### Cơ chế fencing/staleness đã có sẵn (phát hiện qua đọc trực tiếp RPC/cron
đang chạy thật trên Supabase — KHÔNG có trong repo trước audit này)

- `mark_stale_workers_offline()` — pg_cron mỗi 2 phút, set
  `workers.status='offline'` nếu `last_seen_at` im lặng > 180s.
- `requeue_stale_tasks()` — pg_cron mỗi 2 phút, requeue task + tăng
  `tasks.generation` (fencing token thô sơ) nếu `last_heartbeat` > 240s.
- `update_task_stage()` RPC tồn tại (ghi `tasks.current_stage`/
  `stage_entered_at`, cột cũng đã có sẵn) nhưng **`cws_worker_full.py`
  chưa từng gọi RPC này** — tích hợp dang dở từ trước.

### Quyết định Phase 3: mở rộng trên nền có sẵn

Theo xác nhận trực tiếp của người dùng: KHÔNG thay thế 2 cron job trên
bằng cơ chế lease/fencing mới hoàn toàn — chỉ THÊM cột/bảng mới bên cạnh.

---

## Phase 2 — Tích hợp ghép video (ĐÃ COMMIT, CẦN PORT LẠI)

Commit `c6d64f3` đã tích hợp `attempt_job_video_merge()` vào
`cws_worker_full.py`, dùng `boto3` thay vì đòi hỏi cài `aws` CLI, giữ
`cws_auto_ghep_video.bat` làm fallback, gate bằng feature flag
`CWS_ENABLE_INTEGRATED_VIDEO_MERGE` (mặc định `false`).

**⚠️ CẦN LÀM LẠI:** commit này được xây trên baseline
`WORKER_VERSION="1.14.0"` trong git, nhưng `worker_config.latest_version`
trên Supabase đã là `"1.16.5"` (cập nhật 2026-07-28, TRƯỚC cả khi file
`.py` được upload vào repo 2026-07-31) — nghĩa là baseline trong git CŨ
HƠN bản thật đang được coi là "mới nhất". Đang chờ người dùng upload lại
đúng bản `1.16.5` thật (qua GitHub web) để đối chiếu và port lại thay đổi
Phase 2 lên đúng baseline, tránh sửa nhầm/mất tính năng đã có trong 1.16.5
mà chưa từng thấy.

---

## Phase 3 — State machine (SCHEMA + RPC + PYTHON ĐÃ XONG, CHƯA TEST THẬT)

Migration `worker_migrations/001_worker_state_machine_schema.sql` đã
apply thật lên Supabase (project `ynhxlxetwuiyejcjypsi`):
- `workers` thêm cột: `desired_state`, `observed_state`, `health_state`,
  `current_task_id`, `current_generation`, `boot_id`, `session_id`,
  `agent_version`, `worker_version`, `last_transition_at`, `state_reason`
  (tất cả nullable, ADD-ONLY).
- Bảng mới: `worker_leases`, `worker_state_events`, `task_attempts` — đã
  bật RLS (không có policy, theo đúng quy ước bảo mật hiện có cho
  `payments`/`sites`/`machine_capability`, xác nhận qua `get_advisors`).

**✅ RPC + Python wiring đã xong (commit `487aee3` + `f313e93`, 2026-07-31):**
- RPC mới `report_worker_state_transition(p_worker_id, p_to_state, p_task_id, p_reason)`
  — ghi `workers.observed_state`/`last_transition_at`/`state_reason`, CHỈ
  insert vào `worker_state_events` khi thật sự đổi trạng thái (tránh phình
  bảng). KHÔNG đụng `workers.status` hiện có (vẫn là nguồn sự thật cho
  `mark_stale_workers_offline`/`requeue_stale_tasks`/`claim_task`/...).
- Hàm Python mới `report_state()` (wrapper mỏng, best-effort) gọi RPC này
  tại 5 điểm chuyển trạng thái tự nhiên trong `worker_loop()`: `BOOTING`
  (lúc khởi động) → `IDLE_WAITING_JOB` (chờ task) → `PREPARING` (vừa
  claim, đang tải blend/phân tích scene) → `RENDERING` (đang render) →
  `MERGING` (đặt BÊN TRONG `attempt_job_video_merge()`, sau các guard
  clause — không đặt trước lời gọi vì hàm này thường no-op) → `COOLDOWN`
  (vừa xong 1 task, chuẩn bị tìm task tiếp theo).
- KHÔNG bịa thêm state ngoài những gì code thật sự phân biệt được
  (`HEALTH_CHECK`/`RESERVED`/`UPLOADING`/`VERIFYING`/`DRAINING`/
  `MAINTENANCE`/`DEGRADED`/`QUARANTINED`/`ERROR` — chưa có nhánh code nào
  tương ứng rõ ràng, để lại cho các Phase sau nếu cần).

⚠️ **CHƯA test bằng Worker thật.** Tự phát hiện + tự sửa 1 lỗi f-string
"%%" lặp lại (đã từng mắc và sửa trước đó trong cùng file) trước khi
commit — rút kinh nghiệm cần đọc lại kỹ hơn mỗi lần thêm f-string mới.

**Chưa làm:** Backend/Admin Dashboard đọc `observed_state`/
`worker_state_events` (Phase 5); `worker_leases` (chưa có code nào ghi —
để dành cho Phase 7 fencing/split-brain).

---

## Phase 4 — Active Idle Power Management (XONG, CHƯA TEST THẬT)

Commit `a1aadbd`. Chỉ dùng 2 Windows API chuẩn qua `ctypes` (không cần
quyền Admin, không đụng registry/powercfg/Task Scheduler):
- `prevent_windows_sleep()` — `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)`,
  gọi lúc bắt đầu có task (`PREPARING`) — ngăn Windows tự Sleep giữa
  chừng lúc đang render.
- `allow_windows_sleep_and_turn_off_monitor_once()` — trả lại quyền tự
  quản lý idle cho Windows + tắt màn hình ĐÚNG 1 LẦN (`SendMessageW` +
  `SC_MONITORPOWER`) khi bắt đầu rảnh, dùng biến module
  `_monitor_turned_off_while_idle` để không gọi lặp lại mỗi vòng poll
  (đúng yêu cầu roadmap).
- `reset_monitor_off_flag_on_new_task()` — reset cờ khi claim task mới.

KHÔNG đụng GPU clock/voltage/power limit — đúng phạm vi Phase 4. "Dừng
Blender lúc rảnh" không cần code thêm — kiến trúc hiện tại (Blender chỉ
chạy ngắn hạn qua `subprocess.run()` mỗi frame) đã tự nhiên đúng yêu cầu
này.

**⚠️ Đây là lần ĐẦU TIÊN trong toàn phiên có code động vào Windows API
thật** (khác các thay đổi trước chỉ là logic Python/RPC thuần) — rủi ro
cao nhất trong tất cả các Phase đã làm, xem mục cảnh báo ở đầu file.

---

## Phase 5 — Admin Dashboard cho Worker (MỘT PHẦN, ĐÃ TEST BUILD THẬT)

Commit `092441e` — khác Phase 2/3/4 (Python, chỉ kiểm tra tĩnh), phần
này là Backend/Frontend nên đã build/test/lint THẬT + boot thật, không
chỉ đọc lại thủ công.

- `WorkerFleetGateway.listWorkers()` — thêm đọc `observed_state`/
  `state_reason`/`last_transition_at` (cột Phase 3, `worker_migrations/001_...`)
  BÊN CẠNH `status` hiện có (idle/busy/offline, vẫn là nguồn sự thật
  chính) — trả `null` an toàn nếu Worker đang chạy bản cũ chưa có tính
  năng báo cáo `observed_state` (Phase 3, commit `f313e93`).
- `AdminScreen.jsx` — thêm cột "Trạng thái chi tiết" trong bảng Worker
  Fleet, hiển thị `observedState` + thời gian tương đối kể từ
  `lastTransitionAt`, tooltip hiện `stateReason`.

**Range đầy đủ Phase 5 CHƯA làm** (cần dữ liệu Worker chưa từng thu
thập — CPU/RAM/disk/version/incident — đòi hỏi thêm code Python thu
thập thông tin hệ thống, một hạng mục riêng, chưa làm trong đợt này để
tránh dồn thêm rủi ro chưa test vào `cws_worker_full.py`): `worker_incidents`
(Phase 6), CPU/RAM/disk trống/Agent version/Blender version, các trạng
thái hiển thị mở rộng (`POWER_LOSS_SUSPECTED`/`NETWORK_DISCONNECTED`/
`WORKER_CRASHED`/`BLENDER_CRASHED`/`GPU_ERROR`/`DISK_FULL`/`DEGRADED`/
`QUARANTINED`/`MAINTENANCE`).

Build/test backend (37/37) + lint + boot thật đã xác nhận PASS. Frontend
oxlint + vite build PASS.

---

## Phase 6 — Incident tracking (TỐI THIỂU, ĐÃ TEST BUILD THẬT phần Backend/Frontend)

Commit `3cfb241`. **MỞ RỘNG TRÊN NỀN CÓ** (giữ nguyên tinh thần quyết định
Dy 2026-07-31 cho Phase 3): `report_worker_crash()` RPC ĐÃ CÓ SẴN (đang
chạy thật, cập nhật `workers.crash_count`/`last_crash_message`) — CHỈ
thêm 1 lời gọi `report_worker_incident()` ở cuối RPC đó, nên **WORKER_CRASH
tự động có dữ liệu structured trong `worker_incidents` mà KHÔNG cần sửa 1
dòng Python nào**.

- `worker_migrations/004_worker_incidents_schema.sql` (đã apply lên
  Supabase qua MCP trước khi commit): bảng `worker_incidents` đúng cột
  roadmap section 9 (event_type/severity/error_code/summary/details/
  first_seen_at/last_seen_at/occurrence_count/resolved_at/resolution) +
  RPC `report_worker_incident()` (upsert dedup theo worker_id+event_type+
  error_code+task_id, CHỈ xét incident chưa `resolved_at`) + mở rộng
  `report_worker_crash()`. RLS enabled, không có policy (đúng quy ước nội
  bộ đã dùng cho `worker_leases`/`worker_state_events`/`task_attempts`).
- `cws_worker_full.py` — CHỈ 1 điểm wiring Python MỚI: hàm `report_incident()`
  (best-effort y hệt `report_state()`), gọi tại `except` của
  `attempt_job_video_merge()` (đã có try/except sẵn từ Phase 2) →
  `event_type="MERGE_FAIL"`. KHÔNG động vào các loại sự cố còn lại trong
  "Lỗi tối thiểu" của roadmap (GPU/CPU quá nhiệt, disk full, mất
  heartbeat, network disconnect...) — CHƯA có code phát hiện các lỗi này
  ở đâu cả, thêm detection mới sẽ vượt quá phạm vi "refactor nhỏ", để lại
  vòng sau.
- Backend: `WorkerFleetGateway.listIncidents()` + `GET /fleet/incidents`
  (lọc `workerId`/`severity`/`resolved`, `AdminKeyGuard`, CHỈ đọc).
- Frontend: `AdminScreen.jsx` — bảng "Sự cố Worker Fleet" ngay dưới bảng
  Worker Fleet, lọc theo severity + checkbox "Hiện cả đã xử lý".

**CHƯA làm ở round này:** nút retry/requeue/quarantine/drain (Admin
Dashboard mục "cần" của Phase 6) — đây là hành động đụng vào chính luồng
dispatch Worker Fleet (task/worker status), rủi ro cao hơn hẳn 1 bảng
chỉ-đọc, để lại vòng sau sau khi Phase 2/3/4 đã được xác nhận trên máy
thật; audit log hành động admin (phụ thuộc các nút trên, chưa có); các
loại sự cố khác (GPU/CPU quá nhiệt, disk full, mất heartbeat, network
disconnect, stale generation, lease expired, duplicate Worker,
auto-update fail, config thiếu, file khách hàng lỗi, thiếu
renderer/plugin) — không có code phát hiện, sẽ không xuất hiện trong
`worker_incidents` cho tới khi được làm riêng.

Build/test backend (37/37) + lint PASS (chỉ 2 file Backend có diff thật,
phần còn lại là CRLF-noise quen thuộc đã restore). Frontend oxlint + vite
build PASS. Phần Python (`report_incident()` + 1 điểm wiring) — vẫn
KHÔNG có Python/Blender trong môi trường này để chạy thử thật, chỉ kiểm
tra tĩnh (cân bằng ngoặc cả file, không còn lỗi f-string `%%`, đối chiếu
scope biến `task_id`/indent với code xung quanh) — CỘNG DỒN vào rủi ro
"chưa test trên máy thật" đã nêu ở các Phase 2/3/4.

---

## Phase 7 — Mất điện và tự điều phối (CHỈ Postgres, ĐÃ TEST TRÊN DỮ LIỆU THẬT)

Commit `285e6b6`. Rủi ro thấp hơn hẳn Phase 2-6 vì **KHÔNG cần sửa 1 dòng
Python nào** — toàn bộ nằm ở `worker_migrations/005_requeue_incident_visibility.sql`,
mở rộng 2 RPC cron ĐÃ CHẠY THẬT (`requeue_stale_tasks()`,
`mark_stale_workers_offline()`), giữ nguyên 100% logic/ngưỡng cũ (240s/180s),
chỉ thêm ghi `worker_incidents`/`worker_state_events` cho mỗi dòng bị ảnh
hưởng (`STALE_HEARTBEAT_REQUEUE`/`WORKER_OFFLINE_UNRESPONSIVE`, severity
`warning` — đúng nguyên tắc roadmap "không kết luận chắc chắn cúp điện
ngay khi mất heartbeat, có thể là mất mạng").

**Đã TEST TRỰC TIẾP trên dữ liệu thật qua MCP** (không chỉ đọc code tĩnh):
gọi thật cả 2 RPC, và làm 1 thử nghiệm có kiểm soát/reversible trên 1
worker thật (`WORKER-119EBE66`) + 1 task thật (`id=775`) — xác nhận đúng
incident/state event được tạo với đúng nội dung, sau đó xoá sạch dữ liệu
test (không để lại sự cố giả trong Admin Dashboard) và trả worker về đúng
trạng thái cũ.

**2 mục còn lại của Phase 7 KHÔNG cần code mới — đã thoả mãn từ trước:**
- *Chống zombie/split-brain qua fencing token*: `complete_task()`/
  `fail_task()`/`report_heartbeat()` đã kiểm tra `tasks.generation` từ
  trước (xác nhận lại qua `pg_get_functiondef`, không đổi gì).
- *Chỉ dùng checkpoint đã xác minh trên storage*: Incremental Recovery
  (`get_existing_frames_on_b2()`/`validate_existing_frame_on_b2()`, có từ
  trước phiên làm việc này) đã làm đúng điều này.

**Không áp dụng được cho kiến trúc hiện tại (ghi rõ, không ép code mới):**
"Thứ tự ưu tiên máy thay thế" (`IDLE_WAITING_JOB` → `ONLINE_AVAILABLE` →
đúng GPU/RAM/software → đủ disk → ...) giả định có 1 bộ điều phối trung
tâm CHỌN máy — nhưng kiến trúc hiện tại là **pull-based**: Worker tự
`claim_task()` khi rảnh, không ai "chọn" máy nào cả. Xây một tầng điều
phối/chấm điểm mới để mô phỏng thứ tự ưu tiên này sẽ là 1 thay đổi kiến
trúc lớn, vượt xa phạm vi "refactor nhỏ" — không làm khi chưa có yêu cầu
rõ ràng.

---

## Phase 8 — Thống kê thời gian/tiền thuê host (ĐÃ TEST TRÊN DỮ LIỆU THẬT + BUILD THẬT)

Commit `120104b` (schema), `df5f364` (sửa lỗi `render_started_at`),
`0bec9a6` (wiring Python), `0454861` (Admin Dashboard). Đây là phase RỦI
RO CAO NHẤT trong toàn bộ roadmap — vừa cần nhiều điểm ghi timestamp mới
trong `cws_worker_full.py` (không thể chỉ dùng Postgres như Phase 7), vừa
là tính năng tính TIỀN. **Đã hỏi và được người dùng xác nhận làm đầy đủ
ngay** (`AskUserQuestion`, chấp nhận rủi ro Python tăng thêm) thay vì chỉ
làm phần Postgres/Backend.

**Quyết định thiết kế quan trọng (ghi rõ vì roadmap không đủ chi tiết
cho hệ thống cụ thể này):**
- "Khởi động 7 phút" trong hệ thống này KHÁC ví dụ Wake-on-LAN/cold-boot
  roadmap hình dung — Phase 4 đã xác định máy không sleep/hibernate/wake,
  chỉ tắt màn hình lúc rảnh, nên máy hầu như LUÔN chạy. "Khởi động" thực
  tế = lúc process Python VỪA được khởi động lại (crash/update/tay) và
  claim task ĐẦU TIÊN — dùng `_WORKER_PROCESS_STARTED_AT` (hằng số
  module-level, không đổi suốt vòng đời process) gửi kèm RPC đầu tiên để
  Postgres tự suy ra.
- Kiến trúc checkpoint-per-frame (render+upload TỪNG frame, không có
  "pha upload" tách biệt) khiến `upload_completed_at` = `render_completed_at`
  CÙNG thời điểm — ghi rõ trong migration, không bịa 1 "pha" không tồn tại.
- `merge_completed_at` CHƯA wiring — `attempt_job_video_merge()` không trả
  về giá trị để biết nó THẬT SỰ chạy merge hay no-op, cần sửa contract
  riêng, để lại vòng sau tránh đoán sai.
- KHÔNG có cấu hình giá nào tồn tại sẵn (`fleets`/`partners`/`workers`,
  kiểm tra qua `information_schema` trước khi thêm) — thêm `fleets.hourly_rate`
  (nullable, KHÔNG đặt giá mặc định). Chưa có giá → `estimated_amount`/
  `hourlyRate` = `null` (hiện `—` ở Frontend), status=`awaiting_rate` —
  KHÔNG hiện `0` gây hiểu lầm miễn phí.
- `final_amount` LUÔN `null` — xác nhận cuối là hành động Admin riêng
  (chưa làm UI, ngoài phạm vi vòng này). Đúng nguyên tắc roadmap "Worker
  không được tự quyết định billing", mở rộng thêm: hệ thống tự động cũng
  không tự quyết định "cuối cùng", chỉ ước tính.
- `compute_host_usage_sessions()` (tính billable_seconds/tiền) CHỈ được
  gọi qua cron mới (5 phút/lần) — Worker KHÔNG BAO GIỜ gọi hàm này, đây
  là ranh giới "Backend tính tiền" của toàn bộ Phase 8.

**Sự cố quy trình xảy ra khi làm phase này (ghi lại đầy đủ, đã khắc
phục):** (1) tự phát hiện+sửa 1 lỗi do chính migration 006 gây ra —
`report_worker_ready()` quên ghi `render_started_at`, khiến
`waiting_seconds`/`render_seconds` luôn tính ra 0 sai — phát hiện TRƯỚC
khi wiring Python, sửa bằng migration 007 riêng. (2) Lệnh `git checkout`
dọn dẹp CRLF-noise sau bước lint Backend đã VÔ Ý xoá mất toàn bộ wiring
Python chưa commit (bộ lọc loại trừ không tính đến `cws_worker_full.py`
đang có thay đổi chưa lưu) — phát hiện ngay qua `git diff --stat` trả về
rỗng bất thường, làm lại TOÀN BỘ wiring lần 2, xác nhận khớp 100% với lần
đầu (đếm ngoặc/số dòng giống hệt) trước khi commit — và ĐỔI quy trình từ
đây: mỗi thay đổi commit + push NGAY sau khi verify, trước khi chạy thêm
lệnh lint/checkout khác.

**Test:** Không chỉ kiểm tra tĩnh — đã mô phỏng ĐẦY ĐỦ 1 vòng đời
task_attempt qua MCP trên dữ liệu thật (`WORKER-119EBE66` + task `775`,
không đụng bảng `tasks`): `start_task_attempt` → `report_worker_ready` →
3 stage → `finalize_task_attempt('completed')` → `compute_host_usage_sessions()`
→ xác nhận đúng 1 dòng `host_usage_sessions` với `startup_seconds≈295`,
`billable_seconds≈6`, `status='awaiting_rate'` (đúng, chưa cấu hình giá).
Đã XOÁ SẠCH dữ liệu test. Backend `nest build`+`jest` (37/37)+eslint +
Frontend oxlint+`vite build` đều PASS thật. Phần Python (9 điểm wiring +
4 hàm) vẫn CHỈ kiểm tra tĩnh (cân bằng ngoặc cả file, không còn `%%`) —
CHƯA chạy qua Worker thật, cộng dồn vào rủi ro lớn nhất đã nêu.

---

## Ngoài roadmap — Admin action retry/requeue/quarantine/drain (ĐÃ TEST TRÊN DỮ LIỆU THẬT + BUILD THẬT, KHÔNG đụng Python)

`CWS_WORKER_ROADMAP.md` đã hết ở Phase 8 (xem mục Phase 8 phía trên).
Theo lựa chọn của Dy (`AskUserQuestion` sau khi hoàn tất Phase 8), việc
tiếp theo là đóng lỗ hổng còn thiếu rõ nhất của Phase 6 ("Admin dashboard
cần: hành động retry/requeue/quarantine/drain, audit log hành động
admin") thay vì dừng lại hoặc làm `merge_completed_at`.

Commit `8f0b884` (schema), `9890b31` (Backend endpoint), `40b83c6`
(Frontend UI). **CHỈ Postgres + Backend/Frontend, hoàn toàn KHÔNG đụng
`cws_worker_full.py`** — đây là commit rủi ro THẤP NHẤT trong các mục
"ngoài roadmap"/Phase 6-8, vì:

- "Quarantine"/"drain" được **THỰC THI THẬT** (không chỉ là nhãn) bằng
  cách mở rộng `claim_task()` — RPC DUY NHẤT mọi Worker gọi để xin việc —
  thêm 1 kiểm tra ở đầu hàm: worker đang `health_state=QUARANTINED` hoặc
  `desired_state=DRAINING` thì trả về mảng rỗng ngay, KHÔNG cho claim task
  mới. Worker tự hiểu là "không có task" — hành vi đã có sẵn từ trước,
  KHÔNG cần sửa 1 dòng Python nào.
- Audit log hành động Admin: TÁI SỬ DỤNG `worker_incidents` (Phase 6,
  event_type tiền tố `ADMIN_*`) thay vì tạo bảng riêng — hiện ngay trong
  bảng "Sự cố Worker Fleet" đã có sẵn.

**Test trực tiếp trên dữ liệu THẬT qua MCP** (không chỉ kiểm tra tĩnh):
- `admin_retry_task(105)` trên 1 task thật đang `failed` (permanent,
  5 lần fail liên tiếp cùng 1 worker) — xác nhận đúng hành vi, sau đó
  KHÔI PHỤC nguyên trạng thái cũ (status/generation/claimed_at/
  last_heartbeat/failed_by/error_category).
- `admin_requeue_task()` mô phỏng 1 task active — xác nhận đúng hành vi.
- `admin_set_worker_quarantine(true)` trên `WORKER-119EBE66` thật + gọi
  THẬT `claim_task()` trên job có task queued thật (`CWS-CHUNKLIVE`) —
  xác nhận bị CHẶN (mảng rỗng) dù có task khả dụng. Un-quarantine + gọi
  lại `claim_task()` — xác nhận CLAIM ĐƯỢC THẬT (task 128) — chứng minh
  thay đổi KHÔNG làm hỏng logic claim bình thường. Đã REVERT task 128 +
  `workers.status` về đúng trạng thái trước test.
- `admin_set_worker_drain(true)` + `claim_task()` — xác nhận bị CHẶN.
  Un-drain + xoá toàn bộ dữ liệu/incident test, xác nhận
  `worker_incidents` về lại 0 dòng.

Backend `nest build`+`jest`(37/37)+eslint PASS, Frontend oxlint+`vite
build` PASS.

**Chưa làm:** UI/RPC xác nhận `final_amount` (Phase 8), `merge_completed_at`
wiring (Phase 8), các loại sự cố khác chưa có detection (Phase 6). Route
mutating (retry/requeue/quarantine/drain) hiện chỉ bảo vệ bằng
`AdminKeyGuard` + `window.confirm()` phía Frontend — chưa có xác thực
2 lớp/phân quyền chi tiết hơn (phù hợp với mức bảo vệ Admin Dashboard
hiện có toàn hệ thống, không phải điểm yếu riêng của tính năng này).

---

## 🔴 Lỗ hổng gốc rễ nghiêm trọng nhất đã phát hiện: `jobs.total_frames`
## không bao giờ được ghi cho job tạo qua Backend hiện tại

Phát hiện khi điều tra ưu tiên "đồng bộ Worker với backend, hoàn thành
luồng Website → Queue → Scheduler → Worker → Render → Upload → Verify".

**Xác nhận qua đọc trực tiếp code + RPC (không đoán):**
- `analyze_blend_scene()` (Scene Analyzer) chỉ tính Light/Shadow/Texture/
  Polygon — KHÔNG đọc `scene.frame_start`/`scene.frame_end`, không tính
  `total_frames`.
- RPC DUY NHẤT từng ghi `jobs.total_frames` là `create_job_with_chunks()`
  (legacy) — đòi hỏi `total_frames` biết TRƯỚC lúc tạo job
  (`chunking_status='probing'` ngay từ đầu). Backend hiện tại
  (`WorkerFleetGateway.createInternalJobWithProbeTask()`) KHÔNG biết
  `total_frames` trước — đó chính là lý do cần Scene Analyzer.
- `report_render_speed()` (RPC tạo task còn lại sau probe) chỉ chạy khi
  `chunking_status='probing'` — KHÔNG BAO GIỜ đúng với job Backend tạo
  (mặc định `'pending'`) → trả về `-1`, không tạo task nào.

**Xác nhận qua dữ liệu THẬT trên Supabase:** cả 3 `render_orders` hiện
có đều dừng lại đúng 1 task (`total_frames=null`,
`chunking_status='pending'`) — **không liên quan gì đến việc Worker có
online hay không** (vấn đề vận hành thật: cả 27 worker đã đăng ký đều
`status='offline'`, lần cuối thấy `2026-07-27`, là vấn đề TÁCH BIỆT).

**Đã sửa (phần Backend/RPC, KHÔNG cần đụng Worker):** thêm RPC
`set_job_total_frames(p_job_id, p_worker_id, p_total_frames, p_fps)`
(migration `worker_migrations/002_set_job_total_frames_rpc.sql`, đã apply
thật) — idempotent (chỉ ghi nếu đang NULL), yêu cầu worker gọi đang giữ 1
task active của đúng job đó. `SchedulerService.processOrder()` (không đổi)
đã có sẵn cơ chế tự tạo task còn lại đúng khi `getTotalFrames()` trả về
khác null — chỉ thiếu đúng 1 đường để Worker báo lại giá trị thật.

**✅ ĐÃ SỬA XONG phần Python (commit `a728763`, 2026-07-31):** theo xác
nhận của người dùng, tiếp tục trên baseline `1.14.0` hiện có trong repo
(chưa nhận được bản `1.16.5` thật do người dùng gặp khó khăn khi upload).
`analyze_blend_scene()` giờ đọc thẳng `scene.frame_start`/`scene.frame_end`/
`scene.render.fps` (chia `fps_base` để ra FPS thật) ngay từ đầu hàm, đưa vào
`report` dict trả về. Hàm mới `report_total_frames_if_known()` gọi RPC
`set_job_total_frames()` ngay sau khi `_load_job_context()` lấy được
`optimization_plan` — an toàn gọi nhiều lần/nhiều worker (RPC idempotent),
không làm gián đoạn render nếu lỗi.

⚠️ **CHƯA test được bằng Worker thật** (môi trường làm việc không có
Python/Blender để chạy thử) — chỉ kiểm tra tĩnh (cân bằng ngoặc, không còn
lỗi f-string). Khuyến nghị: xác nhận trên 1 máy Worker thật trước khi tin
tưởng hoàn toàn. Nếu bản `1.16.5` thật sau này được upload, cần đối chiếu
lại xem tính năng này có bị trùng/xung đột với cơ chế nào đã có sẵn trong
đó hay không.

---

## Bug đã sửa: ngưỡng "Worker online" sai lệch với nhịp heartbeat thật

`WorkerFleetGateway.countOnlineWorkers()` dùng ngưỡng 30 giây, nhưng
Worker chỉ gọi `worker_ping()` mỗi 60 giây (`HEARTBEAT_INTERVAL_SEC`) lúc
đang render (so với mỗi 15s lúc rảnh, `POLL_INTERVAL_SEC`) — một Worker
đang render khỏe mạnh có tới ~50% khả năng bị đếm nhầm là "offline" tại
bất kỳ thời điểm query nào, gây nhấp nháy trạng thái
`ALLOCATING_WORKERS`/`SEARCHING_WORKERS` và ước tính hàng đợi sai. Đã sửa
nâng ngưỡng lên 180s, khớp đúng `mark_stale_workers_offline()` và RPC
`count_active_workers()` (chưa được Backend dùng tới) — đồng bộ 1 chuẩn
duy nhất. Commit `a28f8df`.

---

## Vấn đề vận hành thật (KHÔNG phải bug code, cần người dùng tự xử lý)

- Cả 27 Worker đã đăng ký (`fleet_id=2`, "Fleet Anh Thông") đều
  `status='offline'`, lần `last_seen_at` gần nhất là 2026-07-27 — không
  có máy Worker vật lý nào đang kết nối tại thời điểm audit.
- `worker_config.latest_version="1.16.5"` (cập nhật 2026-07-28) nhưng
  KHÔNG worker nào từng nhận được bản này (đã ngừng poll từ 2026-07-27,
  một ngày TRƯỚC khi version được cập nhật).

---

## Tổng hợp commit liên quan (branch `main`)

- `d31cd58` — feat(database): add worker lease and state event schema.
- `a28f8df` — fix: nâng ngưỡng countOnlineWorkers() 30s → 180s.
- `27d8235` — fix(database): thêm RPC set_job_total_frames.
- `f74211f` — docs: thêm file audit này.
- `a728763` — fix(worker): đọc frame range thật, gọi RPC set_job_total_frames.
- `487aee3` — feat(database): thêm RPC report_worker_state_transition.
- `f313e93` — feat(worker): wiring báo cáo observed_state (5 điểm chuyển
  trạng thái tự nhiên trong `worker_loop()`).
- `a1aadbd` — feat(worker): Active Idle Power Management (Phase 4).
- `092441e` — feat(admin): hiển thị observed_state trong Worker Fleet
  dashboard (Phase 5, ĐÃ build/test/lint/boot thật).
- `ad08903` — docs: sửa placeholder commit hash + Phase 5 vào tổng hợp.
- `3cfb241` — feat(worker+admin): incident tracking tối thiểu (Phase 6,
  Backend/Frontend ĐÃ build/test/lint thật; Python chỉ kiểm tra tĩnh).
- `84067a9` — docs: thêm Phase 6 vào audit doc.
- `285e6b6` — feat(database): incident/state visibility cho requeue +
  offline thật (Phase 7, KHÔNG sửa Python, ĐÃ test trực tiếp trên dữ
  liệu thật qua MCP).
- `05a82a1` — docs: thêm Phase 7 vào audit doc.
- `120104b` — feat(database): host usage billing schema + RPC (Phase 8).
- `df5f364` — fix(database): sửa lỗi `render_started_at` (Phase 8, tự
  phát hiện trước khi wiring Python).
- `0bec9a6` — feat(worker): wiring báo cáo timestamp billing (Phase 8,
  làm lại lần 2 sau sự cố `git checkout` xoá mất lần đầu — xem ghi chú
  trong message commit).
- `0454861` — feat(admin): dashboard thống kê thời gian/tiền thuê host
  (Phase 8, Backend/Frontend ĐÃ build/test/lint thật).
- `5e0295c` — docs: thêm Phase 8 vào audit doc.
- `8f0b884` — feat(database): retry/requeue/quarantine/drain cho Admin
  (ngoài roadmap, KHÔNG đụng Python, ĐÃ test trực tiếp trên dữ liệu thật).
- `9890b31` — feat(admin): endpoint retry/requeue/quarantine/drain.
- `40b83c6` — feat(admin): UI retry/requeue/quarantine/drain.
- `c6d64f3` — feat(worker): tích hợp ghép video.

**Quyết định của người dùng (2026-07-31):** do gặp khó khăn khi upload
bản `1.16.5` thật, tiếp tục toàn bộ công việc trên baseline `1.14.0`
hiện có trong repo thay vì tiếp tục chờ.

## Việc tiếp theo

1. ~~Scene Analyzer đọc frame range, gọi RPC~~ — ĐÃ XONG (`a728763`).
2. ~~Wiring observed_state (Phase 3 phần code)~~ — ĐÃ XONG (`487aee3` +
   `f313e93`).
3. ~~Active Idle Power Management (Phase 4)~~ — ĐÃ XONG (`a1aadbd`).
4. ~~Backend/Admin Dashboard đọc `observed_state` (Phase 5)~~ — ĐÃ XONG
   (`092441e`).
5. ~~Incident tracking tối thiểu (Phase 6)~~ — ĐÃ XONG PHẦN TỐI THIỂU
   (`3cfb241`): WORKER_CRASH (tự động) + MERGE_FAIL (wiring mới). Còn
   thiếu: các loại sự cố khác (GPU/CPU quá nhiệt, disk full, mất
   heartbeat...) chưa có code phát hiện, và nút retry/requeue/
   quarantine/drain trên Admin Dashboard.
6. ~~Mất điện/tự điều phối (Phase 7)~~ — ĐÃ XONG phần khả thi KHÔNG cần
   sửa Python (`285e6b6`): incident/state visibility cho requeue + offline
   thật, đã test trực tiếp trên dữ liệu thật. Fencing token + checkpoint
   resume xác nhận ĐÃ có sẵn từ trước (không cần code mới). "Thứ tự ưu
   tiên máy thay thế" xác nhận KHÔNG áp dụng được cho kiến trúc pull-based
   hiện tại (ghi rõ lý do, không ép code).
7. ~~Thống kê thời gian/tiền thuê host (Phase 8)~~ — ĐÃ XONG
   (`120104b`/`df5f364`/`0bec9a6`/`0454861`): schema + 4 RPC ghi
   timestamp + cron tính billing (KHÔNG BAO GIỜ Worker tự tính) + 9 điểm
   wiring Python + Admin Dashboard. Đây là commit Python THỨ 7 chưa test
   máy thật, và là commit đầu tiên có ý nghĩa TÀI CHÍNH (ước tính tiền
   thuê host) — mức độ cẩn trọng khi kiểm tra trước khi tin dùng cần CAO
   HƠN các phase trước.
8. **ĐÂY LÀ ROADMAP PHASE CUỐI CÙNG (`CWS_WORKER_ROADMAP.md` chỉ có tới
   Phase 8)** — toàn bộ 8 phase đã được triển khai (một số phần được ghi
   rõ là "chưa làm/để lại vòng sau" thay vì đoán, xem từng mục Phase ở
   trên). Việc còn lại từ đây là XÁC NHẬN TRÊN MÁY THẬT, không phải viết
   thêm code theo roadmap.
9. **CHƯA test bất kỳ thay đổi Worker nào bằng máy thật** — toàn bộ 7
   commit Python của phiên này (`a728763`/`487aee3`/`f313e93`/`a1aadbd`/
   `3cfb241`/`0bec9a6`, cộng `c6d64f3` từ trước) mới chỉ kiểm tra tĩnh,
   chưa từng chạy qua Python/Blender/B2/Windows thật. Đây là rủi ro lớn
   nhất hiện tại — BẮT BUỘC xác nhận trên ít nhất 1 máy Worker thật trước
   khi coi là sẵn sàng production, ĐẶC BIỆT với `0bec9a6` (Phase 8) vì
   liên quan trực tiếp tới số liệu billing sẽ hiển thị cho Admin.
10. Nếu sau này nhận được bản `1.16.5` thật: đối chiếu lại toàn bộ commit
    Worker ở trên xem có trùng/xung đột gì với tính năng đã có sẵn trong
    đó không.
11. Cấu hình `fleets.hourly_rate` (hiện `null` cho mọi fleet) khi có giá
    thật — nếu không, `host_usage_sessions.status` sẽ mãi là
    `awaiting_rate`, không bao giờ tính ra `estimated_amount`.
12. ~~Retry/requeue/quarantine/drain (Phase 6)~~ — ĐÃ XONG (`8f0b884`/
    `9890b31`/`40b83c6`), KHÔNG đụng Python, đã test trực tiếp trên dữ
    liệu thật. Còn thiếu: UI/RPC riêng cho hành động "xác nhận
    final_amount" của Admin (Phase 8, hiện luôn `null`).
13. `merge_completed_at` chưa wiring (cần sửa contract trả về của
    `attempt_job_video_merge()` trước).
14. Xác nhận trên máy Worker thật (khi có máy online trở lại): job mới
    tạo qua website có tự động sinh đủ task ngoài probe hay không. Đặc
    biệt xác nhận Worker vẫn claim/render/complete bình thường sau khi
    `claim_task()` bị mở rộng thêm kiểm tra quarantine/drain (mục
    "Ngoài roadmap" phía trên) — dù đã test kỹ qua MCP, đây vẫn là RPC lõi
    nhất của toàn bộ hệ thống, đáng được xác nhận lại trên máy thật.
