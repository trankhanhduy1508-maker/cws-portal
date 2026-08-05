# CWS Worker + Node Agent loop evidence

Ngày: 2026-08-05  
NaN

## Scope

Đóng phần code an toàn của vòng:

ACTIVE_IDLE → PREPARING → WORKER_START → WORKER_RUNNING → RECOVERY → CLEANUP → ACTIVE_IDLE

và bảo đảm Node Agent gọi đúng canonical Worker package khi được kích hoạt.

## Code thay đổi

- worker/node_agent.py: state machine side-effect-free.
- worker/canonical_worker_launcher.py: validate package root, manifest version, direct-child paths và SHA-256 trước khi launch; chỉ gọi cws_worker.bat.
- worker/test_node_agent.py: state/retry/heartbeat tests.
- worker/test_canonical_worker_launcher.py: valid manifest, tamper rejection, traversal rejection.

## Verification

Lệnh chạy trên máy hiện tại:

    G:\\CWS_Render\\PythonEmbed\\python.exe -m unittest discover -s worker -p "test_*.py" -v

Kết quả: 9/9 PASS.

Đây là offline/unit evidence. Không có test nào claim job, gọi Supabase/B2, khởi động Blender, thay đổi production data hoặc gọi Windows power API.

## Canonical source verification

Trên GitHub main:

- cws_worker_full.py, blob SHA e3b0872c2236e47849ec6450532eab18018b129f.
- cws_worker.bat, blob SHA 11f71e049358fe7d35b992b0a89fde9d600638b6.

Blob SHA chỉ pin source revision; staging phải tự tạo manifest SHA-256 bằng Get-FileHash. Không dùng blob SHA như SHA-256.

## Chưa được tuyên bố PASS

- Windows staging process launch thật.
- Blender CLI với scene vô hại.
- --disable-autoexec runtime.
- B2 checkpoint/HEAD/verify.
- Supabase claim/heartbeat từ chính canonical Worker.
- Windows identity/ACL/Defender/process-tree isolation.
- timeout/crash/retry thật.
- hai-node failover.

## Blocker chuyển Owner

Cần staging package thực tế, B2 staging credential scope tối thiểu và một máy Windows staging có Blender/Python tương thích. Không yêu cầu gửi secret qua chat; credential phải được set cục bộ bằng secret storage/environment.