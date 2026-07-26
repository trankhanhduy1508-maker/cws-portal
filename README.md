# CWS Customer Portal

Frontend cho dự án CWS — khách gửi file (upload hoặc Google Drive link),
chọn tốc độ render, xác nhận, theo dõi tiến trình, và tải kết quả.

## Chạy thử (development)
npm install
npm run dev

## Build production
npm run build
npm run preview

## Cấu trúc thư mục
- `components/` — UI component tái sử dụng
- `pages/` — từng màn hình trong flow
- `layouts/` — khung bao ngoài chung
- `hooks/` — logic state (useFileSelection, useRenderJob, useJobEstimate, useJobHistory, useDriveLink)
- `services/` — CỔNG DUY NHẤT giao tiếp Backend (`RenderService.js`)
- `utils/` — hàm tiện ích thuần (format, validate)
- `constants/` — hằng số dùng chung
- `theme/` — design tokens (màu, font, spacing)

## Kết nối Backend thật (sau này)
1. Điền `VITE_CWS_API_BASE_URL` vào file `.env` (xem `.env.example`)
2. Mở `src/services/RenderService.js`, hoàn thiện phần `submitRenderJobReal()`
   và các hàm `*Real` khác (khung sườn đã có sẵn, khớp đúng shape với bản mock)
3. Không cần sửa bất kỳ Component/Hook/Page nào khác

## Deploy
Repo này đã kết nối Vercel — mỗi lần có commit mới trên nhánh `main`,
Vercel tự động build và deploy, không cần thao tác thủ công.
