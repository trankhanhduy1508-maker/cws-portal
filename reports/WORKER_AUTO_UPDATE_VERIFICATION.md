# Bao Cao Xac Minh Co Che Auto-Update Worker (2026-07-31)

## Trang thai tong quan: ⚠️ Con viec can lam (chua xac minh duoc du lieu tu B2)

Muc tieu: xac minh 100% trang thai thuc te cua co che auto-update Worker,
doi chieu 3 nguon (Repository / Backblaze B2 / Supabase worker_config),
khong doan, chi ket luan dua tren bang chung that.

---

## 1. Xac minh tung nguon

### 1.1 Repository (GitHub / working tree that)

- `WORKER_VERSION = "1.14.0"` trong `cws_worker_full.py` (dong 200) —
  ✅ Da xac minh, doc truc tiep file.
- `cws_worker.bat` tai file cap nhat tu 1 key CO DINH tren B2:
  bucket `MTEB90`, key `worker-releases/cws_worker_full.py` (dong 66-69,
  179-181) — ✅ Da xac minh, doc truc tiep file.
- `worker_config.download_url` (doc tu Supabase) duoc gan vao bien
  `DOWNLOAD_URL` (dong 145) nhung **KHONG con xuat hien o bat ky dau nao
  khac** trong toan bo file `.bat` sau do — ✅ Da xac minh (grep toan bo
  file, khong tim thay tham chieu lai).

### 1.2 Supabase (bang `worker_config`)

Doc truc tiep qua Supabase MCP (`execute_sql`):

```
component: worker_full_py
latest_version: 1.16.5
download_url: https://MTEB90.s3.us-west-004.backblazeb2.com/worker-releases/cws_worker_full.py
updated_at: 2026-07-28 01:25:41.423151+00
```

✅ Da xac minh truc tiep tren du lieu that.

### 1.3 Backblaze B2 (file that tai key `worker-releases/cws_worker_full.py`)

⚠️ **CHUA XAC MINH DUOC.** Moi truong lam viec nay khong co cong cu B2
API duoc cau hinh san. Toi da de xuat tu goi truc tiep B2 API
(`b2_authorize_account`) bang credential co san trong `cws_worker.bat`
qua PowerShell de lay du lieu that (ten file/kich thuoc/thoi diem sua
cuoi) — **ban da tu choi buoc nay**, toi da dung lai ngay, KHONG thu lai
duoi bat ky hinh thuc nao khac.

Ket qua: khong biet duoc noi dung/phien ban that su dang nam tai key do
tren B2 vao luc nay.

---

## 2. Bang so sanh 3 nguon

| Nguon | Version | File/Key | Trang thai |
|---|---|---|---|
| Repository (GitHub, working tree) | `1.14.0` | `cws_worker_full.py` (goc repo) | ✅ Da xac minh |
| Supabase `worker_config.latest_version` | `1.16.5` | (chi la 1 gia tri text, khong phai file) | ✅ Da xac minh |
| Backblaze B2 (`MTEB90` / `worker-releases/cws_worker_full.py`) | **Khong ro** | **Khong ro** | ⚠️ Chua du du lieu |

=> **Khong the ket luan** 3 nguon co khop nhau hay khong, vi thieu du
lieu nguon (3) — moi so sanh chi dung lai o muc "Repo != Supabase ve con
so version", chua biet B2 dang o dau trong buc tranh do.

---

## 3. Kiem tra toan bo luong auto-update (tung buoc, dua tren doc code)

| Buoc | Trang thai | Ghi chu |
|---|---|---|
| `worker_config.latest_version` ton tai, co gia tri | ✅ Da xac minh | `1.16.5`, cap nhat `2026-07-28` |
| `.bat` doc `download_url` tu Supabase | ✅ Da xac minh | Dong 145 |
| `download_url` duoc **su dung** de tai file | ❌ SAI (khong dung) | Bien `DOWNLOAD_URL` khong xuat hien lai o dau khac trong `.bat` — doc xong roi bo, hoan toan khong anh huong toi viec tai file that |
| `.bat` xin quyen truy cap B2 (`b2_authorize_account`) | ✅ Da xac minh qua doc code | Dong 159-163, dung `B2_KEY_ID`/`B2_APP_KEY` hardcode san trong `.bat` |
| `.bat` tai file that tu B2 THANH CONG | ⚠️ Chua xac minh duoc ket qua that | Co code hop le (dong 179-181), nhung chua chay/kiem tra duoc buoc nay tren du lieu that (xem muc 1.3) |
| Ghi de file `.py` cu bang file moi tai duoc | ✅ Da xac minh qua doc code | Dong 183-186: neu ton tai `cws_worker_full.py.new` thi `move /y` de len file cu, ghi lai `VERSION_FILE` |
| Restart Python sau buoc update | ✅ Da xac minh qua doc code | Dong 191-199: luon chay `python.exe cws_worker_full.py` (file moi hoac cu neu tai that bai), khong bao gio dung han tai day |
| Worker online tro lai tren Supabase | ⚠️ Phu thuoc may vat ly, ngoai pham vi code | Khong lien quan auto-update — can may THAT duoc bat/ket noi mang (xem bao cao truoc do trong phien lam viec, phan "Nguyen nhan Worker offline") |

