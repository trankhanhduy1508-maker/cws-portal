# CODEX 3 CHECKLIST

## Vai trò

Customer Workflow • Worker • Payment • Dashboard

---

# Phase 1 - Workflow Audit

- [ ] So sánh với CWS_MVP_WORKFLOW_FINAL.md
- [ ] Kiểm tra Facebook Login
- [ ] Kiểm tra Customer Profile
- [ ] Kiểm tra Create Job
- [ ] Kiểm tra Shared Link
- [ ] Kiểm tra Google Drive Permission
- [ ] Kiểm tra Upload Flow

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

- [ ] Kiểm tra MB QR
- [ ] Kiểm tra Webhook
- [ ] Kiểm tra Payment Status
- [ ] Kiểm tra Delivery
- [ ] Kiểm tra Download

---

# Phase 5 - Dashboard

- [ ] Dashboard Customer
- [ ] Dashboard Admin
- [ ] Job Detail
- [ ] Payment Detail
- [ ] Download History

---

# Cleanup

- [ ] Xóa Stripe
- [ ] Xóa PayPal
- [ ] Xóa MoMo
- [ ] Xóa Google Login
- [ ] Xóa OTP
- [ ] Xóa Zalo Login
- [ ] Xóa AI ETA
- [ ] Xóa Marketplace

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

- Preview/approval gate: REVIEW_READY status + POST /jobs/:id/approve + GET /jobs/:id/preview + watermark thật (sharp). Xem PR (nhánh codex/storage-review-images).

---

# In Progress

-

---

# Pending

- Frontend UI: PreviewDownloadScreen.jsx vẫn giả định downloadUrl có sẵn ngay — cần sửa để hiển thị GET /jobs/:id/preview (3-5 ảnh watermark thật) + nút "Duyệt" gọi POST /jobs/:id/approve, chỉ hiện nút tải khi status=FINISHED.
- ProgressScreen.jsx/StepDots: kiểm tra có xử lý đúng trạng thái REVIEW_READY mới hay không (chưa test bằng mắt vì chưa chạy dev server thật với 1 job render xong).
- "Yêu cầu chỉnh sửa" (khách từ chối preview) — CWS_MVP_WORKFLOW_FINAL.md có nhắc tới nhưng chưa implement (hiện chỉ có approve, chưa có reject/re-render).

---

# Risks

-

---

# Blockers

Không có

---

# Next Task

Đọc mục chưa hoàn thành đầu tiên và tiếp tục.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

tiếp

→ tiếp tục mục Pending đầu tiên.
