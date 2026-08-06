# CWS WORKER ROADMAP

## Remediation continuation â€” 2026-08-05

- P0 security: explicit CORS and staging RPC privilege hardening are verified; production Worker node authentication, secret rotation and Nest dependency canary remain gates.
- P0 host: SCM Node Agent and Job Object POCs have real runtime evidence; production integration and Session 0/user-session GPU split remain gates.
- P1 optimization: analyzer â†’ working-copy plan/apply exists; ArchViz profiles are policy data only and require benchmark evidence before customer use.
- Remaining P0 gates: Owner secret rotation, production RPC change approval, Admin AAL2 runtime, and Nest 11 canary. No new Blender tradeoff optimization is in scope.

## Total review gates â€” 2026-08-05

- Security: staging admin RPC hardening is verified; production privilege migration, secret rotation, dependency upgrade and explicit CORS remain gates.
- Node Agent: staging runtime is verified; SCM service, non-blocking I/O, Job Object integration, quotas, update verification and rollback need evidence.
- Blender/ArchViz: read-only analyzer is verified on harmless staging input; optimization profiles are proposals until benchmarked.
- Production rollout remains **NO-GO** until security, Admin AAL2, isolation, observability, rollback and canary gates pass.

**TÃªn tÃ i liá»‡u:** `CWS_WORKER_ROADMAP.md`  
**Dá»± Ã¡n:** Computer Workspace â€” CWS  
**Má»¥c tiÃªu:** HoÃ n thiá»‡n kiáº¿n trÃºc Worker sau khi MVP hoÃ n táº¥t, báº£o Ä‘áº£m tÆ°Æ¡ng thÃ­ch cao vá»›i há»‡ thá»‘ng hiá»‡n táº¡i, cÃ³ kháº£ nÄƒng quan sÃ¡t, phá»¥c há»“i, Ä‘iá»u phá»‘i láº¡i cÃ´ng viá»‡c vÃ  thá»‘ng kÃª thá»i gian thuÃª chÃ­nh xÃ¡c.

---



> **Architecture correction 2026-08-05:** Job má»›i lÃ  dá»¯ liá»‡u JobSpec/TaskSpec. Canonical implementation direction lÃ  `worker/worker_engine.py` + `worker-engine.bat` + manifest. CÃ¡c Ä‘oáº¡n lá»‹ch sá»­ nháº¯c artifact legacy khÃ´ng pháº£i hÆ°á»›ng dáº«n triá»ƒn khai má»›i.

# 1. NGUYÃŠN Táº®C Báº®T BUá»˜C

1. Chá»‰ triá»ƒn khai roadmap Worker sau khi MVP hiá»‡n táº¡i Ä‘Ã£ hoÃ n thÃ nh, build á»•n Ä‘á»‹nh vÃ  cÃ¡c luá»“ng chÃ­nh Ä‘Ã£ Ä‘Æ°á»£c kiá»ƒm thá»­.
2. KhÃ´ng viáº¿t láº¡i toÃ n bá»™ Worker tá»« Ä‘áº§u.
3. KhÃ´ng táº¡o repository hoáº·c worktree má»›i trÃªn Windows.
4. Má»i thay Ä‘á»•i pháº£i bÃ¡m:
   - `AGENTS.md`
   - `CWS_ROADMAP_MVP_V1.md`
   - `CWS_MVP_WORKFLOW_FINAL.md`
   - `CWS_DATABASE_SCHEMA.md`
   - roadmap chÃ­nh thá»©c má»›i nháº¥t náº¿u tá»“n táº¡i
5. Æ¯u tiÃªn sá»‘ má»™t lÃ  tÆ°Æ¡ng thÃ­ch vá»›i generic Worker Engine vÃ  Node Agent contract hiá»‡n táº¡i.
6. Legacy `cws_worker_full.py`/`cws_worker.bat` chá»‰ lÃ  knowledge/evidence Ä‘Ã£ salvage; khÃ´ng restore, copy hoáº·c dÃ¹ng lÃ m dependency.
7. KhÃ´ng táº¡o Worker source má»›i cho tá»«ng JobSpec. Generic Engine Ä‘Æ°á»£c cÃ i má»™t láº§n; Node Agent lÃ  supervisor duy nháº¥t.
8. `cws_auto_ghep_video.bat` chá»‰ lÃ  legacy evidence; output merge má»›i pháº£i lÃ  capability/adapter cá»§a Engine khi cÃ³ correctness evidence.
8. KhÃ´ng triá»ƒn khai Sleep, Hibernate, Wake-on-LAN, MQTT, GPU power limit hoáº·c viáº¿t láº¡i Worker báº±ng Go/Rust trong giai Ä‘oáº¡n nÃ y.
9. Má»i thay Ä‘á»•i pháº£i cÃ³ feature flag, test, rollback, log vÃ  migration tÆ°Æ¡ng thÃ­ch náº¿u cÃ³ thay Ä‘á»•i database.
10. KhÃ´ng Ä‘Æ°á»£c lÆ°u secret tháº­t trong source hoáº·c bÃ¡o cÃ¡o.

---

