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

Migration đã được chạy thật trên Supabase project `ynhxlxetwuiyejcjypsi`
trong quá trình phát triển (4 bảng mới: render_orders, payments,
sites, machine_capability, không đụng bảng cũ). Nếu deploy sang
Supabase project khác, chạy lần lượt các file trong `migrations/` theo
đúng thứ tự số (001 rồi 002 rồi 003) qua Supabase SQL Editor.

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
- Thanh toán: Wallet/QR Bank là placeholder (xác nhận ngay/mô phỏng
  độ trễ), CHƯA nối cổng thanh toán thật. Stripe/PayPal trả lỗi rõ ràng
  nếu gọi tới (Portal cũng đã ẩn 2 lựa chọn này ở UI).
- Wake System (Model 2): luôn trả về thất bại vì
  cws_worker_full.py chưa có cơ chế relay Magic Packet — job sẽ tự
  rơi vào hàng đợi (Queue) đúng thiết kế, không bị treo.

## 7. Theo dõi vận hành

- GET /health — kiểm tra Backend còn sống
- Log Scheduler (mỗi 10 giây) in ra ở console — theo dõi qua log
  platform hosting (Render có sẵn tab Logs)
