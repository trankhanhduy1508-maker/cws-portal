# CWS — SePay Test Mode / Sandbox End-to-End Payment Verification (2026-08-02)

Nhiem vu: kiem tra toan bo luong thanh toan tu dong CWS bang SePay Test
Mode/Sandbox truoc khi thuc hien bat ky giao dich MB Bank that nao.
Khong dung tin bao cao/MD cu — moi ket luan lay tu code/test/DB/tai lieu
chinh thuc that trong lan kiem tra nay (2026-08-02).

Nhan phan loai: `[VERIFIED]` / `[INFERENCE]` / `[EXPERIMENT REQUIRED]` /
`[UNKNOWN]` / `[BLOCKED]` (khong the hoan tat, can hanh dong tu Owner).

Khong chua bat ky secret/API key/HMAC secret/du lieu ngan hang that nao.

---

## 1. TOM TAT (Executive Summary)

- Audit code that (khong doan tu bao cao cu) xac nhan: endpoint, HMAC
  guard, matching (exact amount), idempotency, replay protection deu
  **dung nhu handoff da ghi**, VA da xac minh lai bang cach doc code
  moi nhat trong lan nay — xem muc 4.
- Blocker migration cu (`payment_id text` vs `payments.id uuid`) **DA
  DUOC XU LY XONG tu truoc** (trong chinh phien lam viec nay, truoc khi
  nhan yeu cau sandbox) — xac minh lai schema production 2026-08-02,
  van dung. Xem muc 5.
- Phat hien tu tai lieu SePay chinh thuc (2026-08-02) **CHUA duoc ap
  dung truoc do**: response webhook phai co body `{"success": true}`,
  khong chi HTTP 200 — **DA SUA** cho ca 2 route (Live + Test), xem
  muc 7.2.
- **DA THEM** route Test Mode rieng biet (`POST /payments/webhook/sepay/test`)
  + guard rieng (`SepayWebhookTestGuard`) + 2 bien moi truong rieng
  (`SEPAY_WEBHOOK_HMAC_SECRET_TEST`/`SEPAY_WEBHOOK_API_KEY_TEST`) — tach
  Sandbox/Live o tang route + secret, khong sua logic doi chieu/HMAC.
  Build sach, **100/100 test pass** (tang tu 96, them 4 test moi).
- **BLOCKED — can dung 1 thao tac Owner**: kiem chung "state CWS thay
  doi dung end-to-end qua HTTP that" (khong chi logic/unit test) can
  mot Sandbox webhook that gui request toi production — toi khong co
  Secret Test Mode (dung nguyen tac khong bao gio yeu cau/thay secret
  ca phien lam viec nay) nen khong tu ky duoc request that toi endpoint
  production. Xem muc 9 de biet dung 1 thao tac can Owner lam.

---

## 2. NGUYEN TAC AP DUNG (khong lap lai toan bo — xem section goc)

Tuan thu dung: audit code that truoc khi sua, khong gia dinh "da xong"
tu MD cu, khong tao kien truc payment moi (chi sua incremental), khong
giam bao mat de test-cho-qua, tach ro Sandbox/Live, khong dua secret
vao report, chi dung Sonnet 5 Medium cho phan payment/security/HMAC nay
(khong Opus/Fable).

---

## 3. TAI LIEU SEPAY CHINH THUC — DIEM ANH HUONG TRUC TIEP IMPLEMENTATION

Nguon: `developer.sepay.vn` (fetch/search truc tiep 2026-08-02).

### 3.1 Test Mode la tai khoan RIENG BIET (khong phai flag/switch)

