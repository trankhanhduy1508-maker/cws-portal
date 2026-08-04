# CWS Worker/Fleet Engine — Deep Audit và Hardening

Ngày: 2026-08-04

## Source of truth

Đã đối chiếu AGENTS.md, PROJECT_CONTEXT.md, CURRENT_STATUS.md, DECISIONS.md,
CWS_ROADMAP_MVP_V1.md, CWS_ROADMAP_MVP_V2.md, CWS_WORKER_ROADMAP.md,
CWS_MVP_WORKFLOW_FINAL.md, LOOP.md, report Worker/Security/Customer, migration
Worker, runtime Worker, launcher và backend worker-fleet.gateway.ts.

Không có CWS_FULL_ROADMAP_OFFICIAL_V1_1.md trong repo tại thời điểm audit.
Kiến trúc canonical vẫn là Render backend tạo jobs/tasks trong Supabase;
Worker claim qua RPC, render Blender, upload checkpoint B2. Không thêm Worker HTTP
control plane mới.

## Kết luận kiến trúc

Worker hiện có generic task claim, row locking, generation fencing, heartbeat,
retry/error categories, checkpoint từng frame, B2 recovery, state/incident
reporting và launcher restart. Không rewrite scheduler.

Các năng lực chưa tuyên bố PASS vì thiếu correctness/production evidence:
distributed tile render cho một frame, chia simulation phụ thuộc frame, wake PC
từ sleep, sandbox Windows production cho Blender hostile input, benchmark
capability toàn fleet và full E2E nhiều máy.

## Research evidence

- Blender có cờ --disable-autoexec/--enable-autoexec và command-line render:
  https://docs.blender.org/manual/id/3.6/advanced/command_line/arguments.html
- Packed data không bao phủ mọi external asset, relative paths hỗ trợ portability:
  https://docs.blender.org/manual/nb/3.0/files/blend/packed_data.html
  và https://docs.blender.org/manual/en/dev/files/blend/open_save.html
- B2 large-file upload cần multipart/checksum/verification và key capability tối thiểu:
  https://www.backblaze.com/docs/cloud-storage-large-files
  https://www.backblaze.com/docs/cloud-storage-file-information
  https://www.backblaze.com/docs/cloud-storage-application-key-capabilities
- Supabase RLS và security-definer/search_path là boundary quan trọng:
  https://supabase.com/docs/guides/database/overview
  https://supabase.com/docs/guides/troubleshooting/do-i-need-to-expose-security-definer-Functions-in-Row-Level-Security-Policies-iI0uOw
- Windows Modern Standby giới hạn desktop app khi standby:
  https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/prepare-software-for-modern-standby

## Code đã triển khai

1. Customer/Portal .blend luôn truyền explicit --disable-autoexec khi
   enable_autoexec=False; Owner-controlled job vẫn opt-in explicit.
2. Scene analyzer cũng disable embedded autoexec trước khi mở scene.
3. Generic/customer job không truyền Python optimization expression; chỉ Owner
   job dùng optimization code nội bộ.
4. Filename .blend phải là filename đơn, có đuôi .blend, giới hạn độ dài và
   không có NUL/CR/LF. Cache input dùng WORK_DIR/inputs/<job_id>/<filename>,
   ngăn path traversal và tránh dùng chung cache giữa hai job.
5. Worker version tăng lên 1.18.0.
6. Thêm worker_timeout_contract_test.py và worker_security_contract_test.py;
   test chỉ parse source, không gọi production.

## Test/evidence

- py_compile entrypoint, runtime và test files: PASS.
- Offline contract harness: 10/10 PASS.
- Không import runtime, không cài package, không gọi Supabase/B2, không claim
  production task, không khởi động Blender.
- Không reboot/shutdown/logoff.
- Không tuyên bố physical Blender/fleet E2E PASS.

## Remaining blockers

- Cần staging Windows + Blender thật để xác minh command line/output/checkpoint.
- --disable-autoexec giảm embedded Python risk nhưng chưa phải sandbox; cần
  service account/ACL/job object hoặc VM/container đã kiểm chứng trước production.
- Launcher còn bootstrap dependency qua pip; fleet production nên dùng artifact
  có checksum/allowlist.
- Tile render/simulation splitting chưa làm vì chưa có correctness/billing evidence.
- Wake/sleep orchestration và energy scheduling cần fleet infrastructure decision.
- Full Customer -> B2 -> Blender -> preview/payment/download cần tài khoản,
  máy Worker và dữ liệu thật.

## Next safe action

Chạy package 1.18.0 trên một Windows Worker staging với scene vô hại; xác nhận
command line thực tế, B2 checkpoint và cleanup, sau đó mới rollout batch nhỏ.


## Follow-up (2026-08-04)

- Added SHA-256 artifact manifest and launcher verification, post-task cleanup, opt-in ACL isolation plan, pure power state machine, staging procedure and Fleet matrix.
- Local evidence: compile PASS, manifest PASS, 13/13 offline contracts PASS, PowerShell isolation parse PASS; Desktop package manifest PASS.
- Physical Windows/Blender/B2/ACL/Defender/two-worker failover/wake remain OWNER staging blockers and are not marked PASS.
- Staging package path: C:\\Users\\Administrator\\Desktop\\CWS-Worker-1.18.0-Staging.
