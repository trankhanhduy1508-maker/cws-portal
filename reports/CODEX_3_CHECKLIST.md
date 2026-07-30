# CODEX 3 CHECKLIST

## Vai trò

Customer Workflow • Worker • Payment • Dashboard

---

# Phase 1 - Workflow Audit

- [x] So sánh với CWS_MVP_WORKFLOW_FINAL.md — MISMATCH lớn: codebase hiện tại implement 1 sản phẩm "render farm/worker fleet marketplace" (RENDER_PROFILES economy/standard/priority/turbo, worker-fleet.gateway, scheduler/wake) khác hẳn luồng đơn giản trong roadmap (Facebook Login → Job từ link chia sẻ → B2 → Worker render → preview → MB QR → COMPLETED). Chi tiết theo từng mục bên dưới.
- [x] Kiểm tra Facebook Login — TRƯỚC: MISSING hoàn toàn. Đã dựng đủ 2 phía: Backend (`backend/src/auth`: GET /auth/facebook, GET /auth/facebook/callback, issue JWT, upsert customer_profiles) và Frontend (LoginScreen.jsx, useAuth.js, AuthService.js — nút "Đăng nhập với Facebook", bắt `?token=` sau redirect, mock login demo khi chưa có Backend thật). VẪN BLOCKED: cần FACEBOOK_APP_ID/SECRET thật để hoạt động thật; JobsService.createOrder CHƯA nhận/lưu customer_id (token hiện chỉ lưu ở Portal, chưa gửi kèm request nào).
- [x] Kiểm tra Customer Profile — ĐÃ FIX (sau pivot Supabase Auth): `JobsController.create()` gọi `getOptionalCustomerId()` rồi truyền vào `JobsService.createOrder(dto, customerId)`, lưu vào cột `render_orders.customer_id` (repository `render-orders.repository.supabase.ts`). `findByCustomerId()` dùng để lọc `GET /jobs` theo khách đăng nhập. Không còn gap.
- [x] Kiểm tra Create Job — VẪN dùng model RenderProfile (economy/standard/priority/turbo) thay vì tách hẳn thành bảng "jobs" riêng — CÓ CHỦ Ý CHẤP NHẬN (RenderProfile gắn chặt với Worker Fleet, đổi model đồng nghĩa đổi cách dispatch task, ngoài phạm vi "không đụng Worker Fleet"). NHƯNG đã fix phần thật sự thiếu: `software`/`softwareVersion`/`notes` (CWS_MVP_WORKFLOW_FINAL.md, mục "Tạo Job") trước đây KHÔNG có trường nào lưu — đã thêm migration 009 + CreateJobDto + UploadScreen.jsx (audit cuối 2026-07-30).
- [x] Kiểm tra Shared Link — Đã hỗ trợ đủ 4 nguồn CWS_MVP_WORKFLOW_FINAL.md yêu cầu: Google Drive/OneDrive/Dropbox/Direct Link (SHARED_LINK_PATTERNS, audit cuối 2026-07-30 thêm DIRECT_LINK_PATTERN — trước đó thiếu, từ chối mọi URL không khớp 3 pattern đầu).
- [x] Kiểm tra Google Drive Permission — backend/src/files/google-drive.service.ts có kiểm tra quyền truy cập (resolve-drive.dto, google-drive.service.spec.ts có test). Phần này KEEP, đáng giữ lại.
- [x] Kiểm tra Upload Flow — Đã audit `b2-storage.service.ts`: KHÔNG dùng cấu trúc `jobs/{storage_code}/source|review|final|logs` của CWS_DATABASE_SCHEMA.md. Thực tế dùng `uploads/{uuid}-{filename}` (upload gốc) và `renders/{internalJobId}/task_{id}/frame_N.png` (Worker Fleet ghi kết quả render) — path do `cws_worker_full.py` quyết định, Backend không tự đặt lại được nếu không đụng Worker. Cùng loại mismatch như "Create Job" ở trên — rủi ro đã biết, không phải thiếu sót mới.

---

# Phase 2 - Worker

Đã đọc kỹ `worker-fleet.gateway.ts` + `scheduler.service.ts` (KHÔNG sửa, chỉ audit — 2 file này là điểm nối Backend↔Worker Fleet, không phải Worker Fleet thật):

