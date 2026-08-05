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
- gọi `worker/canonical_worker_launcher.py` sau khi manifest SHA-256 pass;
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

## P0 backlog — ordered

1. Backend lease/heartbeat adapter thật, khớp RPC hiện hành và không log secret.
2. Pinned canonical Worker launcher — **CODE VERIFIED**, runtime launch chưa verify.
3. Windows process-tree isolation, ACL/service identity và cleanup.
4. Staging runtime: 1 PC, Blender CLI, timeout/recovery, B2 checkpoint.
5. Hai node: duplicate claim/failover/stale lease.
6. Chỉ sau evidence thật mới thiết kế wake/power integration; hiện tại không dùng Sleep.

## Completed

- `worker/node_agent.py`: deterministic state machine.
- `worker/test_node_agent.py`: 6 offline tests PASS.
- `worker/canonical_worker_launcher.py`: manifest/path/checksum validation; 3 tests PASS.
- Combined offline suite: **9/9 PASS**.
- No Windows power API, Sleep/Hibernate, network call, credential or production job was touched.

## Evidence

- `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md`
- `reports/worker/CWS_WORKER_NODE_AGENT_LOOP_2026-08-05.md`
- Physical Windows/Blender/network/B2/failover remain unverified.


## Admin fleet visibility — 2026-08-05

- Backend boundary: `backend/src/jobs/worker-fleet-state.ts`.
- Fresh Node Agent heartbeat + Worker STOPPED/idle = ONLINE + ACTIVE_IDLE; stale heartbeat >180s = OFFLINE.
- Admin endpoint `GET /fleet/workers` exposes Node state, Worker state, health, current task and stale policy.
- Production URL support: `/admin` SPA rewrite + pathname guard. Live deploy/MFA/real heartbeat remains UNVERIFIED.
- Evidence: `reports/worker/CWS_NODE_AGENT_ADMIN_FLEET_VISIBILITY_2026-08-05.md`.