# 2. BA FILE WORKER Báº®T BUá»˜C PHáº¢I Äá»ŒC

## 2.1. `cws_worker_full.py`

Pháº£i xÃ¡c Ä‘á»‹nh:

- entrypoint
- main loop
- registration
- heartbeat
- polling
- claim task
- generation, lease hoáº·c stale protection
- download
- scene analysis
- optimization
- Blender execution
- checkpoint frame
- video merge
- upload
- verify
- complete/fail task
- auto-update
- remote command
- remote shutdown
- error recovery
- logging
- credential
- quan há»‡ vá»›i cÃ¡c file `.bat`

## 2.2. `cws_worker.bat`

Pháº£i xÃ¡c Ä‘á»‹nh:

- cÃ³ pháº£i entrypoint production hay khÃ´ng
- cÃ³ gá»i portable Python hay khÃ´ng
- cÃ³ vÃ²ng láº·p restart hay khÃ´ng
- cÃ³ xá»­ lÃ½ exit code hay khÃ´ng
- cÃ³ ghi log hay khÃ´ng
- cÃ³ thiáº¿t láº­p environment/path hay khÃ´ng
- cÃ³ chá»‘ng cháº¡y nhiá»u instance hay khÃ´ng
- cÃ³ Ä‘ang Ä‘Ã³ng vai trÃ² supervisor hay khÃ´ng

## 2.3. `cws_auto_ghep_video.bat`

Pháº£i xÃ¡c Ä‘á»‹nh:

- cÃ´ng cá»¥ ghÃ©p video
- input/output
- frame order
- FPS
- codec
- audio
- cÃ¡ch xá»­ lÃ½ file trung gian
- exit code
- timeout
- lá»—i
- Ä‘iá»u kiá»‡n thÃ nh cÃ´ng
- cleanup

---

# 3. PHASE 0 â€” HOÃ€N THÃ€NH MVP TRÆ¯á»šC

## Má»¥c tiÃªu

XÃ¡c minh MVP Ä‘Ã£ hoÃ n thÃ nh thá»±c sá»±, khÃ´ng chá»‰ dá»±a trÃªn tÃªn file hoáº·c commit.

## Viá»‡c cáº§n lÃ m

- Äá»c roadmap vÃ  tÃ i liá»‡u chÃ­nh thá»©c.
- Kiá»ƒm tra frontend, backend, database, upload, payment, notification, scheduler vÃ  dashboard.
- Cháº¡y build.
- Cháº¡y test liÃªn quan.
- Kiá»ƒm tra luá»“ng nghiá»‡p vá»¥ chÃ­nh.
- Liá»‡t kÃª pháº§n MVP cÃ²n thiáº¿u.
- HoÃ n thÃ nh MVP trÆ°á»›c khi sá»­a Worker.

## Äiá»u kiá»‡n qua phase

- Build pass.
- Luá»“ng MVP chÃ­nh hoáº¡t Ä‘á»™ng.
- KhÃ´ng cÃ²n háº¡ng má»¥c MVP P0/P1 Ä‘ang dang dá»Ÿ.
- CÃ³ bÃ¡o cÃ¡o xÃ¡c nháº­n MVP hoÃ n táº¥t.

---

# 4. PHASE 1 â€” AUDIT TOÃ€N Bá»˜ Há»† SINH THÃI WORKER

## Má»¥c tiÃªu

Hiá»ƒu Ä‘áº§y Ä‘á»§ Worker hiá»‡n táº¡i trÆ°á»›c khi sá»­a.

## Pháº¡m vi tÃ¬m kiáº¿m

- worker registration
- heartbeat
- `worker_ping`
- scheduler
- queue
- RPC
- generation
- lease
- stale task
- requeue
- checkpoint
- upload
- storage
- auto-update
- remote command
- remote shutdown
- admin dashboard
- host dashboard
- billing
- incident
- migration
- Edge Function
- cron
- cleanup
- notification

## BÃ¡o cÃ¡o báº¯t buá»™c trÆ°á»›c commit Ä‘áº§u tiÃªn

1. Tráº¡ng thÃ¡i MVP.
2. Vai trÃ² cá»§a ba file Worker.
3. Entry point production.
4. Supervisor hiá»‡n táº¡i.
5. Call graph.
6. Dependency map.
7. Luá»“ng nháº­n job Ä‘áº¿n hoÃ n thÃ nh.
8. Luá»“ng heartbeat.
9. Luá»“ng generation/requeue.
10. Luá»“ng ghÃ©p video.
11. Database vÃ  RPC liÃªn quan.
12. File sáº½ sá»­a.
13. File cÃ³ thá»ƒ bá»‹ áº£nh hÆ°á»Ÿng.
14. Rá»§i ro tÆ°Æ¡ng thÃ­ch.
15. Káº¿ hoáº¡ch rollback.

---

# 5. PHASE 2 â€” TÃCH Há»¢P GHÃ‰P VIDEO

## Má»¥c tiÃªu

ÄÆ°a chá»©c nÄƒng cá»§a `cws_auto_ghep_video.bat` vÃ o `cws_worker_full.py` hoáº·c module Python riÃªng.

