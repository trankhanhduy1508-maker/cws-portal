# CWS Backend — API Documentation

Base URL: `{VITE_CWS_API_BASE_URL}` (xem BACKEND_SETUP.md)

## Auth

Facebook Login dùng NGUYÊN cơ chế OAuth có sẵn của Supabase Auth
(`supabase.auth.signInWithOAuth({ provider: 'facebook' })` phía Portal)
— Backend KHÔNG tự code OAuth strategy, KHÔNG nhận/xử lý mật khẩu
Facebook ở bất kỳ đâu. Sau khi đăng nhập, Portal gửi
`Authorization: Bearer <supabase-access-token>` cho các route cần biết
khách là ai; Backend xác minh token qua `supabase.auth.getUser(token)`.
`customer_profiles` tự tạo/cập nhật qua trigger Postgres
`handle_new_auth_user()` (không có route Backend nào tạo profile).

Các route admin (Giai đoạn 7) yêu cầu header `x-admin-key` khớp
`ADMIN_API_KEY` (env Backend) — xem `AdminKeyGuard`, đánh dấu rõ bên
dưới ở từng route.

## Customers

### GET /customers
Danh sách toàn bộ khách hàng (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7 —
"Danh sách khách hàng"). **Yêu cầu header `x-admin-key`** (`AdminKeyGuard`).

Response: `[{ "id", "fullName", "email", "avatarUrl", "phone", "preferredContact", "marketingConsent", "createdAt", "updatedAt" }, ...]`

## Fleet

### GET /fleet/workers
Trạng thái Worker Fleet (CWS_MVP_WORKFLOW_FINAL.md, mục Admin —
"Worker") — CHỈ đọc bảng `workers` nội bộ, không can thiệp gì (đúng
nguyên tắc "không đụng Worker Fleet"). **Yêu cầu header `x-admin-key`**
(`AdminKeyGuard`).

Response: `[{ "workerId", "gpuName", "vramMb", "status": "idle"|"busy"|"offline", "lastSeenAt", "crashCount" }, ...]`

## Jobs

### POST /jobs
Tạo 1 render order mới — MIỄN PHÍ, KHÔNG cần thanh toán trước
(CWS_MVP_WORKFLOW_FINAL.md: Job → Upload → Render → Preview → Khách
duyệt → mới sinh QR thanh toán). Không có field `paymentId` nào ở đây.

