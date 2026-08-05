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

## Trạng thái hiện tại trên main

- VIBE CODE: đã tạo trên main; Node Agent state machine unit verified 6/6.
- Worker implementation/evidence chi tiết được nhắc trong `CURRENT_STATUS.md` nhưng một số artifact Worker không có trên ref `main`; agent phải xác minh ref/commit trước khi sửa, không coi report là code đã có.
- Node Agent runtime production: chưa được claim PASS; hiện chỉ code/unit test local được đánh dấu UNIT VERIFIED.
- Không tuyên bố physical Windows, Blender/B2, failover hoặc power-management PASS nếu chưa có evidence runtime thật.