## YÃªu cáº§u

- KhÃ´ng sao chÃ©p mÃ¹ lá»‡nh BAT.
- Giá»¯ output tÆ°Æ¡ng thÃ­ch.
- CÃ³ timeout.
- CÃ³ kiá»ƒm tra exit code.
- CÃ³ stdout/stderr log.
- CÃ³ xÃ¡c minh input/output.
- CÃ³ retry phÃ¹ há»£p.
- KhÃ´ng complete task khi merge tháº¥t báº¡i.
- Chá»‰ merge vá»›i job cáº§n merge.
- Giá»¯ BAT lÃ m fallback trong giai Ä‘oáº¡n chuyá»ƒn tiáº¿p.

## Luá»“ng

```text
RENDERING
â†’ MERGING náº¿u cáº§n
â†’ UPLOADING
â†’ VERIFYING
â†’ COMPLETE
```

## Feature flags

```env
CWS_ENABLE_INTEGRATED_VIDEO_MERGE=true
CWS_ENABLE_LEGACY_VIDEO_MERGE_FALLBACK=true
```

## Test tá»‘i thiá»ƒu

- merge thÃ nh cÃ´ng
- thiáº¿u frame
- sai thá»© tá»± frame
- thiáº¿u cÃ´ng cá»¥ merge
- timeout
- exit code lá»—i
- output rá»—ng
- fallback BAT
- job khÃ´ng cáº§n merge

---

# 6. PHASE 3 â€” STATE MACHINE WORKER

## Má»¥c tiÃªu

Chuáº©n hÃ³a tráº¡ng thÃ¡i Worker vÃ  trÃ¡nh race condition.

## NguyÃªn táº¯c

TÃ¡ch:

- `desired_state`: backend/scheduler yÃªu cáº§u
- `observed_state`: Worker/Agent bÃ¡o thá»±c táº¿

KhÃ´ng Ä‘á»ƒ hai bÃªn tranh ghi má»™t cá»™t `status`.

## Tráº¡ng thÃ¡i chÃ­nh

```text
OFFLINE
BOOTING
HEALTH_CHECK
IDLE_WAITING_JOB
RESERVED
PREPARING
RENDERING
MERGING
UPLOADING
VERIFYING
COOLDOWN
DRAINING
MAINTENANCE
DEGRADED
QUARANTINED
ERROR
```

## Dá»¯ liá»‡u transition

- worker_id
- host_id
- task_id
- attempt_id
- generation
- from_state
- to_state
- timestamp server-side
- reason
- error_code

## Luá»“ng chuáº©n

```text
BOOTING
â†’ HEALTH_CHECK
â†’ IDLE_WAITING_JOB
â†’ RESERVED
â†’ PREPARING
â†’ RENDERING
â†’ MERGING náº¿u cáº§n
â†’ UPLOADING
â†’ VERIFYING
â†’ COOLDOWN
â†’ IDLE_WAITING_JOB
```

---

# 7. PHASE 4 â€” ACTIVE IDLE POWER MANAGEMENT

## Khi mÃ¡y ráº£nh

- dá»«ng Blender vÃ  tiáº¿n trÃ¬nh náº·ng
- táº¯t mÃ n hÃ¬nh má»™t láº§n
- tiáº¿p tá»¥c heartbeat
- tiáº¿p tá»¥c nháº­n job
- Ä‘á»ƒ Windows vÃ  GPU tá»± idle
- khÃ´ng gá»i táº¯t mÃ n hÃ¬nh láº·p láº¡i trong má»—i vÃ²ng poll

## Khi cÃ³ job

- ngÄƒn Windows sleep
- khÃ´ng báº¯t buá»™c báº­t mÃ n hÃ¬nh
- giá»¯ heartbeat xuyÃªn suá»‘t
- khÃ´ng thay GPU clock
- khÃ´ng thay GPU voltage
- khÃ´ng thay GPU power limit
- khÃ´ng cÆ°á»¡ng cháº¿ Ultimate Performance

## ChÆ°a lÃ m

- Sleep
- Hibernate
- Wake-on-LAN
- Wake-on-Wi-Fi
- MQTT
- EMQX
- Redis
- vÃ´ hiá»‡u hÃ³a Windows Update

---

# 8. PHASE 5 â€” ADMIN DASHBOARD CHO WORKER

## Dá»¯ liá»‡u mÃ¡y

- worker ID
- host/quÃ¡n net
- tÃªn mÃ¡y
- khu vá»±c
- CPU
- GPU
- VRAM
- RAM
- disk trá»‘ng
- Agent version
- Worker version
- Blender version
- observed state
- desired state
- health state
- task hiá»‡n táº¡i
- heartbeat cuá»‘i
- state transition cuá»‘i
- task thÃ nh cÃ´ng/tháº¥t báº¡i
- crash count
- lÃ½ do DEGRADED/QUARANTINED

## Tráº¡ng thÃ¡i hiá»ƒn thá»‹

