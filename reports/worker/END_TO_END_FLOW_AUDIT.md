# Audit Luong Toi Thieu Worker: Website -> Render -> Upload -> Verify -> Hoan Thanh (2026-07-31)

## Trang thai tong quan: ⚠️ Con viec can lam — dang CHO xac nhan tu B2
(theo yeu cau Dy), KHONG thay doi production trong luc cho.

Muc tieu: audit toan bo luong toi thieu theo `CWS_WORKER_ROADMAP.md`:

```
Website tao job -> Worker online -> Worker heartbeat -> Worker nhan/claim job
-> Render -> Upload ket qua -> Verify -> Website hien thi hoan thanh
```

CHI doc code + du lieu Supabase that trong bao cao nay (KHONG goi B2 API
nao them — dang cho Dy tu xac nhan qua B2 Web Console theo yeu cau).

---

## Buoc 1: Website tao job

**Code:** `backend/src/jobs/jobs.service.ts#createOrder()` (dong 101-179)

1. Tinh `estimate` (heuristic truoc render).
2. Tao 1 dong trong bang `render_orders` (domain MVP) qua
   `ordersRepository.create(order)`.
3. Goi `dispatchToWorkerFleet(order)` (dong 164-179):
   - `blendLink` = `order.driveLink` (uu tien) hoac `b2://{uploadedFileB2Key}`.
   - Goi `WorkerFleetGateway.createInternalJobWithProbeTask({ internalJobId: order.id, blendLink, blendFile })`
     -> insert 1 dong vao bang `jobs` (domain Worker Fleet, `id` = chinh
     `order.id`) + 1 probe task (frame 1-1, `status='queued'`) vao bang
     `tasks` (worker-fleet.gateway.ts, dong 29-64).
   - `attachInternalJobId()` ghi lai `internalJobId` vao `render_orders`.

✅ **Da xac minh qua code** — luong nay KHONG phu thuoc B2/Worker that,
chi la ghi Supabase. Khong phat hien sai lech.

---

## Buoc 2: Worker online (register + heartbeat)

**Code:** `cws_worker_full.py` — `register_worker()` (goi RPC
`register_worker`), `worker_ping()` (RPC `worker_ping`), vong lap
`heartbeat_loop()` chay thread rieng khi co task active.

**RPC lien quan (da doc truc tiep dinh nghia that qua `pg_get_functiondef`
trong phien lam viec nay, khong doan):**

- `register_worker(p_worker_id, p_fleet_id, p_gpu_name, p_vram_mb)` —
  `INSERT ... ON CONFLICT (worker_id) DO UPDATE` — luon dat lai
  `status='idle'`, `last_seen_at=now()`. ✅ Da doc code that.
- `worker_ping(p_worker_id)` — cap nhat `last_seen_at`, tu dong chuyen
  `status` tu `'offline'` ve `'idle'` neu dang offline. ✅ Da doc code that.
- `mark_stale_workers_offline()` (cron `*/2 * * * *`, da xac nhan
  `active=true` qua `cron.job` truoc do trong phien) — sau 180s khong co
  heartbeat, tu dong chuyen `status='offline'`. ✅ Da xac nhan cron dang
  chay that.

**Diem CAN LUU Y (da xac dinh tu truoc trong phien nay, khong phai phat
hien moi):** `WORKER_VERSION` trong file `.py` hien co trong repo la
`1.14.0`, con `worker_config.latest_version` tren Supabase la `1.16.5`
(cap nhat `2026-07-28`, SAU khi worker cuoi cung im lang `2026-07-27`).
Neu 1 worker khoi dong voi file `.py` hien co trong repo, no se PHAT
HIEN lech version va tu thoat (`check_for_newer_version()` +
`apply_update_jitter_and_exit()`), CHO `.bat` tai ban moi tu B2 truoc
khi thuc su vao vong lap register/heartbeat. **Day chinh la diem dang
CHO xac nhan tu B2** — chua biet ban tren B2 la gi nen chua biet worker
co "online" duoc that su hay khong sau buoc nay.

⚠️ **Chua the xac nhan hoan tat** — phu thuoc ket qua B2 (dang cho Dy).

---

## Buoc 3: Worker nhan/claim job

