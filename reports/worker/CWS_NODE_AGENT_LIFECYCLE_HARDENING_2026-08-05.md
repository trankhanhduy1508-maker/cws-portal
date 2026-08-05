# CWS NODE AGENT LIFECYCLE HARDENING — 2026-08-05

## Phạm vi

Đóng một P0 độc lập ở lớp Node Agent mà không cần reboot, shutdown, logoff, sleep, heartbeat giả, production job hoặc B2 credential.

## Thay đổi đã thực hiện

- `worker/node_agent.py`
  - thêm transition hook explicit với reason;
  - thêm retry backoff exponential bounded, không chặn vòng lặp bằng `sleep`;
  - retry chỉ sẵn sàng sau `retry_ready_at`, giữ heartbeat/poll loop có thể tiếp tục;
  - reset retry sau cleanup thành công;
  - giữ bounded retry attempts hiện có;
  - tích hợp RuntimePolicy qua dependency injection.
- `worker/node_agent_runtime_policy.py`
  - policy side-effect-free mặc định;
  - phát `monitor_off` đúng một lần khi vào `ACTIVE_IDLE`;
  - phát `monitor_on` một lần khi rời `ACTIVE_IDLE`;
  - không gọi Sleep/Hibernate/shutdown/logoff, không tự đổi power plan/GPU power.
- `worker/test_node_agent_runtime_policy.py`
  - kiểm tra monitor-off/on không lặp;
  - kiểm tra retry backoff không blocking và bounded.

## Verification

- Python `py_compile`: PASS.
- Node Agent offline suite: **11/11 PASS** (launcher 3, state machine 6, lifecycle/runtime policy 2).
- Không chạy process Node Agent/Worker/Blender thật trên máy hiện tại.
- Không gửi heartbeat giả, không mutate Supabase/B2/production, không gọi Vercel deploy.

## Giới hạn chưa được tuyên bố PASS

- Runtime Windows staging với canonical Worker 1.18.0 + Blender CLI.
- Crash/timeout/retry trên process thật.
- B2 checkpoint/upload/verify thật.
- ACL/service identity/process isolation thật.
- Supabase lease/heartbeat thật.
- Multi-node failover thật.
- Physical monitor-off/power behavior.
- Production Admin deployment và MFA.

## Blocker đã biết

- Vercel production chưa chạy revision fleet mới; `/admin` runtime production vẫn BLOCKED/UNVERIFIED.
- Máy hiện tại không có Node Agent/Worker/Blender runtime đang chạy; physical E2E BLOCKED/UNVERIFIED.

## Kết luận

Lifecycle policy và bounded retry đã được code + offline verified. Đây là **UNIT/CODE VERIFIED**, không phải production/runtime PASS.