```text
ONLINE_AVAILABLE
IDLE_WAITING_JOB
RESERVED
PREPARING
RENDERING
MERGING
UPLOADING
VERIFYING
OFFLINE
POWER_LOSS_SUSPECTED
NETWORK_DISCONNECTED
WORKER_CRASHED
BLENDER_CRASHED
GPU_ERROR
DISK_FULL
DEGRADED
QUARANTINED
MAINTENANCE
```

## NguyÃªn táº¯c cáº­p nháº­t

- database lÃ  nguá»“n sá»± tháº­t
- realtime chá»‰ lÃ  tÃ­n hiá»‡u
- polling lÃ  fallback
- heartbeat pháº£i nháº¹
- telemetry náº·ng gá»­i cháº­m hÆ¡n hoáº·c khi cÃ³ thay Ä‘á»•i/lá»—i
- khÃ´ng táº¡o log DB cho tá»«ng heartbeat

---

# 9. PHASE 6 â€” INCIDENT VÃ€ Lá»–I

## Dá»¯ liá»‡u incident

```text
event_id
worker_id
host_id
task_id
attempt_id
event_type
severity
error_code
summary
details
first_seen_at
last_seen_at
occurrence_count
resolved_at
resolution
```

## Lá»—i tá»‘i thiá»ƒu

- Worker crash
- máº¥t heartbeat
- Blender crash
- Blender treo
- GPU driver reset
- GPU quÃ¡ nhiá»‡t
- CPU quÃ¡ nhiá»‡t
- thiáº¿u RAM
- disk full
- download fail
- upload fail
- merge fail
- verify fail
- network disconnect
- power loss suspected
- stale generation
- lease expired
- duplicate Worker
- auto-update fail
- config thiáº¿u
- file khÃ¡ch hÃ ng lá»—i
- thiáº¿u renderer/plugin

## Admin dashboard cáº§n

- lá»c theo host
- lá»c theo Worker
- lá»c theo task
- lá»c theo severity
- lá»c theo thá»i gian
- sá»‘ lá»—i chÆ°a xá»­ lÃ½
- láº§n xáº£y ra gáº§n nháº¥t
- hÃ nh Ä‘á»™ng retry/requeue/quarantine/drain
- audit log hÃ nh Ä‘á»™ng admin

---

# 10. PHASE 7 â€” Máº¤T ÄIá»†N VÃ€ Tá»° ÄIá»€U PHá»I

## Luá»“ng phÃ¡t hiá»‡n

```text
RENDERING
â†’ máº¥t heartbeat
â†’ SUSPECTED_OFFLINE
â†’ háº¿t grace/lease
â†’ OFFLINE_UNRESPONSIVE hoáº·c POWER_LOSS_SUSPECTED
â†’ fencing attempt cÅ©
â†’ requeue pháº§n chÆ°a hoÃ n thÃ nh
â†’ chá»n mÃ¡y khÃ¡c
```

## Thá»© tá»± Æ°u tiÃªn mÃ¡y thay tháº¿

1. `IDLE_WAITING_JOB`
2. `ONLINE_AVAILABLE`
3. Ä‘Ãºng GPU/RAM/VRAM/software/plugin
4. Ä‘á»§ disk
5. khÃ´ng DEGRADED/QUARANTINED
6. cÃ¹ng khu vá»±c hoáº·c máº¡ng phÃ¹ há»£p
7. cÃ³ thá»ƒ resume tá»« checkpoint

## Chá»‘ng zombie/split-brain

```text
task_id
attempt_id
lease_generation
fencing_token
lease_expires_at
worker_id
```

Khi requeue:

- tÄƒng generation
- token cÅ© khÃ´ng Ä‘Æ°á»£c complete
- output cÅ© bá»‹ tá»« chá»‘i hoáº·c cÃ¡ch ly
- khÃ´ng tÃ­nh tiá»n hai láº§n
- chá»‰ dÃ¹ng checkpoint Ä‘Ã£ xÃ¡c minh trÃªn storage

KhÃ´ng káº¿t luáº­n cháº¯c cháº¯n cÃºp Ä‘iá»‡n ngay khi máº¥t heartbeat; cÃ³ thá»ƒ lÃ  máº¥t máº¡ng.

---

# 11. PHASE 8 â€” THá»NG KÃŠ THá»œI GIAN THUÃŠ HOST

## Má»‘c thá»i gian cáº§n lÆ°u

```text
reservation_started_at
startup_started_at
worker_ready_at
billable_started_at
render_started_at
render_completed_at
merge_completed_at
upload_completed_at
verification_completed_at
billable_ended_at
```

## Quy táº¯c 7 phÃºt

```text
startup_grace_seconds = 420
```

Báº£y phÃºt khá»Ÿi Ä‘á»™ng:

- Ä‘Æ°á»£c lÆ°u Ä‘á»ƒ thá»‘ng kÃª
- khÃ´ng tÃ­nh billable
- khÃ´ng tÃ­nh doanh thu host
- khÃ´ng tÃ­nh chi phÃ­ khÃ¡ch hÃ ng

Náº¿u mÃ¡y Ä‘Ã£ `IDLE_WAITING_JOB`, khÃ´ng táº¡o thÃªm 7 phÃºt startup.

