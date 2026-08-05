# CWS Worker + Node Agent VIBE CODE

Đây là khu vực làm việc dài hạn dành riêng cho Worker và Node Agent của CWS.

## Cách dùng

Agent bắt đầu bằng file này, sau đó đọc:

1. [WORKER_VIBE_CODE.md](./WORKER_VIBE_CODE.md)
2. [NODE_AGENT_VIBE_CODE.md](./NODE_AGENT_VIBE_CODE.md)
3. Source of Truth trong repo: `AGENTS.md`, roadmap, `DECISIONS.md`, `CURRENT_STATUS.md`, workflow và evidence liên quan.

Mọi task mới phải cập nhật VIBE CODE và evidence trước khi chuyển task.

## Ranh giới subsystem

- Worker: thực hiện một task render đã claim.
- Node Agent: process nhẹ luôn chạy trên PC, presence/heartbeat, ACTIVE_IDLE, khởi động và giám sát Worker.
- Node Agent không render, không tự quyết định billing và không chứa B2 master credential.
- ACTIVE_IDLE không dùng Sleep/Hibernate; PC luôn ON theo quyết định hiện hành.

## Execution loop

READ STATE → FIND P0 GAP → VERIFY SOURCE OF TRUTH → CODE → TEST → FIX → VERIFY → EVIDENCE → UPDATE VIBE/STATUS/ROADMAP → COMMIT/PUSH → NEXT GAP.

## Trạng thái hiện tại trên main — 2026-08-05

- Node Agent state machine: **UNIT VERIFIED**, 6/6 test cũ PASS.
- Pinned launcher contract: **UNIT VERIFIED**, thêm 3 test checksum/path safety; tổng Worker/Node offline suite **9/9 PASS**.
- Canonical Worker trên main đã xác minh là `cws_worker_full.py` (GitHub blob `e3b0872c2236e47849ec6450532eab18018b129f`) với launcher `cws_worker.bat` (GitHub blob `11f71e049358fe7d35b992b0a89fde9d600638b6`). Không dùng tên artifact cũ trong report làm package source.
- `worker/canonical_worker_launcher.py` chỉ validate manifest SHA-256 và gọi launcher đã pin khi caller chủ động yêu cầu; không pip bootstrap, không thêm supervisor, không gọi power API.
- Blender CLI thật, B2 checkpoint thật, Windows ACL/service identity/Defender và multi-node failover: **CHƯA VERIFIED**.
- Không tuyên bố production PASS từ unit/mock evidence.

## Blocker hiện tại

- Cần một package staging chứa đúng hai artifact canonical + manifest SHA-256 tạo trên Windows staging.
- Cần credential B2 staging hợp lệ và một job/scene vô hại để chạy claim/download/render/upload/verify/cleanup thật.
- Cần máy Windows staging/Node Agent thật để xác minh process tree, identity/ACL và failover.

## Không được

Không reboot/shutdown/logoff/sleep máy hiện tại; không claim job production, không live payment, không rotate/revoke credential, không xóa production data.
