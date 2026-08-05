# CWS WORKER VIBE CODE

## Mục tiêu

Đóng vòng kín thật:

JOB AVAILABLE → CLAIM → DOWNLOAD → PREFLIGHT → PREPARE → BLENDER → MONITOR → RETRY/RECOVERY → OUTPUT → B2 UPLOAD → VERIFY → CLEANUP.

Worker chỉ xử lý task đã được Backend/Fleet claim hợp lệ. Billing/price là authority của Backend/Database, không phải Worker.

## Canonical artifact

Legacy cws_worker_full.py and cws_worker.bat are retained as knowledge/evidence only, excluded from the runtime package, never imported/launched, and not dependencies.

Current generic package direction:

- Engine: worker/worker_engine.py.
- Launcher: worker-engine.bat.
- Manifest: worker-engine-manifest.json.
- Package is installed once on a node; each customer/job is a dynamic JobSpec/TaskSpec.
- No job/customer/frame/B2 object/credential is hard-coded in the engine.
- Node Agent supplies the authorized attempt and supervises one engine process.
- Backend owns assignment, lease, priority, retry policy and billing.

The engine currently has CODE/UNIT VERIFIED coverage only; staging adapters for Supabase/B2 and real Node Agent integration remain separate P0 work.

## Contract bắt buộc

1. Input từ Customer, URL, file `.blend`, B2 object và job metadata đều UNTRUSTED.
2. Customer job phải chạy Blender với auto-execution bị tắt theo policy hiện hành.
3. Không hard-code credential; B2 key lấy từ environment/secret storage với scope tối thiểu.
4. Mỗi attempt phải có idempotency/fencing để retry không double-complete, double-upload hoặc double-bill.
5. Output phải được kiểm tra tồn tại, kích thước/format tối thiểu và ownership/prefix trước khi complete.
6. Temp/cache phải nằm trong job-scoped directory; cleanup chạy cả success/failure/timeout.
7. Worker process không chạy Administrator nếu không bắt buộc và không đọc secret ngoài scope cần thiết.
8. Log không chứa token, key, customer private data hoặc toàn bộ đường dẫn nhạy cảm.
9. Không gọi production B2/Supabase trong offline tests.

## Pipeline state

`QUEUED → CLAIMED → DOWNLOADING → PREFLIGHT → PREPARING → RENDERING → UPLOADING → VERIFYING → COMPLETED`

Failure state: `RETRYABLE_FAILURE`, `QUARANTINED`, `FAILED`, `CANCELLED`.

## P0 backlog — ordered

1. **Package staging thật**: tạo manifest canonical, Blender CLI vô hại, `--disable-autoexec`, output, B2 sandbox checkpoint, timeout/retry/cleanup.
2. **Windows isolation**: service identity, ACL, process tree, Defender policy — chỉ runtime verify, không giả sandbox.
3. **Claim → render → upload → complete** trên staging, không ảnh hưởng production money.
4. **Hai node/failover**: stale lease, fencing, duplicate protection.
5. Chỉ sau các bước trên mới xem xét tile/simulation split hoặc power integration.

## Evidence ladder

- CODE VERIFIED: static/unit/contract.
- STAGING VERIFIED: Blender CLI + vô hại `.blend` + output + cleanup.
- INTEGRATION VERIFIED: claim/download/B2 checkpoint thật trên staging.
- PRODUCTION VERIFIED: job thật, không fixture/mock.
- MULTI-NODE VERIFIED: failover và duplicate protection từ hai node thật.

Nếu thiếu level, ghi đúng level, không nâng thành PASS.

## Last verified

- Node state machine + generic engine/launcher tests: **16/16 PASS** offline.
- Evidence: `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md` và `reports/worker/CWS_WORKER_NODE_AGENT_LOOP_2026-08-05.md`.
- Next action: OWNER TEST STEP trong staging procedure; không claim runtime thật từ offline suite.


## Architecture correction — generic Worker Engine — 2026-08-05

Owner xác nhận cws_worker_full.py là legacy Worker và không còn là canonical artifact. Không restore/copy/để subsystem mới phụ thuộc file này.

Canonical direction hiện tại:

- Engine: worker/worker_engine.py.
- Input: dynamic JobSpec/TaskSpec từ Node Agent assignment.
- Pipeline: download → safe preflight → Blender disable-autoexec → per-frame checkpoint → output validation → upload/verify adapter → completion report → cleanup → exit.
- Node Agent owns node presence/lifecycle/process supervision; Backend owns claim/lease/priority/retry/billing; Worker owns one job attempt execution.
- Job mới là data, không tạo Worker source/version mới.
- Engine tests: 6/6 PASS; CODE/UNIT VERIFIED only.
- Legacy salvage matrix: reports/worker/CWS_WORKER_LEGACY_SALVAGE_MATRIX_2026-08-05.md.


## Lease/fencing salvage — 2026-08-05

- Salvaged old generation/fencing + heartbeat lesson into generic Engine AttemptGuard.
- Worker checks active lease and emits heartbeat at CLAIMED, DOWNLOADING, RENDERING and CHECKPOINTED boundaries.
- A stale generation is rejected and cleanup still runs; adapter failures are retryable.
- Tests: generic engine 6/6; combined Worker/Node/launcher suite 17/17 PASS.
- Real Supabase lease/heartbeat adapter remains UNVERIFIED pending isolated staging endpoint/task.


## Failure classification salvage — 2026-08-05

- Added classify_blender_failure to separate strong invalid/missing project evidence (permanent) from timeout/OOM/driver/unknown failures (retryable).
- Backend remains the retry-budget authority; Worker never retries indefinitely.
- Generic Engine tests: 7/7; combined Worker/Node/launcher suite: 18/18 PASS.
- Missing-assets analysis remains isolated preflight research; customer code is not executed.