Náº¿u mÃ¡y vá»«a khá»Ÿi Ä‘á»™ng cho job, loáº¡i trá»« tá»‘i Ä‘a 420 giÃ¢y Ä‘áº§u.

Pháº§n khá»Ÿi Ä‘á»™ng vÆ°á»£t quÃ¡ 7 phÃºt:

- chÆ°a tá»± Ä‘á»™ng tÃ­nh tiá»n
- Ä‘Ã¡nh dáº¥u `DECISION_REQUIRED` náº¿u roadmap chÆ°a quy Ä‘á»‹nh

## Dashboard host

- mÃ¡y
- task/order
- startup time
- 7 phÃºt miá»…n tÃ­nh
- waiting time
- render time
- merge time
- upload time
- verify time
- billable time
- non-billable time
- interruption/requeue
- Ä‘Æ¡n giÃ¡
- doanh thu dá»± kiáº¿n
- doanh thu cuá»‘i
- tráº¡ng thÃ¡i thanh toÃ¡n

Backend tÃ­nh thá»i gian vÃ  sá»‘ tiá»n; Worker khÃ´ng Ä‘Æ°á»£c tá»± quyáº¿t Ä‘á»‹nh billing.

---

# 12. DATABASE Dá»° KIáº¾N

Kiá»ƒm tra schema hiá»‡n táº¡i trÆ°á»›c khi táº¡o má»›i.

## `workers`

- id
- host_id
- machine_name
- desired_state
- observed_state
- health_state
- current_task_id
- current_attempt_id
- current_generation
- boot_id
- session_id
- agent_version
- worker_version
- last_seen_at
- last_transition_at
- state_reason
- timestamps

## `worker_leases`

- worker_id
- boot_id
- session_id
- sequence_number
- renewed_at
- expires_at

## `worker_state_events`

- worker_id
- host_id
- task_id
- attempt_id
- from_state
- to_state
- reason
- created_at

## `worker_incidents`

- worker_id
- host_id
- task_id
- attempt_id
- event_type
- severity
- error_code
- summary
- details
- timestamps
- occurrence_count
- resolution

## `task_attempts`

- task_id
- worker_id
- lease_generation
- fencing_token_hash
- assigned_at
- startup_started_at
- worker_ready_at
- billable_started_at
- render_started_at
- render_completed_at
- merge_completed_at
- upload_completed_at
- verification_completed_at
- billable_ended_at
- status
- failure_reason

## `host_usage_sessions`

- host_id
- worker_id
- task_id
- attempt_id
- startup_seconds
- startup_grace_seconds
- waiting_seconds
- render_seconds
- merge_seconds
- upload_seconds
- verification_seconds
- billable_seconds
- non_billable_seconds
- hourly_rate
- estimated_amount
- final_amount
- status

## YÃªu cáº§u migration

- backward-compatible
- cÃ³ index
- khÃ´ng máº¥t dá»¯ liá»‡u
- cÃ³ rollback
- timestamp server-side
- Worker khÃ´ng ghi sá»‘ tiá»n cuá»‘i cÃ¹ng

---

# 13. SECURITY

- KhÃ´ng commit Supabase key, B2 key, token hoáº·c password.
- Chuyá»ƒn secret sang environment/config an toÃ n.
- Táº¡o `.env.example` chá»‰ cÃ³ placeholder.
- KhÃ´ng log secret.
- Ghi chÃº rotate secret tá»«ng xuáº¥t hiá»‡n trong Git.
- Complete/fail/upload pháº£i kiá»ƒm tra attempt, generation vÃ  fencing token.
- Worker khÃ´ng cÃ³ quyá»n quyáº¿t Ä‘á»‹nh thanh toÃ¡n cuá»‘i cÃ¹ng.

---

# 14. FEATURE FLAGS

```env
CWS_ENABLE_NODE_STATE_MACHINE=true
CWS_ENABLE_POWER_MANAGER=true
CWS_ENABLE_INTEGRATED_VIDEO_MERGE=true
CWS_ENABLE_LEGACY_VIDEO_MERGE_FALLBACK=true
CWS_ENABLE_ADMIN_WORKER_DASHBOARD=true
CWS_ENABLE_HOST_USAGE_DASHBOARD=true
CWS_ENABLE_AUTO_REQUEUE=true
CWS_ENABLE_NODE_AGENT=false
CWS_ENABLE_PROCESS_GUARDIAN=false
CWS_ENABLE_AUTO_SLEEP=false
CWS_ENABLE_GPU_POWER_CONTROL=false
CWS_ENABLE_POWER_PLAN_SWITCH=false
```

---

# 15. THá»¨ Tá»° COMMIT Äá»€ XUáº¤T

1. `docs(worker): audit current worker architecture`
2. `refactor(worker): isolate video merge lifecycle`
3. `feat(worker): integrate video merge with legacy fallback`
4. `feat(worker): add explicit worker state machine`
5. `feat(database): add worker lease and state event schema`
6. `feat(admin): add worker fleet and incident dashboard`
7. `feat(scheduler): add safe task requeue after lease expiry`
8. `feat(worker): reject stale attempts with fencing checks`
9. `feat(billing): add host usage sessions excluding startup grace`
10. `feat(host): add worker rental time dashboard`
11. `security(worker): move runtime secrets to environment`
12. `refactor(agent): add disabled process guardian skeleton`

