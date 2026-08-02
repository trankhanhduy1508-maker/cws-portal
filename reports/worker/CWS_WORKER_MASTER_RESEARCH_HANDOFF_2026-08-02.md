# CWS WORKER — MASTER RESEARCH & ARCHITECTURE HANDOFF

**Ngày:** 2026-08-02  
**Nguồn:** Các trao đổi trước đây về CWS Worker + `WINDOWS_NODE_AGENT_ARCHITECTURE_RESEARCH.md`.

## 1. Mục tiêu

Worker biến PC đối tác/quán net thành tài nguyên render tự động: khách upload → hệ thống phân tích → Scheduler chọn máy → Worker nhận task → Blender render → kiểm tra → upload → giao kết quả. Mục tiêu là vận hành 24/7 mà Owner không phải can thiệp thủ công.

Nguyên tắc: **portable, pull-based/outbound-only, fault tolerant, diskless-aware, least privilege, tự phục hồi.**

## 2. Kiến trúc hiện tại

Báo cáo mới xác nhận CWS hiện **không chạy Windows Service**.

```text
cws_worker.bat
  -> launcher/supervisor đơn giản
  -> chuẩn bị Python portable
  -> kiểm tra/tải update
  -> chạy cws_worker_full.py
  -> Worker thoát: chờ rồi restart

cws_worker_full.py
  -> logic Worker chính
  -> backend/job
  -> Blender
  -> progress/recovery
  -> upload/report
```

Phải phân biệt `.bat` supervisor với `cws_worker_full.py` Worker logic; không tạo double-supervision khi nâng cấp.

## 3. Constraint quan trọng nhất: Diskless / BootROM

Máy quán net có thể reset ổ C: về golden image sau reboot, trong khi chỉ một ổ dữ liệu riêng tồn tại lâu dài.

Vì vậy Service, Scheduled Task hoặc Registry Run key cài sau khi boot có thể biến mất nếu không được bake vào image.

Câu hỏi đúng không phải chỉ là “Node Agent có nên là Windows Service?”, mà là:

> **Cơ chế autostart/Agent nào sống đúng qua vòng đời BootROM của Fleet thực tế?**

Phải tách:
- **PC thường:** Windows Service khả thi.
- **Diskless/BootROM:** ưu tiên portable/bootstrap supervisor hoặc cơ chế của BootROM; chỉ dùng Service khi persistence được xác minh.

## 4. Kiến trúc logic đang hội tụ

```text
CWS Backend
    |
 HTTPS Pull
    |
Node Agent / Supervisor
 identity, heartbeat, auth, update, health, lifecycle
    |
Render Worker
 claim task, lease, assets, Blender, progress, verify, upload
    |
Blender
```

“Node Agent” là **vai trò logic**, không bắt buộc luôn là Windows Service.

## 5. Session 0

Windows Service chạy Session 0, tách desktop người dùng. Không nên mặc định Service trực tiếp chạy Blender GPU.

Hướng an toàn:

```text
Session 0: Node Agent/Supervisor
              |
             IPC
              |
Interactive user session: Render Worker -> Blender GPU
```

CUDA/OptiX từ Service/Session 0 trên GPU Fleet thật vẫn là **EXPERIMENT REQUIRED**.

## 6. Pull-based Worker

Máy quán net thường sau NAT/firewall. Worker chủ động gọi Backend qua HTTPS:

```text
Worker -> xin task
Backend -> task + lease
Worker -> heartbeat/progress
Worker -> upload + ACK
Worker -> xin task tiếp
```

Không phụ thuộc inbound connection tới PC đối tác.

## 7. Job → Task → Worker

Không khóa toàn job vào một máy hoặc chia cứng frame-range quá lớn.

```text
JOB
 +-- TASK A
 +-- TASK B
 +-- TASK C
```

Worker rảnh xin task tiếp theo. Máy nhanh làm nhiều task hơn; task lỗi có thể requeue độc lập. Kiến trúc phải đi từ khoảng 10 máy/job lên hàng chục/hàng trăm Worker.

## 8. Lease + Heartbeat + Fencing

Đây là trái tim fault tolerance.

Worker claim task chỉ sở hữu nó trong một **lease có hạn**. Heartbeat gia hạn lease. Nếu Worker mất điện/mất kết nối quá lâu, lease hết và Backend requeue.

Fencing/ownership token ngăn Worker cũ quay lại sau mất mạng rồi ghi kết quả đè lên attempt mới.

- Mất Internet nhưng máy còn sống: ưu tiên render local tiếp, giữ output/checkpoint và retry communication.
- PC chết/mất điện: Backend phải phát hiện heartbeat timeout và requeue; không chờ Worker tự báo.

## 9. Scheduler capability

Worker nên report:
- worker_id
- Fleet/site
- online/idle/busy/degraded
- GPU + VRAM
- Blender/device support
- current task
- health
- heartbeat
- version
- stability/error history khi cần

Scheduler kết hợp capability với yêu cầu job để chọn Worker online + capable + stable + idle.

## 10. Active Idle

