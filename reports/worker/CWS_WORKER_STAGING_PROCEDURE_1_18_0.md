# CWS Generic Worker Engine — Windows staging procedure

Ngày: 2026-08-05

Đây là procedure cho package Worker Engine cài một lần trên Windows staging. Job/customer mới chỉ tạo JobSpec/TaskSpec động; không sửa Python, không tạo WorkerFull mới và không upload artifact theo từng job.

## 1. Package

Package phải gồm:

- worker/worker_engine.py
- worker-engine.bat
- worker-engine-manifest.json
- Python runtime đã được provision/pin bởi Node Agent installer hoặc staging image
- Blender runtime đã được provision/pin riêng

Không dùng hoặc restore cws_worker_full.py/cws_worker.bat. Hai file đó là legacy knowledge đã loại khỏi runtime source.

## 2. JobSpec

Node Agent/Backend tạo assignment riêng cho mỗi attempt. Worker không tự chọn job.

Tối thiểu JobSpec có:

- job_id, task_id, attempt_id
- lease_generation
- project_uri
- frame_start, frame_end
- output_prefix, output_format
- autoexec=false

Không đưa credential, payment authority hoặc customer private data không cần thiết vào JobSpec. Worker phải reject autoexec=true, ID không hợp lệ, frame range bất thường và đường dẫn workspace thoát root.

## 3. Package và code verification

Trong package root:

powershell
python -m py_compile worker/worker_engine.py
python -m unittest discover -s worker -p "test_*.py"

Launcher phải validate manifest SHA-256 trước khi spawn. Không pip bootstrap tùy ý và không thêm supervisor thứ hai.

## 4. Blender CLI runtime

Dùng scene staging vô hại, không chứa addon/script/customer data. Worker Renderer phải gọi Blender với:

- --background
- --disable-autoexec
- --python-exit-code 1
- frame/output lấy từ JobSpec

Bằng chứng cần lưu:

- Blender version
- command policy và exit code
- output file tồn tại, kích thước hợp lệ và đọc được
- không có process Blender còn sót sau attempt

Đây chỉ là staging render verification, chưa phải production E2E.

## 5. Checkpoint/B2 sandbox

Chỉ chạy khi Owner đã cung cấp B2 staging credential hợp lệ, bucket/prefix sandbox và staging task. Checkpoint key phải do adapter sinh từ JobSpec/attempt, không hard-code.

Verify mỗi frame:

1. upload thành công;
2. metadata/checksum phù hợp;
3. object nằm đúng sandbox prefix;
4. verify lại trước completion;
5. retry không tạo double-complete hoặc dùng attempt cũ.

Không dùng production prefix và không test delete.

## 6. Failure/recovery

Tạo staging task riêng cho:

- Blender crash/exit code khác 0;
- timeout;
- output corrupt/empty;
- checkpoint upload lỗi;
- process dừng giữa hai checkpoint;
- retry bounded;
- stale lease/fencing.

Worker chỉ báo category và evidence. Backend quyết định retry budget; Node Agent supervise process và cleanup. Không retry mù khi trạng thái provider chưa rõ.

## 7. Cleanup và ACTIVE_IDLE

Sau success/failure/timeout:

- job workspace phải được dọn theo policy;
- không xóa ngoài workspace được cấp;
- không còn Blender/Worker process con;
- Worker process exit;
- Node Agent chuyển về ACTIVE_IDLE và tiếp tục presence/heartbeat.

Không test Sleep/Hibernate/shutdown/reboot/logoff. Monitor-off chỉ test khi có cơ chế không ảnh hưởng phiên hiện tại; nếu không ghi UNVERIFIED.

## 8. Phân loại evidence

- CODE/UNIT VERIFIED: tests/py_compile.
- REAL RUNTIME VERIFIED: Blender CLI + scene vô hại + output.
- INTEGRATION VERIFIED: assignment/lease/B2 sandbox thật.
- PRODUCTION VERIFIED: production flow thật.
- MULTI-NODE VERIFIED: hai node/failover thật.

Không nâng cấp evidence bằng mock.

## OWNER TEST STEP

Cần một Windows staging node có package generic, staging Supabase/lease endpoint và B2 sandbox key hợp lệ. Không gửi secret qua chat. Chạy các mục 1–7 và trả lại log/evidence không chứa secret; sau đó mới verify integration claim/download/checkpoint/complete.
