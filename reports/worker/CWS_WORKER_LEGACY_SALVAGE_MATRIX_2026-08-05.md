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

- Generic Engine + Node Agent + generic launcher offline suite: **19/19 PASS**. Added unsafe output-format rejection to prevent path-like extensions from influencing workspace output paths.
- py_compile: PASS.
- Legacy runtime sources cws_worker_full.py and cws_worker.bat are retained only as reference sources; they are not imported, launched or used as package dependencies.
- New generic package files: worker/worker_engine.py, worker-engine.bat, worker-engine-manifest.json.
- No production heartbeat, claim, B2 upload, payment or power action was performed.


## Capability status after lease-guard implementation

| Legacy capability | New implementation status | Test status |
|---|---|---|
| Atomic claim | Backend/Scheduler remains owner; Worker receives assigned attempt | Not runtime verified in Engine; backend evidence retained |
| Generation/fencing | JobSpec lease_generation + AttemptGuard.assert_active boundary | CODE/UNIT VERIFIED; stale generation test PASS |
| Heartbeat | AttemptGuard heartbeat at claim, download, render and checkpoint boundaries | CODE/UNIT VERIFIED; real adapter BLOCKED |
| Per-frame checkpoint | CheckpointStore.put/verify per frame | CODE/UNIT VERIFIED; B2 adapter BLOCKED |
| B2 resume/recovery | CheckpointStore.is_verified skips only verified frames | CODE/UNIT VERIFIED; B2 runtime BLOCKED |
| Output validation | OutputValidator + size/path checks | CODE/UNIT VERIFIED |
| Error classification | RetryableWorkerError/PermanentWorkerError and reporter category | CODE/UNIT VERIFIED |
| Preflight | Safe filesystem-only BasicPreflight; no customer code execution | CODE/UNIT VERIFIED |
| Capability/VRAM | Node Agent responsibility, not hard-coded in Worker Engine | Design documented; runtime UNVERIFIED |
| Render progress/telemetry | Reporter stage/progress boundary exists; duration telemetry adapter pending | Partial CODE VERIFIED |
| Cleanup | finally cleanup constrained to job workspace | CODE/UNIT VERIFIED |
| Crash recovery | Node Agent supervision and Backend retry policy | Node unit verified; real process UNVERIFIED |
| Cache | No cross-customer cache; adapter/job-scoped cache remains future work | Needs implementation/research |
| Update/version | Package manifest + launcher validation; fleet update belongs Node Agent | CODE/UNIT VERIFIED; rollout UNVERIFIED |
| Incident reporting | Reporter.fail boundary; backend incident adapter pending | Partial CODE VERIFIED |

Legacy file remains available for future review only. It must never become the runtime import path again.


## Reference source verification

- Legacy source reviewed from GitHub main: cws_worker_full.py, 2,578 lines, 36 functions.
- It remains in the repository as reference knowledge only; no new Engine import, launcher dependency or production execution path points to it.
- Current generic Engine suite after lease guard: **17/17 PASS**; py_compile PASS.


## Detailed problem-to-design matrix