Request body:
```json
{
  "fileRef": "uploads/uuid-file.blend",
  "driveLink": null,
  "fileName": "scene.blend",
  "fileSizeBytes": 52428800,
  "software": "Blender",
  "softwareVersion": "4.2",
  "notes": "Ghi chú cho đội render (không bắt buộc)",
  "profileId": "standard"
}
```
`software`/`softwareVersion`/`notes` — không bắt buộc (CWS_MVP_WORKFLOW_FINAL.md,
mục "Tạo Job"), chỉ là thông tin tham khảo cho admin/Worker.
`fileRef` và `driveLink` — chỉ cần 1 trong 2 (tùy nguồn khách chọn).
`driveLink` chấp nhận Google Drive/OneDrive/Dropbox/Direct Link (validate cú pháp ở
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

Nếu request có `Authorization: Bearer <supabase-access-token>` hợp lệ
— chỉ trả job của đúng khách đó (`findByCustomerId`). Nếu KHÔNG có
token, route yêu cầu header `x-admin-key` khớp `ADMIN_API_KEY`, nếu
không sẽ trả 401 — route này KHÔNG còn công khai toàn bộ order như
trước.

### GET /jobs/by-storage-code/:storageCode
Tra cứu 1 job theo Storage Code (Giai đoạn 7). **Yêu cầu header
`x-admin-key`** (`AdminKeyGuard`).

### GET /jobs/:id
Chi tiết 1 render order — bao gồm `storageCode`, `customerId` (để admin
đối chiếu với `GET /customers`, "Tìm kiếm theo Customer").

### GET /jobs/:id/status
Alias — chỉ trả `{ status, stageProgress }`.

### GET /jobs/:id/preview
3-5 ảnh preview đã watermark ("CWS RENDER", lặp chéo) — chỉ có dữ liệu
khi job ở `review_ready` trở về sau. Response: `{ "images": [{ "url", "displayOrder" }] }`.

### POST /jobs/:id/approve
Khách duyệt bản preview — CHỈ hợp lệ khi `status === review_ready`.
Tính GIÁ THẬT (`PricingService.computeFinalPriceVnd()`) dựa trên
runtime thật của từng Worker đã tham gia job (đọc `tasks.claimed_at`/
`tasks.last_heartbeat`, KHÔNG dùng `estimate.costVnd` — số đó chỉ là
ước tính heuristic hiển thị trước render). Công thức: mỗi Worker
`(runtime + 10 phút khởi động)`, cộng dồn mọi Worker, đổi ra giờ,
x 6.000đ/giờ, x 2. Sinh 1 payment mới (QR MB Bank) với giá thật này
NGAY trong response, chuyển job sang `awaiting_payment`. KHÔNG đóng
gói/mở tải ngay — chỉ khi webhook xác nhận PAID (SchedulerService phát
hiện qua tick, gọi `JobsService.finalizeDelivery()`) job mới chuyển
tiếp `packaging` → `finished` kèm `downloadUrl`.

Response: toàn bộ field của job (như `GET /jobs/:id`, bao gồm
`finalPriceVnd`/`workerRuntimeSeconds` mới) + field `payment`:
```json
{
  "...": "...",
  "status": "awaiting_payment",
  "finalPriceVnd": 72000,
  "workerRuntimeSeconds": 2100,
  "payment": {
    "paymentId": "uuid",
    "paymentCode": "AB12CD34",
    "transferContent": "CWS CWS-A1B2C3D4 AB12CD34",
    "qrImageUrl": "https://img.vietqr.io/...",
    "amountVnd": 72000
  }
}
```

### POST /jobs/:id/request-changes
Khách yêu cầu chỉnh sửa thay vì duyệt — CHỈ hợp lệ khi
`status === review_ready`. Request: `{ "note"?: string }`.

Ghi 1 notification + 1 worker_log để admin liên hệ khách thủ công —
**KHÔNG đổi status** (job vẫn `review_ready`, khách vẫn duyệt được
sau nếu đổi ý), **KHÔNG tự động re-render hay hoàn tiền** (quyết định
nghiệp vụ, ngoài phạm vi route này). Response: `{ "ok": true }`.

### GET /jobs/:id/download
Ghi log vào bảng `downloads` (job_id + IP) rồi redirect (302) sang URL
B2 thật. Portal PHẢI dùng route này để tải, không dùng thẳng `downloadUrl`
raw (xem `RenderService.getDownloadUrl()`). Trả lỗi 400 nếu job chưa
`finished`.

File cuối là `.mp4` (ghép qua ffmpeg CLI, `VideoAssemblyService`) nếu
môi trường chạy Backend có cài ffmpeg — rơi về `.zip` chứa các frame
PNG như cũ nếu không có ffmpeg hoặc ghép video thất bại (KHÔNG chặn cả
việc bàn giao chỉ vì thiếu ffmpeg). Xem `BACKEND_SETUP.md` để cài ffmpeg.

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
Tạo giao dịch thanh toán ĐỘC LẬP, không gắn job nào — route này tồn
tại để tương thích/testing, luồng thật của Portal KHÔNG gọi route này
(payment thật được `JobsService.approve()` tạo nội bộ, gắn kèm `job_id`/
`storage_code`). Payment tạo qua đây có `transferContent` dạng
`"CWS {payment_code}"` (không có storage_code) nên `POST /payments/webhook`
sẽ LUÔN từ chối nó (webhook bắt buộc định dạng 3 phần, xem bên dưới).

Request: `{ "amountVnd": 45000, "method": "qr_bank" }`

Response: `{ "paymentId": "uuid", "status": "processing", "paymentCode": "AB12CD34", "transferContent": "CWS AB12CD34", "qrImageUrl": "https://img.vietqr.io/...", "amountVnd": 45000 }`

`qrImageUrl` là ảnh VietQR quét được thật (qua `img.vietqr.io`, MB Bank
BIN `970422`) — chỉ có giá trị khi đã cấu hình
`MB_BANK_ACCOUNT_NUMBER`/`MB_BANK_ACCOUNT_NAME`, ngược lại trả `null`
(không bịa ảnh QR trỏ tới tài khoản không tồn tại).

### GET /payments/:id
Chi tiết đầy đủ 1 payment (không chỉ status) — Portal dùng để hiển thị
lại QR/nội dung chuyển khoản nếu khách tải lại trang lúc đang chờ
thanh toán (`useRenderJob.js` tự gọi lại khi thấy job ở `awaiting_payment`
mà chưa có `paymentInfo`).

Response: `{ "paymentId": "uuid", "status": "unpaid" | "processing" | "paid" | "failed", "paymentCode": "AB12CD34", "transferContent": "CWS CWS-A1B2C3D4 AB12CD34", "amountVnd": 45000, "qrImageUrl": "https://img.vietqr.io/..." }`

### GET /payments/by-code/:paymentCode
Tra cứu payment theo mã (Giai đoạn 7). **Yêu cầu header `x-admin-key`**
(`AdminKeyGuard`).

### POST /payments/:id/confirm
**KHÔNG còn set PAID được cho `qr_bank`** — `QrBankProvider.confirm()`
luôn throw 400 ("chờ webhook"). Giữ route để tương thích interface,
không phải cách hợp lệ để xác nhận thanh toán.

### POST /payments/webhook
Endpoint DUY NHẤT hợp lệ để set PAID. Ngân hàng/cổng trung gian gọi
vào đây khi có giao dịch chuyển khoản mới.

Request: `{ "transferContent": "CWS CWS-A1B2C3D4 AB12CD34", "amountVnd": 45000 }`

Logic: parse `storage_code` + `payment_code` từ `transferContent` (regex
`CWS\s+(\S+)\s+([A-Za-z0-9]+)` — bắt buộc ĐỦ 2 phần, đúng
CWS_MVP_WORKFLOW_FINAL.md: "CWS {storage_code} {payment_code}"), tìm
payment theo `payment_code`, đối chiếu `storage_code` khớp với
`payments.storage_code` đã lưu lúc tạo, rồi đối chiếu `amountVnd` khớp
tuyệt đối — CHỈ khi cả 3 khớp mới set PAID. Sai định dạng/không tìm
thấy/storage_code không khớp/số tiền không khớp → lỗi rõ ràng, không
âm thầm bỏ qua. Payment tạo qua `POST /payments` trực tiếp (không qua
job) không có `storage_code` nên webhook cho payment đó luôn bị từ chối.

Ảnh QR (VietQR) đã dựng thật khi có `MB_BANK_ACCOUNT_NUMBER` — phần
CÒN THIẾU duy nhất là webhook thật từ MB Bank/cổng trung gian gọi vào
route này (hiện chưa nối, cần thao tác trên tài khoản ngân hàng thật).

## Files

### POST /files/upload
Upload file `.blend` lên B2 (multipart/form-data, field `file`).

Response: `{ "fileRef": "uploads/uuid-name.blend", "fileName": "name.blend", "fileSizeBytes": 123456 }`

Giới hạn: chỉ `.blend`, tối đa 2GB.

### POST /drive/resolve
Xác nhận + đọc metadata 1 link chia sẻ (Google Drive/OneDrive/Dropbox/Direct Link).

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
