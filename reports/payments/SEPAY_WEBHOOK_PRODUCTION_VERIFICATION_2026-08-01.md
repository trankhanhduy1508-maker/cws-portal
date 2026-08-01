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

## 4. Blocker con lai — CHUA duoc giai quyet

### 4.1 Migration 014/015 chua ap dung duoc len production

Khi thu ap dung migration 014 (`payment_notifications`) len production
Supabase, nhan loi:

```
ERROR 42804: foreign key constraint "payment_notifications_payment_id_fkey"
cannot be implemented
DETAIL: Key columns "payment_id" and "id" are of incompatible types:
text and uuid.
```

Nguyen nhan xac minh truc tiep tu schema production (`list_tables`): bang
`public.payments.id` la kieu **uuid**, nhung file migration
`backend/migrations/014_payment_notifications.sql` viet cot `payment_id`
la kieu **text**. Day la loi co san trong file migration (chua tung chay
duoc tren production tu truoc).

De xuat sua (dang cho Owner xac nhan): doi `payment_id text references
public.payments(id)` thanh `payment_id uuid references public.payments(id)`.

**Anh huong:** bang `payment_notifications` (dung de audit + chong
trung/replay cho ca SePay Webhook va MBBank Notification Listener) hien
**chua ton tai** tren production. Neu HMAC auth pass ma bang nay chua co,
code se loi 500 khi ghi audit log — vi vay khong duoc test giao dich that
cho toi khi migration nay duoc ap dung xong.

### 4.2 Xac nhan production da nhan secret HMAC hay chua

Tai thoi diem viet bao cao nay, Owner dang tu nhap Secret Key that vao
Render (khong gui qua chat/report). Can curl lai production sau khi Owner
xac nhan da luu bien + redeploy xong de kiem tra guard khong con tra ve
loi "chua duoc cau hinh".

## 5. Checklist tong hop production readiness

| Hang muc | Trang thai |
|---|---|
| Endpoint webhook ton tai dung URL | PASS |
| Logic guard HMAC-SHA256 (code) | PASS |
| Secret da luu dung ten bien tren Render | Owner tu thao tac, chua xac nhan lai |
| Bang `payment_notifications`/`payment_devices` tren production | FAIL — migration loi kieu du lieu, dang cho huong sua |
| Test/build local | PASS (96/96 test, build sach) |

**Chua duoc tao giao dich that / test tren SePay cho toi khi ca 5 hang muc
tren deu PASS.**