Sau má»—i commit:

- cháº¡y test liÃªn quan
- syntax/import check
- lint/type check náº¿u cÃ³
- build pháº§n bá»‹ áº£nh hÆ°á»Ÿng
- kiá»ƒm tra migration
- ghi káº¿t quáº£ ngáº¯n

Cháº¡y full test trÆ°á»›c khi káº¿t thÃºc.

---

# 16. TIÃŠU CHÃ HOÃ€N THÃ€NH

- MVP hoÃ n táº¥t trÆ°á»›c Worker.
- Äá»c Ä‘áº§y Ä‘á»§ ba file Worker.
- PhÃ¢n biá»‡t Ä‘Ãºng launcher, supervisor vÃ  Worker logic.
- GhÃ©p video tÃ­ch há»£p vÃ  cÃ²n fallback.
- KhÃ´ng double-spawn.
- Heartbeat sá»‘ng khi render/merge/upload.
- Admin tháº¥y tráº¡ng thÃ¡i mÃ¡y vÃ  sá»± cá»‘.
- Máº¥t heartbeat Ä‘Æ°á»£c requeue an toÃ n.
- Worker cÅ© khÃ´ng complete attempt má»›i.
- Host tháº¥y thá»i gian thuÃª.
- 420 giÃ¢y startup khÃ´ng tÃ­nh billable.
- KhÃ´ng tÃ­nh trÃ¹ng giá»¯a attempt.
- KhÃ´ng cÃ³ secret tháº­t trong diff.
- Test pass.
- Build pass.
- Migration cÃ³ rollback.
- CÃ³ commit hash, branch vÃ  tráº¡ng thÃ¡i push/PR.

---

# 17. PROMPT TIáº¾T KIá»†M TOKEN DÃ™NG CHO CLAUDE CODE

> LuÃ´n dÃ¹ng prompt nÃ y khi giao nhiá»‡m vá»¥ tá»« roadmap. KhÃ´ng dÃ¡n láº¡i toÃ n bá»™ roadmap náº¿u Claude Ä‘Ã£ cÃ³ file nÃ y trong repository.

```md
Äá»c `CWS_WORKER_ROADMAP.md` vÃ  thá»±c hiá»‡n Ä‘Ãºng phase Ä‘Æ°á»£c giao.

Quy táº¯c:
- BÃ¡o cÃ¡o báº±ng tiáº¿ng Viá»‡t; code dÃ¹ng tiáº¿ng Anh.
- KhÃ´ng táº¡o repo/worktree/thÆ° má»¥c dá»± Ã¡n má»›i.
- Chá»‰ Ä‘á»c file liÃªn quan báº±ng search/grep, khÃ´ng Ä‘á»c láº¡i toÃ n repo.
- KhÃ´ng in toÃ n bá»™ code dÃ i trong pháº£n há»“i.
- Æ¯u tiÃªn tÆ°Æ¡ng thÃ­ch vá»›i `cws_worker.bat`, `cws_worker_full.py` vÃ  `cws_auto_ghep_video.bat`.
- KhÃ´ng táº¡o supervisor má»›i náº¿u `cws_worker.bat` Ä‘Ã£ restart Worker.
- KhÃ´ng chuyá»ƒn MQTT, Sleep/Hibernate, Wake-on-LAN, GPU power control hoáº·c viáº¿t láº¡i Go/Rust.
- Chia commit nhá», test sau má»—i commit.
- KhÃ´ng Ä‘oÃ¡n schema hoáº·c luá»“ng; pháº£i tÃ¬m code/RPC/migration liÃªn quan.
- Náº¿u phase phá»¥ thuá»™c MVP chÆ°a hoÃ n táº¥t thÃ¬ hoÃ n thÃ nh MVP trÆ°á»›c.
- Cuá»‘i nhiá»‡m vá»¥ chá»‰ bÃ¡o:
  1. viá»‡c Ä‘Ã£ lÃ m
  2. file/migration Ä‘Ã£ sá»­a
  3. test/build vÃ  káº¿t quáº£
  4. rá»§i ro cÃ²n láº¡i
  5. viá»‡c chÆ°a lÃ m
  6. commit hash, branch, push/PR

Nhiá»‡m vá»¥ hiá»‡n táº¡i:
[CHá»ˆ GHI PHASE HOáº¶C CÃ”NG VIá»†C Cá»¤ THá»‚ á»ž ÄÃ‚Y]
```

---

# 18. CÃCH CHá»ŒN MODEL Äá»‚ TIáº¾T KIá»†M CHI PHÃ

- DÃ¹ng model code táº§m trung cho:
  - audit
  - search code
  - refactor module
  - UI dashboard
  - migration Ä‘Æ¡n giáº£n
  - test
  - documentation
