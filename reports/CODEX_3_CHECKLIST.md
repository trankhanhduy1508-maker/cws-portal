# CODEX 3 CHECKLIST

## Vai trò

Customer Workflow • Worker • Payment • Dashboard

---

# Phase 1 - Workflow Audit

- [x] So sánh với CWS_MVP_WORKFLOW_FINAL.md — MISMATCH lớn: codebase hiện tại implement 1 sản phẩm "render farm/worker fleet marketplace" (RENDER_PROFILES economy/standard/priority/turbo, worker-fleet.gateway, scheduler/wake) khác hẳn luồng đơn giản trong roadmap (Facebook Login → Job từ link chia sẻ → B2 → Worker render → preview → MB QR → COMPLETED). Chi tiết theo từng mục bên dưới.
- [ ] Kiểm tra Facebook Login — ❌ MISSING. Không có route/service nào cho Facebook OAuth ở cả frontend (src/) lẫn backend (backend/src). Đây là bước đầu tiên của Definition of Done nên là BLOCKER ưu tiên cao nhất.
- [ ] Kiểm tra Customer Profile — phụ thuộc Facebook Login nên cũng chưa có (không có bảng/entity customer_profiles, chỉ có domain render-order).
- [ ] Kiểm tra Create Job — hiện tại luồng là "chọn Render Profile + Upload file .blend hoặc dán Google Drive link" (RenderProfileScreen, UploadScreen) — có phần dán Google Drive link (đạt 1 phần), nhưng không có project_name/software/software_version như CWS_DATABASE_SCHEMA.md yêu cầu, và không hỗ trợ OneDrive/Dropbox.
- [ ] Kiểm tra Shared Link — GOOGLE_DRIVE_LINK_PATTERN chỉ nhận Google Drive; roadmap yêu cầu cả OneDrive/Dropbox/Direct Link.
- [x] Kiểm tra Google Drive Permission — backend/src/files/google-drive.service.ts có kiểm tra quyền truy cập (resolve-drive.dto, google-drive.service.spec.ts có test). Phần này KEEP, đáng giữ lại.
- [ ] Kiểm tra Upload Flow — có UploadZone/UploadScreen nhưng đích cuối là B2 qua RenderService, cần xác minh có thật sự ghi vào cấu trúc jobs/{storage_code}/source|review|final|logs hay không (backend/src/files/b2-storage.service.ts cần audit sâu hơn — chưa xem chi tiết).

---

# Phase 2 - Worker

- [ ] Kiểm tra Worker nhận Job
- [ ] Kiểm tra Render
- [ ] Kiểm tra Progress %
- [ ] Kiểm tra Worker Error
- [ ] Kiểm tra Upload Final
- [ ] Kiểm tra Upload Preview

---

# Phase 3 - Preview

- [x] Kiểm tra Video Preview — không dùng video preview (đúng MVP, "Không thuộc MVP: Video preview đầy đủ").
- [x] Kiểm tra 3-5 Frame — TRƯỚC: không có, render xong lộ thẳng final zip. Đã fix: PreviewService chọn 3-5 frame cách đều, StorageService.publishReviewImages ép buộc đúng 3-5 ảnh.
- [x] Kiểm tra Watermark — TRƯỚC: PreviewDownloadScreen.jsx chỉ có 1 div watermark tĩnh trang trí, không phải watermark thật trên ảnh. Đã fix: watermark.util.ts (sharp) chèn "CWS RENDER" lặp chéo thật vào từng ảnh preview.
- [x] Kiểm tra Review Flow — TRƯỚC: KHÔNG có, render xong = có link tải final ngay (vi phạm nghiêm trọng "khách chỉ xem preview, chưa được tải file gốc"). Đã fix: thêm JobStatus.REVIEW_READY chặn giữa RENDERING và PACKAGING; chỉ khi khách gọi POST /jobs/:id/approve mới đóng gói + mở downloadUrl. Xem PR #8 (nhánh codex/storage-review-images).

---

# Phase 4 - Payment

