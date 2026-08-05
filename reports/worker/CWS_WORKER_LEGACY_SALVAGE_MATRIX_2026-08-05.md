# CWS WORKER LEGACY SALVAGE MATRIX — 2026-08-05

## Quyết định kiến trúc

Owner xác nhận cws_worker_full.py là Worker cũ. File này được đọc như knowledge/evidence, không được restore, copy nguyên file hoặc làm dependency của engine mới.

Kiến trúc mới:

Node Agent (PC authority)
→ nhận assignment/lease đã được Backend cấp
→ spawn một Worker Engine process cho một JobSpec
→ Worker Engine nhận dữ liệu động
→ download → preflight → Blender → checkpoint → validate → upload → verify
→ báo kết quả attempt
→ cleanup và exit
→ Node Agent về ACTIVE_IDLE.

Job mới chỉ là JobSpec/TaskSpec mới. Không sửa Python, không tạo artifact mới và không update fleet chỉ vì có customer/job mới.

## Bài học trích xuất từ Worker cũ

- Claim qua RPC atomic và generation/fencing là cần thiết để chống double-claim/stale completion.
- Heartbeat task phải chạy trong lúc render; heartbeat lỗi không được làm worker crash, nhưng heartbeat mất/lease invalid phải dừng an toàn.
- Checkpoint từng frame làm giảm bán kính mất mát khi crash/mất mạng.
- Resume phải list prefix một lần, sau đó download + validate lại từng output trước khi bỏ qua render.
- Output không được tin chỉ vì Blender log; cần tồn tại, kích thước tối thiểu, đọc được và kiểm tra nội dung cơ bản.
- Phân loại lỗi thành retryable/persistent/permanent giúp scheduler chọn retry hoặc quarantine.
- Cache project/analysis có giá trị nhưng phải job-scoped, immutable và không ghi đè file nguồn.
- Telemetry render speed hữu ích cho scheduler, không để Worker tự quyết định giá/billing.
- Cleanup phải xảy ra sau cả success/failure/timeout.
- Update jitter là bài học fleet rollout, thuộc Node Agent/update manager; không nằm trong JobSpec.
- Autoexec, pip bootstrap tùy ý, remote shutdown và hard-coded credentials không được mang sang engine mới.

## Feature salvage matrix

| Ý tưởng cũ | Quyết định | Trách nhiệm mới | Ghi chú |
|---|---|---|---|
| Atomic task claim | KEEP IDEA / REDESIGN | Backend/Scheduler + lease adapter | Worker chỉ nhận assignment/lease, không tự chọn customer/job |
| Generation/fencing | KEEP IDEA / REDESIGN | Backend + Worker completion adapter | Mọi complete/fail/checkpoint gắn attempt và generation |
| Task heartbeat | KEEP IDEA / REDESIGN | Node Agent presence; Worker attempt heartbeat adapter | Tách node heartbeat khỏi task lease heartbeat |
| Checkpoint từng frame | KEEP IDEA | Worker + CheckpointStore | Không hard-code B2 path; prefix từ JobSpec/lease |
| B2 resume/recovery | KEEP IDEA / REDESIGN | Worker CheckpointStore + Backend policy | Verify lại object trước khi skip; không coi list object là đủ |
| Output validation | KEEP IDEA | Worker OutputValidator | Generic format policy từ JobSpec/capability |
| Blender failure classification | KEEP IDEA / REDESIGN | Worker classifier + Backend retry policy | Worker phân loại quan sát; Backend quyết định retry budget |
| Retry/recovery | KEEP IDEA / REDESIGN | Node Agent process recovery + Backend attempt retry | Worker không tự tạo retry vô hạn |
| Scene analysis/preflight | KEEP IDEA / REDESIGN | Worker Preflight adapter | Chỉ inspect an toàn; không arbitrary customer script |
| Capability/VRAM detection | KEEP IDEA | Node Agent capability reporter | Scheduler match capability; Worker không tự chọn GPU |
| Render speed telemetry | KEEP IDEA | Worker reporter → Backend | Dữ liệu telemetry, không phải giá/billing authority |
| State reporting | KEEP IDEA / REDESIGN | Node Agent node state; Worker execution state | Backend là source of truth |
| Incident reporting | KEEP IDEA | Node Agent/Worker reporter | Không log secret/customer private data |
| Cleanup | KEEP IDEA | Worker job-scoped cleanup; Node Agent process cleanup | Fail-safe và chỉ xóa workspace đã được cấp |
| Update jitter | KEEP IDEA / MOVE | Node Agent update manager | Không chạy update trong mỗi JobSpec |
| Cache | KEEP IDEA / REDESIGN | Worker job-scoped cache | Không cache chéo customer nếu chưa có ownership/integrity proof |
| Merge/output handling | REDESIGN | Worker output stage | Chỉ bật theo JobSpec capability; không hard-code .bat |
| Autoexec | DELETE/OBSOLETE for customer input | None | Engine mới bắt buộc disable |
| pip bootstrap tùy ý | DELETE/OBSOLETE | Installer/package manager | Package pin/manifest thuộc install/update |
| Remote shutdown | DELETE/OBSOLETE | Node Agent operator policy, disabled by default | Không thuộc Job execution |
| Hard-coded job/customer/B2 paths | DELETE/OBSOLETE | Backend JobSpec | Không còn trong engine |
| Embedded credentials | DELETE/OBSOLETE | Secret injection outside Worker | Artifact cũ cần loại khỏi source |
| Needs code execution for analysis | NEEDS RESEARCH | Isolated preflight service | Chưa bật cho untrusted customer files |
| Tile/simulation distributed split | NEEDS RESEARCH | Scheduler/Worker capability | Chưa giả lập correctness trong MVP |

## Generic Worker Engine mới

Đã thêm:

- worker/worker_engine.py
- worker/test_worker_engine.py

Engine mới có:

- JobSpec dynamic: job/task/attempt/generation/project URI/frame range/output policy.
- autoexec policy bắt buộc false.
- workspace theo task và path containment.
- adapter boundary cho downloader, preflight, renderer, checkpoint store, validator và reporter.
- BlenderCliRenderer dùng --disable-autoexec, timeout và exit-code checking.
- per-frame checkpoint + verify + resume.
- retryable/permanent error boundary.
- cleanup trong finally.
- không chứa credential, scheduler policy, customer ID, B2 object cố định hoặc power API.
- CLI chỉ validate JobSpec; runtime adapters phải do Node Agent cung cấp.

## Verification

- py_compile PASS.
- Generic engine tests: **4/4 PASS**.
- Test coverage: dynamic frame range, verified checkpoint resume, autoexec rejection, invalid output cleanup.
- Đây là CODE/UNIT VERIFIED; chưa tuyên bố staging/integration/production.

## Migration rule

Không tiếp tục dùng cws_worker_full.py hoặc cws_worker.bat làm canonical artifact. Package/launcher phải được chuyển sang Worker Engine generic sau khi Node Agent adapter và staging contract hoàn thiện.

Không phục hồi file cũ. Không cập nhật Worker fleet theo từng JobSpec.


## Post-implementation verification

- Generic Engine + Node Agent + generic launcher offline suite: **16/16 PASS**. Added unsafe output-format rejection to prevent path-like extensions from influencing workspace output paths.
- py_compile: PASS.
- Legacy runtime sources cws_worker_full.py and cws_worker.bat were removed from main after salvage; historical reports remain for evidence only.
- New generic package files: worker/worker_engine.py, worker-engine.bat, worker-engine-manifest.json.
- No production heartbeat, claim, B2 upload, payment or power action was performed.
