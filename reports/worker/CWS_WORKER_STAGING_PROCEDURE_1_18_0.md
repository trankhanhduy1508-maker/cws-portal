# CWS Worker 1.18.0 — staging procedure

Ngày: 2026-08-05  
NaN

## Artifact bắt buộc

Package phải lấy đúng từ main:

- cws_worker_full.py
- cws_worker.bat
- worker-artifact-manifest.json
- các dependency/runtime đã được cài sẵn và pin; không cho launcher tự pip bootstrap.

Tạo manifest ngay trên Windows staging, sau khi copy artifact:

    $root = "C:\\CWS-Worker-1.18.0-Staging"
NaN
NaN
NaN
NaN
NaN
NaN

Trước khi chạy, gọi PinnedWorkerLauncher.validate(). Nếu manifest hoặc checksum fail: dừng, không chạy.

## Test 1 — Blender CLI vô hại

1. Dùng một .blend vô hại do Owner tạo trên máy staging, không chứa customer data, addon, credential hoặc external network asset.
2. Chuẩn bị output directory riêng theo job.
3. Chạy Blender bằng CLI qua Worker path và xác nhận command line chứa --disable-autoexec cho customer-style job.
4. Xác nhận exit code 0, output tồn tại, mở/kiểm tra được và kích thước > 0.
5. Ghi Blender version, Python version, command-line hash/metadata; không ghi secret.

Không dùng --enable-autoexec cho test customer-style.

## Test 2 — download/preflight

- Input chỉ từ staging prefix.
- Xác nhận job-scoped directory.
- Kiểm tra filename/path traversal rejection.
- Xác nhận thiếu asset hoặc file lỗi chuyển sang failure rõ ràng, không render mù.
- Không cho input tự quyết định executable, script hoặc output path.

## Test 3 — B2 checkpoint

- Dùng bucket/prefix staging được Owner cấp riêng.
- Upload output vô hại với object key chứa job/task/attempt id.
- Xác nhận HEAD/metadata/checksum sau upload.
- Chỉ complete task sau khi verify thành công.
- Không test delete, bulk delete hoặc lifecycle production.

## Test 4 — timeout/crash/retry

- Dùng job staging riêng.
- Tạo timeout ngắn ở harness, không kill process production.
- Xác nhận process tree được thu hồi, temp job directory được cleanup.
- Xác nhận retry có bounded attempt và idempotency; không upload/complete trùng.
- Xác nhận failure sau khi hết retry quay về cleanup/idle.

## Test 5 — Node Agent loop

Ghi event timeline:

ACTIVE_IDLE → JOB_AVAILABLE → PREPARING → WORKER_START → WORKER_RUNNING → (RECOVERY)* → CLEANUP → ACTIVE_IDLE

Xác nhận heartbeat/presence vẫn hoạt động, không có Sleep/Hibernate/shutdown/logoff.

## Test matrix tối thiểu

| Test | Runtime | Expected |
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN

## Acceptance gate

Chỉ ghi STAGING VERIFIED khi có log/runtime evidence cho toàn bộ test cần thiết. Unit/offline PASS không thay thế staging. Không deploy/rollout fleet từ procedure chưa đạt.