`[VERIFIED]`: SePay Test Mode chay tren **domain rieng** `my.dev.sepay.vn`
— dang ky tai khoan rieng, **can lien he SePay de kich hoat**, moi
truong cach ly hoan toan khoi du lieu Live ("isolated sandbox... without
touching live data"). Day KHONG PHAI 1 nut bam "test mode" tren cung 1
tai khoan Live.

**Anh huong truc tiep CWS:** vi Test Mode la tai khoan/webhook config
hoan toan khac, **CWS bat buoc phai phan biet duoc 2 nguon goi vao**
(secret khac nhau it nhat) — day chinh la ly do thiet ke muc 7 duoi day
(route + secret rieng), khong the chi dua vao "toi biet day la request
test vi toi dang test" o phia CWS.

### 3.2 Webhook payload/HMAC — GIONG HET giua Test va Live

`[VERIFIED]` (developer.sepay.vn/en/sepay-webhooks/xac-thuc, fetch truc
tiep 2026-08-02): "does not differentiate HMAC-SHA256 signing behavior
between Test Mode and Live" — cung thuat toan (`HMAC-SHA256({timestamp}.
{raw_body}, secret)`), cung header (`X-SePay-Signature: sha256={hex}`,
`X-SePay-Timestamp` unix seconds), cung replay window (5 phut / 300
giay), cung yeu cau `hash_equals`/constant-time compare.

**Anh huong:** guard hien co (`SepayWebhookGuard`) **khong can sua logic
xac thuc** cho Test Mode — chi can 1 instance guard khac doc secret
khac. Da xac nhan code hien tai (`sepay-webhook.guard.ts`) khop 100%
voi mo ta nay (`±300s`, canonical string `${timestamp}.${rawBody}`,
`sha256=` prefix optional, constant-time qua `safeCompareHex`).

### 3.3 Response bat buoc — PHAT HIEN MOI, CHUA duoc ap dung truoc do

`[VERIFIED]` (developer.sepay.vn/en/sepay-webhooks/tich-hop-webhook,
fetch truc tiep 2026-08-02): "Your endpoint must return: HTTP 200/201 +
`{"success": true}` JSON body within 30 seconds for SePay to mark
delivery as successful."

**Mismatch phat hien khi audit code THAT (khong phai doan):** truoc lan
sua nay, `sepayWebhook()`/route Live chi `return
this.paymentsService.confirmViaSepayWebhook(dto)` — tra ve
`{paymentId, status, duplicate, ignored}`, **KHONG co field `success:
true`**. Neu SePay that su bat buoc dung field nay de xac nhan delivery
thanh cong, request truoc day co the bi SePay coi la "delivery that bai"
va **tu dong retry vo ich** (dung request da xu ly thanh cong that,
nhung SePay khong biet vi thieu field xac nhan). **Da sua** (muc 7.2).

### 3.4 Cong cu test cua chinh SePay

`[VERIFIED]`: dashboard SePay co nut "Send test" tren webhook da tao —
gui 1 request test truc tiep toi URL da cau hinh. Rieng, "Admins can
replay even successful logs" — SePay tu ho tro replay lai 1 delivery da
gui, **hop le voi test idempotency/duplicate cua CWS** (khac voi
malicious replay — day la provider retry hop le, dung phan biet yeu cau
o muc "E. Replay protection" cua nhiem vu goc).

### 3.5 Han muc (Han muc giao dich Test Mode)

`[UNKNOWN]`: khong tim thay 1 trang tai lieu rieng, ro rang ve gioi han
so luong/tan suat giao dich mo phong trong Test Mode qua tim kiem lan
nay. Khong anh huong thiet ke CWS (CWS khong can biet han muc nay de
xu ly webhook dung), chi anh huong Owner luc thao tac tren dashboard —
neu gap gioi han thuc te, Owner se thay thong bao truc tiep tren SePay.

---

## 4. AUDIT PAYMENT HIEN TAI (code that, doc lai 2026-08-02)

### A. Endpoint

`[VERIFIED]`: `payments.controller.ts` — `@Controller('payments')` +
`@Post('webhook/sepay')` → **van dung `/payments/webhook/sepay`** cho
Live, khop voi handoff cu — nhung **da tu kiem tra lai bang code that**,
khong mac dinh tin handoff. **Moi**: them `/payments/webhook/sepay/test`
(muc 7).

### B. HMAC

`[VERIFIED]` (doc `sepay-webhook.guard.ts`, xac nhan lai tung diem):

| Yeu cau | Code that |
|---|---|
| Thuat toan | HMAC-SHA256 (`createHmac('sha256', secret)`) |
| Raw request body | `request.rawBody` (Buffer, bat qua `main.ts` `{ rawBody: true }`), khong dung `JSON.stringify(req.body)` |
| Timestamp | Header `X-SePay-Timestamp`, don vi giay (`timestamp * 1000` khi so sanh `Date.now()`) |
| Signature header | `X-SePay-Signature`, tu dong bo tien to `sha256=` neu co |
| Canonical string | `${timestampHeader}.${rawBody}` — dung thu tu SePay yeu cau |
| Replay window | ±300000ms (5 phut) — khop chinh xac tai lieu |
| Constant-time compare | `safeCompareHex()` (tai su dung tu `device-auth.util.ts`) |
| Sai chu ky | `UnauthorizedException` — tu choi, khong xu ly |
| Timestamp het han | `UnauthorizedException` rieng, thong bao ro "chong replay" |

**Ket luan B:** khong phat hien sai lech nao voi tai lieu SePay hien tai
— **khong sua logic xac thuc**, chi tach them 1 guard doc secret khac
(muc 7).

### C. Matching

`[VERIFIED]` (doc `payments.service.ts#matchAndConfirm`, dong ~154-189):
match dua tren **payment_code + storage_code + amount CHINH XAC**
(khong dung luong provider ID/direction rieng o day — da co o buoc loc
truoc: `transferType !== 'in'` bi bo qua an toan truoc khi vao
`matchAndConfirm`).

