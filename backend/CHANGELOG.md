# Changelog

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

### Giới hạn còn lại (ghi rõ, không che giấu)
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