- [x] Kiểm tra Worker nhận Job — `WorkerFleetGateway.createInternalJobWithProbeTask()` insert 1 row `jobs` + 1 probe task (frame 1-1) vào bảng `tasks` ngay khi tạo RenderOrder; Worker Fleet (`cws_worker_full.py`, không sửa) tự `claim_task()` — Backend không cần push/gọi Worker trực tiếp.
- [x] Kiểm tra Render — `SchedulerService.tick()` (Cron 10s) đọc lại `tasks` qua `getTasks()`, khi probe task `done` + biết `total_frames` (do Worker tự ghi) thì tự tạo các task còn lại theo chunk (`createRemainingTasks`, chunk=10) — tự động hoá đúng quy trình tay đã làm cho CWS-JOB5.
- [x] Kiểm tra Progress % — `computeProgress()` = số task `done` / tổng số task, cập nhật vào `render_orders.stageProgress` mỗi tick khi có task `active` (trạng thái RENDERING) — là % thật dựa trên task Worker báo cáo, không phải số giả lập.
- [x] Kiểm tra Worker Error — khi mọi task đã `settled` (không còn active/queued) mà có task `failed` → `markFailed()`: ghi `worker_logs` cho từng task lỗi, chuyển order sang `ERROR`, gửi notification cho khách — không còn treo im lặng.
- [x] Kiểm tra Upload Final — khi `allDone` → `moveToReview()` gọi `PreviewService.generateReviewPreview()` rồi dừng ở `REVIEW_READY` (KHÔNG tự đóng gói/upload final) — đóng gói final thật chỉ xảy ra trong `JobsService.approve()` sau khi khách duyệt (đã audit ở Phase 3/4).
- [x] Kiểm tra Upload Preview — `PreviewService.generateReviewPreview()` (đã audit trước đó ở Phase 3) chọn 3-5 frame, chèn watermark thật qua `sharp`, publish vào bảng `review_images` — chạy ngay khi `allDone`, trước khi khách duyệt.

---

# Phase 3 - Preview

- [x] Kiểm tra Video Preview — không dùng video preview (đúng MVP, "Không thuộc MVP: Video preview đầy đủ").
- [x] Kiểm tra 3-5 Frame — TRƯỚC: không có, render xong lộ thẳng final zip. Đã fix: PreviewService chọn 3-5 frame cách đều, StorageService.publishReviewImages ép buộc đúng 3-5 ảnh.
- [x] Kiểm tra Watermark — TRƯỚC: PreviewDownloadScreen.jsx chỉ có 1 div watermark tĩnh trang trí, không phải watermark thật trên ảnh. Đã fix: watermark.util.ts (sharp) chèn "CWS RENDER" lặp chéo thật vào từng ảnh preview.
- [x] Kiểm tra Review Flow — TRƯỚC: KHÔNG có, render xong = có link tải final ngay (vi phạm nghiêm trọng "khách chỉ xem preview, chưa được tải file gốc"). Đã fix: thêm JobStatus.REVIEW_READY chặn giữa RENDERING và PACKAGING; chỉ khi khách gọi POST /jobs/:id/approve mới đóng gói + mở downloadUrl. Xem PR #8 (nhánh codex/storage-review-images).

---

# Phase 4 - Payment

- [x] Kiểm tra MB QR — QrBankProvider sinh payment_code + transfer_content thật, ảnh VietQR thật qua img.vietqr.io khi có MB_BANK_ACCOUNT_NUMBER.
- [x] Kiểm tra Webhook — POST /payments/webhook xác nhận theo storage_code + payment_code + amount khớp, là đường DUY NHẤT set PAID. QrBankProvider.confirm() luôn throw.
- [x] Kiểm tra Payment Status — enum PAID/UNPAID/PROCESSING/FAILED đã khớp CWS_DATABASE_SCHEMA.md.
- [x] Kiểm tra Delivery — GET /jobs/:id/download ghi log rồi redirect sang B2, thay vì lộ downloadUrl raw không kiểm soát được.
- [x] Kiểm tra Download — bảng `downloads` đã tạo (migration 005) + có StorageService.logDownload ghi mỗi lượt tải.
- [x] **[SỬA LỖI NGHIÊM TRỌNG — audit lần cuối 2026-07-30]** Kiểm tra thứ tự Thanh toán vs Render — PHÁT HIỆN: `POST /jobs` trước đây bắt buộc `paymentId` đã PAID mới tạo được job, tức là bắt khách trả tiền TRƯỚC KHI render — ngược hoàn toàn với CWS_MVP_WORKFLOW_FINAL.md/CWS_ROADMAP_MVP_V1.md (cả 2 đều ghi rõ: Job → Render → Preview → Khách duyệt → MỚI sinh QR → Webhook → PAID → Mở tải; render phải MIỄN PHÍ). Đây là mismatch lớn nhất từng bị bỏ sót trong toàn bộ dự án. Đã sửa toàn diện: `POST /jobs` không còn cần paymentId; `POST /jobs/:id/approve` mới sinh payment (trả `payment` trong response), chuyển job sang `awaiting_payment` (dùng đúng giá trị đã có sẵn trong CHECK constraint từ migration 006 nhưng chưa từng được code dùng); `SchedulerService` phát hiện PAID qua tick mới gọi `JobsService.finalizeDelivery()` để đóng gói + mở tải. `payments` table bổ sung job_id/storage_code/bank_name/account_number/qr_image_url (migration 008) để webhook đối chiếu được storage_code. Frontend: bỏ hẳn màn Payment đứng trước Processing, Payment giờ là trạng thái con của Processing, không còn nút "xác nhận thanh toán" thủ công. Xem `backend/CHANGELOG.md` mục [1.3.0] và `docs/MVP_GAP_REPORT.md`. Build/test/lint + boot thật (node dist/main.js) đã xác nhận PASS sau khi sửa.
- [x] **[BỔ SUNG theo yêu cầu người dùng, không phải sửa mismatch — 2026-07-30]** Giá thanh toán giờ tính THẬT theo runtime Worker (`PricingService`, tại `approve()`) thay vì dùng `estimate.costVnd` (ước tính trước render) — công thức `(runtime + 10 phút khởi động mỗi Worker) x 6.000đ/giờ x 2`. Xem `backend/CHANGELOG.md` mục [1.4.0].

