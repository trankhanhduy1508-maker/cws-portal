# CWS Customer Portal

Customer frontend của CWS: Google Login → Upload/Google Drive → validate/materialize input → tạo một Job → Scheduler tự phân bổ tài nguyên → theo dõi render → preview + giá cuối + QR → SePay → tải kết quả.

Khách hàng **không chọn tốc độ/tier, GPU/CPU hay số Worker**. Scheduler quyết định capacity tự động từ workload, deadline và fleet capacity thật.

## Development
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
npm run preview
```

## Cấu trúc chính
- `src/components/` — UI component tái sử dụng
- `src/pages/` — Customer/Admin screens
- `src/layouts/` — layout chung
- `src/hooks/` — auth/input/job/history state
- `src/services/` — Backend API boundary (`RenderService.js`)
- `src/utils/` — validation/format helpers
- `src/constants/` — shared constants
- `backend/` — NestJS API/Scheduler/payment/storage
- `worker/` — production Node Agent + Worker Engine

## Backend
Portal production gọi Backend CWS thật qua `VITE_CWS_API_BASE_URL` và `VITE_CWS_WS_BASE_URL`. Không có mock/demo success fallback trong production path.

## Deploy
Customer Portal dùng existing Vercel project. Commit/merge vào canonical `main` đi qua CI/deployment hiện hữu; không tạo Vercel project mới cho Customer.