## Latest P0 implementation — output integrity (2026-08-05)

- Implemented `OutputIntegrityValidator` in the generic Worker Engine.
- PNG output now requires minimum size, PNG signature, IHDR chunk, and non-zero dimensions before checkpoint/upload.
- Non-PNG formats retain conservative minimum-size validation until a format-specific validator is added.
- Windows staging Python compile + combined Worker/Node tests: **22/22 PASS**.
- Evidence: `reports/worker/CWS_WORKER_OUTPUT_INTEGRITY_2026-08-05.md`.
- Production/B2 end-to-end remains UNVERIFIED/BLOCKED pending safe staging credentials and real integration.


## Latest P0 implementation — timeout/process-tree cleanup (2026-08-05)

- `BlenderCliRenderer` now owns the Blender PID and uses bounded communicate timeout.
- Windows timeout terminates only that owned process tree; timeout remains retryable and Backend/Node Agent retain retry authority.
- No power-management behavior is introduced.
- Windows staging compile + combined suite: **22/22 PASS**.
- Evidence: `reports/worker/CWS_WORKER_TIMEOUT_CLEANUP_2026-08-05.md`.
- Live timed-out Blender tree test remains UNVERIFIED; no customer/production process was used.


## Latest P0 implementation — capability preflight (2026-08-05)

- JobSpec now carries dynamic minimum VRAM/RAM requirements.
- Generic Worker preflight rejects an insufficient injected node profile before Blender starts; Scheduler remains node-selection authority.
- Windows staging compile + combined suite: **24/24 PASS**.
- Evidence: `reports/worker/CWS_WORKER_CAPABILITY_PREFLIGHT_2026-08-05.md`.
- Actual NVML/Windows capability discovery and real fleet admission remain UNVERIFIED/BLOCKED.


## Integration phase — Windows staging runtime (2026-08-05)

- Safe local runtime harness now verifies Node Agent → child Generic Worker → Blender 5.2 → output validation → filesystem checkpoint → cleanup → ACTIVE_IDLE.
- Happy path: REAL RUNTIME VERIFIED.
- Crash-once bounded recovery: REAL RUNTIME VERIFIED.
- One-second Blender timeout and owned process cleanup: REAL RUNTIME VERIFIED; first harness hang was fixed and rerun.
- Hardware observed: RTX 2060 SUPER 8192 MiB, driver 576.88; Windows RAM ≈16 GiB.
- Supabase lease/heartbeat: BLOCKED, no staging-safe credential/endpoint.
- B2 upload/resume: BLOCKED, no staging-safe credential/bucket.
- Evidence: `reports/worker/CWS_WORKER_WINDOWS_RUNTIME_INTEGRATION_2026-08-05.md`.


## Staging integration contract — 2026-08-05

- Added credential-gated `worker/staging_adapters.py` for Supabase RPC and B2 S3-compatible checkpoints.
- Uses only `CWS_STAGING_*`; no production fallback, service-role requirement, delete, bucket-admin or key-admin capability.
- B2 frame checkpoint uses idempotent metadata and SHA-256 verification.
- `CWS_STAGING_B2_PREFIX` is mandatory; checkpoint keys cannot be selected ad hoc by the harness.
- Supabase claim results are accepted only when they satisfy the complete dynamic JobSpec contract; no legacy fields are inferred.
- Staging assignment still needs a full JobSpec contract: assignment RPC or minimal RLS SELECT for jobs/tasks.
- Evidence/Owner action: `reports/worker/CWS_STAGING_E2E_CONTRACT_2026-08-05.md`.
- Current status: adapter CODE/UNIT VERIFIED; Supabase/B2 FULL E2E BLOCKED pending staging credentials.

## Staging blocker audit — 2026-08-05

- New Windows machine has no `CWS_STAGING_*` values and the connector account exposes no separate staging Supabase project.
- Existing generic claim RPC returns only task/job/frame/generation; it cannot safely construct a complete JobSpec.
- `CWS_STAGING_FLEET_ID` is an integer matching the existing `register_worker(... p_fleet_id bigint, ...)` contract.
- Exact Owner inputs and the two supported assignment-contract options are recorded in `reports/worker/CWS_STAGING_BLOCKER_AUDIT_2026-08-05.md`.

## FULL staging E2E — REAL RUNTIME VERIFIED — 2026-08-05

- Generic Worker claimed generation `3`, rendered the harmless Blender scene, validated output integrity, uploaded and verified the B2 object checksum, and completed the Supabase task.
- The run used only `CWS_STAGING_*`, disabled Blender autoexec, and exited cleanly with no leaked Blender/Python worker process.
- Evidence: `reports/worker/CWS_STAGING_FULL_E2E_REAL_RUNTIME_VERIFIED_2026-08-05.md`.

## Multi-node and isolation — 2026-08-05

- Two real Node Agents completed separate staging assignments; stale takeover at generation 2 rejected the old generation. **REAL RUNTIME VERIFIED**.
- Hostile `.blend` isolation remains **UNVERIFIED**; `--disable-autoexec` is retained but is not treated as a security boundary.
- Production rollout remains **NO-GO** until Admin AAL2 runtime and Windows isolation gates pass.

## Admin RBAC and isolation follow-up — 2026-08-05

- Staging RBAC schema matches the application contract and is RLS-protected; no browser service-role credential is permitted.
- Admin Fleet real UI remains **BLOCKED/UNVERIFIED** pending staging Auth/MFA identity and server-only backend configuration.
- Job Object timeout/child cleanup is **REAL RUNTIME VERIFIED**; filesystem/network isolation is **UNVERIFIED**.
