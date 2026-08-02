# MVP Core Flow E2E — Trang thai kiem tra diem dung LOOP (2026-08-02)

Kiem tra dieu kien dung LOOP: toan bo chuoi

```
Login -> Upload -> Queue -> Worker -> Render -> Preview -> Approve
-> Payment -> PAID -> Final Output -> B2 Signed URL -> Download
```

phai duoc chung minh E2E PASS bang bang chung THAT (khong doan), la
**1 lan chay lien tuc**, khong phai ghep tu cac doan/fixture rieng le.

**Ket luan: CHUA DAT DIEM DUNG.** LOOP tiep tuc, cho Owner thao tac.

---

## 1. Tung doan da co bang chung that — nhung KHONG lien ket thanh 1 chuoi

| Doan | Trang thai | Bang chung |
|---|---|---|
| Login | **✅ That** | Owner da dang nhap Google that tren production, verify truc tiep qua `auth.users`/`customer_profiles` (2026-08-01) |
| Upload -> Queue -> Worker -> Render -> Preview -> Approve | **⬜ CHUA BAO GIO chay voi backend that** | Chi co 1 lan chay E2E qua **mock backend** (Playwright, 2026-08-01) — khong cham backend/database/Worker that |
| Payment -> PAID | **✅ That (Sandbox)** | `reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md` — nhung gan voi **payment fixture** insert truc tiep, khong gan voi job nao da thuc su qua Upload/Render/Preview/Approve |
| PAID -> Final Output -> B2 Signed URL -> Download | **✅ That (co che dung)** | `reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md` — nhung cung qua **render_orders fixture** insert truc tiep, khong phai output tu 1 lan Render that |

**Van de cot loi:** cac doan "✅ That" o tren deu duoc kiem chung **doc lap voi nhau**, dung du lieu fixture tu tao rieng cho tung doan. Chua co bang chung nao cho thay **1 job DUY NHAT** di het tu Login → Upload → ... → Download ma khong bi ngat quang o giua bang du lieu gia lap.

## 2. Nguyen nhan CHUA lien ket duoc thanh 1 chuoi that (2 blocker that, khong phai gia dinh)

### 2.1 Khong co may Worker vat ly

`[VERIFIED tu CURRENT_STATUS.md, xac nhan lai khong doi]`: moi truong hien tai **khong co Windows + Python + Blender** de chay `cws_worker.bat` that. Nghia la doan **Queue → Worker → Render** khong the tu xay ra — khong ai claim job, khong ai render frame that, khong co Preview that duoc sinh ra.

### 2.2 Khong co quyen truy cap phien dang nhap that cua Owner

De tao 1 job THAT (khac fixture), can dang nhap Google that + upload/chon file that qua UI Portal. Toi khong co quyen truy cap trinh duyet/session da dang nhap cua Owner — day la gioi han ky thuat that (khong phai lua chon), phu hop dung "Thieu tai khoan/quyen truy cap" trong AGENTS.md Blocker Policy.

**Ca 2 blocker deu KHONG the tu giai quyet duoc boi AI agent** — can dung 1 trong 2 hanh dong cua Owner (muc 4).

## 3. Ra soat lai toan bo roadmap — khong con hang muc nao khac trong pham vi MVP Core Flow

Doc lai `CWS_ROADMAP_MVP_V1.md` Giai doan 1-6 (Nen tang, Luong khach
hang, Render, Preview, Thanh toan, Ban giao) — moi hang muc code-level
da duoc audit/verify trong cac phien lam viec truoc (Google Login,
SePay webhook, B2 signed URL, migration schema...). Khong tim thay hang
muc nao con lai trong pham vi nay ma AI agent co the tu lam them ma
khong quay ve dung 2 blocker o muc 2.

Giai doan 7 (Trang quan tri) **khong thuoc pham vi "MVP Core Flow"**
duoc yeu cau chung minh dung — khong tu mo rong sang do.

## 4. Can Owner (1 trong 2, hoac ca 2)

1. **Tu dang nhap that** tren `https://cws-portal.vercel.app`, upload/
   paste 1 Drive link nho, di het qua UI (chon Render Profile, cho
   render, duyet Preview, thanh toan qua SePay) — se verify tung buoc
   truc tiep qua database ngay khi Owner lam, cung cach da verify Login.
2. **Hoac** cung cap 1 may Worker vat ly (Windows + Python + Blender,
   chay duoc `cws_worker.bat`) de Render that co the xay ra doc lap voi
   viec Owner co ranh thao tac UI hay khong.

## 5. Ket luan

LOOP **chua dung** — theo dung yeu cau "Neu chua dat diem dung, tiep
tuc LOOP theo roadmap", nhung khong con hang muc nao trong pham vi MVP
Core Flow ma AI agent tu lam them duoc luc nay. Cho Owner quyet dinh
huong o muc 4 truoc khi tiep tuc.

Khong chay regression cuoi / khong tao "MVP Core E2E Completion Report"
o buoc nay — dieu kien do chi ap dung KHI dat diem dung, ma bao cao nay
xac nhan **chua dat**.