- Chá»‰ dÃ¹ng model máº¡nh hÆ¡n khi gáº·p:
  - race condition khÃ³
  - split-brain
  - fencing token
  - migration production phá»©c táº¡p
  - lá»—i láº·p láº¡i sau hai láº§n sá»­a
  - thay Ä‘á»•i áº£nh hÆ°á»Ÿng nhiá»u module

NÃªn chia thÃ nh cÃ¡c phiÃªn:

1. Audit Worker.
2. TÃ­ch há»£p video merge.
3. State machine vÃ  database.
4. Dashboard admin.
5. Requeue vÃ  fencing.
6. Host usage.
7. Security vÃ  review cuá»‘i.

KhÃ´ng giao toÃ n bá»™ roadmap trong má»™t phiÃªn náº¿u khÃ´ng cáº§n thiáº¿t.


---

# Node Agent / ACTIVE_IDLE â€” 2026-08-05

- `worker/node_agent.py` implements the first side-effect-free state machine: `ACTIVE_IDLE â†’ PREPARING â†’ WORKER_START â†’ WORKER_RUNNING â†’ RECOVERY/CLEANUP â†’ ACTIVE_IDLE`.
- `worker/test_node_agent.py` verifies 6 offline contracts on Windows; evidence: `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md`.
- This is UNIT VERIFIED only. It does not claim real Backend lease/heartbeat, Blender, B2, Windows isolation, physical multi-node failover or power management.
- ACTIVE_IDLE explicitly does not call Sleep/Hibernate/shutdown/logoff; the PC remains online. Production adapters must be injected and tested against the canonical Worker artifact before enabling them.


# 19. Worker + Node Agent VIBE loop â€” 2026-08-05

- Canonical source trÃªn main: `cws_worker_full.py` + `cws_worker.bat`; khÃ´ng dÃ¹ng tÃªn artifact cÅ© náº¿u khÃ´ng cÃ³ ref tÆ°Æ¡ng á»©ng.
- `worker/canonical_worker_launcher.py` validate manifest version, direct-child paths vÃ  SHA-256 rá»“i má»›i gá»i `cws_worker.bat`; khÃ´ng thÃªm supervisor, pip bootstrap hoáº·c power API.
- Node Agent state machine + pinned launcher offline suite: **9/9 PASS**, py_compile PASS. Evidence: `reports/worker/CWS_WORKER_NODE_AGENT_LOOP_2026-08-05.md`.
- Staging procedure: `reports/worker/CWS_WORKER_STAGING_PROCEDURE_1_18_0.md`.
- ChÆ°a gá»i PASS: Blender/B2 runtime, real claim/heartbeat, Windows ACL/service identity/Defender/process isolation, timeout/crash/retry runtime vÃ  multi-node failover.
- P0 tiáº¿p theo: Owner cháº¡y staging procedure trÃªn Windows staging vá»›i B2 staging credential scoped vÃ  scene vÃ´ háº¡i; sau Ä‘Ã³ má»›i xem xÃ©t rollout/failover.


# 20. Node Agent â†’ Supabase â†’ Admin visibility â€” 2026-08-05

- `worker-fleet-state.ts` is the backend mapping boundary for PC state. Heartbeat freshness, not Worker process existence, determines ONLINE/OFFLINE.
- Fresh heartbeat with Worker STOPPED/idle maps to ACTIVE_IDLE; stale heartbeat over 180 seconds maps to OFFLINE.
- `GET /fleet/workers` and Admin table expose Node state, Worker state, current task, last seen and health.
- Production route `/admin` now has SPA rewrite and pathname entry; runtime deploy/MFA verification remains UNVERIFIED.
- Evidence: `reports/worker/CWS_NODE_AGENT_ADMIN_FLEET_VISIBILITY_2026-08-05.md`.


# 20A. Node Agent lifecycle hardening â€” 2026-08-05

- `worker/node_agent.py` now has explicit transition reasons, injected runtime policy, bounded non-blocking exponential retry backoff and retry reset after cleanup.
- `worker/node_agent_runtime_policy.py` emits monitor-off/on boundary hooks once; it does not call power APIs or sleep the PC.
- Verification: py_compile PASS; offline suite **11/11 PASS**.
- Evidence: `reports/worker/CWS_NODE_AGENT_LIFECYCLE_HARDENING_2026-08-05.md`.
- Runtime process supervision, Blender/B2 staging, real heartbeat/lease, Windows isolation, failover and production deployment remain UNVERIFIED/BLOCKED.

# 20B. Windows staging verification â€” 2026-08-05

- Python 3.12.7 and Blender 5.2.0 LTS safe CLI render with disable-autoexec: REAL RUNTIME VERIFIED.
- Supabase connectivity only: REAL RUNTIME VERIFIED at HTTP reachability; authenticated staging heartbeat not attempted.
- Canonical Worker 1.18.0 spawn: BLOCKED because current Windows checkout lacks cws_worker_full.py and manifest is not canonical.
- B2 read-only: BLOCKED with HTTP 401; no write/delete.
- Node Agent â†’ heartbeat â†’ Worker â†’ B2 â†’ cleanup remains BLOCKED/UNVERIFIED.
- Evidence: reports/worker/CWS_WINDOWS_STAGING_VERIFICATION_2026-08-05.md.


