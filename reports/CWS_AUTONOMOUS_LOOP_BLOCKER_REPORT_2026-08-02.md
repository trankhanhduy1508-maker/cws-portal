# CWS Autonomous LOOP — Blocker Report (2026-08-02)

Diem dung: **B — HARD HUMAN BLOCKER**. Da hoan tat MOI task doc lap con
kha thi trong pham vi MVP; tat ca phan con lai deu phu thuoc hanh
dong/quyen/thiet bi cua Owner, khong tu lam tiep duoc.

Khong dat diem dung A (MVP Core Flow chua E2E PASS bang 1 lan chay
lien tuc that — xem `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`,
van dung nguyen).

---

## 1. Cong viec doc lap da hoan tat trong vong LOOP nay (Implementation + Tests + Evidence + Sync + Commit)

| # | Task | Commit | Evidence |
|---|---|---|---|
| 1 | Sua migration 014 (loi kieu du lieu `payment_id`), ap dung production | `3d4d709` | `reports/payments/SEPAY_WEBHOOK_PRODUCTION_VERIFICATION_2026-08-01.md` |
| 2 | Nghien cuu kien truc Windows Node Agent/Worker | `16795d9`, `2b46a64` | `reports/worker/WINDOWS_NODE_AGENT_ARCHITECTURE_RESEARCH.md` |
| 3 | SePay Test Mode/Sandbox webhook (route+guard rieng, fix response body) | `d96a98e` | `reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md` — E2E that voi giao dich Sandbox that |
| 4 | PAID → B2 Signed URL → Download audit + verify HTTP that | `b418269` | `reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md` |
| 5 | LOOP stopping-point check | `6f588a2` | `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md` |
| 6 | Source-of-Truth Sync protocol (AGENTS.md/Roadmap/DECISIONS.md chuan hoa) | `412f420` | `reports/SOURCE_OF_TRUTH_RECONCILIATION_2026-08-02.md` |
| 7 | Audit Worker `.bat`/`.py` that (khong sua code) | `1c28b17` | `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` |
| 8 | Admin Portal MFA (Supabase Auth TOTP chinh thuc, bo x-admin-key bypass) | `6d079ae` | `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` |
| 9 | Test evidence "Kiem tra quyen truy cap" Drive link (Giai doan 2) | `c4b729c` | Unit test moi, `google-drive.service.spec.ts` |

**Regression cuoi cung**: backend `npm run build` sach, `npm run test`
**117/117 PASS**. Frontend `npm run build` sach, `vitest run` 5/5 PASS.
Source of Truth (`CURRENT_STATUS.md`/`CWS_ROADMAP_MVP_V1.md`/
`DECISIONS.md`) da dong bo voi trang thai code/test/evidence that o
tren, khong con muc nao ghi sai trang thai.

---

## 2. Ly do dung — MOI viec con lai deu can Owner

### 2.1 Worker — 3 quyet dinh kien truc/van hanh + 1 hanh dong B2 dashboard

Chi tiet day du: `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`.

- **Worker khong claim job MVP chung** (hardcode danh sach `job_id`
  rieng cho cong viec cua Owner) — can Owner **quyet dinh huong**: (a)
  sua Worker sang claim tu queue chung (thay doi hanh vi dang chay
  that), hay (b) giu nguyen cho cong viec rieng + xay 1 worker MVP
  khac. Khong the tu quyet dinh vi anh huong truc tiep cong viec kinh
  doanh dang chay that tren may Fleet.
- **`--enable-autoexec` dang bat** — an toan CHI khi Owner van tu chon
  file .blend (dung hien tai). Can Owner **quyet dinh**: chap nhan rui
  ro nay khi mo cho MVP tu-phuc-vu, hay thiet ke them lop kiem duyet/
  sandbox truoc.
