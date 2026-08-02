# CWS Worker — Audit san sang chay that (2026-08-02)

Task 1 (Owner uy quyen 2026-08-02). Chi audit — **khong sua code Worker**
trong lan nay (ly do: xem muc 5). Khong gia lap da test tren may Windows
+ Blender that — moi truong agent khong co thiet bi nay.

---

## 0. Xac nhan file that (SEARCH repo, khong tao file moi)

```
./cws_worker.bat        (206 dong, doc toan bo)
./cws_worker_full.py    (3009 dong, doc toan bo)
```

Xac nhan qua `find` toan repo — **khong co ban sao/phien ban nao khac**
o duong dan khac. Day la 2 file duy nhat, dung nhu handoff.

---

## 1. Checklist day du — tung hang muc

| Hang muc | Ket qua | Bang chung |
|---|---|---|
| Startup `.bat` | **PASS** | Tu tai Python Embeddable portable neu chua co, vong lap supervisor (check update -> chay -> cooldown 15s -> lap lai), khong can quyen Admin |
| Python entrypoint | **PASS** | `if __name__ == "__main__": worker_loop()`, dong 2989-3009 |
| Dependencies | **PASS** | Tu cai `requests`/`boto3`/`Pillow` qua pip ngay khi chay (dong 25-48) — khong can setup tay |
| Environment variables | **PASS** | `CWS_DIR`, `CWS_ENABLE_INTEGRATED_VIDEO_MERGE`, `CWS_ENABLE_LEGACY_VIDEO_MERGE_FALLBACK`, `CWS_FFMPEG_PATH` — deu doc qua `os.environ` co fallback hop ly |
| Supabase/API connection | **PASS** | REST + RPC qua `SUPABASE_URL`/publishable key (dung 100% cong khai theo thiet ke Supabase, khong phai bi mat) |
| Worker registration/heartbeat | **PASS** | `register_worker()` 1 lan luc boot, `worker_ping()` dinh ky, `heartbeat_loop()` thread rieng khi co task, ty le 60s/240s duoc phan tich ky (dong 141-169, co ca lich su 1 loi that da xay ra va cach sua) |
| Claim job | **PASS logic, nhung CO VAN DE THIET KE quan trong — xem muc 2.1** | `claim_task(job_id, worker_id, vram)` — atomic qua RPC Postgres |
| Tranh 2 Worker claim cung job | **PASS, thiet ke tot** | Fencing token qua `generation` — moi RPC (`report_heartbeat`/`complete_task`/`fail_task`) deu gui kem, RPC tu choi neu generation cu; worker tu `os._exit(1)` ngay khi phat hien bi giao cho worker khac (dong 982-998) |
| Download input | **PASS** | Google Drive, co xu ly rieng file >100MB (virus-scan warning page, lay `uuid` tu form HTML, dong 287-323) |
| Storage/path handling Windows | **PASS** | `pathlib.Path`, `BASE_DIR` doc tu `CWS_DIR` (khong hardcode o dia), worker_id luu tren o ben vung (khong bi BootROM reset) — xem muc 2.2 |
| Blender CLI invocation | **PASS logic, CO VAN DE BAO MAT — xem muc 2.3** | `-b -o -F PNG -s -e -a --enable-autoexec`, dung thu tu, dung tham so |
| Render profile/settings | **PASS** | `optimization_code` qua `--python-expr`, sinh tu phan tich scene, GPU texture fix TAT mac dinh (thu nghiem, chua benchmark) |
| Timeout/error handling | **PASS, co danh doi da duoc Dy xac nhan** | `render_frame_range` co timeout 3600s; `render_single_frame` (ham THUC TE dang dung trong vong lap chinh) **KHONG co timeout** — day la quyet dinh CHU DICH cua Dy (dong 358-367, "chap nhan danh doi... neu 1 frame treo, worker se dung yen VINH VIEN, can Dy tu phat hien"), khong phai thieu sot |
| Progress/status update | **PASS** | `report_state()`, `report_task_attempt_*()`, `log_task_event()`, `report_render_speed()` -> Dynamic Chunk Size |
| Preview generation | **KHONG thuoc file nay** | Worker chi upload frame PNG tho len B2 (`renders/{job}/task_{id}/`) — sinh Preview watermark la trach nhiem Backend/Scheduler (`packaging.service.ts`, da audit rieng trong task truoc), khong phai thieu sot cua Worker |
| Final output | **PASS mot phan** | Worker co video merge tich hop (feature-flag `CWS_ENABLE_INTEGRATED_VIDEO_MERGE`, mac dinh TAT — `.bat` cu `cws_auto_ghep_video.bat` la fallback mac dinh BAT); dong goi ZIP/final khac (khach tai) la Backend (`packaging.service.ts`, da audit rieng) |
| Upload B2 | **PASS** | Checkpoint tung frame ngay sau render (khong doi ca task), dung path convention `renders/{job_id}/task_{task_id}/{file}` |
| Retry/recovery | **PASS, thiet ke tot** | Incremental Recovery: `get_existing_frames_on_b2()` + `validate_existing_frame_on_b2()` truoc khi render lai — task bi requeue giua chung khong mat cong da lam |
| Cleanup file tam | **GAP that — xem muc 2.4** | Chi `shutil.rmtree` cho thu muc tam luc merge video (dong 1410); thu muc `output_task_{id}` (frame PNG) va `.blend` cache trong `WORK_DIR` **khong bao gio duoc xoa** |
| Log | **PASS** | `print()` chi tiet + `log_task_event()` (ghi Supabase) + `report_incident()` (su co co cau truc) |
| Graceful failure | **PASS** | Top-level `try/except` bat MOI loi khong luong truoc, bao `report_worker_crash()` (Admin xem duoc tu xa qua `workers.last_crash_message`) truoc khi `sys.exit(1)` |
| Job state transitions | **PASS** | `report_state()` (BOOTING/IDLE_WAITING_JOB/PREPARING/RENDERING/COOLDOWN) + `report_task_attempt_stage()` (render_completed/upload_completed/verification_completed/merge_completed) |
| Security/secrets | **CRITICAL — xem muc 2.5** | B2 key day du quyen hardcode plaintext trong file phan phoi rong |
| Kha nang restart sau loi | **PASS** | `.bat` supervisor: bat ky lan `python.exe` thoat (crash/update/bi requeue) deu tu cho 15s roi chay lai |
| Database schema lien quan | **PASS, xac nhan that** | Truy van truc tiep production Supabase (`information_schema.routines`): **tat ca** RPC Worker goi (`claim_task`, `complete_task`, `fail_task`, `register_worker`, `report_heartbeat`, `worker_ping`, `report_worker_state_transition`, `report_render_speed`, `requeue_stale_tasks`) **deu ton tai that**. `claim_task` xuat hien 2 lan trong ket qua truy van — co the la 2 overload (chua dieu tra sau, khong anh huong ket luan Worker goi dung) |
| Authentication/authorization | **PASS o muc CWS_DIR/Supabase key** | Supabase key la publishable (thiet ke de public), khong phai rui ro |