Ưu tiên hiện tại: **Active Idle**, chưa phụ thuộc WoWLAN/sleep/hibernate.

Khi rảnh: có thể tắt màn hình/dừng process nặng nhưng giữ Agent/Worker online. Fleet có thể giới hạn số máy ban ngày và mở rộng ban đêm.

## 11. Blender headless và output verification

Dùng `blender --background`, nhưng không tin exit code một mình.

Worker phải kiểm:
- output tồn tại,
- đủ frame,
- không zero-byte/corrupt hiển nhiên,
- kích thước/số lượng hợp lý,
- checksum khi cần.

Nên dùng `--python-exit-code` thích hợp.

GPU runtime nên được detect/log; CWS hiện dùng `nvidia-smi`, đủ cho nhu cầu cơ bản.

## 12. GPU failure

Phân loại riêng:
- VRAM OOM
- CUDA/OptiX init
- Blender crash
- Blender hung
- GPU/TDR
- texture/resource failure

Không gom tất cả thành `render failed`. TDR là rủi ro Windows/WDDM chung; không thay registry toàn Fleet nếu chưa có bằng chứng máy thật.

## 13. Process supervision / Job Objects

Failure mode cần xử lý:

```text
Worker chết -> blender.exe còn sống -> giữ CPU/GPU/VRAM
```

Windows Job Objects đáng nghiên cứu để quản lý process tree và bảo đảm cleanup toàn bộ child Blender khi task/Worker bị terminate.

## 14. Node identity và clone

Golden image không được chứa cùng một `worker_id` cho mọi máy.

Identity phải unique, được enrollment một lần và lưu ở persistent storage của đúng máy. Cần audit chính xác code hiện tại sinh/lưu `worker_id` ở đâu.

Duplicate identity có thể phá heartbeat, scheduler, ownership, logs và host billing.

## 15. Auto-update

Supervisor càng nhỏ càng tốt. Worker có version/update độc lập.

Production cần:
- integrity/signature/hash,
- last-known-good,
- rollback,
- không phá render đang chạy,
- staged/canary rollout trước toàn Fleet.

## 16. Storage / B2

MVP đang dùng Supabase + B2. Worker nên tách storage khỏi render logic.

```text
claim -> download -> render local -> verify -> upload -> ACK -> cleanup
```

Không đặt credential storage quyền rộng trên Worker. Dùng scope tối thiểu/token hoặc presigned mechanism khi phù hợp.

## 17. Security: `.blend` là untrusted input

Cần audit:
- Auto Run Python Scripts
- embedded Python
- addon whitelist
- command injection / `shell=True`
- path traversal
- arbitrary file access
- NTFS permissions
- Worker credentials
- Backend authentication
- update authenticity

Blender/Worker không chạy Admin nếu không thật sự cần.

## 18. Recovery matrix mục tiêu

| Failure | Hành vi mong muốn |
|---|---|
| Worker crash | supervisor restart |
| Blender crash | classify, cleanup, retry/requeue |
| Blender hung | watchdog/timeout, kill process tree |
| orphan Blender | Job Object/process cleanup |
| VRAM OOM | classify, retry/fallback/requeue phù hợp |
| Internet mất | render local tiếp nếu có thể, retry |
| PC mất điện | heartbeat/lease timeout → requeue |
| update lỗi | rollback last-known-good |
| diskless reboot | bootstrap lại + giữ identity đúng |
| Backend tạm lỗi | exponential backoff |
| stale Worker | fencing từ chối completion cũ |
| output lỗi | verifier reject |

## 19. Dashboard / accounting

Admin cần thấy Online / Idle / Busy / Offline / Degraded, heartbeat age, GPU, current task, progress, error, restart count và Worker version.

Host accounting phải tách preparation/startup khỏi compute billable. Yêu cầu đã trao đổi: khoảng khởi động/preparation như mốc 7 phút không tự động tính thành thời gian thuê nếu chính sách billing loại trừ.

## 20. Worker trong pipeline CWS

```text
Upload
 -> Analyzer
 -> Estimator
 -> Scheduler
 -> Queue / Lease
 -> Workers / Blender
 -> Verifier
 -> Assembler/Merge
 -> Preview/Watermark
 -> Payment
 -> Final output unlock
```

Worker không nên chứa Scheduler, Payment hoặc business logic không cần thiết.

Automatic payment nối với Worker qua Backend/state machine: render verified → trạng thái sẵn sàng → payment confirmed → unlock final output.

## 21. Provisioning Fleet

Để scale hàng chục/hàng trăm máy cần:
- golden image/bootstrap
- enrollment token
- unique identity
- Fleet/site config
- persistent volume detection
- hardware discovery
- staged update
- health verification
- decommission

BootROM cụ thể chưa biết thì phải ghi **UNKNOWN**, không đoán.

## 22. Các nguyên tắc đang giữ