- **Exact amount**: `record.amountVnd !== amountVnd` → tu choi. **Xac
  nhan lai**: **KHONG co dung sai (tolerance)** — ca thieu tien lan thua
  tien deu bi tu choi (strict `!==`), khop dung "handoff" da ghi
  (underpayment reject, overpayment cung reject). **Khong tu thay doi
  policy nay** (dung yeu cau — DECISIONS.md/repo khong co chi dan nao
  cho phep dung sai).
- **payment_code**: parse tu regex `CWS\s+(\S+)\s+([A-Za-z0-9]+)`, tim
  bang `findByPaymentCode` — sai ma → `NotFoundException`.
- **storage_code**: so sanh case-insensitive (`.toUpperCase()`) voi
  `record.storageCode` — sai ma → `BadRequestException` RO RANG khac
  voi loi "khong tim thay payment" (test rieng da co, dong ~395).
- **Trang thai payment**: neu da `PAID` → tra ve ngay, khong kiem tra
  lai gi (idempotent, xem muc D).

### D. Idempotency

`[VERIFIED]` 2 lop chong trung, doc code that:

1. **Lop 1 — chinh giao dich (transaction_id/id)**: `payment_notifications
   .transaction_id UNIQUE` — insert THAT BAI (constraint violation, ma
   loi Postgres `23505`) → doc lai ban ghi cu, **tra ve KET QUA CU
   NGUYEN VEN**, khong xu ly lai. Test co san dong ~226 (MBBank) va
   ~414 (SePay).
2. **Lop 2 — payment da PAID**: `matchAndConfirm` tu kiem tra
   `record.status === PaymentStatus.PAID` → tra ve ngay, **khong kiem
   tra lai storage_code/amount, khong goi `updateStatus` lan nua**. Test
   dong ~106.

**Ket luan D:** gui cung 1 SePay transaction 2 lan → lan 2 bi chan o
Lop 1 (UNIQUE constraint), khong bao gio cham toi logic set PAID lan
thu 2. **Khong co side effect kep.**

### E. Replay protection

`[VERIFIED]`: phan biet ro 2 loai duoc yeu cau —
- **Provider retry hop le** (cung `transaction_id`/`id`, SePay gui lai
  do timeout/khong nhan duoc 200 tu CWS): roi vao Lop 1 idempotency o
  muc D → tra ve ket qua cu, **KHONG loi**, HTTP 200 — dung hanh vi
  provider retry mong doi.
