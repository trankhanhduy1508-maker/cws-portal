# CWS Backend — API Documentation

Base URL: `{VITE_CWS_API_BASE_URL}` (xem BACKEND_SETUP.md)

## Jobs

### POST /jobs
Tạo 1 render order mới. CHỈ tạo được nếu `paymentId` đã ở trạng thái
PAID (JobsService kiểm tra qua PaymentsService.getStatus() trước khi
tạo — không tin `paymentId` do client tự gửi).

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
`driveLink` chấp nhận Google Drive/OneDrive/Dropbox (validate cú pháp ở
Portal qua `SHARED_LINK_PATTERNS`); chỉ Google Drive có kiểm tra quyền
truy cập thật qua API (nếu có `GOOGLE_DRIVE_API_KEY`).

Response: `{ "jobId": "uuid" }`. Job tạo xong có `storageCode` dạng
`CWS-XXXXXXXX` (8 ký tự đầu của id, viết hoa).

### POST /jobs/estimate
Ước tính ETA/giá/hàng đợi cho 1 Render Profile.

Request: `{ "fileRef"?, "driveLink"?, "fileSizeBytes"?, "profileId" }`

Response: `{ "etaSeconds": 900, "costVnd": 45000, "queueSeconds": 0 }`

### GET /jobs
Danh sách render order (Job Dashboard/History).

Nếu request có `Authorization: Bearer <token>` hợp lệ (đăng nhập
Facebook) — chỉ trả job của đúng khách đó (`findByCustomerId`).

**Lưu ý bảo mật còn lại:** nếu KHÔNG có token (khách chưa đăng nhập,
hoặc gọi thẳng API không qua Portal) — trả về TOÀN BỘ order của mọi
khách, không có cách nào chặn việc này ở route công khai chừng nào
Portal chưa bắt buộc đăng nhập. KHÔNG build UI admin công khai dựa
trên route này.

### GET /jobs/by-storage-code/:storageCode
Tra cứu 1 job theo Storage Code (Giai đoạn 7 — cùng lưu ý bảo mật như
`GET /jobs`, chưa có auth).

### GET /jobs/:id
Chi tiết 1 render order — bao gồm `storageCode`.

### GET /jobs/:id/status
Alias — chỉ trả `{ status, stageProgress }`.

### GET /jobs/:id/preview
3-5 ảnh preview đã watermark ("CWS RENDER", lặp chéo) — chỉ có dữ liệu
khi job ở `review_ready` trở về sau. Response: `{ "images": [{ "url", "displayOrder" }] }`.

### POST /jobs/:id/approve
Khách duyệt bản preview — CHỈ hợp lệ khi `status === review_ready`.
Đóng gói kết quả cuối (zip các frame từ B2) rồi set `downloadUrl` +
status `finished`. Đây là điểm DUY NHẤT mở khóa file gốc.

### GET /jobs/:id/download
Ghi log vào bảng `downloads` (job_id + IP) rồi redirect (302) sang URL
B2 thật. Portal PHẢI dùng route này để tải, không dùng thẳng `downloadUrl`
raw (xem `RenderService.getDownloadUrl()`). Trả lỗi 400 nếu job chưa
`finished`.

### GET /jobs/:id/logs
Log Worker (bảng `worker_logs`) — ghi khi 1 task render thất bại vĩnh
viễn (Worker đã hết retry). Dùng để debug/hiển thị lý do lỗi cho admin.

### GET /jobs/:id/notifications
Thông báo hệ thống liên quan job (vd "Render xong, mời duyệt", "Render
thất bại").

### POST /jobs/:id/cancel
Hủy 1 render order đang xử lý. (Portal gọi route này — route chính,
không được đổi.)

### DELETE /jobs/:id
Alias REST chuẩn — cùng logic với `POST /jobs/:id/cancel`.

## Payments

MVP chỉ hỗ trợ `method: "qr_bank"` (MB Bank QR) — Wallet/Stripe/PayPal
đã bị gỡ hoàn toàn khỏi enum `PaymentMethod`.

### POST /payments
Tạo giao dịch thanh toán.

Request: `{ "amountVnd": 45000, "method": "qr_bank" }`

Response: `{ "paymentId": "uuid", "status": "processing", "transferContent": "CWS AB12CD34", "amountVnd": 45000 }`

`transferContent` là nội dung khách cần ghi khi chuyển khoản — đây là
CƠ SỞ DUY NHẤT để webhook đối chiếu và set PAID.

### GET /payments/:id
Trạng thái thanh toán hiện tại — Portal poll route này để chờ webhook
xác nhận (`RenderService.confirmPayment()` poll mỗi 3s, timeout 10 phút).

Response: `{ "paymentId": "uuid", "status": "unpaid" | "processing" | "paid" | "failed" }`

### GET /payments/by-code/:paymentCode
Tra cứu payment theo mã (Giai đoạn 7, admin — chưa có auth, xem lưu ý
bảo mật ở `GET /jobs`).

### POST /payments/:id/confirm
**KHÔNG còn set PAID được cho `qr_bank`** — `QrBankProvider.confirm()`
luôn throw 400 ("chờ webhook"). Giữ route để tương thích interface,
không phải cách hợp lệ để xác nhận thanh toán.

### POST /payments/webhook
Endpoint DUY NHẤT hợp lệ để set PAID. Ngân hàng/cổng trung gian gọi
vào đây khi có giao dịch chuyển khoản mới.

Request: `{ "transferContent": "CWS AB12CD34", "amountVnd": 45000 }`

Logic: parse mã từ `transferContent` (regex `CWS\s+([A-Z0-9]+)`), tìm
payment theo `payment_code`, đối chiếu `amountVnd` khớp tuyệt đối, chỉ
khi khớp mới set PAID. Sai định dạng/không tìm thấy/không khớp số tiền
→ lỗi rõ ràng, không âm thầm bỏ qua.

**CHƯA nối cổng MB Bank thật** — cần số tài khoản/BIN thật (business
info) để: (1) dựng ảnh VietQR quét được thay vì chỉ hiển thị text, (2)
có webhook thật từ MB Bank gọi vào route này thay vì gọi tay/giả lập.

## Files

### POST /files/upload
Upload file `.blend` lên B2 (multipart/form-data, field `file`).

Response: `{ "fileRef": "uploads/uuid-name.blend", "fileName": "name.blend", "fileSizeBytes": 123456 }`

Giới hạn: chỉ `.blend`, tối đa 2GB.

### POST /drive/resolve
Xác nhận + đọc metadata 1 link chia sẻ (Google Drive/OneDrive/Dropbox).

Request: `{ "driveLink": "https://..." }`

Response: `{ "driveLink", "fileName": string|null, "fileSizeBytes": number|null }`

`fileName`/`fileSizeBytes` là `null` nếu: chưa cấu hình
`GOOGLE_DRIVE_API_KEY`, HOẶC link không phải Google Drive (OneDrive/
Dropbox được chấp nhận cú pháp nhưng chưa có tích hợp API thật — trả
null thay vì bịa, không phải lỗi).

Tự động từ chối (400) nếu link Google Drive là link THƯ MỤC thay vì
file — phát hiện sớm lỗi đã từng xảy ra thật với job CWS-JOB5.

## Realtime

### WS /ws/jobs/:jobId
Kết nối WebSocket, nhận cập nhật trạng thái job realtime (qua Supabase
Realtime phía sau). Gửi ngay snapshot hiện tại lúc vừa kết nối. Message
là JSON, shape giống response của `GET /jobs/:id`.

## Health

### GET /health
`{ "status": "ok", "service": "cws-backend", "timestamp": "..." }`
