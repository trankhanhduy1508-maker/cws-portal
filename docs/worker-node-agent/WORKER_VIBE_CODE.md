# CWS WORKER VIBE CODE

## Mục tiêu

Đóng vòng kín thật:

JOB AVAILABLE → CLAIM → DOWNLOAD → PREFLIGHT → PREPARE → BLENDER → MONITOR → RETRY/RECOVERY → OUTPUT → B2 UPLOAD → VERIFY → CLEANUP.

Worker chỉ xử lý task đã được Backend/Fleet claim hợp lệ. Billing/price là authority của Backend/Database, không phải Worker.

## Canonical artifact

Trên `main` hiện dùng:

- Entrypoint: `cws_worker_full.py`
- Supervisor/launcher: `cws_worker.bat`
- GitHub blob pins đã xác minh: entrypoint `e3b0872c2236e47849ec6450532eab18018b129f`; launcher `11f71e049358fe7d35b992b0a89fde9d600638b6`.
- Package staging bắt buộc tạo `worker-artifact-manifest.json` với SHA-256 của từng file; Git blob SHA không thay thế SHA-256 runtime.
- Không dùng các tên `cws_worker.py`, `cws_worker_runtime.py`, `worker.bat` từ report cũ nếu không có ref/commit tương ứng trên main.

Adapter đã có: `worker/canonical_worker_launcher.py`. Adapter không tự cài dependency, không tải executable, không thêm restart loop. `cws_worker.bat` vẫn là supervisor duy nhất.

## Contract bắt buộc

1. Input từ Customer, URL, file `.blend`, B2 object và job metadata đều UNTRUSTED.
2. Customer job phải chạy Blender với auto-execution bị tắt theo policy hiện hành.
3. Không hard-code credential; B2 key lấy từ environment/secret storage với scope tối thiểu.
4. Mỗi attempt phải có idempotency/fencing để retry không double-complete, double-upload hoặc double-bill.
5. Output phải được kiểm tra tồn tại, kích thước/format tối thiểu và ownership/prefix trước khi complete.
6. Temp/cache phải nằm trong job-scoped directory; cleanup chạy cả success/failure/timeout.
7. Worker process không chạy Administrator nếu không bắt buộc và không đọc secret ngoài scope cần thiết.
8. Log không chứa token, key, customer private data hoặc toàn bộ đường dẫn nhạy cảm.
9. Không gọi production B2/Supabase trong offline tests.

## Pipeline state

`QUEUED → CLAIMED → DOWNLOADING → PREFLIGHT → PREPARING → RENDERING → UPLOADING → VERIFYING → COMPLETED`

Failure state: `RETRYABLE_FAILURE`, `QUARANTINED`, `FAILED`, `CANCELLED`.

## P0 backlog — ordered

1. **Package staging thật**: tạo manifest canonical, Blender CLI vô hại, `--disable-autoexec`, output, B2 sandbox checkpoint, timeout/retry/cleanup.
2. **Windows isolation**: service identity, ACL, process tree, Defender policy — chỉ runtime verify, không giả sandbox.
3. **Claim → render → upload → complete** trên staging, không ảnh hưởng production money.
4. **Hai node/failover**: stale lease, fencing, duplicate protection.
5. Chỉ sau các bước trên mới xem xét tile/simulation split hoặc power integration.

## Evidence ladder

- CODE VERIFIED: static/unit/contract.
- STAGING VERIFIED: Blender CLI + vô hại `.blend` + output + cleanup.
- INTEGRATION VERIFIED: claim/download/B2 checkpoint thật trên staging.
- PRODUCTION VERIFIED: job thật, không fixture/mock.
- MULTI-NODE VERIFIED: failover và duplicate protection từ hai node thật.

Nếu thiếu level, ghi đúng level, không nâng thành PASS.

## Last verified

- Node state machine + pinned launcher tests: **9/9 PASS** offline.
- Evidence: `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md` và `reports/worker/CWS_WORKER_NODE_AGENT_LOOP_2026-08-05.md`.
- Next action: OWNER TEST STEP trong staging procedure; không claim runtime thật từ offline suite.


## Architecture correction — generic Worker Engine — 2026-08-05

Owner xác nhận cws_worker_full.py là legacy Worker và không còn là canonical artifact. Không restore/copy/để subsystem mới phụ thuộc file này.

Canonical direction hiện tại:

- Engine: worker/worker_engine.py.
- Input: dynamic JobSpec/TaskSpec từ Node Agent assignment.
- Pipeline: download → safe preflight → Blender disable-autoexec → per-frame checkpoint → output validation → upload/verify adapter → completion report → cleanup → exit.
- Node Agent owns node presence/lifecycle/process supervision; Backend owns claim/lease/priority/retry/billing; Worker owns one job attempt execution.
- Job mới là data, không tạo Worker source/version mới.
- Engine tests: 4/4 PASS; CODE/UNIT VERIFIED only.
- Legacy salvage matrix: reports/worker/CWS_WORKER_LEGACY_SALVAGE_MATRIX_2026-08-05.md.
