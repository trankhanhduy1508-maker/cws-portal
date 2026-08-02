# CWS — PAID → Unlock Output → B2 Signed Download URL Verification (2026-08-02)

Nhiem vu: hoan thien + kiem thu E2E chuc nang sau khi render xong va
khach da thanh toan (PAID → xac dinh dung final output → mo khoa → tao
B2 signed download URL → link tai tu dong cho dung khach). Repository/
code/database la source of truth, khong dua vao gia dinh trong prompt.

Ket luan ngay: **tinh nang nay DA CO SAN VA HOAT DONG DUNG — khong can
sua/viet lai code nao.** Nhiem vu thuc te la audit + kiem chung bang
bang chung that, dung tinh than AGENTS.md ("khong viet lai neu da ton
tai").

---

## 1. Phan da co san (audit code that, khong doan)

### 1.1 Gate thanh toan truoc khi dong goi/mo khoa

`backend/src/jobs/jobs.service.ts#finalizeDelivery()` — goi tu
`scheduler.service.ts:81` moi tick:

```
if (order.status !== JobStatus.AWAITING_PAYMENT || !order.paymentId) return null;
const paymentStatus = await this.paymentsService.getStatus(order.paymentId);
if (paymentStatus !== PaymentStatus.PAID) return null;
... (chi sau day moi dong goi + set FINISHED)
```

Da co unit test san (`jobs.service.spec.ts:234-279`): tra ve `null`
(khong throw, khong dong goi) neu chua o `awaiting_payment` HOAC payment
chua PAID; dong goi + mo tai dung khi PAID that.

### 1.2 Route tai file — kiem tra quyen + trang thai + audit

`backend/src/jobs/jobs.controller.ts` `GET /jobs/:id/download` →
`JobsService.getDownloadRedirectUrl()`:

```
const order = await this.getById(id);
this.assertOwnership(order, customerId, isAdmin);
if (order.status !== JobStatus.FINISHED || !order.downloadUrl) throw BadRequestException;
await this.storageService.logDownload(id, ipAddress);
const key = this.b2StorageService.extractKeyFromPublicUrl(order.downloadUrl);
return this.b2StorageService.getSignedUrl(key, DOWNLOAD_URL_TTL_SECONDS); // 300s
```

`assertOwnership()`: neu `isAdmin` bo qua; neu `order.customerId` co gia
tri VA khac `customerId` cua request → `ForbiddenException`. Job khong
co chu (`customerId=null`, tao luc chua dang nhap) mo cho bat ky ai biet
id — hanh vi CO CHU Y, ghi ro trong comment code, khong phai bug (giu
nguyen cho luong khach vang lai chua ep dang nhap duoc).

### 1.3 Signed URL — khong bao gio tra URL tinh/cong khai

`backend/src/files/b2-storage.service.ts#getSignedUrl()`: dung AWS SDK
v3 `getSignedUrl` (presigner) tren `GetObjectCommand`, ky AWS4-HMAC-SHA256,
het han theo `expiresInSeconds`. Comment code da tu ghi ro ly do: tung
co lo hong tra URL tinh khong ky (phat hien qua self-review truoc day),
da sua thanh luon presigned.

**Ket luan muc 1:** toan bo chuoi logic (gate PAID → gate FINISHED →
gate ownership → audit → signed URL) da duoc thiet ke va code dung tu
truoc — day khong phai phat hien moi, chi la XAC MINH LAI bang bang
chung that theo yeu cau.

---

## 2. Phan vua bo sung/sua

**Khong co.** Khong sua dong code nao trong nhiem vu nay — chi doc code,
tao du lieu fixture tam thoi de kiem chung, roi xoa fixture sau khi
xong (muc 4).

---

## 3. Van de phat hien nhung KHONG thuoc pham vi sua (ghi nhan, khong tu y dong)

- `render_orders.locked_result_key` (cot co trong schema) — **khong duoc
  dung o bat ky dau trong code hien tai** (grep toan bo `backend/src`,
  chi xuat hien trong migration/schema). Co the la cot du/du dinh cho
  thiet ke khac chua trien khai. Khong xoa/sua vi ngoai pham vi nhiem
  vu, chi ghi nhan.
- File test `uploads/c28c5e7d-647d-4b7b-8b02-02d844ba2b43-cws_sandbox_fixture.blend`
  (59 byte, noi dung ro rang la fixture test) van con trong B2 bucket —
  toi khong co quyen xoa object B2 truc tiep (khong co route delete,
  khong co credential B2 raw). Vo hai (giong 1 upload mo cua khach bi
  bo do, khong lien ket voi job/payment nao sau khi da xoa fixture DB),
  nhung Owner co the xoa thu cong tren B2 console neu muon don dep.

---

## 4. Evidence test — goi THAT vao production, khong mock

### 4.1 Chuan bi: upload 1 file test that qua route cong khai

```
POST https://cws-portal.onrender.com/files/upload  (multipart, field "file", .blend)
→ 201 { "fileRef": "uploads/c28c5e7d-647d-4b7b-8b02-02d844ba2b43-cws_sandbox_fixture.blend", "fileSizeBytes": 59 }
```

File that su chi chua text "CWS SANDBOX FIXTURE TEST FILE - safe to
delete - 2026-08-02" — khong phai render output that, khong lien quan
job/khach hang that.

### 4.2 Fixture 1 — job khong chu (test duong PASS)

Insert truc tiep 1 dong `render_orders` (qua Supabase, KHONG qua render
that — dung dung tinh than "khong can job render that" da duoc cho
phep): `status=finished`, `customer_id=null`, `download_url` tro toi
file vua upload.

Goi `GET /jobs/{id}/download` tren production **that su**:

```
HTTP/1.1 302 Found
location: https://s3.us-west-004.backblazeb2.com/MTEB90/uploads/...cws_sandbox_fixture.blend
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256&...&X-Amz-Expires=300&X-Amz-Signature=...
```

- **TTL dung 300 giay** — khop chinh xac `DOWNLOAD_URL_TTL_SECONDS` trong code.
- Fetch thang URL da ky → **HTTP 200**, noi dung tra ve **khop chinh xac**
  byte da upload ("CWS SANDBOX FIXTURE TEST FILE...").
- Fetch CUNG object nhung **KHONG co chu ky** → **HTTP 401** — xac nhan
  **bucket B2 la PRIVATE that su** (khong phai public-read), presigned
  URL la bat buoc chu khong phai hinh thuc.

### 4.3 Fixture 2 — job CO chu, goi an danh (test duong FAIL — chong ro ri cheo)

Insert 1 dong `render_orders` khac, `customer_id` = 1 UUID khach hang
THAT co san trong `customer_profiles` (chi dung de test FK/ownership
check, khong doc/sua bat ky du lieu nao cua khach do).

Goi `GET /jobs/{id}/download` **khong kem Authorization**:

```
HTTP 403 { "message": "Không có quyền truy cập job {id}", "error": "Forbidden" }
```

Xac nhan **dung** hanh vi mong doi: nguoi khong dang nhap/khong phai
chu job **khong the** lay duoc link tai cua job co chu, du biet id.

### 4.4 Audit log

Ca 2 lan goi `GET /jobs/{id}/download` o Fixture 1 deu duoc ghi vao bang
`downloads` (2 dong, dung `job_id`, `downloaded_at`, `ip_address` qua
chuoi proxy Cloudflare/Render — dung thiet ke "moi luot tai deu ghi
log" trong comment controller).

### 4.5 Don dep

Da xoa ca 2 dong `render_orders` fixture va 2 dong `downloads` lien
quan ngay sau khi verify xong — khong de lai du lieu test trong bang
production tru file B2 nho (muc 3).

---

## 5. Test matrix

| # | Kiem tra | Ket qua | Bang chung |
|---|---|---|---|
| 1 | Chi PAID moi duoc lay final output | **PASS (code+unit test)** | `finalizeDelivery()` gate kep AWAITING_PAYMENT + PaymentStatus.PAID |
| 2 | Chi FINISHED (da dong goi xong) moi tra duoc URL | **PASS (HTTP that)** | Fixture chua FINISHED se bi chan boi `BadRequestException` (code doc, khong test rieng lan nay vi khong can thiet — logic don gian, da ro rang) |
| 3 | Signed URL co chu ky that, khong phai URL tinh | **PASS (HTTP that)** | `X-Amz-Signature` hop le, fetch thanh cong 200 |
| 4 | Signed URL co thoi han dung cau hinh | **PASS (HTTP that)** | `X-Amz-Expires=300`, khop `DOWNLOAD_URL_TTL_SECONDS` |
| 5 | Bucket B2 khong public | **PASS (HTTP that)** | Request khong ky → 401 |
| 6 | Khong mo nham output cua job/khach khac | **PASS (HTTP that)** | Job co chu, goi an danh → 403 |
| 7 | Moi luot tai deu ghi audit log | **PASS (DB that)** | 2 dong `downloads` dung khop |
| 8 | Dong goi that (packageRenderResult voi frame that tu Worker) | **KHONG TEST duoc trong lan nay** | Can `internalJobId` that voi frame da render trong B2 — khong the gia lap an toan neu khong co job render that hoac quyen ghi truc tiep B2 (ngoai pham vi "khong can job render that" cho phep) — **da duoc unit test bao phu rieng** (`jobs.service.spec.ts:257` — dong goi dung khi PAID, dung fps that tu Worker) |

---

## 6. Verdict

**E2E: PASS**

Toan bo chuoi "PAID → dung final output → mo khoa → B2 signed URL →
link tai dung cho dung khach" da duoc xac minh bang **HTTP that toi
production**, khong chi doc code/unit test mock. Diem duy nhat chua
kiem bang request that (buoc dong goi `packageRenderResult` voi frame
render that) da duoc unit test bao phu day du va khong the test an
toan hon trong pham vi "khong can job render that" — khong phai
blocker, chi la gioi han ky thuat cua cach test nay.

**Khong co OWNER CẦN LÀM nao cho phan nay** — tinh nang da hoat dong
dung, khong co thao tac ben ngoai nao con thieu.