- **Malicious replay** (bat request cu, gui lai nguyen ven bao gom
  timestamp cu): bi chan o **guard**, TRUOC CA KHI toi logic idempotency
  — `X-SePay-Timestamp` qua 300s → `UnauthorizedException` 401, khong
  bao gio toi duoc `payment_notifications`.

**Diem tinh te da xac nhan bang code (khong doan):** neu ke tan cong bat
request va gui lai NGAY LAP TUC (trong 300s), guard van cho qua (chu ky
van dung, timestamp van trong han) — nhung se roi vao Lop 1 idempotency
(cung `id`) → tra ve ket qua cu, khong tao side effect moi. **Ca 2 lop
phoi hop dung nhu thiet ke**, khong co khoang ho.

---

## 5. DATABASE / MIGRATION — TAI XAC MINH BLOCKER CU

`[VERIFIED]` (truy van truc tiep `information_schema.columns` tren
production Supabase, 2026-08-02 — **khong dung du lieu tu report cu**):

```
payment_notifications.payment_id -> data_type: uuid
```

Blocker cu (`payment_id text` vs `payments.id uuid`, ghi trong handoff)
**da duoc xu ly va ap dung xong tu truoc** (trong chinh phien lam viec
nay, truoc khi nhan nhiem vu sandbox). Xac nhan lai lan nay: **mismatch
KHONG con ton tai**, FK `payment_notifications_payment_id_fkey` van hoat
dong. Khong can sua migration them cho blocker nay.

`payment_devices` va cac constraint/index lien quan (UNIQUE
`transaction_id`, index `payment_id`/`created_at`/`device_id`) — da
xac nhan ton tai dung trong lan verify truoc, khong doi tu do toi nay
(khong co migration moi nao duoc ap dung giua 2 lan kiem tra).

**Ket luan muc 5:** khong co hanh dong migration nao can lam them cho
sandbox test — schema hien tai da san sang.

---

## 6. TACH SANDBOX / LIVE — THIET KE DA AP DUNG

`[VERIFIED — da implement, build+test pass]`. Nguyen tac: **tach o tang
ROUTE + SECRET**, khong tach o tang logic doi chieu (vi logic do dung
chung an toan — payment_code sinh ngau nhien, xem duoi).

| | Live | Test Mode/Sandbox |
|---|---|---|
| Route | `POST /payments/webhook/sepay` | `POST /payments/webhook/sepay/test` (moi) |
| Guard | `SepayWebhookGuard` | `SepayWebhookTestGuard` (moi) |
| Env var HMAC | `SEPAY_WEBHOOK_HMAC_SECRET` | `SEPAY_WEBHOOK_HMAC_SECRET_TEST` (moi) |
| Env var API Key | `SEPAY_WEBHOOK_API_KEY` | `SEPAY_WEBHOOK_API_KEY_TEST` (moi) |
| Logic doi chieu | `PaymentsService.confirmViaSepayWebhook` | **Tai su dung y nguyen** (khong tao ham/bang rieng) |

**Vi sao tai su dung `matchAndConfirm`/bang `payments` chung la AN
TOAN** (phan tich ro rang, khong ne tranh rui ro): CWS chi co **1**
Supabase project (xac nhan qua `list_projects` — khong co project test
rieng). "State thay doi end-to-end that" theo dung yeu cau nhiem vu bat
buoc phai la 1 payment THAT trong DUY NHAT database nay, khong the gia
lap o noi khac. Rui ro "Sandbox webhook vo tinh xu ly nhu Live payment
khong kiem soat" **duoc chan o tang xac thuc** (secret Test khac hoan
toan secret Live — da co test rieng chung minh dieu nay, xem
`sepay-webhook-test.guard.spec.ts`, case "CACH LY SANDBOX/LIVE"), **khong
phai o tang du lieu** — 1 giao dich gia lap Test Mode CHI co the xac
thuc thanh cong qua route Test (secret rieng), roi moi cham toi
`payments` table dung nhu 1 giao dich that se lam — day chinh la muc
tieu "kiem tra state CWS thay doi dung end-to-end", khong phai gia lap
rieng 1 bang khac.

