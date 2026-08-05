# CWS WORKER VIBE CODE

## Mục tiêu

Đóng vòng kín thật:

JOB AVAILABLE → CLAIM → DOWNLOAD → PREFLIGHT → PREPARE → BLENDER → MONITOR → RETRY/RECOVERY → OUTPUT → B2 UPLOAD → VERIFY → CLEANUP.

Worker chỉ xử lý task đã được Backend/Fleet claim hợp lệ. Billing/price là authority của Backend/Database, không phải Worker.

## Contract bắt buộc

1. Input từ Customer, URL, file `.blend`, B2 object và job metadata đều UNTRUSTED.
2. Customer job phải chạy Blender với auto-execution bị tắt theo policy hiện hành.
3. Không hard-code credential; B2 key lấy từ environment/secret storage với scope tối thiểu.
4. Mỗi attempt phải có idempotency/fencing để retry không double-complete, double-upload hoặc double-bill.
5. Output phải được kiểm tra tồn tại, kích thước/format tối thiểu và ownership/prefix trước khi complete.
6. Temp/cache phải nằm trong job-scoped directory; cleanup chạy cả success/failure/timeout.
7. Worker process không chạy Administrator nếu không bắt buộc và không đọc secret ngoài scope cần thiết.
8. Log không chứa token, key, customer private data hoặc toàn bộ đường dẫn nhạy cảm.

## Pipeline state

`QUEUED → CLAIMED → DOWNLOADING → PREFLIGHT → PREPARING → RENDERING → UPLOADING → VERIFYING → COMPLETED`

Failure state: `RETRYABLE_FAILURE`, `QUARANTINED`, `FAILED`, `CANCELLED`.

## Retry/recovery

- Retry có giới hạn, exponential backoff và attempt identity.
- Timeout phải kill đúng process tree, cleanup và báo failure rõ.
- Không retry mù một upload/payout/network request chưa biết kết quả.
- Worker chết sau claim phải để cơ chế stale-task/requeue hiện hành xử lý.
- Không chia frame/tile/simulation nếu chưa có correctness evidence.

## Node matching tối thiểu

Worker chỉ nhận capability requirement do Backend/Scheduler tính:

- Blender version
- render engine
- CPU/GPU/RAM/VRAM capability nếu job cần
- disk/network health
- availability và reliability

Không cho Customer chọn trực tiếp hardware.

## Evidence ladder

- CODE VERIFIED: static/unit/contract.
- STAGING VERIFIED: Blender CLI + vô hại `.blend` + output + cleanup.
- INTEGRATION VERIFIED: claim/download/B2 checkpoint thật trên staging.
- PRODUCTION VERIFIED: job thật, không fixture/mock.
- MULTI-NODE VERIFIED: failover và duplicate protection trên từ hai node thật.

Nếu thiếu level, ghi đúng level, không nâng thành PASS.

## P0 backlog

1. Xác định canonical Worker artifact/ref trên main và loại bỏ drift giữa report, branch và package.
2. Chạy staging procedure với Blender thật, `--disable-autoexec`, output, B2 sandbox checkpoint, timeout/retry/cleanup.
3. Verify Windows isolation/ACL/service identity và Defender trên staging.
4. Verify claim → render → upload → complete với job thật không ảnh hưởng production money.
5. Verify hai node/failover trước khi gọi Fleet production-ready.

## Last verified / next

- Last verified: xem `CURRENT_STATUS.md` và `reports/worker/`; report không thay thế implementation.
- Next action: giữ Worker artifact/version pin đồng nhất với Node Agent contract, sau đó chạy test staging vật lý khi có máy/credential.
