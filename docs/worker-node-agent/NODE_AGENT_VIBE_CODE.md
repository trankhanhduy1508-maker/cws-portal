# CWS NODE AGENT / ACTIVE_IDLE VIBE CODE

## Mục tiêu

Một Node Agent nhẹ chạy liên tục trên PC:

PRESENCE/HEARTBEAT → ACTIVE_IDLE → JOB_AVAILABLE → PREPARING → WORKER_START → WORKER_RUNNING → RECOVERY nếu cần → CLEANUP → ACTIVE_IDLE.

PC luôn ON. ACTIVE_IDLE không được gọi Sleep, Hibernate, shutdown, logoff hoặc gửi input giả lập.

## ACTIVE_IDLE contract

- monitor: OFF hoặc policy-safe low overhead;
- Blender/heavy Worker: không chạy;
- CPU/GPU: lowest safe practical idle;
- network/control channel: vẫn online;
- Node Agent: chỉ heartbeat/poll nhẹ theo interval;
- job mới: chuyển state và spawn Worker nhanh;
- không tự thay đổi power policy trên máy hiện tại.

## Node Agent responsibilities

- đăng ký/presence và heartbeat;
- báo capability/health tối thiểu, không gửi dữ liệu cá nhân không cần thiết;
- nhận job descriptor đã authorization;
- tạo job-scoped workspace;
- gọi Worker qua pinned executable/manifest;
- supervise process tree, timeout và exit code;
- retry/recovery có bounded attempts;
- cleanup rồi quay về ACTIVE_IDLE;
- giữ idempotency/fencing; không tự complete/bill job ngoài Backend authority.

## Không thuộc Node Agent

- không render thay Worker;
- không truy cập Customer private data ngoài job scope;
- không chứa service-role, B2 master key, payment secret;
- không tự chọn giá hoặc payout;
- không tự sleep/wake vật lý;
- không tự download executable tùy ý hoặc pip bootstrap không pin.

## State machine invariant

- Mọi state transition phải explicit và có reason.
- Không spawn duplicate Worker cho cùng task lease.
- Worker failure chỉ retry khi policy cho phép.
- Cleanup là bắt buộc trước ACTIVE_IDLE.
- Heartbeat lỗi không được làm Node Agent crash; phải ghi degraded health.
- Shutdown/stop là explicit operator action, không phải ACTIVE_IDLE behavior.

## P0 backlog

1. Contract/state machine code thuần, không side effect power.
2. Adapter thật cho Backend heartbeat/job lease và pinned Worker launcher.
3. Windows process-tree isolation, ACL/service identity và cleanup.
4. Staging runtime: 1 PC, Blender CLI, timeout/recovery, B2 checkpoint.
5. Hai node: duplicate claim/failover/heartbeat stale lease.
6. Chỉ sau evidence thật mới thiết kế wake/power integration; hiện tại không dùng Sleep.

## Completed loop task — 2026-08-05

- Added `worker/node_agent.py`: side-effect-free deterministic state machine.
- Added `worker/test_node_agent.py`: 6 offline tests PASS.
- Covered ACTIVE_IDLE, heartbeat degradation, PREPARING, single Worker launch, bounded retry, failure cleanup and return to ACTIVE_IDLE.
- No Windows power API, Sleep/Hibernate, network call, credential or production job is touched.
- Evidence: `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md`.

## Evidence

- Unit/state-machine PASS không đồng nghĩa Node Agent production PASS.
- Physical Windows/Blender/network/B2/failover phải có report riêng.
- Mỗi task hoàn thành phải cập nhật file này, WORKER_VIBE_CODE.md và CURRENT_STATUS.md nếu trạng thái thay đổi.