| Problem | Old solution | Failure/risk | General principle | New owner | New design | Status / test |
|---|---|---|---|---|---|---|
| Two workers claim same task | RPC claim_task/claim_next_task | Depends on backend RPC contract; old Worker mixed scheduler knowledge | Claim must be atomic and server-authoritative | Backend/Scheduler | Node Agent receives one assignment + lease; Engine never scans queue | Backend evidence; staging adapter BLOCKED |
| Old attempt completes after requeue | generation + worker_id in RPC | Missing/late heartbeat could make valid render stale | Every side effect must be fenced | Worker + Backend | AttemptGuard.assert_active before lifecycle boundaries; generation in JobSpec | CODE/UNIT VERIFIED; stale-generation test PASS |
| Active render looks offline | task heartbeat thread | Thread can fail silently or report wrong task if not stopped | Presence and attempt lease are separate signals | Node Agent + Worker adapter | Node heartbeat is Node authority; Engine emits attempt heartbeat at boundaries | CODE/UNIT VERIFIED; real adapter UNVERIFIED |
| Crash loses completed frames | per-frame B2 upload | Object may be partial/corrupt; list alone is not proof | Checkpoint must be idempotent and verified | Worker + B2 adapter | CheckpointStore put + verify; is_verified only skips verified frame | CODE/UNIT VERIFIED; B2 BLOCKED |
| Partial task fails mid-range | fail_task with transient/persistent/permanent | Old flow can leave partial outputs and relies on recovery conventions | Retry only missing work, never double-complete | Backend + Worker | Same attempt/task plus verified frame checkpoints; Backend owns retry budget | CODE boundary; staging BLOCKED |
| Bad .blend or missing file | classify stderr markers | Heuristic can misclassify unknown errors | Unknown errors should remain retryable; known invalid input is permanent | Worker + Backend | classify_blender_failure returns permanent only for strong invalid/missing markers | CODE/UNIT VERIFIED; classifier test PASS |
| Blender hangs | subprocess timeout on range render | One timeout value hard-coded; process-tree cleanup not guaranteed | Timeout is policy data and supervisor must own process tree | Node Agent + Worker Renderer | Renderer timeout boundary; Node Agent supervises process tree; timeout from future capability/policy | Partial CODE; Windows runtime UNVERIFIED |
| Customer Python executes | old --enable-autoexec and optimization python-expr | Arbitrary code, filesystem/network/credential risk | Untrusted project is data until isolated | Worker/Isolation layer | Engine rejects autoexec=true and BlenderCliRenderer uses --disable-autoexec | CODE/UNIT VERIFIED; sandbox UNVERIFIED |
| Missing external assets | old analyzer/Blender inspection | Analyzer executes Blender Python and can touch untrusted scene | Preflight must be safe and explicit about confidence | Worker Preflight | BasicPreflight only checks safe filesystem contract; dependency scan needs isolated adapter | CODE/UNIT VERIFIED; asset scan NEEDS RESEARCH |
| Large Drive download warning | HTML uuid extraction + second endpoint | Provider page/API can change; no size/hash/allowlist in old download | Ingestion adapter validates source, size and destination containment | Worker download adapter | ProjectDownloader boundary; source URI is JobSpec data; no provider logic in core | Interface only; integration BLOCKED |
| Render output silently absent | expected PNG existence | Existence alone misses corrupt/blank output | Validate before upload and completion | Worker | OutputValidator; minimum size + format/path checks | CODE/UNIT VERIFIED |
| Output path escape | old filename/path assumptions | Customer-controlled format/name can traverse | All derived paths must be contained and IDs allowlisted | Worker | safe IDs, safe output format, job-root containment | CODE/UNIT VERIFIED |
| Retry creates duplicate uploads | old direct upload to deterministic key | Provider timeout leaves UNKNOWN result | Reconcile/idempotency before retry | B2 adapter + Backend | CheckpointStore must put/verify idempotently by attempt/task/frame; no blind retry | Design; B2 BLOCKED |
| Scene optimization mutates source | old resize function wrote main .blend and caused GPU texture failures | Corrupts customer source and causes repeated failures | Never mutate source; derived artifacts need separate identity | Worker Preflight | No mutation in BasicPreflight; optimization adapter not enabled | DESIGN VERIFIED; implementation deferred |
| GPU/VRAM mismatch | nvidia-smi VRAM detection | Detection fallback may admit unsuitable node | Capability is scheduler input, not Worker guess | Node Agent + Backend | Node Agent reports capability; Scheduler matches requirements | Existing design; runtime UNVERIFIED |
| Render speed varies | report_render_speed RPC | Worker-side chunk changes can affect scheduler state | Telemetry informs scheduling, not billing | Worker reporter + Backend | Reporter progress/telemetry adapter; no price authority in Engine | Partial CODE |
| No tasks / idle | polling loop + sleep | Worker owned PC lifecycle and could issue remote shutdown | PC lifecycle is separate from job execution | Node Agent | ACTIVE_IDLE remains online; Worker exits after attempt | Node Agent unit PASS |
| Fleet update storm | random update jitter | Old Worker self-updated from B2, risks unsigned/unsafe artifact | Package update is pinned and staged | Node Agent update manager | Manifest SHA-256 and explicit launcher; rollout policy outside Engine | CODE/UNIT VERIFIED |
| Crash visibility | best-effort report_worker_crash | Crash reporter can hide incident or expose details | Incident reporting must be bounded and non-secret | Node Agent + Backend | Reporter.fail/incident adapter; process supervisor captures exit | Partial CODE |
| Repeated project analysis | dict cache by job_id | Mutable default/cache can leak stale data across attempts | Cache key must include immutable content/version and owner scope | Worker | No cross-customer cache in MVP; future content-addressed job-scoped cache | NEEDS RESEARCH |
| Video merge | separate legacy BAT | Ordering/codec/audio/timeout not part of generic frame engine | Merge is a declared output capability | Worker adapter + Backend | JobSpec output plan selects adapter; no legacy BAT dependency | NEEDS RESEARCH |
| Remote shutdown | RPC remote_commands + os.system shutdown | Dangerous production side effect and wrong owner | Worker must never power-manage PC | Node Agent/Operator policy | Not implemented in Engine; explicit power policy remains disabled | DELETE/OBSOLETE |
| Auto package install | pip bootstrap on every start | Supply-chain/version drift and unbounded network action | Install/update is pinned deployment responsibility | Node Agent installer | No pip bootstrap in Engine; manifest package is pinned | CODE/UNIT VERIFIED |


## Checkpoint implementation evidence

- Added FilesystemCheckpointStore as a local safe adapter/model for B2.
- Writes frame bytes and identity sidecar through temporary files + atomic replace.
- Resume requires job/task/frame identity, byte count and SHA-256 match; object/file existence alone is insufficient.
- Failure test interrupts after frame 1; second run skips verified frame 1 and renders frame 2; workspace cleanup still passes.
- Combined suite: **19/19 PASS**; real B2 adapter remains BLOCKED pending staging credential.


## New salvage evidence — output integrity (2026-08-05)

- Legacy principle salvaged: successful process exit is not sufficient; output must be validated before durable checkpoint.
- New owner: generic Worker Engine.
- New design: `OutputIntegrityValidator` checks PNG signature, IHDR, and non-zero dimensions; other formats use conservative size validation.
- Status/test: implemented; Windows compile + combined suite **21/21 PASS**.
- Evidence: `reports/worker/CWS_WORKER_OUTPUT_INTEGRITY_2026-08-05.md`.
- Full B2/production runtime: UNVERIFIED/BLOCKED.
