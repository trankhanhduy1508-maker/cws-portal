# Changelog

## [1.4.0] - Giá thật theo runtime Worker + xuất video MP4 (2026-07-30)

Theo yêu cầu trực tiếp của người dùng (KHÔNG bắt buộc theo 3 tài liệu
roadmap — đây là quyết định nghiệp vụ, không phải sửa mismatch). Ý
tưởng tham khảo từ nhánh `claude/cws-zero-manual-operation-wtzbrt`
(phiên Claude trước, chưa merge) — đã LƯỢC BỎ phần vi phạm bảo mật của
nhánh đó (`payAndUnlock()` cho phép frontend tự kích hoạt xác nhận
thanh toán) khi mang ý tưởng này vào, giữ nguyên tắc chỉ webhook mới
set PAID.

### Giá thật theo runtime Worker
- `PricingService` mới (`backend/src/jobs/services/pricing.service.ts`):
  tính giá cuối cùng dựa trên runtime THẬT của từng Worker đã tham gia
  job (đọc `tasks.claimed_at`/`tasks.last_heartbeat` qua
  `WorkerFleetGateway.getTaskExecutionDetails()` mới) — KHÔNG dùng
  `estimate.costVnd` (ước tính heuristic theo dung lượng file, chỉ để
  hiển thị lúc chọn Render Profile). Công thức: mỗi Worker
  `(runtime + 10 phút khởi động)`, cộng dồn mọi Worker, đổi giờ,
  x 6.000đ/giờ, x 2.
- `JobsService.approve()` giờ gọi `PricingService` để tính
  `finalPriceVnd`/`workerRuntimeSeconds` NGAY trước khi sinh QR — số
  tiền trong QR luôn là giá thật, không phải ước tính.
- `render_orders` bổ sung cột `final_price_vnd`, `worker_runtime_seconds`
  (migration 011), expose qua `GET /jobs/:id` và response của
  `POST /jobs/:id/approve`.

### Tự động ghép video MP4 cho file cuối
- `VideoAssemblyService` mới (`backend/src/scheduler/video-assembly.service.ts`)
  + `ffmpeg.util.ts`: ghép các frame PNG đã render thành 1 file
  `.mp4` qua ffmpeg CLI (spawn process, không phải npm package) khi có
  sẵn trên môi trường chạy Backend. `PackagingService` ưu tiên thử
  ghép video, rơi về `.zip` frame PNG như cũ nếu ffmpeg không có/thất
  bại — KHÔNG chặn cả việc bàn giao chỉ vì thiếu ffmpeg, không giả vờ
  đã dựng được video khi không dựng được.
- `WorkerFleetGateway.getJobMeta()` mới: đọc `fps` thật Worker tự ghi
  lại (Scene Analyzer) để ghép video đúng tốc độ, không đoán.
- KHÔNG đụng tới cơ chế preview watermark hiện có (3-5 ảnh tĩnh qua
  `PreviewService`/sharp) — roadmap "Không thuộc MVP: Video preview đầy
  đủ" chỉ áp dụng cho bước xem trước, không áp dụng cho định dạng file
  cuối sau khi đã thanh toán.

## [1.3.0] - Sửa mismatch thứ tự thanh toán (2026-07-30)

### Sửa lỗi nghiêm trọng (mismatch với roadmap)
- **Trước bản này, `POST /jobs` bắt buộc `paymentId` đã PAID mới tạo
  được job** — hoàn toàn ngược với CWS_MVP_WORKFLOW_FINAL.md/
  CWS_ROADMAP_MVP_V1.md: cả 2 tài liệu đều ghi rõ thứ tự "Job → Upload
  → Render → Preview → **Khách duyệt** → Sinh QR → Webhook → PAID →
  Mở tải" — nghĩa là render MIỄN PHÍ, thanh toán chỉ chặn việc MỞ TẢI
  file gốc, không chặn việc tạo job/render. Đây là mismatch lớn nhất
  tìm thấy khi audit lại toàn bộ repo theo đúng 3 tài liệu gốc.
- Đã sửa: `POST /jobs` không còn nhận/yêu cầu `paymentId`. Job tạo và
  render ngay. `POST /jobs/:id/approve` (khách duyệt preview) mới là
  nơi sinh payment (QR MB Bank) — trả thẳng `paymentCode`/`transferContent`/
  `qrImageUrl` trong response, chuyển job sang trạng thái mới
  `awaiting_payment`. `SchedulerService` phát hiện payment đã PAID (qua
  tick định kỳ) thì mới gọi `JobsService.finalizeDelivery()` để đóng
  gói + mở `downloadUrl`.