---

# Phase 5 - Dashboard

- [x] Dashboard Customer — History Screen hiện có (lọc theo customer khi đăng nhập).
- [x] Dashboard Admin — AdminScreen.jsx (bảng Job kèm Customer/Tiến độ/nút xem Preview + bảng Khách hàng + bảng Worker Fleet, tìm theo storage_code/payment_code/customer — đủ 3 tiêu chí Giai đoạn 7 + đủ 7 mục "Admin theo dõi" của CWS_MVP_WORKFLOW_FINAL.md), chỉ vào qua #admin, bảo vệ bằng x-admin-key (AdminKeyGuard, kể cả GET /customers và GET /fleet/workers mới). Không polish UI (chưa xem bằng mắt), chỉ đảm bảo đúng chức năng + có bảo vệ.
- [x] Job Detail — GET /jobs/:id đã có đủ field (storage_code, status, payment, download).
- [x] Payment Detail — GET /payments/by-code/:code (admin), GET /payments/:id (khách tự poll).
- [x] Download History — bảng downloads + StorageService.logDownload(), chưa có UI riêng hiển thị lịch sử tải nhưng dữ liệu đã ghi đủ.

---

# Cleanup

- [x] Xóa Stripe — gỡ khỏi PaymentMethod enum (backend), PAYMENT_METHOD/PAYMENT_METHODS (frontend). Đã ở trạng thái disabled từ trước, giờ xóa hẳn.
- [x] Xóa PayPal — tương tự Stripe.
- [x] Xóa Wallet (Ví CWS) — KHÔNG có trong danh sách cleanup gốc nhưng PHÁT HIỆN THÊM: Wallet đang `available: true` và có WalletProvider thật (dù confirm() giả), vi phạm "Chỉ dùng: MB Bank QR". Đã xóa WalletProvider, gỡ khỏi PaymentsModule/PaymentsService/renderConstants.js. Đã thêm migration 004 để giới hạn DB constraint (chưa apply, CLOUD_VERIFICATION_REQUIRED).
- [x] Xóa MoMo — grep toàn bộ src/ + backend/src/ (case-insensitive): không có dòng code nào. N/A, không cần xóa gì.
- [x] Xóa Google Login — grep xác nhận: không có code nào. N/A.
- [x] Xóa OTP — grep xác nhận: không có code nào. N/A.
- [x] Xóa Zalo Login — grep xác nhận: không có code nào. N/A.
- [x] Xóa AI ETA/AI Pricing — grep xác nhận: không có code nào. RENDER_PROFILES chỉ dùng hệ số tĩnh (durationMultiplier/costMultiplier), không phải AI. N/A.
- [x] Xóa Marketplace — grep xác nhận: không có code Marketplace (nhiều vendor/nhiều bên bán). worker-fleet.gateway.ts + scheduler là hạ tầng render nội bộ (Worker Fleet) — điều kiện BẮT BUỘC để MVP thực hiện được bước "Worker render", không phải tính năng Marketplace bị cấm. KEEP.

---

# End-to-End Test

- [ ] Facebook Login
- [ ] Create Job
- [ ] Upload
- [ ] Render
- [ ] Preview
- [ ] Payment
- [ ] Download