**Code:** `cws_worker_full.py#claim_task()` goi RPC `claim_task(p_job_id,
p_worker_id, p_worker_vram_mb)`.

**RPC (da doc + da TU TEST truc tiep tren du lieu that trong phien nay,
khong doan):**
- Uu tien task `queued` ma worker nay CHUA tung fail lan gan nhat, fallback
  sang bat ky task `queued` nao neu khong co lua chon khac.
- Cap nhat `tasks.status='active'`, `worker_id`, `claimed_at`, `last_heartbeat`.
- Cap nhat `workers.status='busy'`.
- **Da them kiem tra quarantine/drain** (migration
  `worker_migrations/008_admin_worker_actions.sql`, phien lam viec nay,
  DA TEST truc tiep qua MCP): worker dang `health_state='QUARANTINED'`
  hoac `desired_state='DRAINING'` se KHONG claim duoc task moi — tra ve
  rong, khong loi.

✅ **Da xac minh qua code + da test truc tiep tren du lieu that** (khong
phai chi doc code) — logic claim dung, khong phat hien sai lech.

---

## Buoc 4: Render

**Code:** `cws_worker_full.py#render_single_frame()` (goi Blender qua
subprocess), vong lap frame trong `worker_loop()` (checkpoint tung frame).

Bao gom them (them trong phien lam viec nay, CHUA test may that):
- `report_state(worker_id, "RENDERING", ...)` — Phase 3.
- `report_task_attempt_start()`/`report_task_attempt_ready()` — Phase 8
  (ghi timestamp billing, khong anh huong logic render).
- `prevent_windows_sleep()` — Phase 4 (ctypes Windows API).

✅ Logic loi da duoc doc/kiem tra tinh (can bang ngoac, khong con `%%`)
trong cac buoc audit truoc cua phien nay. ⚠️ CHUA chay qua Blender/Windows
that — day la 1 trong nhung diem BAT BUOC phai xac nhan tren may Worker
THAT (Dy tu lam, toi khong co quyen truy cap may vat ly).

---

## Buoc 5: Upload ket qua

**Code:** `cws_worker_full.py#upload_single_frame()` — upload tung frame
PNG len B2 ngay sau khi render xong (kien truc checkpoint-per-frame, KHONG
doi ca task xong moi upload 1 lan).

Duong dan B2 that: `renders/{internalJobId}/task_{task_id}/frame_{N}.png`
(xac nhan qua doc code `upload_single_frame()`).

✅ Logic da doc, khop voi cach `PackagingService`/`VideoAssemblyService`
(Backend) doc lai frame qua `listObjectsByPrefix('renders/{internalJobId}/')`
roi tu sap xep lai theo so frame (da audit ky o buoi truoc, xac nhan
dung). ⚠️ CHUA xac nhan upload THAT SU thanh cong tren B2 that (can may
Worker that + B2 that).

---

## Buoc 6: Verify

**Code:** `worker_loop()`, doan kiem tra sau vong lap frame:

```python
expected_count = frame_end - frame_start + 1
if len(uploaded_frames) < expected_count:
    # MOT PHAN - fail_task(), requeue phan con lai
    ...
    continue
# Du frame - moi goi complete_task()
```

Day CHINH LA buoc "Verify" trong luong toi thieu — kiem tra SO LUONG
frame da upload THAT SU khop voi so frame duoc giao, truoc khi bao
`complete_task()`. Phase 8 (phien lam viec nay) them
`report_task_attempt_stage(..., "verification_completed")` ngay tai
diem nay — CHI ghi timestamp thong ke, KHONG doi logic verify goc.

✅ Da xac minh qua code — logic verify dung, khop dinh nghia "Verify"
trong roadmap toi thieu (dem du frame truoc khi bao hoan thanh).

**RPC `complete_task()`** (da doc + hieu ro fencing token tu truoc):
kiem tra `generation` + `worker_id` + `status='active'` truoc khi cho
phep chuyen `status='done'` — chong worker cu/zombie bao hoan thanh
nham.

---

## Buoc 7: Website hien thi hoan thanh

**Code:** `SchedulerService.tick()` (Cron 10s) -> `processOrder()`:

- Khi TAT CA task cua 1 job deu `done` (`allDone`), goi `moveToReview()`:
  tao 3-5 anh preview watermark that (`PreviewService`), chuyen
  `render_orders.status` sang `REVIEW_READY`, gui notification cho khach.