**Rui ro con lai (da ghi ro, khong ne tranh):** neu Owner vo tinh dung
**cung 1 gia tri secret** cho ca Live va Test Mode (thay vi sinh 2 chuoi
ngau nhien khac nhau), co che tach nay mat tac dung. Day la ly do
`.env.example` da ghi ro rang **BAT BUOC dung secret khac hoan toan**
(muc 7.1).

**Khong con thieu configuration nao khac de tach Sandbox/Live** — day
la thay doi toi thieu can thiet (2 bien moi, 1 guard moi ~15 dong logic
thuc (con lai tai su dung ham chung), 1 route moi), khong tao kien truc
payment song song.

---

## 7. WEBHOOK SANDBOX — DA IMPLEMENT

### 7.1 Thay doi code (build sach, 100/100 test pass)

- `backend/src/common/guards/sepay-webhook.guard.ts`: tach `verifySepayHmacSignature()`/
  `verifySepayApiKey()` thanh function dung chung (tranh copy-paste sang guard moi).
- `backend/src/common/guards/sepay-webhook-test.guard.ts` **(moi)**: `SepayWebhookTestGuard`,
  doc `sepayWebhookHmacSecretTest`/`sepayWebhookApiKeyTest`, fail-closed giong het guard Live.
- `backend/src/common/guards/sepay-webhook-test.guard.spec.ts` **(moi)**: 4 test, gom 1 test
  "CACH LY SANDBOX/LIVE" chung minh secret Live khong xac thuc duoc vao guard Test.
- `backend/src/config/configuration.ts`: them `sepayWebhookApiKeyTest`/`sepayWebhookHmacSecretTest`.
- `backend/src/payments/payments.controller.ts`: them route `POST /payments/webhook/sepay/test`
  (dung `SepayWebhookTestGuard`, goi lai `confirmViaSepayWebhook` khong doi); **sua ca 2 route**
  (Live + Test) tra ve `{ success: true, ...result }` thay vi chi `result` (muc 3.3).
- `backend/.env.example`: them `SEPAY_WEBHOOK_HMAC_SECRET_TEST`/`SEPAY_WEBHOOK_API_KEY_TEST`
  voi comment ro rang BAT BUOC khac gia tri Live.

**Khong sua**: `PaymentsService.confirmViaSepayWebhook`, `matchAndConfirm`, `SepayWebhookDto`,
logic HMAC/replay/idempotency hien co — dung nguyen tac "sua toi thieu can thiet, khong giam
bao mat, khong tao kien truc song song".

### 7.2 Response body — sua cho CA 2 route (Live + Test)

`[VERIFIED tu tai lieu, DA SUA trong code]`: ca `sepayWebhook()` va
`sepayWebhookTest()` gio tra ve `{ success: true, paymentId, status,
duplicate, ignored }` thay vi thieu `success`. **Day la thay doi anh
huong Live** (route Live cung duoc sua) — khong DUNG lai hoi truoc vi:
(a) chi THEM field, khong doi/xoa field nao dang dung, (b) khong dong
den logic HMAC/matching/idempotency, (c) muc dich la SUA MOT LOI TUONG
THICH THAT voi tai lieu SePay chinh thuc (khong phai thay doi kien truc/
bao mat), dung tinh than "sửa tối thiểu cần thiết" da neu trong yeu
cau muc B. Van bao cao ro rang o day de Owner biet.

### 7.3 Cau hinh Owner can lam tren SePay Dashboard (Test Mode)

Toi **khong the tu thuc hien** buoc nay (can dang nhap `my.dev.sepay.vn`,
tai khoan/lien he kich hoat rieng cua Owner). Dung 1 thao tac can lam —
xem muc 9.

---

## 8. TEST MATRIX

