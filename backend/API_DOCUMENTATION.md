# CWS Backend — API Documentation

Base URL: `{VITE_CWS_API_BASE_URL}` (xem BACKEND_SETUP.md)

## Jobs

### POST /jobs
Tạo 1 render order mới. CHỈ gọi sau khi thanh toán thành công.

Request body:
```json
{
  "fileRef": "uploads/uuid-file.blend",
  "driveLink": null,
  "fileName": "scene.blend",
  "fileSizeBytes": 52428800,
  "profileId": "standard",
  "paymentId": "uuid-payment-id"
}
```
`fileRef` và `driveLink` — chỉ cần 1 trong 2 (tùy nguồn khách chọn).

Response: `{ "jobId": "uuid" }`

### POST /jobs/estimate
Ước tính ETA/giá/hàng đợi cho 1 Render Profile.

Request: `{ "fileRef"?, "driveLink"?, "fileSizeBytes"?, "profileId" }`

Response: `{ "etaSeconds": 900, "costVnd": 45000, "queueSeconds": 0 }`

### GET /jobs
Danh sách toàn bộ render order (Job Dashboard/History).

Lưu ý bảo mật: hiện CHƯA có phân quyền theo khách hàng (Portal chưa có
đăng nhập) — endpoint này trả về TOÀN BỘ order của mọi khách. Cần bổ
sung xác thực/phân quyền trước khi có nhiều khách hàng thật dùng đồng
thời.

### GET /jobs/:id
Chi tiết 1 render order.

### GET /jobs/:id/status
Alias — chỉ trả `{ status, stageProgress }`.

### POST /jobs/:id/cancel
Hủy 1 render order đang xử lý. (Portal gọi route này — route chính,
không được đổi.)

### DELETE /jobs/:id
Alias REST chuẩn — cùng logic với `POST /jobs/:id/cancel`.

## Payments

### POST /payments
Tạo giao dịch thanh toán.

Request: `{ "amountVnd": 45000, "method": "wallet" | "qr_bank" }`

Response: `{ "paymentId": "uuid", "status": "processing" }`

Lưu ý: `method: "stripe"` hoặc `"paypal"` trả lỗi 400 rõ ràng — chưa có
provider thật (Portal cũng đã ẩn 2 lựa chọn này ở UI).

### POST /payments/:id/confirm
Xác nhận thanh toán hoàn tất.

Response: `{ "paymentId": "uuid", "status": "paid" | "failed" }`

## Files

### POST /files/upload
Upload file `.blend` lên B2 (multipart/form-data, field `file`).

Response: `{ "fileRef": "uploads/uuid-name.blend", "fileName": "name.blend", "fileSizeBytes": 123456 }`

Giới hạn: chỉ `.blend`, tối đa 2GB.

### POST /drive/resolve
Xác nhận + đọc metadata 1 link Google Drive.

Request: `{ "driveLink": "https://drive.google.com/file/d/.../view" }`

Response: `{ "driveLink", "fileName": string|null, "fileSizeBytes": number|null }`

`fileName`/`fileSizeBytes` là `null` nếu chưa cấu hình `GOOGLE_DRIVE_API_KEY`.

Tự động từ chối (400) nếu link là link THƯ MỤC thay vì file — phát
hiện sớm lỗi đã từng xảy ra thật với job CWS-JOB5.

## Realtime

### WS /ws/jobs/:jobId
Kết nối WebSocket, nhận cập nhật trạng thái job realtime (qua Supabase
Realtime phía sau). Gửi ngay snapshot hiện tại lúc vừa kết nối. Message
là JSON, shape giống response của `GET /jobs/:id`.

## Health

### GET /health
`{ "status": "ok", "service": "cws-backend", "timestamp": "..." }`
