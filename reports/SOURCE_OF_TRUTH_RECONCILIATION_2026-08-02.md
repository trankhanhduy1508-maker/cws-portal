# Source-of-Truth Reconciliation (2026-08-02)

Nhiem vu: nang cap co che Source of Truth de LOOP/agent sau khong lam
lai task cu hoac trien khai thiet ke da bi thay the. Chi sua docs/co
che quan ly trang thai — **khong sua code**, **khong tiep tuc roadmap**
trong task nay.

---

## 1. Thay doi da thuc hien

| File | Thay doi |
|---|---|
| `AGENTS.md` | Them muc "SOURCE-OF-TRUTH SYNC": dinh nghia DONE = Implementation+Tests+Evidence+Source-of-Truth Sync+Commit; bang nhan chuan Roadmap (TODO/IN_PROGRESS/NEEDS_VERIFICATION/DONE/BLOCKED/SUPERSEDED); chuan CURRENT_STATUS.md (entry point ngan); chuan DECISIONS.md (ACTIVE/SUPERSEDED); thu tu bat buoc dau LOOP; quy tac reconciliation |
| `CWS_ROADMAP_MVP_V1.md` | Gan nhan trang thai cho tung hang muc trong ca 7 Giai doan, dua tren bang chung that hien co (khong doan) |
| `DECISIONS.md` | Gan `[ACTIVE]`/`[SUPERSEDED]` cho tung quyet dinh; danh dau ro Facebook Login la SUPERSEDED (thay the boi Google OAuth 2026-08-01); them 1 quyet dinh moi ACTIVE ve tach Sandbox/Live SePay (da co code/evidence tu 2026-08-02 nhung chua tung duoc ghi vao DECISIONS.md) |
| `CURRENT_STATUS.md` | Rut gon tu 144 dong lich su xuong dinh dang entry-point ngan (Current Phase/Last Verified/Current Task/Next/Last Updated), tro toi report chi tiet thay vi lap lai noi dung |
| `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md` | **Moi** — luu nguyen ven noi dung cu cua `CURRENT_STATUS.md` truoc khi rut gon, khong mat bang chung lich su |
| `reports/SOURCE_OF_TRUTH_RECONCILIATION_2026-08-02.md` | File nay |

---

## 2. Reconciliation — phat hien cu the

### 2.1 DONE nhung chua du evidence runtime that (ha xuong NEEDS_VERIFICATION)

- **Giai doan 3 (Render)** va **Giai doan 4 (Preview)**: `CURRENT_STATUS.md`
  cu liet ke Worker "✅ Heartbeat/Register/Upload/Download/Claim Job"
  nhung dong ngay duoi lai ghi "⬜ Runtime Test (BLOCKED — no physical
  Worker machine)". Day la **mau thuan noi bo trong chinh file cu**: cac
  dau ✅ o tren chi la CODE-VERIFIED (unit test voi mock), khong phai
  RUNTIME-VERIFIED voi Worker vat ly that. Da tach ro 2 muc do trong
  Roadmap moi: giu DONE o cap "Worker Manager" (code), nhung ha xuong
  **NEEDS_VERIFICATION** rieng cho toan bo Giai doan 3/4 (Render/Preview
  runtime that).
- **Giai doan 2 — "Tao Job"**: co unit test + 1 lan E2E qua **mock
  backend** (Playwright, 2026-08-01), nhung **chua co job nao duoc tao
  qua UI that boi khach da dang nhap that**. Ha xuong NEEDS_VERIFICATION,
  khop voi phat hien da ghi trong `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`.
- **Giai doan 2 — "Kiem tra quyen truy cap" / "Huong dan sua quyen"**:
  khong tim thay evidence rieng (log/test) xac nhan UX bao loi quyen
  Google Drive hoat dong dung voi 1 link that bi chan quyen. Danh dau
  NEEDS_VERIFICATION thay vi gia dinh DONE chi vi code co ton tai.

### 2.2 Blocker da duoc giai quyet (docs cu chua cap nhat kip)

- **Migration `payment_notifications`/`payment_devices` chua ton tai
  tren production** — RESOLVED 2026-08-01/02 (sua loi kieu du lieu
  `payment_id`, ap dung xong, xac nhan schema). Da ghi trong
  `CURRENT_STATUS.md` cu (dong 75) nhung **chua duoc phan anh vao
  Roadmap** — Roadmap moi da cap nhat Giai doan 1 muc Database = DONE
  voi trich dan report cu the.