1. Portable Worker.
2. Pull/outbound HTTPS.
3. Supabase + B2 cho MVP hiện tại.
4. Heartbeat.
5. Lease + fencing.
6. Auto-update.
7. Task/frame checkpoint khi phù hợp.
8. Supervisor đơn giản.
9. Scheduler tách Worker.
10. Fault tolerance là P0/P1.
11. Active Idle trước sleep/hibernate.
12. Sau MVP mới nâng cấp Worker lớn, trừ blocker bắt buộc.

Không được mặc định:
- Windows Service là bắt buộc.
- Service chạy Blender GPU Session 0 chắc chắn ổn.
- BootROM giữ Service/Task qua reboot.
- worker_id hiện đã clone-safe.
- exit code 0 = render thành công.
- production requeue khi mất điện đã được xác minh.
- `.blend` là input an toàn.

## 23. Bốn PoC critical

### PoC 1 — Session 0 + GPU
Chạy Blender CUDA/OptiX từ Service test trên GPU thật; kiểm GPU detect, output, fallback và logs.

### PoC 2 — BootROM persistence + identity
Reboot máy diskless thật; kiểm vùng persistent, bootstrap, worker_id và Service/Task nếu thử.

### PoC 3 — Untrusted `.blend`
Dùng file test có embedded Python vô hại nhưng quan sát được; xác minh đúng config production có tự chạy script hay không.

### PoC 4 — Recovery end-to-end
Trong lúc render: cắt Internet, kill Blender, kill Worker, reboot/tắt máy. Đo heartbeat expiry, lease expiry, requeue, fencing, cleanup và recovery time.

## 24. Thứ tự nâng cấp

**Phase 0 — Audit:** đọc `cws_worker.bat`, toàn bộ `cws_worker_full.py`, `cws_auto_ghep_video.bat`; map lifecycle, identity, lease/requeue.

**Phase 1 — Reliability:** lease/fencing, heartbeat/requeue, watchdog, Job Object/process cleanup, retry/backoff, output verification.

**Phase 2 — Security:** untrusted blend, addon/script policy, credential scope, update integrity, filesystem isolation.

**Phase 3 — Node Agent separation:** chỉ sau PoC. PC thường cân nhắc Windows Service; diskless dùng bootstrap/supervisor tương thích BootROM.

**Phase 4 — Fleet scale:** enrollment, provisioning, staged rollout, Fleet policy, observability, quota ngày/đêm, host accounting.

## 25. Quyết định kiến trúc tạm thời

**DECISION: MODIFY** đối với “Windows Service Node Agent + Render Worker riêng”.  
**Confidence: MEDIUM.**

Nguyên tắc tách Supervisor/Agent khỏi Render Worker là đúng, nhưng implementation phụ thuộc môi trường:

```text
PC thường
 -> Windows Service Node Agent có thể phù hợp

Diskless/BootROM
 -> portable/bootstrap supervisor hoặc mechanism baked vào golden image
 -> chỉ dùng Service nếu PoC xác minh persistence
```

Blender nên ở user/interactive session cho tới khi PoC chứng minh Session 0 + GPU ổn định.

## 26. Các câu hỏi còn mở

1. BootROM cụ thể của từng Fleet là gì?
2. Chính xác ổ nào reset/persistent?
3. Có bake Service/Task vào golden image được không?
4. `worker_id` hiện sinh/lưu ở đâu?
5. Backend lease/fencing/requeue đã hoàn chỉnh tới đâu?
6. Mất điện toàn PC có tự requeue production thật chưa?
7. Blender production đang xử lý Auto Run Python Scripts thế nào?
8. Session 0 + CUDA/OptiX trên GPU Fleet có ổn không?
9. Update có integrity + rollback đầy đủ chưa?
10. Failure hiện tại có để orphan Blender không?

Phải giải bằng code inspection, tài liệu chính thức hoặc PoC thật; không điền khoảng trống bằng suy đoán.

## 27. Chỉ dẫn handoff cho AI/Engineer

Trước khi sửa Worker:
1. Đọc tài liệu này và báo cáo Windows Node Agent.
2. Đọc code Worker thật.
3. Không suy kiến trúc từ tên file.
4. Không rewrite chức năng đã đúng.
5. Phân loại kết luận: `[VERIFIED]`, `[INFERENCE]`, `[EXPERIMENT REQUIRED]`, `[UNKNOWN]`.
6. Được quyền phản biện kiến trúc.
7. Reliability/recovery quan trọng hơn kiến trúc “đẹp”.
8. Bảo vệ compatibility với diskless.
9. Không productionize kiến trúc mới trước khi xử lý 4 PoC critical.

## Kết luận

Worker CWS không phải “script chạy Blender”. Nó là một **distributed compute node** trong hệ thống:

**Fleet + Scheduler + Queue + Lease + Heartbeat + Storage + Blender + Verification + Recovery + Security + Billing/Payment.**

Tiêu chuẩn cuối cùng là: hàng chục/hàng trăm máy có thể tự khởi động, tự nhận đúng việc, tự render, tự phục hồi, không làm trùng việc, không mất dữ liệu và không cần Owner thức khuya can thiệp — kể cả trong môi trường quán net diskless.