---

## 2. Cac phat hien quan trong (theo do nghiem trong giam dan)

### 2.1 [QUAN TRONG NHAT] Worker HIEN TAI khong claim job MVP chung — bi gioi han vao 1 danh sach job_id cu the, hardcode san

Doc truc tiep `worker_loop()` (dong 2653-2705): Worker **KHONG BAO GIO**
poll "bat ky job nao dang `queued`" trong he thong. No chi lap qua
**`JOB_IDS_MULTI`** — 1 danh sach cung (hien tai:
`["CWS-JOB4-PHONG5", ..., "CWS-JOB4-PHONG10"]`, dong 127-130), la cac
job **Dy (Owner) tu tay cau hinh** cho 1 khach hang cu the (comment
dong 108-129 xac nhan day la du an rieng "PhongNguRender5-10").

**He qua:** ban `cws_worker_full.py` dang duoc COMMIT trong repo hien
tai **KHONG the tu phuc vu 1 job MVP bat ky duoc khach tao qua Portal**
(Upload -> tao job that qua `POST /jobs`) — no chi claim duoc dung 6 job
id cu the da hardcode san. Neu 1 khach hang that tao job qua UI MVP
ngay bay gio, Worker nay se **khong bao gio nhin thay/claim** job do,
vi job_id that (dang UUID/text sinh dong) khong nam trong danh sach
cung nay.

**Day khong phai bug — la 1 cong cu batch-render rieng cho cong viec
kinh doanh hien tai cua Owner**, dang tai su dung ha tang Worker Fleet
(bang `workers`, RPC `claim_task`...) nhung theo mo hinh "Owner tu chi
dinh job cho Fleet render", KHAC voi mo hinh MVP roadmap "khach tu tao
job qua Portal, Worker tu nhat bat ky job nao dang cho". **Day chinh la
1 phan quan trong ly do Giai doan 3 (Render) trong Roadmap dang o trang
thai NEEDS_VERIFICATION** — khong chi "chua co may vat ly", ma con la
"code hien tai, du co may vat ly, cung se khong tu claim job MVP that".

**Khong tu sua** (thay doi hardcode list -> generic queue-polling la
thay doi thiet ke lon, anh huong truc tiep cong viec kinh doanh THAT
Owner dang chay tren cac may that voi danh sach nay — can Owner xac
nhan truoc, khong phai "sua loi don gian").