Nguon bang chung: unit test hien co (mocked repository — chung minh
LOGIC dung) + doc code truc tiep (chung minh HANH VI dung khi tich hop
that). **Chua co bang chung tu 1 request HTTP that toi production**
(BLOCKED, muc 9) — ghi ro trong cot Evidence, khong nhan PASS cho phan
chua kiem chung duoc that.

| # | Test case | Ket qua | Evidence |
|---|---|---|---|
| 1 | Giao dich hop le, dung payment_code + storage_code + amount → PAID | **PASS (logic)** | `payments.service.spec.ts:93` |
| 2 | transferType != 'in' (giao dich tien ra) → bo qua an toan, khong throw | **PASS (logic)** | `payments.service.spec.ts:361` |
| 3 | Wrong payment code — amount dung nhung code sai → KHONG gan nham customer/job | **PASS (logic)** | `payments.service.spec.ts:384` (`NotFoundException`, khong set PAID payment nao) |
| 4 | Wrong storage_code (payment_code dung) → tu choi rieng, khac loi voi #3 | **PASS (logic)** | `payments.service.spec.ts:395` |
| 5 | Underpayment (thieu tien) → tu choi | **PASS (logic)** | `payments.service.spec.ts:84` (strict `!==`, ap dung ca 2 chieu) |
| 6 | Overpayment (thua tien) → tu choi | **PASS (logic)** | Cung dong 84 — `!==` khong phan biet chieu lech |
| 7 | Sai chu ky HMAC (secret sai/body bi sua) → 401, khong xu ly | **PASS (logic)** | `sepay-webhook.guard.spec.ts` case "TU CHOI khi chu ky sai" |
| 8 | Timestamp het han (>300s) → 401, chong replay | **PASS (logic)** | `sepay-webhook.guard.spec.ts` case "CHONG REPLAY" |
| 9 | Duplicate transaction_id/id gui 2 lan → khong xu ly lai, tra ket qua cu | **PASS (logic)** | `payments.service.spec.ts:414` |
| 10 | Provider retry hop le (cung id, trong replay window) ≠ malicious replay (timestamp cu, ngoai window) | **PASS (logic, phan tich rieng)** | Muc 4.E — 2 co che khac lop xu ly khac nhau |
| 11 | Payment da PAID, nhan lai event → khong rollback, khong sai trang thai, idempotent | **PASS (logic)** | `payments.service.spec.ts:106` |
| 12 | Webhook hop le nhung persistence (DB write) that bai | **INFERENCE, khong PASS/FAIL thuc nghiem** | Xem phan tich duoi |
| 13 | Cach ly Sandbox/Live — secret Live khong xac thuc duoc vao route Test | **PASS (logic, moi them)** | `sepay-webhook-test.guard.spec.ts` case "CACH LY SANDBOX/LIVE" |
| 14 | State CWS thay doi dung END-TO-END qua 1 request HTTP that (khong mock) | **BLOCKED** | Can Sandbox webhook that — muc 9 |

**Phan tich rieng TEST 12 (khong gia lap thuc nghiem — ly do: gia lap
loi DB that can can thiep vao ket noi Supabase production, rui ro khong
tuong xung voi loi ich cua 1 test):** doc code `payments.repository.ts
#insertNotificationProcessing` — neu insert that bai vi ly do KHAC
UNIQUE violation (vd mat ket noi DB), ham **throw `Error` truc tiep**,
khong bi bat trong try/catch cua `confirmViaSepayWebhook` (try/catch chi
bao boc TU SAU khi insert thanh cong). Loi nay se lam request tra ve
HTTP loi (khong phai 200 + `success:true`) → theo tai lieu SePay (muc
3.4), SePay se **coi delivery that bai va tu dong retry** — day la hanh
vi DUNG MONG DOI (khong mat giao dich, se duoc xu ly lai khi DB phuc
hoi), VA khi retry thanh cong, idempotency (Lop 1, transaction_id UNIQUE)
van dam bao khong xu ly trung neu ban ghi truoc do da vo tinh duoc ghi
mot phan. **Danh gia: thiet ke hop ly, nhung chua duoc CHUNG MINH bang
thuc nghiem — ghi UNKNOWN cho phan "da kiem chung thuc te", INFERENCE
cho phan "thiet ke dung".**