---

## 4. Sai lech phat hien (CHUA sua, chi bao cao dung yeu cau)

**Sai o dau:** Cot `worker_config.download_url` (tren Supabase) hoan
toan khong co tac dung thuc te trong luong auto-update.

**Vi sao sai:** `.bat` **tu** xin `authorizationToken` rieng qua
`b2_authorize_account()` (vi bucket dang o che do PRIVATE, can xac thuc
truoc khi tai), roi tu ghep URL tai file bang
`%B2_DOWNLOAD_URL%/file/%B2_BUCKET_NAME%/%B2_FILE_NAME%` — trong do
`B2_DOWNLOAD_URL` la gia tri **B2 tra ve** luc xin quyen (khac hoan toan
bien `DOWNLOAD_URL` doc tu Supabase), con `B2_BUCKET_NAME`/`B2_FILE_NAME`
la 2 hang so **hardcode san** trong chinh file `.bat` (`MTEB90` /
`worker-releases/cws_worker_full.py`). Ca hai deu khong lien quan gi
den cot `download_url` cua Supabase.

**Hau qua:** Hien tai KHONG gay loi chuc nang nao (vi `.bat` van tai
dung file that qua duong khac, doc lap voi cot nay). Nhung neu sau nay
co ai sua cot `download_url` voi ky vong "doi noi Worker tai file ve",
thao tac do se **hoan toan vo tac dung**, de gay hieu nham nghiem trong
ve sau (tuong da doi duong dan nhung thuc ra Worker van tai dung cho cu).

**Cach sua toi thieu (DE XUAT — CHUA thuc hien):**
- Phuong an (a): Xoa cot `download_url` khoi bang `worker_config` neu
  khong con y dinh su dung, tranh du lieu "ma" gay hieu nham.
- Phuong an (b): Sua `.bat` de **THAT SU** dung gia tri `download_url`
  thay vi 2 hang so hardcode — can quyet dinh xem co con muon linh hoat
  doi vi tri file tren B2 ma khong can sua `.bat` hay khong.

Day la quyet dinh thiet ke, **khong tu thuc hien** khi chua duoc yeu cau
ro rang.

---

## 5. Ket luan cuoi cung

- ⚠️ **CHUA DU BANG CHUNG** de xac nhan file tren B2
  (`worker-releases/cws_worker_full.py`, bucket `MTEB90`) hien dang la
  phien ban gi, hay `.bat` co tai duoc thanh cong tren may that hay
  khong — day la khoang trong duy nhat con lai trong toan bo chuoi xac
  minh.
- Dung theo yeu cau "khong thay doi bat ky du lieu production nao neu
  chua xac minh day du" — **CHUA thuc hien** buoc cap nhat
  `WORKER_VERSION`/upload B2/cap nhat `worker_config.latest_version`.

## Buoc tiep theo can quyet dinh cua Dy

Vi moi truong nay khong the tu kiem tra B2 (da bi tu choi buoc goi API
truc tiep, khong thu lai duoi hinh thuc nao khac), can 1 trong 2 huong:

1. Dy tu kiem tra B2 web console (bucket `MTEB90` >
   `worker-releases/cws_worker_full.py` > xem ngay sua cuoi/kich thuoc/
   tai ve mo xem `WORKER_VERSION`), roi bao lai ket qua; hoac
2. Dy cho phep goi B2 API o muc **CHI DOC** (list/get file info, khong
   ghi/xoa/sua gi) de tu kiem tra.

---

**Commit:** (dien sau khi tao file nay va commit)
**Trang thai:** ⚠️ Con viec can lam — chua the ket luan day du vi thieu
du lieu tu Backblaze B2.