- `payments` table: thêm cột `job_id`, `storage_code`, `bank_name`,
  `account_number`, `qr_image_url` (migration 008) — khớp
  CWS_DATABASE_SCHEMA.md (trước đây bảng này thiếu hết các field liên
  kết tới job). `transferContent` giờ đúng định dạng
  `"CWS {storage_code} {payment_code}"` (trước chỉ có payment_code).
- `POST /payments/webhook`: giờ đối chiếu CẢ `storage_code` lẫn
  `payment_code` + số tiền (CWS_MVP_WORKFLOW_FINAL.md: "Kiểm tra
  payment_code. Kiểm tra storage_code.") — trước chỉ kiểm tra payment_code
  + số tiền.
- Trạng thái job `awaiting_payment` — tận dụng đúng giá trị đã có sẵn
  trong CHECK constraint của `render_orders.status` (migration 006 đã
  thêm sẵn nhưng chưa từng được code TypeScript dùng tới).
- Frontend: bỏ hẳn màn Payment TRƯỚC khi render (SCREEN.PAYMENT cũ) —
  Payment giờ là 1 trạng thái con của Processing
  (`job.status === 'awaiting_payment'`), hiển thị QR + tự động chuyển
  tiếp khi webhook xác nhận, không còn nút "Xác nhận thanh toán" thủ
  công nào (đúng "Webhook tự xác nhận" — Frontend không tự đặt PAID).
  Xóa `usePayment.js`/`PaymentMethodPicker` (dead code sau khi bỏ màn
  Payment độc lập — MVP chỉ có 1 phương thức nên không cần picker).

### Sửa mismatch khác phát hiện cùng đợt audit
- **"Tạo Job" thiếu Phần mềm/Phiên bản/Ghi chú** — CWS_MVP_WORKFLOW_FINAL.md
  ghi rõ khách nhập "Tên dự án. Phần mềm. Phiên bản. ... Ghi chú." lúc
  tạo job, nhưng `render_orders` không có cột nào lưu 3 thông tin này.
  Đã thêm `software`/`software_version`/`notes` (migration 009,
  `CreateJobDto`, `RenderOrder`, UploadScreen.jsx) — không bắt buộc,
  chỉ là thông tin tham khảo.
- **Admin thiếu "Danh sách khách hàng" + "Tìm kiếm theo Customer"** —
  CWS_ROADMAP_MVP_V1.md, Giai đoạn 7 liệt kê rõ cả 2 mục này nhưng
  Backend chưa từng có `CustomersController`/route nào, `AdminScreen.jsx`
  chỉ có bảng Job + tìm theo Storage Code/Payment Code. Đã thêm
  `GET /customers` (AdminKeyGuard), bảng "Khách hàng" +  ô tìm theo
  tên/email/id trong `AdminScreen.jsx` (lọc luôn cả bảng Job theo
  customer được chọn). `customerId` cũng được thêm vào response của
  `GET /jobs`/`GET /jobs/:id` để admin đối chiếu.
- **Thiếu "Direct Link"** — CWS_MVP_WORKFLOW_FINAL.md, mục "Tạo Job"
  liệt kê 4 nguồn: "Google Drive. OneDrive. Dropbox. Direct Link."
  nhưng `SHARED_LINK_PATTERNS` (Portal) chỉ chấp nhận 3 nguồn đầu, từ
  chối mọi URL khác. Đã thêm `DIRECT_LINK_PATTERN` (catch-all bất kỳ
  URL `https://` nào) làm nguồn thứ 4 — Backend (`google-drive.service.ts`)
  đã sẵn xử lý an toàn URL không phải Google Drive từ trước (trả
  `fileName`/`fileSizeBytes` = `null`, không bịa dữ liệu), không cần
  sửa gì phía Backend.
- **Admin thiếu "Worker" + "Preview"** — CWS_MVP_WORKFLOW_FINAL.md, mục
  Admin liệt kê cả 2 mục này trong danh sách theo dõi. Đã thêm
  `GET /fleet/workers` (mới, `AdminKeyGuard`, CHỈ đọc bảng `workers` nội
  bộ — không can thiệp Worker Fleet) + bảng "Worker Fleet" trong
  `AdminScreen.jsx`. Xem Preview: `GET /jobs/:id/preview` đã có sẵn
  (route công khai, không cần guard) nhưng chưa có UI Admin nào gọi tới
  — đã thêm nút "Xem" mở modal hiển thị ảnh preview ngay trong
  `AdminScreen.jsx`.

### Migration 010 — sửa cảnh báo performance (get_advisors)
- 7 RLS policy (migration 007) re-evaluate `auth.uid()` mỗi row thay vì
  `(select auth.uid())` — đã sửa theo khuyến nghị chính thức Supabase,
  KHÔNG đổi hành vi logic (`auth_rls_initplan` advisory).
- Thêm index còn thiếu cho `downloads.customer_id`, `notifications.job_id`
  (`unindexed_foreign_keys` advisory). KHÔNG sửa cảnh báo tương tự trên
  `fleets`/`machine_capability` — bảng Worker Fleet, ngoài phạm vi.

## [1.2.0] - Supabase Auth + RLS + VietQR + Admin Dashboard (2026-07-30)

### Thêm mới
- Facebook Login chuyển hoàn toàn sang Supabase Auth built-in OAuth
  (`supabase.auth.signInWithOAuth({ provider: 'facebook' })`) — Backend
  không tự code OAuth strategy nào, không nhận/xử lý mật khẩu Facebook.
  Trigger Postgres `handle_new_auth_user()` tự tạo/cập nhật
  `customer_profiles` khi có user mới (ON CONFLICT tránh trùng hồ sơ
  khi đăng nhập lại). `customer_profiles.id` giờ = `auth.users.id`.
- RLS owner-scoped bật cho customer_profiles/render_orders/payments/
  sites/machine_capability/review_images/downloads/notifications —
  khách chỉ đọc được dữ liệu của chính mình (`auth.uid()`); Backend
  (service_role) không bị ảnh hưởng. `get_advisors(security)` xác nhận
  không còn ERROR nào trên các bảng MVP.
- `AdminKeyGuard` (shared secret qua header `x-admin-key`): khóa
  `GET /jobs` (khi gọi ẩn danh), `GET /jobs/by-storage-code/:code`,
  `GET /payments/by-code/:code` — trước đây các route này công khai
  hoàn toàn.
- Ảnh QR MB Bank thật (`img.vietqr.io`, BIN `970422`) khi đã cấu hình
  `MB_BANK_ACCOUNT_NUMBER`/`MB_BANK_ACCOUNT_NAME` — trước chỉ hiển thị
  text placeholder.
- Admin Dashboard tối giản (`AdminScreen.jsx`, chỉ vào qua `#admin`,
  không có link nào từ UI khách hàng) — list job, tra cứu theo storage
  code/payment code.
- "Yêu cầu chỉnh sửa" trong Review flow: `POST /jobs/:id/request-changes`
  ghi notification + worker_log, KHÔNG đổi status/tiền — job vẫn
  `review_ready`, khách vẫn duyệt được nếu đổi ý. Re-render/hoàn tiền
  thật là quyết định nghiệp vụ, admin xử lý thủ công sau khi nhận yêu cầu.

### Giới hạn còn lại (ghi rõ, không che giấu)
- Facebook Provider CHƯA bật thật trong Supabase Dashboard (cần App
  ID/Secret thật — chỉ người dùng làm được).
- Webhook thật từ MB Bank chưa nối (route `/payments/webhook` đã sẵn
  sàng, chờ cấu hình phía ngân hàng/cổng trung gian).
- Supabase service-role key và B2 application key từng lộ trong
  `.env.example` cũ — cần xác nhận đã rotate trên dashboard.
- Toàn bộ UI (đặc biệt `AdminScreen.jsx`, `ReviewScreen.jsx`) chưa được
  xác nhận bằng mắt trên trình duyệt thật.

## [1.1.0] - MVP alignment pass (2026-07-30)

### Thêm mới
- customer_profiles + storage_objects + review_images + downloads +
  worker_logs + notifications: 6 bảng còn thiếu trong
  CWS_DATABASE_SCHEMA.md, đầy đủ repository/service (migration 005/006).
- Preview/approval gate thật: JobStatus.REVIEW_READY chèn giữa
  RENDERING và PACKAGING — Worker render xong chỉ tạo 3-5 ảnh preview
  có watermark thật ("CWS RENDER", qua sharp), KHÔNG tự đóng gói/mở
  tải nữa. Chỉ `POST /jobs/:id/approve` mới đóng gói + mở `downloadUrl`.
- `GET /jobs/:id/download`: ghi log bảng `downloads` rồi redirect sang
  B2 — Portal không còn dùng thẳng `downloadUrl` raw.
- Payment webhook thật: `QrBankProvider` sinh `payment_code` +
  `transferContent` ("CWS {code}"); `POST /payments/webhook` là đường
  DUY NHẤT set PAID (đối chiếu nội dung + số tiền khớp). `confirm()`
  trực tiếp không còn set PAID được nữa cho qr_bank.
- Phát hiện task render thất bại vĩnh viễn → chuyển job sang ERROR +
  ghi `worker_logs` (trước đây job treo im lặng, không ai biết).
- `storage_code` (dạng `CWS-XXXXXXXX`) sinh tự động khi tạo job, tra
  cứu qua `GET /jobs/by-storage-code/:code` và
  `GET /payments/by-code/:code` (Giai đoạn 7).
- Chấp nhận link chia sẻ OneDrive/Dropbox ngoài Google Drive (validate
  cú pháp; chỉ Google Drive có kiểm tra quyền/metadata thật qua API).
- GitHub Actions CI: build+test backend, build+lint frontend.

### Xóa
- Wallet, Stripe, PayPal: gỡ hoàn toàn khỏi `PaymentMethod` enum,
  `PaymentsService`, `PaymentsModule`, `renderConstants.js` — MVP chỉ
  dùng MB Bank QR (`qr_bank`).

### Giới hạn còn lại (ghi rõ, không che giấu — ĐÃ FIX ở [1.2.0] phía trên, giữ nguyên đoạn dưới làm lịch sử)
- QR MB Bank vẫn là placeholder text, chưa có ảnh VietQR quét được —
  cần số tài khoản/BIN thật (business info) để nối cổng thật.
- Facebook Login: hoàn toàn chưa implement — cần FACEBOOK_APP_ID/SECRET
  thật. `customer_profiles` module đã có sẵn (upsertByFacebookId) chờ
  wire vào OAuth strategy.
- RLS đang tắt trên render_orders/payments/sites/machine_capability —
  cần quyết định + viết policy trước khi bật (bật sai sẽ chặn hết
  truy cập).
- `GET /jobs` và các route tra cứu Giai đoạn 7 (by-storage-code,
  by-code, logs, notifications) CHƯA có xác thực — chỉ nên dùng nội bộ,
  KHÔNG build UI admin công khai cho tới khi có auth (JwtAuthGuard đã
  có sẵn trong `common/guards/`, chưa áp dụng).
- "Yêu cầu chỉnh sửa" (khách từ chối preview) chưa implement, chỉ có
  approve.

## [1.0.0] - CWS Backend - Phase 1 (Initial Implementation)

### Thêm mới
- NestJS Backend hoàn chỉnh thay thế mockBackend.js phía Portal —
  khớp chính xác API Contract Portal đã tự định nghĩa sẵn
  (RenderService.js, apiConfig.js).
- Jobs Module: tạo/đọc/hủy render order, tự động dispatch sang Worker
  Fleet qua bảng jobs/tasks có sẵn (KHÔNG sửa cws_worker_full.py).
- Payments Module: Strategy Pattern cho Wallet/QR Bank (placeholder,
  ghi rõ giới hạn - chưa nối cổng thanh toán thật).
- Files Module: upload thật lên Backblaze B2, resolve metadata Google
  Drive thật (qua Drive API v3, tùy chọn), phát hiện sớm lỗi link
  folder (bài học từ sự cố CWS-JOB5 thật trong quá trình phát triển).
- Realtime Module: bridge WebSocket sang Supabase Realtime - Portal
  nhận cập nhật trạng thái job theo thời gian thực.
- Scheduler Module:
  - Model 1 (ưu tiên Worker Online): tận dụng cơ chế claim_task() sẵn
    có của Worker Fleet, Backend chỉ đọc lại trạng thái để cập nhật
    status tường thuật cho khách.
  - Model 2 (Wake mở rộng): tìm máy Sleep có Wake Capability khi thiếu
    Worker online - hiện luôn thất bại có kiểm soát (NoopWakeProvider)
    vì cws_worker_full.py chưa có cơ chế relay Magic Packet, job tự
    rơi vào Queue đúng thiết kế, không retry vô hạn.
  - Tự động tạo các task còn lại sau khi biết total_frames từ Scene
    Analyzer (tự động hoá việc Dy từng làm tay cho job CWS-JOB5).
  - Tự động đóng gói kết quả (frame PNG) thành file .zip khi mọi task
    hoàn thành.
- 4 bảng Supabase mới: render_orders, payments, sites,
  machine_capability - KHÔNG sửa bảng jobs/tasks/workers hiện có.
- Repository Pattern (interface + Supabase implementation) cho toàn bộ
  data access, Dependency Injection nhất quán, TypeScript Strict Mode.
- Unit test cho logic quan trọng nhất: phát hiện link folder Google
  Drive, tính ETA/giá theo Render Profile.

### Giới hạn đã biết (ghi rõ, không che giấu)
- Upload File trực tiếp: Worker Fleet chưa tải được từ B2, chỉ nhánh
  Google Drive hoạt động end-to-end.
- Đóng gói kết quả: chỉ tạo file .zip chứa frame PNG, chưa tự động
  dựng video MP4.
- Thanh toán: Wallet/QR Bank là placeholder, chưa nối cổng thật.
- Wake System: chưa có cơ chế Wake thật (cần mở rộng Worker, thay đổi
  Foundation cần quyết định riêng).
- GET /jobs chưa phân quyền theo khách hàng (Portal chưa có đăng nhập).