---

## 9. BLOCKER — DUNG 1 THAO TAC CAN OWNER

Toi khong the tu tao 1 giao dich gia lap SePay Sandbox (can tai khoan
`my.dev.sepay.vn` cua Owner, va tuyet doi khong duoc yeu cau/thay secret
theo dung nguyen tac ca phien lam viec nay). Code phia CWS **da san
sang** (build+test pass, da push — xem muc 11).

**Dung 1 thao tac, theo dung thu tu:**

1. Neu chua co, dang ky + lien he SePay de kich hoat tai khoan Test Mode
   tai `my.dev.sepay.vn` (tach biet hoan toan tai khoan Live dang dung).
2. Tren dashboard Test Mode, tao 1 Webhook moi:
   - URL: `https://cws-portal.onrender.com/payments/webhook/sepay/test`
     (**luu y co `/test` o cuoi — KHAC URL Live**).
   - Security: HMAC-SHA256 — de SePay **tu sinh** 1 Secret Key MOI
     (KHONG dung lai secret Live dang co).
3. Vao Render → service `cws-portal` → Environment → them bien moi:
   ten **chinh xac** `SEPAY_WEBHOOK_HMAC_SECRET_TEST`, dan gia tri Secret
   Key vua sinh o buoc 2 (khong gui cho toi, toi khong can biet gia
   tri). Save → doi redeploy xong.
4. Tren dashboard Test Mode, dung tinh nang **"Send test"** tren webhook
   vua tao (hoac mo phong 1 giao dich qua "Mo phong tao ma VietQR"/
   "Mo phong giao dich" trong Test Mode) — **CHUA can co 1 payment that
   trong CWS truoc**, chi can xac nhan CWS tra ve HTTP 200 + `{"success":
   true}`.
5. Bao lai cho toi khi xong buoc 4 — toi se kiem tra Supabase
   (`payment_notifications`) de xac nhan request da toi noi va duoc xu
   ly dung (co the la "rejected" voi ly do ro rang neu payment_code gia
   lap khong khop payment nao that — day la KET QUA DUNG MONG DOI cho
   1 request test khong gan voi job nao, khong phai loi).

**Sau khi buoc 4-5 xac nhan pipeline hoat dong**, neu muon kiem tra
TOAN BO chuoi "unlock output that" (TEST 14, hien BLOCKED), can them:
tao 1 job/payment test that qua flow binh thuong cua CWS (Upload → Render
→ Preview → duyet → tao payment那), lay dung `payment_code`/`storage_code`
that sinh ra, roi dung Test Mode SePay mo phong dung 1 giao dich voi noi
dung chuyen khoan khop chinh xac ma do — **day la buoc rieng, sau khi
buoc 1-5 o tren da xac nhan pipeline co ban hoat dong**, chua thuc hien
trong lan nay.

**Chua thuc hien giao dich MB Bank that. Chua sua/xoa webhook Live.
Chua dung secret Live trong test.**

---

## 10. ROLLBACK

Neu can go bo thay doi cua lan nay: `git revert` 1 commit duy nhat (xem
muc 11) — hoan toan doc lap voi code Live (route/guard/secret moi, chi
them field `success:true` la thay doi chung 2 route). Khong co migration
DB nao trong lan nay (schema da dung tu truoc, muc 5), nen rollback
khong can dong den database.

---

## 11. TRANG THAI CUOI

- Build: sach.
- Test: **100/100 pass** (96 cu + 4 moi cho `SepayWebhookTestGuard`).
- Da commit + push len GitHub — xem commit hash o cuoi phan hoi chinh
  (ngoai file nay, theo dung yeu cau khong dua secret/chi tiet nhay cam
  vao report nhung commit hash khong phai secret).
- **CHUA chuyen sang giao dich MB Bank that** — dung dung Muc 9, cho
  Owner hoan tat 1 thao tac tren SePay Dashboard + Render.