- Day la diem **Website hien thi "render hoan thanh"** dung nghia toi
  thieu cua roadmap (khach thay ket qua, chua tinh buoc thanh toan/tai
  file cuoi — buoc do la 1 luong RIENG, ngoai pham vi "luong render toi
  thieu" dang audit o day).

✅ Da xac minh qua code (da doc chi tiet `scheduler.service.ts` toan bo
truoc do trong phien nay) — khong phat hien sai lech trong logic nay.

---

## Tong ket bang trang thai

| Buoc | Trang thai code | Trang thai runtime (may that) |
|---|---|---|
| 1. Website tao job | ✅ Da xac minh | ✅ Khong phu thuoc may Worker |
| 2. Worker online (register/heartbeat) | ✅ Da xac minh | ⚠️ Cho xac nhan B2 (version sync) |
| 3. Worker claim job | ✅ Da xac minh + da test truc tiep tren du lieu that | ⚠️ Cho may Worker that |
| 4. Render | ✅ Da xac minh tinh (khong chay duoc Blender o day) | ⚠️ Cho may Worker that |
| 5. Upload ket qua | ✅ Da xac minh tinh | ⚠️ Cho may Worker that |
| 6. Verify | ✅ Da xac minh | ⚠️ Cho may Worker that |
| 7. Website hien thi hoan thanh | ✅ Da xac minh | ✅ Khong phu thuoc may Worker (chi phu thuoc cac task da "done") |

**Khong phat hien sai lech MOI nao trong code cua 7 buoc tren.** Diem
nghen DUY NHAT hien tai la Buoc 2 (dong bo version qua B2) — dang cho Dy
xac nhan.

---

## Phuong an sua toi thieu DA CHUAN BI (CHUA thuc hien — cho xac nhan B2)

Tuy theo Dy bao cao gi tu B2, se roi vao 1 trong 3 kich ban:

### Kich ban A: File tren B2 la ban that 1.16.5, khac ban trong repo (1.14.0 + cac fix cua phien nay)
- Can doi chieu file 1.16.5 that voi file trong repo TRUOC KHI ghi de
  bat ky ben nao — co the co tinh nang trong 1.16.5 ma repo chua co
  (nguoc lai voi rui ro da biet: repo co nhieu fix Phase 2-8 ma 1.16.5
  co the chua co).
- **KHONG tu dong ghi de theo huong nao** cho toi khi Dy xac nhan huong
  hop nhat.

### Kich ban B: File tren B2 la ban cu/hong/khong ton tai
- Phuong an sua toi thieu: dung file hien co trong repo (1.14.0 + fix
  Phase 2-8 cua phien nay), tang `WORKER_VERSION` len 1 so ro rang
  (de xuat `1.14.1`, KHONG tu nhan la `1.16.5`), upload de len B2, cap
  nhat `worker_config.latest_version` khop dung so do.
- Van **CHUA thuc hien** buoc nao trong so nay — cho Dy xac nhan xong
  moi lam.

### Kich ban C: File tren B2 khop voi ban trong repo (da la ban da fix)
- Khong can sua gi ve version — chi con lai la van de may vat ly online
  (Buoc 2 phan "worker online" thuan tuy, khong lien quan sync).

**Trong ca 3 kich ban: KHONG doi WORKER_VERSION, KHONG upload file,
KHONG doi `worker_config.latest_version` cho toi khi Dy xac nhan.**

---

## Gioi han moi truong (nhac lai, khong doi)

- Khong co Python/Blender/may Windows that trong moi truong nay -> Buoc
  4/5/6 CHI kiem tra duoc tinh (doc code), KHONG chay duoc that.
- Khong con goi B2 API nua theo yeu cau Dy — dang cho ket qua Dy tu
  kiem tra qua B2 Web Console.

---

**Commit:** (dien sau khi tao file va commit)
**Trang thai:** ⚠️ Con viec can lam — audit code cho ca 7 buoc HOAN TAT,
khong phat hien sai lech nao trong code, nhung CHUA THE ket luan day du
vi dang cho xac nhan tu B2 (Buoc 2) va can may Worker that de xac nhan
runtime (Buoc 3-6).
