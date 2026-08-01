# SePay Webhook — Kiem tra production readiness (2026-08-01)

Bao cao ket qua tu kiem tra implementation + production truoc khi kich hoat
SePay Webhook that cho CWS MVP. Theo quyet dinh chinh thuc trong
`DECISIONS.md` (Webhook-only, uu tien HMAC-SHA256) va
`reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md`.

Khong chua bat ky secret/API key/HMAC secret/du lieu ngan hang that nao.

## 1. URL webhook production

```
https://cws-portal.onrender.com/payments/webhook/sepay
```

Xac nhan tu code: `backend/src/payments/payments.controller.ts` —
`@Controller('payments')` + `@Post('webhook/sepay')`. Da curl truc tiep
production, nhan HTTP 401 (dung hanh vi ky vong: route ton tai that, guard
tu choi request khong co chu ky hop le).

## 2. Co che xac thuc HMAC-SHA256

File: `backend/src/common/guards/sepay-webhook.guard.ts`.

| Yeu cau (tai lieu chinh thuc SePay) | Implementation |
|---|---|
| Secret doc tu environment variable, khong hard-code | `SEPAY_WEBHOOK_HMAC_SECRET` qua `ConfigService` (`configuration.ts`), khong co gia tri cung trong source |
| Ky chuoi `{timestamp}.{raw_body}` bang HMAC-SHA256 | `createHmac('sha256', secret).update(\`${timestamp}.${rawBody}\`).digest('hex')` |
| Chu ky gui qua header `X-SePay-Signature` (dang `sha256={hex}`) | Doc header, tu dong bo tiep dau `sha256=` neu co |
| Timestamp gui qua header `X-SePay-Timestamp` (unix seconds) | Doc header, kiem tra lech ±300 giay so voi gio Backend — chong replay |
| Dung dung byte goc request de ky (khong dung JSON da parse lai) | Dung `request.rawBody` (Buffer), bat qua `main.ts` voi `{ rawBody: true }` |
| So sanh chu ky an toan (chong timing attack) | `safeCompareHex()` (constant-time), tai su dung tu `device-auth.util.ts` |
| Khong log secret | Xac nhan: khong co `console.log`/`Logger` nao trong file guard, khong in gia tri secret/signature |
| Fail-closed khi chua cau hinh | Neu ca `SEPAY_WEBHOOK_HMAC_SECRET` va `SEPAY_WEBHOOK_API_KEY` deu trong -> tu choi moi request (401) |

Ket luan: implementation dung 100% theo co che HMAC-SHA256 chinh thuc cua
SePay. Khong sua code trong buoc kiem tra nay.

## 3. Environment variable tren Render

Ten bien **chinh xac** phai dien Secret Key HMAC vao:

```
SEPAY_WEBHOOK_HMAC_SECRET
```

(Khac voi `SEPAY_WEBHOOK_API_KEY` — day la bien fallback cho phuong an API
Key tinh, khong dung khi da chon HMAC-SHA256.)

## 4. Cap nhat 2026-08-01 (sau khi sua): migration 014/015 da ap dung thanh cong

**Nguyen nhan (da xac dinh o ban dau):** file migration
`backend/migrations/014_payment_notifications.sql` viet cot `payment_id`
kieu `text`, trong khi `public.payments.id` tren production la kieu
`uuid` — FK khong the tao duoc do lech kieu du lieu.

**Kiem tra tuong thich truoc khi sua** (khong doan, doc truc tiep code):
tat ca gia tri `paymentId` trong code (`payments.service.ts`,
`payments.repository.ts`) deu la UUID that, sinh boi `randomUUID()` khi
tao payment va lay lai tu `payments.id`. Khong co dong code nao ghi gia
tri khac-UUID vao cot nay — doi kieu `text` → `uuid` khong phat sinh
incompatibility.

**Da sua:** `backend/migrations/014_payment_notifications.sql` — cot
`payment_id` doi tu `text` sang `uuid`. Khong doi logic HMAC/guard.

**Da ap dung len production qua Supabase migration** (tracked):
- `20260801161807_014_payment_notifications`
- `20260801161815_015_payment_devices`

**Verify schema thuc te sau khi ap dung** (`list_tables`, xac nhan truc
tiep, khong doan):
- `public.payment_notifications` ton tai, `payment_id` kieu **uuid**, FK
  `payment_notifications_payment_id_fkey` → `payments.id` thanh cong.
- `device_id` kieu text, FK `payment_notifications_device_id_fkey` →
  `payment_devices.device_id` thanh cong.
- `public.payment_devices` ton tai, PK `device_id`, RLS enabled.
- Ca hai bang: `rows: 0` (chua co du lieu that — dung nhu ky vong, chua
  co giao dich nao duoc xu ly).

**Test/build sau khi sua + ap dung migration:** `npm run build` sach,
`npm run test` — 96/96 pass (khong test nao lien quan schema bi anh
huong, vi test dung Supabase client da mock).

### Con lai: xac nhan production da nhan Secret Key HMAC hay chua

Owner dang tu nhap Secret Key that vao Render (khong gui qua chat/report,
dung theo yeu cau). Can curl lai production sau khi Owner xac nhan da
luu bien `SEPAY_WEBHOOK_HMAC_SECRET` + redeploy xong, de kiem tra guard
khong con tra ve loi "chua duoc cau hinh".

## 5. Checklist tong hop production readiness

| Hang muc | Trang thai |
|---|---|
| Endpoint webhook ton tai dung URL | PASS |
| Logic guard HMAC-SHA256 (code) | PASS |
| Secret da luu dung ten bien tren Render | Owner tu thao tac, cho xac nhan lai qua curl |
| Bang `payment_notifications`/`payment_devices` tren production | **PASS** — da ap dung migration 014 (sua kieu du lieu) + 015 thanh cong, verify schema that khop |
| Test/build local | PASS (96/96 test, build sach) |

**Chua duoc tao giao dich that / test tren SePay cho toi khi Owner xac
nhan Render da nhan Secret Key va curl production khong con bao "chua
duoc cau hinh".**