- **Backend chua ket noi production tu Portal** — RESOLVED 2026-08-01
  (`VITE_CWS_API_BASE_URL` cau hinh xong tren Vercel). Da phan anh dung
  trong Roadmap moi (Giai doan 1, Frontend/Backend = DONE).
- **SePay HMAC secret chua duoc cau hinh tren Render** — RESOLVED
  2026-08-02 (Owner cau hinh xong, verify qua Sandbox that). Roadmap cu
  (truoc lan sua nay) van con ghi kieu "chua verify" chung chung — da
  tach ro trong Roadmap moi: Sandbox = DONE, Live = con
  NEEDS_VERIFICATION (khac nhau ro rang, khong con gop chung).

### 2.3 Thiet ke/quyet dinh cu da bi thay the (SUPERSEDED)

- **Facebook Login** — SUPERSEDED boi Google OAuth (2026-08-01). Da
  danh dau ro trong `DECISIONS.md`. Khong duoc implement lai.
- **SePay IPN** — KHONG phai "thiet ke cu bi thay the" theo dung nghia
  (chua bao gio implement, chi la 1 phuong an da nghien cuu va CHU DONG
  tu choi). Van giu nguyen trang thai quyet dinh trong DECISIONS.md
  ("Webhook-only... KHONG trien khai IPN"), khong gan nhan SUPERSEDED
  vi khong co gi de "thay the" — day la 1 quyet dinh kien truc ACTIVE
  tu dau, khong phai supersession.
- **`POST /payments/webhook` (generic, `WebhookSecretGuard`)** — KIEM
  TRA KY: day KHONG phai thiet ke cu bi SePay thay the. Code + comment
  trong `.env.example` xac nhan day la co che **giu lai co chu y** cho
  "gateway trung gian tu viet/tuy chinh header" (khac SePay). Van
  `[ACTIVE]` nhu 1 duong du phong tong quat, khong SUPERSEDED — tranh
  gan nham nhan se dan toi hieu lam la co the xoa route nay.

### 2.4 Docs mau thuan / task trung lap

- `CURRENT_STATUS.md` cu (muc "Next Task" cuoi file, cap nhat lan cuoi
  2026-08-01) **trung lap va da cu hon** so voi
  `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md` (tao 2026-08-02, chi
  tiet hon, evidence moi hon). Da reconcile: `CURRENT_STATUS.md` moi
  KHONG con tu liet ke lai danh sach Next Task chi tiet, chi **tro toi**
  report 2026-08-02 la nguon duy nhat cho phan nay — xoa bo trung lap.
- Khong phat hien 2 quyet dinh nao trong `DECISIONS.md` cung o trang
  thai ACTIVE ma mau thuan truc tiep voi nhau sau khi ra soat toan bo
  file.

### 2.5 Milestone gan day tu code/evidence (khong tin prompt, tu xac dinh tu repo — theo yeu cau muc 8)

Xac nhan truc tiep tu git log + code + DB (khong doan):

- `d96a98e` — SePay Test Mode/Sandbox route + guard + fix response body `{"success":true}`.
- `b418269` — Audit + verify PAID → B2 Signed URL → Download bang HTTP that toi production.
- `6f588a2` — Ghi nhan LOOP chua dat diem dung E2E day du.

Ca 2 milestone quan trong nhat gan day (**SePay Sandbox payment** va
**secure final-output delivery**) deu co evidence that (HTTP response
that, DB query truc tiep, khong phai suy doan tu prompt) — da phan anh
day du vao Roadmap + DECISIONS + CURRENT_STATUS moi.

---

## 3. Nhung gi KHONG lam trong task nay (dung pham vi)

- Khong sua code nao (chi sua 5 file docs/report liet ke o muc 1).
- Khong tiep tuc Roadmap (khong lam Giai doan 3/Render, khong dong Giai
  doan 2).
- Khong bat dau Task 1 (Audit Worker `.bat`/`.py`) hay Task 2 (Admin
  MFA/TOTP) da duoc Owner nhac toi trong cung tin nhan — theo dung yeu
  cau "Owner xac nhan roi moi tiep tuc LOOP phat trien CWS", 2 task nay
  **CHUA bat dau**, dang cho xac nhan.

---

## 4. Trang thai protocol Source of Truth

**ACTIVE.** Tu lan LOOP tiep theo, thu tu bat buoc la:
`CURRENT_STATUS.md` → `CWS_ROADMAP_MVP_V1.md` → `DECISIONS.md` →
code/tests/evidence lien quan → xac dinh Next Task — dung theo dung quy
tac vua them vao `AGENTS.md`.