- [x] Kiểm tra MB QR — TRƯỚC: mock setTimeout, không QR thật. Đã fix: QrBankProvider sinh payment_code + transfer_content ("CWS {code}") thật. VẪN THIẾU: số tài khoản MB Bank thật (business info) nên chưa dựng được ảnh VietQR quét được — hiện chỉ hiển thị nội dung chuyển khoản dạng text ở PaymentScreen.
- [x] Kiểm tra Webhook — TRƯỚC: MISSING, confirm() tự set PAID không kiểm tra gì. Đã fix: POST /payments/webhook xác nhận theo content+amount khớp payment_code, là đường DUY NHẤT set PAID. QrBankProvider.confirm() giờ luôn throw. Xem PR #6.
- [x] Kiểm tra Payment Status — enum PAID/UNPAID/PROCESSING/FAILED đã khớp CWS_DATABASE_SCHEMA.md.
- [x] Kiểm tra Delivery — GET /jobs/:id/download ghi log rồi redirect sang B2, thay vì lộ downloadUrl raw không kiểm soát được. Xem PR #7.
- [x] Kiểm tra Download — bảng `downloads` đã tạo (migration 005) + có StorageService.logDownload ghi mỗi lượt tải.

---

# Phase 5 - Dashboard

- [ ] Dashboard Customer
- [ ] Dashboard Admin
- [ ] Job Detail
- [ ] Payment Detail
- [ ] Download History

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
- Cleanup: xóa Stripe/PayPal/Wallet khỏi payment layer. Chỉ còn QR_BANK (MB Bank). Payment webhook thật (payment_code/transfer_content, POST /payments/webhook) — xem PR #6.
- Preview/approval gate: REVIEW_READY status + POST /jobs/:id/approve + GET /jobs/:id/preview + watermark thật (sharp) + GET /jobs/:id/download có ghi log. Backend + Frontend đã nối đủ đầu-cuối (ReviewScreen.jsx mới). mockBackend.js cũng dừng thật ở REVIEW_READY. Xem PR #7.

---

# In Progress

- Chưa audit sâu: Upload Flow → B2 (cấu trúc jobs/{storage_code}/...), Delivery, Download.

---

# Pending

- CHƯA test bằng mắt trên trình duyệt thật cho toàn luồng Upload → Profile → Payment → Render → Review → Approve → Download (không có công cụ browser trong phiên này).
- Facebook Login (BLOCKER lớn nhất — chưa có dòng code nào, cần FACEBOOK_APP_ID/SECRET thật). Customer Profile phụ thuộc việc này.
- QR MB Bank thật cần số tài khoản/BIN thật (business info) để dựng ảnh VietQR quét được — hiện chỉ có nội dung chuyển khoản dạng text.
- "Yêu cầu chỉnh sửa" (khách từ chối preview) — chưa implement (hiện chỉ có approve, chưa có reject/re-render).
- Dashboard Admin UI (Giai đoạn 7) — API đã đủ (listAll, by-storage-code, by-code payment, logs, notifications, preview) nhưng CHƯA có màn hình admin nào ở frontend.
- worker-fleet.gateway.ts + scheduler: đã xác nhận KEEP (hạ tầng Worker render bắt buộc cho MVP, không phải Marketplace bị cấm).

---

# Risks

- Toàn bộ luồng hiện tại xây trên domain "render farm" (RenderProfile, worker fleet) thay vì domain MVP (Customer/Job/Storage Code) — rủi ro lớn nhất của cả dự án, ảnh hưởng mọi Codex. Đã ghi chi tiết ở CODEX_2_CHECKLIST.md phần Risks.
- (ĐÃ FIX) confirm() từng cho phép giả mạo PAID trực tiếp — giờ QrBankProvider.confirm() luôn throw, chỉ POST /payments/webhook mới set PAID được.

---

# Blockers

- Không có Facebook App ID/Secret, Supabase credential, MB Bank/webhook credential trong môi trường này — mọi việc liên quan cần các secret này sẽ dừng ở mức code-only (CLOUD_VERIFICATION_REQUIRED) cho đến khi được cung cấp.

---

# Next Task

Đã xong (không cần credential): payment verification, webhook thật, preview/approval gate, download logging, CI, storage_code sinh tự động + tra cứu admin theo storage_code/payment_code, worker_logs (phát hiện task failed → chuyển ERROR + log), notifications (review-ready/error), OneDrive/Dropbox link support, cleanup toàn bộ tính năng ngoài MVP (xác nhận N/A cho MoMo/Google Login/OTP/Zalo/AI ETA/Marketplace).

Còn lại không bị block: Dashboard Admin UI (frontend, cần thiết kế màn hình mới — rủi ro cao nếu làm mù không xem được UI thật); "yêu cầu chỉnh sửa" (reject preview) flow.

Bị block chờ người dùng: Facebook Login (FACEBOOK_APP_ID/SECRET), QR MB Bank thật (số tài khoản/BIN), RLS (quyết định + policy), rotate secret đã lộ, xác nhận UI bằng mắt (không có browser tool phiên này).

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

tiếp

→ tiếp tục mục Pending đầu tiên.