---

# Completed

- Audit Phase 1 + Phase 4 (Payment): so sánh workflow thật với CWS_MVP_WORKFLOW_FINAL.md, ghi rõ từng mismatch.
- Cleanup: xóa Stripe/PayPal/Wallet khỏi payment layer. Chỉ còn QR_BANK (MB Bank). Payment webhook thật (payment_code/transfer_content, POST /payments/webhook).
- Preview/approval gate: REVIEW_READY status + POST /jobs/:id/approve + GET /jobs/:id/preview + watermark thật (sharp) + GET /jobs/:id/download có ghi log. Backend + Frontend đã nối đủ đầu-cuối. mockBackend.js cũng dừng thật ở REVIEW_READY.
- Facebook Login qua Supabase Auth OAuth chuẩn (KHÔNG tự làm form/OAuth thủ công) — trigger Postgres tự tạo customer_profiles, Backend xác thực token qua supabase.auth.getUser(). Frontend: LoginScreen + useAuth + logout, History chỉ khách đăng nhập mới xem được.
- RLS: bật cho render_orders/payments/sites/machine_capability, policy owner-scoped đơn giản (auth.uid() = customer_id) cho render_orders/review_images/downloads/notifications — không enterprise.
- VietQR thật: QrBankProvider dựng ảnh QR quét được qua img.vietqr.io khi có MB_BANK_ACCOUNT_NUMBER — chỉ thiếu số tài khoản thật.
- AdminKeyGuard: khóa GET /jobs (ẩn danh), /jobs/by-storage-code, /payments/by-code bằng x-admin-key — đã kiểm chứng runtime (401/401/pass-through đúng như kỳ vọng).
- Dashboard Admin tối giản (AdminScreen.jsx qua #admin).
- Tự sửa 1 lỗi Rules of Hooks do chính mình gây ra lúc nối Admin route vào App.jsx (phát hiện + fix trước khi commit).

---

# Pending

- CHƯA test bằng mắt trên trình duyệt thật cho toàn bộ UI (không có công cụ browser trong phiên này) — bao gồm cả AdminScreen.jsx và ReviewScreen.jsx (kể cả nút "Yêu cầu chỉnh sửa" mới).
- End-to-End Test (Facebook Login/Create Job/Upload/Render/Preview/Payment/Download) — cần Backend deploy thật + Facebook Provider bật + trình duyệt thật, không tự làm được trong môi trường này.

---

# Risks

- Toàn bộ luồng hiện tại xây trên domain "render farm" (RenderProfile, worker fleet) thay vì domain MVP (Customer/Job/Storage Code) — rủi ro lớn nhất của cả dự án, ảnh hưởng mọi Codex. Đã ghi chi tiết ở CODEX_2_CHECKLIST.md phần Risks.
- (ĐÃ FIX) confirm() từng cho phép giả mạo PAID trực tiếp — giờ QrBankProvider.confirm() luôn throw, chỉ POST /payments/webhook mới set PAID được.

---

# Blockers

- Facebook App ID/Secret thật (điền vào Supabase Dashboard, không phải env Backend nữa), MB Bank account number thật, rotate Supabase/B2 secret đã lộ, ADMIN_API_KEY thật cho production — tất cả cần bạn cung cấp/thao tác trên dashboard, không tự làm tiếp được.

---

# Next Task

Audit toàn diện lần cuối (2026-07-30) đã xong — xem báo cáo đầy đủ
DONE/PARTIAL/BLOCKED tại `docs/MVP_GAP_REPORT.md`. Code MVP coi như đã
xong hết phần tự làm được không cần credential, kể cả mismatch thanh
toán nghiêm trọng vừa phát hiện + sửa. Còn lại hoàn toàn phụ thuộc:
1. Bạn bật Facebook Provider trong Supabase Dashboard.
2. Bạn rotate 2 secret đã lộ (Supabase service_role, B2 application key).
3. Bạn điền số tài khoản MB Bank thật + ADMIN_API_KEY thật vào env Render.
4. Bạn (hoặc phiên có browser tool) xác nhận toàn bộ UI bằng mắt.

**Đã merge vào `main` (2026-07-30, theo yêu cầu người dùng)** —
`codex/storage-review-images` (đã bao gồm `codex/mvp-payment-qr-only`)
+ `codex/ci-workflow`, build/test/lint PASS trên `main` sau merge, đã
push GitHub. Chi tiết xem CODEX_1_CHECKLIST.md.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

tiếp

→ tiếp tục mục Pending đầu tiên.
