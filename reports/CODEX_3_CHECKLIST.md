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

- [ ] Kiểm tra Video Preview
- [ ] Kiểm tra 3-5 Frame
- [ ] Kiểm tra Watermark
- [ ] Kiểm tra Review Flow

---

# Phase 4 - Payment

- [ ] Kiểm tra MB QR — QrBankProvider (backend) hiện là MOCK: `confirm()` tự setTimeout rồi trả PAID, không có QR ảnh/URL thật, không tích hợp MB Bank thật. Cần thay bằng tạo QR thật + webhook thật.
- [ ] Kiểm tra Webhook — ❌ MISSING. Không tìm thấy endpoint webhook nào nhận xác nhận chuyển khoản (kiểm tra amount/content/payment_code/storage_code theo CWS_MVP_WORKFLOW_FINAL.md). `confirm()` hiện được gọi trực tiếp (có thể từ frontend) — VI PHẠM nguyên tắc "Frontend không được tự đặt Payment = PAID".
- [x] Kiểm tra Payment Status — enum PAID/UNPAID/PROCESSING/FAILED đã khớp CWS_DATABASE_SCHEMA.md.
- [ ] Kiểm tra Delivery — chưa audit (cần xem PreviewDownloadScreen.jsx + OutputService.js kỹ hơn ở lượt sau).
- [ ] Kiểm tra Download — bảng `downloads` (log lịch sử tải) trong CWS_DATABASE_SCHEMA.md không tồn tại ở migrations hiện tại.

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
- [ ] Xóa MoMo — không tìm thấy code MoMo nào trong repo (N/A, có thể do chưa từng được thêm).
- [ ] Xóa Google Login — chưa tìm thấy code (N/A, hoặc chưa audit đủ sâu authService).
- [ ] Xóa OTP — chưa audit.
- [ ] Xóa Zalo Login — chưa audit.
- [ ] Xóa AI ETA — RENDER_PROFILES dùng durationMultiplier/queueMultiplier tĩnh (không phải AI), có vẻ KHÔNG phải "AI ETA" theo nghĩa cấm — cần xác nhận lại tên gọi/ý định roadmap.
- [ ] Xóa Marketplace — chưa tìm thấy code Marketplace rõ ràng, nhưng worker-fleet.gateway.ts + scheduler có thể là tiền thân của mô hình marketplace nhiều máy — cần audit kỹ hơn để quyết định KEEP/REMOVE.

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
- Cleanup: xóa Stripe/PayPal/Wallet khỏi payment layer (frontend renderConstants.js, backend payment.types.ts/payments.service.ts/payments.module.ts, xóa wallet.provider.ts). Chỉ còn QR_BANK (MB Bank).

---

# In Progress

- Chưa audit sâu: Upload Flow → B2 (cấu trúc jobs/{storage_code}/...), Delivery, Download.

---

# Pending

- Facebook Login (BLOCKER lớn nhất — chưa có dòng code nào).
- Customer Profile (phụ thuộc Facebook Login).
- Webhook xác nhận thanh toán thật (hiện confirm() có thể gọi trực tiếp từ frontend — cần chuyển thành webhook server-to-server, tuân Điều 13 CODEX_CONSTITUTION "Frontend không được tự đặt Payment = PAID").
- QR MB Bank thật (hiện là mock setTimeout).
- Hỗ trợ OneDrive/Dropbox/Direct Link ngoài Google Drive.
- Bảng downloads (log lượt tải) chưa tồn tại.
- Quyết định KEEP/REMOVE cho worker-fleet/scheduler (mô hình render farm nhiều máy) — có thể vượt phạm vi MVP.

---

# Risks

- Toàn bộ luồng hiện tại xây trên domain "render farm" (RenderProfile, worker fleet) thay vì domain MVP (Customer/Job/Storage Code) — rủi ro lớn nhất của cả dự án, ảnh hưởng mọi Codex. Đã ghi chi tiết ở CODEX_2_CHECKLIST.md phần Risks.
- confirm() payment hiện không phải webhook — nếu endpoint này public và không kiểm tra nguồn gọi, có thể bị gọi trực tiếp để giả mạo PAID. Cần audit payments.controller.ts kỹ hơn trước khi coi là an toàn.

---

# Blockers

- Không có Facebook App ID/Secret, Supabase credential, MB Bank/webhook credential trong môi trường này — mọi việc liên quan cần các secret này sẽ dừng ở mức code-only (CLOUD_VERIFICATION_REQUIRED) cho đến khi được cung cấp.

---

# Next Task

Audit chi tiết payments.controller.ts (endpoint confirm có bị gọi trực tiếp từ frontend không) và b2-storage.service.ts (cấu trúc lưu trữ có khớp jobs/{storage_code}/source|review|final|logs không), sau đó bắt đầu thiết kế Facebook Login nếu chưa bị chặn bởi thiếu credential.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

tiếp

→ tiếp tục mục Pending đầu tiên.