### 2.2 Node identity qua BootROM reset — XAC NHAN DUNG (giai dap 1 EXPERIMENT REQUIRED tu bao cao kien truc truoc)

`get_worker_id()` (dong 731-746): sinh **1 lan duy nhat**, luu vao
`BASE_DIR / "cws_worker_id.txt"` — `BASE_DIR` doc tu `CWS_DIR` (o dia
KHONG bi BootROM reset, comment dong 732-736 xac nhan ro chu dich).
**Day tra loi dung "Van de CRITICAL #2" (BootROM + duplicate machine
identity) trong `reports/worker/WINDOWS_NODE_AGENT_ARCHITECTURE_RESEARCH.md`**
— truoc day danh dau `[EXPERIMENT REQUIRED]` vi chua doc code, nay xac
nhan **`[VERIFIED]`**: worker_id THAT SU song sot qua reset, khong bi
sinh lai/trung lap khi clone hang loat, MIEN LA thu muc `cws_worker_id.txt`
khong nam trong chinh golden image duoc clone (van con 1 gia dinh chua
kiem chung: neu Owner clone ca thu muc `CWS_Render` da co san file
`cws_worker_id.txt` vao golden image dung cho NHIEU may, cac may do se
TRUNG worker_id — day la rui ro quy trinh trien khai, khong phai loi
code).

### 2.3 `--enable-autoexec` — xac nhan dung "Van de CRITICAL #3" tu bao cao kien truc truoc, MUC DO RUI RO PHU THUOC HOAN TOAN VAO NGUON FILE .BLEND

Dong 376 (`render_single_frame`) va dong 453 (`render_frame_range`):
Blender duoc goi voi co `--enable-autoexec`, **CHU DONG BAT** thuc thi
Python script/Driver nhung trong file `.blend`. Comment dong 453-460 tu
giai thich ly do: "worker CHI render file .blend do Dy xac dinh qua
link Google Drive cu the, khong phai file bat ky ai tu do upload chay."

**Day la ly do co dinh nay AN TOAN cho cach dung HIEN TAI** (khop voi
phat hien 2.1: Worker chi render job Dy tu chon, khong phai job khach
tu upload). **NHUNG neu Worker nay duoc dung nguyen ban cho MVP** (khach
tu upload file .blend qua Portal, dung nhu Roadmap Giai doan 2 mo ta),
co nay se cho phep **THUC THI CODE TUY Y** tu file .blend cua BAT KY
khach nao — day chinh la "Van de CRITICAL #3" trong bao cao kien truc
truoc, gio co bang chung code cu the: co nay **DANG BAT**, va **AN TOAN
HAY KHONG hoan toan phu thuoc nguon file dau vao co con la "Dy tu chon"
hay da chuyen sang "khach tu upload"**.

**Khong tu sua** (tat `--enable-autoexec` co the pha vo render THAT cua
Owner dang chay — nhieu file hien tai dua vao Driver Python, theo dung
comment code. Day la quyet dinh kien truc can Owner xac nhan: hoac (a)
giu autoexec BAT nhung CHI khi nguon file van la "Dy tu chon" (khong
dung cho MVP tu-phuc-vu ma khong co lop kiem duyet/sandbox rieng), hoac
(b) thiet ke lai luong MVP de khong can autoexec/co sandbox rieng truoc
khi mo cho khach tu upload dai tra).

### 2.4 Khong cleanup file tam (frame PNG + .blend cache) — gap that, rui ro thap o quy mo hien tai

Grep toan file: `shutil.rmtree` **CHI xuat hien 1 lan** (dong 1410, don
dep thu muc tam luc ghep video). Thu muc `WORK_DIR/output_task_{id}`
(frame PNG da render — dong 2780) va file `.blend` da tai ve `WORK_DIR`
(dong 328, **chu dong cache vinh vien theo thiet ke**) **khong bao gio
bi xoa** sau khi task/job hoan thanh.

**Rui ro thuc te:** o quy mo hien tai (Owner tu quan ly vai chuc may),
rui ro thap. O quy mo muc tieu dai han ("hang tram may quan net"), thu
muc tam co the tich luy qua nhieu thang, chiem day o dia ben vung (dac
biet may quan net thuong co dung luong o dia han che).

**Khong tu sua trong lan nay** — ly do o muc 5 (khong the test/regression
code Worker trong moi truong nay). Day xuat hien nhu 1 de xuat can Owner
xac nhan truoc khi ap dung.

### 2.5 [BAO MAT] B2 key day du quyen hardcode plaintext trong file phan phoi

Dong 75-76:
```python
B2_KEY_ID = "00483fb516ab3b10000000001"
B2_APP_KEY = "K004my930oX1OkA4WyDWy1o4vhWCPcw"
```