- **B2 key day du quyen hardcode plaintext** trong `cws_worker_full.py`
  — can Owner **tao 1 B2 Application Key moi, gioi han quyen chi trong
  prefix `renders/`** tren B2 Dashboard truoc (toi khong the tu tao key
  B2). Sau khi co key moi, toi co the sua code chuyen sang doc tu bien
  moi truong (an toan, khong can Owner lam gi them).
- **Cleanup file tam** (frame PNG/.blend cache khong bao gio bi xoa) —
  da danh gia: du la fix nho, nhung sua nhieu diem thoat trong vong lap
  chinh cua code dang chay that ma khong the tich hop-test (khong co
  Blender/Windows that trong moi truong agent) — qua rui ro de tu sua
  mu. Can Owner xac nhan truoc, hoac tu thu tren 1 may that.

Ca 4 diem deu **KHONG the tu sua an toan** — code dang chay that tren
may Fleet cua Owner, khong the test/regression trong moi truong agent.

### 2.2 Admin MFA — 1 lan xac nhan runtime that

Chi tiet: `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md`
muc 5. Code + 6 kich ban bao mat bat buoc da PASS unit test, nhung
**chua co tai khoan Admin/Host that nao ton tai** de tu quet QR
Authenticator that — day la **HUMAN_VERIFICATION_PENDING**, khong phai
loi.

**Checklist 4 buoc (dung 1 lan):**
1. Supabase Dashboard → Authentication → Users → Add user (email/password).
2. Supabase SQL Editor: `insert into public.staff_roles (user_id, role) values ('<uuid>', 'admin');`
3. Mo `/#admin` → dang nhap → quet QR bang Google/Microsoft Authenticator → nhap ma 6 so.
4. Xac nhan vao duoc Dashboard.

### 2.3 Full MVP Core Flow — can 1 trong 2

Chi tiet: `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`. Can **Owner
tu dang nhap that + chay 1 job that qua UI** (toi khong co quyen truy
cap session trinh duyet cua Owner), **HOAC** cung cap **1 may Worker
vat ly** (Windows + Python + Blender).

### 2.4 SePay Live (MB Bank that) — 4 buoc tren Dashboard

Da ghi tu 2026-08-01, van dung nguyen: (1) lien ket tai khoan MB Bank
that tren SePay (can dang nhap ngan hang online — toi khong lam duoc),
(2) tao Webhook LIVE (khac Test Mode) tren SePay, (3) set
`SEPAY_WEBHOOK_HMAC_SECRET` tren Render, (4) set
`MB_BANK_ACCOUNT_NUMBER`/`MB_BANK_ACCOUNT_NAME` tren Render.

---

## 3. CHECKLIST DUY NHAT CHO OWNER (gop tat ca thao tac con thieu)

```
[ ] 1. Admin MFA — tao 1 tai khoan staff that + quet QR 1 lan
       (Supabase Dashboard + SQL Editor, xem muc 2.2, 4 buoc)

[ ] 2. Worker — quyet dinh: sua sang claim job MVP chung,
       hay giu nguyen cho cong viec rieng + lam worker MVP khac?

[ ] 3. Worker — quyet dinh: chap nhan rui ro --enable-autoexec
       cho MVP tu-phuc-vu, hay can sandbox truoc?

[ ] 4. Worker — tao 1 B2 Application Key moi, GIOI HAN quyen
       chi trong prefix "renders/" (B2 Dashboard) — sau do
       toi tu sua code, khong can Owner lam gi them

[ ] 5. Full MVP E2E — Owner tu dang nhap that + tao 1 job qua
       UI, HOAC cung cap 1 may Windows + Python + Blender that

[ ] 6. SePay Live — lien ket MB Bank that + tao Webhook Live +
       set SEPAY_WEBHOOK_HMAC_SECRET + MB_BANK_ACCOUNT_NUMBER/
       NAME tren Render
```

Khong muc nao trong danh sach tren toi tu lam duoc — tat ca can quyen
truy cap/quyet dinh/thiet bi cua Owner. Moi phan doc lap khac trong
pham vi MVP da hoan tat, co evidence, da commit/push.

**LOOP dung tai day, cho Owner.**
