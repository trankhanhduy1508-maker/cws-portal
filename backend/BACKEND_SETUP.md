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

Migration 001-009 đã được chạy thật trên Supabase project
`ynhxlxetwuiyejcjypsi` (render_orders, payments, sites,
machine_capability, customer_profiles, storage_objects, review_images,
downloads, worker_logs, notifications, RLS owner-scoped + trigger
Supabase Auth, payments.job_id/storage_code/bank_name/account_number/
qr_image_url, render_orders.software/software_version/notes — không
đụng bảng jobs/tasks/workers cũ của Worker Fleet). Nếu deploy sang
Supabase project khác, chạy lần lượt các file trong `migrations/` theo
đúng thứ tự số (001 đến 009) qua Supabase SQL
Editor, **và** bật Facebook Provider trong Authentication > Providers
(xem mục 3b).

### 3b. Bật Facebook Login (Supabase Auth, không phải code riêng)

Facebook Login dùng NGUYÊN cơ chế OAuth có sẵn của Supabase Auth —
Backend/Portal KHÔNG tự code OAuth strategy. Chỉ cần:
1. Supabase Dashboard > Authentication > Providers > Facebook > Enable,
   điền App ID/App Secret thật (tạo ở developers.facebook.com).
2. Authentication > URL Configuration > Site URL + Redirect URLs điền
   đúng domain Vercel thật của Portal.
3. Xong — `customer_profiles` tự tạo qua trigger `handle_new_auth_user()`,
   không cần thao tác gì thêm ở Backend.

**Lưu ý bảo mật:** `SUPABASE_SERVICE_ROLE_KEY` và `B2_APPLICATION_KEY`
từng bị commit nhầm vào `backend/.env.example` (đã xóa khỏi working
tree nhưng còn trong git history) — nếu chưa rotate 2 key này trên
Supabase Dashboard (Settings > API) và Backblaze B2 (App Keys), PHẢI
làm trước khi deploy production.

## 4. Deploy lên Render.com (khuyến nghị cho MVP)

1. Đăng nhập render.com bằng GitHub
2. New -> Web Service -> chọn repo cws-portal
3. Root Directory: backend
4. Build Command: npm install && npm run build
5. Start Command: npm run start:prod
6. Điền toàn bộ biến môi trường trong .env.example vào phần
   Environment Variables của Render
7. Deploy — Render tự cấp domain dạng https://cws-backend.onrender.com

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
- Đóng gói kết quả: hiện tại chỉ nén các frame PNG thành 1 file
  .zip — CHƯA tự động dựng thành video MP4 (vẫn cần Dy làm tay bằng
  ffmpeg như quy trình cũ nếu cần video).
- Thanh toán: chỉ còn MB Bank QR (`qr_bank`) — Wallet/Stripe/PayPal đã
  gỡ hoàn toàn. **Render là MIỄN PHÍ** — thanh toán chỉ diễn ra SAU khi
  khách duyệt bản preview (`POST /jobs/:id/approve` sinh QR ngay trong
  response, job chuyển `awaiting_payment`), KHÔNG chặn việc tạo
  job/render. Webhook thật (`POST /payments/webhook`) đối chiếu
  storage_code + payment_code + số tiền. Ảnh VietQR quét được ĐÃ dựng
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
- Facebook Login: dùng Supabase Auth built-in OAuth (xem mục 3b) — cần
  bật Provider thật trong Supabase Dashboard, KHÔNG cần code Backend
  riêng. RLS owner-scoped đã bật (migration 007) nên khách chỉ đọc
  được dữ liệu của chính mình.
- Route Admin (`GET /jobs` ẩn danh, `GET /jobs/by-storage-code/:code`,
  `GET /payments/by-code/:code`, `AdminScreen.jsx` qua `#admin`) yêu
  cầu header `x-admin-key` khớp biến môi trường `ADMIN_API_KEY` — đặt
  giá trị thật (không phải giá trị mặc định/rỗng) trước khi deploy
  production.
- Wake System (Model 2): luôn trả về thất bại vì
  cws_worker_full.py chưa có cơ chế relay Magic Packet — job sẽ tự
  rơi vào hàng đợi (Queue) đúng thiết kế, không bị treo.

## 7. Theo dõi vận hành

- GET /health — kiểm tra Backend còn sống
- Log Scheduler (mỗi 10 giây) in ra ở console — theo dõi qua log
  platform hosting (Render có sẵn tab Logs)