# 20C. Generic Worker Engine correction â€” 2026-08-05

- Legacy cws_worker_full.py Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»c Ä‘á»ƒ salvage knowledge; khÃ´ng restore/copy vÃ  khÃ´ng cÃ²n lÃ  kiáº¿n trÃºc Ä‘Ã­ch.
- Added worker/worker_engine.py vÃ  worker/test_worker_engine.py.
- Job má»›i chá»‰ truyá»n JobSpec/TaskSpec Ä‘á»™ng; khÃ´ng hard-code job/customer/frame/B2 object.
- Node Agent owns PC lifecycle/supervision; Backend owns assignment/lease/priority/retry/billing; Worker owns one execution attempt.
- Engine test: 4/4 PASS; CODE/UNIT VERIFIED.
- Legacy salvage matrix: reports/worker/CWS_WORKER_LEGACY_SALVAGE_MATRIX_2026-08-05.md.


## P0 status update â€” 2026-08-05

Output integrity is implemented in the generic Worker Engine. PNG outputs are structurally checked before checkpoint/upload; tests are 22/22 PASS. Full B2/production runtime verification remains blocked by staging integration credentials/endpoints.


## P0 status update â€” timeout cleanup (2026-08-05)

Blender subprocess timeout now cleans up the owned process tree on Windows and preserves retry classification. Compile + combined suite 22/22 PASS; live timed-out Blender verification remains unverified.


## P0 status update â€” capability preflight (2026-08-05)

Generic Worker preflight now enforces dynamic minimum VRAM/RAM requirements from JobSpec against the Node-provided capability profile. Tests: 24/24 PASS; physical capability discovery remains unverified.


## Runtime integration status â€” 2026-08-05

Windows safe staging has verified the local Node Agent â†’ Generic Worker â†’ Blender â†’ validation â†’ checkpoint â†’ cleanup â†’ ACTIVE_IDLE loop, including crash recovery and timeout cleanup. Supabase/B2 integration remains blocked by absent staging-safe credentials/endpoints. Evidence: `reports/worker/CWS_WORKER_WINDOWS_RUNTIME_INTEGRATION_2026-08-05.md`.


## Staging E2E integration update â€” 2026-08-05

Credential-gated Supabase/B2 adapters are prepared with no production fallback or destructive capability. Full E2E remains blocked by missing staging credentials and complete assignment JobSpec contract.

## Staging blocker audit â€” 2026-08-05

Machine-safe env inspection found no staging values. Supabase connector exposes no separate staging project; the existing claim RPC contract is incomplete for a dynamic JobSpec. B2 staging endpoint/bucket/key are also absent. Owner inputs and exact assignment alternatives: `reports/worker/CWS_STAGING_BLOCKER_AUDIT_2026-08-05.md`.

## FULL staging E2E â€” REAL RUNTIME VERIFIED â€” 2026-08-05

The isolated staging path is now verified end-to-end: assignment/fencing generation â†’ Node Agent child Generic Worker â†’ real Blender render â†’ integrity/checkpoint â†’ B2 staging HEAD+SHA-256 verification â†’ Supabase completion â†’ cleanup â†’ `ACTIVE_IDLE`. Evidence: `reports/worker/CWS_STAGING_FULL_E2E_REAL_RUNTIME_VERIFIED_2026-08-05.md`.
## P0 follow-up â€” 2026-08-05

- Multi-node/failover: **REAL RUNTIME VERIFIED** in staging, including stale takeover and generation fencing. Evidence: `reports/worker/CWS_MULTI_NODE_FAILOVER_REAL_RUNTIME_VERIFIED_2026-08-05.md`.
- Admin Fleet real runtime: **BLOCKED/UNVERIFIED** pending staging staff-role/AAL2 setup and deployed route verification.
- Hostile `.blend` isolation: **UNVERIFIED/BLOCKED** pending a disposable Windows Sandbox-capable host. Evidence: `reports/worker/CWS_HOSTILE_BLEND_ISOLATION_POC_2026-08-05.md`.
- Production rollout readiness: **NO-GO**. Evidence/checklist: `reports/worker/CWS_PRODUCTION_ROLLOUT_READINESS_2026-08-05.md`.
- Admin RBAC staging schema is applied and verified; real Admin UI remains **BLOCKED/UNVERIFIED** pending Owner Auth/MFA setup. Evidence: `reports/worker/CWS_ADMIN_FLEET_STAGING_AUTH_BLOCKER_2026-08-05.md`.
- Isolation POC has partial Job Object runtime evidence, but filesystem/network boundary is **UNVERIFIED/BLOCKED**; production remains **NO-GO**.

## P1 reliability follow-up â€” 2026-08-06

- Node Agent retry backoff now supports bounded opt-in jitter with deterministic
  tests; default timing is unchanged. Evidence:
  `reports/worker/CWS_NODE_AGENT_JITTER_HARDENING_2026-08-06.md`.
- Synchronous remote I/O, production SCM/Job Object integration, isolation,
  observability, rollback, and production authentication remain open gates.
