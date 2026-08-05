# CWS WINDOWS STAGING VERIFICATION — 2026-08-05

## Phạm vi và an toàn

Đã chuyển sang staging verification trên máy Windows hiện tại. Không reboot, shutdown, logoff, sleep/hibernate; không gửi heartbeat giả; không claim job; không mutate Supabase production; không upload/delete B2 production.

## Kết quả theo phân loại

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Python runtime | REAL RUNTIME VERIFIED | Python 3.12.7 tại G:\CWS_Render\PythonEmbed\python.exe |
| Blender CLI | REAL RUNTIME VERIFIED | Blender 5.2.0 LTS tại G:\CWS_Render\Blender\blender-5.2.0-windows-x64\blender.exe |
| Harmless .blend | REAL RUNTIME VERIFIED | Scene factory-startup tại C:\Users\Administrator\CWS_Staging_20260805\safe_scene.blend |
| Safe render | REAL RUNTIME VERIFIED | background + disable-autoexec + python-exit-code 1 + render-frame 1, exit 0 |
| Output verification | REAL RUNTIME VERIFIED | frame_0001.png, 1,174,959 bytes; SHA-256 A038282385467C0A5D99A6E1FB8CFE738AD9D5F1E525BBE31E76B5DFFA7729E2 |
| Node Agent state machine | CODE/UNIT VERIFIED | Offline suite trước đó 11/11 PASS; chưa có production adapter process |
| Node Agent real heartbeat | BLOCKED | Không có staging endpoint/config tách production; không gửi heartbeat vào production |
| Supabase connectivity | REAL RUNTIME VERIFIED (connectivity only) | Read-only unauthenticated REST probe reachable, HTTP 401; không gọi RPC/mutation |
| Supabase authenticated staging | BLOCKED | Chưa có staging project/credential được xác định an toàn |
| Canonical Worker 1.18.0 | BLOCKED | Checkout Windows hiện tại thiếu cws_worker_full.py; manifest local còn artifact schema cũ |
| Canonical Worker spawn | BLOCKED | Không chạy artifact cũ thay canonical Worker |
| B2 read-only | BLOCKED | B2 MCP với User-scope config trả HTTP 401; không upload/download/delete |
| B2 checkpoint/checksum | BLOCKED | Phụ thuộc credential B2 staging hợp lệ và canonical Worker |
| Worker completion/cleanup → ACTIVE_IDLE | UNVERIFIED | Chưa có canonical Worker runtime + lease/heartbeat thật |
| Crash/timeout/bounded retry thật | CODE/UNIT VERIFIED | Bounded non-blocking retry đã có test; process thật chưa chạy |
| Duplicate Worker prevention thật | CODE/UNIT VERIFIED | Contract/unit test; canonical runtime chưa available |
| ACTIVE_IDLE monitor-off | UNVERIFIED | Chỉ có policy hook; không gọi monitor/power API để tránh ảnh hưởng phiên hiện tại |
| Windows ACL/isolation/Defender | UNVERIFIED | Chưa apply thay đổi identity/ACL/firewall/power |

## Runtime smoke test

Blender tạo và render scene vô hại trong thư mục staging riêng:

- Scene: C:\Users\Administrator\CWS_Staging_20260805\safe_scene.blend
- Output: C:\Users\Administrator\CWS_Staging_20260805\render\frame_0001.png
- Auto-execution: disabled
- Exit code: 0
- Production mutation: none

Đây là runtime verification của Blender CLI và output validation, không phải full CWS E2E.

## Blocker cần xử lý bên ngoài phiên này

1. Cung cấp package canonical 1.18.0 đúng revision cho Windows staging, gồm cws_worker_full.py, cws_worker.bat, runtime và manifest khớp SHA-256.
2. Cung cấp staging Supabase endpoint/credential hoặc xác nhận môi trường staging tách biệt; không dùng production để heartbeat test.
3. Cấp B2 staging key hợp lệ, đúng bucket/prefix sandbox; key hiện tại trả 401 và không được tự rotate/revoke.
4. Có staging task vô hại để test claim/lease/completion.
5. Có thể chạy Node Agent thật trên staging; không cần sleep/monitor-off test nếu ảnh hưởng phiên.

## Kết luận

Máy hiện tại đã đạt REAL RUNTIME VERIFIED cho Python + Blender CLI + safe .blend render với autoexec disabled. Các vòng Node Agent → Supabase heartbeat → canonical Worker → B2 → cleanup vẫn BLOCKED/UNVERIFIED vì artifact canonical, staging isolation và credential/runtime thật chưa đủ. Không nâng các mục này thành PASS bằng unit/mock test.
