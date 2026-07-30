# CODEX 3 CHECKLIST

## Vai trò

Customer Workflow • Worker • Payment • Dashboard

---

# Phase 1 - Workflow Audit

- [x] So sánh với CWS_MVP_WORKFLOW_FINAL.md — MISMATCH lớn: codebase hiện tại implement 1 sản phẩm "render farm/worker fleet marketplace" (RENDER_PROFILES economy/standard/priority/turbo, worker-fleet.gateway, scheduler/wake) khác hẳn luồng đơn giản trong roadmap (Facebook Login → Job từ link chia sẻ → B2 → Worker render → preview → MB QR → COMPLETED). Chi tiết theo từng mục bên dưới.
- [x] Kiểm tra Facebook Login — TRƯỚC: MISSING hoàn toàn. Đã dựng đủ 2 phía: Backend (`backend/src/auth`: GET /auth/facebook, GET /auth/facebook/callback, issue JWT, upsert customer_profiles) và Frontend (LoginScreen.jsx, useAuth.js, AuthService.js — nút "Đăng nhập với Facebook", bắt `?token=` sau redirect, mock login demo khi chưa có Backend thật). VẪN BLOCKED: cần FACEBOOK_APP_ID/SECRET thật để hoạt động thật; JobsService.createOrder CHƯA nhận/lưu customer_id (token hiện chỉ lưu ở Portal, chưa gửi kèm request nào).
- [ ] Kiểm tra Customer Profile — backend/src/customers đã có (upsertByFacebookId), nhưng chưa có gì gắn customer_id vào job (JobsService.createOrder chưa nhận/lưu customer_id).
- [ ] Kiểm tra Create Job — vẫn dùng model RenderProfile/economy-standard-priority-turbo, chưa có project_name/software/software_version tách riêng như CWS_DATABASE_SCHEMA.md.
- [x] Kiểm tra Shared Link — Đã hỗ trợ Google Drive/OneDrive/Dropbox (SHARED_LINK_PATTERNS). Direct Link (URL bất kỳ) vẫn chưa hỗ trợ.
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

- [x] Dashboard Customer — History Screen hiện có (lọc theo customer khi đăng nhập).
- [x] Dashboard Admin — AdminScreen.jsx tối giản (bảng job + tìm theo storage_code/payment_code), chỉ vào qua #admin, bảo vệ bằng x-admin-key (AdminKeyGuard). Không polish UI (chưa xem bằng mắt), chỉ đảm bảo đúng chức năng + có bảo vệ.
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
- worker-fleet.gateway.ts + scheduler: đã xác nhận KEEP (hạ tầng Worker render bắt buộc cho MVP, không phải Marketplace bị cấm).

---

# Risks

- Toàn bộ luồng hiện tại xây trên domain "render farm" (RenderProfile, worker fleet) thay vì domain MVP (Customer/Job/Storage Code) — rủi ro lớn nhất của cả dự án, ảnh hưởng mọi Codex. Đã ghi chi tiết ở CODEX_2_CHECKLIST.md phần Risks.
- (ĐÃ FIX) confirm() từng cho phép giả mạo PAID trực tiếp — giờ QrBankProvider.confirm() luôn throw, chỉ POST /payments/webhook mới set PAID được.

---

# Blockers

- Facebook App ID/Secret thật (điền vào Supabase Dashboard, không phải env Backend nữa), MB Bank account number thật, rotate Supabase/B2 secret đã lộ, ADMIN_API_KEY thật cho production — tất cả cần bạn cung cấp/thao tác trên dashboard, không tự làm tiếp được.

---

# Next Task

Code MVP coi như đã xong hết phần tự làm được không cần credential (xem PR #6/#7/#8). Còn lại hoàn toàn phụ thuộc:
1. Bạn bật Facebook Provider trong Supabase Dashboard.
2. Bạn rotate 2 secret đã lộ.
3. Bạn điền số tài khoản MB Bank thật + ADMIN_API_KEY thật vào env Render.
4. Bạn (hoặc phiên có browser tool) xác nhận toàn bộ UI bằng mắt, đặc biệt AdminScreen.jsx và ReviewScreen.jsx mới chưa từng được xem qua trình duyệt thật.
5. Merge PR #6/#7/#8 vào main.

"Yêu cầu chỉnh sửa" preview flow đã code xong (ghi nhận yêu cầu, không đụng nghiệp vụ). Sau khi có 1 trong các mục trên, việc còn lại chỉ là polish UI + xác nhận UI bằng mắt.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

tiếp

→ tiếp tục mục Pending đầu tiên.
