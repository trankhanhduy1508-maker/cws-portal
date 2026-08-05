# CWS Backend — Setup Guide

## Kiến trúc tổng quan

```
Customer Portal (Vercel, đã deploy)
       │
       ▼  RenderService.js
CWS Backend (NestJS)  ← file này hướng dẫn deploy phần này
       │
       ├──► Supabase (bảng mới: render_orders, payments, sites,
       │              machine_capability — KHÔNG đụng jobs/tasks/workers)
       │
       ├──► Backblaze B2 (upload file, đóng gói kết quả)
       │
       └──► Worker Fleet (đọc job/task qua bảng jobs/tasks có sẵn,
                           KHÔNG có thay đổi gì ở cws_worker_full.py)
```

## 1. Vì sao KHÔNG deploy lên Vercel

Vercel (nơi Portal đang chạy) phù hợp cho Frontend tĩnh + serverless
function ngắn hạn — KHÔNG phù hợp cho Backend này vì:
- Có WebSocket Gateway cần giữ kết nối lâu dài (Vercel serverless
  function tự động timeout sau vài chục giây).
- Có Scheduler chạy nền định kỳ (Cron mỗi 10 giây) — cần 1 process
  sống liên tục, không phải serverless.

Khuyến nghị: dùng nền tảng hỗ trợ chạy Node.js server dài hạn —
Render.com hoặc Railway.app (đều có free tier phù hợp giai đoạn
đầu), hoặc 1 VPS bất kỳ (DigitalOcean, Vultr...).

## 2. Chạy thử local

```bash
cd backend
npm install
cp .env.example .env
# Điền đầy đủ giá trị vào .env (xem chú thích từng biến trong file)
npm run build
npm run start
```

Kiểm tra: `curl http://localhost:3000/health` → `{"status":"ok",...}`

## 3. Chạy Migration (CHỈ CẦN LÀM 1 LẦN)

Migration 001-011 đã được chạy thật trên Supabase project
`ynhxlxetwuiyejcjypsi` (render_orders, payments, sites,
machine_capability, customer_profiles, storage_objects, review_images,
downloads, worker_logs, notifications, RLS owner-scoped + trigger
Supabase Auth, payments.job_id/storage_code/bank_name/account_number/
qr_image_url, render_orders.software/software_version/notes/
final_price_vnd/worker_runtime_seconds — không đụng bảng
jobs/tasks/workers cũ của Worker Fleet). Nếu deploy sang Supabase
project khác, chạy lần lượt các file trong `migrations/` theo đúng thứ
tự số (001 đến 016) qua Supabase SQL
Editor, **và** bật Google Provider trong Authentication > Providers
(xem mục 3b).

### 3b. Bật Google Login (Supabase Auth, không phải code riêng)

Google Login dùng NGUYÊN cơ chế OAuth có sẵn của Supabase Auth —
Backend/Portal KHÔNG tự code OAuth strategy. Chỉ cần:
1. Google Cloud Console (console.cloud.google.com) > APIs & Services >
   Credentials > Create Credentials > OAuth client ID > Web application
   — tạo Client ID/Client Secret. Authorized redirect URIs điền đúng
   giá trị Supabase yêu cầu (xem bước 2).
2. Supabase Dashboard > Authentication > Providers > Google > Enable,
   điền Client ID/Client Secret vừa tạo. Supabase hiện sẵn Redirect URL
   cần khai ở Google Cloud Console (dạng
   `https://<project-ref>.supabase.co/auth/v1/callback`) ngay trên
   trang cấu hình Provider này.
3. Authentication > URL Configuration > Site URL + Redirect URLs điền
   đúng domain Vercel thật của Portal.
4. Xong — `customer_profiles` tự tạo qua trigger `handle_new_auth_user()`,
   không cần thao tác gì thêm ở Backend. KHÔNG BAO GIỜ commit Client
   Secret vào repo — chỉ điền trực tiếp trên Supabase Dashboard.