Dung cho **MOI thao tac B2** (`get_b2_client()`, dong 620-639) — upload
frame render, doc frame de kiem tra Incremental Recovery, tai file cho
merge video. **Day la key rong quyen** (khac han key rieng, CHI Read-Only,
GIOI HAN prefix `worker-releases/` ma `cws_worker.bat` dung de tu-cap-nhat
— da xac nhan trong nghien cuu kien truc truoc). Key nay hardcode
**plaintext** trong 1 file Python duoc **phan phoi toi moi may Worker**
(qua co che tu-cap-nhat cua chinh `.bat`, tai truc tiep tu B2 bucket
`worker-releases/cws_worker_full.py`) — bat ky ai co quyen doc file tren
1 may Worker (vd nguoi dung quan net khac, neu may khong khoa dung) deu
doc duoc key nay bang Notepad, va CO THE doc/ghi/xoa **toan bo du lieu
khach hang** tren B2 (khong gioi han prefix).

Day la finding bao mat nghiem trong nhat trong audit nay. **Khong tu
sua** (thay key hien tai bang key gioi han quyen hon la thay doi anh
huong TOAN BO Fleet dang chay that — can Owner: (a) tao 1 B2 Application
Key MOI, gioi han quyen READ+WRITE CHI trong prefix `renders/`
(khong can quyen tren `worker-releases/`, `uploads/`, hay bat ky prefix
nao khac), (b) thay the 2 hang so nay bang doc tu environment variable
(giong cach `CWS_DIR` da lam), (c) phan phoi key moi qua co che an toan
hon plaintext-trong-source — day la 1 task rieng can lam ky, ngoai pham
vi "chi audit" cua Task 1).

---

## 3. Ket luan tong the: Worker co san sang chay tren Windows+Python+Blender that khong?

**CO, cho DUNG use-case hien tai** (Owner tu chi dinh danh sach job cu
the, tu quan ly file .blend nguon, chay tren cac may Fleet da biet) —
code duoc viet ky luong, nhieu lop bao ve (fencing token, incremental
recovery, checkpoint per-frame, graceful crash, auto-update an toan),
co lich su sua loi that ro rang (khong phai code chua tung chay).

**CHUA san sang cho MVP tu-phuc-vu** (khach tu tao job qua Portal, Worker
tu nhat job bat ky) **do 2 ly do cu the (muc 2.1 + 2.3)**, khong phai
"chua test tren may that" don thuan:
1. Worker khong claim duoc job MVP that (hardcode danh sach job_id rieng).
2. `--enable-autoexec` chi an toan khi nguon file van do Owner kiem soat
   thu cong — chua co co che nao khac (sandbox/kiem duyet) cho truong
   hop khach tu upload dai tra.

---

## 4. Doi chieu RPC/Database — xac nhan that (khong doan)

Truy van truc tiep `information_schema.routines` tren production
Supabase: **9/9 ten RPC Worker su dung deu ton tai that** trong
database (`claim_task`, `complete_task`, `fail_task`, `register_worker`,
`report_heartbeat`, `worker_ping`, `report_worker_state_transition`,
`report_render_speed`, `requeue_stale_tasks`). Khong phat hien RPC nao
Worker goi ma khong ton tai o phia Database.

---

## 5. Vi sao khong sua code Worker trong task nay

Theo dung yeu cau "Audit -> test -> chi sua neu co evidence loi ->
regression -> cap nhat Source of Truth -> commit/push": **buoc "test"
va "regression" khong the thuc hien duoc trong moi truong agent nay**
(khong co Windows + Python + Blender that). File `cws_worker_full.py`
**dang chay THAT tren nhieu may Worker that cua Owner ngay luc nay**
(khac voi backend/frontend — sua backend chi can `git push` + Render/
Vercel tu deploy; sua Worker can Owner tu phan phoi lai va khong the
verify khong pha vo cong viec dang render that). Vi vay: **moi phat
hien o muc 2 deu la de xuat can Owner xac nhan, khong tu ap dung**, du
1 vai trong so do (2.4 - cleanup) co ve la fix "an toan" — van khong du
dieu kien "test + regression" theo dung yeu cau.

---

## 6. Source-of-Truth Sync

- `CWS_ROADMAP_MVP_V1.md` Giai doan 3 (Render): giu nguyen
  `NEEDS_VERIFICATION`, bo sung ly do cu the tu audit nay (khong chi
  "chua co may that" ma con "code hardcode job list rieng").
- Khong doi trang thai nao khac sang DONE — audit nay KHONG tao evidence
  runtime moi (khong chay Worker that), chi xac nhan CHAT LUONG code +
  tinh dung dan cua thiet ke qua doc truc tiep + doi chieu database that.