**Lưu ý bảo mật:** `SUPABASE_SERVICE_ROLE_KEY` và `B2_APPLICATION_KEY`
từng bị commit nhầm vào `backend/.env.example` (đã xóa khỏi working
tree nhưng còn trong git history) — nếu chưa rotate 2 key này trên
Supabase Dashboard (Settings > API) và Backblaze B2 (App Keys), PHẢI
làm trước khi deploy production.

### 3c. Payment verification tự động — SePay (nghiên cứu 2026-08-01)

MVP cần tự động phát hiện tiền vào MB Bank thay vì chờ Admin kiểm tra
tay. Đã research từ tài liệu chính thức 2 giải pháp phổ biến nhất cho
thị trường Việt Nam:

| | **SePay** | Casso |
|---|---|---|
| Free tier | 0đ/tháng, 50 giao dịch/tháng | 0đ/tháng, 30 giao dịch/tháng |
| MB Bank ở free tier | Có | Có |
| Webhook/API ở free tier | **Có, ngay từ đầu** | **Không** — Free chỉ có Telegram/email báo cáo; custom webhook chỉ có từ gói Starter (99k/tháng) trở lên |
| Xác thực webhook | Header cố định `Authorization: Apikey <key>` (hoặc HMAC-SHA256/OAuth2) | Header tuỳ chỉnh (secret key) |

Nguồn: [SePay bảng giá](https://sepay.vn/bang-gia.html), [SePay webhook docs](https://developer.sepay.vn/en/sepay-webhooks/tich-hop-webhook), [Casso pricing table](https://api.casso.vn/pricing-table), [Casso webhook docs](https://developer.casso.vn/webhook/thiet-lap-webhook-thu-cong).

**Quyết định: dùng SePay** — free tier duy nhất thực sự dùng được cho
MVP (Casso free không có webhook, phải trả phí mới dùng được, không
hợp yêu cầu "ưu tiên miễn phí"). Đã ghi vào `DECISIONS.md`.

**Quyết định bổ sung (2026-08-01, sau khi research sâu hơn — xem
`reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md`): chỉ dùng "SePay
Webhook", KHÔNG triển khai "SePay IPN"** — dù đây là 2 tính năng khác
nhau (payload/auth khác shape), cả hai đều phụ thuộc SePay đọc được
biến động MB Bank trước tiên nên KHÔNG tạo redundancy nguồn dữ liệu
thật, chỉ tăng độ phức tạp không cần thiết cho MVP. Fallback độc lập
thật sự (khác failure domain) đã có sẵn: Android MBBank Notification
Listener (`POST /payment/notification`, đọc trực tiếp app MBBank trên
điện thoại, không qua SePay).

**Setup (Owner tự làm — cần liên kết tài khoản MB Bank thật, agent
không thể tự đăng ký/liên kết ngân hàng)**:
1. Đăng ký tài khoản tại [sepay.vn](https://sepay.vn), liên kết MB
   Bank thật của CWS (Owner tự đăng nhập ngân hàng để liên kết, đúng
   quy trình bảo mật của SePay — không chia sẻ thông tin đăng nhập
   ngân hàng cho bất kỳ ai/công cụ nào khác).
2. SePay Dashboard > **Webhooks** (KHÔNG phải mục "IPN") > Add webhook:
   - **URL**: `https://<backend-domain-thật>/payments/webhook/sepay`
   - **Event type**: chọn "Money in" (khuyến nghị — Backend cũng tự lọc
     lại `transferType=in`, an toàn kể cả nếu chọn "Both")
   - **Security**: **ưu tiên chọn HMAC-SHA256** nếu dashboard hiển thị
     lựa chọn này (khuyến nghị chính thức của SePay, mạnh hơn API Key
     vì ký cả nội dung request + chống replay bằng timestamp) — tự sinh
     1 chuỗi ngẫu nhiên dài (vd `openssl rand -hex 32`) làm Secret Key.
     **Nếu dashboard không hỗ trợ/không chọn được HMAC-SHA256** (tuỳ
     gói/loại tài khoản), chọn **API Key** thay thế — Backend tự nhận
     diện chế độ nào dựa trên biến môi trường nào được điền, không cần
     đổi code.
3. Điền đúng chuỗi đó vào Backend (Render.com > Environment Variables):
   - Nếu chọn HMAC-SHA256: điền vào `SEPAY_WEBHOOK_HMAC_SECRET`.
   - Nếu chọn API Key: điền vào `SEPAY_WEBHOOK_API_KEY`.
   - Chỉ cần điền 1 trong 2 (không cần cả hai) — KHÔNG commit giá trị
     thật vào repo.
4. Test: SePay Dashboard có nút giả lập giao dịch để kiểm tra webhook
   nhận được trước khi có giao dịch thật.

Chi tiết implementation: `PaymentsController.sepayWebhook()`
(`POST /payments/webhook/sepay`) → `SepayWebhookGuard` (xác thực) →
`PaymentsService.confirmViaSepayWebhook()` (lọc transferType, chống
trùng/replay qua bảng `payment_notifications` có sẵn — migration 014,
dùng chung với luồng MBBank Notification Listener — rồi gọi lại
`matchAndConfirm()` y hệt `POST /payments/webhook` để đối chiếu
payment_code + storage_code + số tiền trước khi set PAID). Không tạo
bảng/luồng payment song song. Test: `payments.service.spec.ts` +
`sepay-webhook.guard.spec.ts`.

## 4. Deploy lên Render.com (khuyến nghị cho MVP)

1. Đăng nhập render.com bằng GitHub
2. New -> Web Service -> chọn repo cws-portal
3. Root Directory: backend
4. Build Command: npm install && npm run build
5. Start Command: npm run start:prod
6. Điền toàn bộ biến môi trường trong .env.example vào phần
   Environment Variables của Render
7. Deploy — Render tự cấp domain dạng https://cws-backend.onrender.com

### 4b. Cài ffmpeg (tùy chọn — để ghép video MP4 cho file cuối)

`PackagingService` tự dùng ffmpeg CLI (spawn process, không phải npm
package) để ghép các frame PNG thành 1 file `.mp4` khi có sẵn — nếu
KHÔNG cài, Backend tự động rơi về đóng gói `.zip` như trước, không lỗi
gì, không chặn việc bàn giao. Nếu muốn có video MP4:
- Render.com: thêm vào Build Command: `apt-get update && apt-get install -y ffmpeg && npm install && npm run build` (Render dùng Docker gốc Debian, có `apt-get`; kiểm tra lại tài liệu Render nếu instance type khác).
- VPS tự quản (Ubuntu/Debian): `sudo apt-get install -y ffmpeg`.
- Kiểm tra đã cài đúng: `ffmpeg -version`.

## 5. Kết nối Portal với Backend

Sau khi Backend chạy thành công, vào Vercel Project Settings của
cws-portal (Frontend), thêm biến môi trường:

```
VITE_CWS_API_BASE_URL=https://cws-backend.onrender.com
VITE_CWS_WS_BASE_URL=wss://cws-backend.onrender.com
```

Redeploy Portal — IS_BACKEND_CONFIGURED sẽ tự chuyển thành true,
Portal tự động gọi Backend thật thay vì mockBackend.js. KHÔNG cần sửa
bất kỳ dòng code nào ở Portal.

## 6. Giới hạn thật cần biết trước khi vận hành

- Upload File trực tiếp: Worker Fleet (cws_worker_full.py) hiện
  chỉ tải được file từ Google Drive — nếu khách chọn "Upload File" thay
  vì "Google Drive" trên Portal, Backend sẽ báo lỗi rõ ràng thay vì tạo
  job hỏng âm thầm. Hiện tại hướng khách dùng nhánh Google Drive cho
  tới khi mở rộng Worker (thay đổi Foundation, cần quyết định riêng).
- Đóng gói kết quả: tự động ghép frame thành video `.mp4` qua ffmpeg
  CLI nếu môi trường chạy Backend có cài ffmpeg (xem mục 4b) — rơi về
  `.zip` chứa frame PNG như trước nếu không có ffmpeg/ghép thất bại,
  không chặn việc bàn giao.
- Thanh toán: chỉ còn MB Bank QR (`qr_bank`) — Wallet/Stripe/PayPal đã
  gỡ hoàn toàn. **Render là MIỄN PHÍ** — thanh toán chỉ diễn ra SAU khi
  khách duyệt bản preview (`POST /jobs/:id/approve` tính GIÁ THẬT theo
  runtime Worker thật rồi mới sinh QR trong response, job chuyển
  `awaiting_payment`), KHÔNG chặn việc tạo job/render. Webhook thật
  (`POST /payments/webhook`) đối chiếu storage_code + payment_code + số
  tiền. Ảnh VietQR quét được ĐÃ dựng
  thật khi có `MB_BANK_ACCOUNT_NUMBER`/`MB_BANK_ACCOUNT_NAME` (env) —
  chỉ còn thiếu webhook thật từ ngân hàng gọi vào (cần thao tác phía
  ngân hàng/cổng trung gian, chưa nối).
- Preview/duyệt: render xong dừng ở `review_ready`, tạo 3-5 ảnh
  preview watermark thật. Khách duyệt → `awaiting_payment` (chờ webhook)
  → webhook PAID → `packaging` → `finished` (mở `downloadUrl`). Tải file
  PHẢI qua `GET /jobs/:id/download` (có ghi log), không dùng thẳng
  `downloadUrl` raw. Khách có thể `POST /jobs/:id/request-changes` để
  yêu cầu chỉnh sửa thay vì duyệt (chỉ ghi nhận, không tự động
  re-render/hoàn tiền).
- Google Login: dùng Supabase Auth built-in OAuth (xem mục 3b) — cần
  bật Provider thật trong Supabase Dashboard, KHÔNG cần code Backend
  riêng. RLS owner-scoped đã bật (migration 007) nên khách chỉ đọc
  được dữ liệu của chính mình.
- Route Admin (`GET /jobs` ẩn danh, `GET /jobs/by-storage-code/:code`,
  `GET /payments/by-code/:code`, `AdminScreen.jsx` qua `#admin`) yêu
  cầu header `x-admin-key` khớp biến môi trường `ADMIN_API_KEY` — đặt
  giá trị thật (không phải giá trị mặc định/rỗng) trước khi deploy
  production.
- `POST /payments/webhook` yêu cầu header `x-webhook-secret` khớp biến
  môi trường `PAYMENT_WEBHOOK_SECRET` — bắt buộc đặt giá trị thật trước
  khi deploy production, và khai báo ĐÚNG giá trị đó khi cấu hình URL
  webhook ở phía ngân hàng/cổng trung gian (Casso, SePay...). Nếu thiếu,
  webhook từ chối mọi request (fail-closed) thay vì để công khai — vì
  payment_code/storage_code/amount trong nội dung webhook không phải bí
  mật (khách hàng nhìn thấy chúng trên QR để chuyển khoản).
- Wake System (Model 2): luôn trả về thất bại vì
  cws_worker_full.py chưa có cơ chế relay Magic Packet — job sẽ tự
  rơi vào hàng đợi (Queue) đúng thiết kế, không bị treo.

## 7. Theo dõi vận hành

- GET /health — kiểm tra Backend còn sống
- Log Scheduler (mỗi 10 giây) in ra ở console — theo dõi qua log
  platform hosting (Render có sẵn tab Logs)


## Worker architecture correction — 2026-08-05

Các đoạn lịch sử nhắc cws_worker_full.py chỉ mô tả legacy evidence. Runtime direction hiện tại là generic Worker Engine worker/worker_engine.py + worker-engine.bat + manifest; JobSpec/TaskSpec mới là dữ liệu động. Không tạo/upload Worker source mới cho từng Job.
